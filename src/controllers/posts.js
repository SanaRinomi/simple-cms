const {Posts, PostUpload, Categories, PostCategory, Uploads, PostProfile, Profiles} = require("./dbMain");
const {isMIME} = require("./uploads");

const fetchCategories = async function(post_id) {
    const linkedCats = await PostCategory.getLinked("categories", post_id);
    return linkedCats.success ? (await Promise.all(linkedCats.data.map(async v => {const cat = await Categories.get(v); return cat.success ? cat.data : null;}))).filter(v => v !== null) : [];
};

const fetchAuthors = async function(post_id) {
    const linkedAuthors = await PostProfile.getLinked("profiles", post_id);
    return linkedAuthors.success ? (await Promise.all(linkedAuthors.data.map(async v => {const author = await Profiles.get({user_id: v}); return author.success ? author.data : null;}))).filter(v => v !== null) : [];
};

const fetchPostUploads = async function(post_id) {
    const linkedUploads = await PostUpload.getLinked("upload", post_id);
    if(linkedUploads.success) {
        return (await Promise.all(linkedUploads.data.map(async v => {
            const dbQuery = await Uploads.get(v, ["id", "title", "path", "mime", "description"]);
            if(dbQuery.success) {
                return {...dbQuery.data, ...isMIME(dbQuery.data.mime)};
            } return null;
        }))).filter(v => v !== null);
    } return [];
}

const fetchPostJSON = async function(post, json = false) {
    const id = post.id;
    const categories = await fetchCategories(id);
    const authors = await fetchAuthors(id);
    const uploads = await fetchPostUploads(id);

    if(Array.isArray(post.content)) {
        post.content = post.content.map(v => {
            if(v.type === "upload" || v.type === "img") {
                const upload = uploads.find(vv => vv.id == v.id);
                return {type: "upload", data: json ? upload || JSON.parse(v.data) : JSON.stringify(upload) || v.data };
            } else return v;
        });
    }

    return {
        ...post,
        categories,
        authors,
        uploads
    }
}

module.exports = {
    fetchAuthors,
    fetchCategories,
    fetchPostUploads,
    fetchPostJSON
}