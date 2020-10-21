const express = require("express");
const {website} = require("../../controllers/constants");
const flash = require("smol-flash");
const router = express.Router();
const {Posts, PostUpload, Categories, PostCategory, Uploads, PostProfile, Profiles} = require("../../controllers/dbMain");
const {fetchPostJSON} = require("../../controllers/posts");
const { body, validationResult } = require('express-validator');

router.get("/posts/", async (req, res) => {
    const dbPosts = await Posts.getAll(["title", "slug", "thumbnail"]);
    const posts = dbPosts.success ? dbPosts.data.map(v => {return {title: v.title, thumbnail: v.thumbnail, url: `/posts/${v.slug}`, slug: v.slug}}) : null;

    res.render("admin/posts", {page: {title: "Posts - Admin", posts, scripts: ["/js/postManage.js"]}, website, flash: flash(req)});
});

router.get("/posts/:slug", async (req, res, next) => {
    const post = await Posts.get({slug: req.params.slug});
    if(!post.success)
        next(new Error("Post doesn't exist!"));
    else{
        const linkedCats = await PostCategory.getLinked("categories", post.data.id); 
        const linkedAuthors = await PostProfile.getLinked("profiles", post.data.id);
        
        const categories = linkedCats.success ? (await Promise.all(linkedCats.data.map(async v => {const cat = await Categories.get(v); return cat.success ? cat.data : null;}))).filter(v => v !== null) : [];
        const authors = linkedAuthors.success ? (await Promise.all(linkedAuthors.data.map(async v => {const author = await Profiles.get({user_id: v}); return author.success ? author.data : null;}))).filter(v => v !== null) : [];
        
        console.log(await fetchPostJSON(post.data));
        
        res.render("admin/post", {page: {title: `${post.data.title} - Admin`, scripts: ["/js/dropzone.min.js", "/js/postGen.js", "https://cdnjs.cloudflare.com/ajax/libs/markdown-it/12.0.1/markdown-it.min.js"]}, website, flash: flash(req), post: post.data, categories, authors});
    }
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

    const postPic = await Uploads.get({default_post_thumbnail: true});

    const dbQuery = await Posts.insert(slug, {title, thumbnail: postPic.success ? postPic.data.id : 1}, ["id"]);
    if(dbQuery.success){
        const dbCatDef = await Categories.get({default: true});
        if(dbCatDef.success) {
            await PostCategory.link(dbQuery.data, dbCatDef.data.id);
        }

        await PostProfile.link(dbQuery.data, req.user.id);

        res.redirect(`/admin/posts/${slug}`);
    }
    else res.json(dbQuery);
});

router.post("/posts/:slug", [
    body("title").isString().escape().optional({checkFalsy: true, nullable: true}),
    body("description").isString().escape().optional({checkFalsy: true, nullable: true}),
    body("content").isArray().optional({checkFalsy: true, nullable: true}),
    body("thumbnail").isJSON().optional({checkFalsy: true, nullable: true})
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
                    dbQuery.title = value;
                    break;
                case "description":
                    dbQuery.description = value;
                    break;
                case "thumbnail":
                    dbQuery.thumbnail = JSON.parse(value);
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

        if(Object.keys(dbQuery).length !== 0){
            await PostProfile.link(post.data.id, req.user.id, true);
            dbQuery.edited_at = Date.now();
            res.json(await Posts.upsert(post.data.id, dbQuery))
        }
        else {res.status(400).json({success: false, reason: "No data"})}
    }
});

router.delete("/posts/:slug", async (req, res) => {
    let post = await Posts.get({slug: req.params.slug});
    if(!post.success)
        res.status(404).json({success: false, reason: "Resource doesn't exist"});
    else {
        let uploads = await PostUpload.removeAllLinked("upload", post.data.id);
        let categories = await PostCategory.removeAllLinked("categories", post.data.id);
        let postDel = await Posts.del(post.data.id);

        res.json({success: postDel});
    }
});

module.exports = router;