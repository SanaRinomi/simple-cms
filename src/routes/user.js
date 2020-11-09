const express = require("express");
const {website} = require("../controllers/constants");
const auth = require("../controllers/localAuth");
const flash = require("smol-flash");
const router = express.Router();
const {Profiles, Users, Uploads} = require("../controllers/dbMain");

// router.get("/", (req, res) => {
//     res.redirect("/me");
// });

router.use(auth.isLoggedIn({required: false}));

router.get("/", async (req, res) => {
    const users = await Users.getAll(["username", "id"]);
    const profiles = await Promise.all(users.data.map(async user => {
        const profile = await Profiles.get({user_id: user.id});
        if(profile.success) {
            const avatar = profile.data.images.avatar.id ? await Uploads.get(profile.data.images.avatar.id) : null;
            return {
                title: profile.data.public_name || user.username,
                thumbnail: {
                    url: profile.data.images.avatar.url,
                    description: avatar && avatar.success ? avatar.data.description : "A blank Avatar"
                },
                url: `/user/${profile.data.slug}`
            };
        }
        else
            return null;
    }));

    res.render("posts/list", {page: {title: "Users", posts: profiles}, user: req.user || null, website, flash: flash(req)});
});

router.get("/:slug", async (req, res) => {
    const profile = await Profiles.get({slug: req.params.slug});

    if(!profile.success)
        next(new Error("User profile doesn't exist!"));
    
    const user = await Users.get(profile.data.user_id, ["username"]);

    res.render("users/index", {page: {title: profile.data.public_name ? profile.data.public_name : user.data.username}, website, flash: flash(req), profile: profile.data, user: user.data});
});

module.exports = router;