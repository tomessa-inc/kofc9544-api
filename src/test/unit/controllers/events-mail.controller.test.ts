import { expect } from "chai";
import { sqlExecutor } from "../../../db/executor";
import { mailMapper } from "../../../mapper/mail.mapper";
import { authService } from "../../../service/auth.service";
import { eventService } from "../../../service/event.service";
import { mailService } from "../../../service/mail.service";
import { api } from "../helpers/http";
import { stubMethod } from "../helpers/sql-stub";

describe("Event / Mail controllers (HTTP contract)", () => {
    const stubs: { restore: () => void }[] = [];
    const stub = <T extends object, K extends keyof T>(target: T, key: K, impl?: (...args: any[]) => any) => {
        const s = stubMethod(target, key, impl);
        stubs.push(s);
        return s;
    };
    afterEach(() => stubs.splice(0).reverse().forEach((s) => s.restore()));

    const data = { start: "2026-06-01T09:00:00", end: "2026-06-01T10:00:00", text: "Golf", recurring: "monthly", frequency: 1, viewing: false };

    describe("POST /event", () => {
        it("validates, passes the bearer token, and reports emailSent", async () => {
            const create = stub(eventService, "createEvent", async () => ({ eventId: "1-6-2026-9-10", emailSent: true }));

            const res = await api().post("/event").set("Authorization", "Bearer tok").send({ data });

            expect(res.body).to.deep.equal({ code: 0, data: { success: true, emailSent: true }, error: null, message: "ok" });
            expect(create.calls[0]).to.deep.equal([{ ...data, description: "" }, "tok"]);
        });

        it("passes a null token when anonymous", async () => {
            const create = stub(eventService, "createEvent", async () => ({ eventId: "x", emailSent: false }));

            await api().post("/event").send({ data });

            expect(create.calls[0][1]).to.equal(null);
        });

        it("returns 400 for missing or invalid data without calling the service", async () => {
            const create = stub(eventService, "createEvent");

            expect((await api().post("/event").send({})).body).to.include({ message: "BadRequest", error: "Missing event data" });
            expect((await api().post("/event").send({ data: { ...data, start: "soon" } })).status).to.equal(400);
            expect(create.calls).to.have.length(0);
        });

        it("returns a generic 500 when saving fails", async () => {
            stub(eventService, "createEvent", async () => {
                throw new Error("ER_DUP_ENTRY");
            });

            const res = await api().post("/event").send({ data });

            expect(res.status).to.equal(500);
            expect(res.body.error).to.equal("Internal server error");
        });
    });

    describe("month listing", () => {
        it("GET /event/month/:month/year/:year lists the month as a paged envelope", async () => {
            const list = stub(eventService, "listByMonth", async () => [{ createdAt: "2026-06-02", total: 2 }, { createdAt: "2026-06-01", total: 2 }]);

            const res = await api().get("/event/month/6/year/2026");

            expect(list.calls[0]).to.deep.equal([6, 2026]);
            expect(res.body.data.items.map((r) => r.createdAt)).to.deep.equal(["2026-06-01", "2026-06-02"]);
            expect(res.body).to.include({ total: "2", lastpage: "1" });
        });

        it("POST /event/month reads month and year from the body", async () => {
            const list = stub(eventService, "listByMonth", async () => []);

            await api().post("/event/month").send({ data: { month: 7, year: 2026 } });

            expect(list.calls[0]).to.deep.equal([7, 2026]);
        });

        it("returns 400 for an invalid month", async () => {
            expect((await api().get("/event/month/13/year/2026")).status).to.equal(400);
        });
    });

    it("POST /event/publish publishes", async () => {
        const publish = stub(eventService, "publish", async () => true);

        expect((await api().post("/event/publish")).body.data).to.deep.equal({ result: "success" });
        expect(publish.calls).to.have.length(1);
    });

    describe("POST /mail", () => {
        it("sends a valid form submission to its committee", async () => {
            const send = stub(mailService, "sendFormSubmission", async () => undefined);

            const res = await api().post("/mail").send({ email_type: "volunteer", name: "Pat", emailOrPhone: "p@x.ca" });

            expect(res.body.data).to.deep.equal({ message: { success: true } });
            expect(send.calls[0]).to.deep.equal(["volunteer", { email_type: "volunteer", name: "Pat", emailOrPhone: "p@x.ca" }]);
        });

        it("returns 400 naming missing fields, and for types that would mail arbitrary addresses", async () => {
            const send = stub(mailService, "sendFormSubmission");

            expect((await api().post("/mail").send({ email_type: "contact_us", name: "Pat" })).body.error).to.equal("Missing parameters: message, subject, emailOrPhone");
            expect((await api().post("/mail").send({ email_type: "send_id", email: "victim@x.ca", id: 1 })).status).to.equal(400);
            expect(send.calls).to.have.length(0);
        });
    });

    describe("end to end (only the SQL executor and SES are faked)", () => {
        it("POST /event saves the event and its occurrences and emails the creator", async () => {
            const queries: { sql: string; params: unknown[] }[] = [];
            stub(sqlExecutor, "run", async (q) => (queries.push(q.toSQL()), { affectedRows: 1 }));
            stub(authService, "currentUser", async () => ({ id: "u1", email: "tom@x.ca", firstName: "Tom", lastName: "C", roles: null, realName: "Tom C" }));
            const ses = stub((mailMapper as any).ses, "send", async () => ({}));

            const res = await api().post("/event").set("Authorization", "Bearer tok").send({ data: { ...data, text: 'Golf "night"' } });

            expect(res.body.data).to.deep.equal({ success: true, emailSent: true });
            expect(queries.map((q) => q.sql.split(" (")[0])).to.deep.equal(["insert into `event`", "insert ignore into `calendar`", "insert ignore into `calendar`"]);
            expect(queries[2].params[0]).to.equal("6-7-2026-9-10");
            const email = ses.calls[0][0].input;
            expect(email.Destination.ToAddresses).to.deep.equal(["tom@x.ca"]);
            expect(JSON.parse(email.TemplateData).HTML_CONTENT).to.include('<p>event: Golf "night"</p>');
        });

        it("POST /mail delivers the contact form to the committee", async () => {
            const ses = stub((mailMapper as any).ses, "send", async () => ({}));

            await api().post("/mail").send({ email_type: "contact_us", name: "Pat", subject: "Hi", message: 'Say "hi"', emailOrPhone: "p@x.ca" });

            const email = ses.calls[0][0].input;
            expect(email.Destination.ToAddresses).to.deep.equal(["tcruicksh@gmail.com", "resolvewithmarc@sympatico.ca"]);
            expect(JSON.parse(email.TemplateData).PARAMS_CONTENT).to.include('<p>message: Say "hi"</p>');
        });
    });
});
