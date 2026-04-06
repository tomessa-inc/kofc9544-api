import { createRouter, defineEventHandler } from "h3";
import { AccessController } from "../controllers/access.controller";
import {UserController} from "../controllers/user.controller";

const accessRouter = createRouter();
accessRouter.get("/codes",                                                          defineEventHandler(UserController.apiGetCodes));
accessRouter.post("/",                                                          defineEventHandler(AccessController.getAllAccess));
accessRouter.post("/new",                                                       defineEventHandler(AccessController.apiCreateAccess));
accessRouter.post("/list/page-index/:pageIndex/page-size/:pageSize?/:sort?/:order?", defineEventHandler(AccessController.apiGetAllAccessAsLabelValues));

export { accessRouter };