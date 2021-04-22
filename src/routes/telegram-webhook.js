const express = require('express');
const config = require('../config');
const {TECH_PICKS_REGEX} = require('../common');
const {addNewTechPicksToGitHub} = require('../services/techpicks');
const telegram = require('../services/telegram');
const error = require('../error-logger');

const router = express.Router();

function assertMessageIsFromTechPicksChannel(event) {
    if (!telegram.isEventIsAChannelMessage(event) && !telegram.isEventIsAChannelEditedMessage(event)) {
        const error = new Error('Not a channel message');
        error.additionalData = {event};
        throw error;
    }

    const isEditedChannelPost = telegram.isEventIsAChannelEditedMessage(event);

    if (telegram.getChannelName(event, isEditedChannelPost) !== config.telegram.channelName) {
        const error = new Error(`Not from ${config.telegram.channelName} channel, odd :|`);
        error.additionalData = {event};
        throw error;
    }
}

// Using the bot token as the path to make sure it's from telegram.
// As recommended here: https://core.telegram.org/bots/faq#how-can-i-make-sure-that-webhook-requests-are-coming-from-telegram
router.post(`/${config.telegram.token}`, async (req, res) => {
    const event = req.body;

    try {
        assertMessageIsFromTechPicksChannel(event);
    } catch (e) {
        // We don't wait for the result because we don't need to do this before we respond to the client
        // noinspection ES6MissingAwait
        error(e, e.additionalData);

        // I think (I'm not sure) that if we return an error telegram will try to resend the event
        // And we don't want to get the event again because it's not belong here
        res.send({});
        return;
    }

    const isEditedChannelPost = telegram.isEventIsAChannelEditedMessage(event);

    const {content, date} = telegram.getChannelMessage(event, isEditedChannelPost);

    console.log('new channel message', {content, date});

    if (!TECH_PICKS_REGEX.test(content)) {
        // We don't wait for the result because we don't need to do this before we respond to the client
        // noinspection ES6MissingAwait
        error('Not a valid TechPicks message', {requestBody: req.body, content});
        res.json({});
        return;
    }

    try {
        await addNewTechPicksToGitHub({content, timestamp: date});
    } catch (e) {
        // We don't wait for the result because we don't need to do this before we respond to the client
        // noinspection ES6MissingAwait
        error('Some error happened while trying to create a new TechPicks update in GitHub', {
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
