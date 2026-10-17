import { getRouterParams, readBody } from "h3";
import { authService } from "../service/auth.service";
import { clearRefreshTokenCookie, setRefreshTokenCookie } from "../utils/cookie-utils";
import { useResponseSuccess } from "../utils/response";
import { validateEmail, validateLogin } from "../validators/user.validator";
import { bearerToken, controller } from "./controller";

type Body = Record<string, unknown> | undefined;

const PASSWORD_RESET_SENT = "If that email is registered, a password reset link has been sent.";

/** Sign-in, sessions and password reset. */
export class AuthController {
    public static apiGetCodes = controller(async () => {
        return useResponseSuccess(["AC_100010", "AC_100020", "AC_100030"]);
    });

    public static apiPostSignIn = controller(async (event) => {
        let credentials;
        try {
            credentials = validateLogin(await readBody<Body>(event));
        } catch (error) {
            clearRefreshTokenCookie(event);
            throw error;
        }

        const { user, accessToken, refreshToken } = await authService.login(credentials.username, credentials.password);
        setRefreshTokenCookie(event, refreshToken);
        return useResponseSuccess({ user, accessToken });
    });

    public static apiPostSignOut = controller(async (event) => {
        await authService.logout(bearerToken(event));
        clearRefreshTokenCookie(event);
        return useResponseSuccess("");
    });

    /** The signed-in member, or "" when the token is missing, expired or revoked. */
    public static apiUserInfo = controller(async (event) => {
        return useResponseSuccess((await authService.currentUser(bearerToken(event))) ?? "");
    });

    public static apiForgotPassword = controller(async (event) => {
        await authService.requestPasswordReset(validateEmail(await readBody<Body>(event)));
        return useResponseSuccess({ message: PASSWORD_RESET_SENT });
    });

    /** Same as apiForgotPassword (the former id-based variant; not routed). */
    public static apiForgotPasswordNoId = AuthController.apiForgotPassword;

    /** Sign in with the reset link's token (sent as the bearer token). */
    public static apiResetPassword = controller(async (event) => {
        const { user, accessToken, refreshToken } = await authService.loginWithResetToken(bearerToken(event));
        setRefreshTokenCookie(event, refreshToken);
        return useResponseSuccess({ ...user, accessToken });
    });

    /** The member a reset link belongs to (not routed). */
    public static apiResetPasswordToken = controller(async (event) => {
        return useResponseSuccess({ data: await authService.userForResetToken(getRouterParams(event).token ?? null) });
    });
}
