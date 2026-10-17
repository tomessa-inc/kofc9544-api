import { H3 } from "h3";
import { AccessController } from "../controllers/access.controller";
import {UserController} from "../controllers/user.controller";

const accessRouter = new H3();
//accessRouter.post("/",                                                          AccessController.getAllAccess);
//accessRouter.post("/new",                                                       AccessController.apiCreateAccess);
//accessRouter.post("/list/page-index/:pageIndex/page-size/:pageSize?/:sort?/:order?", AccessController.apiGetAllAccessAsLabelValues);

export { accessRouter };