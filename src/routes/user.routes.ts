import expressRouter from 'express';

const userRouter = expressRouter.Router();
import {UserController} from "../controllers/user.controller";
//import {UserAvatarController} from "../controllers/user.avatar.controller";
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()

userRouter.post("/sign-in", UserController.apiPostSignIn);
userRouter.post("/sign-out", UserController.apiPostSignOut);
userRouter.post("/sign-up", UserController.apiPostSignUp);
userRouter.get("/", UserController.getAllUsers);
userRouter.post("/", UserController.patchUpdateUser);
//userRouter.post("/avatar", UserAvatarController.apiUploadAvatar);

export {userRouter};
