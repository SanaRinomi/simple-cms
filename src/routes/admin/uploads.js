const express = require("express");
const {website} = require("../../controllers/constants");
const flash = require("smol-flash");
const router = express.Router();
const {PostUpload, Uploads} = require("../../controllers/dbMain");

router.get("/uploads/", async (req, res) => {
    const dbUploads = await Uploads.getAll(["path", "id", "title", "description"]);
    const uploads = dbUploads.success ? await Promise.all(dbUploads.data.map(async v => {
        const linked = await PostUpload.getLinked("posts", v.id);
        return {title: v.title, id: v.id, url: `/upload/${v.path}`, description: v.description, linked: linked.success}
    })) : null;
    res.render("admin/uploads", {page: {title: "Uploads - Admin", posts: uploads, scripts: ["/js/uploadsManage.js"]}, website, flash: flash(req)});
});

router.get("/upload", (req, res) => {
    res.render("admin/upload", {page: {title: "Admin"}, website, flash: flash(req)});
});

module.exports = router;