import {mailMapper} from "../mapper/";

import {inspect} from "util";

const util = require('util');

export class MailController {
    static async apiPostSendMail(req: any, res: any, next: any) {
        try {
            const retval = await mailMapper.setupEmail(req.body)
            return res.status(200).json({success: true, msg: retval})
        } catch (err) {
            return res.status(500).json({success:false, message: `Registration not successful, ${err.toString()}`});
        }
                /*
                    return res.status(200).json({
                        success: true,
                        message: `successfully got through with info ${inspect(retVal)}`
                    });
                } else { */
    }
}
