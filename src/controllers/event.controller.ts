import { defineHandler, readBody, getRouterParams } from "h3";
import { eventMapper, paramsOptions, userMapper } from "../mapper/";
import { calendarMapper } from "../mapper/calendar.mapper";
import { eventService, EventInput } from "../service/event.service";
import { useResponseError, useResponseSuccess } from "../utils/response";

export class EventController {

    public static apiPublishEvents = defineHandler(async (event) => {
        try {
            await eventMapper.publishEvents();
            return useResponseSuccess({ result: "success" });
        } catch (error) {
            event.res.status = 500;
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiGetEventsMonthByDay = defineHandler(async (event) => {
        try {
            // Shared by GET /month/:month/year/:year and POST /month (readBody returns undefined for a GET).
            const body = await readBody<Record<string, any>>(event);
            const params = getRouterParams(event);

            const month = Number(body?.data?.month ?? params.month);
            const year = Number(body?.data?.year ?? params.year);

            const options: paramsOptions = {
                pageIndex: 1, pageSize: 10, filterQuery: "",
                sort: eventMapper.DEFAULT_SORT, order: eventMapper.DEFAULT_ORDER,
            };

            const events = await calendarMapper.getAllEventsByMonth(month, year);

            if (typeof events === "string") {
                event.res.status = 500;
                return useResponseError("InternalServerError", events);
            }

            return eventMapper.prepareListResults(events, options);
        } catch (error) {
            event.res.status = 500;
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiCreateEvent = defineHandler(async (event) => {
        try {
            const body = await readBody<{ data: EventInput }>(event);
            if (!body?.data) {
                event.res.status = 400;
                return useResponseError("BadRequest", "Missing event data");
            }
            const token = await userMapper.getAuthToken(event);

            const { eventId, emailSent } = await eventService.createEvent(body.data, token);
            if (!eventId) {
                event.res.status = 500;
                return useResponseError("InternalServerError", "Event could not be created");
            }

            return useResponseSuccess({ success: true, emailSent });
        } catch (error) {
            event.res.status = 500;
            return useResponseError("InternalServerError", error.toString());
        }
    });
}