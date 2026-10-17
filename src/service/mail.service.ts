import { mailMapper } from "../mapper/mail.mapper";
import { EmailMessaging } from "../models/EmailMessaging";
import type { RegistrationDto } from "../dto/golf.dto";

/** What the golf workflows need from email. */
export interface GolfMailer {
    sendPlayerConfirmation(player: PlayerConfirmation): Promise<void>;
    sendRegistrationNotice(registration: RegistrationDto): Promise<void>;
}

/** The player a confirmation (with their payment reference id) is sent to. */
export interface PlayerConfirmation {
    id: number;
    name: string;
    email: string;
    phone: string;
    TeamId: string | null;
    individual: boolean;
    allergies: string | null;
    payment: string | null;
    member: string | null;
}

interface TemplatedMailer {
    setupEmail(data: Record<string, unknown>): Promise<unknown>;
}

/**
 * Sends the site's notification emails. Template rendering and SES delivery live in MailMapper;
 * this class decides which template goes to whom with what data.
 */
export class MailService implements GolfMailer {
    constructor(private readonly mailer: TemplatedMailer = mailMapper) {}

    public async sendPlayerConfirmation(player: PlayerConfirmation): Promise<void> {
        await this.send({ email_type: EmailMessaging.EMAIL_TYPE_SEND_ID, data: player });
    }

    /** Tell the organizers about a registration; the email lists the form fields as submitted. */
    public async sendRegistrationNotice(registration: RegistrationDto): Promise<void> {
        await this.send({ email_type: EmailMessaging.EMAIL_TYPE_REGISTER, data: registration });
    }

    private async send(message: Record<string, unknown>): Promise<void> {
        const result = await this.mailer.setupEmail(message);
        // setupEmail reports missing template params by returning (not throwing) an Error.
        if (result instanceof Error) throw result;
    }
}

export const mailService = new MailService();
