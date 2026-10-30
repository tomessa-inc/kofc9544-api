import http from "http";
import { AddressInfo } from "net";
import request from "supertest";
import { H3, EventHandler, toNodeHandler } from "h3";
import { app } from "../../../app";

/*
 * One server for the whole run, bound to 127.0.0.1 before any test starts (see setup.ts).
 * supertest's default listens on "::" and connects to 127.0.0.1, so it can be handed a port that another
 * local app (an IDE, Postman) holds on IPv4 and get that app's 404. Tests run serially, so api()/mount()
 * just swap which handler the shared server forwards to.
 */
let current: http.RequestListener = toNodeHandler(app);
const server = http.createServer((req, res) => current(req, res));
let baseUrl: string | undefined;

export function startTestServer(): Promise<void> {
    return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            server.unref();
            baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
            resolve();
        });
    });
}

function client(listener: http.RequestListener) {
    if (!baseUrl) throw new Error("Test server not started: setup.ts must await startTestServer()");
    current = listener;
    return request(baseUrl);
}

/** supertest client for the real app, so tests exercise the actual route bindings. */
export const api = () => client(toNodeHandler(app));

/** supertest client for a single handler, for controller methods that no route exposes yet. */
export function mount(handler: EventHandler, method: "get" | "post" | "put" | "patch" | "delete" = "post", path = "/") {
    const testApp = new H3();
    testApp[method](path, handler);
    return client(toNodeHandler(testApp));
}
