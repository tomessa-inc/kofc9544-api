import { expect } from "chai";
import { AccessController } from "../../../controllers/access.controller";
import { AuthController } from "../../../controllers/auth.controller";
import { UserController } from "../../../controllers/user.controller";
import { sqlExecutor } from "../../../db/executor";
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from "../../../errors";
import { InvalidCredentialsError } from "../../../errors/auth.errors";
import { accessService } from "../../../service/access.service";
import { authService } from "../../../service/auth.service";
import { userService } from "../../../service/user.service";
import { api, mount } from "../helpers/http";
import { stubMethod } from "../helpers/stubs";

describe("Auth / User / Access controllers (HTTP contract)", () => {
    const stubs: { restore: () => void }[] = [];
    const stub = <T extends object, K extends keyof T>(target: T, key: K, impl?: (...args: any[]) => any) => {
        const s = stubMethod(target, key, impl);
        stubs.push(s);
        return s;
    };
    afterEach(() => stubs.splice(0).reverse().forEach((s) => s.restore()));

    const tom = { id: "u1", firstName: "Tom", lastName: "C", email: "tom@x.ca", roles: ["admin"] };

    describe("POST /auth/login", () => {
        it("signs in, returns the user and access token, and sets the refresh cookie", async () => {
            const login = stub(authService, "login", async () => ({ user: tom, accessToken: "acc", refreshToken: "ref" }));

            const res = await api().post("/auth/login").send({ username: "tom@x.ca", password: "pw" });

            expect(res.status).to.equal(200);
            expect(res.body).to.deep.equal({ code: 0, data: { user: tom, accessToken: "acc" }, error: null, message: "ok" });
            expect(login.calls[0]).to.deep.equal(["tom@x.ca", "pw"]);
            expect(String(res.headers["set-cookie"])).to.include("jwt=ref").and.include("HttpOnly");
        });

        it("returns 400 BadRequestException for wrong credentials", async () => {
            stub(authService, "login", async () => {
                throw new InvalidCredentialsError();
            });

            const res = await api().post("/auth/login").send({ username: "tom@x.ca", password: "bad" });

            expect(res.status).to.equal(400);
            expect(res.body).to.deep.equal({ code: -1, data: null, error: "Username and/or Password incorrect", message: "BadRequestException" });
        });

        it("returns 403 and clears the cookie when credentials are missing", async () => {
            const login = stub(authService, "login");

            const res = await api().post("/auth/login").send({ username: "tom@x.ca" });

            expect(res.status).to.equal(403);
            expect(res.body).to.deep.equal({ code: -1, data: null, error: "Username or password is incorrect.", message: "Username or password is incorrect." });
            expect(String(res.headers["set-cookie"])).to.match(/jwt=;/);
            expect(login.calls).to.have.length(0);
        });
    });

    describe("other auth endpoints", () => {
        it("GET /auth/codes returns the access codes", async () => {
            expect((await api().get("/auth/codes")).body.data).to.deep.equal(["AC_100010", "AC_100020", "AC_100030"]);
        });

        it("POST /auth/logout revokes the bearer session and clears the cookie", async () => {
            const logout = stub(authService, "logout", async () => undefined);

            const res = await api().post("/auth/logout").set("Authorization", "Bearer tok");

            expect(res.body).to.deep.include({ code: 0, data: "" });
            expect(logout.calls[0]).to.deep.equal(["tok"]);
            expect(String(res.headers["set-cookie"])).to.match(/jwt=;/);
        });

        it("POST /user/info returns the signed-in member", async () => {
            const current = stub(authService, "currentUser", async () => tom);

            const res = await api().post("/user/info").set("Authorization", "Bearer tok");

            expect(res.body.data).to.deep.equal(tom);
            expect(current.calls[0]).to.deep.equal(["tok"]);
        });

        it("POST /user/info returns empty data when not signed in", async () => {
            const current = stub(authService, "currentUser", async () => null);

            expect((await api().post("/user/info")).body.data).to.equal("");
            expect(current.calls[0]).to.deep.equal([null]);
        });

        it("POST /user/forgot-password always answers the same, whether or not the email exists", async () => {
            const request = stub(authService, "requestPasswordReset", async () => undefined);

            const res = await api().post("/user/forgot-password").send({ email: "nobody@x.ca" });

            expect(res.status).to.equal(200);
            expect(res.body.data).to.deep.equal({ message: "If that email is registered, a password reset link has been sent." });
            expect(request.calls[0]).to.deep.equal(["nobody@x.ca"]);
        });

        it("POST /user/forgot-password returns 400 without an email", async () => {
            expect((await api().post("/user/forgot-password").send({})).status).to.equal(400);
        });

        it("POST /user/reset-password signs in with the reset token", async () => {
            const reset = stub(authService, "loginWithResetToken", async () => ({ user: tom, accessToken: "acc", refreshToken: "ref" }));

            const res = await api().post("/user/reset-password").set("Authorization", "Bearer reset-tok");

            expect(res.body.data).to.deep.equal({ ...tom, accessToken: "acc" });
            expect(reset.calls[0]).to.deep.equal(["reset-tok"]);
            expect(String(res.headers["set-cookie"])).to.include("jwt=ref");
        });

        it("POST /user/reset-password returns 401 for an invalid or used link", async () => {
            stub(authService, "loginWithResetToken", async () => {
                throw new UnauthorizedError("Invalid or expired token");
            });

            const res = await api().post("/user/reset-password").set("Authorization", "Bearer used");

            expect(res.status).to.equal(401);
            expect(res.body.error).to.equal("Invalid or expired token");
        });

        it("apiResetPasswordToken (not routed) returns the link's member", async () => {
            stub(authService, "userForResetToken", async () => tom);

            const res = await mount(AuthController.apiResetPasswordToken, "get", "/:token").get("/tok");

            expect(res.body.data).to.deep.equal({ data: tom });
        });
    });

    describe("members", () => {
        it("POST /user/page-index/... lists members with every route param", async () => {
            const list = stub(userService, "list", async () => [{ firstName: "Tom", total: 1 }]);

            const res = await api().post("/user/page-index/2/page-size/5/firstName/asc/tom");

            expect(res.body.data.items).to.have.length(1);
            expect(list.calls[0][0]).to.include({ pageIndex: 2, pageSize: 5, sort: "firstName", order: "asc", filterQuery: "tom" });
        });

        it("POST /user/page-index/... defaults sort to firstName", async () => {
            const list = stub(userService, "list", async () => []);

            await api().post("/user/page-index/1/page-size/10");

            expect(list.calls[0][0]).to.include({ sort: "firstName", filterQuery: "" });
        });

        it("PATCH /user updates the member from `user`, keeping only editable fields", async () => {
            const update = stub(userService, "update", async () => ({ affectedRows: 1 }));

            const res = await api().patch("/user").send({ id: "u1", user: { firstName: "Tom", phone: "555", roles: ["admin"] } });

            expect(res.body.data).to.deep.equal({ message: "User has been successfully updated" });
            expect(update.calls[0]).to.deep.equal(["u1", { firstName: "Tom" }]);
        });

        it("PATCH /user returns 400 when id or user is missing", async () => {
            const res = await api().patch("/user").send({ id: "u1" });

            expect(res.status).to.equal(400);
            expect(res.body.error).to.equal("Missing parameters to access this function");
        });

        it("POST /user/id/:id returns the member as a plain object", async () => {
            stub(userService, "get", async () => ({ id: "u1", access: [] }));

            expect((await api().post("/user/id/u1")).body).to.deep.equal({ id: "u1", access: [] });
        });

        it("POST /user/id/:id returns 404 for an unknown member", async () => {
            stub(userService, "get", async () => {
                throw new NotFoundError("User not found");
            });

            expect((await api().post("/user/id/nope")).status).to.equal(404);
        });

        it("apiPostSignUp (not routed) creates the member or reports a conflict", async () => {
            const signUp = stub(userService, "signUp", async () => ({ id: "u2" }));
            const client = () => mount(UserController.apiPostSignUp);

            expect((await client().post("/").send({ username: "tom", email: "t@x.ca", password: "long enough" })).body.data).to.deep.equal({ message: "User has been created" });
            expect((await client().post("/").send({ email: "t@x.ca" })).status).to.equal(400);

            signUp.restore();
            stub(userService, "signUp", async () => {
                throw new ConflictError("Username already exists");
            });
            expect((await client().post("/").send({ username: "tom", email: "t@x.ca", password: "long enough" })).status).to.equal(409);
        });

        it("apiUpdateUser (not routed) updates by route id", async () => {
            const update = stub(userService, "update", async () => ({ affectedRows: 1 }));

            await mount(UserController.apiUpdateUser, "put", "/:id").put("/u1").send({ lastName: "C" });

            expect(update.calls[0]).to.deep.equal(["u1", { lastName: "C" }]);
        });
    });

    describe("/access (roles)", () => {
        const role = { id: "admin", name: "Admin", description: "Admins" };

        it("POST /access/list returns every role as { items }", async () => {
            stub(accessService, "listAll", async () => [role]);

            const res = await api().post("/access/list");

            expect(res.status).to.equal(200);
            expect(res.body.data).to.deep.equal({ items: [role] });
        });

        it("POST /access validates, passes the bearer token and returns the new role", async () => {
            const create = stub(accessService, "create", async () => role);

            const res = await api().post("/access").set("Authorization", "Bearer tok").send({ name: "Admin", description: "Admins" });

            expect(res.body.data).to.deep.equal(role);
            expect(create.calls[0]).to.deep.equal([{ name: "Admin", description: "Admins" }, "tok"]);
            expect((await api().post("/access").send({ description: "no name" })).status).to.equal(400);
            expect(create.calls).to.have.length(1);
        });

        it("PUT /access/id/:id updates by the URL's id", async () => {
            const update = stub(accessService, "update", async () => role);

            const res = await api().put("/access/id/admin").set("Authorization", "Bearer tok").send({ name: "Admin", description: "Admins" });

            expect(res.body.data).to.deep.equal(role);
            expect(update.calls[0]).to.deep.equal(["admin", { name: "Admin", description: "Admins" }, "tok"]);
        });

        it("DELETE /access/id/:id deletes, and reports the service's auth and not-found errors", async () => {
            const del = stub(accessService, "delete", async () => undefined);

            const res = await api().delete("/access/id/admin").set("Authorization", "Bearer tok");

            expect(res.body).to.deep.include({ code: 0, data: "" });
            expect(del.calls[0]).to.deep.equal(["admin", "tok"]);

            del.restore();
            for (const [error, status] of [[new UnauthorizedError("x"), 401], [new ForbiddenError("x"), 403], [new NotFoundError("x"), 404]] as const) {
                const failing = stub(accessService, "delete", async () => { throw error; });
                expect((await api().delete("/access/id/admin")).status).to.equal(status);
                failing.restore();
            }
        });

        it("getAllAccess pages and apiGetAllAccessAsLabelValues maps options", async () => {
            stub(accessService, "list", async () => [{ id: "admin", name: "Admin", total: 1 }]);
            stub(accessService, "listAsOptions", async () => [{ label: "Admin", value: "admin" }]);

            expect((await mount(AccessController.getAllAccess, "post", "/:pageIndex/:pageSize").post("/1/10")).body.data.items).to.have.length(1);
            expect((await mount(AccessController.apiGetAllAccessAsLabelValues).post("/")).body.data).to.deep.equal([{ label: "Admin", value: "admin" }]);
        });
    });

    describe("end to end (only the SQL executor is faked)", () => {
        const secret = process.env.TOKEN_SECRET;
        before(() => {
            process.env.TOKEN_SECRET = "e2e-secret";
        });
        after(() => {
            process.env.TOKEN_SECRET = secret;
        });

        function fakeDatabase(storedPassword: string) {
            const db = { password: storedPassword, sessions: new Map<string, string>(), writes: [] as string[] };
            stub(sqlExecutor, "run", async (q) => {
                const { sql, params } = q.toSQL();
                if (sql.includes("`password` from `user` where")) return [{ ...tom, password: db.password }];
                if (sql.startsWith("update `user` set `password`")) return db.writes.push(sql), (db.password = params[0] as string), { affectedRows: 1 };
                if (sql.startsWith("insert into `user_authentication`")) return db.sessions.set(params[1] as string, params[0] as string), { affectedRows: 1 };
                if (sql.startsWith("delete from `user_authentication` where `user_authentication`.`token`")) return db.sessions.delete(params[0] as string), { affectedRows: 1 };
                if (sql.startsWith("delete from `user_authentication`")) return { affectedRows: 0 };
                if (sql.includes("inner join `user_authentication`")) return db.sessions.has(params[0] as string) ? [{ ...tom, realName: "Tom C" }] : [];
                throw new Error(`unexpected SQL: ${sql}`);
            });
            return db;
        }

        it("login, info and logout share one recorded session, and the password never reaches the client", async () => {
            fakeDatabase("legacy-plain-text");

            const login = await api().post("/auth/login").send({ username: "tom@x.ca", password: "legacy-plain-text" });
            const token = login.body.data.accessToken;

            expect(login.body.data.user).to.not.have.property("password");
            expect((await api().post("/user/info").set("Authorization", `Bearer ${token}`)).body.data).to.include({ id: "u1" });
            await api().post("/auth/logout").set("Authorization", `Bearer ${token}`);
            expect((await api().post("/user/info").set("Authorization", `Bearer ${token}`)).body.data).to.equal("");
        });

        it("a plain-text password is re-hashed on login, and the hash then works (production scrypt settings)", async () => {
            const db = fakeDatabase("legacy-plain-text");

            expect((await api().post("/auth/login").send({ username: "tom@x.ca", password: "legacy-plain-text" })).status).to.equal(200);
            expect(db.writes).to.have.length(1);
            expect(db.password).to.match(/^scrypt\$131072\$8\$1\$/);

            expect((await api().post("/auth/login").send({ username: "tom@x.ca", password: "legacy-plain-text" })).status).to.equal(200);
            expect((await api().post("/auth/login").send({ username: "tom@x.ca", password: "wrong" })).status).to.equal(400);
            expect(db.writes).to.have.length(1);
        });
    });
});
