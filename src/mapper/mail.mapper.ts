import { SendTemplatedEmailCommand, SESClient } from "@aws-sdk/client-ses";
import { config } from "../config";
import type { TemplatedEmail } from "../views/email/compose";

interface Sender {
    send(command: unknown): Promise<unknown>;
}

/** AWS adapter: delivers composed emails through SES. */
export class MailMapper {
    constructor(private readonly ses: Sender = new SESClient({ region: config.awsRegion })) {}

    public send(email: TemplatedEmail): Promise<unknown> {
        return this.ses.send(new SendTemplatedEmailCommand(email));
    }
}

export const mailMapper = new MailMapper();
