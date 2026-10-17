import { expect } from "chai";
import { golfMapper, holeMapper, mailMapper, teamMapper } from "../../../mapper";
import { EmailMessaging } from "../../../models/EmailMessaging";
import { api } from "../helpers/http";
import { stubMethod } from "../helpers/sql-stub";

describe("GolfController", () => {
    const stubs: { restore: () => void }[] = [];
    const stub = <T extends object, K extends keyof T>(target: T, key: K, impl?: (...args: any[]) => any) => {
        const s = stubMethod(target, key, impl);
        stubs.push(s);
        return s;
    };

    afterEach(() => stubs.splice(0).reverse().forEach((s) => s.restore()));

    describe("POST /golf/register", () => {
        const players = [
            { player: "John Smith", email: "j@x.ca", phone: "555" },
            { player: "Jane Doe", email: "jd@x.ca", phone: "556" },
        ];

        it("registers a team when 2+ players are sent, then the players, then emails the organizers", async () => {
            const createTeam = stub(teamMapper, "createTeamRegistration", async () => ({ success: true, data: { id: "eagles", affectedRows: 1 } }));
            const createPlayers = stub(golfMapper, "createPlayerRegistration", async () => undefined);
            const mail = stub(mailMapper, "setupEmail", async () => ({ success: true }));

            const res = await api().post("/golf/register").send({ team_name: "Eagles", players });

            expect(res.status).to.equal(200);
            expect(res.body).to.deep.equal({ code: 0, data: { message: "Registration successful" }, error: null, message: "ok" });
            expect(createTeam.calls).to.have.length(1);
            expect(createPlayers.calls[0][0]).to.include({ TeamId: "eagles", individual: false });
            expect(mail.calls[0][0].email_type).to.equal(EmailMessaging.EMAIL_TYPE_REGISTER);
        });

        it("registers a single player as an individual without creating a team", async () => {
            const createTeam = stub(teamMapper, "createTeamRegistration");
            const createPlayers = stub(golfMapper, "createPlayerRegistration", async () => undefined);
            stub(mailMapper, "setupEmail", async () => ({}));

            const res = await api().post("/golf/register").send({ players: [players[0]] });

            expect(res.status).to.equal(200);
            expect(createTeam.calls).to.have.length(0);
            expect(createPlayers.calls[0][0]).to.include({ individual: true });
        });

        it("returns 409 when the team name is taken", async () => {
            stub(teamMapper, "createTeamRegistration", async () => ({ success: false, message: 'Team name "Eagles" already exists' }));
            const createPlayers = stub(golfMapper, "createPlayerRegistration");

            const res = await api().post("/golf/register").send({ team_name: "Eagles", players });

            expect(res.status).to.equal(409);
            expect(res.body).to.include({ code: -1, message: "Conflict", error: 'Team name "Eagles" already exists' });
            expect(createPlayers.calls).to.have.length(0);
        });

        it("returns 500 when the team insert affects no rows", async () => {
            stub(teamMapper, "createTeamRegistration", async () => ({ success: true, data: { id: "eagles", affectedRows: 0 } }));

            const res = await api().post("/golf/register").send({ team_name: "Eagles", players });

            expect(res.status).to.equal(500);
        });

        it("returns 500 when a mapper throws", async () => {
            stub(golfMapper, "createPlayerRegistration", async () => { throw new Error("db down"); });

            const res = await api().post("/golf/register").send({ players: [players[0]] });

            expect(res.status).to.equal(500);
            expect(res.body.error).to.equal("Error: db down");
        });
    });

    describe("paginated list endpoints", () => {
        const cases = [
            ["/golf/hole/page-index/2/page-size/5/name/asc", holeMapper, "getAllHoles"],
            ["/golf/holes-missing-teams-label-value/page-index/1/page-size/5/value/asc", holeMapper, "getAllHolesNeedingTeamsLabelValue"],
            ["/golf/teams-missing-players-label-value/page-index/1/page-size/5/label/asc", teamMapper, "getAllTeamsNeedingPlayersLabelValue"],
            ["/golf/teams-missing-players/page-index/1/page-size/5/name/asc", teamMapper, "getAllTeamsNeedingPlayers"],
            ["/golf/page-index/2/page-size/5/name/asc", golfMapper, "getAllPlayers"],
            ["/golf/team/page-index/2/page-size/5/name/asc", teamMapper, "getAllTeams"],
            ["/golf/team/id/eagles/page-index/1/page-size/5/name/asc", golfMapper, "getPlayersByTeamId"],
            ["/golf/player-csv/name/asc", golfMapper, "getPlayersCSV"],
        ] as const;

        for (const [url, mapper, method] of cases) {
            describe(`POST ${url}`, () => {
                it(`passes parsed route params to ${method} and returns a paginated envelope`, async () => {
                    const call = stub(mapper as any, method, async () => [{ name: "a", value: "a", label: "a", total: 1 }]);

                    const res = await api().post(url);

                    expect(res.status).to.equal(200);
                    expect(res.body.code).to.equal(0);
                    expect(res.body.data.items).to.have.length(1);
                    expect(call.calls[0][0]).to.include({ sort: url.split("/").at(-2), order: "asc" });
                    if (url.includes("page-size/5")) expect(call.calls[0][0].pageSize).to.equal(5);
                });

                it(`returns 500 when ${method} returns an error string`, async () => {
                    stub(mapper as any, method, async () => "Error: boom");

                    const res = await api().post(url);

                    expect(res.status).to.equal(500);
                    expect(res.body.error).to.equal("Error: boom");
                });

                it(`returns 500 when ${method} throws`, async () => {
                    stub(mapper as any, method, async () => { throw new Error("boom"); });

                    expect((await api().post(url)).status).to.equal(500);
                });
            });
        }

        it("POST /golf/team/id/:id passes the team id through", async () => {
            const call = stub(golfMapper, "getPlayersByTeamId", async () => []);

            await api().post("/golf/team/id/eagles/page-index/1/page-size/5/name/asc");

            expect(call.calls[0][0].id).to.equal("eagles");
        });
    });

    describe("POST /golf/players-missing-teams-label-value/...", () => {
        const url = "/golf/players-missing-teams-label-value/page-index/1/page-size/5/label/asc";

        it("returns the mapper rows as-is", async () => {
            stub(golfMapper, "getAllPlayersNeedingTeamsLabelValue", async () => [{ label: "a", value: "a" }]);

            const res = await api().post(url);

            expect(res.body).to.deep.equal([{ label: "a", value: "a" }]);
        });

        it("returns 500 on an error string", async () => {
            stub(golfMapper, "getAllPlayersNeedingTeamsLabelValue", async () => "Error: boom");

            expect((await api().post(url)).status).to.equal(500);
        });
    });

    describe("PUT /golf/player-update/:id", () => {
        it("updates the player from the body using the route id", async () => {
            const update = stub(golfMapper, "updatePlayerById", async () => ({ affectedRows: 1 }));

            const res = await api().put("/golf/player-update/7").send({ name: "John" });

            expect(res.status).to.equal(200);
            expect(res.body.data).to.deep.equal({ affectedRows: 1 });
            expect(update.calls[0]).to.deep.equal([{ name: "John" }, "7"]);
        });

        it("returns 500 on an error string", async () => {
            stub(golfMapper, "updatePlayerById", async () => "Error: boom");

            expect((await api().put("/golf/player-update/7").send({})).status).to.equal(500);
        });
    });

    describe("POST /golf/player-new", () => {
        it("wraps the single player as a non-individual registration", async () => {
            const create = stub(golfMapper, "createPlayerRegistration", async () => undefined);

            const res = await api().post("/golf/player-new").send({ TeamId: "eagles", name: "Jo", email: "jo@x.ca", phone: "1", allergies: "none" });

            expect(res.status).to.equal(200);
            expect(create.calls[0][0]).to.deep.equal({
                TeamId: "eagles",
                players: [{ player: "Jo", email: "jo@x.ca", phone: "1", allergies: "none" }],
                individual: false,
                email_type: "register",
            });
        });

        it("returns 500 on an error string", async () => {
            stub(golfMapper, "createPlayerRegistration", async () => "Error: boom");

            expect((await api().post("/golf/player-new").send({})).status).to.equal(500);
        });
    });

    describe("PUT /golf/team-new", () => {
        it("is a placeholder that responds 200", async () => {
            expect((await api().put("/golf/team-new").send({})).status).to.equal(200);
        });
    });

    describe("POST /golf/hole-new", () => {
        it("creates the hole with an id slugified from its name", async () => {
            const create = stub(holeMapper, "createHole", async () => undefined);

            const res = await api().post("/golf/hole-new").send({ name: "Hole 18", par: 5 });

            expect(res.status).to.equal(200);
            expect(create.calls[0][0]).to.deep.equal({ name: "Hole 18", par: 5, id: "hole-18" });
        });

        it("returns 500 when the name is missing", async () => {
            stub(holeMapper, "createHole");

            expect((await api().post("/golf/hole-new").send({})).status).to.equal(500);
        });
    });

    describe("PUT /golf/team/:id", () => {
        it("updates the team identified by the :id route param", async () => {
            const update = stub(teamMapper, "updateTeamById", async () => ({ affectedRows: 1 }));

            const res = await api().put("/golf/team/eagles").send({ name: "Eagles", captain: "Jo", hole: "h1" });

            expect(res.status).to.equal(200);
            expect(update.calls[0]).to.deep.equal([{ id: "eagles", name: "Eagles", captain: "Jo", hole: "h1" }, "eagles"]);
        });

        it("prefers the route id over a different id in the body", async () => {
            const update = stub(teamMapper, "updateTeamById", async () => ({}));

            await api().put("/golf/team/eagles").send({ id: "hawks", name: "Eagles" });

            expect(update.calls[0][1]).to.equal("eagles");
            expect(update.calls[0][0].id).to.equal("eagles");
        });

        it("falls back to the body id when the URL id is the literal 'undefined'", async () => {
            const update = stub(teamMapper, "updateTeamById", async () => ({}));

            await api().put("/golf/team/undefined").send({ id: "eagles", name: "Eagles" });

            expect(update.calls[0][1]).to.equal("eagles");
        });

        it("returns 400 without updating when no id is available", async () => {
            const update = stub(teamMapper, "updateTeamById", async () => ({}));

            const res = await api().put("/golf/team/undefined").send({ name: "Eagles" });

            expect(res.status).to.equal(400);
            expect(res.body.error).to.equal("Missing team id");
            expect(update.calls).to.have.length(0);
        });

        it("returns 500 on an error string", async () => {
            stub(teamMapper, "updateTeamById", async () => "Error: boom");

            expect((await api().put("/golf/team/eagles").send({})).status).to.equal(500);
        });
    });

    describe("POST /golf/hole/:id", () => {
        it("updates the hole using the id from the body", async () => {
            const update = stub(holeMapper, "updatHoleById", async () => ({ affectedRows: 1 }));

            const res = await api().post("/golf/hole/h1").send({ id: "h1", name: "Hole 1", par: 4 });

            expect(res.status).to.equal(200);
            expect(update.calls[0][1]).to.equal("h1");
        });

        it("returns 500 on an error string", async () => {
            stub(holeMapper, "updatHoleById", async () => "Error: boom");

            expect((await api().post("/golf/hole/h1").send({})).status).to.equal(500);
        });
    });

    describe("DELETE endpoints", () => {
        it("DELETE /golf/team-delete/:teamId deletes the team", async () => {
            const del = stub(golfMapper, "deleteTeam", async () => ({ affectedRows: 1 }));

            const res = await api().delete("/golf/team-delete/eagles");

            expect(res.status).to.equal(200);
            expect(del.calls[0]).to.deep.equal(["eagles"]);
        });

        it("DELETE /golf/team-delete/:teamId returns 500 on an error string", async () => {
            stub(golfMapper, "deleteTeam", async () => "Error: boom");

            expect((await api().delete("/golf/team-delete/eagles")).status).to.equal(500);
        });

        it("DELETE /golf/player-delete/:playerId deletes the player", async () => {
            const del = stub(golfMapper, "deletePlayer", async () => ({ affectedRows: 1 }));

            const res = await api().delete("/golf/player-delete/7");

            expect(res.status).to.equal(200);
            expect(del.calls[0]).to.deep.equal(["7"]);
        });

        it("DELETE /golf/player-delete/:playerId returns 500 on an error string", async () => {
            stub(golfMapper, "deletePlayer", async () => "Error: boom");

            expect((await api().delete("/golf/player-delete/7")).status).to.equal(500);
        });
    });

    describe("POST /golf/player/import", () => {
        const csv = [
            "PAR,TEAM NAME,HOLE,LAST NAME,FIRST NAME,EMAIL,REGISTERED,PAID,PHONE,NOTES",
            "4,Eagles,Hole 1,Smith,John,j@x.ca,Y,Y,555,",
            "4,,Hole 2,Doe,Jane,jd@x.ca,Y,N,556,",
        ].join("\n");

        function stubImport(overrides: { doesTeamExist?: (name: string) => any; insertPlayer?: () => any } = {}) {
            stub(holeMapper, "getHoleIdByHoleName", async (name) => [{ id: name.toLowerCase().replace(/\s+/g, "-") }]);
            const exists = stub(teamMapper, "doesTeamExist", overrides.doesTeamExist ?? (async () => []));
            const insertTeam = stub(teamMapper, "insertTeam", async () => ({}));
            stub(golfMapper, "checkIfPlayerExists", async () => []);
            const insertPlayer = stub(golfMapper, "insertPlayer", overrides.insertPlayer ?? (async () => undefined));
            return { exists, insertTeam, insertPlayer };
        }

        it("returns 400 when no file is uploaded", async () => {
            const res = await api().post("/golf/player/import").field("other", "x");

            expect(res.status).to.equal(400);
            expect(res.body.error).to.equal("No file provided");
        });

        it("creates named and solo teams and inserts each player", async () => {
            const { insertTeam, insertPlayer } = stubImport();

            await api().post("/golf/player/import").attach("file", Buffer.from(csv), "players.csv");

            expect(insertTeam.calls.map((c) => c.slice(0, 2))).to.deep.equal([["eagles", "Eagles"], ["jane-doe", "Jane Doe"]]);
            expect(insertTeam.calls[0][3]).to.equal("hole-1");
            expect(insertPlayer.calls.map((c) => [c[0], c[5]])).to.deep.equal([["John Smith", "eagles"], ["Jane Doe", "jane-doe"]]);
        });

        it("responds 200 once every row is imported", async () => {
            stubImport();

            const res = await api().post("/golf/player/import").attach("file", Buffer.from(csv), "players.csv");

            expect(res.status).to.equal(200);
        });

        it("skips rows with no first name", async () => {
            const { insertPlayer } = stubImport();
            const withBlank = `${csv}\n4,Eagles,Hole 1,Ghost,,g@x.ca,Y,Y,557,`;

            const res = await api().post("/golf/player/import").attach("file", Buffer.from(withBlank), "players.csv");

            expect(res.status).to.equal(200);
            expect(insertPlayer.calls).to.have.length(2);
        });

        it("links players to an existing named team instead of the previous row's team", async () => {
            const { insertTeam, insertPlayer } = stubImport({
                doesTeamExist: async (name: string) => (name === "Birdies" ? [{ id: "birdies-2024" }] : []),
            });
            const rows = [
                csv.split("\n")[0],
                "4,,Hole 2,Doe,Jane,jd@x.ca,Y,N,556,",
                "4,Birdies,Hole 3,Lee,Sam,s@x.ca,Y,Y,558,",
            ].join("\n");

            await api().post("/golf/player/import").attach("file", Buffer.from(rows), "players.csv");

            expect(insertTeam.calls.map((c) => c[0])).to.deep.equal(["jane-doe"]);
            expect(insertPlayer.calls.map((c) => [c[0], c[5]])).to.deep.equal([["Jane Doe", "jane-doe"], ["Sam Lee", "birdies-2024"]]);
        });

        it("looks each hole up once and reuses it for named teams", async () => {
            const { insertTeam } = stubImport();
            const lookups = stub(holeMapper, "getHoleIdByHoleName", async (name) => [{ id: name.toLowerCase().replace(/\s+/g, "-") }]);
            const sameHole = `${csv}\n4,Eagles,Hole 1,Smith,Ann,a@x.ca,Y,Y,559,`;

            await api().post("/golf/player/import").attach("file", Buffer.from(sameHole), "players.csv");

            expect(lookups.calls.map((c) => c[0])).to.deep.equal(["Hole 1", "Hole 2"]);
            expect(insertTeam.calls[0]).to.deep.equal(["eagles", "Eagles", "John", "hole-1"]);
        });

        it("returns 400 naming every unknown hole and writes nothing", async () => {
            const { insertTeam, insertPlayer } = stubImport();
            stub(holeMapper, "getHoleIdByHoleName", async (name) => (name === "Hole 1" ? [{ id: "hole-1" }] : []));
            const unknown = `${csv}\n4,,Hole 99,Lee,Sam,s@x.ca,Y,Y,558,`;

            const res = await api().post("/golf/player/import").attach("file", Buffer.from(unknown), "players.csv");

            expect(res.status).to.equal(400);
            expect(res.body.error).to.equal('Unknown hole(s), nothing was imported: "Hole 2" (Jane Doe), "Hole 99" (Sam Lee)');
            expect(insertTeam.calls).to.have.length(0);
            expect(insertPlayer.calls).to.have.length(0);
        });

        it("treats a failed hole lookup as unknown instead of crashing", async () => {
            stubImport();
            stub(holeMapper, "getHoleIdByHoleName", async () => undefined);

            const res = await api().post("/golf/player/import").attach("file", Buffer.from(csv), "players.csv");

            expect(res.status).to.equal(400);
        });

        it("ignores the hole on rows with no first name", async () => {
            const { insertPlayer } = stubImport();
            const lookups = stub(holeMapper, "getHoleIdByHoleName", async (name) => [{ id: name }]);
            const blankRow = `${csv}\n4,,Hole 99,Ghost,,g@x.ca,Y,Y,557,`;

            const res = await api().post("/golf/player/import").attach("file", Buffer.from(blankRow), "players.csv");

            expect(res.status).to.equal(200);
            expect(lookups.calls.map((c) => c[0])).to.not.include("Hole 99");
            expect(insertPlayer.calls).to.have.length(2);
        });

        it("waits for player inserts and returns 500 when one fails", async () => {
            stubImport({ insertPlayer: async () => { throw new Error("Duplicate entry"); } });

            const res = await api().post("/golf/player/import").attach("file", Buffer.from(csv), "players.csv");

            expect(res.status).to.equal(500);
            expect(res.body.error).to.equal("Error: Duplicate entry");
        });
    });
});
