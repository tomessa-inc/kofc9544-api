import { readBody } from "h3";
import { mailService } from "../service/mail.service";
import { useResponseSuccess } from "../utils/response";
import { validateFormSubmission } from "../validators/mail.validator";
import { controller } from "./controller";

/** The site's contact, sponsor, volunteer and register forms. */
export class MailController {
    public static apiPostSendMail = controller(async (event) => {
        const { type, fields } = validateFormSubmission(await readBody<Record<string, unknown>>(event));
        await mailService.sendFormSubmission(type, fields);
        return useResponseSuccess({ message: { success: true } });
    });
}
