
const slug = document.body.getAttribute("slug");

const detailsSect = document.getElementById("post-details");
const details = detailsSect.getElementsByClassName("editable-property");
const emptyTextNode = document.createElement("b");
let properties = [];

const addPosts = document.getElementById("add-posts");
const postList = document.getElementById("posts");

emptyTextNode.appendChild(document.createTextNode("Empty"));

function removePost(post, button, post_slug) {
    button.addEventListener("click", (e) => {
        e.preventDefault();

        const body = ("add="+encodeURIComponent("off"));

        fetch(`/admin/categories/${slug}/${post_slug}`, {method: "POST", headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        }, body }).then(res => {
            if(res.ok) return res.json();
            else return;
        }).then(res => {
            if(res.success) {
                const options = document.getElementById("add-post-select");
                const option = document.createElement("option");
                const set_slug = post_slug;

                const img = document.getElementsByTagName("img");
                const src = img && img[0] ? img[0].getAttribute("thumbnail") : null; 

                console.log(src);

                option.value = set_slug;
                option.id = set_slug+"-add";
                option.innerText = document.getElementsByTagName("h4")[0].innerText;
                if(src) option.setAttribute("thumbnail", src);

                options.appendChild(option);
                post.remove();
            }
        });
    })
}

function addPostsEvent(form) {
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const options = document.getElementById("add-post-select");
        const select = options.options[options.selectedIndex];

        const body = ("add="+encodeURIComponent("on"));

        fetch(`/admin/categories/${slug}/${select.value}`, {method: "POST", headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        }, body }).then(res => {
            if(res.ok) return res.json();
            else return;
        }).then((res) => {
            if(res && res.success) {
                const ptitle = select.innerText;
                const pslug = select.value;
                const pthumbnail = select.getAttribute("thumbnail");

                const section = document.createElement("section");
                postList.appendChild(section);

                const link = document.createElement("a");
                link.href = "/admin/posts/"+pslug;
                link.classList.add("list-link");
                section.appendChild(link);

                const container = document.createElement("section");
                container.style = "display: flex; flex-direction: row;";
                link.appendChild(container);

                const img = pthumbnail ? document.createElement("img") : null;
                if(img) {
                    img.src = "/upload/id/"+pthumbnail;
                    img.setAttribute("thumbnail", pthumbnail);
                    img.height = 100;
                    img.width = 100;
                    img.style = "padding: 5px;";
                    container.appendChild(img);
                }

                const titleElem = document.createElement("h4");
                titleElem.innerText = ptitle;
                titleElem.style = "padding: 5px;";
                container.appendChild(titleElem);

                const viewAs = document.createElement("a");
                viewAs.href = "/posts/"+pslug;
                section.appendChild(viewAs);

                const unlinkButton = document.createElement("button");
                unlinkButton.innerHTML = "Unlink";
                unlinkButton.classList.add("button-unlink");
                viewAs.appendChild(unlinkButton);

                const viewAsButton = document.createElement("button");
                viewAsButton.innerHTML = "View Post as User";
                viewAsButton.classList.add("button-goto");
                viewAs.appendChild(viewAsButton);

                removePost(section, unlinkButton, pslug);

                select.remove();
            }
        });
    });
}

const listing = document.getElementsByClassName("post-listing");
if(listing) [...listing].map(v => {
    const unlink = v.getElementsByClassName("button-unlink")[0];
    const slug = v.getAttribute("slug");
    removePost(v, unlink, slug);
})

if(addPosts) addPostsEvent(addPosts)

