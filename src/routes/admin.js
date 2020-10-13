const express = require("express");
const {website} = require("../controllers/constants");
const auth = require("../controllers/localAuth");
const flash = require("smol-flash");
const router = express.Router();

router.use(express.urlencoded({extended:true}));

router.use(auth.isLoggedIn({redirectFailure: "/"}), (req, res, next) => {
    if(req.user.isAdmin)
        next();
    else {
        flash(req, {error: true, description: "You need to be admin to access here"});
        res.redirect("/");
    }
})

router.get("/", (req, res) => {
    res.render("admin/index", {page: {title: "Admin"}, website, flash: flash(req)});
});

router.use(require("./admin/posts"));
router.use(require("./admin/uploads"));
router.use(require("./admin/categories"));

module.exports = router;