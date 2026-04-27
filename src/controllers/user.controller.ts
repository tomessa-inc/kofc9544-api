import { defineEventHandler, setResponseStatus, readBody, getRouterParams } from "h3";
import { userMapper, accessMapper, paramsOptions } from "../mapper/";
import { forbiddenResponse, useResponseError, useResponseSuccess } from "../utils/response";
import { clearRefreshTokenCookie, setRefreshTokenCookie } from "../utils/cookie-utils";
import {user as userModel} from "../models/User"

export class UserController {

    public static apiPostSignIn = defineEventHandler(async (event) => {
        try {
            const body = await readBody(event);

            if (body[userMapper.PARAMS_USERNAME] && body[userMapper.PARAMS_PASSWORD]) {
                const user = (await userMapper.getUserBasedOnPassword(body))[0];

                console.log("the user")
                console.log(user);
                if (typeof user !== "object") {
                    setResponseStatus(event, 400);
                    return useResponseError("BadRequestException", "Username and/or Password incorrect");
                }

                const accessToken = await userMapper.generateAccessToken(user);
                console.log("the access token")
                console.log(accessToken)
                const refreshToken = await userMapper.generateRefreshToken(user);

                setRefreshTokenCookie(event, refreshToken);
                console.log("about to update")
                await userMapper.cleanResetPasswordToken(user);
                await userMapper.cleanResetPasswordToken(user, "LOGGED");
                await userMapper.insertUserToken(user, accessToken, "LOGGED");
                console.log("about to clean")
                await userMapper.cleanResetPasswordToken(user);

                const result = userMapper.prepareResults(user);
                result.data.accessToken = accessToken;



                setRefreshTokenCookie(event, refreshToken);
/*
                return useResponseSuccess({
                    ...findUser,
                    accessToken,
                }); */

                return useResponseSuccess({ user, accessToken });

            } else {
                clearRefreshTokenCookie(event);
                return forbiddenResponse(event, "Username or password is incorrect.");
            }
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiUserInfo = defineEventHandler(async (event) => {
        let user: typeof userModel[];
        let userInfo
        try {
            const token = await userMapper.getAuthToken(event);
            console.log("the token")
            console.log(token);
          /*  if (token == null) {
                console.log("not found")
                const resetTokenParam = getRouterParams(event);
                const {resetToken} = resetTokenParam
                user = (await userMapper.getUserByToken(resetToken))[0];
                const accessToken = await userMapper.generateAccessToken(user);
                const refreshToken = await userMapper.generateRefreshToken(user);

                setRefreshTokenCookie(event, refreshToken);
                console.log("about to update")

                await userMapper.updateUserToken(user, accessToken);

            } else { */
                user = await userMapper.getUserByToken(token);
                if (user.length > 0) {
                    userInfo = user[0]
                    await userMapper.cleanResetPasswordToken(user);
                    console.log("the user 1")
                    console.log(userInfo);
                    return useResponseSuccess(userInfo);
                } else {
                    await userMapper.cleanResetPasswordTokenOnly(token);
                    return useResponseSuccess("");

               //     return setResponseStatus(event, 200);

                }
//                console.log("the ussser")

  //              console.log(user);
          //  }

        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });


    public static apiResetPassword = defineEventHandler(async (event) => {
        let user;
        try {
            const token = await userMapper.getAuthToken(event);
            console.log("the token")
            console.log(token);
            user = (await userMapper.getUserByTokenReset(token, "RESET_PASSWORD"))[0];
            console.log("the user")
            console.log(user);
            const accessToken = await userMapper.generateAccessToken(user);
            const refreshToken = await userMapper.generateRefreshToken(user);

            setRefreshTokenCookie(event, refreshToken);
            console.log("about to update")

            await userMapper.cleanResetPasswordToken(user);
            await userMapper.cleanResetPasswordToken(user, "LOGGED");
            await userMapper.insertUserToken(user, accessToken, "LOGGED");

       //     await userMapper.cleanResetPasswordToken(user);
            console.log("the user reset")
            console.log(user);
            return useResponseSuccess({...user, accessToken});
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiPostSignOut = defineEventHandler(async (event) => {
        return useResponseSuccess("");
    });

    public static apiGetCodes = defineEventHandler(async (event) => {
        return useResponseSuccess(["AC_100010", "AC_100020", "AC_100030"]);
    });

    public static apiPostSignUp = defineEventHandler(async (event) => {
        try {
            const body = await readBody(event);

            if (body[userMapper.PARAMS_EMAIL] && body[userMapper.PARAMS_PASSWORD] && body[userMapper.PARAMS_USERNAME]) {
                const user = await userMapper.apiSignUp(body);

                if (!user) {
                    setResponseStatus(event, 400);
                    return useResponseError("BadRequestException", "Username already exists");
                }

                return useResponseSuccess({ message: "User has been created" });
            }

            setResponseStatus(event, 400);
            return useResponseError("BadRequestException", "Missing required fields");
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static patchUpdateUser = defineEventHandler(async (event) => {
        try {
            const body = await readBody(event);

            if (body[userMapper.PARAMS_ID] && body[userMapper.PARAMS_USER]) {
                const userUpdate = await userMapper.apiUpdateUser(body, body[userMapper.PARAMS_ID]);

                if (!userUpdate) {
                    setResponseStatus(event, 500);
                    return useResponseError("InternalServerError", "User has not been successfully updated");
                }

                return useResponseSuccess({ message: "User has been successfully updated" });
            }

            setResponseStatus(event, 500);
            return useResponseError("BadRequestException", "Missing parameters to access this function");
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static getAllUsers = defineEventHandler(async (event) => {
        try {
            const params = getRouterParams(event);
            const options: paramsOptions = {
                pageIndex: 1,
                pageSize: 10,
                filterQuery: "",
                sort: userMapper.DEFAULT_SORT,
                order: userMapper.DEFAULT_ORDER,
            };

            Object.entries(params).forEach(([key, value]) => {
                if (value !== "undefined") {
                    options[key] = isNaN(Number(value)) ? value : Number(value);
                }
            });

            const users = await userMapper.getAllUsers(options);

            if (typeof users === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", users);
            }

            return userMapper.prepareListResults(users, options);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static getUserById = defineEventHandler(async (event) => {
        try {
            const params = getRouterParams(event);
            const options: paramsOptions = { id: params.id };

            const user = await userMapper.getUserById(options);

            if (typeof user === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", user);
            }

            return user;
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiUpdateUser = defineEventHandler(async (event) => {
        try {
            const params = getRouterParams(event);
            const body = await readBody(event);
            const { id } = params;

          //  await accessMapper.apiDeleteAccess(id);
            //await Promise.all(body.access.map((access) => accessMapper.apiAddAccess(id, access)));

            console.log(body)
            const result = await userMapper.apiUpdateUser(id, body);

            if (typeof result === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", result);
            }

            return result;
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });
}