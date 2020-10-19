
const slug = document.body.getAttribute("slug");

const detailsSect = document.getElementById("post-details");
const details = detailsSect.getElementsByClassName("editable-property");
const emptyTextNode = document.createElement("b");
let properties = [];

emptyTextNode.appendChild(document.createTextNode("Empty"));

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