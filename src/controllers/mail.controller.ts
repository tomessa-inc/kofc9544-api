import { defineHandler, readBody } from "h3";
import { mailMapper } from "../mapper/";
import { useResponseError, useResponseSuccess } from "../utils/response";

export class MailController {

    public static apiPostSendMail = defineHandler(async (event) => {
        try {
            const body = await readBody<Record<string, any>>(event);
            const result = await mailMapper.setupEmail({ email_type: body.email_type, data: body });

            return useResponseSuccess({ message: result });
        } catch (error) {
            event.res.status = 500;
            return useResponseError("InternalServerError", error.toString());
        }
    });
}