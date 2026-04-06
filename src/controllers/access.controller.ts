import {defineEventHandler, readBody, getRouterParams, setResponseStatus, H3Event} from "h3";
import { accessMapper, paramsOptions, userMapper } from "../mapper/";
import { useResponseError, useResponseSuccess } from "../utils/response";

export class AccessController {

    static parsers = {
        boolean: (v: string) => v === "true",
        number:  (v: string) => Number(v),
        string:  (v: string) => isNaN(Number(v)) ? v : Number(v),
    };

    public static parseParams(params: Record<string, string>, defaults: Record<string, any>) {
        return Object.entries(params).reduce((options, [key, value]) => {
            if (value !== "undefined") {
                const type = typeof defaults[key] as keyof typeof AccessController.parsers;
                options[key] = (AccessController.parsers[type] ?? AccessController.parsers.string)(value);
            }
            return options;
        }, { ...defaults });
    }

    public static getParams(event: H3Event, defaults: Record<string, any>) {
        return AccessController.parseParams(getRouterParams(event), defaults);
    }

    public static apiCreateAccess = defineEventHandler(async (event) => {
        try {
            const body = await readBody(event);

            if (!body[accessMapper.PARAMS_NAME] || !body[accessMapper.PARAMS_DESCRIPTION]) {
                setResponseStatus(event, 400);
                return useResponseError("BadRequestException", "Missing required fields");
            }

            const access = await accessMapper.apiCreateAccess(body);

            if (!access) {
                setResponseStatus(event, 400);
                return useResponseError("BadRequestException", "Access already exists");
            }

            return useResponseSuccess({ message: "Access has been created" });
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiDeleteAccess = defineEventHandler(async (event) => {
        return useResponseSuccess({ "sign-out": true });
    });

    public static getAllAccess = defineEventHandler(async (event) => {
        try {
            const options: paramsOptions = AccessController.getParams(event, {
                pageIndex: 1, pageSize: 10, filterQuery: "",
                sort: accessMapper.DEFAULT_SORT, order: accessMapper.DEFAULT_ORDER,
            });

            const access = await accessMapper.getAllAccess(options);

            if (typeof access === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", access);
            }

            return userMapper.prepareListResults(access, options);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiGetAllAccessAsLabelValues = defineEventHandler(async (event) => {
        try {
            const options: paramsOptions = AccessController.getParams(event, {
                pageIndex: 1, pageSize: 10, filterQuery: "",
                sort: accessMapper.DEFAULT_SORT, order: accessMapper.DEFAULT_ORDER,
            });

            const access = await accessMapper.getAllAccess(options);

            if (typeof access === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", access);
            }

            const accessList = access.map((item) => ({ label: item.name, value: item.id }));

            return useResponseSuccess(accessList);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });
}