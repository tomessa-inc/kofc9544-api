import { expect } from "chai";
import { holeMapper } from "../../../mapper";
import { stubSQL } from "../helpers/sql-stub";

describe("HoleMapper", () => {
    let db: ReturnType<typeof stubSQL>;

    afterEach(() => db?.restore());

    describe("createHole", () => {
        it("inserts the hole id, name and par", async () => {
            db = stubSQL(holeMapper, { affectedRows: 1 });

            await holeMapper.createHole({ id: "hole-1", name: "Hole 1", par: 4 });

            expect(db.last.sql).to.match(/^insert into `hole`/);
            expect(db.last.params).to.deep.equal(["hole-1", "Hole 1", 4]);
        });

        it("returns the error instead of throwing when the insert fails", async () => {
            const failure = new Error("db down");
            db = stubSQL(holeMapper, () => { throw failure; });

            expect(await holeMapper.createHole({ id: "hole-1", name: "Hole 1", par: 4 })).to.equal(failure);
        });
    });

    describe("getHoleIdByHoleName", () => {
        it("looks the hole up by name", async () => {
            db = stubSQL(holeMapper, [{ id: "hole-1" }]);

            const result = await holeMapper.getHoleIdByHoleName("Hole 1");

            expect(result).to.deep.equal([{ id: "hole-1" }]);
            expect(db.last.sql).to.include("where `hole`.`name` = ?");
            expect(db.last.params).to.deep.equal(["Hole 1"]);
        });
    });

    describe("updatHoleById", () => {
        it("updates name and par for the given id", async () => {
            db = stubSQL(holeMapper, { affectedRows: 1 });

            await holeMapper.updatHoleById({ name: "Hole 9", par: 5 }, "hole-9");

            expect(db.last.sql).to.match(/^update `hole` set/);
            expect(db.last.params).to.deep.equal(["Hole 9", 5, "hole-9"]);
        });
    });

    describe("getPlayersByTeamId", () => {
        it("joins player to team and filters on the team id", async () => {
            db = stubSQL(holeMapper, []);

            await holeMapper.getPlayersByTeamId({ id: "eagles" });

            expect(db.last.sql).to.include("inner join `team`");
            expect(db.last.params).to.deep.equal(["eagles"]);
        });
    });

    describe("getAllHolesNeedingTeamsLabelValue", () => {
        it("returns holes with fewer than 2 teams", async () => {
            db = stubSQL(holeMapper, []);

            await holeMapper.getAllHolesNeedingTeamsLabelValue({});

            expect(db.last.sql).to.include("from `hole` left join `team`");
            expect(db.last.sql).to.include("group by `hole`.`id`, `hole`.`name`");
            expect(db.last.params).to.include(2);
        });
    });

    describe("getAllHoles", () => {
        it("paginates and sorts by name ascending when order is asc", async () => {
            db = stubSQL(holeMapper, []);

            await holeMapper.getAllHoles({ pageIndex: 2, pageSize: 18, order: "asc" });

            expect(db.last.sql).to.include("order by `hole`.`name` asc");
            expect(db.last.params.slice(-2)).to.deep.equal([18, 18]);
        });

        it("sorts by name descending otherwise", async () => {
            db = stubSQL(holeMapper, []);

            await holeMapper.getAllHoles({ pageIndex: 1, pageSize: 18, order: "desc" });

            expect(db.last.sql).to.include("order by `hole`.`name` desc");
        });
    });

    describe("getAllPlayersNeedingTeamsLabelValue", () => {
        it("filters to players that have a team", async () => {
            db = stubSQL(holeMapper, []);

            await holeMapper.getAllPlayersNeedingTeamsLabelValue({});

            expect(db.last.sql).to.include("`player`.`TeamId` is not null");
        });
    });

    describe("getters", () => {
        it("exposes sort and label names", () => {
            expect(holeMapper.DEFAULT_SORT).to.equal("name");
            expect(holeMapper.PARAMS_NAME).to.equal("name");
            expect(holeMapper.LABEL_SORT).to.equal("label");
            expect(holeMapper.LABEL_VALUE).to.equal("value");
        });
    });
});
