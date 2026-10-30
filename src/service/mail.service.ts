import type { RegistrationDto } from "../dto/golf.dto";
import { MailMapper, mailMapper } from "../mapper/mail.mapper";
import {
    formSubmissionEmail,
    passwordResetEmail,
    playerConfirmationEmail,
    type FormEmailType,
} from "../views/email/compose";
import { EmailType } from "../views/email/messages";

/** What the golf workflows need from email. */
export interface GolfMailer {
    sendPlayerConfirmation(player: PlayerConfirmation): Promise<void>;
    sendRegistrationNotice(registration: RegistrationDto): Promise<void>;
}

/** What authentication needs from email. */
export interface PasswordResetMailer {
    sendPasswordReset(recipient: Recipient, resetToken: string): Promise<void>;
}

export interface Recipient {
    email: string;
    firstName: string;
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

/** Decides which email goes to whom; composing is in views/email, delivery in MailMapper. */
export class MailService implements GolfMailer, PasswordResetMailer {
    constructor(private readonly mailer: Pick<MailMapper, "send"> = mailMapper) {}

    public async sendPlayerConfirmation(player: PlayerConfirmation): Promise<void> {
        await this.mailer.send(playerConfirmationEmail(player));
    }

    /** Tell the organizers about a registration; the email lists the form fields as submitted. */
    public async sendRegistrationNotice(registration: RegistrationDto): Promise<void> {
        await this.mailer.send(formSubmissionEmail(EmailType.Register, { ...registration, email_type: EmailType.Register }));
    }

    public async sendPasswordReset(recipient: Recipient, resetToken: string): Promise<void> {
        await this.mailer.send(passwordResetEmail(recipient, resetToken));
    }

    /** A public site form (contact us, sponsor, volunteer, register) for the committee inbox. */
    public async sendFormSubmission(type: FormEmailType, fields: Record<string, unknown>): Promise<void> {
        await this.mailer.send(formSubmissionEmail(type, fields));
    }
}

export const mailService = new MailService();
