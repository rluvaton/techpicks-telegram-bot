module.exports = {
    github: {
        token: process.env.GITHUB_TOKEN,

        owner: process.env.GITHUB_REPO_OWNER,
        repo: process.env.GITHUB_REPO_NAME,
        branch: process.env.GITHUB_REPO_BRANCH,
        label: process.env.GITHUB_PR_LABEL,
        filePrefixPath: process.env.GITHUB_REPO_PREFIX_PATH || '',

    },
    telegram: {
        token: process.env.TELEGRAM_BOT_TOKEN,
        notifyChatId: process.env.TELEGRAM_NOTIFY_CHAT_ID,
        channelId: parseInt(process.env.TELEGRAM_CHANNEL_ID, 10),
    }
};
