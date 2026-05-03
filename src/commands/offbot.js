module.exports.config = {
    name: "offbot",
    version: "1.0.1",
    hasPermssion: 2,
    credits: "SaGor",
    description: "Turn the bot off (admin only)",
    commandCategory: "system",
    cooldowns: 0
};

module.exports.run = ({ event, api }) => {
    const ADMINBOT = global.config.ADMINBOT || [];
    const NDH = global.config.NDH || [];
    // FIX: Use global config arrays instead of hardcoded ID
    if (!ADMINBOT.includes(event.senderID) && !NDH.includes(event.senderID)) {
        return api.sendMessage("[ ERR ] You don't have permission to use this command.", event.threadID, event.messageID);
    }
    // FIX: exit(2) so index.js watchdog restarts the bot process (exit 0 = intentional stop with no restart)
    api.sendMessage(`[ OK ] ${global.config.BOTNAME} Bot is restarting...`, event.threadID, () => setTimeout(() => process.exit(2), 500));
};