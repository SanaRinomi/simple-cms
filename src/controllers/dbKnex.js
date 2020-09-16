const constants = require("./constants");

const pg = require("knex")(constants.settings.db);

module.exports = pg;