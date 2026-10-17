import { H3 } from "h3";
import { UserController } from "../controllers/user.controller";
import { UserAuthenticationController } from "../controllers/user.authentication.controller";

const userRouter = new H3();

// Info
userRouter.post("/info",                                                                                    UserController.apiUserInfo);

// Password
//userRouter.post("/forgot-password",                                                                        UserAuthenticationController.apiForgotPasswordNoId);
userRouter.post("/forgot-password",                                                                    UserAuthenticationController.apiForgotPassword);
//userRouter.post("/info/:token",                                                            UserController.apiUserInfo);
userRouter.post("/reset-password",                                                            UserController.apiResetPassword);

// Auth
//userRouter.post("/sign-in",                                                                                UserController.apiPostSignIn);
//userRouter.post("/sign-out",                                                                               UserController.apiPostSignOut);
//userRouter.post("/sign-up",                                                                                UserController.apiPostSignUp);

// Users
// Optional `:param?` segments need the h3 v2 router (rou3); one route covers every trailing-param form.
userRouter.post("/page-index/:pageIndex/page-size/:pageSize?/:sort?/:order?/:filterQuery?",               UserController.getAllUsers);

userRouter.patch("/",                                                                                      UserController.patchUpdateUser);
userRouter.post("/id/:id",                                                                                 UserController.getUserById);
//userRouter.put("/id/:id",                                                                                  UserController.apiUpdateUser);


export { userRouter };