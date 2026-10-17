import { expect } from "chai";
import { mockEvent } from "h3";
import { userMapper } from "../../../mapper";
import { User2 } from "../../../models/User2";
import { stubMethod, stubSQL } from "../helpers/sql-stub";

describe("UserMapper", () => {
    const stubs: { restore: () => void }[] = [];
    const track = <T extends { restore: () => void }>(stub: T) => (stubs.push(stub), stub);

    afterEach(() => stubs.splice(0).reverse().forEach((s) => s.restore()));

    describe("apiUpdateUser", () => {
        it("updates the profile fields for the user id", async () => {
            const db = track(stubSQL(userMapper, { affectedRows: 1 }));

            await userMapper.apiUpdateUser("u1", { firstName: "Tom", lastName: "C", email: "t@x.ca", phone: "555", password: "pw" });

            expect(db.last.sql).to.match(/^update `user` set/);
            expect(db.last.sql).to.include("where `user`.`id` = ?");
            expect(db.last.params).to.deep.equal(["Tom", "C", "t@x.ca", "pw", "u1"]);
        });

        it("never sends phone to the database (the user table has no phone column)", async () => {
            const db = track(stubSQL(userMapper, { affectedRows: 1 }));

            await userMapper.apiUpdateUser("u1", { firstName: "Tom", phone: "555" });

            expect(db.last.sql).to.not.include("phone");
            expect(db.last.params).to.deep.equal(["Tom", "u1"]);
        });
    });

    describe("apiSignUp", () => {
        it("finds or creates the user with a generated uuid", async () => {
            const findOrCreate = track(stubMethod(User2 as any, "findOrCreate", async () => [{ id: "new" }, true]));

            await userMapper.apiSignUp({ userName: "tom", username: "tom", email: "t@x.ca", password: "pw" });

            const { where, defaults } = findOrCreate.calls[0][0];
            expect(where).to.deep.equal({ userName: "tom" });
            expect(defaults).to.include({ userName: "tom", email: "t@x.ca", password: "pw" });
            expect(defaults.id).to.match(/^[0-9a-f-]{36}$/);
        });
    });

    describe("token management", () => {
        it("updateUserToken sets the token and event type for the user", async () => {
            const db = track(stubSQL(userMapper, {}));

            expect(await userMapper.updateUserToken({ id: "u1" }, "tok")).to.equal(true);
            expect(db.last.sql).to.match(/^update `user_authentication` set/);
            expect(db.last.params).to.deep.equal(["tok", "LOGGED", "u1"]);
        });

        it("insertUserToken defaults the event type to RESET_PASSWORD", async () => {
            const db = track(stubSQL(userMapper, {}));

            expect(await userMapper.insertUserToken({ id: "u1" }, "tok")).to.equal(true);
            expect(db.last.params).to.deep.equal(["u1", "tok", "RESET_PASSWORD"]);
        });

        it("cleanResetPasswordToken deletes tokens for the user and type", async () => {
            const db = track(stubSQL(userMapper, {}));

            expect(await userMapper.cleanResetPasswordToken({ id: "u1" })).to.equal(true);
            expect(db.last.sql).to.match(/^delete from `user_authentication`/);
            expect(db.last.params).to.deep.equal(["u1", "PASSWORD_RESET"]);
        });

        it("cleanResetPasswordTokenOnly deletes by token", async () => {
            const db = track(stubSQL(userMapper, {}));

            expect(await userMapper.cleanResetPasswordTokenOnly("tok")).to.equal(true);
            expect(db.last.params).to.deep.equal(["tok"]);
        });
    });

    describe("getAuthToken", () => {
        const eventWith = (authorization?: string) =>
            mockEvent("http://localhost/", { headers: authorization ? { authorization } : {} });

        it("returns the bearer token", async () => {
            expect(await userMapper.getAuthToken(eventWith("Bearer abc.def"))).to.equal("abc.def");
        });

        it("returns null when the header is missing", async () => {
            expect(await userMapper.getAuthToken(eventWith())).to.equal(null);
        });

        it("returns null for a non-bearer scheme", async () => {
            expect(await userMapper.getAuthToken(eventWith("Basic xyz"))).to.equal(null);
        });
    });

    describe("user lookups", () => {
        it("getUserByToken joins tokens and filters on token and type", async () => {
            const db = track(stubSQL(userMapper, [{ id: "u1" }]));

            expect(await userMapper.getUserByToken("tok")).to.deep.equal([{ id: "u1" }]);
            expect(db.last.sql).to.include("inner join `user_authentication`");
            expect(db.last.params).to.include.members(["tok", "LOGGED"]);
        });

        it("getUserByTokenReset accepts a custom event type", async () => {
            const db = track(stubSQL(userMapper, []));

            await userMapper.getUserByTokenReset("tok", "PASSWORD_RESET");

            expect(db.last.params).to.include.members(["tok", "PASSWORD_RESET"]);
        });

        it("getUserWithEmail returns the first match", async () => {
            const db = track(stubSQL(userMapper, [{ id: "u1" }, { id: "u2" }]));

            expect(await userMapper.getUserWithEmail({ email: "t@x.ca" })).to.deep.equal({ id: "u1" });
            expect(db.last.sql).to.include("where `user`.`email` = ?");
        });

        it("getUserBasedOnPassword matches password plus email or id, limited to 1", async () => {
            const db = track(stubSQL(userMapper, [{ id: "u1" }]));

            await userMapper.getUserBasedOnPassword({ password: "pw", username: "t@x.ca", userName: "u1" });

            expect(db.last.sql).to.include("`user`.`password` = ? and (`user`.`email` = ? or `user`.`id` = ?)");
            expect(db.last.sql).to.match(/limit \?$/);
            expect(db.last.params).to.deep.equal(["pw", "t@x.ca", "u1", 1]);
        });

        it("getUserById returns the first match", async () => {
            const db = track(stubSQL(userMapper, [{ id: "u1" }]));

            expect(await userMapper.getUserById({ id: "u1" })).to.deep.equal({ id: "u1" });
            expect(db.last.params).to.deep.equal(["u1"]);
        });

        it("getUserByEmail returns the first match", async () => {
            const db = track(stubSQL(userMapper, [{ id: "u1" }]));

            expect(await userMapper.getUserByEmail("t@x.ca")).to.deep.equal({ id: "u1" });
            expect(db.last.params).to.deep.equal(["t@x.ca"]);
        });
    });

    describe("getAllUsers", () => {
        it("paginates without a filter", async () => {
            const db = track(stubSQL(userMapper, []));

            await userMapper.getAllUsers({ pageIndex: 2, pageSize: 10 });

            expect(db.last.sql).to.not.include("where");
            expect(db.last.params).to.deep.equal([10, 10]);
        });

        it("matches filterQuery against first OR last name", async () => {
            const db = track(stubSQL(userMapper, []));

            await userMapper.getAllUsers({ pageIndex: 2, pageSize: 10, filterQuery: "tom" });

            expect(db.last.sql).to.include("where (`user`.`firstName` like ? or `user`.`lastName` like ?)");
            expect(db.last.params).to.deep.equal(["%tom%", "%tom%", 10, 10]);
        });
    });

    describe("encrypt", () => {
        it("returns a hex string that differs from the input", () => {
            const encrypted = userMapper.encrypt("secret");

            expect(encrypted).to.match(/^[0-9a-f]+$/);
            expect(encrypted).to.not.equal("secret");
        });

        it("is deterministic for the same input within a process", () => {
            expect(userMapper.encrypt("secret")).to.equal(userMapper.encrypt("secret"));
        });
    });

    describe("getters", () => {
        it("exposes param names", () => {
            expect(userMapper.PARAMS_ID).to.equal("id");
            expect(userMapper.PARAMS_EMAIL).to.equal("email");
            expect(userMapper.PARAMS_PASSWORD).to.equal("password");
            expect(userMapper.PARAMS_USERNAME).to.equal("username");
            expect(userMapper.PARAMS_USER).to.equal("user");
            expect(userMapper.LIST_NAME).to.equal("users");
            expect(userMapper.DEFAULT_SORT).to.equal("firstName");
        });
    });
});
