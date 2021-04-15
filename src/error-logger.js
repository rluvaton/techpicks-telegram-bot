const config = require('./config');
const telegram = require('./services/telegram');
const util = require('util');

async function error(...args) {
    console.error(...args);

    console.log('Try notifying user on error.');

    const markdownMessage = '```json\n' +
        // This will format similar to console.error(...) format
        util.format('', ...args) +
        '```';

    let result;
    try {
        result = await telegram.sendMessage(config.telegram.notifyChatId, markdownMessage, true);
    } catch (e) {
        console.error('Failed notifying user on error', e);
        return;
    }

    console.log('User has been notified about the error via telegram.', {result});
}

module.exports = error;
