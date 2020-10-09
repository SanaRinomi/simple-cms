const express = require("express");
const {website} = require("../controllers/constants");
const auth = require("../controllers/localAuth");
const flash = require("smol-flash");
const router = express.Router();
const {Posts, PostUpload} = require("../controllers/dbMain");
const { body, validationResult } = require('express-validator');
const { authenticate } = require("../controllers/localAuth");
const validator = (require('validator')).default;

router.use(express.urlencoded({extended:true}));

router.use(auth.isLoggedIn({redirectFailure: "/"}), (req, res, next) => {
    if(req.user.isAdmin)
        next();
    else {
        flash(req, {error: true, description: "You need to be admin to access here"});
        res.redirect("/");
    }
})

router.get("/", (req, res) => {
    res.render("admin/index", {page: {title: "Admin"}, website, flash: flash(req)});
});

router.get("/posts/", async (req, res) => {
    const posts = (await Posts.getAll(["title", "slug", "thumbnail"])).data.map(v => {return {title: v.title, thumbnail: v.thumbnail, url: `./posts/${v.slug}`}});

    res.render("posts/list", {page: {title: "Admin", posts}, website, flash: flash(req)});
});

router.get("/posts/:slug", async (req, res, next) => {
    let post = await Posts.get({slug: req.params.slug});
    if(!post.success)
        next(new Error("Post doesn't exist!"));
    else
        res.render("admin/post", {page: {title: `${post.data.title} - Admin`, scripts: ["/js/dropzone.min.js", "/js/postGen.js"]}, website, flash: flash(req), post: post.data});
});

router.post("/posts/",
[
    body("slug").isString().escape(),
    body("title").isString().escape()
], async(req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty() && errors.errors[0]) {
        flash(req, {error: true, description: errors.errors[0].msg});
        res.redirect("/admin");
        return;
    }

    const slug = req.body.slug.toLowerCase().split(" ").join("_");
    const title = req.body.title;

    let post = await Posts.get({slug});
    if(post.success)
        return next(new Error("Post already exist!"));

    const dbQuery = await Posts.insert({slug, title, thumbnail: {url: "https://images.unsplash.com/photo-1584126321240-539468f62369", description: "Close up image of a page of a random book"}}, ["id"]);
    if(dbQuery.success)
        res.redirect(`/admin/posts/${slug}`);
    else res.json(dbQuery);
});

router.post("/posts/:slug", [
    body("title").isString().escape().optional({checkFalsy: true, nullable: true}),
    body("description").isString().escape().optional({checkFalsy: true, nullable: true}),
    body("content").isArray().optional({checkFalsy: true, nullable: true})
], async (req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty() && errors.errors[0]) {
        flash(req, {error: true, description: errors.errors[0].msg});
        res.redirect("/admin");
        return;
    }

    let post = await Posts.get({slug: req.params.slug});
    if(!post.success)
        next(new Error("Post doesn't exist!"));
    else{
        let dbQuery = {};

        for (const [key, value] of Object.entries(req.body)) {
            switch (key) {
                case "title":
                    dbQuery.public_name = value;
                    break;
                case "description":
                    dbQuery.description = value;
                    break;
                case "content":
                    let filtered = value.filter(v => {return v.type && v.data});
                    if(filtered.length === 0) break;
                    const imgs = filtered.filter(v => v.id);
                    if(imgs && imgs.length) await PostUpload.link(post.data.id, imgs.map(v => v.id), false);
                    dbQuery.content = filtered;
                    break;
            
                default:
                    break;
            }
        }

        if(Object.keys(dbQuery).length !== 0){res.json(await Posts.upsert(post.data.id, dbQuery))}
        else {res.json({success: false, reason: "No data"})}
    }
});

router.get("/upload", (req, res) => {
    res.render("admin/upload", {page: {title: "Admin"}, website, flash: flash(req)});
});

module.exports = router;