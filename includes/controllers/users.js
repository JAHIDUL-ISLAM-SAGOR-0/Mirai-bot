module.exports = function ({ models, api }) {
    const Users = models.use('Users');

    async function getInfo(id) {
        //  FIX: null safety for getUserInfo response
        try {
            const result = await api.getUserInfo(id);
            return result ? result[id] : null;
        } catch (err) {
            console.error(`getInfo error (${id}):`, err.message);
            return null;
        }
    }

    async function getNameUser(id) {
        try {
            if (global.data.userName.has(id)) return global.data.userName.get(id);
            if (global.data.allUserID.includes(id)) {
                //  FIX: 'this.getData' does not work in standalone function → use getData directly
                const row = await getData(id);
                if (row && row.name) return row.name;
            }
            return "Facebook users";
        } catch {
            return "Facebook users";
        }
    }

    async function getAll(...data) {
        var where, attributes;
        for (const i of data) {
            if (typeof i != 'object') throw global.getText("users", "needObjectOrArray");
            if (Array.isArray(i)) attributes = i;
            else where = i;
        }
        try {
            return (await Users.findAll({ where, attributes })).map(e => e.get({ plain: true }));
        } catch (error) {
            console.error(error);
            throw new Error(error);
        }
    }

    async function getData(userID) {
        try {
            const data = await Users.findOne({ where: { userID } });
            if (data) return data.get({ plain: true });
            return false;
        } catch (error) {
            console.error(error);
            throw new Error(error);
        }
    }

    async function setData(userID, options = {}) {
        if (typeof options != 'object' && !Array.isArray(options)) throw global.getText("users", "needObject");
        try {
            const row = await Users.findOne({ where: { userID } });
            // FIX: null check before .update() — was crashing if user not found
            if (row) {
                await row.update(options);
            } else {
                await createData(userID, options);
            }
            return true;
        } catch (error) {
            console.error(error);
            throw new Error(error);
        }
    }

    async function delData(userID) {
        try {
            const row = await Users.findOne({ where: { userID } });
            //  FIX: null check before .destroy()
            if (row) await row.destroy();
            return true;
        } catch (error) {
            console.error(error);
            throw new Error(error);
        }
    }

    async function createData(userID, defaults = {}) {
        if (typeof defaults != 'object' && !Array.isArray(defaults)) throw global.getText("users", "needObject");
        try {
            await Users.findOrCreate({ where: { userID }, defaults });
            return true;
        } catch (error) {
            console.error(error);
            throw new Error(error);
        }
    }

    return { getInfo, getNameUser, getAll, getData, setData, delData, createData };
};
