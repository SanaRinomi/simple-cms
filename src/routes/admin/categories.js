const express = require("express");
const {website} = require("../../controllers/constants");
const flash = require("smol-flash");
const router = express.Router();
const {Categories, PostCategory, Posts} = require("../../controllers/dbMain");
const { body, validationResult } = require('express-validator');

router.get("/categories/", async (req, res) => {
    let categories = (await Categories.getAll(["name", "slug", "description"])).data;

    if(!categories) {
        const json = {name: "All", slug: "all", description: "Default category containing all posts"};
        await Categories.insert(json);
        categories = [json];
    }

    res.render("admin/categories", {page: {title: "Categories - Admin", posts: categories, scripts: ["/js/categoryManage.js"]}, website, flash: flash(req)});
});

router.get("/categories/:slug", async (req, res, next) => {
    const category = await Categories.get({slug: req.params.slug});
    if(!category.success)
        next(new Error("Post doesn't exist!"));
    else {
        const linkedPosts = await PostCategory.getLinked("posts", category.data.id);
        let allPosts = (await Posts.getAll()).data;
        let posts = [];
        if(linkedPosts.success && posts) {
            linkedPosts.data.forEach(v => {
                const find = allPosts.findIndex(vv => vv.id === v);
                if(find !== -1) {
                    posts.push(allPosts.splice(find, 1)[0]);
                }
            });
        }

        console.log(allPosts);
        res.render("admin/category", {page: {title: `${category.data.name} - Category - Admin`, scripts: ["/js/categoryDetails.js"]}, website, flash: flash(req), post: category.data, posts, allPosts});
    }
});

router.post("/categories/",
[
    body("slug").isString().escape().optional({checkFalsy: true, nullable: true}),
    body("name").isString().escape()
], async(req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty() && errors.errors[0]) {
        flash(req, {error: true, description: errors.errors[0].msg});
        res.redirect("/admin");
        return;
    }

    const slug = req.body.slug ? req.body.slug.toLowerCase().split(" ").join("_") : req.body.name;
    const name = req.body.name;

    let category = await Categories.get({slug});
    if(category.success)
        return next(new Error("Category already exist!"));

    const dbQuery = await Categories.insert(slug, {name}, ["id"]);
    if(dbQuery)
        res.redirect(`/admin/categories/${slug}`);
    else res.json(dbQuery);
});

router.post("/categories/:slug", [
    body("name").isString().escape().optional({checkFalsy: true, nullable: true}),
    body("description").isString().escape().optional({checkFalsy: true, nullable: true})
], async (req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty() && errors.errors[0]) {
        flash(req, {error: true, description: errors.errors[0].msg});
        res.redirect("/admin");
        return;
    }

    let post = await Categories.get({slug: req.params.slug});
    if(!post.success)
        next(new Error("Category doesn't exist!"));
    else{
        let dbQuery = {};

        for (const [key, value] of Object.entries(req.body)) {
            switch (key) {
                case "name":
                    dbQuery.name = value;
                    break;
                case "description":
                    dbQuery.description = value;
                    break;
            
                default:
                    break;
            }
        }

        if(Object.keys(dbQuery).length !== 0){
            res.json(await Categories.upsert(post.data.id, dbQuery))
        }
        else {res.status(400).json({success: false, reason: "No data"})}
    }
});

router.post("/categories/:cat_slug/:post_slug",[
    body("add").isString().escape()
], async (req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty() && errors.errors[0]) {
        console.log(errors.errors);
        flash(req, {error: true, description: errors.errors[0].msg});
        res.redirect("/admin");
        return;
    }

    const post = await Posts.getBySlug(req.params.post_slug);
    const cat = await Categories.getBySlug(req.params.cat_slug);

    console.log(req.params.post_slug);
    console.log(req.params.cat_slug);

    if(!post.success || !cat.success) {
        res.status(404).json({success: false, reason: `${post.success ? "Category" : "Post"} does not exist`})
    }

    let link;
    if(req.body.add === "on") {
        link = await PostCategory.link(post.data.id, cat.data.id);
    } else link = await PostCategory.removeLinked(post.data.id, cat.data.id);

    res.json({success: req.body.add === "on" ? link.success : link});
});

router.delete("/categories/:slug", async (req, res) => {
    let category = await Categories.get({slug: req.params.slug});
    console.log(category);
    if(!category.success)
        res.status(404).json({success: false, reason: "Resource doesn't exist"});
    else if(category.data.default) {
        res.status(400).json({success: false, reason: "Resource set to default"});
    } else {        
        let posts = await PostCategory.removeAllLinked("posts", category.data.id);
        let catDel = await Categories.del(category.data.id);

        res.json({success: catDel});
    }
});

module.exports = router;