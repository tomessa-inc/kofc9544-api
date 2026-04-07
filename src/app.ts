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
const router = createRouter();

const allowedOrigins = [
  "https://member-stage.kofc9544.ca",
  "https://member.kofc9544.ca",
  "http://localhost:5555",
];


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

app.use(router);

// Mount sub-routers
router.use("/mail/**",   useBase("/mail",   mailRouter.handler));
router.use("/media/**",  useBase("/media",  mediaRouter.handler));
router.use("/user/**",   useBase("/user",   userRouter.handler));
router.use("/auth/**",   useBase("/auth",   authRouter.handler));
router.use("/event/**",  useBase("/event",  eventRouter.handler));
router.use("/access/**", useBase("/access", accessRouter.handler));
router.use("/golf/**",   useBase("/golf",   golfRouter.handler));

export { app };