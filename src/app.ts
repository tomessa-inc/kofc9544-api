import cors from "cors";
import express, { Request, Response } from "express";
import path from "path";
import compression from "compression";
import { getCurrentInvoke } from "@vendia/serverless-express";
const ejs = require("ejs").__express;
const app = express();
const router = express.Router();
import {mailRouter, mediaRouter, userRouter, eventRouter} from './routes';
import {NextFunction} from "express";


const fileUpload = require('express-fileupload');
import bodyparser from 'body-parser';

const bufferToJSONMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.body instanceof Buffer) {
    try {
      req.body = JSON.parse(req.body.toString());

      return req.body
    } catch (err) {
      return res.status(400).json({ error: 'Invalid JSON data' });
    }
  }

  next();
};


app.use(express.static("/tmp"));
app.use(bodyparser.urlencoded({extended: true}));
app.use(bodyparser.json({limit: '50mb', type: 'application/*+json'}));
app.use(express.json({type: "application/json"}))
app.use(cors());
app.use(compression());
app.use(bufferToJSONMiddleware)

app.use(async (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Accept-Encoding, Content-Length")
 // res.header("Access-Control-Allow-Headers", "*")
  res.header('Access-Control-Allow-Methods', '*');
  res.header( "Content-Type", "application/json")

  next()
});

app.use("/mail", mailRouter);
app.use("/media", mediaRouter);
app.use("/user", userRouter);
app.use("/event", eventRouter);

app.use("/", express);
export { app };
