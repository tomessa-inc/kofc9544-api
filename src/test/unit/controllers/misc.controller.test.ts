import { expect } from "chai";
import { accessMapper, eventMapper, mailMapper, userMapper } from "../../../mapper";
import { calendarMapper } from "../../../mapper/calendar.mapper";
import { AccessController } from "../../../controllers/access.controller";
import { eventService } from "../../../service/event.service";
import { api, mount } from "../helpers/http";
import { stubMethod } from "../helpers/sql-stub";

describe("Event / Mail / Access controllers", () => {
    const stubs: { restore: () => void }[] = [];
    const stub = <T extends object, K extends keyof T>(target: T, key: K, impl?: (...args: any[]) => any) => {
        const s = stubMethod(target, key, impl);
        stubs.push(s);
        return s;
    };

    afterEach(() => stubs.splice(0).reverse().forEach((s) => s.restore()));

    describe("EventController", () => {
        it("POST /event passes the event and the caller's bearer token to the service", async () => {
            const create = stub(eventService, "createEvent", async () => ({ eventId: "evt-1", emailSent: true }));

            const res = await api().post("/event").set("Authorization", "Bearer tok").send({ data: { text: "Golf" } });

            expect(res.status).to.equal(200);
            expect(res.body.data).to.deep.equal({ success: true, emailSent: true });
            expect(create.calls[0]).to.deep.equal([{ text: "Golf" }, "tok"]);
        });

        it("POST /event passes a null token when the caller is anonymous", async () => {
            const create = stub(eventService, "createEvent", async () => ({ eventId: "evt-1", emailSent: false }));

            const res = await api().post("/event").send({ data: { text: "Golf" } });

            expect(res.body.data).to.deep.equal({ success: true, emailSent: false });
            expect(create.calls[0][1]).to.equal(null);
        });

        it("POST /event end to end: saves the event and calendar rows and emails the creator via SES", async () => {
            const db: { sql: string; params: unknown[] }[] = [];
            const record = async (q: any) => (db.push(q), { affectedRows: 1 });
            stub(eventMapper, "getSQLData", record);
            stub(calendarMapper, "getSQLData", record);
            stub(userMapper, "getUserByToken", async () => [{ email: "tom@x.ca", firstName: "Tom" }]);
            const ses = stub((mailMapper as any)._sesClient, "send", async () => ({ $metadata: { httpStatusCode: 200 } }));

            const res = await api().post("/event").set("Authorization", "Bearer tok").send({
                data: { start: "2026-06-01T09:00:00", end: "2026-06-01T10:00:00", text: 'Golf "night"', description: "Annual", recurring: "monthly", frequency: "1", viewing: false },
            });

            expect(res.body.data).to.deep.equal({ success: true, emailSent: true });
            expect(db.map((q) => q.sql.split(" (")[0])).to.deep.equal(["insert into `event`", "insert ignore into `calendar`", "insert ignore into `calendar`"]);
            expect(db[1].params.slice(0, 5)).to.deep.equal(["1-6-2026-9-10", 1, 6, 2026, "1-6-2026-9-10"]);
            expect(db[2].params[0]).to.equal("6-7-2026-9-10");

            const email = ses.calls[0][0].input;
            expect(email.Destination.ToAddresses).to.deep.equal(["tom@x.ca"]);
            expect(JSON.parse(email.TemplateData).HTML_CONTENT).to.include('<p>event: Golf "night"</p>');
        });

        it("POST /event returns 500 when the event could not be created", async () => {
            stub(eventService, "createEvent", async () => ({ eventId: undefined, emailSent: false }));

            const res = await api().post("/event").send({ data: { text: "Golf" } });

            expect(res.status).to.equal(500);
            expect(res.body.error).to.equal("Event could not be created");
        });

        it("POST /event returns 400 without calling the service when the body has no data", async () => {
            const create = stub(eventService, "createEvent");

            const res = await api().post("/event").send({});

            expect(res.status).to.equal(400);
            expect(res.body.error).to.equal("Missing event data");
            expect(create.calls).to.have.length(0);
        });

        it("POST /event returns 500 when the service throws", async () => {
            stub(eventService, "createEvent", async () => { throw new Error("db down"); });

            expect((await api().post("/event").send({ data: {} })).status).to.equal(500);
        });

        it("GET /event/month/:month/year/:year reads month and year from the route as numbers", async () => {
            const list = stub(calendarMapper, "getAllEventsByMonth", async () => [{ createdAt: "1", total: 1 }]);

            const res = await api().get("/event/month/6/year/2026");

            expect(res.status).to.equal(200);
            expect(res.body.data.items).to.have.length(1);
            expect(list.calls[0]).to.deep.equal([6, 2026]);
        });

        it("GET /event/month/:month/year/:year returns 500 on an error string", async () => {
            stub(calendarMapper, "getAllEventsByMonth", async () => "Error: boom");

            expect((await api().get("/event/month/6/year/2026")).status).to.equal(500);
        });

        it("POST /event/month reads month and year from the body", async () => {
            const list = stub(calendarMapper, "getAllEventsByMonth", async () => []);

            await api().post("/event/month").send({ data: { month: 7, year: 2026 } });

            expect(list.calls[0]).to.deep.equal([7, 2026]);
        });

        it("POST /event/month returns 500 on an error string", async () => {
            stub(calendarMapper, "getAllEventsByMonth", async () => "Error: boom");

            expect((await api().post("/event/month").send({ data: {} })).status).to.equal(500);
        });

        it("POST /event/publish publishes events", async () => {
            const publish = stub(eventMapper, "publishEvents", async () => true);

            expect((await api().post("/event/publish")).body.data).to.deep.equal({ result: "success" });
            expect(publish.calls).to.have.length(1);
        });

        it("POST /event/publish returns 500 when publishing throws", async () => {
            stub(eventMapper, "publishEvents", async () => { throw new Error("boom"); });

            expect((await api().post("/event/publish")).status).to.equal(500);
        });
    });

    describe("MailController", () => {
        it("POST /mail passes the body to setupEmail with its email_type", async () => {
            const setup = stub(mailMapper, "setupEmail", async () => ({ success: true }));

            const res = await api().post("/mail").send({ email_type: "contact", name: "Pat" });

            expect(res.body.data).to.deep.equal({ message: { success: true } });
            expect(setup.calls[0][0]).to.deep.equal({ email_type: "contact", data: { email_type: "contact", name: "Pat" } });
        });

        it("POST /mail returns 500 when sending throws", async () => {
            stub(mailMapper, "setupEmail", async () => { throw new Error("Email has not been sent"); });

            expect((await api().post("/mail").send({})).status).to.equal(500);
        });
    });

    describe("AccessController", () => {
        describe("parseParams", () => {
            it("coerces values to the type of their default", () => {
                const result = AccessController.parseParams(
                    { logged: "true", pageSize: "5", sort: "name", id: "42" },
                    { logged: false, pageSize: 10, sort: "" },
                );

                expect(result).to.deep.equal({ logged: true, pageSize: 5, sort: "name", id: 42 });
            });

            it("ignores the literal string 'undefined'", () => {
                expect(AccessController.parseParams({ pageSize: "undefined" }, { pageSize: 10 })).to.deep.equal({ pageSize: 10 });
            });
        });

        it("apiCreateAccess creates access when name and description are present", async () => {
            stub(accessMapper, "apiCreateAccess", async () => [{}, true]);

            const res = await mount(AccessController.apiCreateAccess).post("/").send({ name: "admin", description: "Admins" });

            expect(res.body.data).to.deep.equal({ message: "Access has been created" });
        });

        it("apiCreateAccess returns 400 for missing fields", async () => {
            expect((await mount(AccessController.apiCreateAccess).post("/").send({ name: "admin" })).status).to.equal(400);
        });

        it("apiCreateAccess returns 400 when the mapper creates nothing", async () => {
            stub(accessMapper, "apiCreateAccess", async () => undefined);

            expect((await mount(AccessController.apiCreateAccess).post("/").send({ name: "a", description: "b" })).status).to.equal(400);
        });

        it("apiDeleteAccess responds with sign-out", async () => {
            expect((await mount(AccessController.apiDeleteAccess).post("/")).body.data).to.deep.equal({ "sign-out": true });
        });

        it("getAllAccess lists access with parsed params", async () => {
            const list = stub(accessMapper, "getAllAccess", async () => [{ username: "a", total: 1 }]);

            const res = await mount(AccessController.getAllAccess, "post", "/:pageIndex/:pageSize").post("/2/5");

            expect(res.body.data.items).to.have.length(1);
            expect(list.calls[0][0]).to.include({ pageIndex: 2, pageSize: 5 });
        });

        it("apiGetAllAccessAsLabelValues maps access to label/value pairs", async () => {
            stub(accessMapper, "getAllAccess", async () => [{ id: "admin", name: "Admin" }]);

            const res = await mount(AccessController.apiGetAllAccessAsLabelValues).post("/");

            expect(res.body.data).to.deep.equal([{ label: "Admin", value: "admin" }]);
        });

        for (const name of ["getAllAccess", "apiGetAllAccessAsLabelValues"] as const) {
            it(`${name} returns 500 on an error string`, async () => {
                stub(accessMapper, "getAllAccess", async () => "Error: boom");

                expect((await mount(AccessController[name]).post("/")).status).to.equal(500);
            });
        }
    });
});
