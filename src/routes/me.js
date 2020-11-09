const express = require("express");
const {website} = require("../controllers/constants");
const auth = require("../controllers/localAuth");
const flash = require("smol-flash");
const router = express.Router();
const {Profiles, Users} = require("../controllers/dbMain");
const { body, validationResult } = require('express-validator');
const validator = (require('validator')).default;

router.use(express.urlencoded({extended:true}));

router.use(auth.isLoggedIn({redirectFailure: "/"}), async (req, res, next) => {
    let profile = await Profiles.get({user_id: req.session.user_id});

    if(!profile.success) {
        next(new Error("Profile couldn't be retrieved"));
        return;
    }

    req.profile = profile.data;

    next();
});

router.get("/", async (req, res) => {
    const profile = await Profiles.get({user_id: req.user.id});

    res.render("users/index", {page: {title: req.user.username}, website, flash: flash(req), profile: profile.success ? profile.data : req.profile, user: req.user});
});

router.get("/settings", (req, res) => {
    res.render("users/settings", {page: {title: "User Settings"}, website, flash: flash(req), profile: req.profile, user: req.user});
});

router.post("/settings", [
    body("public_name").isString().escape().optional({checkFalsy: true, nullable: true}),
    body("description").isString().escape().optional({checkFalsy: true, nullable: true}),
    body("g_name").isString().escape().optional({checkFalsy: true, nullable: true}),
    body("g_pronouns").isNumeric().optional({checkFalsy: true, nullable: true}),
    body("birthday").isDate().optional({checkFalsy: true}),
    body("links").isArray().optional({checkFalsy: true, nullable: true})
],
async (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty() && errors.errors[0]) {
        flash(req, {error: true, description: errors.errors[0].msg});
        res.redirect("/me");
        return;
    }

    let dbQuery = {};

    for (const [key, value] of Object.entries(req.body)) {
        switch (key) {
            case "public_name":
                dbQuery.public_name = value;
                break;
            case "description":
                dbQuery.description = value;
                break;
            case "birthday":
                if (!value) break;
                dbQuery.birthday = value;
                break;
            case "links":
                let filtered = value.filter(v => {return v.name && v.url});
                if(filtered.length === 0) break;
                if(filtered.map(v => {return (validator.isAscii(v.name) && validator.isURL(v.url, {require_protocol: true, require_valid_protocol: true, protocols: ["http", "https"]}));}).reduce((v1, v2) => {return v1 && v2;})){
                    dbQuery.links = filtered.map(v => {return {name: validator.escape(v.name), url: v.url}});
                }
                break;

            case "g_name":
                if (!value) break;
                if(!dbQuery.gender) dbQuery.gender = {};
                dbQuery.gender.name = value;
                break;
            case "g_pronouns":
                if(!dbQuery.gender) dbQuery.gender = {};
                dbQuery.gender.pronouns = value;
                break;
        
            default:
                break;
        }
    }

    const dbRes = await Profiles.upsert({user_id: req.session.user_id}, dbQuery)
    res.json(dbRes);
});

router.delete("/account", async (req, res, next) => {
    const logout = await auth.logOut({inFunc: true})(req, res, next);
    console.log(logout)
    if(logout.success) {
        const profile = await Profiles.del(req.profile.id);
        const user = await Users.del(req.user.id);

        if(user) {
            flash(req, {error: false, description: "User deleted"});
            res.redirect("/");
        } else next(new Error("User failed to delete"));
    } else {console.error(logout.error); next(new Error("Logout failed"))};
});

module.exports = router;