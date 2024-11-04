import expressRouter from 'express';

const userRouter = expressRouter.Router();
import {UserController} from "../controllers/user.controller";
//import {UserAvatarController} from "../controllers/user.avatar.controller";
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()

userRouter.post("/sign-in", UserController.apiPostSignIn);
userRouter.post("/sign-out", UserController.apiPostSignOut);
userRouter.post("/sign-up", UserController.apiPostSignUp);
userRouter.post("/", UserController.getAllUsers);
userRouter.patch("/", UserController.patchUpdateUser);
//userRouter.post("/avatar", UserAvatarController.apiUploadAvatar);

userRouter.post("/id/:id", UserController.getUserById);
userRouter.put("/id/:id", UserController.apiUpdateUser);

export {userRouter};
