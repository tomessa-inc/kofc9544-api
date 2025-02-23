import cors from "cors";
import express, { Request, Response } from "express";
import path from "path";
import compression from "compression";
import { getCurrentInvoke } from "@vendia/serverless-express";
const ejs = require("ejs").__express;
const app = express();
const router = express.Router();
import {mailRouter, mediaRouter, userRouter, eventRouter, accessRouter, golfRouter} from './routes';
import {NextFunction} from "express";


const fileUpload = require('express-fileupload');
import bodyparser from 'body-parser';
/*
const bufferToJSONMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.body instanceof Buffer) {
    try {
      req.body = JSON.parse(req.body.toString());
      console.log('here it is')
      console.log(req.body);
      return req.body
    } catch (err) {
      return res.status(400).json({ error: 'Invalid JSON data' });
    }
  }

  next();
};

console.log('hello')
console.log(bufferToJSONMiddleware) */
app.use(express.static("/tmp"));
app.use(bodyparser.urlencoded({extended: true}));
app.use(bodyparser.json({limit: '50mb', type: 'application/*+json'}));
app.use(express.json({type: "application/json"}))
app.use(cors());
app.use(compression());
//app.use(bufferToJSONMiddleware)

app.use(async (req, res, next) => {
  res.header("Access.ts-Control-Allow-Origin", "*")
  res.header("Access.ts-Control-Allow-Headers", "*")
  res.header('Access.ts-Control-Allow-Methods', '*');
  res.header( "content-type", "application/json")
  check(req, res, next)

  next()
});

app.use("/mail", mailRouter);
app.use("/media", mediaRouter);
app.use("/user", userRouter);
app.use("/event", eventRouter);
app.use("/access", accessRouter);
app.use("/golf", golfRouter);


app.use("/", express);
export { app };

const check = (req, res, next) => {
  if (req.body instanceof Buffer) {
    try {
      req.body = JSON.parse(req.body.toString());

      return req

    } catch (err) {
      return res.status(400).json({error: 'Invalid JSON data'});
    }
  }
}