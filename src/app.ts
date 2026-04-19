import {
  createApp,
  createRouter,
  defineEventHandler, getRequestHeader,
  handleCors,
  setHeader,
  useBase
} from "h3";
import {
  mailRouter,
  mediaRouter,
  userRouter,
  eventRouter,
  accessRouter,
  golfRouter,
  authRouter
} from "./routes";

const app = createApp();
//const router = createRouter();

const allowedOrigins = [
  "https://member-stage.kofc9544.ca",
  "https://member.kofc9544.ca",
  "http://localhost:5555",
  "http://localhost:4200",
];

console.log("hello")

// ✅ Bug 1 fixed: CORS middleware registered BEFORE the router
app.use(defineEventHandler((event) => {
  const isPreflight = handleCors(event, {
    origin: (origin) => allowedOrigins.includes(origin),
    methods: "*",
    allowHeaders: "*",
    credentials: true,
  });

  // ✅ Bug 2 fixed: return early on OPTIONS preflight requests
  if (isPreflight) return;

  setHeader(event, "Content-Type", "application/json");
}));

//app.use(router);
/*
const mediaRouter = createRouter();
mediaRouter.get("/id/:id/image/:pageIndex?/:pageSize?/:sort?/:order?", defineEventHandler((event) => {
  console.log("HIT on original mediaRouter");
  return "hit";
}));
app.use("/media", mediaRouter.handler);
*/
//export { app };

// Mount sub-routers
app.use("/mail", mailRouter.handler);
app.use("/user", userRouter.handler);

app.use("/media", mediaRouter.handler); //mediaRouter.handler);
app.use("/auth",  authRouter.handler)
app.use("/event",  eventRouter.handler)
app.use("/access", accessRouter.handler)
app.use("/golf",   golfRouter.handler)

export { app };