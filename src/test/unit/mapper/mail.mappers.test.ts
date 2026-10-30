import { expect } from "chai";
import { MailMapper } from "../../../mapper/mail.mapper";

describe("mail mapper", () => {
    it("MailMapper.send delivers through SES as a SendTemplatedEmailCommand", async () => {
        const sent: any[] = [];
        const email = { Source: "s", Destination: { CcAddresses: [], ToAddresses: ["a@x.ca"], BccAddresses: [] }, ReplyToAddresses: [], Template: "T", TemplateData: "{}" };

        await new MailMapper({ send: async (c) => (sent.push(c), {}) }).send(email);

        expect(sent[0].constructor.name).to.equal("SendTemplatedEmailCommand");
        expect(sent[0].input).to.deep.equal(email);
    });
});
