const chalk = require('chalk');
const gradient = require('gradient-string');

const gradientBot    = gradient('#243aff', '#4687f0', '#5800d4');
const gradientCmd    = gradient('#00c853', '#b2ff59');
const gradientEvent  = gradient('#ff6f00', '#ffca28');
const gradientDB     = gradient('#00bcd4', '#80deea');
const gradientSystem = gradient('#ab47bc', '#ce93d8');
const gradientServer = gradient('#f06292', '#f48fb1');

function ts() {
  return chalk.gray('[' + new Date().toLocaleTimeString('en-BD', { hour12: false }) + ']');
}

const logger = function (data, option) {
  option = String(option || '[ BOT ]').toUpperCase();

  if (option.includes('ERROR') || option.includes('ERR')) {
    return console.log(ts(), chalk.bold.bgRed(' ERROR '), chalk.bold.red(data));
  }
  if (option.includes('WARN')) {
    return console.log(ts(), chalk.bold.bgYellow.black(' WARN '), chalk.bold.yellow(data));
  }
  if (option.includes('DATABASE') || option.includes('DB')) {
    return console.log(ts(), chalk.bold(gradientDB(' DATABASE ')), chalk.cyan(data));
  }
  if (option.includes('SERVER')) {
    return console.log(ts(), chalk.bold(gradientServer(' SERVER ')), chalk.magenta(data));
  }
  if (option.includes('UPDATE')) {
    return console.log(ts(), chalk.bold.bgBlue(' UPDATE '), chalk.blue(data));
  }
  if (option.includes('BOT ONLINE')) {
    console.log('\n' + chalk.bold(gradientBot('━'.repeat(55))));
    console.log(ts(), chalk.bold(gradientBot(' 🤖 BOT ONLINE ── ' + data)));
    console.log(chalk.bold(gradientBot('━'.repeat(55))) + '\n');
    return;
  }
  if (option.includes('RESTART') || option.includes('WATCHDOG') || option.includes('SHUTDOWN')) {
    return console.log(ts(), chalk.bold.bgMagenta(' ' + option.replace(/[\[\]\s]/g, '') + ' '), chalk.magenta(data));
  }
  console.log(ts(), chalk.bold(gradientBot(option + ' ')), chalk.white(data));
};

logger.loader = function (data, option) {
  option = String(option || '').toUpperCase();

  if (option === 'ERROR' || option === 'ERR') {
    return console.log(ts(), chalk.bold.bgRed(' ✖ LOAD ERR '), chalk.bold.red(data));
  }
  if (option === 'WARN') {
    return console.log(ts(), chalk.bold.bgYellow.black(' ⚠ WARN '), chalk.bold.yellow(data));
  }
  console.log(ts(), chalk.bold(gradientBot('〘 SAGOR-V3 〙')), chalk.white(data));
};

// ── Dedicated: Command loaded (GREEN) ──────────────────────
logger.cmd = function (name) {
  console.log(
    ts(),
    chalk.bold(gradientCmd(' ✔ CMD ')),
    chalk.greenBright('Loaded: ' + chalk.bold.white(name))
  );
};

// ── Dedicated: Event loaded (ORANGE) ───────────────────────
logger.event = function (name) {
  console.log(
    ts(),
    chalk.bold(gradientEvent(' ✔ EVT ')),
    chalk.yellow('Loaded: ' + chalk.bold.white(name))
  );
};

// ── Dedicated: Load failure ─────────────────────────────────
logger.fail = function (name, err) {
  console.log(
    ts(),
    chalk.bold.bgRed(' ✖ FAIL '),
    chalk.red('Failed: ' + chalk.bold(name) + ' → ' + err)
  );
};

// ── Section divider ─────────────────────────────────────────
logger.section = function (title) {
  console.log('\n' + chalk.bold(gradientSystem('─── ' + title.toUpperCase() + ' ' + '─'.repeat(Math.max(0, 42 - title.length)))));
};

// ── Startup summary banner ───────────────────────────────────
logger.summary = function (cmdCount, evtCount, ms) {
  console.log('\n' + chalk.bold(gradientBot('═'.repeat(55))));
  console.log(chalk.bold(gradientCmd('  ✔ Commands loaded : ' + cmdCount)));
  console.log(chalk.bold(gradientEvent('  ✔ Events   loaded : ' + evtCount)));
  console.log(chalk.bold(gradientSystem('  ⏱  Startup time   : ' + ms + 'ms')));
  console.log(chalk.bold(gradientBot('═'.repeat(55))) + '\n');
};

module.exports = logger;
