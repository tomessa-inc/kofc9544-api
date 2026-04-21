import { createRouter, defineEventHandler } from "h3";
import { UserController } from "../controllers/user.controller";
import { UserAuthenticationController } from "../controllers/user.authentication.controller";

const userRouter = createRouter();

// Info
userRouter.post("/info",                                                                                    defineEventHandler(UserController.apiUserInfo));

// Password
//userRouter.post("/forgot-password",                                                                        defineEventHandler(UserAuthenticationController.apiForgotPasswordNoId));
userRouter.post("/forgot-password",                                                                    defineEventHandler(UserAuthenticationController.apiForgotPassword));
//userRouter.post("/info/:token",                                                            defineEventHandler(UserController.apiUserInfo));
userRouter.post("/reset-password",                                                            defineEventHandler(UserController.apiResetPassword));

// Auth
userRouter.post("/sign-in",                                                                                defineEventHandler(UserController.apiPostSignIn));
userRouter.post("/sign-out",                                                                               defineEventHandler(UserController.apiPostSignOut));
userRouter.post("/sign-up",                                                                                defineEventHandler(UserController.apiPostSignUp));

// Users
userRouter.post("/page-index/:pageIndex/page-size/:pageSize?/:sort?/:order?/:filterQuery?",               defineEventHandler(UserController.getAllUsers));
userRouter.post("/page-index/:pageIndex/page-size/:pageSize?/:sort?/:order?",                       defineEventHandler(UserController.getAllUsers));

userRouter.patch("/",                                                                                      defineEventHandler(UserController.patchUpdateUser));
userRouter.post("/id/:id",                                                                                 defineEventHandler(UserController.getUserById));
userRouter.put("/id/:id",                                                                                  defineEventHandler(UserController.apiUpdateUser));


export { userRouter };