import { getRouterParams, readBody } from "h3";
import { galleryService } from "../service/gallery.service";
import { useResponseSuccess } from "../utils/response";
import { validateTextId } from "../validators/id.validator";
import { parseListParams } from "../validators/list.validator";
import { validateGalleryUpdate } from "../validators/media.validator";
import { controller, pagedList } from "./controller";

type Body = Record<string, unknown> | undefined;

/** Photo gallery endpoints. */
export class GalleryController {
    public static apiGetAllGalleries = controller(async (event) => {
        const params = parseListParams(getRouterParams(event));
        return pagedList(await galleryService.list(params), params, "name");
    });

    public static apiGetGalleryById = controller(async (event) => {
        return useResponseSuccess(await galleryService.get(validateTextId(getRouterParams(event).id, "gallery id")));
    });

    public static apiUpdateGalleryById = controller(async (event) => {
        const id = validateTextId(getRouterParams(event).id, "gallery id");
        await galleryService.update(id, validateGalleryUpdate(await readBody<Body>(event)));
        return useResponseSuccess(true);
    });

    public static apiPublishGallery = controller(async () => {
        await galleryService.publish();
        return useResponseSuccess({ result: "success" });
    });
}
