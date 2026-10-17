import { defineHandler, readBody, getRouterParams } from "h3";
import { paramsOptions, tagMapper } from "../mapper";
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

export class TagController {

    public static apiCreateTag = defineHandler(async (event) => {
        try {
            const body = await readBody<Record<string, any>>(event);
            const tag = await tagMapper.createTag(body);

            if (typeof tag === "string") {
                event.res.status = 500;
                return useResponseError("InternalServerError", tag);
            }

            return useResponseSuccess(tag);
        } catch (error) {
            event.res.status = 500;
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiGetAllTagsAsLabelValues = defineHandler(async (event) => {
        try {
            const body = await readBody<Record<string, any>>(event);
            const tags = await tagMapper.getAllTags(body);

            if (typeof tags === "string") {
                event.res.status = 500;
                return useResponseError("InternalServerError", tags);
            }

            const tagList = tags.map((tag) => ({ label: tag.name, value: tag.id }));

            return useResponseSuccess(tagList);
        } catch (error) {
            event.res.status = 500;
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiGetAllTags = defineHandler(async (event) => {
        try {
            const params = getRouterParams(event);
            const options: paramsOptions = parseParams(params, {
                pageIndex: 1, pageSize: 10, filterQuery: "",
                sort: tagMapper.DEFAULT_SORT, order: tagMapper.DEFAULT_ORDER,
            });

            const tags = await tagMapper.getAllTags(options);

            if (typeof tags === "string") {
                event.res.status = 500;
                return useResponseError("InternalServerError", tags);
            }

            return tagMapper.prepareListResults(tags, options);
        } catch (error) {
            event.res.status = 500;
            return useResponseError("InternalServerError", error.toString());
        }
    });
}