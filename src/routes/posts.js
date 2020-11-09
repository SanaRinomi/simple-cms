const express = require("express");
const {website} = require("../controllers/constants");
const auth = require("../controllers/localAuth");
const flash = require("smol-flash");
const router = express.Router();
const {Posts} = require("../controllers/dbMain");
const {fetchPostJSON} = require("../controllers/posts");


router.use(auth.isLoggedIn({required: false}));

router.get("/", async (req, res) => {
    const postGet = await Posts.getAll();

    const posts = postGet.data.map(v => {
        const thumbnail = v.thumbnail;
        return {
            ...v,
            thumbnail: {url:`/upload/id/${thumbnail}`, description: "Post's thumbnail"},
            url: `/posts/${v.slug}`
        }
    });

    res.render("posts/list", {page: {title: "All Posts", posts: posts}, user: req.user || null, website, flash: flash(req)});
});

router.get("/:slug", async (req, res, next) => {
    let post = await Posts.get({slug: req.params.slug});
    if(!post.success)
        next(new Error("Post doesn't exist!"));
    else
        res.render("posts/post", {page: {title: `${post.data.title}`}, user: req.user || null, website, flash: flash(req), post: await fetchPostJSON(post.data, true)});
});

module.exports = router;