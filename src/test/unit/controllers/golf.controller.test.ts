import { expect } from "chai";
import { sqlExecutor } from "../../../db/executor";
import { ConflictError } from "../../../errors";
import { mailMapper } from "../../../mapper/mail.mapper";
import { holeService } from "../../../service/hole.service";
import { playerImportService } from "../../../service/player-import.service";
import { playerService } from "../../../service/player.service";
import { registrationService } from "../../../service/registration.service";
import { teamService } from "../../../service/team.service";
import { api } from "../helpers/http";
import { stubMethod } from "../helpers/stubs";

describe("GolfController (HTTP contract)", () => {
    const stubs: { restore: () => void }[] = [];
    const stub = <T extends object, K extends keyof T>(target: T, key: K, impl?: (...args: any[]) => any) => {
        const s = stubMethod(target, key, impl);
        stubs.push(s);
        return s;
    };
    afterEach(() => stubs.splice(0).reverse().forEach((s) => s.restore()));

    const players = [{ player: "John Smith", email: "j@x.ca", phone: "555" }];

    describe("POST /golf/register", () => {
        it("validates the body and returns the success envelope", async () => {
            const register = stub(registrationService, "register", async () => ({ teamId: undefined, playerIds: [1], emailSent: true }));

            const res = await api().post("/golf/register").send({ team_name: "", players });

            expect(res.status).to.equal(200);
            expect(res.body).to.deep.equal({ code: 0, data: { message: "Registration successful", emailSent: true }, error: null, message: "ok" });
            expect(register.calls[0][0]).to.deep.equal({ team_name: "", players });
        });

        it("returns 400 for an invalid body without calling the service", async () => {
            const register = stub(registrationService, "register");

            const res = await api().post("/golf/register").send({ players: [] });

            expect(res.status).to.equal(400);
            expect(res.body).to.deep.equal({ code: -1, data: null, error: "At least one player is required", message: "BadRequest" });
            expect(register.calls).to.have.length(0);
        });

        it("returns 409 Conflict for a taken team name", async () => {
            stub(registrationService, "register", async () => {
                throw new ConflictError('Team name "Eagles" already exists');
            });

            const res = await api().post("/golf/register").send({ team_name: "Eagles", players });

            expect(res.status).to.equal(409);
            expect(res.body).to.include({ message: "Conflict", error: 'Team name "Eagles" already exists' });
        });

        it("returns a generic 500 without leaking the internal error", async () => {
            stub(registrationService, "register", async () => {
                throw new Error("ER_DUP_ENTRY: secret details");
            });

            const res = await api().post("/golf/register").send({ players });

            expect(res.status).to.equal(500);
            expect(res.body).to.deep.equal({ code: -1, data: null, error: "Internal server error", message: "InternalServerError" });
        });
    });

    describe("paged list endpoints", () => {
        const rows = [{ name: "b", label: "b", value: "b", total: 25 }, { name: "a", label: "a", value: "a", total: 25 }];
        const cases = [
            ["/golf/page-index/3/page-size/10/name/asc", playerService, "list"],
            ["/golf/team/page-index/3/page-size/10/name/asc", teamService, "list"],
            ["/golf/hole/page-index/3/page-size/10/name/asc", holeService, "list"],
            ["/golf/teams-missing-players/page-index/3/page-size/10/name/asc", teamService, "listNeedingPlayers"],
            ["/golf/teams-missing-players-label-value/page-index/3/page-size/10/label/asc", teamService, "listNeedingPlayersAsOptions"],
            ["/golf/holes-missing-teams-label-value/page-index/3/page-size/10/value/asc", holeService, "listNeedingTeamsAsOptions"],
            ["/golf/team/id/eagles/page-index/3/page-size/10/name/asc", playerService, "listByTeam"],
            ["/golf/player-csv/name/asc", playerService, "listForExport"],
        ] as const;

        for (const [url, service, method] of cases) {
            it(`POST ${url} returns the sorted paged envelope from ${method}`, async () => {
                stub(service as any, method, async () => rows.map((r) => ({ ...r })));

                const res = await api().post(url);

                expect(res.status).to.equal(200);
                expect(res.body).to.include({ code: 0, message: "ok", total: "25" });
                expect(res.body.data.items.map((r) => r.name)).to.deep.equal(["a", "b"]);
                expect(res.body.data.total).to.equal(25);
            });

            it(`POST ${url} returns a generic 500 when ${method} fails`, async () => {
                stub(service as any, method, async () => {
                    throw new Error("db down");
                });

                expect((await api().post(url)).status).to.equal(500);
            });
        }

        it("derives lastpage from total", async () => {
            stub(playerService, "list", async () => rows);

            expect((await api().post("/golf/page-index/1/page-size/10/name/asc")).body).to.include({ lastpage: "3", pageSize: "10", pageIndex: "1" });
        });

        it("passes parsed paging to the service", async () => {
            const list = stub(playerService, "list", async () => []);

            await api().post("/golf/page-index/3/page-size/10/name/asc");

            expect(list.calls[0][0]).to.include({ pageIndex: 3, pageSize: 10, sort: "name", order: "asc" });
        });

        it("passes the team id from the route", async () => {
            const list = stub(playerService, "listByTeam", async () => []);

            await api().post("/golf/team/id/eagles/page-index/1/page-size/10/name/asc");

            expect(list.calls[0]).to.deep.equal(["eagles"]);
        });
    });

    describe("POST /golf/players-missing-teams-label-value/...", () => {
        it("returns the options as a plain array", async () => {
            stub(playerService, "listWithoutTeamAsOptions", async () => [{ label: "Jo", value: 7 }]);

            const res = await api().post("/golf/players-missing-teams-label-value/page-index/1/page-size/10/label/asc");

            expect(res.body).to.deep.equal([{ label: "Jo", value: 7 }]);
        });
    });

    describe("players", () => {
        it("POST /golf/player-new validates and creates", async () => {
            const create = stub(playerService, "create", async () => ({ id: 7, emailSent: true }));

            const res = await api().post("/golf/player-new").send({ TeamId: "eagles", name: "Jo", email: "jo@x.ca" });

            expect(res.body.data).to.deep.equal({ id: 7, emailSent: true });
            expect(create.calls[0][0]).to.deep.equal({ TeamId: "eagles", name: "Jo", email: "jo@x.ca", phone: "" });
        });

        it("POST /golf/player-new returns 400 without a name", async () => {
            expect((await api().post("/golf/player-new").send({ email: "jo@x.ca" })).status).to.equal(400);
        });

        it("PUT /golf/player-update/:id updates by numeric id with only editable fields", async () => {
            const update = stub(playerService, "update", async () => ({ affectedRows: 1 }));

            const res = await api().put("/golf/player-update/7").send({ name: "Jo", payment: "free" });

            expect(res.body.data).to.deep.equal({ affectedRows: 1 });
            expect(update.calls[0]).to.deep.equal([7, { name: "Jo" }]);
        });

        it("PUT /golf/player-update/:id rejects a non-numeric id", async () => {
            expect((await api().put("/golf/player-update/abc").send({})).status).to.equal(400);
        });

        it("DELETE /golf/player-delete/:playerId deletes by numeric id", async () => {
            const del = stub(playerService, "delete", async () => ({ affectedRows: 1 }));

            const res = await api().delete("/golf/player-delete/7");

            expect(res.body.data).to.deep.equal({ affectedRows: 1 });
            expect(del.calls[0]).to.deep.equal([7]);
        });
    });

    describe("teams", () => {
        it("PUT /golf/team/:id updates the team named in the URL", async () => {
            const update = stub(teamService, "update", async () => ({ affectedRows: 1 }));

            const res = await api().put("/golf/team/eagles").send({ id: "hawks", name: "Eagles", captain: "Jo", hole: "h1" });

            expect(res.body.data).to.deep.equal({ affectedRows: 1 });
            expect(update.calls[0]).to.deep.equal(["eagles", { name: "Eagles", captain: "Jo", hole: "h1" }]);
        });

        it("PUT /golf/team/undefined falls back to the body id", async () => {
            const update = stub(teamService, "update", async () => ({}));

            await api().put("/golf/team/undefined").send({ id: "eagles", name: "Eagles" });

            expect(update.calls[0][0]).to.equal("eagles");
        });

        it("PUT /golf/team/undefined without a body id returns 400", async () => {
            const res = await api().put("/golf/team/undefined").send({ name: "Eagles" });

            expect(res.status).to.equal(400);
            expect(res.body.error).to.equal("Missing team id");
        });

        it("DELETE /golf/team-delete/:teamId deletes the team", async () => {
            const del = stub(teamService, "delete", async () => ({ affectedRows: 1 }));

            expect((await api().delete("/golf/team-delete/eagles")).status).to.equal(200);
            expect(del.calls[0]).to.deep.equal(["eagles"]);
        });

        it("PUT /golf/team-new is a reserved no-op", async () => {
            expect((await api().put("/golf/team-new").send({})).body).to.deep.include({ code: 0, data: null });
        });
    });

    describe("holes", () => {
        it("POST /golf/hole-new creates the hole", async () => {
            const create = stub(holeService, "create", async () => ({ id: "hole-18" }));

            const res = await api().post("/golf/hole-new").send({ name: "Hole 18", par: 5 });

            expect(res.body.data).to.deep.equal({ id: "hole-18" });
            expect(create.calls[0][0]).to.deep.equal({ name: "Hole 18", par: "5" });
        });

        it("POST /golf/hole-new returns 400 without a name", async () => {
            expect((await api().post("/golf/hole-new").send({})).status).to.equal(400);
        });

        it("POST /golf/hole/:id updates the hole named in the URL", async () => {
            const update = stub(holeService, "update", async () => ({ affectedRows: 1 }));

            await api().post("/golf/hole/hole-1").send({ id: "other", name: "Hole 1", par: "4" });

            expect(update.calls[0]).to.deep.equal(["hole-1", { name: "Hole 1", par: "4" }]);
        });
    });

    describe("POST /golf/player/import", () => {
        it("returns 400 when no file is uploaded", async () => {
            const res = await api().post("/golf/player/import").field("other", "x");

            expect(res.status).to.equal(400);
            expect(res.body.error).to.equal("No file provided");
        });

        it("imports the uploaded file's text", async () => {
            const imp = stub(playerImportService, "import", async () => ({ teamsCreated: 1, playersCreated: 2 }));

            const res = await api().post("/golf/player/import").attach("file", Buffer.from("HOLE\nHole 1"), "players.csv");

            expect(res.body.data).to.deep.equal({ teamsCreated: 1, playersCreated: 2 });
            expect(imp.calls[0]).to.deep.equal(["HOLE\nHole 1"]);
        });
    });

    describe("end to end (only the SQL executor and SES are faked)", () => {
        it("registration writes the team and players and emails each player and the organizers", async () => {
            const queries: { sql: string; params: unknown[] }[] = [];
            stub(sqlExecutor, "run", async (q) => {
                const captured = q.toSQL();
                queries.push(captured);
                return captured.sql.startsWith("select") ? [] : { insertId: 100 + queries.length, affectedRows: 1 };
            });
            const ses = stub((mailMapper as any).ses, "send", async () => ({ $metadata: { httpStatusCode: 200 } }));

            const res = await api().post("/golf/register").send({
                team_name: "Eagles",
                players: [{ player: "John Smith", email: "j@x.ca", phone: "555" }, { player: "Jane Doe", email: "jd@x.ca", phone: "556" }],
            });

            expect(res.body.data).to.deep.equal({ message: "Registration successful", emailSent: true });
            expect(queries.map((q) => q.sql.split(" (")[0].split(" where")[0])).to.deep.equal([
                "select `id`, `name`, `captain`, `hole`, `createdAt`, `updatedAt` from `team`",
                "insert into `team`",
                "insert into `player`",
                "insert into `player`",
            ]);
            expect(ses.calls.map((c) => c[0].input.Destination.ToAddresses)).to.deep.equal([
                ["j@x.ca"],
                ["jd@x.ca"],
                ["tcruicksh@gmail.com", "registration@kofc9544.ca"],
            ]);
        });

        it("import rejects an unknown hole with 400 before any write", async () => {
            const queries: string[] = [];
            stub(sqlExecutor, "run", async (q) => (queries.push(q.toSQL().sql), []));

            const csv = "PAR,TEAM NAME,HOLE,LAST NAME,FIRST NAME,EMAIL\n4,Eagles,Hole 99,Smith,John,j@x.ca";
            const res = await api().post("/golf/player/import").attach("file", Buffer.from(csv), "players.csv");

            expect(res.status).to.equal(400);
            expect(res.body.error).to.equal('Unknown hole(s), nothing was imported: "Hole 99" (John Smith)');
            expect(queries.every((q) => q.startsWith("select"))).to.equal(true);
        });
    });
});
