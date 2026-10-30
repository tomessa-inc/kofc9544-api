import { expect } from "chai";
import { formSubmissionEmail, passwordResetEmail, playerConfirmationEmail, renderFields } from "../../../views/email/compose";

const data = (email: { TemplateData: string }) => JSON.parse(email.TemplateData);

describe("email views", () => {
    const stage = process.env.STAGE;
    afterEach(() => {
        process.env.STAGE = stage;
    });

    it("playerConfirmationEmail goes to the player, BCCs the organizer, and quotes their payment id", () => {
        const email = playerConfirmationEmail({ id: 42, name: "Pat", email: "p@x.ca" });

        expect(email).to.deep.include({
            Source: "KOFC Golf Registrations <registrations@kofc9544.ca>",
            Destination: { CcAddresses: [], ToAddresses: ["p@x.ca"], BccAddresses: ["tomc@tomvisions.com"] },
            ReplyToAddresses: [],
            Template: "DefaultEmailTemplate",
        });
        expect(data(email)).to.include({ NAME: "Pat", SUBJECT_CONTENT: "Registration confirmed! - Knights of Columbus Golf Tournament", PARAMS_CONTENT: "" });
        expect(data(email).HTML_CONTENT).to.include("<strong>ID #42</strong>").and.include('<a href="mailto:registration@kofc9544.ca">');
    });

    it("passwordResetEmail links to the stage's member site", () => {
        process.env.STAGE = "stage";

        const email = passwordResetEmail({ email: "tom@x.ca", firstName: "Tom" }, "abc.def");

        expect(email.Source).to.equal("KOFC <test@kofc9544.ca>");
        expect(email.Destination.ToAddresses).to.deep.equal(["tom@x.ca"]);
        expect(data(email).HTML_CONTENT).to.include('<a href="https://member-stage.kofc9544.ca/#/auth/reset/abc.def">');
        expect(data(email).TEXT_CONTENT).to.equal("You are receiving this email in order to reset your password:\n");
    });

    for (const [type, to, name] of [
        ["contact_us", ["tcruicksh@gmail.com", "resolvewithmarc@sympatico.ca"], "Marc"],
        ["register", ["tcruicksh@gmail.com", "registration@kofc9544.ca"], "Richard"],
        ["volunteer", ["tcruicksh@gmail.com", "jpopulus@rogers.com"], "Marc"],
        ["sponsor", ["tcruicksh@gmail.com", "bmilliere@sympatico.ca", "resolvewithmarc@sympatico.ca"], "Brian"],
    ] as const) {
        it(`formSubmissionEmail(${type}) goes to the committee with every field listed`, () => {
            const email = formSubmissionEmail(type, { email_type: type, name: "Pat" });

            expect(email.Destination.ToAddresses).to.deep.equal(to);
            expect(data(email)).to.include({ NAME: name, PARAMS_CONTENT: `<p>email_type: ${type}</p><p>name: Pat</p>` });
        });
    }

    it("escapes member-entered quotes and newlines so the template data stays valid JSON", () => {
        const email = formSubmissionEmail("contact_us", { message: 'Bring your "A" game\nand a hat', name: 'Tom "TC"' });

        expect(data(email).PARAMS_CONTENT).to.equal('<p>message: Bring your "A" game\nand a hat</p><p>name: Tom "TC"</p>');
    });

    describe("renderFields", () => {
        it("renders numbers, booleans and null instead of crashing", () => {
            expect(renderFields({ payment: 100, individual: false, allergies: null, missing: undefined })).to.equal(
                "<p>payment: 100</p><p>individual: false</p><p>allergies: </p><p>missing: </p>",
            );
        });

        it("renders the registration form's players", () => {
            expect(renderFields({ players: [{ player: "Jo", email: "jo@x.ca", phone: "1", allergies: "none" }] })).to.equal(
                "<p>players:  <p>player: Jo</p><p>email: jo@x.ca</p><p>phone: 1</p><p>allergies: none</p></p>",
            );
        });

        it("renders other objects as JSON", () => {
            expect(renderFields({ extra: { a: 1 } })).to.equal('<p>extra: {"a":1}</p>');
        });
    });
});
