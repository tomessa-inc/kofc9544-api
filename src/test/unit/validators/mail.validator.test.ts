import { expect } from "chai";
import { BadRequestError } from "../../../errors";
import { validateFormSubmission } from "../../../validators/mail.validator";

describe("mail validators", () => {
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
