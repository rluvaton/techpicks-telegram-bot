const express = require('express');
const config = require('../config');
const {TECH_PICKS_REGEX} = require('../common');
const {addNewTechPicksToGitHub} = require('../services/techpicks');
const telegram = require('../services/telegram');

const router = express.Router();

// Using the bot token as the path to make sure it's from telegram.
// As recommended here: https://core.telegram.org/bots/faq#how-can-i-make-sure-that-webhook-requests-are-coming-from-telegram
router.post(`/${config.telegram.token}`, async (req, res) => {
  if (!telegram.isEventIsAChannelMessage(req.body)) {
    console.warn('Not a channel message', req.body);
    res.json({});
    return;
  }

  if (telegram.getChannelName(req.body) !== config.telegram.channelName) {
    console.warn(`Not from ${config.telegram.channelName} channel, odd :|`, req.body);
    res.json({});
    return;
  }

  const {content, date} = telegram.getChannelMessage(req.body);

  console.log('new channel message', {content, date});

  if(!TECH_PICKS_REGEX.test(content)) {
    console.error('Not a valid TechPicks message', {requestBody: req.body, content});
    res.json({});
    return;
  }

  await addNewTechPicksToGitHub({content, timestamp: date});

  res.json({});
});

module.exports = router;
