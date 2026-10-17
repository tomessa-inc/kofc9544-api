import { expect } from "chai";
import { ConflictError, BadRequestError } from "../../../errors";
import { HoleService } from "../../../service/hole.service";
import { PlayerImportService, parseImportCsv } from "../../../service/player-import.service";
import { PlayerService } from "../../../service/player.service";
import { RegistrationService } from "../../../service/registration.service";
import { TeamService } from "../../../service/team.service";
import { parseListParams } from "../../../validators/list.validator";

/** Records every call to every method of a fake, returning `impl[method]`'s result. */
function fake<T extends Record<string, (...args: any[]) => any>>(impl: T) {
    const calls: Record<string, any[][]> = {};
    const proxy = {} as T;
    for (const [name, fn] of Object.entries(impl)) {
        calls[name] = [];
        (proxy as any)[name] = async (...args: any[]) => (calls[name].push(args), fn(...args));
    }
    return { proxy, calls };
}

const mailer = (fail = false) =>
    fake({
        sendPlayerConfirmation: async () => {
            if (fail) throw new Error("SES down");
        },
        sendRegistrationNotice: async () => undefined,
    });

const players = [
    { player: "John Smith", email: "j@x.ca", phone: "555" },
    { player: "Jane Doe", email: "jd@x.ca", phone: "556", allergies: "nuts" },
];

async function rejects(promise: Promise<unknown>): Promise<Error> {
    try {
        await promise;
    } catch (error) {
        return error as Error;
    }
    throw new Error("expected rejection");
}

