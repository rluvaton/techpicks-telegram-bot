const config = require('../config');
const { TECH_PICKS_REGEX } = require('../common');
const { addNewTechPicksToGitHub } = require('../services/techpicks');
const telegram = require('../services/telegram');
const error = require('../error-logger');


function assertMessageIsFromTechPicksChannel(event) {
  if (!telegram.isEventIsAChannelMessage(event) && !telegram.isEventIsAChannelEditedMessage(event)) {
    const error = new Error('Not a channel message');
    error.additionalData = { event };
    throw error;
  }

  const postChannelID = telegram.getChannelID(event);
  if (postChannelID !== config.telegram.channelId) {
    const error = new Error(`Message is from ${telegram.getChannelName(event)} channel (channel ID: ${postChannelID}) and not from channel ID ${config.telegram.channelId}, odd :|`);
    error.additionalData = { event };
    throw error;
  }
}

/**
 * Setup Telegram Webhook route
 * @param {import('fastify').FastifyInstance} fastify
 * @return {Promise<void>}
 */
async function setupRoute(fastify) {
  fastify.post(
    `/${config.telegram.token}`,
    async (req) => {
      const event = req.body;

      try {
        assertMessageIsFromTechPicksChannel(event);
      } catch (e) {
        // We don't wait for the result because we don't need to do this before we respond to the client
        // noinspection ES6MissingAwait
        error(e, e.additionalData);

        // If we return an error telegram will try to resend the event
        // And we don't want to get the event again because it's not belong here
        return {};
      }

      const isEditedChannelPost = telegram.isEventIsAChannelEditedMessage(event);

      const { content, date } = telegram.getChannelMessage(event, isEditedChannelPost);

      console.log('new channel message', { content, date });

      if (!TECH_PICKS_REGEX.test(content)) {
        // We don't wait for the result because we don't need to do this before we respond to the client
        // noinspection ES6MissingAwait
        error('Not a valid TechPicks message', { requestBody: req.body, content });

        return {};
      }

      try {
        await addNewTechPicksToGitHub({ content, timestamp: date });
      } catch (e) {
        // We don't wait for the result because we don't need to do this before we respond to the client
        // noinspection ES6MissingAwait
        error('Some error happened while trying to create a new TechPicks update in GitHub', {
          requestBody: req.body,
          content,
        }, e);

        // If we return an error telegram will try to resend the event
        throw new Error('Some error happened while trying to create a new TechPicks update in GitHub');
      }

      return {};
    },
  );
}

module.exports = {
  setupRoute,
};
