import { createRouter, defineEventHandler } from "h3";
import { MailController } from "../controllers/mail.controller";

const mailRouter = createRouter();

mailRouter.post("/", defineEventHandler(MailController.apiPostSendMail));

export { mailRouter };