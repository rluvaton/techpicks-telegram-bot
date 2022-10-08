const Fastify = require('fastify');

const config = require('./config');
const { setupRoute } = require('./routes/telegram-webhook');

/**
 * @type {import('fastify').FastifyInstance}
 */
let fastify;

async function setupHttpServer() {
  if (fastify) {
    await fastify.close();
  }

  fastify = Fastify({
    logger: true,

    ignoreTrailingSlash: true,
  });

  fastify.register(setupRoute, { prefix: '/telegram-bot' })
}

async function startHttpServer() {
  if (!fastify) {
    throw new Error('you must call setupHttpServer first');
  }

  const port = config.server.port;

  const address = await fastify.listen({
    port: port,
    host: '0.0.0.0',
  });

  console.info(`listening on ${address}`);

  return fastify;
}

module.exports = {
  setupHttpServer,
  startHttpServer,
}
