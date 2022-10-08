#!/usr/bin/env node

// When using console this will make it print the with depth 5. and not [Object] when it's below 5 level deep
require("util").inspect.defaultOptions.depth = 5;
require('dotenv-flow').config({
  default_node_env: 'development'
});

const error = require('./error-logger');
const { setupHttpServer, startHttpServer } = require('./server');

async function main() {
    await setupHttpServer();
    await startHttpServer();
}

main().catch(async err => {
  await error(`start failed`, { error: err });
});
