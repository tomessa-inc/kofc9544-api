import { expect } from "chai";
import { teamMapper } from "../../../mapper";
import { stubSQL } from "../helpers/sql-stub";

describe("TeamMapper", () => {
    let db: ReturnType<typeof stubSQL>;

    afterEach(() => db?.restore());

    describe("insertTeam", () => {
        it("inserts a team with id, name, captain and hole", async () => {
            db = stubSQL(teamMapper, { affectedRows: 1 });

            const result = await teamMapper.insertTeam("eagles", "Eagles", "John Smith", "hole-1");

            expect(result).to.deep.equal({ affectedRows: 1 });
            expect(db.last.sql).to.match(/^insert into `team`/);
            expect(db.last.params).to.deep.equal(["eagles", "Eagles", "John Smith", "hole-1"]);
        });
    });

    describe("doesTeamExist", () => {
        it("matches on either id or name", async () => {
            db = stubSQL(teamMapper, [{ id: "eagles" }]);

            const result = await teamMapper.doesTeamExist("eagles");

            expect(result).to.deep.equal([{ id: "eagles" }]);
            expect(db.last.sql).to.include("from `team`");
            expect(db.last.sql).to.include("`team`.`id` = ? or `team`.`name` = ?");
            expect(db.last.params).to.deep.equal(["eagles", "eagles"]);
        });
    });

    describe("createTeamRegistration", () => {
        const players = [{ player: "John Smith", email: "j@x.ca", phone: "555" }];

        it("slugifies the team name into the id and uses the first player as captain", async () => {
            db = stubSQL(teamMapper, { affectedRows: 1 });

            const result = await teamMapper.createTeamRegistration({ team_name: "The Big Hitters", players, email_type: "register" });

            expect(result).to.deep.equal({ success: true, data: { id: "the-big-hitters", affectedRows: 1 } });
            expect(db.last.sql).to.match(/^insert into `team`/);
            expect(db.last.params).to.include.members(["the-big-hitters", "The Big Hitters", "John Smith"]);
        });

        it("falls back to the first player's name when team_name is empty", async () => {
            db = stubSQL(teamMapper, { affectedRows: 1 });

            const result = await teamMapper.createTeamRegistration({ team_name: "", players, email_type: "register" });

            expect(result).to.deep.equal({ success: true, data: { id: "john-smith", affectedRows: 1 } });
        });

        it("returns a conflict message when the insert fails", async () => {
            db = stubSQL(teamMapper, () => { throw new Error("Duplicate entry"); });

            const result = await teamMapper.createTeamRegistration({ team_name: "Eagles", players, email_type: "register" });

            expect(result).to.deep.equal({ success: false, message: 'Team name "Eagles" already exists' });
        });
    });

    describe("createTeamFromCSV", () => {
        const players = [{ player: "Jane Doe", email: "j@x.ca", phone: "555" }];

        it("creates the team the same way as a registration", async () => {
            db = stubSQL(teamMapper, { affectedRows: 1 });

            const result = await teamMapper.createTeamFromCSV({ team_name: "Birdie Club", players });

            expect(result).to.deep.equal({ success: true, data: { id: "birdie-club", affectedRows: 1 } });
            expect(db.last.params).to.include.members(["birdie-club", "Birdie Club", "Jane Doe"]);
        });

        it("falls back to the first player's name when team_name is empty", async () => {
            db = stubSQL(teamMapper, { affectedRows: 1 });

            const result = await teamMapper.createTeamFromCSV({ team_name: "", players });

            expect(result.data.id).to.equal("jane-doe");
        });

        it("returns a conflict message when the insert fails", async () => {
            db = stubSQL(teamMapper, () => { throw new Error("Duplicate entry"); });

            const result = await teamMapper.createTeamFromCSV({ team_name: "Birdie Club", players });

            expect(result.success).to.equal(false);
        });
    });

    describe("getAllTeamsNeedingPlayersLabelValue", () => {
        it("returns teams with fewer than 4 players as label/value pairs", async () => {
            db = stubSQL(teamMapper, [{ value: "eagles", label: "Eagles-Hole 1" }]);

            const result = await teamMapper.getAllTeamsNeedingPlayersLabelValue({});

            expect(result).to.deep.equal([{ value: "eagles", label: "Eagles-Hole 1" }]);
            expect(db.last.sql).to.include("inner join `player`");
            expect(db.last.sql).to.include("group by `team`.`id`, `team`.`name`");
            expect(db.last.sql).to.include("having `countPlayers` < ?");
            expect(db.last.params).to.include(4);
        });
    });

    describe("getAllTeamsNeedingPlayers", () => {
        it("groups teams by id and keeps those with fewer than 4 players", async () => {
            db = stubSQL(teamMapper, []);

            await teamMapper.getAllTeamsNeedingPlayers({});

            expect(db.last.sql).to.include("from `team` inner join `player`");
            expect(db.last.sql).to.include("having");
            expect(db.last.params).to.include(4);
        });
    });

    describe("getAllTeams", () => {
        it("paginates using pageIndex and pageSize", async () => {
            db = stubSQL(teamMapper, []);

            await teamMapper.getAllTeams({ pageIndex: 3, pageSize: 10 });

            expect(db.last.sql).to.include("from `team`");
            expect(db.last.sql).to.match(/limit \? offset \?$/);
            expect(db.last.params.slice(-2)).to.deep.equal([10, 20]);
        });
    });

    describe("getPlayersByTeamId", () => {
        it("is not implemented and resolves to undefined", async () => {
            expect(await teamMapper.getPlayersByTeamId({})).to.equal(undefined);
        });
    });

    describe("updateTeamById", () => {
        it("updates name, captain and hole for the given id", async () => {
            db = stubSQL(teamMapper, { affectedRows: 1 });

            const result = await teamMapper.updateTeamById({ name: "Eagles", captain: "Jo", hole: "hole-2" }, "eagles");

            expect(result).to.deep.equal({ affectedRows: 1 });
            expect(db.last.sql).to.match(/^update `team` set/);
            expect(db.last.sql).to.include("where `team`.`id` = ?");
            expect(db.last.params).to.deep.equal(["Eagles", "Jo", "hole-2", "eagles"]);
        });
    });

    describe("getters", () => {
        it("exposes default sort and name param", () => {
            expect(teamMapper.DEFAULT_SORT).to.equal("name");
            expect(teamMapper.PARAMS_NAME).to.equal("name");
        });
    });
});
