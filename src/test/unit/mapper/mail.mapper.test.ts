import { expect } from "chai";
import { mailMapper } from "../../../mapper";
import { emailParams } from "../../../data/email-params";
import { EmailMessaging } from "../../../models/EmailMessaging";
import { stubMethod } from "../helpers/sql-stub";

describe("MailMapper", () => {
    const stubs: { restore: () => void }[] = [];
    const track = <T extends { restore: () => void }>(stub: T) => (stubs.push(stub), stub);
    const sentParams = () => (mailMapper as any)._params;
    const templateData = () => JSON.parse(sentParams().TemplateData);

    afterEach(() => stubs.splice(0).reverse().forEach((s) => s.restore()));

    describe("setupEmail", () => {
        it("sends the email when every required param is present", async () => {
            const send = track(stubMethod(mailMapper, "apiSendMail", async () => ({ $metadata: { httpStatusCode: 200 } })));

            const result = await mailMapper.setupEmail({ data: { email_type: "send_id", email: "p@x.ca", name: "Pat", id: 12 } });

            expect(result).to.deep.equal({ success: true, data: { $metadata: { httpStatusCode: 200 } } });
            expect(send.calls).to.have.length(1);
        });

        it("takes email_type from the wrapper when the body has none", async () => {
            track(stubMethod(mailMapper, "apiSendMail", async () => ({ $metadata: { httpStatusCode: 200 } })));

            const result = await mailMapper.setupEmail({ email_type: "register", data: { team_name: "Eagles" } });

            expect(result).to.have.property("success", true);
        });

        it("returns an error listing missing params without sending", async () => {
            const send = track(stubMethod(mailMapper, "apiSendMail"));

            const result = await mailMapper.setupEmail({ data: { email_type: "contact", name: "Pat" } });

            expect(result).to.be.instanceOf(Error);
            expect((result as Error).message).to.include("message").and.include("email");
            expect(send.calls).to.have.length(0);
        });

        it("throws for an unknown email type", async () => {
            let caught: Error | undefined;
            try {
                await mailMapper.setupEmail({ data: { email_type: "nope" } });
            } catch (error) {
                caught = error as Error;
            }
            expect(caught?.message).to.match(/^Email has not been sent/);
        });
    });

    describe("prepareEmail", () => {
        it("send_id: addresses the player and includes their id in the body", async () => {
            await mailMapper.prepareEmail({ email_type: EmailMessaging.EMAIL_TYPE_SEND_ID, email: "p@x.ca", name: "Pat", id: 42 });

            expect(sentParams().Destination.ToAddresses).to.deep.equal(["p@x.ca"]);
            expect(sentParams().Destination.BccAddresses).to.include("tomc@tomvisions.com");
            expect(templateData().NAME).to.equal("Pat");
            expect(templateData().HTML_CONTENT).to.include("ID #42");
        });

        it("calender: addresses the event creator and lists the event details", async () => {
            await mailMapper.prepareEmail({
                email_type: EmailMessaging.EMAIL_TYPE_CALENDER_EVENT,
                email: "tom@x.ca",
                firstName: "Tom",
                event: "Golf night",
                start: "2026-06-15T18:30:00",
            });

            expect(sentParams().Destination.ToAddresses).to.deep.equal(["tom@x.ca"]);
            expect(templateData().NAME).to.equal("Tom");
            expect(templateData().HTML_CONTENT).to.include("<p>event: Golf night</p>").and.include("<p>start: 2026-06-15T18:30:00</p>");
        });

        it("calender: escapes quotes and line breaks so SES receives valid template JSON", async () => {
            await mailMapper.prepareEmail({
                email_type: EmailMessaging.EMAIL_TYPE_CALENDER_EVENT,
                email: "tom@x.ca",
                firstName: 'Tom "TC"',
                description: 'Bring your "A" game\nand a hat',
            });

            const data = templateData();
            expect(data.NAME).to.equal('Tom "TC"');
            expect(data.HTML_CONTENT).to.include('<p>description: Bring your "A" game\nand a hat</p>');
        });

        it("register: sends to the registration inbox with the form fields", async () => {
            await mailMapper.prepareEmail({ email_type: EmailMessaging.EMAIL_TYPE_REGISTER, team_name: "Eagles" });

            expect(sentParams().Destination.ToAddresses).to.include("registration@kofc9544.ca");
            expect(templateData().PARAMS_CONTENT).to.include("<p>team_name: Eagles</p>");
        });

        it("forgot: builds the reset link for the current stage", async () => {
            const stage = process.env.STAGE;
            process.env.STAGE = "stage";
            try {
                await mailMapper.prepareEmail({ email_type: EmailMessaging.EMAIL_TYPE_FORGOTPASSWORD, email: "u@x.ca", firstName: "Uma", token: "tok" });
            } finally {
                process.env.STAGE = stage;
            }

            expect(sentParams().Destination.ToAddresses).to.deep.equal(["u@x.ca"]);
            expect(sentParams().TemplateData).to.include("https://member-stage.kofc9544.ca/#/auth/reset/tok");
        });

        for (const [type, inbox] of [
            [EmailMessaging.EMAIL_TYPE_CONTACTUS, "resolvewithmarc@sympatico.ca"],
            [EmailMessaging.EMAIL_TYPE_VOLUNTEER, "jpopulus@rogers.com"],
            [EmailMessaging.EMAIL_TYPE_SPONSOR, "bmilliere@sympatico.ca"],
        ]) {
            it(`${type}: sends to the committee inbox`, async () => {
                await mailMapper.prepareEmail({ email_type: type, name: "Pat" });

                expect(sentParams().Destination.ToAddresses).to.include(inbox);
                expect(templateData().PARAMS_CONTENT).to.include("<p>name: Pat</p>");
            });
        }

        it("does not accumulate recipients across forgot-password sends", async () => {
            const body = { email_type: EmailMessaging.EMAIL_TYPE_FORGOTPASSWORD, email: "a@x.ca", token: "t" };
            await mailMapper.prepareEmail(body);
            await mailMapper.prepareEmail({ ...body, email: "b@x.ca" });

            expect(sentParams().Destination.ToAddresses).to.deep.equal(["b@x.ca"]);
        });

        it("does not carry the send_id BCC into later emails of other types", async () => {
            await mailMapper.prepareEmail({ email_type: EmailMessaging.EMAIL_TYPE_SEND_ID, email: "p@x.ca", name: "Pat", id: 1 });
            await mailMapper.prepareEmail({ email_type: EmailMessaging.EMAIL_TYPE_FORGOTPASSWORD, email: "u@x.ca", token: "t" });

            expect(sentParams().Destination.BccAddresses).to.deep.equal([]);
            expect(sentParams().Destination.ToAddresses).to.deep.equal(["u@x.ca"]);
        });

        it("does not BCC the same address twice across send_id emails", async () => {
            await mailMapper.prepareEmail({ email_type: EmailMessaging.EMAIL_TYPE_SEND_ID, email: "a@x.ca", name: "A", id: 1 });
            await mailMapper.prepareEmail({ email_type: EmailMessaging.EMAIL_TYPE_SEND_ID, email: "b@x.ca", name: "B", id: 2 });

            expect(sentParams().Destination.BccAddresses).to.deep.equal(["tomc@tomvisions.com"]);
        });

        it("leaves the shared emailParams template untouched", async () => {
            const before = JSON.stringify(emailParams);

            await mailMapper.prepareEmail({ email_type: EmailMessaging.EMAIL_TYPE_SEND_ID, email: "p@x.ca", name: "Pat", id: 1 });
            await mailMapper.prepareEmail({ email_type: EmailMessaging.EMAIL_TYPE_REGISTER, team_name: "Eagles" });

            expect(JSON.stringify(emailParams)).to.equal(before);
        });
    });

    describe("formatBody", () => {
        it("renders each key/value as a paragraph", async () => {
            await mailMapper.formatBody({ name: "Pat", member: "yes" });

            expect((mailMapper as any)._PARAMS_CONTENT).to.equal("<p>name: Pat</p><p>member: yes</p>");
        });
    });

    describe("checkObject", () => {
        it("passes strings, booleans and undefined through", () => {
            expect(mailMapper.checkObject("x")).to.equal("x");
            expect(mailMapper.checkObject(true)).to.equal(true);
            expect(mailMapper.checkObject(undefined)).to.equal(undefined);
        });

        it("formats an array of players", () => {
            const html = mailMapper.checkObject([{ player: "Pat", email: "p@x.ca", phone: "555", allergies: "none" }]);

            expect(html).to.equal(" <p>player: Pat</p><p>email: p@x.ca</p><p>phone: 555</p><p>allergies: none</p>");
        });
    });

    describe("apiSendMail", () => {
        it("sends a SendTemplatedEmailCommand through the SES client", async () => {
            const send = track(stubMethod((mailMapper as any)._sesClient, "send", async () => ({ ok: true })));

            expect(await mailMapper.apiSendMail()).to.deep.equal({ ok: true });
            expect(send.calls[0][0].constructor.name).to.equal("SendTemplatedEmailCommand");
        });
    });

    describe("getters", () => {
        it("exposes param names", () => {
            expect(mailMapper.PARAMS_NAME).to.equal("name");
            expect(mailMapper.PARAMS_EMAIL).to.equal("email");
            expect(mailMapper.PARAMS_EMAIL_TYPE).to.equal("email_type");
            expect(mailMapper.PARAMS_MESSAGE).to.equal("message");
            expect(mailMapper.PARAMS_PHONE).to.equal("phone");
            expect(mailMapper.PARAMS_BODY).to.equal("body");
            expect(mailMapper.PARAMS_EMAILORPHONE).to.equal("emailOrPhone");
            expect(mailMapper.PARAMS_SUBJECT).to.equal("subject");
        });
    });
});
