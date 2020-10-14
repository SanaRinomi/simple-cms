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
const {Uploads, Profiles, PostUpload} = require("../controllers/dbMain");

const uploadPath = path.join(process.cwd(), "upload");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(uploadPath, "/"));
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
    const pathf = path.join(uploadPath, req.params.file);
    if(!req.params.file || !path.extname(req.params.file)) {
        page = {
            title: "404"
        }
        res.type('text/html');
        res.status(404);
        res.render('404', { page, website, flash: flash(req) || {error:true,description:"No file passsed!"}});
    } else if(fs.existsSync(pathf)) {
        let dbres = await Uploads.get({path: req.params.file});
        if(!dbres.success) {
            const data = {
                path: req.params.file,
                mime: mime.getType(pathf),
                name: path.basename(pathf,path.extname(pathf))
            }
            dbres = await Uploads.insert(data, ["path", "mime", "created_at"]);
            if(!dbres.success) {
                next(new Error("Can't register file"));
                return;
            }

            res.sendFile(pathf);
        }

        let options = {
            root: uploadPath,
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

router.get("/id/:id", async (req, res, next) => {
    let dbres = await Uploads.get(req.params.id);
    dbres;
    if(!dbres.success || !fs.existsSync(path.join(uploadPath, dbres.data.path))) {
        let page = {
            title: "404"
        }
        res.type('text/html');
        res.status(404);
        res.render('404', { page, website, flash: flash(req)});
        return;
    }

    let options = {
        root: uploadPath,
        dotfiles: 'deny',
        headers: {
            'x-timestamp': Date.now(),
            'x-sent': true,
            'media-data': JSON.stringify(dbres.data)
        }
    }

    res.sendFile(dbres.data.path, options, function (err) {
        if (err) {
            next(err)
        }
    });
});

router.post("/", auth.isLoggedIn({redirectFailure: "/json"}), (req, res, next) => {
    if(req.user.is_admin){
        next();
    }
    else {
        flash(req, {error: true, description: "You need to be admin to access here"});
        res.redirect("/json");
    }
}, upload.array("media"), async (req, res) => {
    const media = req.files;
    if(Array.isArray(media) && media.length) {
        let data = {
            error: false,
            media: []
        };

        await Promise.all(media.map(async (content) => {
            let ext = path.extname(content.originalname);
            const dbres = await Uploads.insert({
                name: path.basename(content.filename, path.extname(content.filename)),
                title: path.basename(content.originalname, path.extname(content.originalname)),
                path: content.filename,
                mime: content.mimetype
            });

            if(dbres.success)
                data.media.push({success: true, data: {id: dbres.data[0].id, name:path.basename(content.filename, path.extname(content.filename)), title: path.basename(content.originalname, path.extname(content.originalname)), path: content.filename}});
            else data.media.push({success: false, data: "Couldn't add to DB"});
        }));

        res.json(data);
    } else {
        res.json({
            error: true,
            description: "No files provided"
        });
    }
});

router.post("/avatar", auth.isLoggedIn({redirectFailure: "/json"}), upload.single("avatar"), async (req, res) => {
    const media = req.file;
    if(media) {
        let data = {
            error: false,
            media: []
        };

        let ext = path.extname(media.originalname);
            const dbres = await Uploads.insert({
                name: path.basename(media.filename, path.extname(media.filename)),
                title: path.basename(media.originalname, path.extname(media.originalname)),
                path: media.filename,
                mime: media.mimetype,
                description: `${req.user.username}'s username`
            });

            if(dbres.success) {
                data.media.push({success: true, data: {id: dbres.data[0].id, name:path.basename(media.filename, path.extname(media.filename)), title: path.basename(media.originalname, path.extname(media.originalname)), path: media.filename}});
                let profile = await Profiles.get({user_id: req.session.user_id}, ["images", "id"]);
                if(!profile.success) {
                    await Profiles.insert({user_id: req.session.user_id, slug: req.user.username.toLowerCase().split(" ").join("_")});
                    profile = await Profiles.get({user_id: req.session.user_id}, ["images", "id"]);
                }

                let images = {
                    ...profile.data.images,
                    avatar: {url: `/upload/${media.filename}`, id: dbres.data[0].id}
                };

                const update = await Profiles.upsert(profile.data.id, {images});
                if(update.success)
                    data.media.push({success: true, data: "Avatar uploaded and set"});
                else {
                    data.media.push({success: false, data: "Couldn't set to profile"});
                    data.error = true;
                }
            }
            else {data.media.push({success: false, data: "Couldn't add to DB"}); data.error = true;}

        res.json(data);
    } else {
        res.json({
            error: true,
            description: "No files provided"
        });
    }
});

router.delete("/id/:id", auth.isLoggedIn({redirectFailure: "/json"}), (req, res, next) => {
    if(req.user.is_admin){
        next();
    }
    else {
        flash(req, {error: true, description: "You need to be admin to access here"});
        res.redirect("/json");
    }
}, async (req, res) => {
    let dbres = await Uploads.get(req.params.id);
    if(!dbres.success || !fs.existsSync(path.join(uploadPath, dbres.data.path))) {
        res.status(404).json({success: false, reason: "Resource not found"});
        return;
    }

    let linksDel = await PostUpload.removeAllLinked("posts", req.params.id);
    let dbdel = await Uploads.del(req.params.id);
    if(dbdel) {
        fs.unlink(path.join(uploadPath, dbres.data.path), (err) => {
            if(err) {
                console.error(err);
                res.status(500).json({success: false, reason: "File failed to delete from file system"});
            } else res.json({success: true});
        });
    } else 
        res.status(500).json({success: false, reason: "File failed to delete from DB"});
    
})

module.exports = router;