module.exports = function ({ Users, Threads, Currencies }) {
    const logger = require("../../utils/log.js");

    return async function ({ event }) {
        try {
            const { allUserID, allCurrenciesID, allThreadID, userName, threadInfo } = global.data;
            const { autoCreateDB } = global.config;
            if (autoCreateDB == false) return;

            var { senderID, threadID } = event;
            senderID = String(senderID);
            threadID = String(threadID);

            if (!allThreadID.includes(threadID) && event.isGroup == true) {
                try {
                    const threadIn4 = await Threads.getInfo(threadID);
                    if (!threadIn4) throw new Error("No thread info returned");

                    const dataThread = {
                        threadName: threadIn4.threadName,
                        adminIDs: threadIn4.adminIDs || [],
                        nicknames: threadIn4.nicknames || {}
                    };

                    allThreadID.push(threadID);
                    threadInfo.set(threadID, dataThread);
                    await Threads.setData(threadID, { threadInfo: dataThread, data: {} });

                    // FIX: `for (singleData of ...)` → `for (const singleData of ...)`  (global leak bug)
                    if (Array.isArray(threadIn4.userInfo)) {
                        for (const singleData of threadIn4.userInfo) {
                            try {
                                userName.set(String(singleData.id), singleData.name);
                                const uid = String(singleData.id);
                                if (allUserID.includes(uid)) {
                                    await Users.setData(uid, { name: singleData.name });
                                } else {
                                    await Users.createData(uid, { name: singleData.name, data: {} });
                                    allUserID.push(uid);
                                    logger(global.getText('handleCreateDatabase', 'newUser', uid), '[ DATABASE ]');
                                }
                            } catch (userErr) {
                                logger(`User DB error (${singleData.id}): ${userErr.message}`, 'error');
                            }
                        }
                    }

                    logger(global.getText('handleCreateDatabase', 'newThread', threadID), '[ DATABASE ]');
                } catch (threadErr) {
                    logger(`Thread DB error (${threadID}): ${threadErr.message}`, 'error');
                }
            }

            // FIX: user info null safety
            if (!allUserID.includes(senderID) || !userName.has(senderID)) {
                try {
                    const infoUsers = await Users.getInfo(senderID);
                    if (infoUsers && infoUsers.name) {
                        await Users.createData(senderID, { name: infoUsers.name });
                        allUserID.push(senderID);
                        userName.set(senderID, infoUsers.name);
                        logger(global.getText('handleCreateDatabase', 'newUser', senderID), '[ DATABASE ]');
                    }
                } catch (userErr) {
                    logger(`User info error (${senderID}): ${userErr.message}`, 'error');
                }
            }

            if (!allCurrenciesID.includes(senderID)) {
                try {
                    await Currencies.createData(senderID, { data: {} });
                    allCurrenciesID.push(senderID);
                } catch (_) {}
            }

        } catch (outerErr) {
            logger(`handleCreateDatabase fatal: ${outerErr.message}`, 'error');
        }
    };
};
