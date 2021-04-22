const axios = require('axios');
const config = require('../config');

const isEventIsAChannelMessage = (telegramReq) => telegramReq?.channel_post?.chat?.type === 'channel';

const isEventIsAChannelEditedMessage = (telegramReq) => telegramReq?.edited_channel_post?.chat?.type === 'channel';

const getChannelName = (telegramReq, editedPost = false) => {
    const channelPost = editedPost ? telegramReq?.edited_channel_post : telegramReq?.channel_post;

    return channelPost?.chat?.title;
};

const getChannelMessage = (telegramReq, editedPost = false) => {
    const channelPost = editedPost ? telegramReq.edited_channel_post : telegramReq.channel_post;

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
    getChannelName,
    getChannelMessage,
    sendMessage,
    MAX_MESSAGE_LENGTH: 4096,
}
