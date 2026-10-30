import { H3 } from "h3";
import { AccessController } from "../controllers/access.controller";

const accessRouter = new H3();

// Roles. Create, update and delete need a member with a role-manager role (see AccessService).
accessRouter.post("/list", AccessController.apiListAccess);
accessRouter.post("/", AccessController.apiCreateAccess);
accessRouter.put("/id/:id", AccessController.apiUpdateAccess);
accessRouter.delete("/id/:id", AccessController.apiDeleteAccess);

export { accessRouter };
