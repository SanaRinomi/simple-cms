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
const {Uploads} = require("../controllers/dbMain");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, `./uploads/`);
    },
    filename: function (req, file, cb) {
        let ext = path.extname(file.originalname);
        let name = validator.escape(path.basename(file.originalname, ext));

        let key = CryptoJS.MD5(`${10>name?file.originalname:name.substring(0,10)}:${new Date().toISOString()}:${file.size}`);
        cb(null, `${20>name?file.originalname:name.substring(0,20)}-${key}${ext}`);
    }
})

const upload = multer({storage});

router.use(express.urlencoded({extended:true, limit:"100mb"}));

router.get("/:file", async (req, res, next) => {
    let page;
    const path = `./uploads/${req.params.file}`;
    if(!req.params.file || !path.extname(req.params.file)) {
        page = {
            title: "404"
        }
        res.type('text/html');
        res.status(404);
        res.render('404', { page, website, flash: flash(req) || {error:true,description:"No file passsed!"}});
    } else if(fs.existsSync(path)) {
        let dbres = await Uploads.get({path});
        if(!dbres.success) {
            const data = {
                path,
                mime: mime.getType(path)
            }
            dbres = await Uploads.insert(data, ["path", "mime", "created_at"]);
            if(!dbres.success) {
                next(new Error("Can't register file"));
                return;
            }
        }

        let options = {
            root: path.join(__dirname, 'uploads'),
            dotfiles: 'deny',
            headers: {
                'x-timestamp': Date.now(),
                'x-sent': true,
                'media-data': JSON.stringify(dbres.data)
            }
        }

        res.sendFile(req.params.file, options, function (err) {
            if (err) {
                next(err)
            }
        });
    } else {
        page = {
            title: "404"
        }
        res.type('text/html');
        res.status(404);
        res.render('404', { page, website, flash: flash(req)});
    }
});

router.post("/", auth.isLoggedIn({redirectFailure: "/json"}), (req, res, next) => {
    if(req.data.isAdmin)
        next();
    else {
        flash(req, {error: true, description: "You need to be admin to access here"});
        res.redirect("/json");
    }
}, upload.array("media"), (req, res) => {
    
});

router.post("/avatar", auth.isLoggedIn({redirectFailure: "/json"}), upload.single("avatar"), (req, res) => {

});