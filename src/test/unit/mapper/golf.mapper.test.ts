import { expect } from "chai";
import { golfMapper, mailMapper } from "../../../mapper";
import { EmailMessaging } from "../../../models/EmailMessaging";
import { stubMethod, stubSQL } from "../helpers/sql-stub";

describe("GolfMapper", () => {
    let db: ReturnType<typeof stubSQL>;

    afterEach(() => db?.restore());

    describe("checkIfPlayerExists", () => {
        it("matches on both name and email", async () => {
            db = stubSQL(golfMapper, [{ id: 1 }]);

            const result = await golfMapper.checkIfPlayerExists("John Smith", "j@x.ca");

            expect(result).to.deep.equal([{ id: 1 }]);
            expect(db.last.sql).to.include("from `player`");
            expect(db.last.sql).to.include("`player`.`name` = ? and `player`.`email` = ?");
            expect(db.last.params).to.deep.equal(["John Smith", "j@x.ca"]);
        });
    });

    describe("insertPlayer", () => {
        it("inserts the player linked to the team", async () => {
            db = stubSQL(golfMapper, { affectedRows: 1 });

            await golfMapper.insertPlayer("John Smith", "j@x.ca", "John", "Smith", "555", "eagles");

            expect(db.last.sql).to.match(/^insert into `player`/);
            expect(db.last.params).to.include.members(["John Smith", "j@x.ca", "John", "Smith", "555", "eagles"]);
        });
    });

    describe("createPlayerRegistration", () => {
        let mail: ReturnType<typeof stubMethod>;

        afterEach(() => mail?.restore());

        const registration = {
            players: [
                { player: "John Smith", email: "j@x.ca", phone: "555", allergies: "nuts" },
                { player: "Jane Doe", email: "jd@x.ca", phone: "556" },
            ],
            TeamId: "eagles",
            individual: false,
            payment: 100,
            member: "yes",
            email_type: "register",
        };

        it("inserts every player and sends each one a confirmation email with their new id", async () => {
            db = stubSQL(golfMapper, (_q, i) => ({ insertId: 100 + i }));
            mail = stubMethod(mailMapper, "setupEmail");

            await golfMapper.createPlayerRegistration(registration);

            expect(db.calls).to.have.length(2);
            expect(db.calls[0].params).to.include.members(["John Smith", "j@x.ca", "555", "eagles", "nuts", 100, "yes"]);
            expect(mail.calls).to.have.length(2);
            expect(mail.calls[0][0].email_type).to.equal(EmailMessaging.EMAIL_TYPE_SEND_ID);
            expect(mail.calls[0][0].data).to.include({ name: "John Smith", id: 100 });
            expect(mail.calls[1][0].data).to.include({ name: "Jane Doe", id: 101 });
        });

        it("stores null for optional fields that are missing", async () => {
            db = stubSQL(golfMapper, { insertId: 1 });
            mail = stubMethod(mailMapper, "setupEmail");

            await golfMapper.createPlayerRegistration({ players: [registration.players[1]], individual: true, email_type: "register" });

            expect(mail.calls[0][0].data).to.include({ TeamId: null, allergies: null, payment: null, member: null });
        });

        it("returns the error instead of throwing when an insert fails", async () => {
            const failure = new Error("db down");
            db = stubSQL(golfMapper, () => { throw failure; });
            mail = stubMethod(mailMapper, "setupEmail");

            const result = await golfMapper.createPlayerRegistration(registration);

            expect(result).to.equal(failure);
            expect(mail.calls).to.have.length(0);
        });
    });

    describe("updatePlayerById", () => {
        it("updates the editable player fields for the given id", async () => {
            db = stubSQL(golfMapper, { affectedRows: 1 });

            const result = await golfMapper.updatePlayerById(
                { name: "John", email: "j@x.ca", phone: "555", TeamId: "eagles", allergies: "none" },
                7,
            );

            expect(result).to.deep.equal({ affectedRows: 1 });
            expect(db.last.sql).to.match(/^update `player` set/);
            expect(db.last.sql).to.include("where `player`.`id` = ?");
            expect(db.last.params).to.deep.equal(["John", "j@x.ca", "555", "eagles", "none", 7]);
        });
    });

    describe("getPlayersByTeamId", () => {
        it("joins player to team and filters on the team id", async () => {
            db = stubSQL(golfMapper, []);

            await golfMapper.getPlayersByTeamId({ id: "eagles" });

            expect(db.last.sql).to.include("from `player` inner join `team`");
            expect(db.last.sql).to.include("where `team`.`id` = ?");
            expect(db.last.params).to.deep.equal(["eagles"]);
        });
    });

    describe("getAllPlayers", () => {
        it("paginates using pageIndex and pageSize", async () => {
            db = stubSQL(golfMapper, []);

            await golfMapper.getAllPlayers({ pageIndex: 2, pageSize: 25 });

            expect(db.last.sql).to.include("from `player`");
            expect(db.last.params.slice(-2)).to.deep.equal([25, 25]);
        });
    });

    describe("getAllPlayersNeedingTeamsLabelValue", () => {
        it("filters to players that have a team", async () => {
            db = stubSQL(golfMapper, []);

            await golfMapper.getAllPlayersNeedingTeamsLabelValue({});

            expect(db.last.sql).to.include("from `player`");
            expect(db.last.sql).to.include("`player`.`TeamId` is not null");
        });
    });

    describe("getPlayersCSV", () => {
        it("orders by last name ascending when order is asc", async () => {
            db = stubSQL(golfMapper, []);

            await golfMapper.getPlayersCSV({ order: "asc" });

            expect(db.last.sql).to.match(/order by `player`\.`lastName` asc$/);
        });

        it("orders by last name descending otherwise", async () => {
            db = stubSQL(golfMapper, []);

            await golfMapper.getPlayersCSV({ order: "desc" });

            expect(db.last.sql).to.match(/order by `player`\.`lastName` desc$/);
        });
    });

    describe("deleteTeam", () => {
        it("deletes the team with the given id", async () => {
            db = stubSQL(golfMapper, { affectedRows: 1 });

            await golfMapper.deleteTeam("eagles");

            expect(db.last.sql).to.equal("delete from `team` where `team`.`id` = ?");
            expect(db.last.params).to.deep.equal(["eagles"]);
        });
    });

    describe("deletePlayer", () => {
        it("deletes the player with the given id", async () => {
            db = stubSQL(golfMapper, { affectedRows: 1 });

            await golfMapper.deletePlayer(7);

            expect(db.last.sql).to.equal("delete from `player` where `player`.`id` = ?");
            expect(db.last.params).to.deep.equal([7]);
        });
    });

    describe("importPlayers", () => {
        it("is not implemented and resolves to undefined", async () => {
            expect(await golfMapper.importPlayers([])).to.equal(undefined);
        });
    });

    describe("getters", () => {
        it("exposes sort and param names", () => {
            expect(golfMapper.DEFAULT_SORT).to.equal("name");
            expect(golfMapper.PARAMS_NAME).to.equal("name");
            expect(golfMapper.LABEL_SORT).to.equal("label");
            expect(golfMapper.VALUE_SORT).to.equal("value");
        });
    });
});
