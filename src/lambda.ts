import "source-map-support/register";
import serverlessHttp from "serverless-http";
import { toNodeHandler } from "h3";
import { app } from "./app";

export const handler = serverlessHttp(toNodeHandler(app));
