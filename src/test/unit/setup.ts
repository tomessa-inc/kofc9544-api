// Safety net: tests must never reach AWS. Any AWS SDK call a test forgets to stub goes to a closed
// local port with dummy credentials and fails immediately, instead of using this machine's real profile.
process.env.AWS_ENDPOINT_URL = "http://127.0.0.1:9";
process.env.AWS_ACCESS_KEY_ID = "test";
process.env.AWS_SECRET_ACCESS_KEY = "test";
delete process.env.AWS_PROFILE;
delete process.env.AWS_SESSION_TOKEN;

import { startTestServer } from "./helpers/http";

// Mocha root hooks: mappers log heavily, so silence console output during tests.
const original = { log: console.log, info: console.info, error: console.error, warn: console.warn };

export const mochaHooks = {
    async beforeAll() {
        await startTestServer();
    },
    beforeEach() {
        console.log = () => undefined;
        console.info = () => undefined;
        console.error = () => undefined;
        console.warn = () => undefined;
    },
    afterEach() {
        Object.assign(console, original);
    },
};
