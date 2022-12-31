module.exports = {
    disableErrorNotification: process.env.DISABLE_ERROR_NOTIFICATION === 'true',
    logger: {
        prettyPrint: process.env.PRETTY_PRINT === 'true'
    },
    server: {
        port: parseInt(process.env.PORT ?? '3000', 10)
    },
    github: {
        appId: process.env.GITHUB_APP_ID,
        appPrivateKey: process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        appInstallationId: process.env.GITHUB_APP_INSTALLATION_ID,

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
