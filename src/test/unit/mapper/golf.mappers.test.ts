import { expect } from "chai";
import { HoleMapper } from "../../../mapper/hole.mapper";
import { PlayerMapper } from "../../../mapper/player.mapper";
import { PlayerYearMapper } from "../../../mapper/player-year.mapper";
import { TeamMapper } from "../../../mapper/team.mapper";
import { YearMapper } from "../../../mapper/year.mapper";
import { fakeExecutor } from "../helpers/fake-executor";

describe("golf mappers", () => {
    describe("PlayerMapper", () => {
        it("findByNameAndEmail matches both columns", async () => {
            const db = fakeExecutor([{ id: 1 }]);

            expect(await new PlayerMapper(db).findByNameAndEmail("John Smith", "j@x.ca")).to.deep.equal([{ id: 1 }]);
            expect(db.last.sql).to.include("from `player` where (`player`.`name` = ? and `player`.`email` = ?)");
            expect(db.last.params).to.deep.equal(["John Smith", "j@x.ca"]);
        });

        it("insert writes only the given columns", async () => {
            const db = fakeExecutor({ insertId: 7, affectedRows: 1 });

            const result = await new PlayerMapper(db).insert({ name: "Jo", email: "jo@x.ca", phone: "555", TeamId: "eagles", individual: false });

            expect(result).to.deep.equal({ insertId: 7, affectedRows: 1 });
            expect(db.last.sql).to.match(/^insert into `player` \(.*`name`.*`email`.*`phone`.*`TeamId`.*`individual`.*\) values/);
            expect(db.last.params).to.include.members(["Jo", "jo@x.ca", "555", "eagles", false]);
        });

        it("update sets the changed columns for the id", async () => {
            const db = fakeExecutor({ affectedRows: 1 });

            await new PlayerMapper(db).update(7, { name: "Jo", allergies: "nuts" });

            expect(db.last.sql).to.equal("update `player` set `name` = ?, `allergies` = ? where `player`.`id` = ?");
            expect(db.last.params).to.deep.equal(["Jo", "nuts", 7]);
        });

        it("delete removes the player by id", async () => {
            const db = fakeExecutor({ affectedRows: 1 });

            await new PlayerMapper(db).delete(7);

            expect(db.last.sql).to.equal("delete from `player` where `player`.`id` = ?");
            expect(db.last.params).to.deep.equal([7]);
        });

        it("findPage limits and offsets, with the overall total", async () => {
            const db = fakeExecutor([]);

            await new PlayerMapper(db).findPage({ offset: 20, limit: 10 });

            expect(db.last.sql).to.include("(SELECT count(*) FROM player)");
            expect(db.last.sql).to.match(/limit \? offset \?$/);
            expect(db.last.params).to.deep.equal([10, 20]);
        });

        it("findByTeam filters on the team and counts that team's players (not a hard-coded one)", async () => {
            const db = fakeExecutor([]);

            await new PlayerMapper(db).findByTeam("eagles");

            expect(db.last.sql).to.include("(SELECT count(*) FROM player AS p WHERE p.TeamId = ?)");
            expect(db.last.sql).to.include("where `player`.`TeamId` = ?");
            expect(db.last.params).to.deep.equal(["eagles", "eagles"]);
            expect(db.last.sql).to.not.include("portage");
        });

        it("findWithoutTeamAsOptions lists unassigned players as label/value", async () => {
            const db = fakeExecutor([]);

            await new PlayerMapper(db).findWithoutTeamAsOptions();

            expect(db.last.sql).to.equal("select `id`, `name` from `player` where `player`.`TeamId` is null");
        });

        for (const order of ["asc", "desc"] as const) {
            it(`findForExport orders by last name ${order}`, async () => {
                const db = fakeExecutor([]);

                await new PlayerMapper(db).findForExport(order);

                expect(db.last.sql).to.match(new RegExp(`order by \`player\`\\.\`lastName\` ${order}$`));
            });
        }
    });

    describe("TeamMapper", () => {
        it("findByIdOrName matches either column", async () => {
            const db = fakeExecutor([]);

            await new TeamMapper(db).findByIdOrName("eagles", "Eagles");

            expect(db.last.sql).to.include("where (`team`.`id` = ? or `team`.`name` = ?)");
            expect(db.last.params).to.deep.equal(["eagles", "Eagles"]);
        });

        it("findByIdOrName defaults the name to the id", async () => {
            const db = fakeExecutor([]);

            await new TeamMapper(db).findByIdOrName("eagles");

            expect(db.last.params).to.deep.equal(["eagles", "eagles"]);
        });

        it("insert, update and delete target the team table", async () => {
            const db = fakeExecutor({ affectedRows: 1 });
            const teams = new TeamMapper(db);

            await teams.insert({ id: "eagles", name: "Eagles", captain: "Jo" });
            await teams.update("eagles", { hole: "hole-1" });
            await teams.delete("eagles");

            expect(db.calls.map((c) => c.sql)).to.deep.equal([
                "insert into `team` (`id`, `name`, `captain`, `hole`, `createdAt`, `updatedAt`) values (?, ?, ?, default, default, default)",
                "update `team` set `hole` = ? where `team`.`id` = ?",
                "delete from `team` where `team`.`id` = ?",
            ]);
            expect(db.calls.map((c) => c.params)).to.deep.equal([["eagles", "Eagles", "Jo"], ["hole-1", "eagles"], ["eagles"]]);
        });

        it("findPage includes player count, hole, par and total", async () => {
            const db = fakeExecutor([]);

            await new TeamMapper(db).findPage({ offset: 0, limit: 10 });

            // Outer columns must be qualified inside correlated subqueries.
            expect(db.last.sql).to.include("(SELECT count(*) FROM player WHERE player.TeamId = team.id)");
            expect(db.last.sql).to.include("(SELECT hole.name FROM hole WHERE hole.id = team.hole)");
            expect(db.last.sql).to.include("(SELECT hole.par FROM hole WHERE hole.id = team.hole)");
            expect(db.last.sql).to.include("(SELECT count(*) FROM team)");
        });

        for (const method of ["findNeedingPlayers", "findNeedingPlayersAsOptions"] as const) {
            it(`${method} left-joins players so empty teams are included, keeping teams under 4`, async () => {
                const db = fakeExecutor([]);

                await new TeamMapper(db)[method]();

                expect(db.last.sql).to.include("from `team` left join `player`");
                expect(db.last.sql).to.include("group by `team`.`id`, `team`.`name` having count(`player`.`id`) < ?");
                expect(db.last.params.at(-1)).to.equal(4);
            });
        }
    });

    describe("HoleMapper", () => {
        it("insert, findByName and update", async () => {
            const db = fakeExecutor([]);
            const holes = new HoleMapper(db);

            await holes.insert({ id: "hole-1", name: "Hole 1", par: "4" });
            await holes.findByName("Hole 1");
            await holes.update("hole-1", { par: "5" });

            expect(db.calls[0].sql).to.equal("insert into `hole` (`name`, `par`, `id`) values (?, ?, ?)");
            expect(db.calls[0].params).to.deep.equal(["Hole 1", "4", "hole-1"]);
            expect(db.calls[1].sql).to.include("where `hole`.`name` = ?");
            expect(db.calls[2].sql).to.equal("update `hole` set `par` = ? where `hole`.`id` = ?");
        });

        for (const order of ["asc", "desc"] as const) {
            it(`findPage orders by name ${order} and pages`, async () => {
                const db = fakeExecutor([]);

                await new HoleMapper(db).findPage({ offset: 18, limit: 18 }, order);

                expect(db.last.sql).to.include(`order by \`hole\`.\`name\` ${order}`);
                expect(db.last.params).to.deep.equal([18, 18]);
            });
        }

        it("findNeedingTeamsAsOptions keeps holes with fewer than 2 teams", async () => {
            const db = fakeExecutor([]);

            await new HoleMapper(db).findNeedingTeamsAsOptions();

            expect(db.last.sql).to.include("from `hole` left join `team`");
            expect(db.last.sql).to.include("having count(`team`.`id`) < ?");
            expect(db.last.params.at(-1)).to.equal(2);
        });
    });

    describe("player years", () => {
        it("PlayerMapper.findById selects the player by id", async () => {
            const db = fakeExecutor([{ id: 7 }]);

            expect(await new PlayerMapper(db).findById(7)).to.deep.equal([{ id: 7 }]);
            expect(db.last.sql).to.match(/from `player` where `player`.`id` = \?$/);
            expect(db.last.params).to.deep.equal([7]);
        });

        it("PlayerMapper.findPageByYear pages the year's players with that year's total", async () => {
            const db = fakeExecutor([]);

            await new PlayerMapper(db).findPageByYear(3, { offset: 10, limit: 10 });

            expect(db.last.sql).to.include("(SELECT count(*) FROM player_year WHERE player_year.YearId = ?) as `total`");
            expect(db.last.sql).to.include("where `player`.`id` in (select `PlayerId` from `player_year` where `player_year`.`YearId` = ?) limit ? offset ?");
            expect(db.last.params).to.deep.equal([3, 3, 10, 10]);
        });

        it("YearMapper.findPage pages years newest first with each year's player count and the overall total", async () => {
            const db = fakeExecutor([]);

            await new YearMapper(db).findPage({ offset: 10, limit: 10 });

            expect(db.last.sql).to.include("(SELECT count(*) FROM player_year WHERE player_year.YearId = year.id) as `players`");
            expect(db.last.sql).to.include("(SELECT count(*) FROM year) as `total`");
            expect(db.last.sql).to.match(/from `year` order by `year`.`year` desc limit \? offset \?$/);
            expect(db.last.params).to.deep.equal([10, 10]);
        });

        it("YearMapper.findByYear matches the year value", async () => {
            const db = fakeExecutor([]);

            await new YearMapper(db).findByYear(2026);

            expect(db.last.sql).to.equal("select `id`, `year` from `year` where `year`.`year` = ?");
            expect(db.last.params).to.deep.equal([2026]);
        });

        it("YearMapper.findByPlayer selects the player's years newest first", async () => {
            const db = fakeExecutor([]);

            await new YearMapper(db).findByPlayer(7);

            expect(db.last.sql).to.equal(
                "select `id`, `year` from `year` where `year`.`id` in (select `YearId` from `player_year` where `player_year`.`PlayerId` = ?) order by `year`.`year` desc",
            );
            expect(db.last.params).to.deep.equal([7]);
        });

        it("YearMapper.insert adds the year", async () => {
            const db = fakeExecutor({ insertId: 4, affectedRows: 1 });

            expect(await new YearMapper(db).insert(2027)).to.deep.equal({ insertId: 4, affectedRows: 1 });
            expect(db.last.sql).to.equal("insert into `year` (`id`, `year`) values (default, ?)");
            expect(db.last.params).to.deep.equal([2027]);
        });

        it("YearMapper.insertIgnore adds the year unless it exists", async () => {
            const db = fakeExecutor({ affectedRows: 1 });

            await new YearMapper(db).insertIgnore(2026);

            expect(db.last.sql).to.equal("insert ignore into `year` (`id`, `year`) values (default, ?)");
            expect(db.last.params).to.deep.equal([2026]);
        });

        it("PlayerYearMapper.insertIgnore links the player and year unless already linked", async () => {
            const db = fakeExecutor({ affectedRows: 1 });

            await new PlayerYearMapper(db).insertIgnore(7, 3);

            expect(db.last.sql).to.equal("insert ignore into `player_year` (`PlayerId`, `YearId`) values (?, ?)");
            expect(db.last.params).to.deep.equal([7, 3]);
        });

        it("PlayerYearMapper.delete removes the player's link to the year", async () => {
            const db = fakeExecutor({ affectedRows: 1 });

            await new PlayerYearMapper(db).delete(7, 3);

            expect(db.last.sql).to.equal("delete from `player_year` where (`player_year`.`PlayerId` = ? and `player_year`.`YearId` = ?)");
            expect(db.last.params).to.deep.equal([7, 3]);
        });
    });
});
