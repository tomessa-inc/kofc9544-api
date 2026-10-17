import {UserController} from "../controllers/user.controller";
import { H3 } from "h3";

const authRouter = new H3();

authRouter.get("/codes", UserController.apiGetCodes);
authRouter.post("/login", UserController.apiPostSignIn);
authRouter.post("/logout", UserController.apiPostSignOut);
//authRouter.get("/", UserController.getAllUsers);
//authRouter.post("/", UserController.patchUpdateUser);

export {authRouter};
