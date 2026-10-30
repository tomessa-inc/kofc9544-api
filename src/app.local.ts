import { app } from "./app";
import { toNodeHandler } from 'h3';

import { createServer } from 'node:http';

const port = 9000;

const server = createServer(toNodeHandler(app));

server.listen(port, () => {
  console.log(`✅ H3 running at http://localhost:${port}`);
});
