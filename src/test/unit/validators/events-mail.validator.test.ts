import { expect } from "chai";
import { BadRequestError } from "../../../errors";
import { validateEvent, validateMonth } from "../../../validators/event.validator";
import { validateFormSubmission } from "../../../validators/mail.validator";

describe("event and mail validators", () => {
    const valid = { start: "2026-06-15T18:30:00", end: "2026-06-15T20:45:00", text: " Golf night ", description: "Annual", recurring: "weekly", frequency: "3", viewing: "true" };

    it("validateEvent normalizes a valid event", () => {
        expect(validateEvent({ data: valid })).to.deep.equal({ ...valid, text: "Golf night", frequency: 3, viewing: true });
    });

    it("validateEvent defaults recurring, frequency, description and viewing", () => {
        expect(validateEvent({ data: { start: valid.start, end: valid.end, text: "x" } })).to.include({ recurring: "", frequency: 0, description: "", viewing: false });
    });

    it("validateEvent rejects bad input", () => {
        expect(() => validateEvent({})).to.throw(BadRequestError, "Missing event data");
        expect(() => validateEvent({ data: { ...valid, start: "June 15" } })).to.throw(BadRequestError, "start must be YYYY-MM-DDTHH:MM");
        expect(() => validateEvent({ data: { ...valid, text: " " } })).to.throw(BadRequestError, "Missing text");
        expect(() => validateEvent({ data: { ...valid, recurring: "daily" } })).to.throw(BadRequestError);
        for (const frequency of [-1, 1.5, 105, "x"]) expect(() => validateEvent({ data: { ...valid, frequency } })).to.throw(BadRequestError);
    });

    it("validateMonth accepts 1-12 and a sane year", () => {
        expect(validateMonth({ month: "6", year: "2026" })).to.deep.equal({ month: 6, year: 2026 });
        for (const bad of [{ month: 0, year: 2026 }, { month: 13, year: 2026 }, { month: 6, year: "x" }, {}]) {
            expect(() => validateMonth(bad)).to.throw(BadRequestError);
        }
    });

    it("validateFormSubmission accepts committee forms with their required fields", () => {
        expect(validateFormSubmission({ email_type: "sponsor", email: "s@x.ca" })).to.deep.equal({ type: "sponsor", fields: { email_type: "sponsor", email: "s@x.ca" } });
        expect(validateFormSubmission({ email_type: "register" }).type).to.equal("register");
        expect(() => validateFormSubmission({ email_type: "volunteer", name: "Pat" })).to.throw(BadRequestError, "Missing parameters: emailOrPhone");
    });

    it("validateFormSubmission rejects types that would mail an arbitrary address", () => {
        for (const email_type of ["send_id", "forgot", "calender", "contact", "toString", undefined]) {
            expect(() => validateFormSubmission({ email_type, email: "victim@x.ca" })).to.throw(BadRequestError, "Unsupported email_type");
        }
    });
});
