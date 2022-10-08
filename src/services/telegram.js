const axios = require('axios');
const config = require('../config');

const isEventIsAChannelMessage = (telegramReq) => telegramReq?.channel_post?.chat?.type === 'channel';

const isEventIsAChannelEditedMessage = (telegramReq) => telegramReq?.edited_channel_post?.chat?.type === 'channel';

const getChannelPostFromReq = (event) => {
    const isEditedChannelPost = isEventIsAChannelEditedMessage(event)
    return isEditedChannelPost ? event?.edited_channel_post : event?.channel_post;
};

const getChannelID = (telegramReq) => getChannelPostFromReq(telegramReq)?.chat?.id;

const getChannelName = (telegramReq) => getChannelPostFromReq(telegramReq)?.chat?.title;

const getChannelMessage = (telegramReq) => {
    const channelPost = getChannelPostFromReq(telegramReq);

    return {
        content: channelPost.text,
        date: channelPost.date,
    };
};

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
    isEventIsAChannelEditedMessage,
    getChannelID,
    getChannelName,
    getChannelMessage,
    sendMessage,
    MAX_MESSAGE_LENGTH: 4096,
}
