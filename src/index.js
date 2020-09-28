const {port, settings, website} = require("./controllers/constants");
const DB = require("./controllers/dbMain");

// Express
const express = require("express"),
    handlebars = require("express-handlebars").create({defaultLayout:'main', helpers: require('handlebars-helpers')(['html', 'markdown', 'url', 'string', 'code'])}),
    session = require("express-session"),
    KnexSessionStore = require('connect-session-knex')(session)
    auth = require("./controllers/localAuth");

let server = express();

const store = new KnexSessionStore({knex: require("./controllers/dbKnex")});
    
const flash = require("smol-flash");

if(settings.proxy) server.set('trust proxy', 1);

server.engine('handlebars', handlebars.engine);
server.set('view engine', 'handlebars');
server.set('views', 'src/views')

server.use(express.static('public'));

server.use(session({ secret: settings.secret, store, proxy: settings.proxy, cookie: {secure:settings.secure}, saveUninitialized: false, resave: false}));
server.use(express.json());

server.get("/", (req, res) => {
    res.render("index", {page: {title: "Index"}, website, flash: flash(req)})
});

server.get("/json", (req, res) => {
    res.json(flash(req));
});

// Authentication router - Deals with login, register and logout.
server.use("/", require("./routes/auth"));

// Admin router - Maeks sure the user is admin before doing admin stuff.
server.use("/admin", require("./routes/admin"));

server.use(function(req, res){
    const page = {
        title: "404"
    }
	res.type('text/html');
	res.status(404);
	res.render('404', { page, website, flash: flash(req) });
});

server.use(function(err, req, res){
	console.log(err.stack);
	res.status(500);
	res.render('500', { title: '500', flash: flash(req) });
});

server.listen(port, function() {
	console.log(`Express server started at port ${port}; press Ctrl-C to terminate`);
});