const express = require("express");
const {website} = require("../controllers/constants");
const auth = require("../controllers/localAuth");
const flash = require("smol-flash");
const router = express.Router();
const { body } = require('express-validator');
const {Profiles, Uploads} = require('../controllers/dbMain');


router.use(express.urlencoded({extended:true}));

// Get Requests
router.get("/login", (req, res) => {
    res.render("auth/login", {page: {title: "Login"}, website, flash: flash(req)})
});

router.get("/register", (req, res) => {
    res.render("auth/register", {page: {title: "Register"}, website, flash: flash(req)})
});

router.get("/logout", auth.logOut({redirectSuccess: "/", redirectFailure: "/"}));

// Post Requests
router.post("/login",[
    body("username").notEmpty().withMessage("Username can't be empty").trim().escape(),
    body("password").isLength({min: 7}).withMessage("Password must be at least 7 characters long").escape()
], auth.authenticate({redirectSuccess: "/", redirectFailure: "/"}));

router.post("/register",[
    body("username").notEmpty().withMessage("Username can't be empty").trim().escape(),
    body("password").isLength({min: 7}).withMessage("Password must be at least 7 characters long").escape(),
    body("email").isEmail().withMessage("Email must be an email").normalizeEmail()
], auth.register({redirectFailure: "/"}), async (req, res) => {
    const defaults = await Uploads.getUserDefault();

    const profile = await Profiles.insert({user_id: req.user.id, slug: req.body.username.toLowerCase().split(" ").join("_"), pfp: defaults.pfp ? defaults.pfp.id : 1, pfc: defaults.pfc ? defaults.pfc.id : 1});
    res.redirect("/me");
});

module.exports = router;