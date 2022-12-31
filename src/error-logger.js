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
    if(config.disableErrorNotification) {
        console.log('Error notification is disabled');

        return;
    }
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
        console.error('Failed notifying user on error', trimError(e));
        return;
    }

    console.log('User has been notified about the error via telegram.', {result});
}

async function error(...args) {
    console.error(...args);

    const formattedArgs = args.map(arg => {
        if (!(arg instanceof Error)) {
            return arg;
        }

        return trimError(arg);
    })

    await notifyUser(...formattedArgs);
}

function trimError(error) {
    const trimmedError = trimUnknownError(error);

    if (error.isAxiosError) {
        return trimAxiosError(trimmedError, error);
    }

    return trimmedError;
}

function trimUnknownError(error) {
    const trimmedError = new Error(error.message);
    trimmedError.stack = error.stack;
    trimmedError.isTrimmed = true;
    return trimmedError;
}

function trimAxiosError(trimmedError, axiosError) {
    trimmedError.isAxiosError = true;

    trimmedError.response = {
        status: axiosError.response.status,
        statusText: axiosError.response.statusText,
        headers: axiosError.response.headers,
        data: axiosError.response.data
    };

    trimmedError.config = {
        url: axiosError.config.url,
        method: axiosError.config.method,
        headers: axiosError.config.headers,
    };

    return trimmedError;
}

module.exports = error;
