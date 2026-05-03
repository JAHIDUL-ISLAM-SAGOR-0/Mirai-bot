const moment = require("moment-timezone");
const { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } = require("fs-extra");
const { join, resolve } = require("path");
const { execSync } = require('child_process');
const logger = require("./utils/log.js");
const login = require("sagor-fca");
const axios = require("axios");
const listPackage = JSON.parse(readFileSync('./package.json')).dependencies;
const listbuiltinModules = require("module").builtinModules;

/* ========================== CLIENT INIT ========================== */

global.client = new Object({
    commands: new Map(),
    events: new Map(),
    cooldowns: new Map(),
    eventRegistered: new Array(),
    handleSchedule: new Array(),
    handleReaction: new Array(),
    handleReply: new Array(),
    mainPath: process.cwd(),
    configPath: new String(),
    getTime: function (option) {
        switch (option) {
            case "seconds":  return `${moment.tz("Asia/Dhaka").format("ss")}`;
            case "minutes":  return `${moment.tz("Asia/Dhaka").format("mm")}`;
            case "hours":    return `${moment.tz("Asia/Dhaka").format("HH")}`;
            case "date":     return `${moment.tz("Asia/Dhaka").format("DD")}`;
            case "month":    return `${moment.tz("Asia/Dhaka").format("MM")}`;
            case "year":     return `${moment.tz("Asia/Dhaka").format("YYYY")}`;
            case "fullHour": return `${moment.tz("Asia/Dhaka").format("HH:mm:ss")}`;
            case "fullYear": return `${moment.tz("Asia/Dhaka").format("DD/MM/YYYY")}`;
            case "fullTime": return `${moment.tz("Asia/Dhaka").format("HH:mm:ss DD/MM/YYYY")}`;
        }
    }
});

global.data = new Object({
    threadInfo:    new Map(),
    threadData:    new Map(),
    userName:      new Map(),
    userBanned:    new Map(),
    threadBanned:  new Map(),
    commandBanned: new Map(),
    threadAllowNSFW: new Array(),
    allUserID:     new Array(),
    allCurrenciesID: new Array(),
    allThreadID:   new Array()
});

global.utils       = require("./utils");
global.nodemodule  = new Object();
global.config      = new Object();
global.configModule = new Object();
global.moduleData  = new Array();
global.language    = new Object();

/* ========================== CONFIG LOAD ========================== */

var configValue;
try {
    global.client.configPath = join(global.client.mainPath, "config.json");
    configValue = require(global.client.configPath);
    logger.loader("Found file config: config.json");
} catch {
    const tempPath = global.client.configPath.replace(/\.json/g, "") + ".temp";
    if (existsSync(tempPath)) {
        configValue = JSON.parse(readFileSync(tempPath));
        logger.loader(`Found: ${tempPath}`);
    } else {
        return logger.loader("config.json not found!", "error");
    }
}

try {
    for (const key in configValue) global.config[key] = configValue[key];
    logger.loader("Config loaded successfully!");
} catch { return logger.loader("Cannot load config file!", "error"); }

const { Sequelize, sequelize } = require("./includes/database");

writeFileSync(global.client.configPath + ".temp", JSON.stringify(global.config, null, 4), 'utf8');

/* ========================== LANGUAGE ========================== */

const langFile = (readFileSync(`${__dirname}/includes/languages/${global.config.language || "en"}.lang`, { encoding: 'utf-8' })).split(/\r?\n|\r/);
const langData  = langFile.filter(item => item.indexOf('#') !== 0 && item !== '');
for (const item of langData) {
    const getSeparator = item.indexOf('=');
    const itemKey   = item.slice(0, getSeparator);
    const itemValue = item.slice(getSeparator + 1, item.length);
    const head  = itemKey.slice(0, itemKey.indexOf('.'));
    const key   = itemKey.replace(head + '.', '');
    const value = itemValue.replace(/\\n/gi, '\n');
    if (typeof global.language[head] === "undefined") global.language[head] = new Object();
    global.language[head][key] = value;
}

global.getText = function (...args) {
    const langText = global.language;
    if (!langText.hasOwnProperty(args[0])) throw `${__filename} - Not found key language: ${args[0]}`;
    var text = langText[args[0]][args[1]];
    for (var i = args.length - 1; i > 0; i--) {
        const regEx = RegExp(`%${i}`, 'g');
        text = text.replace(regEx, args[i + 1]);
    }
    return text;
};

