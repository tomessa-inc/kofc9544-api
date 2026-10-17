import { expect } from "chai";
import { nthWeekdayOfMonth, occurrences, parseLocalDateTime, scheduleId } from "../../../service/event-schedule";
import { EventService } from "../../../service/event.service";
import { MailService } from "../../../service/mail.service";
import type { EventInput } from "../../../dto/event.dto";

function fake<T extends Record<string, (...args: any[]) => any>>(impl: T) {
    const calls: Record<string, any[][]> = {};
    const proxy = {} as T;
    for (const [name, fn] of Object.entries(impl)) {
        calls[name] = [];
        (proxy as any)[name] = async (...args: any[]) => (calls[name].push(args), fn(...args));
    }
    return { proxy, calls };
}

async function rejects(promise: Promise<unknown>): Promise<Error> {
    try {
        await promise;
    } catch (error) {
        return error as Error;
    }
    throw new Error("expected rejection");
}

const iso = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

describe("event scheduling", () => {
    it("parseLocalDateTime reads wall-clock fields without time-zone shifts", () => {
        expect(parseLocalDateTime("2026-06-15T18:30:00")).to.deep.equal({ year: 2026, month: 5, day: 15, hour: 18, minute: 30 });
        expect(parseLocalDateTime("2026-01-01T00:05")).to.deep.equal({ year: 2026, month: 0, day: 1, hour: 0, minute: 5 });
        expect(() => parseLocalDateTime("June 15")).to.throw("Invalid date-time");
    });

    it("scheduleId uses day-month-year-startHour-endHour", () => {
        expect(scheduleId(new Date(2026, 5, 1), 9, 10)).to.equal("1-6-2026-9-10");
    });

    describe("nthWeekdayOfMonth", () => {
        it("finds the first Monday when the month starts on one, and when it starts later in the week", () => {
            expect(iso(nthWeekdayOfMonth(2026, 5, 1, 1))).to.equal("2026-6-1");
            expect(iso(nthWeekdayOfMonth(2026, 6, 1, 1))).to.equal("2026-7-6");
        });

        it("finds the third Wednesday, falls back to the last occurrence, and rolls into the next year", () => {
            expect(iso(nthWeekdayOfMonth(2026, 10, 3, 3))).to.equal("2026-11-18");
            expect(iso(nthWeekdayOfMonth(2026, 5, 5, 5))).to.equal("2026-6-26");
            expect(iso(nthWeekdayOfMonth(2026, 12, 3, 3))).to.equal("2027-1-20");
        });
    });

    describe("occurrences", () => {
        const start = (value: string) => parseLocalDateTime(value);

        it("monthly keeps the weekday position (first Monday)", () => {
            expect(occurrences(start("2026-06-01T09:00"), "monthly", 2).map(iso)).to.deep.equal(["2026-6-1", "2026-7-6", "2026-8-3"]);
        });

        it("monthly crosses a year boundary (third Wednesday)", () => {
            expect(occurrences(start("2026-11-18T19:00"), "monthly", 2).map(iso)).to.deep.equal(["2026-11-18", "2026-12-16", "2027-1-20"]);
        });

        it("weekly is every 7 days across month ends", () => {
            expect(occurrences(start("2026-06-24T09:00"), "weekly", 2).map(iso)).to.deep.equal(["2026-6-24", "2026-7-1", "2026-7-8"]);
        });

        it("a one-off event happens once, whatever the repeat count", () => {
            expect(occurrences(start("2026-06-24T09:00"), "", 3).map(iso)).to.deep.equal(["2026-6-24"]);
        });
    });
});

