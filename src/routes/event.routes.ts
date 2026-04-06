import { createRouter, defineEventHandler } from "h3";
import { EventController } from "../controllers/event.controller";

const eventRouter = createRouter();

eventRouter.post("/",              defineEventHandler(EventController.apiCreateEvent));
eventRouter.get("/month/:month/year/:year", defineEventHandler(EventController.apiGetEventsMonthByDay));
eventRouter.post("/month",         defineEventHandler(EventController.apiGetEventsMonthByDay));
eventRouter.post("/publish",       defineEventHandler(EventController.apiPublishEvents));

export { eventRouter };