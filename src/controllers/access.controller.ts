import { getRouterParams, readBody } from "h3";
import { accessService } from "../service/access.service";
import { useResponseSuccess } from "../utils/response";
import { validateTextId } from "../validators/id.validator";
import { parseListParams } from "../validators/list.validator";
import { validateAccess } from "../validators/user.validator";
import { bearerToken, controller, pagedList } from "./controller";

type Body = Record<string, unknown> | undefined;

/** Access-role administration (the admin's System > Role screen). */
export class AccessController {
    /** Every role as `{ items }` (not paged). */
    public static apiListAccess = controller(async () => {
        return useResponseSuccess({ items: await accessService.listAll() });
    });

    public static apiCreateAccess = controller(async (event) => {
        const dto = validateAccess(await readBody<Body>(event));
        return useResponseSuccess(await accessService.create(dto, bearerToken(event)));
    });

    public static apiUpdateAccess = controller(async (event) => {
        const id = validateTextId(getRouterParams(event).id, "role id");
        const dto = validateAccess(await readBody<Body>(event));
        return useResponseSuccess(await accessService.update(id, dto, bearerToken(event)));
    });

    /** Also takes the role away from every member who has it. */
    public static apiDeleteAccess = controller(async (event) => {
        const id = validateTextId(getRouterParams(event).id, "role id");
        await accessService.delete(id, bearerToken(event));
        return useResponseSuccess("");
    });

    /** Paged roles (not routed). */
    public static getAllAccess = controller(async (event) => {
        const params = parseListParams(getRouterParams(event));
        return pagedList(await accessService.list(params), params, "name");
    });

    /** Roles as select options (not routed). */
    public static apiGetAllAccessAsLabelValues = controller(async (event) => {
        return useResponseSuccess(await accessService.listAsOptions(parseListParams(getRouterParams(event))));
    });
}
