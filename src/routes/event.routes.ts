import expressRouter from 'express';

const eventRouter = expressRouter.Router();
import {EventController} from "../controllers/event.controller";

eventRouter.post("/", EventController.apiCreateEvent);
eventRouter.post("/month", EventController.apiGetEventsMonthByDay);

export {eventRouter }
