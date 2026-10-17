import { getRouterParams, readBody } from "h3";
import { eventService } from "../service/event.service";
import { useResponseSuccess } from "../utils/response";
import { validateEvent, validateMonth } from "../validators/event.validator";
import { bearerToken, controller, pagedList } from "./controller";

/** Calendar event endpoints. */
export class EventController {
    public static apiCreateEvent = controller(async (event) => {
        const input = validateEvent(await readBody<Record<string, any>>(event));
        const { emailSent } = await eventService.createEvent(input, bearerToken(event));
        return useResponseSuccess({ success: true, emailSent });
    });

    /** GET /month/:month/year/:year, or POST /month with `{ data: { month, year } }`. */
    public static apiGetEventsMonthByDay = controller(async (event) => {
        const body = await readBody<Record<string, any>>(event);
        const { month, year } = validateMonth(body?.data ?? getRouterParams(event));
        const rows = await eventService.listByMonth(month, year);
        return pagedList(rows, { sort: "createdAt", order: "asc" }, "createdAt");
    });

    public static apiPublishEvents = controller(async () => {
        await eventService.publish();
        return useResponseSuccess({ result: "success" });
    });
}
