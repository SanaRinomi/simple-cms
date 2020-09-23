const {port, settings, website} = require("./controllers/constants");
const DB = require("./controllers/dbMain");

// Express
const express = require("express"),
    handlebars = require("express-handlebars").create({defaultLayout:'main'}),
    session = require("express-session"),
    bodyParser = require("body-parser"),
    KnexSessionStore = require('connect-session-knex')(session),
    { body } = require('express-validator'),
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
server.use(express.urlencoded({extended:true}));

server.get("/", (req, res) => {
    res.render("index", {page: {title: "Index"}, website, flash: flash(req)})
});

server.use("/admin", require("./routes/admin"));

server.post("/login",[
    body("username").notEmpty().withMessage("Username can't be empty").trim().escape(),
    body("password").isLength({min: 7}).withMessage("Password must be at least 7 characters long").escape()
], auth.authenticate({redirectSuccess: "/", redirectFailure: "/"}));

server.post("/register",[
    body("username").notEmpty().withMessage("Username can't be empty").trim().escape(),
    body("password").isLength({min: 7}).withMessage("Password must be at least 7 characters long").escape(),
    body("email").isEmail().withMessage("Email must be an email").normalizeEmail()
], auth.register({redirectSuccess: "/", redirectFailure: "/"}));

server.get("/logout", auth.logOut({redirectSuccess: "/", redirectFailure: "/"}))

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