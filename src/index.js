const {port, settings, website} = require("./controllers/constants");
const {Categories, PostCategory, Posts} = require("./controllers/dbMain");

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

server.get("/", auth.isLoggedIn({required: false}), async (req, res) => {
    const category = await Categories.get({default: true});
    if(!category.success) {
        next(new Error("Category doesn't exist"));
        return;
    }

    const links = await PostCategory.getLinked("posts", category.data.id);
    const posts = [...await Promise.all(links.data.map(async v => {
        const post = await Posts.get(v);
        if(post.success) {
            const thumbnail = post.data.thumbnail;
            return {
                ...post.data,
                thumbnail: {url:`/upload/id/${thumbnail}`, description: "Post's thumbnail"},
                url: `/posts/${post.data.slug}`
            }
        } else null;
    }))].filter(v => v !== null);

    res.render("index", {page: {title: "Index", posts}, user: req.user || null, website, flash: flash(req)});
});

server.get("/json", (req, res) => {
    res.json(flash(req));
});

// Authentication router - Deals with login, register and logout.
server.use("/", require("./routes/auth"));

// Admin router - Makes sure the user is admin before doing admin stuff.
server.use("/admin", require("./routes/admin"));

// Me router - Current user profile and control.
server.use("/me", require("./routes/me"));

// Post router - Display and list all posts.
server.use("/posts", require("./routes/posts"));

// Category router - Display and list all categories.
server.use("/category", require("./routes/categories"));

// User router - Display profiles only to non admin users and control for admin users.
server.use("/user", require("./routes/user"));

// Upload router - Manages uploading files to the server.
server.use("/upload", require("./routes/upload"));

server.use(auth.isLoggedIn({required: false}), function(req, res){
    const page = {
        title: "404"
    }
	res.type('text/html');
	res.status(404);
	res.render('404', { page, website, flash: flash(req), user: req.user || null });
});

server.use(auth.isLoggedIn({required: false}), function(err, req, res){
	console.log(err.stack);
	res.status(500);
	res.render('500', { title: '500', flash: flash(req), user: req.user || null });
});

server.listen(port, function() {
	console.log(`Express server started at port ${port}; press Ctrl-C to terminate`);
});