import { defineEventHandler, readBody, setResponseStatus } from "h3";
import { mailMapper } from "../mapper/";
import { useResponseError, useResponseSuccess } from "../utils/response";

export class MailController {

    public static apiPostSendMail = defineEventHandler(async (event) => {
        try {
            const body = await readBody(event);
            const result = await mailMapper.setupEmail({ email_type: body.email_type, data: body });

            return useResponseSuccess({ message: result });
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });
}