import { H3 } from "h3";
import { AuthController } from "../controllers/auth.controller";
import { UserController } from "../controllers/user.controller";

const userRouter = new H3();

// Session and password reset
userRouter.post("/info", AuthController.apiUserInfo);
userRouter.post("/forgot-password", AuthController.apiForgotPassword);
userRouter.post("/reset-password", AuthController.apiResetPassword);

// Members. Optional `:param?` segments need the h3 v2 router (rou3); one route covers every trailing-param form.
userRouter.post("/page-index/:pageIndex/page-size/:pageSize?/:sort?/:order?/:filterQuery?", UserController.getAllUsers);
userRouter.patch("/", UserController.patchUpdateUser);
userRouter.post("/id/:id", UserController.getUserById);

export { userRouter };
