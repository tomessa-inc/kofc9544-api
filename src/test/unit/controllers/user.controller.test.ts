import { expect } from "chai";
import { mailMapper, userMapper } from "../../../mapper";
import { userAuthenticationMapper } from "../../../mapper/user.authentication.mapper";
import { UserController } from "../../../controllers/user.controller";
import { UserAuthenticationController } from "../../../controllers/user.authentication.controller";
import { EmailMessaging } from "../../../models/EmailMessaging";
import { api, mount } from "../helpers/http";
import { stubMethod } from "../helpers/sql-stub";

describe("UserController / UserAuthenticationController", () => {
    const stubs: { restore: () => void }[] = [];
    const stub = <T extends object, K extends keyof T>(target: T, key: K, impl?: (...args: any[]) => any) => {
        const s = stubMethod(target, key, impl);
        stubs.push(s);
        return s;
    };
    const user = { id: "u1", firstName: "Tom", lastName: "C", email: "t@x.ca" };

    afterEach(() => stubs.splice(0).reverse().forEach((s) => s.restore()));

    describe("POST /auth/login", () => {
        function stubTokens() {
            stub(userMapper, "generateAccessToken", () => "access");
            stub(userMapper, "generateRefreshToken", () => "refresh");
            const clean = stub(userMapper, "cleanResetPasswordToken", async () => true);
            const insert = stub(userMapper, "insertUserToken", async () => true);
            return { clean, insert };
        }

        it("signs in, stores the access token and sets the refresh cookie", async () => {
            stub(userMapper, "getUserBasedOnPassword", async () => [user]);
            const { insert } = stubTokens();

            const res = await api().post("/auth/login").send({ username: "t@x.ca", password: "pw" });

            expect(res.status).to.equal(200);
            expect(res.body.data).to.deep.equal({ user, accessToken: "access" });
            expect(insert.calls[0]).to.deep.equal([user, "access", "LOGGED"]);
            expect(String(res.headers["set-cookie"])).to.include("jwt=refresh");
        });

        it("returns 400 for a wrong username or password", async () => {
            stub(userMapper, "getUserBasedOnPassword", async () => []);

            const res = await api().post("/auth/login").send({ username: "t@x.ca", password: "bad" });

            expect(res.status).to.equal(400);
            expect(res.body.error).to.equal("Username and/or Password incorrect");
        });

        it("returns 403 and clears the cookie when credentials are missing", async () => {
            const res = await api().post("/auth/login").send({ username: "t@x.ca" });

            expect(res.status).to.equal(403);
            expect(String(res.headers["set-cookie"])).to.match(/jwt=;/);
        });

        it("returns 500 when the lookup throws", async () => {
            stub(userMapper, "getUserBasedOnPassword", async () => { throw new Error("db down"); });

            expect((await api().post("/auth/login").send({ username: "a", password: "b" })).status).to.equal(500);
        });
    });

    describe("POST /auth/logout and GET /auth/codes", () => {
        it("logout responds with an empty success", async () => {
            expect((await api().post("/auth/logout")).body).to.deep.include({ code: 0, data: "" });
        });

        it("codes returns the access codes", async () => {
            expect((await api().get("/auth/codes")).body.data).to.deep.equal(["AC_100010", "AC_100020", "AC_100030"]);
        });
    });

    describe("POST /user/info", () => {
        it("returns the user for a valid bearer token", async () => {
            const lookup = stub(userMapper, "getUserByToken", async () => [user]);
            stub(userMapper, "cleanResetPasswordToken", async () => true);

            const res = await api().post("/user/info").set("Authorization", "Bearer tok");

            expect(res.body.data).to.deep.equal(user);
            expect(lookup.calls[0][0]).to.equal("tok");
        });

        it("clears the token and returns empty data when no user matches", async () => {
            stub(userMapper, "getUserByToken", async () => []);
            const clean = stub(userMapper, "cleanResetPasswordTokenOnly", async () => true);

            const res = await api().post("/user/info").set("Authorization", "Bearer tok");

            expect(res.body.data).to.equal("");
            expect(clean.calls[0]).to.deep.equal(["tok"]);
        });

        it("returns 500 when the lookup throws", async () => {
            stub(userMapper, "getUserByToken", async () => { throw new Error("boom"); });

            expect((await api().post("/user/info")).status).to.equal(500);
        });
    });

    describe("POST /user/reset-password", () => {
        it("swaps the reset token for a logged-in session", async () => {
            const lookup = stub(userMapper, "getUserByTokenReset", async () => [user]);
            stub(userMapper, "generateAccessToken", () => "access");
            stub(userMapper, "generateRefreshToken", () => "refresh");
            stub(userMapper, "cleanResetPasswordToken", async () => true);
            const insert = stub(userMapper, "insertUserToken", async () => true);

            const res = await api().post("/user/reset-password").set("Authorization", "Bearer reset-tok");

            expect(res.body.data).to.deep.equal({ ...user, accessToken: "access" });
            expect(lookup.calls[0]).to.deep.equal(["reset-tok", "RESET_PASSWORD"]);
            expect(insert.calls[0]).to.deep.equal([user, "access", "LOGGED"]);
        });

        it("returns 500 when the lookup throws", async () => {
            stub(userMapper, "getUserByTokenReset", async () => { throw new Error("boom"); });

            expect((await api().post("/user/reset-password")).status).to.equal(500);
        });
    });

    describe("POST /user/page-index/...", () => {
        it("passes every route param, including the filter, to getAllUsers", async () => {
            const list = stub(userMapper, "getAllUsers", async () => [{ firstName: "Tom", total: 1 }]);

            const res = await api().post("/user/page-index/2/page-size/5/firstName/asc/tom");

            expect(res.body.data.items).to.have.length(1);
            expect(list.calls[0][0]).to.include({ pageIndex: 2, pageSize: 5, sort: "firstName", order: "asc", filterQuery: "tom" });
        });

        it("defaults the filter when it is omitted", async () => {
            const list = stub(userMapper, "getAllUsers", async () => []);

            await api().post("/user/page-index/2/page-size/5/lastName/desc");

            expect(list.calls[0][0]).to.include({ pageIndex: 2, pageSize: 5, sort: "lastName", order: "desc", filterQuery: "" });
        });

        it("defaults sort, order and filter when only the page size is given", async () => {
            const list = stub(userMapper, "getAllUsers", async () => []);

            await api().post("/user/page-index/3/page-size/25");

            expect(list.calls[0][0]).to.include({ pageIndex: 3, pageSize: 25, sort: "firstName", order: "ASC", filterQuery: "" });
        });

        it("defaults the page size when it is omitted", async () => {
            const list = stub(userMapper, "getAllUsers", async () => []);

            await api().post("/user/page-index/1/page-size");

            expect(list.calls[0][0]).to.include({ pageIndex: 1, pageSize: 10 });
        });

        it("returns 500 on an error string", async () => {
            stub(userMapper, "getAllUsers", async () => "Error: boom");

            expect((await api().post("/user/page-index/1/page-size/5/firstName/asc")).status).to.equal(500);
        });
    });

    describe("PATCH /user", () => {
        it("updates the user when id and user are present", async () => {
            const update = stub(userMapper, "apiUpdateUser", async () => ({ affectedRows: 1 }));

            const res = await api().patch("/user").send({ id: "u1", user: { firstName: "Tom" } });

            expect(res.body.data).to.deep.equal({ message: "User has been successfully updated" });
            expect(update.calls[0][1]).to.equal("u1");
        });

        it("returns 500 when the update fails", async () => {
            stub(userMapper, "apiUpdateUser", async () => undefined);

            expect((await api().patch("/user").send({ id: "u1", user: {} })).status).to.equal(500);
        });

        it("rejects a request missing id or user", async () => {
            const res = await api().patch("/user").send({ id: "u1" });

            expect(res.body.message).to.equal("BadRequestException");
        });
    });

    describe("POST /user/id/:id", () => {
        it("returns the user", async () => {
            const lookup = stub(userMapper, "getUserById", async () => user);

            const res = await api().post("/user/id/u1");

            expect(res.body).to.deep.equal(user);
            expect(lookup.calls[0][0]).to.deep.equal({ id: "u1" });
        });

        it("returns 500 on an error string", async () => {
            stub(userMapper, "getUserById", async () => "Error: boom");

            expect((await api().post("/user/id/u1")).status).to.equal(500);
        });
    });

    describe("apiPostSignUp (not routed)", () => {
        const client = () => mount(UserController.apiPostSignUp);

        it("creates the user when email, password and username are present", async () => {
            stub(userMapper, "apiSignUp", async () => [{}, true]);

            const res = await client().post("/").send({ email: "t@x.ca", password: "pw", username: "tom" });

            expect(res.body.data).to.deep.equal({ message: "User has been created" });
        });

        it("returns 400 when sign-up returns nothing", async () => {
            stub(userMapper, "apiSignUp", async () => undefined);

            expect((await client().post("/").send({ email: "t@x.ca", password: "pw", username: "tom" })).status).to.equal(400);
        });

        it("returns 400 for missing fields", async () => {
            expect((await client().post("/").send({ email: "t@x.ca" })).body.error).to.equal("Missing required fields");
        });
    });

    describe("apiUpdateUser (not routed)", () => {
        const client = () => mount(UserController.apiUpdateUser, "put", "/:id");

        it("updates the user by route id", async () => {
            const update = stub(userMapper, "apiUpdateUser", async () => ({ affectedRows: 1 }));

            const res = await client().put("/u1").send({ firstName: "Tom" });

            expect(res.body).to.deep.equal({ affectedRows: 1 });
            expect(update.calls[0]).to.deep.equal(["u1", { firstName: "Tom" }]);
        });

        it("returns 500 on an error string", async () => {
            stub(userMapper, "apiUpdateUser", async () => "Error: boom");

            expect((await client().put("/u1").send({})).status).to.equal(500);
        });
    });

    describe("POST /user/forgot-password", () => {
        it("stores a reset token and emails the reset link", async () => {
            stub(userMapper, "getUserWithEmail", async () => user);
            stub(userMapper, "generateAccessToken", () => "reset-tok");
            const insert = stub(userMapper, "insertUserToken", async () => true);
            const prepare = stub(mailMapper, "prepareEmail", async () => undefined);
            const send = stub(mailMapper, "apiSendMail", async () => ({}));

            const res = await api().post("/user/forgot-password").send({ email: "t@x.ca" });

            expect(res.status).to.equal(200);
            expect(insert.calls[0]).to.deep.equal([user, "reset-tok"]);
            expect(prepare.calls[0][0]).to.deep.equal({
                email: "t@x.ca",
                email_type: EmailMessaging.EMAIL_TYPE_FORGOTPASSWORD,
                firstName: "Tom",
                token: "reset-tok",
            });
            expect(send.calls).to.have.length(1);
        });

        it("returns 500 for an unknown email", async () => {
            stub(userMapper, "getUserWithEmail", async () => undefined);

            expect((await api().post("/user/forgot-password").send({ email: "x@x.ca" })).status).to.equal(500);
        });
    });

    describe("apiForgotPasswordNoId (not routed)", () => {
        it("replaces the user's token entry and emails them", async () => {
            stub(userMapper, "getUserByEmail", async () => user);
            stub(userMapper, "encrypt", () => "enc");
            const del = stub(userAuthenticationMapper, "deleteTokenEntry", async () => ({}));
            const create = stub(userAuthenticationMapper, "createTokenEntry", async () => ({}));
            stub(mailMapper, "prepareEmail", async () => undefined);
            stub(mailMapper, "apiSendMail", async () => ({}));

            const res = await mount(UserAuthenticationController.apiForgotPasswordNoId).post("/").send({ email: "t@x.ca" });

            expect(res.status).to.equal(200);
            expect(del.calls[0]).to.deep.equal(["u1"]);
            expect(create.calls[0]).to.deep.equal(["u1", "enc"]);
        });

        it("returns 500 for an unknown email", async () => {
            stub(userMapper, "getUserByEmail", async () => undefined);

            expect((await mount(UserAuthenticationController.apiForgotPasswordNoId).post("/").send({})).status).to.equal(500);
        });
    });

    describe("apiResetPasswordToken (not routed)", () => {
        const client = () => mount(UserAuthenticationController.apiResetPasswordToken, "get", "/:token");

        it("returns the user for a valid token", async () => {
            const lookup = stub(userAuthenticationMapper, "getUserBasedOnToken", async () => user);

            const res = await client().get("/tok");

            expect(res.body.data.data).to.deep.equal(user);
            expect(lookup.calls[0][0]).to.deep.equal({ token: "tok" });
        });

        it("returns 400 for an unknown token", async () => {
            stub(userAuthenticationMapper, "getUserBasedOnToken", async () => undefined);

            expect((await client().get("/tok")).status).to.equal(400);
        });
    });
});
