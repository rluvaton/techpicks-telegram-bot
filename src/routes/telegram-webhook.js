const express = require('express');
const config = require('../config');
const {TECH_PICKS_REGEX} = require('../common');
const {addNewTechPicksToGitHub} = require('../services/github');

const router = express.Router();

const isEventIsAChannelMessage = (telegramReq) => telegramReq?.channel_post?.chat?.type === 'channel';
const getChannelName = (telegramReq) => telegramReq?.channel_post?.chat?.title;
const getChannelMessage = (telegramReq) => {
  return {
    content: telegramReq.channel_post.text,
    date: telegramReq.channel_post.date,
  };
}

// Using the bot token as the path to make sure it's from telegram.
// As recommended here: https://core.telegram.org/bots/faq#how-can-i-make-sure-that-webhook-requests-are-coming-from-telegram
router.post(`/${config.telegram.token}`, async (req, res, next) => {
  if(!isEventIsAChannelMessage(req.body)) {
    console.warn('Not a channel message', req.body);
    res.json({});
    return;
  }

  console.log(config);

  if(getChannelName(req.body) !== config.telegram.channelName) {
    console.warn(`Not from ${config.telegram.channelName} channel, odd :|`, req.body);
    res.json({});
    return;
  }

  const {content, date} = getChannelMessage(req.body);

  console.log('new channel message', {content, date});

  if(!TECH_PICKS_REGEX.test(content)) {
    // Reset the regex so if we run again it'll produce the same results
    TECH_PICKS_REGEX.lastIndex = undefined;

    console.error('Not a valid TechPicks message', {requestBody: req.body, content});
    res.json({});
    return;
  }

  // Reset the regex so if we run again it'll produce the same results
  TECH_PICKS_REGEX.lastIndex = undefined;

  await addNewTechPicksToGitHub({content, timestamp: date});

  res.json({});
});

module.exports = router;
