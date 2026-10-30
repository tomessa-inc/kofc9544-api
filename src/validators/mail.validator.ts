import { BadRequestError } from "../errors";
import type { FormEmailType } from "../views/email/compose";
import { EmailType } from "../views/email/messages";

/** Public forms POST /mail accepts, and the fields each must include. */
const REQUIRED: Record<FormEmailType, string[]> = {
    [EmailType.ContactUs]: ["message", "name", "subject", "emailOrPhone"],
    [EmailType.Register]: [],
    [EmailType.Volunteer]: ["name", "emailOrPhone"],
    [EmailType.Sponsor]: ["email"],
};

const isFormType = (value: unknown): value is FormEmailType => typeof value === "string" && Object.hasOwn(REQUIRED, value);

/**
 * A site form submission. Only committee-bound forms are accepted: other types (e.g. player
 * confirmations, which go to an address in the body) would let anyone send mail through the site.
 */
export function validateFormSubmission(body: Record<string, unknown> | undefined): { type: FormEmailType; fields: Record<string, unknown> } {
    const type = body?.email_type;
    if (!isFormType(type)) throw new BadRequestError("Unsupported email_type");

    const missing = REQUIRED[type].filter((field) => !body![field]);
    if (missing.length > 0) throw new BadRequestError(`Missing parameters: ${missing.join(", ")}`);

    return { type, fields: body! };
}
