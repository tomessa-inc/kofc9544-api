import { MailMapper } from "./mapper/mail.mapper";
import { mailMapper } from "./mapper";

async function run() {
    const data = {
        email:      "tcricksh@gmail.com",
        name:       "tom",
        body:       "Would like to discuss something that is really cool. Woot!",
        email_type: "contact-us",
        subject:    "Requesting time to check things blah blah",
        phone:      "613-111-1111",
    };

    const result = await mailMapper.setupEmail({ email_type: data.email_type, data });
    console.log(result);
}

run();