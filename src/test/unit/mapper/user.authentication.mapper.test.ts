import { expect } from "chai";
import { userAuthenticationMapper } from "../../../mapper/user.authentication.mapper";
import { stubSQL } from "../helpers/sql-stub";

describe("UserAuthenticationMapper", () => {
    let db: ReturnType<typeof stubSQL>;

    afterEach(() => db?.restore());

    describe("getUserBasedOnToken", () => {
        it("returns the first user matching the token", async () => {
            db = stubSQL(userAuthenticationMapper, [{ id: "u1" }, { id: "u2" }]);

            const result = await userAuthenticationMapper.getUserBasedOnToken({ token: "abc" });

            expect(result).to.deep.equal({ id: "u1" });
            expect(db.last.sql).to.include("from `user_authentication` inner join `user`");
            expect(db.last.sql).to.include("where `user_authentication`.`token` = ?");
            expect(db.last.params).to.deep.equal(["abc"]);
        });
    });

    describe("deleteTokenEntry", () => {
        it("deletes every token for the user", async () => {
            db = stubSQL(userAuthenticationMapper, { affectedRows: 1 });

            await userAuthenticationMapper.deleteTokenEntry("u1");

            expect(db.last.sql).to.equal("delete from `user_authentication` where `user_authentication`.`UserId` = ?");
            expect(db.last.params).to.deep.equal(["u1"]);
        });
    });

    describe("createTokenEntry", () => {
        it("stores a password-reset token keyed by user and token", async () => {
            db = stubSQL(userAuthenticationMapper, { affectedRows: 1 });

            await userAuthenticationMapper.createTokenEntry("u1", "abc");

            expect(db.last.sql).to.match(/^insert into `user_authentication`/);
            // The composite `${id}-${token}` id is dropped: the Drizzle schema has no id column.
            expect(db.last.params).to.deep.equal(["u1", "abc", "PASSWORD_RESET"]);
        });
    });

    describe("getters", () => {
        it("exposes param names", () => {
            expect(userAuthenticationMapper.PARAMS_ID).to.equal("id");
            expect(userAuthenticationMapper.PARAMS_EMAIL).to.equal("email");
            expect(userAuthenticationMapper.PARAMS_PASSWORD).to.equal("password");
            expect(userAuthenticationMapper.PARAMS_USERNAME).to.equal("userName");
            expect(userAuthenticationMapper.PARAMS_USER).to.equal("user");
            expect(userAuthenticationMapper.LIST_NAME).to.equal("users");
            expect(userAuthenticationMapper.DEFAULT_SORT).to.equal("firstName");
        });
    });
});
