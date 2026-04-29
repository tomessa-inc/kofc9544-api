import {UserController} from "../controllers/user.controller";
import { createRouter, defineEventHandler } from "h3";

const authRouter = createRouter();

authRouter.get("/codes", defineEventHandler(UserController.apiGetCodes));
authRouter.post("/login", defineEventHandler(UserController.apiPostSignIn));
authRouter.post("/logout", defineEventHandler(UserController.apiPostSignOut));
authRouter.get("/", defineEventHandler(UserController.getAllUsers));
authRouter.post("/", defineEventHandler(UserController.patchUpdateUser));

export {authRouter};
