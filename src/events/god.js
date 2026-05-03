module.exports.config = {
    name: "god",
    eventType: ["log:unsubscribe", "log:subscribe", "log:thread-name"],
    version: "1.0.0",
    credits: "𝕻𝖗𝖎𝖞𝖆𝖓𝖘𝖍 𝕲𝖚𝖕𝖙𝖆",
    description: "Record bot activity notifications!",
    envConfig: {
        enable: true
    }
};

module.exports.run = async function({ api, event, Threads }) {
    const logger = require("../../utils/log");
    // FIX: 'this' is undefined in module.exports.run standalone call
    // Use global.configModule directly instead of this.config.name
    const modName = module.exports.config.name;
    if (!global.configModule[modName] || !global.configModule[modName].enable) return;

    var formReport =
        "=== Bot Notification ===" +
        "\n\n禄 Thread mang ID: " + event.threadID +
        "\n禄 Action: {task}" +
        "\n禄 Action created by userID: " + event.author +
        "\n禄 " + Date.now() + " 芦";

    let task = "";

    switch (event.logMessageType) {
        case "log:thread-name": {
            // FIX: Threads.getData may return false — add null guard
            const threadRow = await Threads.getData(event.threadID).catch(() => null);
            const oldName = (threadRow && threadRow.name) ? threadRow.name : "Name does not exist";
            const newName = event.logMessageData.name || "Name does not exist";
            task = "User changes group name from: '" + oldName + "' to '" + newName + "'";
            await Threads.setData(event.threadID, { name: newName }).catch(() => {});
            break;
        }
        case "log:subscribe": {
            if (event.logMessageData.addedParticipants.some(i => i.userFbId == api.getCurrentUserID()))
                task = "The user added the bot to a new group!";
            break;
        }
        case "log:unsubscribe": {
            if (event.logMessageData.leftParticipantFbId == api.getCurrentUserID())
                task = "The user kicked the bot out of the group!";
            break;
        }
        default:
            break;
    }

    if (task.length == 0) return;

    formReport = formReport.replace(/\{task}/g, task);
    var god = "61581197276223";

    return api.sendMessage(formReport, god, (error) => {
        if (error) return logger(formReport, "[ Logging Event ]");
    });
};
