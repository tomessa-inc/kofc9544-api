import { defineEventHandler, readBody, getRouterParams, setResponseStatus } from "h3";
import { eventMapper, mailMapper, paramsOptions } from "../mapper/";
import { EmailMessaging } from "../models/EmailMessaging";
import { calendarMapper } from "../mapper/calendar.mapper";
import { useResponseError, useResponseSuccess } from "../utils/response";

export class EventController {

    public static apiPublishEvents = defineEventHandler(async (event) => {
        try {
            await eventMapper.publishEvents();
            return useResponseSuccess({ result: "success" });
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiGetEventsMonthByDay = defineEventHandler(async (event) => {
        try {
            const body = await readBody(event);
            const params = getRouterParams(event);

            const month = body?.data?.month ?? params.month;
            const year = body?.data?.year ?? params.year;

            const options: paramsOptions = {
                pageIndex: 1, pageSize: 10, filterQuery: "",
                sort: eventMapper.DEFAULT_SORT, order: eventMapper.DEFAULT_ORDER,
            };

            const events = await calendarMapper.getAllEventsByMonth(month, year);

            if (typeof events === "string") {
                setResponseStatus(event, 500);
                return useResponseError("InternalServerError", events);
            }

            return eventMapper.prepareListResults(events, options);
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });

    public static apiCreateEvent = defineEventHandler(async (event) => {
        try {
            const body = await readBody(event);

            body.data.eventId = await eventMapper.createEvent(body.data);
            await calendarMapper.createCalendar(body.data);
            await mailMapper.prepareEmail({ email_type: EmailMessaging.EMAIL_TYPE_CALENDER_EVENT, data: body.data });
            await mailMapper.apiSendMail();

            return useResponseSuccess({ success: true });
        } catch (error) {
            setResponseStatus(event, 500);
            return useResponseError("InternalServerError", error.toString());
        }
    });
}