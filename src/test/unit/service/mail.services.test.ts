import { expect } from "chai";
import { MailService } from "../../../service/mail.service";

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

    it("sendPasswordReset addresses the member", async () => {
        const { service, sent } = setup();

        await service.sendPasswordReset({ email: "tom@x.ca", firstName: "Tom" }, "tok");

        expect(sent[0].Destination.ToAddresses).to.deep.equal(["tom@x.ca"]);
        expect(data(sent[0]).HTML_CONTENT).to.include("/#/auth/reset/tok");
    });

    it("sendFormSubmission sends the form to its committee", async () => {
        const { service, sent } = setup();

        await service.sendFormSubmission("sponsor", { email_type: "sponsor", email: "s@x.ca" });

        expect(sent[0].Destination.ToAddresses).to.include("bmilliere@sympatico.ca");
    });
});