try {
    var appStateFile = resolve(join(global.client.mainPath, global.config.APPSTATEPATH || "appstate.json"));
    var appState = require(appStateFile);
    logger.loader(global.getText("mirai", "foundPathAppstate"));
} catch { return logger.loader(global.getText("mirai", "notFoundPathAppstate"), "error"); }

/* ========================== MODULE LOADER ========================== */

function loadModule(modulePath, moduleName) {
    try {
        var mod = require(modulePath);
        if (!mod.config || !mod.run || !mod.config.commandCategory)
            throw new Error(global.getText('mirai', 'errorFormat'));
        if (global.client.commands.has(mod.config.name || ''))
            throw new Error(global.getText('mirai', 'nameExist'));
        if (!mod.languages || typeof mod.languages !== 'object' || Object.keys(mod.languages).length === 0)
            logger.loader(global.getText('mirai', 'notFoundLanguage', mod.config.name), 'warn');

        if (mod.config.dependencies && typeof mod.config.dependencies === 'object') {
            for (const reqDep in mod.config.dependencies) {
                const reqDepPath = join(__dirname, 'nodemodules', 'node_modules', reqDep);
                try {
                    if (!global.nodemodule.hasOwnProperty(reqDep)) {
                        if (listPackage.hasOwnProperty(reqDep) || listbuiltinModules.includes(reqDep))
                            global.nodemodule[reqDep] = require(reqDep);
                        else global.nodemodule[reqDep] = require(reqDepPath);
                    }
                } catch {
                    logger.loader(global.getText('mirai', 'notFoundPackage', reqDep, mod.config.name), 'warn');
                    try {
                        execSync(
                            'npm --package-lock false --save install ' + reqDep +
                            (mod.config.dependencies[reqDep] === '*' || mod.config.dependencies[reqDep] === ''
                                ? '' : '@' + mod.config.dependencies[reqDep]),
                            { stdio: 'inherit', env: process.env, shell: true, cwd: join(__dirname, 'nodemodules') }
                        );
                        global.nodemodule[reqDep] = listPackage.hasOwnProperty(reqDep) || listbuiltinModules.includes(reqDep)
                            ? require(reqDep) : require(reqDepPath);
                    } catch (installErr) {
                        logger.fail(mod.config.name, `dep install failed: ${reqDep} — ${installErr.message}`);
                        return false;
                    }
                }
            }
        }

        if (mod.config.envConfig) {
            try {
                for (const envConf in mod.config.envConfig) {
                    if (typeof global.configModule[mod.config.name] === 'undefined') global.configModule[mod.config.name] = {};
                    if (typeof global.config[mod.config.name] === 'undefined') global.config[mod.config.name] = {};
                    if (typeof global.config[mod.config.name][envConf] !== 'undefined')
                        global.configModule[mod.config.name][envConf] = global.config[mod.config.name][envConf];
                    else global.configModule[mod.config.name][envConf] = mod.config.envConfig[envConf] || '';
                    if (typeof global.config[mod.config.name][envConf] === 'undefined')
                        global.config[mod.config.name][envConf] = mod.config.envConfig[envConf] || '';
                }
            } catch (error) {
                throw new Error(global.getText('mirai', 'loadedConfig', mod.config.name, JSON.stringify(error)));
            }
        }

        return mod;
    } catch (err) {
        logger.fail(moduleName, String(err));
        return false;
    }
}

/* ========================== BOT MAIN ========================== */

