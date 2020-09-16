const pg = require("./dbKnex");
const {Table, LinkingTable} = require("./dbTable");

class UserTable extends Table {
    constructor() {
        super("users", table => {
            table.increments("id");
            table.string("username").unique().notNullable();
            table.string("password").notNullable();
            table.string("email");
            table.timestamp('created_at').defaultTo(pg.fn.now());
            table.boolean("is_admin").defaultTo(false).notNullable();
        });
    }
}

class ProfileTable extends Table {
    constructor() {
        super("profiles", table => {
            table.increments("id");
            table.integer("user_id").unsigned().references("users.id").notNullable();
            table.string("slug").notNullable();
            table.string("public_name");
            table.string("description");
            table.json("links");
        });
    }
}

class CatTable extends Table {
    constructor() {
        super("categories", table => {
            table.increments("id");
            table.string("name").notNullable();
            table.string("slug").notNullable();
            table.string("description");
        });
    }
}

class PostTable extends Table {
    constructor() {
        super("posts", table => {
            table.increments("id");
            table.string("title").notNullable();
            table.string("slug").notNullable();
            table.string("description");
            table.json("content");
            table.timestamp('created_at').defaultTo(pg.fn.now());
            table.timestamp('edited_at').defaultTo(pg.fn.now());
        });
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
    }
}

const Users = new UserTable();
const Profiles = new ProfileTable();
const Categories = new CatTable();
const Posts = new PostTable();
const Comments = new CommentTable();
const PostProfile = new LinkingTable("l_posts_profiles", "post_id", "posts.id", "profile_id", "profiles.id");
const PostCategory = new LinkingTable("l_posts_cat", "post_id", "posts.id", "cat_id", "categories.id");

module.exports = {
    Users,
    Profiles,
    Categories,
    Posts,
    Comments,
    PostProfile,
    PostCategory
}