const isEventIsAChannelMessage = (telegramReq) => telegramReq?.channel_post?.chat?.type === 'channel';

const getChannelName = (telegramReq) => telegramReq?.channel_post?.chat?.title;

const getChannelMessage = (telegramReq) => ({
    content: telegramReq.channel_post.text,
    date: telegramReq.channel_post.date,
});

module.exports = {
    isEventIsAChannelMessage,
    getChannelName,
    getChannelMessage
}
