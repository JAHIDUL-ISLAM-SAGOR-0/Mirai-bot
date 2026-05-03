module.exports.config = {
  name: "leave",
  eventType: ["log:unsubscribe"],
  version: "6.0.0",
  credits: "SaGor",
  description: "Leave notification with correct kick/self detect"
};

module.exports.run = async function ({ api, event, Users }) {
  try {
    const { threadID } = event;
    const leftID = event.logMessageData.leftParticipantFbId;
    const authorID = event.author;

    if (leftID == api.getCurrentUserID()) return;

    const name =
      global.data.userName.get(leftID) ||
      await Users.getNameUser(leftID);

    let type = "";
    let adminName = "";

    if (leftID == authorID) {
      type = "Left by self";
    } else {
      type = "Kicked by admin";
      adminName =
        global.data.userName.get(authorID) ||
        await Users.getNameUser(authorID);
    }

    const time = new Date().toLocaleTimeString("en-IN", {
      timeZone: "Asia/Dhaka"
    });

    const messageText =
`╭━━━〔 🚪 MEMBER LEFT 〕━━━╮
┃ 👤 Name: ${name}
┃ 🆔 UID: ${leftID}
┃ 📝 Type: ${type}
${adminName ? `┃ 👮 Admin: ${adminName}\n` : ""}┃ 🕒 Time: ${time}
╰━━━━━━━━━━━━━━━━━━╯`;

    return api.shareContact(messageText, leftID, threadID, (err, info) => {
      if (err) return console.log(err);
      setTimeout(() => api.unsendMessage(info.messageID), 20000);
    });

  } catch (err) {
    console.log("LEAVE ERROR:", err);
  }
};
