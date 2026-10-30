import { expect } from "chai";
import jwt from "jsonwebtoken";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from "../../../errors";
import { InvalidCredentialsError } from "../../../errors/auth.errors";
import { TokenType } from "../../../mapper/session-token.mapper";
import { AccessService, MAX_ACCESS_ID, ROLE_MANAGERS, roleIdsOf } from "../../../service/access.service";
import { AuthService } from "../../../service/auth.service";
import { PasswordService } from "../../../service/password.service";
import { TokenService } from "../../../service/token.service";
import { UserService } from "../../../service/user.service";
import { parseListParams } from "../../../validators/list.validator";

function fake<T extends Record<string, (...args: any[]) => any>>(impl: T) {
    const calls: Record<string, any[][]> = {};
    const proxy = {} as T;
    for (const [name, fn] of Object.entries(impl)) {
        calls[name] = [];
        (proxy as any)[name] = async (...args: any[]) => (calls[name].push(args), fn(...args));
    }
    return { proxy, calls };
}

async function rejects(promise: Promise<unknown>): Promise<Error> {
    try {
        await promise;
    } catch (error) {
        return error as Error;
    }
    throw new Error("expected rejection");
}

const tom = { id: "u1", firstName: "Tom", lastName: "C", email: "tom@x.ca", roles: ["admin"] };

/** Cheap scrypt settings so tests stay fast (production uses DEFAULT_SCRYPT). */
const passwords = new PasswordService({ N: 2 ** 10, r: 8, p: 1 });

