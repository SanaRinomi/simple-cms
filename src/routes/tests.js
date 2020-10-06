const express = require("express");
const {website} = require("../controllers/constants");
const CryptoJS = require("crypto-js");
const auth = require("../controllers/localAuth");
const flash = require("smol-flash");
const router = express.Router();
const multer = require("multer");
const path = require('path');
const fs = require('fs');
const validator = require("validator");
const mime = require("mime");
const {Uploads, Profiles, Users} = require("../controllers/dbMain");

router.get("/profile", auth.isLoggedIn({redirectFailure: "/"}), async (req, res) => {
    let profile = await Profiles.get({user_id: req.session.user_id});
    if(!profile.success) {
        await Profiles.insert({user_id: req.session.user_id, slug: req.user.username.toLowerCase().split(" ").join("_")});
        profile = await Profiles.get({user_id: req.session.user_id});
    }
    res.json(profile);
});

router.get("/profile/images", auth.isLoggedIn({redirectFailure: "/"}), async (req, res) => {
    let profile = await Profiles.get({user_id: req.session.user_id}, ["images"]);
    if(!profile.success) {
        await Profiles.insert({user_id: req.session.user_id, slug: req.user.username.toLowerCase().split(" ").join("_")});
        profile = await Profiles.get({user_id: req.session.user_id}, ["images"]);
    }
    res.json(profile);
});

router.get("/ulist", async (req, res) => {
    const users = await Users.getAll(["username", "id"]);
    const profiles = await Promise.all(users.data.map(async user => {
        console.log(user);
        return user;
    }));
    console.log(profiles);
    res.json(profiles);
});

module.exports = router;