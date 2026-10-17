import { expect } from "chai";
import { EmailMessaging } from "../../../models/EmailMessaging";
import { MailService } from "../../../service/mail.service";

describe("MailService", () => {
    const player = { id: 7, name: "Jo", email: "jo@x.ca", phone: "1", TeamId: null, individual: true, allergies: null, payment: null, member: null };

    it("sends the player confirmation template with the player", async () => {
        const sent: any[] = [];
        await new MailService({ setupEmail: async (m) => (sent.push(m), { success: true }) } as any).sendPlayerConfirmation(player);

        expect(sent).to.deep.equal([{ email_type: EmailMessaging.EMAIL_TYPE_SEND_ID, data: player }]);
    });

    it("sends the registration notice with the registration as submitted", async () => {
        const sent: any[] = [];
        const registration = { team_name: "Eagles", players: [{ player: "Jo", email: "jo@x.ca", phone: "1" }] };

        await new MailService({ setupEmail: async (m) => (sent.push(m), {}) } as any).sendRegistrationNotice(registration);

        expect(sent).to.deep.equal([{ email_type: EmailMessaging.EMAIL_TYPE_REGISTER, data: registration }]);
    });

    it("throws when the template reports missing params", async () => {
        const service = new MailService({ setupEmail: async () => new Error("Missing parameters: email") } as any);

        let caught: Error | undefined;
        try {
            await service.sendPlayerConfirmation(player);
        } catch (error) {
            caught = error as Error;
        }
        expect(caught?.message).to.equal("Missing parameters: email");
    });
});