function onBot({ models: botModel }) {
    const loginData = { appState };
    login(loginData, async (loginError, loginApiData) => {
        if (loginError) return logger(JSON.stringify(loginError), `[ ERROR ]`);

        loginApiData.setOptions(global.config.FCAOption);
        writeFileSync(appStateFile, JSON.stringify(loginApiData.getAppState(), null, '\x09'));
        global.client.api     = loginApiData;
        // FIX: Removed hardcoded version overwrite — version is already set in config.json
        global.client.timeStart = Date.now();

        /* ═══════════════════════════════════════
           LOAD COMMANDS  (Green section)
        ═══════════════════════════════════════ */
        logger.section('Loading Commands');

        /* ── autoLoadScripts: fetch & save extra commands/events before loading ── */
        const autoLoadCfg = global.config.autoLoadScripts || {};
        if (autoLoadCfg.enable && autoLoadCfg.url) {
            try {
                const _axios = require("axios");
                logger.loader("autoLoadScripts: fetching script list...");
                const _res = await _axios.get(autoLoadCfg.url, { timeout: 15000 });
                const _scriptList = Array.isArray(_res.data) ? _res.data : [];
                const _ignoreCmds   = (autoLoadCfg.ignoreCmds   || "").split(",").map(s => s.trim()).filter(Boolean);
                const _ignoreEvents = (autoLoadCfg.ignoreEvents || "").split(",").map(s => s.trim()).filter(Boolean);
                for (const _script of _scriptList) {
                    if (!_script.name || !_script.content || !_script.type) continue;
                    if (_script.type === "command" && !_ignoreCmds.includes(_script.name)) {
                        const _dest = join(global.client.mainPath, "src/commands", _script.name + ".js");
                        if (!existsSync(_dest)) {
                            writeFileSync(_dest, _script.content, "utf8");
                            logger.loader("autoLoadScripts: saved command → " + _script.name);
                        }
                    } else if (_script.type === "event" && !_ignoreEvents.includes(_script.name)) {
                        const _dest = join(global.client.mainPath, "src/events", _script.name + ".js");
                        if (!existsSync(_dest)) {
                            writeFileSync(_dest, _script.content, "utf8");
                            logger.loader("autoLoadScripts: saved event → " + _script.name);
                        }
                    }
                }
            } catch (_e) {
                logger.loader("autoLoadScripts fetch failed: " + _e.message, "warn");
            }
        }

        const listCommand = readdirSync(global.client.mainPath + '/src/commands')
            .filter(cmd => cmd.endsWith('.js') && !cmd.includes('example') && !global.config.commandDisabled.includes(cmd));

        let cmdLoaded = 0, cmdFailed = 0;

        for (const command of listCommand) {
            try {
                const mod = loadModule(global.client.mainPath + '/src/commands/' + command, command);
                if (!mod) { cmdFailed++; continue; }

                if (mod.onLoad) {
                    try {
                        mod.onLoad({ api: loginApiData, models: botModel });
                    } catch (onLoadErr) {
                        logger.loader(`onLoad failed for ${mod.config.name}: ${onLoadErr.message}`, 'warn');
                        cmdFailed++;
                        continue;
                    }
                }

                if (mod.handleEvent) global.client.eventRegistered.push(mod.config.name);
                global.client.commands.set(mod.config.name, mod);

                // ✅ GREEN console log for each command
                logger.cmd(mod.config.name);
                cmdLoaded++;
            } catch (error) {
                logger.fail(command, String(error));
                cmdFailed++;
            }
        }

        /* ═══════════════════════════════════════
           LOAD EVENTS  (Orange section)
        ═══════════════════════════════════════ */
        logger.section('Loading Events');

        const eventFiles = readdirSync(global.client.mainPath + '/src/events')
            .filter(ev => ev.endsWith('.js') && !global.config.eventDisabled.includes(ev));

        let evtLoaded = 0, evtFailed = 0;

        for (const ev of eventFiles) {
            try {
                const event = require(global.client.mainPath + '/src/events/' + ev);
                if (!event.config || !event.run) throw new Error(global.getText('mirai', 'errorFormat'));
                if (global.client.events.has(event.config.name)) throw new Error(global.getText('mirai', 'nameExist'));

                if (event.config.dependencies && typeof event.config.dependencies === 'object') {
                    for (const dep in event.config.dependencies) {
                        const depPath = join(__dirname, 'nodemodules', 'node_modules', dep);
                        try {
                            if (!global.nodemodule.hasOwnProperty(dep)) {
                                global.nodemodule[dep] = listPackage.hasOwnProperty(dep) || listbuiltinModules.includes(dep)
                                    ? require(dep) : require(depPath);
                            }
                        } catch {
                            try {
                                execSync('npm --package-lock false --save install ' + dep,
                                    { stdio: 'inherit', env: process.env, shell: true, cwd: join(__dirname, 'nodemodules') });
                                global.nodemodule[dep] = require(dep);
                            } catch (e) {
                                logger.loader(`Event dep install failed: ${dep} (${ev})`, 'warn');
                                continue;
                            }
                        }
                    }
                }

                if (event.onLoad) {
                    try {
                        event.onLoad({ api: loginApiData, models: botModel });
                    } catch (e) {
                        logger.loader(`Event onLoad failed: ${ev}: ${e.message}`, 'warn');
                        evtFailed++;
                        continue;
                    }
                }

                global.client.events.set(event.config.name, event);

                // ✅ ORANGE console log for each event
                logger.event(event.config.name);
                evtLoaded++;
            } catch (error) {
                logger.fail(ev, String(error));
                evtFailed++;
            }
        }

        /* ═══════════════════════════════════════
           STARTUP SUMMARY BANNER
        ═══════════════════════════════════════ */
        logger.summary(
            `${cmdLoaded} ok / ${cmdFailed} failed`,
            `${evtLoaded} ok / ${evtFailed} failed`,
            Date.now() - global.client.timeStart
        );

        writeFileSync(global.client.configPath, JSON.stringify(global.config, null, 4), 'utf8');

        const tempPath = global.client.configPath + '.temp';
        if (existsSync(tempPath)) unlinkSync(tempPath);

        /* ─── Start listener ─── */
        const listenerData = { api: loginApiData, models: botModel };
        const listener     = require('./includes/listen')(listenerData);

        /* ═══════════════════════════════════════
           MQTT ERROR NOTIFICATION
           config: notiWhenListenMqttError.telegram / .discordHook
        ═══════════════════════════════════════ */

        async function sendMqttErrorNotification(errorMsg) {
            const notiCfg = global.config.notiWhenListenMqttError || {};
            const botName = global.config.BOTNAME || "Bot";
            const time    = new Date().toLocaleString("en-BD", { timeZone: global.config.timeZone || "Asia/Dhaka" });
            const text    = `🔴 [${botName}] MQTT Error\n\nTime: ${time}\nError: ${errorMsg}`;

            // ── Telegram ──────────────────────────────────────────
            const tgCfg = notiCfg.telegram || {};
            if (tgCfg.enable && tgCfg.botToken && tgCfg.chatId) {
                try {
                    await axios.post(
                        `https://api.telegram.org/bot${tgCfg.botToken}/sendMessage`,
                        { chat_id: tgCfg.chatId, text, parse_mode: "HTML" },
                        { timeout: 10000 }
                    );
                } catch (e) {
                    logger(`Telegram noti failed: ${e.message}`, '[ WARN ]');
                }
            }

            // ── Discord Webhook ───────────────────────────────────
            const discordCfg = notiCfg.discordHook || {};
            if (discordCfg.enable && discordCfg.webhookUrl) {
                try {
                    await axios.post(
                        discordCfg.webhookUrl,
                        {
                            username: botName,
                            embeds: [{
                                title: "🔴 MQTT Error",
                                description: `**Error:** ${errorMsg}`,
                                color: 0xFF0000,
                                footer: { text: time }
                            }]
                        },
                        { timeout: 10000 }
                    );
                } catch (e) {
                    logger(`Discord noti failed: ${e.message}`, '[ WARN ]');
                }
            }
        }

        /* ─── MQTT Listener Callback ─── */

        function listenerCallback(error, message) {
            if (error) {
                if (error.type === 'ready' && error.error === null) return;
                const errStr = JSON.stringify(error);
                logger(global.getText('mirai', 'handleListenError', errStr), '[ ERROR ]');

                // Send notification for real MQTT errors
                sendMqttErrorNotification(errStr).catch(() => {});

                // autoRestartWhenListenMqttError
                if (global._autoRestartOnMqttError) {
                    logger("autoRestartWhenListenMqttError: MQTT error detected — restarting...", "[ RESTART ]");
                    setTimeout(() => process.exit(0), 2000);
                }
                return;
            }
            if (!message) return;

            if (!['presence', 'typ', 'read_receipt'].includes(message.type)) {
                process.stdout.write('HEARTBEAT\n');
            }
            if (['presence', 'typ', 'read_receipt'].some(t => t === message.type)) return;
            if (global.config.DeveloperMode) console.log(message);

            try {
                return listener(message);
            } catch (listenerErr) {
                logger(`Listener error: ${listenerErr.message}`, '[ ERROR ]');
            }
        }

        function startMqtt() {
            try {
                const mqttHandle = loginApiData.listenMqtt(listenerCallback);
                global.handleListen = mqttHandle; // FIX: assign inside success path, not after async call
            } catch (mqttErr) {
                logger(`MQTT start failed: ${mqttErr.message}. Retrying in 30s...`, '[ ERROR ]');
                sendMqttErrorNotification(`MQTT start failed: ${mqttErr.message}`).catch(() => {});
                if (global._autoRestartOnMqttError) {
                    logger("autoRestartWhenListenMqttError: MQTT start failed — restarting...", "[ RESTART ]");
                    setTimeout(() => process.exit(0), 2000);
                } else {
                    setTimeout(startMqtt, 30000);
                }
            }
        }
        startMqtt();

        setInterval(() => { process.stdout.write('HEARTBEAT\n'); }, 2 * 60 * 1000);

        setInterval(() => {
            try {
                const now = Date.now();
                for (const [, timestamps] of global.client.cooldowns) {
                    for (const [uid, ts] of timestamps) {
                        if (now - ts > 60 * 60 * 1000) timestamps.delete(uid);
                    }
                }
            } catch (_) {}
        }, 30 * 60 * 1000);

        
        setInterval(() => {
            try {
                const newState = loginApiData.getAppState();
                if (newState && newState.length > 0)
                    writeFileSync(appStateFile, JSON.stringify(newState, null, '\x09'));
            } catch (e) {
                logger(`AppState save failed: ${e.message}`, '[ WARN ]');
            }
        }, 10 * 60 * 1000);

        if (global.config.autoRefreshFbstate === true) {
            setInterval(async () => {
                try {
                    const freshState = loginApiData.getAppState();
                    if (freshState && freshState.length > 0) {
                        writeFileSync(appStateFile, JSON.stringify(freshState, null, '\x09'));
                        logger("AppState refreshed successfully", "[ FBSTATE ]");
                    }
                } catch (e) {
                    logger(`autoRefreshFbstate failed: ${e.message}`, "[ WARN ]");
                }
            }, 6 * 60 * 60 * 1000); 
            logger("autoRefreshFbstate enabled — refresh every 6h", "[ SYSTEM ]");
        }

       if (global.config.autoRestartWhenListenMqttError === true) {
            global._autoRestartOnMqttError = true;
            logger("autoRestartWhenListenMqttError enabled", "[ SYSTEM ]");
        }

        if (global.config.autoReloginWhenChangeAccount === true) {
            let _trackedUserID = null;
            try { _trackedUserID = loginApiData.getCurrentUserID(); } catch (_) {}

            setInterval(async () => {
                try {
                    const currentUID = loginApiData.getCurrentUserID();
                    if (_trackedUserID && currentUID && currentUID !== _trackedUserID) {
                        logger(
                            `Account changed: ${_trackedUserID} → ${currentUID}. Restarting bot...`,
                            "[ RELOGIN ]"
                        );
                        process.exit(0); 
                    }
                    _trackedUserID = currentUID;
                } catch (_) {}
            }, 5 * 60 * 1000);
            logger("autoReloginWhenChangeAccount enabled — polling every 5min", "[ SYSTEM ]");
        }

        global.checkBan = true;
    });
}

