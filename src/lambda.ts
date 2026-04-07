import "source-map-support/register";
import serverlessExpress from "@vendia/serverless-express";
import { toNodeListener } from "h3";
import { app } from "./app";

export const handler = serverlessExpress({ app: toNodeListener(app) });