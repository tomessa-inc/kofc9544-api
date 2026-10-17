import { getRouterParams, readBody } from "h3";
import { tagService } from "../service/tag.service";
import { useResponseSuccess } from "../utils/response";
import { parseListParams } from "../validators/list.validator";
import { validateTag } from "../validators/media.validator";
import { controller, pagedList } from "./controller";

type Body = Record<string, unknown> | undefined;

/** Gallery tag endpoints. */
export class TagController {
    public static apiGetAllTags = controller(async (event) => {
        const params = parseListParams(getRouterParams(event));
        return pagedList(await tagService.list(params), params, "name");
    });

    /** Every tag as select options. */
    public static apiGetAllTagsAsLabelValues = controller(async () => {
        return useResponseSuccess(await tagService.listAsOptions());
    });

    /** Create a tag; an existing tag with the same name is returned instead (`created: false`). */
    public static apiCreateTag = controller(async (event) => {
        return useResponseSuccess(await tagService.create(validateTag(await readBody<Body>(event))));
    });
}
