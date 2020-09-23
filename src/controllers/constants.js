const settings = require("../config.json");
const port = settings.port || 8080;

const website = {
    title: settings.name
}

module.exports = {
    settings,
    port,
    website
}