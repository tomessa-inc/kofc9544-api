import expressRouter from 'express';

const accessRouter = expressRouter.Router();
import {AccessController} from "../controllers/access.controlller";
//import {UserAvatarController} from "../controllers/user.avatar.controller";
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()

accessRouter.post("/", AccessController.getAllAccess);
accessRouter.post("/new", AccessController.apiCreateAccess);
accessRouter.post("/list", AccessController.apiGetAllAccessAsLabelValues);

export {accessRouter};
