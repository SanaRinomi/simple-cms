const settings = require("../config.json");
const port = settings.port || 8080;

module.exports = {
    settings,
    port
}