describe("golf services", () => {
    describe("RegistrationService", () => {
        function setup({ existing = [] as any[], failMail = false } = {}) {
            const teams = fake({ findByIdOrName: async () => existing, insert: async () => ({ affectedRows: 1 }) });
            let nextId = 100;
            const playerStore = fake({ insert: async () => ({ insertId: nextId++, affectedRows: 1 }) });
            const mail = mailer(failMail);
            return { service: new RegistrationService(teams.proxy, playerStore.proxy, mail.proxy), teams, playerStore, mail };
        }

        it("creates a team for 2+ players, adds them to it, and sends confirmations then the organizer notice", async () => {
            const { service, teams, playerStore, mail } = setup();

            const result = await service.register({ team_name: "The Big Hitters", players, payment: 100, member: "yes" });

            expect(result).to.deep.equal({ teamId: "the-big-hitters", playerIds: [100, 101], emailSent: true });
            expect(teams.calls.findByIdOrName[0]).to.deep.equal(["the-big-hitters", "The Big Hitters"]);
            expect(teams.calls.insert[0][0]).to.deep.equal({ id: "the-big-hitters", name: "The Big Hitters", captain: "John Smith" });
            expect(playerStore.calls.insert[1][0]).to.deep.equal({
                name: "Jane Doe", email: "jd@x.ca", phone: "556", individual: false, TeamId: "the-big-hitters",
                allergies: "nuts", payment: "100", member: "yes",
            });
            expect(mail.calls.sendPlayerConfirmation.map((c) => c[0].id)).to.deep.equal([100, 101]);
            expect(mail.calls.sendRegistrationNotice).to.have.length(1);
        });

        it("names the team after the first player when no team name is given", async () => {
            const { service, teams } = setup();

            await service.register({ team_name: "", players });

            expect(teams.calls.insert[0][0].id).to.equal("john-smith");
        });

        it("registers a single player individually without a team", async () => {
            const { service, teams, playerStore } = setup();

            const result = await service.register({ players: [players[0]] });

            expect(result.teamId).to.equal(undefined);
            expect(teams.calls.insert).to.have.length(0);
            expect(playerStore.calls.insert[0][0]).to.include({ individual: true, TeamId: null, payment: null });
        });

        it("rejects a taken team name with a ConflictError before writing anything", async () => {
            const { service, playerStore } = setup({ existing: [{ id: "eagles" }] });

            const error = await rejects(service.register({ team_name: "Eagles", players }));

            expect(error).to.be.instanceOf(ConflictError);
            expect(error.message).to.equal('Team name "Eagles" already exists');
            expect(playerStore.calls.insert).to.have.length(0);
        });

        it("still succeeds (emailSent false) when email fails after everything is saved", async () => {
            const { service, playerStore } = setup({ failMail: true });

            const result = await service.register({ team_name: "Eagles", players });

            expect(result.emailSent).to.equal(false);
            expect(playerStore.calls.insert).to.have.length(2);
        });
    });

    describe("PlayerService", () => {
        function setup(failMail = false) {
            const store = fake({
                insert: async () => ({ insertId: 7, affectedRows: 1 }),
                update: async () => ({ affectedRows: 1 }),
                delete: async () => ({ affectedRows: 1 }),
                findPage: async () => [],
                findByTeam: async () => [],
                findWithoutTeamAsOptions: async () => [],
                findForExport: async () => [],
            });
            const mail = mailer(failMail);
            return { service: new PlayerService(store.proxy, mail.proxy), store, mail };
        }

        it("list pages through the store", async () => {
            const { service, store } = setup();

            await service.list(parseListParams({ pageIndex: "3", pageSize: "10" }));

            expect(store.calls.findPage[0][0]).to.deep.equal({ offset: 20, limit: 10 });
        });

        it("listForExport passes the sort direction", async () => {
            const { service, store } = setup();

            await service.listForExport(parseListParams({ order: "ASC" }));

            expect(store.calls.findForExport[0]).to.deep.equal(["asc"]);
        });

        it("create adds the player to the team and sends their confirmation with the new id", async () => {
            const { service, store, mail } = setup();

            const result = await service.create({ TeamId: "eagles", name: "Jo", email: "jo@x.ca", phone: "1" });

            expect(result).to.deep.equal({ id: 7, emailSent: true });
            expect(store.calls.insert[0][0]).to.include({ name: "Jo", TeamId: "eagles", individual: false });
            expect(mail.calls.sendPlayerConfirmation[0][0]).to.include({ id: 7, email: "jo@x.ca" });
        });

        it("create reports emailSent false when the confirmation fails", async () => {
            const { service } = setup(true);

            expect(await service.create({ name: "Jo", email: "jo@x.ca", phone: "1" })).to.deep.equal({ id: 7, emailSent: false });
        });

        it("update, delete and the other listings delegate to the store", async () => {
            const { service, store } = setup();

            await service.update(7, { name: "Jo" });
            await service.delete(7);
            await service.listByTeam("eagles");
            await service.listWithoutTeamAsOptions();

            expect(store.calls.update[0]).to.deep.equal([7, { name: "Jo" }]);
            expect(store.calls.delete[0]).to.deep.equal([7]);
            expect(store.calls.findByTeam[0]).to.deep.equal(["eagles"]);
            expect(store.calls.findWithoutTeamAsOptions).to.have.length(1);
        });
    });

    describe("TeamService and HoleService", () => {
        it("TeamService delegates to the store", async () => {
            const store = fake({
                findPage: async () => [], findNeedingPlayers: async () => [], findNeedingPlayersAsOptions: async () => [],
                update: async () => ({ affectedRows: 1 }), delete: async () => ({ affectedRows: 1 }),
            });
            const service = new TeamService(store.proxy);

            await service.list(parseListParams({ pageIndex: "2", pageSize: "5" }));
            await service.listNeedingPlayers();
            await service.listNeedingPlayersAsOptions();
            await service.update("eagles", { captain: "Jo" });
            await service.delete("eagles");

            expect(store.calls.findPage[0][0]).to.deep.equal({ offset: 5, limit: 5 });
            expect(store.calls.update[0]).to.deep.equal(["eagles", { captain: "Jo" }]);
            expect(store.calls.delete[0]).to.deep.equal(["eagles"]);
        });

        it("HoleService creates a hole with an id derived from its name", async () => {
            const store = fake({
                insert: async () => ({ insertId: 0, affectedRows: 1 }), update: async () => ({ affectedRows: 1 }),
                findPage: async () => [], findNeedingTeamsAsOptions: async () => [],
            });
            const service = new HoleService(store.proxy);

            expect(await service.create({ name: "Hole 18", par: "5" })).to.deep.equal({ id: "hole-18" });
            await service.list(parseListParams({ order: "desc" }));
            await service.update("hole-18", { name: "Hole 18", par: "4" });

            expect(store.calls.insert[0][0]).to.deep.equal({ id: "hole-18", name: "Hole 18", par: "5" });
            expect(store.calls.findPage[0][1]).to.equal("desc");
            expect(store.calls.update[0]).to.deep.equal(["hole-18", { name: "Hole 18", par: "4" }]);
        });
    });

    describe("parseImportCsv", () => {
        it("keys each row by the header, trims values, and skips blank lines", () => {
            const rows = parseImportCsv("HOLE, FIRST NAME ,EMAIL\r\nHole 1, John ,j@x.ca\n\n  \nHole 2,Jane,");

            expect(rows).to.deep.equal([
                { HOLE: "Hole 1", "FIRST NAME": "John", EMAIL: "j@x.ca" },
                { HOLE: "Hole 2", "FIRST NAME": "Jane", EMAIL: "" },
            ]);
        });
    });

    describe("PlayerImportService", () => {
        const header = "PAR,TEAM NAME,HOLE,LAST NAME,FIRST NAME,EMAIL,REGISTERED,PAID,PHONE,NOTES";
        const csv = (...rows: string[]) => [header, ...rows].join("\n");

        function setup({ holes = (name: string) => [{ id: name.toLowerCase().replace(/\s+/g, "-") }], teams = (_id: string, _name: string): any[] => [], existingPlayers = [] as any[] } = {}) {
            const holeStore = fake({ findByName: async (name: string) => holes(name) });
            const teamStore = fake({ findByIdOrName: async (id: string, name: string) => teams(id, name), insert: async () => ({ affectedRows: 1 }) });
            const playerStore = fake({ findByNameAndEmail: async () => existingPlayers, insert: async () => ({ insertId: 1, affectedRows: 1 }) });
            return { service: new PlayerImportService(holeStore.proxy as any, teamStore.proxy as any, playerStore.proxy as any), holeStore, teamStore, playerStore };
        }

        it("creates named and solo teams and inserts each player with their team", async () => {
            const { service, teamStore, playerStore } = setup();

            const result = await service.import(csv("4,Eagles,Hole 1,Smith,John,j@x.ca,Y,Y,555,", "4,,Hole 2,Doe,Jane,jd@x.ca,Y,N,556,"));

            expect(result).to.deep.equal({ teamsCreated: 2, playersCreated: 2 });
            expect(teamStore.calls.insert.map((c) => c[0])).to.deep.equal([
                { id: "eagles", name: "Eagles", captain: "John", hole: "hole-1" },
                { id: "jane-doe", name: "Jane Doe", captain: "Jane", hole: "hole-2" },
            ]);
            expect(playerStore.calls.insert.map((c) => [c[0].name, c[0].TeamId, c[0].firstName, c[0].lastName])).to.deep.equal([
                ["John Smith", "eagles", "John", "Smith"],
                ["Jane Doe", "jane-doe", "Jane", "Doe"],
            ]);
        });

        it("groups consecutive solo rows on the same hole into the first player's team", async () => {
            const created = new Set<string>();
            const { service, playerStore } = setup({ teams: (id) => (created.has(id) ? [{ id }] : (created.add(id), [])) });

            await service.import(csv("4,,Hole 2,Doe,Jane,jd@x.ca,,,,", "4,,Hole 2,Roe,Rick,r@x.ca,,,,", "4,,Hole 3,Poe,Pat,p@x.ca,,,,"));

            expect(playerStore.calls.insert.map((c) => c[0].TeamId)).to.deep.equal(["jane-doe", "jane-doe", "pat-poe"]);
        });

        it("links players to an existing team's id", async () => {
            const { service, teamStore, playerStore } = setup({ teams: (_id, name) => (name === "Birdies" ? [{ id: "birdies-2024" }] : []) });

            await service.import(csv("4,Birdies,Hole 3,Lee,Sam,s@x.ca,,,,"));

            expect(teamStore.calls.insert).to.have.length(0);
            expect(playerStore.calls.insert[0][0].TeamId).to.equal("birdies-2024");
        });

        it("skips players who are already registered and rows without a first name", async () => {
            const { service, playerStore } = setup({ existingPlayers: [{ id: 1 }] });

            const result = await service.import(csv("4,Eagles,Hole 1,Smith,John,j@x.ca,,,,", "4,Eagles,Hole 1,Ghost,,g@x.ca,,,,"));

            expect(result.playersCreated).to.equal(0);
            expect(playerStore.calls.findByNameAndEmail).to.have.length(1);
        });

        it("rejects unknown holes up front, naming each, and writes nothing", async () => {
            const { service, teamStore, playerStore } = setup({ holes: (name) => (name === "Hole 1" ? [{ id: "hole-1" }] : []) });

            const error = await rejects(service.import(csv("4,Eagles,Hole 1,Smith,John,j@x.ca,,,,", "4,,Hole 99,Lee,Sam,s@x.ca,,,,")));

            expect(error).to.be.instanceOf(BadRequestError);
            expect(error.message).to.equal('Unknown hole(s), nothing was imported: "Hole 99" (Sam Lee)');
            expect(teamStore.calls.insert).to.have.length(0);
            expect(playerStore.calls.insert).to.have.length(0);
        });

        it("looks each hole up once", async () => {
            const { service, holeStore } = setup();

            await service.import(csv("4,A,Hole 1,A,A,a@x.ca,,,,", "4,B,Hole 1,B,B,b@x.ca,,,,", "4,C,Hole 2,C,C,c@x.ca,,,,"));

            expect(holeStore.calls.findByName.map((c) => c[0])).to.deep.equal(["Hole 1", "Hole 2"]);
        });

        it("propagates a failed insert", async () => {
            const { service, playerStore } = setup();
            (playerStore.proxy as any).insert = async () => {
                throw new Error("Duplicate entry");
            };

            expect((await rejects(service.import(csv("4,Eagles,Hole 1,Smith,John,j@x.ca,,,,")))).message).to.equal("Duplicate entry");
        });
    });
});
