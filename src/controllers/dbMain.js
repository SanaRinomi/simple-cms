const pg = require("./dbKnex");
const {Table, LinkingTable} = require("./dbTable");
const path = require("path");

class UserTable extends Table {
    constructor() {
        super("users", table => {
            table.increments("id");
            table.string("username").unique().notNullable();
            table.string("password").notNullable();
            table.string("salt").notNullable();
            table.string("email").unique();
            table.timestamp('created_at').defaultTo(pg.fn.now());
            table.boolean("is_admin").defaultTo(false).notNullable();
            table.boolean("is_confirmed").defaultTo(false).notNullable();
        });

        this._generatedID = true;
        this._cache = true;
    }
}

class ProfileTable extends Table {
    constructor() {
        super("profiles", table => {
            table.increments("id");
            table.integer("user_id").unsigned().references("users.id").notNullable();
            table.string("slug").notNullable().unique();
            table.string("public_name");
            table.string("description");
            table.integer("pfp").unsigned().references("uploads.id").defaultTo(0);
            table.integer("pfc").unsigned().references("uploads.id").defaultTo(0);
            table.json("gender");
            table.date("birthday");
            table.json("links");
            table.timestamp('edited_at').defaultTo(pg.fn.now());
        });

        this._generatedID = true;
        this._timestamp = "edited_at";
        this._cache = true;
    }

    async getBySlug(slug) {
        const dbQuery = await this.get({slug});
        if(dbQuery && dbQuery.success)
            return dbQuery.data;
        else return;
    }
}

class CatTable extends Table {
    constructor() {
        super("categories", table => {
            table.increments("id");
            table.string("name").notNullable();
            table.string("slug").notNullable().unique();
            table.string("description");
            table.boolean("default");
        });

        this._generatedID = true;
    }

    async getDefault() {
        const dbQuery = await this.get({default: true});
        if(dbQuery && dbQuery.success)
            return dbQuery.data;
        else return;
    }

    async getBySlug(slug) {
        const dbQuery = await this.get({slug});
        if(dbQuery && dbQuery.success)
            return dbQuery.data;
        else return;
    }

    async insert(slug, data) {
        const dbCheck = await this.get({slug});
        if(dbCheck && dbCheck.success)
            return null;
        else {
            const dbQuery = await super.insert({slug, ...data}, ["id"]);
            if(dbQuery && dbQuery.success)
                return dbQuery.data[0].id;
            else return null;
        };
    }
}

class PostTable extends Table {
    constructor() {
        super("posts", table => {
            table.increments("id");
            table.string("title").notNullable();
            table.string("slug").notNullable().unique();
            table.string("description");
            table.json("content");
            table.integer("thumbnail").unsigned().references("uploads.id").defaultTo(0);
            table.timestamp('created_at').defaultTo(pg.fn.now());
            table.timestamp('edited_at').defaultTo(pg.fn.now());
        });

        this._generatedID = true;
        this._timestamp = "edited_at";
        this.uploadsTable;
        this._cache = true;
    }

    async getBySlug(slug) {
        const dbQuery = await this.get({slug});
        if(dbQuery && dbQuery.success)
            return dbQuery.data;
        else return;
    }

    async insert(slug, data) {
        const dbCheck = await this.get({slug});
        if(dbCheck && dbCheck.success)
            return null;
        else {
            if(!data.thumbnail) {
                const getThumbnail = await this.uploadsTable.getDefaultPostImg();
                if(getThumbnail) data.thumbnail = getThumbnail.id;
            }

            const dbQuery = await super.insert({slug, ...data}, ["id"]);
            if(dbQuery && dbQuery.success)
                return dbQuery.data[0].id;
            else return null;
        };
    }
}

class UploadsTable extends Table {
    constructor() {
        super("uploads", table => {
            table.increments("id");
            table.string("title"); 
            table.string("name"); 
            table.string("path").unique().notNullable();
            table.string("mime").notNullable();
            table.string("description");
            table.json("details");
            table.timestamp('created_at').defaultTo(pg.fn.now());

            table.boolean("default_pfp").defaultTo(false);
            table.boolean("default_pfc").defaultTo(false);
            table.boolean("default_post_thumbnail").defaultTo(false);
        });

        this._generatedID = true;
        this._cache = true;
    }

    async getDefaultPostImg() {
        const dbQuery = await this.get({default_post_thumbnail: true});
        if(dbQuery && dbQuery.success)
            return dbQuery.data;
        else return;
    }

    async getDefaultPFP() {
        const dbQuery = await this.get({default_pfp: true});
        if(dbQuery && dbQuery.success)
            return dbQuery.data;
        else return;
    }

    async getDefaultPFC() {
        const dbQuery = await this.get({default_pfc: true});
        if(dbQuery && dbQuery.success)
            return dbQuery.data;
        else return;
    }

    async getUserDefault() {
        const dbPFPQuery = await this.get({default_pfp: true});
        const dbPFCQuery = await this.get({default_pfc: true});
        
        let obj = {
            pfp: dbPFPQuery.success ? dbPFPQuery.data : null,
            pfc: dbPFCQuery.success ? dbPFCQuery.data : null
        };

        return obj;
    }
}

class CommentTable extends Table {
    constructor() {
        super("comments", table => {
            table.increments("id");
            table.integer("profile_id").unsigned().references("profiles.id").notNullable();
            table.integer("post_id").unsigned().references("posts.id").notNullable();
            table.json("content");
            table.timestamp('created_at').defaultTo(pg.fn.now());
            table.timestamp('edited_at').defaultTo(pg.fn.now());
        });

        this._generatedID = true;
        this._timestamp = "edited_at";
        this._cache = true;
    }
}

const Users = new UserTable();
const Profiles = new ProfileTable();
const Categories = new CatTable();
const Posts = new PostTable();
const Uploads = new UploadsTable();
const Comments = new CommentTable();
const PostProfile = new LinkingTable("l_posts_profiles", "post_id", "posts.id", "profile_id", "profiles.id");
const PostUpload = new LinkingTable("l_posts_uploads", "post_id", "posts.id", "upload_id", "upload.id");
const PostCategory = new LinkingTable("l_posts_cat", "post_id", "posts.id", "cat_id", "categories.id");

Posts.uploadsTable = Uploads;

Uploads.get(1).then(async v => {
    if(!v.success) {
        await Uploads.insert({
            name: "default",
            title: "Default",
            path: "default.png",
            mime: "image/png"
        });
    }
});

module.exports = {
    Users,
    Profiles,
    Categories,
    Posts,
    Comments,
    PostProfile,
    PostCategory,
    Uploads,
    PostUpload
}