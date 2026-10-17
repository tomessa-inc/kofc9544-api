import { expect } from "chai";
import { mockEvent } from "h3";
import jwt from "jsonwebtoken";
import {
    forbiddenResponse,
    pagination,
    sleep,
    unAuthorizedResponse,
    usePageResponseSuccess,
    useResponseError,
    useResponseSuccess,
} from "../../../utils/response";
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from "../../../utils/jwt-utils";
import { clearRefreshTokenCookie, getRefreshTokenFromCookie, setRefreshTokenCookie } from "../../../utils/cookie-utils";
import { getTimezone, setTimezone } from "../../../utils/timezone-utils";
import { MOCK_USERS } from "../../../utils/mock-data";
import { imageService } from "../../../service";

function makeEvent(headers: Record<string, string> = {}) {
    const event = mockEvent("http://localhost/", { headers });
    return { event, res: event.res };
}

describe("utils", () => {
    describe("response", () => {
        it("useResponseSuccess wraps data", () => {
            expect(useResponseSuccess({ a: 1 })).to.deep.equal({ code: 0, data: { a: 1 }, error: null, message: "ok" });
        });

        it("useResponseError wraps an error", () => {
            expect(useResponseError("Bad", "detail")).to.deep.equal({ code: -1, data: null, error: "detail", message: "Bad" });
        });

        it("useResponseError defaults error to null", () => {
            expect(useResponseError("Bad").error).to.equal(null);
        });

        it("usePageResponseSuccess paginates and reports the full total", () => {
            const result = usePageResponseSuccess("2", "2", [1, 2, 3, 4, 5], { message: "done" });

            expect(result.data).to.deep.equal({ items: [3, 4], total: 5 });
            expect(result.message).to.equal("done");
        });

        it("forbiddenResponse sets 403", () => {
            const { event, res } = makeEvent();

            expect(forbiddenResponse(event)).to.deep.include({ code: -1, message: "Forbidden Exception" });
            expect(res.status).to.equal(403);
        });

        it("unAuthorizedResponse sets 401", () => {
            const { event, res } = makeEvent();

            expect(unAuthorizedResponse(event).message).to.equal("Unauthorized Exception");
            expect(res.status).to.equal(401);
        });

        it("sleep resolves after the delay", async () => {
            const start = Date.now();
            await sleep(20);
            expect(Date.now() - start).to.be.at.least(15);
        });

        describe("pagination", () => {
            const list = [1, 2, 3, 4, 5];

            it("returns the requested page", () => {
                expect(pagination(1, 2, list)).to.deep.equal([1, 2]);
                expect(pagination(2, 2, list)).to.deep.equal([3, 4]);
            });

            it("returns the remainder on the last page", () => {
                expect(pagination(3, 2, list)).to.deep.equal([5]);
            });

            it("returns an empty array past the end", () => {
                expect(pagination(4, 2, list)).to.deep.equal([]);
            });
        });
    });

    describe("jwt-utils", () => {
        const admin = MOCK_USERS.find((u) => u.username === "admin");

        it("generateAccessToken signs the user with a 7 day expiry", () => {
            const decoded: any = jwt.decode(generateAccessToken(admin));

            expect(decoded.username).to.equal("admin");
            expect(decoded.exp - decoded.iat).to.equal(7 * 24 * 60 * 60);
        });

        it("verifyAccessToken returns the user without their password", () => {
            const { event } = makeEvent({ authorization: `Bearer ${generateAccessToken(admin)}` });

            const user = verifyAccessToken(event);

            expect(user).to.include({ username: "admin", id: admin.id });
            expect(user).to.not.have.property("password");
        });

        it("verifyAccessToken returns null without a bearer header", () => {
            expect(verifyAccessToken(makeEvent().event)).to.equal(null);
            expect(verifyAccessToken(makeEvent({ authorization: "Basic abc" }).event)).to.equal(null);
        });

        it("verifyAccessToken returns null for a malformed header", () => {
            expect(verifyAccessToken(makeEvent({ authorization: "Bearer a b" }).event)).to.equal(null);
        });

        it("verifyAccessToken returns null for an invalid token", () => {
            expect(verifyAccessToken(makeEvent({ authorization: "Bearer nope" }).event)).to.equal(null);
        });

        it("verifyAccessToken returns null for an unknown user", () => {
            const token = generateAccessToken({ ...admin, username: "ghost" });

            expect(verifyAccessToken(makeEvent({ authorization: `Bearer ${token}` }).event)).to.equal(null);
        });

        it("verifyRefreshToken returns the user for a valid refresh token", () => {
            expect(verifyRefreshToken(generateRefreshToken(admin))).to.include({ username: "admin" });
        });

        it("verifyRefreshToken rejects access tokens and unknown users", () => {
            expect(verifyRefreshToken(generateAccessToken(admin))).to.equal(null);
            expect(verifyRefreshToken(generateRefreshToken({ ...admin, username: "ghost" }))).to.equal(null);
        });
    });

    describe("cookie-utils", () => {
        it("setRefreshTokenCookie sets a secure httpOnly jwt cookie", () => {
            const { event, res } = makeEvent();

            setRefreshTokenCookie(event, "tok");

            const cookie = res.headers.getSetCookie().join("; ");
            expect(cookie).to.include("jwt=tok").and.include("HttpOnly").and.include("Secure").and.include("SameSite=None");
            expect(cookie).to.include("Max-Age=86400");
        });

        it("clearRefreshTokenCookie expires the jwt cookie", () => {
            const { event, res } = makeEvent();

            clearRefreshTokenCookie(event);

            expect(res.headers.getSetCookie().join("; ")).to.match(/jwt=;.*Max-Age=0/);
        });

        it("getRefreshTokenFromCookie reads the jwt cookie", () => {
            expect(getRefreshTokenFromCookie(makeEvent({ cookie: "jwt=abc; other=1" }).event)).to.equal("abc");
            expect(getRefreshTokenFromCookie(makeEvent().event)).to.equal(undefined);
        });
    });

    describe("timezone-utils", () => {
        it("stores and returns the timezone", () => {
            setTimezone("America/Toronto");
            expect(getTimezone()).to.equal("America/Toronto");
        });
    });

    describe("ImageService", () => {
        const decode = (url: string) => JSON.parse(Buffer.from(url.split("/").pop(), "base64").toString());

        for (const [method, width, height] of [
            ["loadImage600x300", 600, 300],
            ["loadImage200x200", 200, 200],
            ["loadImage100x100", 100, 100],
        ] as const) {
            it(`${method} returns a CloudFront URL for an email asset resized to ${width}x${height}`, () => {
                const url = imageService[method]("logo.png");

                expect(url).to.match(/^https:\/\/images\.kofc9544\.ca\//);
                expect(decode(url)).to.deep.equal({
                    bucket: "images.kofc9544.ca",
                    key: "email/logo.png",
                    edits: { resize: { width, height, fit: "cover" } },
                });
            });
        }
    });
});
