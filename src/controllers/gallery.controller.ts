import { defineEventHandler, readBody, getRouterParams, setResponseStatus } from "h3";
import { galleryMapper, paramsOptions } from "../mapper/";
import { useResponseError, useResponseSuccess } from "../utils/response";

function parseParams(params: Record<string, string>, defaults: Record<string, any>) {
    const options = { ...defaults };
    Object.entries(params).forEach(([key, value]) => {
        if (value !== "undefined") {
            options[key] = isNaN(Number(value)) ? value : Number(value);
        }
    });
    return options;
}

export class GalleryController {

    public static apiGetAllGalleries = defineEventHandler(async (event) => {
        try {
            const params = getRouterParams(event);
            const options: paramsOptions = parseParams(params, {
                pageIndex: 1, pageSize: 10, filterQuery: "",
                sort: galleryMapper.DEFAULT_SORT, order: galleryMapper.DEFAULT_ORDER,
            });

            const galleries = await galleryMapper.getAllGalleries(options);

            if (typeof galleries === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", galleries);
            }

            return galleryMapper.prepareListResults(galleries, options);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiPublishGallery = defineEventHandler(async (event) => {
        try {
            await galleryMapper.publishGallery();
            return useResponseSuccess({ result: "success" });
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiUpdateGalleryById = defineEventHandler(async (event) => {
        try {
            const { id } = getRouterParams(event);
            const body = await readBody(event);

            const gallery = await galleryMapper.updateGallery({ id }, body);

            if (typeof gallery === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", gallery);
            }

            return useResponseSuccess(gallery);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiGetGalleryById = defineEventHandler(async (event) => {
        try {
            const { id } = getRouterParams(event);

            const gallery = (await galleryMapper.getGalleryById({ id }))[0];

            if (typeof gallery === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", gallery);
            }

            gallery.Tags = (gallery.Tags ?? []).map((tag) => ({
                label: tag.name,
                value: tag.id,
            }));

            return useResponseSuccess(gallery);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });
}