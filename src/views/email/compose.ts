import { format } from "util";
import { config } from "../../config";
import { mailRecipients, mailSenders } from "../../config/mail-recipients";
import { emailImages } from "../email-images";
import { EmailType, messages } from "./messages";

/** A request for SES SendTemplatedEmail (template "DefaultEmailTemplate"). */
export interface TemplatedEmail {
    Source: string;
    Destination: { CcAddresses: string[]; ToAddresses: string[]; BccAddresses: string[] };
    ReplyToAddresses: string[];
    Template: string;
    /** JSON of the template's variables. */
    TemplateData: string;
}

interface TemplateVariables {
    to: string[];
    bcc?: readonly string[];
    source?: string;
    name: string;
    logo: string;
    banner: string;
    subject: string;
    html: string;
    fields?: string;
    text: string;
}

const TEMPLATE = "DefaultEmailTemplate";
const SMALL_LOGO = () => emailImages.logo100("kofc-logo100x100.png");
const LOGO = () => emailImages.logo200("kofc-logo.png");
const PARISH_BANNER = () => emailImages.banner("holy-redeemer-kanata.png");
const COURSE_BANNER = () => emailImages.banner("loch-march-background.jpeg");

function render(variables: TemplateVariables): TemplatedEmail {
    return {
        Source: variables.source ?? mailSenders.registrations,
        Destination: { CcAddresses: [], ToAddresses: [...variables.to], BccAddresses: [...(variables.bcc ?? [])] },
        ReplyToAddresses: [],
        Template: TEMPLATE,
        // JSON.stringify escapes member-entered text, so quotes or newlines can't break the template data.
        TemplateData: JSON.stringify({
            NAME: variables.name,
            EMAIL_LOGO: variables.logo,
            EMAIL_BANNER: variables.banner,
            SUBJECT_CONTENT: variables.subject,
            HTML_CONTENT: variables.html,
            PARAMS_CONTENT: variables.fields ?? "",
            TEXT_CONTENT: variables.text,
        }),
    };
}

/** One value of a submitted form, as HTML. */
function renderValue(value: unknown): string {
    if (Array.isArray(value)) {
        // The registration form's players.
        return value
            .map((row) => ` <p>player: ${row?.player}</p><p>email: ${row?.email}</p><p>phone: ${row?.phone}</p><p>allergies: ${row?.allergies}</p>`)
            .join("");
    }
    if (value === null || value === undefined) return "";
    return typeof value === "object" ? JSON.stringify(value) : String(value);
}

/** Every submitted field as `<p>name: value</p>`, in submission order. */
export function renderFields(fields: Record<string, unknown>): string {
    return Object.entries(fields).map(([key, value]) => format("<p>%s: %s</p>", key, renderValue(value))).join("");
}

export function playerConfirmationEmail(player: { id: number; name: string; email: string }): TemplatedEmail {
    return render({
        to: [player.email],
        bcc: mailRecipients.playerConfirmationBcc,
        name: player.name,
        logo: LOGO(),
        banner: COURSE_BANNER(),
        subject: messages.playerConfirmation.subject,
        html: format(messages.playerConfirmation.html, player.id),
        text: messages.playerConfirmation.text,
    });
}

export function passwordResetEmail(recipient: { email: string; firstName: string }, resetToken: string): TemplatedEmail {
    return render({
        source: mailSenders.account,
        to: [recipient.email],
        name: recipient.firstName,
        logo: SMALL_LOGO(),
        banner: PARISH_BANNER(),
        subject: messages.forgotPassword.subject,
        html: format(messages.forgotPassword.html, `${config.memberSiteUrl}/#/auth/reset/${resetToken}`),
        text: messages.forgotPassword.text,
    });
}

/** Tell the member who posted an event that it is on the calendar; `fields` lists its details. */
export function calendarEventEmail(recipient: { email: string; firstName: string }, fields: Record<string, unknown>): TemplatedEmail {
    const listed = renderFields(fields);
    return render({
        to: [recipient.email],
        name: recipient.firstName,
        logo: SMALL_LOGO(),
        banner: PARISH_BANNER(),
        subject: messages.calendarEvent.subject,
        html: listed,
        fields: listed,
        text: messages.calendarEvent.text,
    });
}

/** Forms whose submissions are emailed to a committee inbox. */
export type FormEmailType = typeof EmailType.ContactUs | typeof EmailType.Register | typeof EmailType.Volunteer | typeof EmailType.Sponsor;

const FORMS: Record<FormEmailType, { to: readonly string[]; name: string; message: { subject: string; text: string; html: string } }> = {
    [EmailType.ContactUs]: { to: mailRecipients.contactUs, name: "Marc", message: messages.contactUs },
    [EmailType.Register]: { to: mailRecipients.register, name: "Richard", message: messages.register },
    [EmailType.Volunteer]: { to: mailRecipients.volunteer, name: "Marc", message: messages.volunteer },
    [EmailType.Sponsor]: { to: mailRecipients.sponsor, name: "Brian", message: messages.sponsor },
};

/** A form submission for the committee; the email lists every submitted field. */
export function formSubmissionEmail(type: FormEmailType, fields: Record<string, unknown>): TemplatedEmail {
    const form = FORMS[type];
    return render({
        to: [...form.to],
        name: form.name,
        logo: LOGO(),
        banner: COURSE_BANNER(),
        subject: form.message.subject,
        html: form.message.html,
        fields: renderFields(fields),
        text: form.message.text,
    });
}
