const express = require("express");
const {website} = require("../../controllers/constants");
const flash = require("smol-flash");
const router = express.Router();
const {Categories, PostCategory} = require("../../controllers/dbMain");
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
    let category = await Categories.get({slug: req.params.slug});
    if(!category.success)
        next(new Error("Post doesn't exist!"));
    else
        res.render("admin/category", {page: {title: `${category.data.name} - Category - Admin`, scripts: ["/js/categoryDetails.js"]}, website, flash: flash(req), post: category.data});
});

router.post("/categories/",
[
    body("slug").isString().escape(),
    body("name").isString().escape()
], async(req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty() && errors.errors[0]) {
        flash(req, {error: true, description: errors.errors[0].msg});
        res.redirect("/admin");
        return;
    }

    const slug = req.body.slug.toLowerCase().split(" ").join("_");
    const name = req.body.name;

    let category = await Categories.get({slug});
    if(category.success)
        return next(new Error("Category already exist!"));

    const dbQuery = await Categories.insert({slug, name}, ["id"]);
    if(dbQuery.success)
        res.redirect(`/admin/categories/${slug}`);
    else res.json(dbQuery);
});

router.post("/categories/:slug", [
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
            dbQuery.edited_at = Date.now();
            res.json(await Posts.upsert(post.data.id, dbQuery))
        }
        else {res.status(400).json({success: false, reason: "No data"})}
    }
});

router.delete("/categories/:slug", async (req, res) => {
    let category = await Categories.get({slug: req.params.slug});
    console.log(category);
    if(!category.success)
        res.status(404).json({success: false, reason: "Resource doesn't exist"});
    else {
        // let uploads = await PostUpload.removeAllLinked("upload", post.data.id);
        // console.log(uploads);
        let catDel = await Categories.del(category.data.id);
        console.log(catDel);

        res.json({success: catDel});
    }
});

module.exports = router;