import {accessMapper, galleryMapper, imageMapper, mailMapper, paramsOptions, userMapper} from "../mapper/";
import {EmailMessaging} from "../models/EmailMessaging";
import {userAuthenticationMapper} from "../mapper/user.authentication.mapper";

export class UserAuthenticationController {

    /**
     * Function that determins if your username and password are correct
     * @param req
     * @param res
     * @param next
     */
    public static async apiForgotPasswordNoId(req: any, res: any, next: any) {
        try {
            const options: paramsOptions = { id: "string", email_type: "string", token: "string", firstName: "", email: "" };

            const userObj = await userMapper.getUserByEmail(req.body.email)

            options.id = userObj.id
            options.firstName = userObj.firstName
            options.id = userObj.id
            options.email = userObj.email

            await userAuthenticationMapper.deleteTokenEntry(options.id)

            const encryptedToken  = await userMapper.encrypt(options.id)

            options.email_type = EmailMessaging.EMAIL_TYPE_FORGOTPASSWORD
            options.token = encryptedToken

            await userAuthenticationMapper.createTokenEntry(options.id, encryptedToken)
            await mailMapper.prepareEmail(options)
            await mailMapper.apiSendMail()

            return res.status(200).json({"user":userObj, "token":userMapper.generateJWTToken()});
            //  } else {
            ///      console.log("Missing either Username and/or password");
            //    return res.status(500).json({ error: "Missing either Username and/or password" })
            // }
        } catch (error) {
            return res.status(500).json({ error: error.toString() })
        }

    }
    /**
     * Function that determins if your username and password are correct
     * @param req
     * @param res
     * @param next
     */
    public static async apiForgotPassword(req: any, res: any, next: any) {
        try {
            //    if (req.body[userMapper.PARAMS_USERNAME] && req.body[userMapper.PARAMS_PASSWORD]) {

            const options: paramsOptions = { id: "string", email_type: "string", token: "string"};




            const encryptedToken  = await userMapper.encrypt(req.params.id)

            if (req.params.id) {
                options.id = req.params.id;
                options.email_type = EmailMessaging.EMAIL_TYPE_FORGOTPASSWORD,
                    options.token = encryptedToken
            }
            await userAuthenticationMapper.createTokenEntry(options.id, encryptedToken)
            await mailMapper.prepareEmail(options)
            await mailMapper.apiSendMail()

            const user = await userMapper.getUserBasedOnPassword(req.body);
            console.log('user');
            console.log(user);
            if (typeof(user) !== "object") {

                return res.status(500).json({ error: "Username and/or Password incorrect" })
            }

            console.log("good stuff")

            return res.status(200).json({"user":user, "token":userMapper.generateJWTToken()});
            //  } else {
            ///      console.log("Missing either Username and/or password");
            //    return res.status(500).json({ error: "Missing either Username and/or password" })
            // }
        } catch (error) {
            return res.status(500).json({ error: error.toString() })
        }

    }

    public static async apiResetPasswordToken(req: any, res: any, next: any) {
        try {
            //    if (req.body[userMapper.PARAMS_USERNAME] && req.body[userMapper.PARAMS_PASSWORD]) {

            const options: paramsOptions = { token: "string"};

            if (req.params.token) {
                options.token = req.params.token;
            }



            //  await userMapper.createTokenEntry(options.id, options.token)
            //  await mailMapper.prepareEmail(options)
            //  await mailMapper.apiSendMail()

            const user = await userAuthenticationMapper.getUserBasedOnToken(options);
            console.log('user');
            console.log(user);
            if (typeof(user) !== "object") {

                return res.status(500).json({ error: "Username and/or Password incorrect" })
            }


            console.log("good stuff")

            return res.status(200).json({"data":user, "token":userMapper.generateJWTToken()});
            //  } else {
            ///      console.log("Missing either Username and/or password");
            //    return res.status(500).json({ error: "Missing either Username and/or password" })
            // }
        } catch (error) {
            return res.status(500).json({ error: error.toString() })
        }

    }


}
