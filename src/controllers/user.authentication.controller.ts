import { defineEventHandler, readBody, getRouterParams, setResponseStatus } from "h3";
import { paramsOptions, userMapper, mailMapper } from "../mapper/";
import { EmailMessaging } from "../models/EmailMessaging";
import { userAuthenticationMapper } from "../mapper/user.authentication.mapper";
import { useResponseError, useResponseSuccess } from "../utils/response";

export class UserAuthenticationController {

    public static apiForgotPasswordNoId = defineEventHandler(async (event) => {
        try {
            const body = await readBody(event);
            const userObj = await userMapper.getUserByEmail(body.email);

            const options: paramsOptions = {
                id: userObj.id,
                firstName: userObj.firstName,
                email: userObj.email,
                email_type: EmailMessaging.EMAIL_TYPE_FORGOTPASSWORD,
                token: await userMapper.encrypt(userObj.id),
            };

            await userAuthenticationMapper.deleteTokenEntry(options.id);
            await userAuthenticationMapper.createTokenEntry(options.id, options.token);
            await mailMapper.prepareEmail(options);
            await mailMapper.apiSendMail();

            return useResponseSuccess({ user: userObj, token: await userMapper.generateJWTToken() });
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiForgotPassword = defineEventHandler(async (event) => {
        try {
            const { id } = getRouterParams(event);
            const body = await readBody(event);

            const encryptedToken = await userMapper.encrypt(id);
            const options: paramsOptions = {
                id,
                email_type: EmailMessaging.EMAIL_TYPE_FORGOTPASSWORD,
                token: encryptedToken,
            };

            await userAuthenticationMapper.createTokenEntry(id, encryptedToken);
            await mailMapper.prepareEmail(options);
            await mailMapper.apiSendMail();

            const user = await userMapper.getUserBasedOnPassword(body);

            if (typeof user !== "object") {
                setResponseStatus(event, 400);
                return useResponseError("BadRequestException", "Username and/or Password incorrect");
            }

            return useResponseSuccess({ user, token: await userMapper.generateJWTToken() });
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiResetPasswordToken = defineEventHandler(async (event) => {
        try {
            const { token } = getRouterParams(event);
            const options: paramsOptions = { token };

            const user = await userAuthenticationMapper.getUserBasedOnToken(options);

            if (typeof user !== "object") {
                setResponseStatus(event, 400);
                return useResponseError("BadRequestException", "Invalid or expired token");
            }

            return useResponseSuccess({ data: user, token: await userMapper.generateJWTToken() });
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });
}