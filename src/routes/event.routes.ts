import expressRouter from 'express';

const eventRouter = expressRouter.Router();
import {EventController} from "../controllers/event.controller";

eventRouter.post("/", EventController.apiCreateEvent);
eventRouter.get("/month", EventController.apiGetEventsMonthByDay);
eventRouter.post("/publish", EventController.apiPublishEvents);

export {eventRouter }
