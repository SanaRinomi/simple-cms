const {port, settings, website} = require("./controllers/constants");
const {Posts} = require("./controllers/dbMain");

// Express
const express = require("express"),
    handlebars = require("express-handlebars").create({defaultLayout:'main', helpers: {...require('handlebars-helpers')(['array', 'object', 'comparison', 'html', 'markdown', 'url', 'string', 'code']), date: require('helper-date')}}),
    session = require("express-session"),
    KnexSessionStore = require('connect-session-knex')(session)
    auth = require("./controllers/localAuth");

let server = express();

const store = new KnexSessionStore({knex: require("./controllers/dbKnex")});
    
const flash = require("smol-flash");

if(settings.proxy) server.set('trust proxy', 1);

server.engine('handlebars', handlebars.engine);
server.set('view engine', 'handlebars');
server.set('views', 'src/views');

server.use(session({ secret: settings.secret, store, proxy: settings.proxy, cookie: {secure:settings.secure}, saveUninitialized: false, resave: false}));
server.use(express.json());

server.use(express.static('src/public'));

server.get("/", (req, res) => {
    res.render("index", {page: {title: "Index"}, website, flash: flash(req)})
});

server.get("/json", (req, res) => {
    res.json(flash(req));
});

server.get("/posts/:slug", async (req, res) => {
    let post = await Posts.get({slug: req.params.slug});
    if(!post.success)
        next(new Error("Post doesn't exist!"));
    else
        res.render("posts/post", {page: {title: `${post.data.title}`}, website, flash: flash(req), post: post.data});
});

// Authentication router - Deals with login, register and logout.
server.use("/", require("./routes/auth"));

// Admin router - Makes sure the user is admin before doing admin stuff.
server.use("/admin", require("./routes/admin"));

// Me router - Current user profile and control.
server.use("/me", require("./routes/me"));

// User router - Display profiles only to non admin users and control for admin users.
server.use("/user", require("./routes/user"));

// Upload router - Manages uploading files to the server.
server.use("/upload", require("./routes/upload"));

// Test router - For testing functionality. Comment out in prod.
server.use("/test", require("./routes/tests"));

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