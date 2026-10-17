import { getRouterParams, readBody } from "h3";
import { accessService } from "../service/access.service";
import { useResponseSuccess } from "../utils/response";
import { parseListParams } from "../validators/list.validator";
import { validateAccess } from "../validators/user.validator";
import { controller, pagedList } from "./controller";

type Body = Record<string, unknown> | undefined;

/** Access-role administration (none of these are routed yet). */
export class AccessController {
    public static apiCreateAccess = controller(async (event) => {
        await accessService.create(validateAccess(await readBody<Body>(event)));
        return useResponseSuccess({ message: "Access has been created" });
    });

    public static getAllAccess = controller(async (event) => {
        const params = parseListParams(getRouterParams(event));
        return pagedList(await accessService.list(params), params, "name");
    });

    public static apiGetAllAccessAsLabelValues = controller(async (event) => {
        return useResponseSuccess(await accessService.listAsOptions(parseListParams(getRouterParams(event))));
    });
}
