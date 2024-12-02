import expressRouter from 'express';

const userRouter = expressRouter.Router();
import {UserController} from "../controllers/user.controller";
import {ImageController} from "../controllers/image.controller";
import {mediaRouter} from "./media.routes";
import {GalleryController} from "../controllers/gallery.controller";
import {UserAuthenticationController} from "../controllers/user.authentication.controller";
//import {UserAvatarController} from "../controllers/user.avatar.controller";
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()


userRouter.post("/sign-in", UserController.apiPostSignIn);
userRouter.post("/forgot-password/:id", UserAuthenticationController.apiForgotPassword);

userRouter.post("/reset-password-token/:token", UserAuthenticationController.apiResetPasswordToken);

userRouter.post("/sign-in", UserController.apiPostSignIn);
userRouter.post("/sign-out", UserController.apiPostSignOut);
userRouter.post("/sign-up", UserController.apiPostSignUp);

userRouter.post("/page-index/:pageIndex/page-size/:pageSize?/:sort?/:order?/:filterQuery?", UserController.getAllUsers);

//userRouter.post("/:pageIndex?/:pageSize?/:sort?/:order?",UserController.getAllUsers);

//userRouter.post("/", UserController.getAllUsers);
userRouter.patch("/", UserController.patchUpdateUser);
//userRouter.post("/avatar", UserAvatarController.apiUploadAvatar);

userRouter.post("/id/:id", UserController.getUserById);
userRouter.put("/id/:id", UserController.apiUpdateUser);

export {userRouter};
