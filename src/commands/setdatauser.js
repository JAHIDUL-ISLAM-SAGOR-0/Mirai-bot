module.exports.config = {
    name: "setdatauser",
    version: "1.0",
    hasPermssion: 2,
    credits: "D-Jukie",
    description: "Add the new user data to the database.",
    commandCategory: "System",
    usages: "",
    cooldowns: 5,
};


module.exports.run = async function ({ Users, event, args, api, Threads }) { 
    const permission = ["61581197276223"];
  if (!permission.includes(event.senderID)) return api.sendMessage("Border rights?", event.threadID, event.messageID);
    const { threadID, logMessageData } = event;
    const { setData, getData } = Users;
    // FIX: null-safe fallback before destructuring
    const threadIn4 = await Threads.getInfo(threadID).catch(() => null) || await api.getThreadInfo(threadID).catch(() => null);
    if (!threadIn4 || !Array.isArray(threadIn4.participantIDs)) return api.sendMessage("Failed to get thread info.", threadID);
    var { participantIDs } = threadIn4;
    for (const id of participantIDs) {
    console.log(`The ID data has been updated.: ${id}`)
    let data = await api.getUserInfo(id);
    data.name
    let userName = data[id].name
    await Users.setData(id, { name: userName, data: {} });
}
    console.log(`The data for the user ${participantIDs.length} in the group has been updated.`)
    return api.sendMessage(`The data for the members in the box has been updated.`, threadID)
}