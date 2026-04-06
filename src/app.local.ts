import { app } from "./app";
import { createApp, createRouter, toNodeListener } from 'h3';

import { createServer } from 'node:http';

const port = 9000;
/*
app.listen(port, () => {
  console.log(`Competition app listening at http://localhost:${port}`);
});
 */


const server = createServer(toNodeListener(app));

server.listen(9000, () => {
  console.log('✅ H3 running at http://localhost:9000');
});
