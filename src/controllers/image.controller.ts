import { getRouterParams, readBody } from "h3";
import { imageService } from "../service/image.service";
import { useResponseSuccess } from "../utils/response";
import { validateTextId } from "../validators/id.validator";
import { parseListParams } from "../validators/list.validator";
import { validateImageUpdate, validateOrder } from "../validators/media.validator";
import { controller, pagedList } from "./controller";

type Body = Record<string, unknown> | undefined;

/** Gallery image endpoints. */
export class ImageController {
    public static apiGetAllImages = controller(async (event) => {
        const params = parseListParams(getRouterParams(event));
        return pagedList(await imageService.list(params), params, "name");
    });

    public static apiGetAllImagesByGallery = controller(async (event) => {
        const params = parseListParams(getRouterParams(event), { pageSize: 20, sort: "name", order: "asc" });
        const galleryId = validateTextId(String(params.imagesByGalleryId ?? ""), "gallery id");
        return pagedList(await imageService.listByGallery(galleryId, params), params, "name");
    });

    /** Primary images; GET /primary/logged/:logged includes private galleries when logged is "true". */
    public static apiGetAllPrimaryImages = controller(async (event) => {
        const signedIn = getRouterParams(event).logged === "true";
        return useResponseSuccess({ images: await imageService.listPrimary(signedIn) });
    });

    public static apiGetImage = controller(async (event) => {
        return useResponseSuccess(await imageService.get(validateTextId(getRouterParams(event).id, "image id")));
    });

    public static apiUpdateImage = controller(async (event) => {
        const id = validateTextId(getRouterParams(event).id, "image id");
        return useResponseSuccess(await imageService.update(id, validateImageUpdate(await readBody<Body>(event))));
    });

    public static apiUpdateOrderImage = controller(async (event) => {
        const { galleryId, id, order } = getRouterParams(event);
        return useResponseSuccess(await imageService.setOrder(
            validateTextId(galleryId, "gallery id"),
            validateTextId(id, "image id"),
            validateOrder(order),
        ));
    });

    /** Renumber a gallery's images (not routed). */
    public static apiImagesOrder = controller(async (event) => {
        return useResponseSuccess(await imageService.renumber(validateTextId(getRouterParams(event).id, "gallery id")));
    });

    public static apiDeleteImage = controller(async (event) => {
        await imageService.delete(validateTextId(getRouterParams(event).id, "image id"));
        return useResponseSuccess(true);
    });
}