describe("EventService", () => {
    const golfNight: EventInput = {
        start: "2026-06-01T09:00:00",
        end: "2026-06-01T10:00:00",
        text: "Golf night",
        description: "Annual",
        recurring: "monthly",
        frequency: 1,
        viewing: false,
    };

    function setup({ creator = { email: "tom@x.ca", firstName: "Tom" } as any, failMail = false } = {}) {
        const events = fake({ insert: async () => ({ affectedRows: 1 }) });
        const calendar = fake({ insertOccurrence: async () => ({ affectedRows: 1 }), findByMonth: async () => [{ id: "a" }, { id: "b" }] });
        const users = fake({ currentUser: async () => creator });
        const mailer = fake({
            sendCalendarEvent: async () => {
                if (failMail) throw new Error("SES down");
            },
        });
        const cdn = fake({ invalidate: async () => true });
        const service = new EventService(events.proxy, calendar.proxy, users.proxy, mailer.proxy, cdn.proxy);
        return { service, events, calendar, users, mailer, cdn };
    }

    it("createEvent saves the event, one calendar row per occurrence, and emails the creator", async () => {
        const { service, events, calendar, mailer } = setup();

        expect(await service.createEvent(golfNight, "tok")).to.deep.equal({ eventId: "1-6-2026-9-10", emailSent: true });
        expect(events.calls.insert[0][0]).to.deep.equal({
            id: "1-6-2026-9-10", hourStart: 9, minuteStart: 0, hourEnd: 10, minuteEnd: 0, text: "Golf night", description: "Annual", viewing: false,
        });
        expect(calendar.calls.insertOccurrence.map((c) => c[0])).to.deep.equal([
            { id: "1-6-2026-9-10", day: 1, month: 6, year: 2026, EventId: "1-6-2026-9-10" },
            { id: "6-7-2026-9-10", day: 6, month: 7, year: 2026, EventId: "1-6-2026-9-10" },
        ]);
        expect(mailer.calls.sendCalendarEvent[0]).to.deep.equal([
            { email: "tom@x.ca", firstName: "Tom" },
            { event: "Golf night", description: "Annual", start: golfNight.start, end: golfNight.end, recurring: "monthly" },
        ]);
    });

    it("createEvent skips the email without a token or a matching member", async () => {
        const anonymous = setup();
        expect((await anonymous.service.createEvent(golfNight, null)).emailSent).to.equal(false);
        expect(anonymous.users.calls.currentUser).to.have.length(0);

        const unknown = setup({ creator: null });
        expect((await unknown.service.createEvent(golfNight, "tok")).emailSent).to.equal(false);
        expect(unknown.mailer.calls.sendCalendarEvent).to.have.length(0);
    });

    it("createEvent reports emailSent false when mail fails after everything is saved", async () => {
        const { service, calendar } = setup({ failMail: true });

        expect((await service.createEvent(golfNight, "tok")).emailSent).to.equal(false);
        expect(calendar.calls.insertOccurrence).to.have.length(2);
    });

    it("createEvent propagates a failed event insert without writing calendar rows", async () => {
        const { service, events, calendar } = setup();
        (events.proxy as any).insert = async () => {
            throw new Error("Duplicate entry");
        };

        expect((await rejects(service.createEvent(golfNight, "tok"))).message).to.equal("Duplicate entry");
        expect(calendar.calls.insertOccurrence).to.have.length(0);
    });

    it("listByMonth adds the month's total; publish invalidates the event pages", async () => {
        const { service, calendar, cdn } = setup();

        expect(await service.listByMonth(6, 2026)).to.deep.equal([{ id: "a", total: 2 }, { id: "b", total: 2 }]);
        expect(calendar.calls.findByMonth[0]).to.deep.equal([6, 2026]);
        await service.publish();
        expect(cdn.calls.invalidate[0]).to.deep.equal(["/event/month"]);
    });
});

describe("MailService", () => {
    function setup() {
        const sent: any[] = [];
        return { service: new MailService({ send: async (email) => (sent.push(email), {}) }), sent };
    }
    const data = (email: any) => JSON.parse(email.TemplateData);

    it("sendPlayerConfirmation sends the confirmation to the player", async () => {
        const { service, sent } = setup();

        await service.sendPlayerConfirmation({ id: 7, name: "Jo", email: "jo@x.ca", phone: "1", TeamId: null, individual: true, allergies: null, payment: null, member: null });

        expect(sent[0].Destination.ToAddresses).to.deep.equal(["jo@x.ca"]);
        expect(data(sent[0]).HTML_CONTENT).to.include("ID #7");
    });

    it("sendRegistrationNotice lists the registration, including a numeric payment, for the organizers", async () => {
        const { service, sent } = setup();

        await service.sendRegistrationNotice({ team_name: "Eagles", players: [{ player: "Jo", email: "jo@x.ca", phone: "1" }], payment: 100 });

        expect(sent[0].Destination.ToAddresses).to.include("registration@kofc9544.ca");
        expect(data(sent[0]).PARAMS_CONTENT).to.include("<p>team_name: Eagles</p>").and.include("<p>payment: 100</p>").and.include("<p>email_type: register</p>");
    });

    it("sendPasswordReset and sendCalendarEvent address the member", async () => {
        const { service, sent } = setup();

        await service.sendPasswordReset({ email: "tom@x.ca", firstName: "Tom" }, "tok");
        await service.sendCalendarEvent({ email: "tom@x.ca", firstName: "Tom" }, { event: "Golf night" });

        expect(sent.map((e) => e.Destination.ToAddresses)).to.deep.equal([["tom@x.ca"], ["tom@x.ca"]]);
        expect(data(sent[0]).HTML_CONTENT).to.include("/#/auth/reset/tok");
        expect(data(sent[1]).PARAMS_CONTENT).to.include("<p>event: Golf night</p>");
    });

    it("sendFormSubmission sends the form to its committee", async () => {
        const { service, sent } = setup();

        await service.sendFormSubmission("sponsor", { email_type: "sponsor", email: "s@x.ca" });

        expect(sent[0].Destination.ToAddresses).to.include("bmilliere@sympatico.ca");
    });
});
