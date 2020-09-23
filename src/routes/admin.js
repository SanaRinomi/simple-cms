const express = require("express");
const {website} = require("../controllers/constants");
const auth = require("../controllers/localAuth");
const flash = require("smol-flash");
const router = express.Router();

router.use(auth.isLoggedIn({redirectFailure: "/"}), (req, res, next) => {
    if(req.data.isAdmin)
        next();
    else {
        flash(req, {error: true, description: "You need to be admin to access here"});
        res.redirect("/");
    }
})

router.get("/", (req, res) => {
    res.render("admin", {page: {title: "Admin"}, website, flash: flash(req)});
});

module.exports = router;