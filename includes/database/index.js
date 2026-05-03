const Sequelize = require("sequelize");
const { resolve } = require("path");
const { DATABASE } = global.config;

var dialect = Object.keys(DATABASE);
dialect = dialect[0];
const storage = resolve(__dirname, `../${DATABASE[dialect].storage}`);

const sequelize = new Sequelize({
  dialect,
  storage,
  pool: {
    max: 20,
    min: 0,
    acquire: 60000,
    idle: 20000
  },
  retry: {
    match: [/SQLITE_BUSY/],
    name: 'query',
    max: 20
  },
  logging: false,
  transactionType: 'IMMEDIATE',
  define: {
    underscored: false,
    freezeTableName: true,
    charset: 'utf8',
    dialectOptions: { collate: 'utf8_general_ci' },
    timestamps: true
  },
  sync: { force: false }
});

// FIX: Export both sequelize instance AND Sequelize class correctly
// Previously module.exports.sequelize was set then overwritten by the model factory,
// causing `const { Sequelize, sequelize } = require("./includes/database")` to fail.
module.exports = {
  sequelize,
  Sequelize
};
