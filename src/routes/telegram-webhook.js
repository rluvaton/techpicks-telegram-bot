const express = require('express');
const config = require('../config');
const {TECH_PICKS_REGEX} = require('../common');
const {addNewTechPicksToGitHub} = require('../services/techpicks');
const telegram = require('../services/telegram');

const router = express.Router();

function assertMessageIsFromTechPicksChannel(event) {
  if (!telegram.isEventIsAChannelMessage(event)) {
    const error = new Error('Not a channel message');
    error.additionalData = {event};
    throw error;
  }

  if (telegram.getChannelName(event) !== config.telegram.channelName) {
    const error = new Error(`Not from ${config.telegram.channelName} channel, odd :|`);
    error.additionalData = {event};
    throw error;
  }
}

// Using the bot token as the path to make sure it's from telegram.
// As recommended here: https://core.telegram.org/bots/faq#how-can-i-make-sure-that-webhook-requests-are-coming-from-telegram
router.post(`/${config.telegram.token}`, async (req, res) => {
  try {
    assertMessageIsFromTechPicksChannel(req.body);
  } catch (e) {
    console.error(e, e.additionalData);
    // I think (I'm not sure) that if we return an error telegram will try to resend the event
    // And we don't want to get the event again because it's not belong here
    res.send({});
    return;
  }

  const {content, date} = telegram.getChannelMessage(req.body);

  console.log('new channel message', {content, date});

  if (!TECH_PICKS_REGEX.test(content)) {
    console.error('Not a valid TechPicks message', {requestBody: req.body, content});
    res.json({});
    return;
  }

  try {
    await addNewTechPicksToGitHub({content, timestamp: date});
  } catch (e) {
    console.error('Some error happened while trying to create a new TechPicks update in GitHub', {
      requestBody: req.body,
      content
    }, e);

    // I think (I'm not sure) that if we return an error telegram will try to resend the event
    res.status(500).json({});
    return;
  }

  res.json({});
});

module.exports = router;
