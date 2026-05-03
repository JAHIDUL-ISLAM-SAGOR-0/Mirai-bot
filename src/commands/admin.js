const fs = require("fs-extra");

function systemBox(title, text) {
 return `╭─── ${title} ───╮\n\n${text}\n\n╰─────────────────╯`;
}

const ADMIN_BOX = (text) => systemBox("🎀 〔 ADMIN SYSTEM 〕", text);
const SECURITY_BOX = (text) => systemBox("🔥 〔 SECURITY MODE 〕", text);
const BOT_BOX = (text) => systemBox("🤖 〔 BOT STATUS 〕", text);

module.exports.config = {
 name: "admin",
 version: "1.0.0",
 hasPermssion: 0,
 credits: "SaGor",
 description: "Admin manager",
 commandCategory: "Admin",
 usages: "admin [list/add/remove]",
 cooldowns: 3
};

module.exports.run = async function ({
 api,
 event,
 args,
 Users,
 permssion
}) {
 try {
 const { threadID, messageID, mentions } = event;
 const configPath = global.client.configPath;

 delete require.cache[require.resolve(configPath)];
 const config = require(configPath);

 config.ADMINBOT = Array.isArray(config.ADMINBOT) ? config.ADMINBOT.map(String) : [];

 const saveConfig = () => {
 fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
 global.config.ADMINBOT = [...config.ADMINBOT];
 };

 const getTargetIDs = () => {
 const mentionIDs = Object.keys(mentions || {}).map(String);
 if (mentionIDs.length) return mentionIDs;
 if (event.messageReply) return [String(event.messageReply.senderID)];
 return [];
 };

 const getUserName = async (id) => {
 try {
 const user = await Users.getData(String(id));
 return user?.name || String(id);
 } catch {
 return String(id);
 }
 };

 if (!args[0]) {
 return api.sendMessage(
 ADMIN_BOX(
`ADMIN COMMANDS

• admin list
• admin add @tag / reply
• admin remove @tag / reply`
 ),
 threadID,
 messageID
 );
 }

 switch (args[0].toLowerCase()) {
 case "list": {
 let adminText = "";

 for (const id of config.ADMINBOT) {
 const name = await getUserName(id);
 adminText += `• ${name} (${id})\n`;
 }

 return api.sendMessage(
 BOT_BOX(
 "👑 ADMINS\n" + (adminText || "None")
 ),
 threadID,
 messageID
 );
 }

 case "add": {
 if (permssion !== 3) {
 return api.sendMessage(
 SECURITY_BOX("Permission Denied ❌"),
 threadID,
 messageID
 );
 }

 const ids = getTargetIDs();

 if (!ids.length) {
 return api.sendMessage(
 BOT_BOX("Tag or reply to a user first ⚠️"),
 threadID,
 messageID
 );
 }

 let count = 0;

 for (const id of ids) {
 if (!config.ADMINBOT.includes(id)) {
 config.ADMINBOT.push(id);
 count++;
 }
 }

 saveConfig();

 return api.sendMessage(
 ADMIN_BOX(`Successfully added ${count} Admin(s) ✅`),
 threadID,
 messageID
 );
 }

 case "remove": {
 if (permssion !== 3) {
 return api.sendMessage(
 SECURITY_BOX("Permission Denied ❌"),
 threadID,
 messageID
 );
 }

 const ids = getTargetIDs();

 if (!ids.length) {
 return api.sendMessage(
 BOT_BOX("Tag or reply to a user first ⚠️"),
 threadID,
 messageID
 );
 }

 let count = 0;

 for (const id of ids) {
 const index = config.ADMINBOT.indexOf(id);
 if (index !== -1) {
 config.ADMINBOT.splice(index, 1);
 count++;
 }
 }

 saveConfig();

 return api.sendMessage(
 ADMIN_BOX(`Successfully removed ${count} Admin(s) ❌`),
 threadID,
 messageID
 );
 }

 default:
 return api.sendMessage(
 BOT_BOX("Invalid Admin Command ❌"),
 threadID,
 messageID
 );
 }
 } catch (e) {
 console.error("admin command error:", e);
 return api.sendMessage(
 BOT_BOX(`Unexpected error: ${e.message || e}`),
 event.threadID,
 event.messageID
 );
 }
};
