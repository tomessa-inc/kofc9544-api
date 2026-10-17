import { getRouterParams, readBody } from "h3";
import { userService } from "../service/user.service";
import { useResponseSuccess } from "../utils/response";
import { parseListParams } from "../validators/list.validator";
import { validateTextId } from "../validators/id.validator";
import { validateSignUp, validateUserPatch, validateUserUpdate } from "../validators/user.validator";
import { controller, pagedList } from "./controller";

type Body = Record<string, unknown> | undefined;

/** Member administration. Sign-in and sessions are in AuthController. */
export class UserController {
    public static getAllUsers = controller(async (event) => {
        const params = parseListParams(getRouterParams(event), { sort: "firstName" });
        return pagedList(await userService.list(params), params, "firstName");
    });

    /** The member with their access roles (a plain object, not the envelope). */
    public static getUserById = controller(async (event) => {
        return userService.get(validateTextId(getRouterParams(event).id, "user id"));
    });

    /** PATCH /user with `{ id, user: { ...fields } }`. */
    public static patchUpdateUser = controller(async (event) => {
        const { id, changes } = validateUserPatch(await readBody<Body>(event));
        await userService.update(id, changes);
        return useResponseSuccess({ message: "User has been successfully updated" });
    });

    /** PUT /user/id/:id (not routed). */
    public static apiUpdateUser = controller(async (event) => {
        const id = validateTextId(getRouterParams(event).id, "user id");
        return useResponseSuccess(await userService.update(id, validateUserUpdate(await readBody<Body>(event))));
    });

    /** Sign-up (not routed). */
    public static apiPostSignUp = controller(async (event) => {
        await userService.signUp(validateSignUp(await readBody<Body>(event)));
        return useResponseSuccess({ message: "User has been created" });
    });
}
