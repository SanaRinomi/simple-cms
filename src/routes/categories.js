const express = require("express");
const {website} = require("../controllers/constants");
const auth = require("../controllers/localAuth");
const flash = require("smol-flash");
const router = express.Router();
const {Categories, PostCategory, Posts} = require("../controllers/dbMain");


router.use(auth.isLoggedIn({required: false}));

router.get("/", async (req, res) => {
    const categories = await Categories.getAll(["name", "slug", "description", "id"]);

    listing = categories.success ? categories.data.map(v => {
        return {
            title: v.name,
            url: `/category/${v.slug}`,
            description: v.description
        };
    }) : null;

    res.render("posts/list", {page: {title: "Categories", posts: listing}, user: req.user || null, website, flash: flash(req)});
});

router.get("/:slug", async (req, res, next) => {
    const category = await Categories.getBySlug(req.params.slug);
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

    res.render("posts/list", {page: {title: category.data.name, description: category.data.description, posts}, user: req.user || null, website, flash: flash(req)});
});

module.exports = router;