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