describe("auth services", () => {
    describe("TokenService", () => {
        const tokens = new TokenService(() => "test-secret");

        it("signs tokens that verify only for their purpose", () => {
            const access = tokens.sign("u1", "access");

            expect(tokens.verify(access, "access")).to.equal("u1");
            expect(tokens.verify(access, "password-reset")).to.equal(null);
            expect(tokens.verify(access, "refresh")).to.equal(null);
        });

        it("uses 7d access, 30d refresh and 1h reset lifetimes", () => {
            for (const [purpose, seconds] of [["access", 7 * 86400], ["refresh", 30 * 86400], ["password-reset", 3600]] as const) {
                const payload = jwt.decode(tokens.sign("u1", purpose)) as jwt.JwtPayload;
                expect(payload.exp! - payload.iat!).to.equal(seconds);
            }
        });

        it("rejects tampered, foreign-secret and expired tokens", () => {
            const foreign = new TokenService(() => "other-secret").sign("u1", "access");
            const expired = jwt.sign({ id: "u1", purpose: "access", exp: Math.floor(Date.now() / 1000) - 10 }, "test-secret");

            expect(tokens.verify(foreign, "access")).to.equal(null);
            expect(tokens.verify(expired, "access")).to.equal(null);
            expect(tokens.verify("not-a-jwt", "access")).to.equal(null);
        });
    });

    describe("AuthService", () => {
        function setup({ candidates = [] as any[], sessionUser = tom as any, byEmail = tom as any, failMail = false, failSetPassword = false } = {}) {
            const users = fake({
                findLoginCandidates: async () => candidates,
                findByEmail: async () => byEmail,
                setPassword: async () => {
                    if (failSetPassword) throw new Error("db down");
                    return { affectedRows: 1 };
                },
            });
            const sessions = fake({
                insert: async () => ({ affectedRows: 1 }),
                deleteForUser: async () => ({ affectedRows: 1 }),
                deleteToken: async () => ({ affectedRows: 1 }),
                findUser: async () => sessionUser,
            });
            const tokens = new TokenService(() => "test-secret");
            const mail = fake({
                sendPasswordReset: async () => {
                    if (failMail) throw new Error("SES down");
                },
            });
            return { service: new AuthService(users.proxy, sessions.proxy, tokens, mail.proxy, passwords), users, sessions, tokens, mail };
        }

        it("login starts a single session: clears reset links and other sessions, then records the new one", async () => {
            const { service, sessions, tokens, users } = setup({ candidates: [{ ...tom, password: await passwords.hash("correct horse") }] });

            const session = await service.login("tom@x.ca", "correct horse");

            expect(session.user).to.deep.equal(tom);
            expect(users.calls.setPassword).to.have.length(0);
            expect(tokens.verify(session.accessToken, "access")).to.equal("u1");
            expect(tokens.verify(session.refreshToken, "refresh")).to.equal("u1");
            expect(sessions.calls.deleteForUser).to.deep.equal([["u1", TokenType.PasswordReset], ["u1", TokenType.Session]]);
            expect(sessions.calls.insert).to.deep.equal([["u1", session.accessToken, TokenType.Session]]);
        });

        it("login with an unknown login or a wrong password throws InvalidCredentialsError", async () => {
            const unknown = setup({ candidates: [] });
            expect(await rejects(unknown.service.login("x", "y"))).to.be.instanceOf(InvalidCredentialsError);

            const wrong = setup({ candidates: [{ ...tom, password: await passwords.hash("correct horse") }] });
            expect(await rejects(wrong.service.login("tom@x.ca", "wrong horse"))).to.be.instanceOf(InvalidCredentialsError);
            expect(wrong.sessions.calls.insert).to.have.length(0);
        });

        it("login accepts a legacy plain-text password once and replaces it with a hash", async () => {
            const { service, users } = setup({ candidates: [{ ...tom, password: "legacy-pw" }] });

            await service.login("tom@x.ca", "legacy-pw");

            const [[userId, stored]] = users.calls.setPassword;
            expect(userId).to.equal("u1");
            expect(stored).to.match(/^scrypt\$/);
            expect(await passwords.verify("legacy-pw", stored)).to.equal(true);
        });

        it("login re-hashes a password stored with older scrypt settings", async () => {
            const weak = await new PasswordService({ N: 2 ** 9, r: 8, p: 1 }).hash("correct horse");
            const { service, users } = setup({ candidates: [{ ...tom, password: weak }] });

            await service.login("tom@x.ca", "correct horse");

            expect(users.calls.setPassword[0][1]).to.match(/^scrypt\$1024\$/);
        });

        it("login still succeeds when the hash upgrade cannot be saved", async () => {
            const { service } = setup({ candidates: [{ ...tom, password: "legacy-pw" }], failSetPassword: true });

            expect((await service.login("tom@x.ca", "legacy-pw")).user).to.deep.equal(tom);
        });

        it("login checks every account matching the login and never returns the stored password", async () => {
            const other = { ...tom, id: "u2", password: await passwords.hash("other password") };
            const { service } = setup({ candidates: [other, { ...tom, password: await passwords.hash("correct horse") }] });

            const session = await service.login("tom@x.ca", "correct horse");

            expect(session.user.id).to.equal("u1");
            expect(session.user).to.not.have.property("password");
        });

        it("logout revokes the session token", async () => {
            const { service, sessions } = setup();

            await service.logout("tok");
            await service.logout(null);

            expect(sessions.calls.deleteToken).to.deep.equal([["tok"]]);
        });

        it("currentUser returns the member for a valid recorded session and clears their reset links", async () => {
            const { service, sessions, tokens } = setup();
            const token = tokens.sign("u1", "access");

            expect(await service.currentUser(token)).to.deep.equal(tom);
            expect(sessions.calls.findUser[0]).to.deep.equal([token, TokenType.Session]);
            expect(sessions.calls.deleteForUser).to.deep.equal([["u1", TokenType.PasswordReset]]);
        });

        it("currentUser rejects an expired/foreign token without a lookup and cleans it up", async () => {
            const { service, sessions } = setup();
            const foreign = new TokenService(() => "old-hard-coded-secret").sign("u1", "access");

            expect(await service.currentUser(foreign)).to.equal(null);
            expect(sessions.calls.findUser).to.have.length(0);
            expect(sessions.calls.deleteToken).to.deep.equal([[foreign]]);
        });

        it("currentUser returns null for a signed token whose session was revoked", async () => {
            const { service, tokens } = setup({ sessionUser: null });

            expect(await service.currentUser(tokens.sign("u1", "access"))).to.equal(null);
        });

        it("currentUser returns null without a token", async () => {
            expect(await setup().service.currentUser(null)).to.equal(null);
        });

        it("requestPasswordReset replaces earlier links, records a 1h reset token and emails it", async () => {
            const { service, sessions, mail, tokens } = setup();

            await service.requestPasswordReset("tom@x.ca");

            const [userId, token, type] = sessions.calls.insert[0];
            expect([userId, type]).to.deep.equal(["u1", TokenType.PasswordReset]);
            expect(tokens.verify(token, "password-reset")).to.equal("u1");
            expect(sessions.calls.deleteForUser).to.deep.equal([["u1", TokenType.PasswordReset]]);
            expect(mail.calls.sendPasswordReset[0]).to.deep.equal([{ email: "tom@x.ca", firstName: "Tom" }, token]);
        });

        it("requestPasswordReset does nothing visible for an unknown email", async () => {
            const { service, sessions, mail } = setup({ byEmail: null });

            await service.requestPasswordReset("nobody@x.ca");

            expect(sessions.calls.insert).to.have.length(0);
            expect(mail.calls.sendPasswordReset).to.have.length(0);
        });

        it("requestPasswordReset swallows a mail failure", async () => {
            await setup({ failMail: true }).service.requestPasswordReset("tom@x.ca");
        });

        it("loginWithResetToken exchanges a valid reset token for a session (and the link is cleared)", async () => {
            const { service, sessions, tokens } = setup();
            const reset = tokens.sign("u1", "password-reset");

            const session = await service.loginWithResetToken(reset);

            expect(session.user).to.deep.equal(tom);
            expect(sessions.calls.findUser[0]).to.deep.equal([reset, TokenType.PasswordReset]);
            expect(sessions.calls.deleteForUser[0]).to.deep.equal(["u1", TokenType.PasswordReset]);
        });

        it("loginWithResetToken rejects an access token, a used link, or no token", async () => {
            const { service, tokens } = setup();
            expect(await rejects(service.loginWithResetToken(tokens.sign("u1", "access")))).to.be.instanceOf(UnauthorizedError);
            expect(await rejects(service.loginWithResetToken(null))).to.be.instanceOf(UnauthorizedError);

            const used = setup({ sessionUser: null });
            expect(await rejects(used.service.loginWithResetToken(used.tokens.sign("u1", "password-reset")))).to.be.instanceOf(UnauthorizedError);
        });
    });

    describe("UserService", () => {
        function setup(existing: any[] = [], found: any = { id: "u1" }) {
            const store = fake({
                findPage: async () => [],
                findById: async () => found,
                findByUserNameOrEmail: async () => existing,
                insert: async () => ({ affectedRows: 1 }),
                update: async () => ({ affectedRows: 1 }),
            });
            return { service: new UserService(store.proxy, passwords), store };
        }

        it("list pages with the name filter", async () => {
            const { service, store } = setup();

            await service.list(parseListParams({ pageIndex: "2", pageSize: "10", filterQuery: "tom" }));

            expect(store.calls.findPage[0]).to.deep.equal([{ offset: 10, limit: 10 }, { name: "tom" }]);
        });

        it("list passes the first name, last name and email filters", async () => {
            const { service, store } = setup();

            await service.list(parseListParams({ pageIndex: "1", pageSize: "10" }), { email: "@kofc" });

            expect(store.calls.findPage[0]).to.deep.equal([{ offset: 0, limit: 10 }, { name: undefined, email: "@kofc" }]);
        });

        it("get throws NotFoundError for an unknown member", async () => {
            expect(await rejects(setup([], null).service.get("nope"))).to.be.instanceOf(NotFoundError);
        });

        it("signUp creates the member with a uuid, or conflicts", async () => {
            const { service, store } = setup();

            const { id } = await service.signUp({ username: "tom", email: "t@x.ca", password: "correct horse" });

            expect(id).to.match(/^[0-9a-f-]{36}$/);
            expect(store.calls.insert[0][0]).to.include({ id, userName: "tom", email: "t@x.ca", firstName: "", lastName: "" });
            expect(await passwords.verify("correct horse", store.calls.insert[0][0].password)).to.equal(true);
            expect(store.calls.insert[0][0].password).to.not.include("correct horse");
            expect(await rejects(setup([{ id: "u1" }]).service.signUp({ username: "tom", email: "t@x.ca", password: "correct horse" }))).to.be.instanceOf(ConflictError);
        });

        it("update delegates", async () => {
            const { service, store } = setup();

            await service.update("u1", { email: "new@x.ca" });
            await service.update("u1", { password: "new password" });

            expect(store.calls.update[0]).to.deep.equal(["u1", { email: "new@x.ca" }]);
            expect(await passwords.verify("new password", store.calls.update[1][1].password)).to.equal(true);
        });
    });

    describe("AccessService", () => {
        const admin = { roles: ["admin"] };

        function setup({ existing = [] as any[], member = admin as { roles: any } | null, deleted = 1 } = {}) {
            const store = fake({
                findAll: async () => [{ id: "admin", name: "Admin", description: "" }],
                findPage: async () => [{ id: "admin", name: "Admin", description: "", total: 1 }],
                findByIdOrName: async () => existing,
                insert: async () => ({ affectedRows: 1 }),
                update: async () => ({ affectedRows: 1 }),
                delete: async () => ({ affectedRows: deleted }),
            });
            const assignments = fake({ deleteByAccess: async () => ({ affectedRows: 3 }) });
            const members = fake({ currentUser: async () => member });
            return { service: new AccessService(store.proxy, assignments.proxy, members.proxy), store, assignments, members };
        }

        it("listAll returns every role; listAsOptions maps roles to label/value", async () => {
            expect(await setup().service.listAll()).to.deep.equal([{ id: "admin", name: "Admin", description: "" }]);
            expect(await setup().service.listAsOptions(parseListParams({}))).to.deep.equal([{ label: "Admin", value: "admin" }]);
        });

        it("create slugs the name into the id, checks id and name, inserts and returns the role", async () => {
            const { service, store, members } = setup();

            expect(await service.create({ name: "Golf Admin", description: "Runs golf" }, "tok")).to.deep.equal({
                id: "golf-admin", name: "Golf Admin", description: "Runs golf",
            });
            expect(members.calls.currentUser[0]).to.deep.equal(["tok"]);
            expect(store.calls.findByIdOrName[0]).to.deep.equal(["golf-admin", "Golf Admin"]);
            expect(store.calls.insert[0][0]).to.deep.equal({ id: "golf-admin", name: "Golf Admin", description: "Runs golf" });
        });

        it("create conflicts on an existing role and rejects names too long for the id column", async () => {
            expect(await rejects(setup({ existing: [{ id: "x" }] }).service.create({ name: "Editor", description: "" }, "tok"))).to.be.instanceOf(ConflictError);

            const { service, store } = setup();
            expect(await rejects(service.create({ name: "x".repeat(MAX_ACCESS_ID + 1), description: "" }, "tok"))).to.be.instanceOf(BadRequestError);
            expect(store.calls.insert).to.have.length(0);
        });

        it("update changes the name and description, keeping the id", async () => {
            const { service, store } = setup();

            expect(await service.update("admin", { name: "Admins", description: "d" }, "tok")).to.deep.equal({ id: "admin", name: "Admins", description: "d" });
            expect(store.calls.update[0]).to.deep.equal(["admin", { name: "Admins", description: "d" }]);
        });

        it("delete removes the role then its assignments, or is NotFound without touching assignments", async () => {
            const { service, store, assignments } = setup();
            await service.delete("admin", "tok");
            expect(store.calls.delete[0]).to.deep.equal(["admin"]);
            expect(assignments.calls.deleteByAccess[0]).to.deep.equal(["admin"]);

            const missing = setup({ deleted: 0 });
            expect(await rejects(missing.service.delete("nope", "tok"))).to.be.instanceOf(NotFoundError);
            expect(missing.assignments.calls.deleteByAccess).to.have.length(0);
        });

        it("only signed-in role managers may create, update or delete", async () => {
            for (const [member, error] of [[null, UnauthorizedError], [{ roles: ["calendar"] }, ForbiddenError], [{ roles: null }, ForbiddenError]] as const) {
                const { service, store } = setup({ member });
                expect(await rejects(service.create({ name: "Editor", description: "" }, "tok"))).to.be.instanceOf(error);
                expect(await rejects(service.update("admin", { name: "A", description: "" }, "tok"))).to.be.instanceOf(error);
                expect(await rejects(service.delete("admin", "tok"))).to.be.instanceOf(error);
                expect(store.calls.insert.length + store.calls.update.length + store.calls.delete.length).to.equal(0);
            }
            for (const roles of [["access"], '["calendar","admin"]']) {
                await setup({ member: { roles } }).service.delete("admin", "tok");
            }
        });

        it("roleIdsOf accepts an array or JSON text and ignores anything else", () => {
            expect(roleIdsOf(["admin"])).to.deep.equal(["admin"]);
            expect(roleIdsOf('["admin",1]')).to.deep.equal(["admin"]);
            expect(roleIdsOf("not json")).to.deep.equal([]);
            expect(roleIdsOf('{"a":1}')).to.deep.equal([]);
            expect(roleIdsOf(null)).to.deep.equal([]);
            expect(ROLE_MANAGERS).to.deep.equal(["access", "admin"]);
        });
    });
});
