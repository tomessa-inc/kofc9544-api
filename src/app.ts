import { H3, handleCors } from "h3";
import {
  mailRouter,
  mediaRouter,
  userRouter,
  eventRouter,
  accessRouter,
  golfRouter,
  authRouter
} from "./routes";

const app = new H3();

const allowedOrigins = [
  "https://member-stage.kofc9544.ca",
  "https://member.kofc9544.ca",
  "https://golf.kofc9544.ca",
  "https://golf-stage.kofc9544.ca",
  "https://www.kofc9544.ca",
  "https://www-stage.kofc9544.ca",
  "http://localhost:5555",
  "http://localhost:4200",
];

// CORS middleware registered BEFORE the routes. handleCors returns the preflight response
// for OPTIONS requests (which must be returned), or false for everything else.
app.use((event) => {
  const preflight = handleCors(event, {
    origin: (origin) => allowedOrigins.includes(origin),
    methods: "*",
    allowHeaders: "*",
    credentials: true,
  });

  if (preflight !== false) return preflight;

  event.res.headers.set("Content-Type", "application/json");
  return undefined;
});

// Mount sub-apps
app.mount("/mail", mailRouter);
app.mount("/user", userRouter);
app.mount("/media", mediaRouter);
app.mount("/auth", authRouter);
app.mount("/event", eventRouter);
app.mount("/access", accessRouter);
app.mount("/golf", golfRouter);

export { app };
