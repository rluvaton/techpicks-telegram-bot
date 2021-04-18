const util = require('util');
const config = require('./config');
const telegram = require('./services/telegram');
const {createGist} = require('./services/github');

async function fallbackToGitHubGist(message) {
    console.log('Message is to big, fallback to github gist');

    const gistData = await createGist({
        'error.md': message,
    }, `Error for in TechPicks Telegram Bot at ${new Date()}`);

    const path = gistData.html_url;
    return `The error message is too big ${message.length}, so sending a link to GitHub Gist instead\n` +
        `Link: ${path}`;
}

async function notifyUser(...args) {
    console.log('Try notifying user on error.');

    let message = '```json\n' +
        // This will format similar to console.error(...) format
        util.format('', ...args) +
        '```';
    let isMarkdown = true

    if (message.length > telegram.MAX_MESSAGE_LENGTH) {
        try {
            message = await fallbackToGitHubGist(message);
        } catch (e) {
            console.error('There was an error creating a GitHub Gist with the error', {message}, e);

            console.log('Fallback to just notifying that there is an error');
            message = `There is an error in the TechPicks Telegram Bot, and we couldn't create GitHub Gist either...`
        }
        isMarkdown = false;
    }

    let result;
    try {
        result = await telegram.sendMessage(config.telegram.notifyChatId, message, isMarkdown);
    } catch (e) {
        console.error('Failed notifying user on error', e);
        return;
    }

    console.log('User has been notified about the error via telegram.', {result});
}

async function error(...args) {
    console.error(...args);

    await notifyUser(...args);
}

module.exports = error;
