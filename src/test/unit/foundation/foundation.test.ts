import { expect } from "chai";
import { mockEvent } from "h3";
import { config } from "../../../config";
import { RdsProxyExecutor } from "../../../db/executor";
import { db } from "../../../db/query-builder";
import { AppError, BadRequestError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from "../../../errors";
import { team } from "../../../models/Team";
import { handleError, usePagedListResponse } from "../../../utils/response";
import { eq, sql } from "drizzle-orm";

describe("foundation", () => {
    describe("config", () => {
        const saved = { ...process.env };
        afterEach(() => {
            process.env = { ...saved };
        });

        it("reads TOKEN_SECRET at access time", () => {
            process.env.TOKEN_SECRET = "s1";
            expect(config.tokenSecret).to.equal("s1");
            process.env.TOKEN_SECRET = "s2";
            expect(config.tokenSecret).to.equal("s2");
        });

        it("refuses to run without TOKEN_SECRET", () => {
            delete process.env.TOKEN_SECRET;
            expect(() => config.tokenSecret).to.throw("TOKEN_SECRET is not set");
        });

        it("builds the SQL proxy URL from RDS_HOST and RDS_DB", () => {
            process.env.RDS_HOST = "https://proxy";
            process.env.RDS_DB = "kofc_stage";
            expect(config.sqlProxyUrl).to.equal("https://proxy/kofc_stage");
        });

        for (const [stage, url] of [["dev", "http://localhost:5555"], ["stage", "https://member-stage.kofc9544.ca"], ["production", "https://member.kofc9544.ca"]]) {
            it(`uses ${url} as the member site for STAGE=${stage}`, () => {
                process.env.STAGE = stage;
                expect(config.memberSiteUrl).to.equal(url);
            });
        }
    });

    describe("errors", () => {
        for (const [ErrorType, status, code] of [
            [BadRequestError, 400, "BadRequest"],
            [UnauthorizedError, 401, "Unauthorized Exception"],
            [ForbiddenError, 403, "Forbidden Exception"],
            [NotFoundError, 404, "NotFound"],
            [ConflictError, 409, "Conflict"],
        ] as const) {
            it(`${ErrorType.name} carries status ${status} and code "${code}"`, () => {
                const error = new ErrorType("why");
                expect(error).to.be.instanceOf(AppError).and.instanceOf(Error);
                expect(error).to.include({ status, code, message: "why", name: ErrorType.name });
            });
        }
    });

    describe("handleError", () => {
        it("maps a domain error to its status, code and message", () => {
            const event = mockEvent("http://localhost/");

            const body = handleError(event, new ConflictError('Team name "Eagles" already exists'));

            expect(event.res.status).to.equal(409);
            expect(body).to.deep.equal({ code: -1, data: null, error: 'Team name "Eagles" already exists', message: "Conflict" });
        });

        it("hides unexpected errors behind a generic 500", () => {
            const event = mockEvent("http://localhost/");

            const body = handleError(event, new Error("ER_NO_SUCH_TABLE: Table 'kofc.player' doesn't exist"));

            expect(event.res.status).to.equal(500);
            expect(body).to.deep.equal({ code: -1, data: null, error: "Internal server error", message: "InternalServerError" });
        });
    });

    describe("usePagedListResponse", () => {
        const rows = () => [{ name: "charlie", total: 3 }, { name: "alpha", total: 3 }, { name: "Bravo", total: 3 }];

        it("sorts by the requested field and adds the paging fields", () => {
            const res = usePagedListResponse(rows(), { sort: "name", pageIndex: 1, pageSize: 2, listLength: 3 }, "name");

            expect(res.data.items.map((r) => r.name)).to.deep.equal(["alpha", "Bravo", "charlie"]);
            expect(res).to.include({ code: 0, error: null, message: "ok", total: "3", pageSize: "2", pageIndex: "1", lastpage: "2" });
            expect(res.data.total).to.equal(3);
        });

        it("treats the order case-insensitively (the default is 'ASC')", () => {
            const res = usePagedListResponse(rows(), { sort: "name", order: "ASC" }, "name");
            expect(res.data.items.map((r) => r.name)).to.deep.equal(["alpha", "Bravo", "charlie"]);
        });

        it("sorts descending", () => {
            const res = usePagedListResponse(rows(), { sort: "name", order: "desc" }, "name");
            expect(res.data.items.map((r) => r.name)).to.deep.equal(["charlie", "Bravo", "alpha"]);
        });

        it("sorts numerically on the default field when no sort is requested", () => {
            const res = usePagedListResponse([{ n: 3 }, { n: 1 }, { n: 2 }], {}, "n");
            expect(res.data.items.map((r) => r.n)).to.deep.equal([1, 2, 3]);
        });

        it("does not crash when rows lack the sort field", () => {
            expect(() => usePagedListResponse([{ id: 1 }, { id: 2 }], { sort: "name" }, "name")).to.not.throw();
        });

        it("reports a total of 0 for an empty or missing list", () => {
            expect(usePagedListResponse([], {}, "name").data.total).to.equal(0);
            expect(usePagedListResponse(undefined as any, {}, "name").data.items).to.deep.equal([]);
        });
    });

    describe("RdsProxyExecutor", () => {
        it("posts the prepared statement as a JSON string under `sql` and returns the row set", async () => {
            const posts: any[] = [];
            const executor = new RdsProxyExecutor(() => "https://proxy/db", async (url, body) => {
                posts.push({ url, body });
                return { data: { data: [[{ id: "eagles" }], []] } };
            });

            const rows = await executor.run(db.select().from(team).where(eq(team.id, "eagles")));

            expect(rows).to.deep.equal([{ id: "eagles" }]);
            expect(posts[0].url).to.equal("https://proxy/db");
            const statement = JSON.parse(posts[0].body.sql);
            expect(statement.sql).to.match(/^select .* from `team` where `team`\.`id` = \?$/);
            expect(statement.params).to.deep.equal(["eagles"]);
        });

        it("collapses multi-line sql fragments but leaves params untouched", async () => {
            let body: any;
            const executor = new RdsProxyExecutor(() => "u", async (_url, b) => ((body = b), { data: { data: [[]] } }));

            await executor.run(db.select({ n: sql`(SELECT count(*)\n      FROM team)`.as("n") }).from(team).where(eq(team.name, "line1\nline2")));

            const statement = JSON.parse(body.sql);
            expect(statement.sql).to.not.include("\n");
            expect(statement.sql).to.include("(SELECT count(*) FROM team)");
            expect(statement.params).to.deep.equal(["line1\nline2"]);
        });

        it("throws instead of swallowing proxy failures", async () => {
            const executor = new RdsProxyExecutor(() => "u", async () => {
                throw new Error("ECONNREFUSED");
            });

            let caught: Error | undefined;
            try {
                await executor.run(db.select().from(team));
            } catch (error) {
                caught = error as Error;
            }
            expect(caught?.message).to.equal("ECONNREFUSED");
        });
    });
});
