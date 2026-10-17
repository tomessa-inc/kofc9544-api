import { expect } from "chai";
import { EventInput, EventService } from "../../../service/event.service";
import { EmailMessaging } from "../../../models/EmailMessaging";

const golfNight: EventInput = {
    id: "",
    start: "2026-06-15T18:30:00",
    end: "2026-06-15T20:45:00",
    text: "Golf night",
    description: "Annual",
    recurring: "",
    frequency: "0",
    viewing: true,
};

function fakes(overrides: { eventId?: string; users?: unknown; prepareEmail?: () => Promise<void>; apiSendMail?: () => Promise<unknown> } = {}) {
    const calls = { createEvent: [] as any[], createCalendar: [] as any[], currentUser: [] as any[], prepareEmail: [] as any[], apiSendMail: 0 };
    const service = new EventService(
        { createEvent: async (data) => (calls.createEvent.push(data), "eventId" in overrides ? overrides.eventId : "15-6-2026-18-20") },
        { createCalendar: async (data) => (calls.createCalendar.push(data), true) },
        { currentUser: async (token) => (calls.currentUser.push(token), ("users" in overrides ? overrides.users : { email: "tom@x.ca", firstName: "Tom" }) as any) },
        {
            prepareEmail: async (body) => { calls.prepareEmail.push(body); await overrides.prepareEmail?.(); },
            apiSendMail: async () => { calls.apiSendMail++; return overrides.apiSendMail?.(); },
        },
    );
    return { service, calls };
}

describe("EventService.createEvent", () => {
    it("creates the event, its calendar rows linked by event id, and emails the creator", async () => {
        const { service, calls } = fakes();

        const result = await service.createEvent(golfNight, "tok");

        expect(result).to.deep.equal({ eventId: "15-6-2026-18-20", emailSent: true });
        expect(calls.createCalendar[0]).to.deep.equal({ ...golfNight, eventId: "15-6-2026-18-20" });
        expect(calls.currentUser).to.deep.equal(["tok"]);
        expect(calls.prepareEmail[0]).to.deep.equal({
            email_type: EmailMessaging.EMAIL_TYPE_CALENDER_EVENT,
            email: "tom@x.ca",
            firstName: "Tom",
            event: "Golf night",
            description: "Annual",
            start: "2026-06-15T18:30:00",
            end: "2026-06-15T20:45:00",
            recurring: "none",
        });
        expect(calls.apiSendMail).to.equal(1);
    });

    it("writes nothing else and sends no email when the event cannot be created", async () => {
        const { service, calls } = fakes({ eventId: undefined });

        expect(await service.createEvent(golfNight, "tok")).to.deep.equal({ eventId: undefined, emailSent: false });
        expect(calls.createCalendar).to.have.length(0);
        expect(calls.prepareEmail).to.have.length(0);
    });

    it("skips the email without looking anyone up when there is no token", async () => {
        const { service, calls } = fakes();

        expect(await service.createEvent(golfNight, null)).to.deep.equal({ eventId: "15-6-2026-18-20", emailSent: false });
        expect(calls.createCalendar).to.have.length(1);
        expect(calls.currentUser).to.have.length(0);
    });

    it("skips the email when the token matches no member", async () => {
        const { service, calls } = fakes({ users: null });

        expect((await service.createEvent(golfNight, "tok")).emailSent).to.equal(false);
        expect(calls.prepareEmail).to.have.length(0);
    });

    it("skips the email when the session lookup fails", async () => {
        const { service, calls } = fakes({ users: Promise.reject(new Error("db down")) });

        expect((await service.createEvent(golfNight, "tok")).emailSent).to.equal(false);
        expect(calls.prepareEmail).to.have.length(0);
    });

    it("still succeeds (emailSent false) when sending fails after the event is saved", async () => {
        const { service, calls } = fakes({ apiSendMail: async () => { throw new Error("SES rejected"); } });

        const result = await service.createEvent(golfNight, "tok");

        expect(result).to.deep.equal({ eventId: "15-6-2026-18-20", emailSent: false });
        expect(calls.createCalendar).to.have.length(1);
    });

    it("labels recurring events in the email", async () => {
        const { service, calls } = fakes();

        await service.createEvent({ ...golfNight, recurring: "monthly", frequency: "2" }, "tok");

        expect(calls.prepareEmail[0].recurring).to.equal("monthly");
    });
});