const propertySubmit = function(property) {
    const field = property.elem.getElementsByClassName("field")[0];

    switch(property.type) {
        case "file":
            let fileData = new FormData();
            if(field.files) [...field.files].forEach(v => {
                fileData.append(`media`, v, v.name);
            });
            
            fetch("/upload", {
                method: "POST",
                body: fileData
            }).then(res => {
                if(res.ok) return res.json();
                else return;
            }).then(res => {
                if(!res || res.error) {
                    console.error(res);
                    createSetProperty(property);
                    return;
                }
                property.value = `/upload/${res.media[0].data.path}`;

                let obj = JSON.stringify({url: `/upload/${res.media[0].data.path}`, description: "", id: res.media[0].data.id});

                fetch(`/admin/categories/${slug}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: (encodeURIComponent(property.name) + "=" + encodeURIComponent(obj))
                }).then(res => {
                    if(!res.ok) console.error("Response failed");
                    return res.json();
                }).then(res => {
                    createSetProperty(property);
                });
            });
            break;
        
        case "textbox":
        case "text":
        default:
            fetch(`/admin/categories/${slug}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: (encodeURIComponent(property.name) + "=" + encodeURIComponent(field.value))
            }).then(res => {
                if(!res.ok) console.error("Response failed");
                return res.json();
            }).then(res => {
                if(!res || !res.success || res.error) 
                    console.error(res);
                else property.value = field.value;
                createSetProperty(property);
            });
            break;
    }
};

const createEditProperty = function(property) {
    while (property.elem.firstChild) {
        property.elem.removeChild(property.elem.lastChild);
    }

    switch (property.type) {
        case "file":
            let fileUpload = document.createElement("input");
            fileUpload.type = "file";
            fileUpload.classList.add("field");
            property.elem.appendChild(fileUpload);
            break;
        
        case "textbox":
            let textboxUpload = document.createElement("textarea");
            textboxUpload.setAttribute("type", "textbox");
            textboxUpload.value = property.value;
            textboxUpload.classList.add("field");
            property.elem.appendChild(textboxUpload);
            break;
        case "text":
        default:
            let textUpload = document.createElement("input");
            textUpload.type = "text";
            textUpload.value = property.value;
            textUpload.classList.add("field");
            property.elem.appendChild(textUpload);
            break;
    }

    const cancelButton = document.createElement("button");
    cancelButton.appendChild(document.createTextNode("Cancel"));
    cancelButton.addEventListener("click", () => {
        createSetProperty(property);
    });
    property.elem.appendChild(cancelButton);

    const submitButton = document.createElement("button");
    submitButton.appendChild(document.createTextNode("Submit"));
    submitButton.addEventListener("click", () => {
        propertySubmit(property);
    });
    property.elem.appendChild(submitButton);
};

const createSetProperty = function(property) {
    while (property.elem.firstChild) {
        property.elem.removeChild(property.elem.lastChild);
    }

    switch (property.type) {
        case "file":
            let fileLink = document.createElement("a");
            fileLink.appendChild(document.createTextNode("View File"));
            fileLink.href = property.value;
            property.elem.appendChild(fileLink);
            break;
        
        case "textbox":
        case "text":
        default:
            let textNode = document.createElement("p");
            textNode.appendChild(property.value ? document.createTextNode(property.value) : emptyTextNode.cloneNode(true));
            property.elem.appendChild(textNode)
            break;
    }

    const editButton = document.createElement("button");
    editButton.appendChild(document.createTextNode("Edit"));
    editButton.addEventListener("click", () => {
        createEditProperty(property);
    });
    property.elem.appendChild(editButton);
};

[...details].forEach((detail, i) => {
    let obj = {};

    obj.elem = detail;
    obj.type = detail.getAttribute("type");
    obj.value = detail.getAttribute("value");
    obj.name = detail.getAttribute("name");

    createSetProperty(obj);

    properties.push(obj);
});

// Delete Post

document.getElementById("button-delete").addEventListener("click", () => {
    fetch(`/admin/categories/${slug}`, {
        method: "DELETE"
    }).then((res) => {
        if(!res.ok) document.getElementById("button-delete").innerHTML = "Delete Failed";

        return res.json();
    }).then((res) => {
        if(res.success) window.location.replace("/admin");
    });
});