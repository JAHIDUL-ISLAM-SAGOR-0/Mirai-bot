module.exports = function ({ api, models, Users, Threads, Currencies }) {
    return function ({ event }) {
        try {
            if (!event.messageReply) return;
            const { handleReply, commands } = global.client;
            const { messageID, threadID, messageReply } = event;
            if (!handleReply || handleReply.length === 0) return;

            const indexOfHandle = handleReply.findIndex(e => e.messageID == messageReply.messageID);
            if (indexOfHandle < 0) return;

            const indexOfMessage = handleReply[indexOfHandle];
            const handleNeedExec = commands.get(indexOfMessage.name);

            if (!handleNeedExec || typeof handleNeedExec.handleReply !== 'function') {
                return api.sendMessage(global.getText('handleReply', 'missingValue'), threadID, messageID);
            }

            let getText2 = () => {};
            if (handleNeedExec.languages && typeof handleNeedExec.languages == 'object') {
                getText2 = (...value) => {
                    const lang = handleNeedExec.languages[global.config.language];
                    if (!lang) return '';
                    var text = lang[value[0]] || '';
                    for (var i = value.length - 1; i >= 1; i--) {
                        text = text.replace(new RegExp('%' + i, 'g'), value[i]);
                    }
                    return text;
                };
            }

            try {
                handleNeedExec.handleReply({ api, event, models, Users, Threads, Currencies, handleReply: indexOfMessage, getText: getText2 });
            } catch (error) {
                return api.sendMessage(global.getText('handleReply', 'executeError', error), threadID, messageID);
            }
        } catch (outerErr) {
            require("../../utils/log.js")(`handleReply fatal: ${outerErr.message}`, 'error');
        }
    };
};
