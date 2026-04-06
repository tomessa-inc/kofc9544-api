import {defineEventHandler, readBody, getRouterParams, setResponseStatus, H3Event} from "h3";
import { imageMapper, paramsOptions } from "../mapper";
import { useResponseError, useResponseSuccess } from "../utils/response";

const parsers = {
    boolean: (v: string) => v === "true",
    number:  (v: string) => Number(v),
    string:  (v: string) => isNaN(Number(v)) ? v : Number(v),
};

function parseParams(params: Record<string, string>, defaults: Record<string, any>) {
    return Object.entries(params).reduce((options, [key, value]) => {
        if (value !== "undefined") {
            const type = typeof defaults[key] as keyof typeof parsers;
            options[key] = (parsers[type] ?? parsers.string)(value);
        }
        return options;
    }, { ...defaults });
}

function getParams(event: H3Event, defaults: Record<string, any>) {
    return parseParams(getRouterParams(event), defaults);
}

export class ImageController {

    public static apiUpdateOrderImage = defineEventHandler(async (event) => {
        try {
            const { id, galleryId, order } = getParams(event, {
                id: "",
                galleryId: "",
                order: 0,
            });

            const result = await imageMapper.updateOrder(galleryId, id, order);

            if (typeof result === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", result);
            }

            return useResponseSuccess(result);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiImagesOrder = defineEventHandler(async (event) => {
        try {
            const { id } = getRouterParams(event);
            const images = await imageMapper.reOrder(id);

            if (typeof images === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", images);
            }

            for (let i = 0; i < images.length; i++) {
                await imageMapper.reNum(images[i].id, i);
            }

            return useResponseSuccess(images);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiDeleteImage = defineEventHandler(async (event) => {
        try {
            const { id } = getRouterParams(event);
            const result = await imageMapper.deleteImageById(id);

            if (typeof result === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", result);
            }

            return useResponseSuccess(result);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiGetImage = defineEventHandler(async (event) => {
        try {
            const { id } = getRouterParams(event);
            const images = await imageMapper.getImageById(id);

            if (typeof images === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", images);
            }

            return useResponseSuccess(images[0]);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiUpdateImage = defineEventHandler(async (event) => {
        try {
            const { id } = getRouterParams(event);
            const body = await readBody(event);
            const result = await imageMapper.updateImageById(id, body);

            if (typeof result === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", result);
            }

            return useResponseSuccess(result);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiGetAllImages = defineEventHandler(async (event) => {
        try {
            const options: paramsOptions = parseParams(getRouterParams(event), {
                pageIndex: 1, pageSize: 10, filterQuery: "",
                sort: imageMapper.DEFAULT_SORT, order: imageMapper.DEFAULT_ORDER,
            });

            const images = await imageMapper.getAllImages(options);

            if (typeof images === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", images);
            }

            options.listLength = await imageMapper.getListLength();

            return imageMapper.prepareListResults(images, options);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiGetAllPrimaryImages = defineEventHandler(async (event) => {
        try {
            const options: paramsOptions = parseParams(getRouterParams(event), {
                logged: false,
            });

            const images = await imageMapper.getAllPrimaryImages(options);

            if (typeof images === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", images);
            }

            return useResponseSuccess({ images });
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiGetAllImagesByGallery = defineEventHandler(async (event) => {
        try {
            const options: paramsOptions = parseParams(getRouterParams(event), {
                id: "", pageIndex: 1, pageSize: 20, filterQuery: "",
            });

            const images = await imageMapper.getImagesByGallery(options);

            if (typeof images === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", images);
            }

            options.listLength = await imageMapper.getListLength(options);

            return imageMapper.prepareListResults(images, options);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });
}