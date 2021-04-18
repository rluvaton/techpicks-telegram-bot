const axios = require('axios');
const config = require('../config');

const isEventIsAChannelMessage = (telegramReq) => telegramReq?.channel_post?.chat?.type === 'channel';

const getChannelName = (telegramReq) => telegramReq?.channel_post?.chat?.title;

const getChannelMessage = (telegramReq) => ({
    content: telegramReq.channel_post.text,
    date: telegramReq.channel_post.date,
});

const sendMessage = async (chatId, message, isMarkdown) => {
    let result;

    try {
        result = await axios.post(`https://api.telegram.org/bot${config.telegram.token}/sendMessage`, null, {
            params: {
                chat_id: chatId,
                text: message,
                parse_mode: isMarkdown ? 'MarkdownV2' : undefined
            }
        });
        result = result.data;
    } catch (e) {
        throw e;
    }

    if (!result.ok) {
        const error = new Error('Failed sending message (got result.ok false)');
        error.result = result;

        console.error(error, error.result);

        throw error;
    }

    return result.result;
};

module.exports = {
    isEventIsAChannelMessage,
    getChannelName,
    getChannelMessage,
    sendMessage,
    MAX_MESSAGE_LENGTH: 4096,
}