/* ========================== DATABASE & BOOT ========================== */

(async () => {
    try {
        await sequelize.authenticate();
        const authentication = { Sequelize, sequelize };
        const models = require('./includes/database/model')(authentication);
        logger(global.getText('mirai', 'successConnectDatabase'), '[ DATABASE ]');
        onBot({ models });
    } catch (error) {
        logger(`Database connection failed: ${error.message}. Retrying in 10s...`, '[ DATABASE ]');
        setTimeout(async () => {
            try {
                await sequelize.authenticate();
                const authentication = { Sequelize, sequelize };
                const models = require('./includes/database/model')(authentication);
                logger(global.getText('mirai', 'successConnectDatabase'), '[ DATABASE ]');
                onBot({ models });
            } catch (e2) {
                logger(`Database retry failed: ${e2.message}`, '[ DATABASE ]');
                process.exit(1);
            }
        }, 10000);
    }
})();

process.on('unhandledRejection', (err) => {
    if (err) {
        logger(`Unhandled Rejection: ${err && (err.message || err)}`, '[ ERROR ]');
        if (err && err.stack) logger(`Stack: ${err.stack}`, '[ ERROR ]');
    }
});

process.on('uncaughtException', (err) => {
    logger(`Uncaught Exception: ${err && (err.message || err)}`, '[ ERROR ]');
});
