import { expect } from "chai";
import { mailMapper } from "../../../mapper/mail.mapper";
import { mailService } from "../../../service/mail.service";
import { api } from "../helpers/http";
import { stubMethod } from "../helpers/stubs";

describe("Mail controller (HTTP contract)", () => {
    const stubs: { restore: () => void }[] = [];
    const stub = <T extends object, K extends keyof T>(target: T, key: K, impl?: (...args: any[]) => any) => {
        const s = stubMethod(target, key, impl);
        stubs.push(s);
        return s;
    };
    afterEach(() => stubs.splice(0).reverse().forEach((s) => s.restore()));

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

    describe("end to end (only SES is faked)", () => {
        it("POST /mail delivers the contact form to the committee", async () => {
            const ses = stub((mailMapper as any).ses, "send", async () => ({}));

            await api().post("/mail").send({ email_type: "contact_us", name: "Pat", subject: "Hi", message: 'Say "hi"', emailOrPhone: "p@x.ca" });

            const email = ses.calls[0][0].input;
            expect(email.Destination.ToAddresses).to.deep.equal(["tcruicksh@gmail.com", "resolvewithmarc@sympatico.ca"]);
            expect(JSON.parse(email.TemplateData).PARAMS_CONTENT).to.include('<p>message: Say "hi"</p>');
        });
    });
});
