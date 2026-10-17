import { expect } from "chai";
import { AccessMapper } from "../../../mapper/access.mapper";
import { SessionTokenMapper, TokenType } from "../../../mapper/session-token.mapper";
import { UserMapper } from "../../../mapper/user.mapper";
import { fakeExecutor } from "../helpers/fake-executor";

describe("auth mappers", () => {
    describe("UserMapper", () => {
        it("findLoginCandidates looks the login up by email or id (the password is checked in code, not SQL)", async () => {
            const db = fakeExecutor([{ id: "u1", password: "scrypt$..." }]);

            expect(await new UserMapper(db).findLoginCandidates("tom@x.ca")).to.deep.equal([{ id: "u1", password: "scrypt$..." }]);
            expect(db.last.sql).to.include("`password` from `user` where (`user`.`email` = ? or `user`.`id` = ?) limit ?");
            expect(db.last.params).to.deep.equal(["tom@x.ca", "tom@x.ca", 5]);
        });

        it("setPassword stores a new hash; findUnhashedPasswords finds values that are not scrypt hashes", async () => {
            const db = fakeExecutor([]);
            const users = new UserMapper(db);

            await users.setPassword("u1", "scrypt$hash");
            await users.findUnhashedPasswords();

            expect(db.calls[0].sql).to.equal("update `user` set `password` = ? where `user`.`id` = ?");
            expect(db.calls[0].params).to.deep.equal(["scrypt$hash", "u1"]);
            expect(db.calls[1].sql).to.equal("select `id`, `password` from `user` where `user`.`password` not like ?");
            expect(db.calls[1].params).to.deep.equal(["scrypt$%"]);
        });

        it("profile lookups never select the password or token columns", async () => {
            const db = fakeExecutor([]);
            const users = new UserMapper(db);

            await users.findByEmail("a");
            await users.findById("u1");
            await users.findPage({ offset: 0, limit: 10 });

            for (const { sql } of db.calls) {
                const columns = sql.slice(0, sql.indexOf(" from "));
                expect(columns).to.not.match(/`password`|`token`/);
            }
        });

        it("findPage filters on first OR last name", async () => {
            const db = fakeExecutor([]);

            await new UserMapper(db).findPage({ offset: 10, limit: 10 }, "tom");

            expect(db.last.sql).to.include("where (`user`.`firstName` like ? or `user`.`lastName` like ?)");
            expect(db.last.params).to.deep.equal(["%tom%", "%tom%", 10, 10]);
        });

        it("findPage without a filter has no where clause", async () => {
            const db = fakeExecutor([]);

            await new UserMapper(db).findPage({ offset: 0, limit: 10 });

            expect(db.last.sql).to.not.include("where");
        });

        it("findById returns the member with role objects", async () => {
            const db = fakeExecutor([{ id: "u1", access: [] }]);

            expect(await new UserMapper(db).findById("u1")).to.deep.equal({ id: "u1", access: [] });
            expect(db.last.sql).to.include("JSON_OBJECT('id', access.id, 'name', access.name)");
        });

        it("insert maps userName to the column and blanks token; update sets only the given fields", async () => {
            const db = fakeExecutor({ affectedRows: 1 });
            const users = new UserMapper(db);

            await users.insert({ id: "u1", userName: "tom", email: "t@x.ca", password: "pw", firstName: "Tom", lastName: "C" });
            await users.update("u1", { firstName: "T" });

            expect(db.calls[0].sql).to.match(/^insert into `user`/);
            expect(db.calls[0].params).to.include.members(["u1", "tom", "t@x.ca", "pw", "Tom", "C", ""]);
            expect(db.calls[1].sql).to.equal("update `user` set `firstName` = ? where `user`.`id` = ?");
        });

        it("findByUserNameOrEmail matches either", async () => {
            const db = fakeExecutor([]);

            await new UserMapper(db).findByUserNameOrEmail("tom", "t@x.ca");

            expect(db.last.sql).to.include("where (`user`.`userName` = ? or `user`.`email` = ?)");
        });
    });

    describe("SessionTokenMapper", () => {
        it("uses the token types the database already holds", () => {
            expect(TokenType).to.deep.equal({ Session: "LOGGED", PasswordReset: "RESET_PASSWORD" });
        });

        it("insert stores the user, token and type", async () => {
            const db = fakeExecutor({ affectedRows: 1 });

            await new SessionTokenMapper(db).insert("u1", "tok", TokenType.PasswordReset);

            expect(db.last.sql).to.equal("insert into `user_authentication` (`UserId`, `token`, `eventType`) values (?, ?, ?)");
            expect(db.last.params).to.deep.equal(["u1", "tok", "RESET_PASSWORD"]);
        });

        it("deleteForUser revokes one type, or all types", async () => {
            const db = fakeExecutor({ affectedRows: 1 });
            const sessions = new SessionTokenMapper(db);

            await sessions.deleteForUser("u1", TokenType.Session);
            await sessions.deleteForUser("u1");

            expect(db.calls[0].sql).to.equal("delete from `user_authentication` where (`user_authentication`.`UserId` = ? and `user_authentication`.`eventType` = ?)");
            expect(db.calls[0].params).to.deep.equal(["u1", "LOGGED"]);
            expect(db.calls[1].sql).to.equal("delete from `user_authentication` where `user_authentication`.`UserId` = ?");
        });

        it("deleteToken removes one token", async () => {
            const db = fakeExecutor({ affectedRows: 1 });

            await new SessionTokenMapper(db).deleteToken("tok");

            expect(db.last.params).to.deep.equal(["tok"]);
        });

        it("findUser joins the token to its member, filtered by type", async () => {
            const db = fakeExecutor([{ id: "u1" }]);

            expect(await new SessionTokenMapper(db).findUser("tok", TokenType.Session)).to.deep.equal({ id: "u1" });
            expect(db.last.sql).to.include("from `user` inner join `user_authentication`");
            expect(db.last.sql).to.include("concat(`user`.`firstName`, ' ', `user`.`lastName`)");
            expect(db.last.params).to.deep.equal(["tok", "LOGGED"]);
        });
    });

    describe("AccessMapper", () => {
        it("findPage, findByName and insert", async () => {
            const db = fakeExecutor([]);
            const roles = new AccessMapper(db);

            await roles.findPage({ offset: 5, limit: 5 });
            await roles.findByName("admin");
            await roles.insert({ id: "admin", name: "Admin", description: "Admins" });

            expect(db.calls[0].params).to.deep.equal([5, 5]);
            expect(db.calls[1].sql).to.include("where `access`.`name` = ?");
            expect(db.calls[2].params).to.deep.equal(["admin", "Admin", "Admins"]);
        });
    });
});
