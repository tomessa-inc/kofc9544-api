import { H3 } from "h3";
import { MailController } from "../controllers/mail.controller";

const mailRouter = new H3();

mailRouter.post("/", MailController.apiPostSendMail);

export { mailRouter };