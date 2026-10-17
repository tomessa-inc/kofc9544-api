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

/** What authentication needs from email. */
export interface PasswordResetMailer {
    sendPasswordReset(recipient: { email: string; firstName: string }, resetToken: string): Promise<void>;
}

interface TemplatedMailer {
    setupEmail(data: Record<string, unknown>): Promise<unknown>;
    prepareEmail(body: Record<string, unknown>): Promise<void>;
    apiSendMail(): Promise<unknown>;
}

/**
 * Sends the site's notification emails. Template rendering and SES delivery live in MailMapper;
 * this class decides which template goes to whom with what data.
 */
export class MailService implements GolfMailer, PasswordResetMailer {
    constructor(private readonly mailer: TemplatedMailer = mailMapper) {}

    public async sendPlayerConfirmation(player: PlayerConfirmation): Promise<void> {
        await this.send({ email_type: EmailMessaging.EMAIL_TYPE_SEND_ID, data: player });
    }

    /** Tell the organizers about a registration; the email lists the form fields as submitted. */
    public async sendRegistrationNotice(registration: RegistrationDto): Promise<void> {
        await this.send({ email_type: EmailMessaging.EMAIL_TYPE_REGISTER, data: registration });
    }

    /** Email a member their password-reset link (the template builds the link from the token). */
    public async sendPasswordReset(recipient: { email: string; firstName: string }, resetToken: string): Promise<void> {
        await this.mailer.prepareEmail({
            email_type: EmailMessaging.EMAIL_TYPE_FORGOTPASSWORD,
            email: recipient.email,
            firstName: recipient.firstName,
            token: resetToken,
        });
        await this.mailer.apiSendMail();
    }

    private async send(message: Record<string, unknown>): Promise<void> {
        const result = await this.mailer.setupEmail(message);
        // setupEmail reports missing template params by returning (not throwing) an Error.
        if (result instanceof Error) throw result;
    }
}

export const mailService = new MailService();
