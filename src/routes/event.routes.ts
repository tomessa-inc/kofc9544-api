import { H3 } from "h3";
import { EventController } from "../controllers/event.controller";

const eventRouter = new H3();

eventRouter.post("/",              EventController.apiCreateEvent);
eventRouter.get("/month/:month/year/:year", EventController.apiGetEventsMonthByDay);
eventRouter.post("/month",         EventController.apiGetEventsMonthByDay);
eventRouter.post("/publish",       EventController.apiPublishEvents);

export { eventRouter };