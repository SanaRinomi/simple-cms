Dropzone.autoDiscover = false;

// Post Content

const md = window.markdownit();
const submit = document.getElementById("post-submit");
const sectionsContainer = document.getElementById("post-container");
const slug = document.body.getAttribute("slug");
let counter = 0;

const uploadDataDefault = {
    id: 1,
    title: "",
    path: "",
    mime: "",
    description: "",
    type: "",
    image: false,
    video: false,
    audio: false,
    text: false,
    application: false,
    external: false
};

function Section(sectManager, position, type, data = null, elem = null) {
    this.sectManager = sectManager;
    this.position = position;
    this.type = type;
    this.data = type === "upload" ? data ? typeof data === "string" ? {...uploadDataDefault, ...JSON.parse(data)} : {...uploadDataDefault, ...data} : {...uploadDataDefault} : data ? data : "";
    this.elem = elem;
    this.dataElem = document.createElement("div");
    this.actionsElem = document.createElement("div");

    if(elem == null) {
        const sectionElem = document.createElement("section");
        sectManager.sectionContainer.appendChild(sectionElem);
        this.elem = sectionElem;
    } else this.elem.innerHTML = null;

    this.elem.appendChild(this.dataElem);
    this.elem.appendChild(this.actionsElem);

    if(data) this.view();
    else this.edit();

    const section = this;
    let copyButton = document.createElement("button");
    copyButton.classList.add("section-action");
    copyButton.innerText = "Duplicate";
    copyButton.addEventListener("click", (e) => {
        section.sectManager.clone(section.position);
    });
    this.elem.appendChild(copyButton);

    let moveUpButton = document.createElement("button");
    moveUpButton.classList.add("section-action");
    moveUpButton.innerText = "/\\";
    moveUpButton.addEventListener("click", (e) => {
        section.moveUp();
    });
    this.elem.appendChild(moveUpButton);

    let moveDownButton = document.createElement("button");
    moveDownButton.classList.add("section-action");
    moveDownButton.innerText = "\\/";
    moveDownButton.addEventListener("click", (e) => {
        section.moveDown();
    });
    this.elem.appendChild(moveDownButton);

    let killButton = document.createElement("button");
    killButton.classList.add("section-action");
    killButton.innerText = "Remove";
    killButton.addEventListener("click", (e) => {
        section.remove();
    });
    this.elem.appendChild(killButton);
}

Section.prototype.resetView = function() {
    const newDiv = document.createElement("div");
    this.dataElem.insertAdjacentElement("afterend", newDiv);
    this.dataElem.remove();
    this.dataElem = newDiv;
}

Section.prototype.view = function() {
    this.resetView();

    const section = this;
    this.dataElem.addEventListener("dblclick", function() {
        section.edit();
    })

    switch (this.type) {
        case "markdown":
            const render = md.render(this.data);
            this.dataElem.innerHTML = render;
            break;
    
        case "upload":
            let child;
            switch(this.data.type) {
                case "image":
                    child = document.createElement("img");
                    child.src = `/upload/${this.data.path}`;
                    child.setAttribute("alt", this.data.description);
                    break;

                case "video":
                    child = document.createElement("video");
                    let vidSrc = document.createElement("source");
                    vidSrc.src = `/upload/${this.data.path}`;
                    vidSrc.type = this.data.mime;
                    child.setAttribute("alt", this.data.description);
                    child.setAttribute("controls", true);
                    child.appendChild(vidSrc);
                    break;

                case "audio":
                    child = document.createElement("audio");
                    let audioSrc = document.createElement("source");
                    audioSrc.src = `/upload/${this.data.path}`;
                    audioSrc.type = this.data.mime;
                    child.setAttribute("alt", this.data.description);
                    child.setAttribute("controls", true);
                    child.appendChild(audioSrc);
                    break;

                case "text":
                case "application":
                    child = document.createElement("a");
                    child.innerHTML = `Open File: ${this.data.title}`;
                    child.href = `/upload/${this.data.path}`;
                    break;
            }
            this.dataElem.appendChild(child);
            break;
    }
}

Section.prototype.edit = function() {
    this.resetView();

    const section = this;

    const form = document.createElement("div");
    const formActions = document.createElement("div");
    const cancel = document.createElement("button");
    const submit = document.createElement("button");

    let formValue;

    cancel.innerText = "Cancel";
    cancel.addEventListener("click", () => {
        section.view();
    });

    submit.innerText = "Submit";
    submit.addEventListener("click", () => {
        section.submit(formValue);
    });

    formActions.appendChild(cancel);
    formActions.appendChild(submit);

    switch (this.type) {
        case "markdown":
            const mdEdit = document.createElement("textarea");
            mdEdit.value = this.data;
            mdEdit.addEventListener("change", () => {
                formValue = mdEdit.value;
            });
            form.appendChild(mdEdit);
            break;
    
        case "upload":
            const uploadEdit = document.createElement("input");
            uploadEdit.type = "file";
            uploadEdit.addEventListener("change", () => {
                formValue = uploadEdit.files;
            })
            form.appendChild(uploadEdit);
            break;
    }

    this.dataElem.appendChild(form);
    this.dataElem.appendChild(formActions);
}

Section.prototype.submit = function(data) {
    if(!data && !this.data) {this.remove(false); return;}
    else if(!data) {this.view(); return;}

    switch (this.type) {
        case "upload":
            let fileData = new FormData();
            if(data) [...data].forEach(v => {
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
                    this.view();
                    return;
                }
                
                this.data = {...res.media[0].data, external: false};
                this.view();
                this.sectManager.submit();
            });
            break;
        
        case "markdown":
        default:
            this.data = data;
            this.view();
            this.sectManager.submit();
            break;
    }
}

Section.prototype.moveUp = function() {
    this.sectManager.move(this.position, this.position-1);
}

Section.prototype.moveDown = function() {
    this.sectManager.move(this.position, this.position+1);
}

Section.prototype.remove = function(register = true) {
    this.elem.remove();
    this.data = null;
    this.type = null;
    if(register) this.sectManager.remove(this.position);
}

Section.clone = function(section) {
    const sectManager = section.sectManager;
    const position = section.position+1;
    const type = section.type;
    const data = section.data;
    const elem = document.createElement("section");
    section.elem.insertAdjacentElement("afterend", elem);

    return new Section(sectManager, position, type, data, elem);
}

function SectionManager(sectionCoantainer, preloadedSects = []) {
    this.sections = [];
    this.sectionContainer = sectionCoantainer;
    
    for (let i = 0; i < preloadedSects.length; i++) {
        const section = preloadedSects[i];
        
        const type = section.getAttribute("section-type");
        let data = section.innerHTML;

        this.register(type, data, section);
    }
};

SectionManager.prototype.remove = function(position) {
    this.sections.splice(position, 1);

    for (let i = position; i < this.sections.length; i++) {
        this.sections[i].position = i;
    }
    
    this.submit();
}

SectionManager.prototype.move = function(oldPos, newPos) {
    if(newPos < 0 || newPos >= this.sections.length || oldPos == newPos) return;

    let section = this.sections[oldPos];
    section.position = newPos;
    this.sections.splice(oldPos, 1);
    this.sections.splice(newPos, 0, section);

    if(oldPos > newPos) {
        this.sections[newPos+1].elem.insertAdjacentElement("beforebegin", section.elem);
        for (let i = newPos+1; i < this.sections.length; i++) {
            this.sections[i].position = i;
        }
    } else {
        this.sections[newPos-1].elem.insertAdjacentElement("afterend", section.elem);
        for (let i = newPos-1; i >= this.sections.length; i--) {
            this.sections[i].position = i;
        }
    }

    this.submit();
}

SectionManager.prototype.register = function(type, data, elem = null) {
    let section = new Section(this, this.sections.length, type, data, elem);

    this.sections.push(section);
}

SectionManager.prototype.clone = function(position) {
    if(position < 0 && position >= this.sections.length) return;

    const refElem = this.sections[position];
    const cloneElem = Section.clone(refElem);

    this.sections.splice(position+1, 0, cloneElem);

    for (let i = position+2; i < this.sections.length; i++) {
        this.sections[i].position = i;
    }
}

SectionManager.prototype.submit = function() {
    let data = [];

    for (let i = 0; i < this.sections.length; i++) {
        const section = this.sections[i];
        const type = section.type;
        data.push(encodeURIComponent(`content[${i}][type]`) + "=" + encodeURIComponent(type));
        switch(type) {
            case "upload":
                data.push(encodeURIComponent(`content[${i}][data]`) + "=" + encodeURIComponent(JSON.stringify({path: section.data.path, type: section.data.type, external: section.data.external})));
                if(section.data.id) data.push(encodeURIComponent(`content[${i}][id]`) + "=" + encodeURIComponent(section.data.id));
                break;
            case "markdown":
            default:
                data.push(encodeURIComponent(`content[${i}][data]`) + "=" + encodeURIComponent(section.data));
                break;
        }
    }

    fetch(`/admin/posts/${slug}`,{
        method: "POST",
        body: data.join("&"),
        credentials: 'same-origin',
        headers: new Headers({"content-type": "application/x-www-form-urlencoded; charset=UTF-8"})
    }).then((res) => {
        console.log(`Form submitted: ${res.ok}`);
        if(res.ok) return res.json();
    }).then((res) => {
    });
}

var Manager = new SectionManager(sectionsContainer, [...document.getElementsByClassName("loaded")]);

const sectCreate = {
    form: document.getElementById("section-select"),
    select: document.getElementById("s-sect-type"),
    submit: document.getElementById("s-create")
};

sectCreate.submit.addEventListener("click", (e) => {
    e.preventDefault();
    const type = sectCreate.select.options[sectCreate.select.selectedIndex].value;
    Manager.register(type);
});

/**
[...document.getElementsByClassName("loaded")].forEach(v => {
    const type = v.getAttribute("section-type");
    v.removeAttribute("section-type");
    let data = v.innerHTML;
    v.innerHTML = null;
    v.classList.remove("loaded");
    let child;

    switch (type) {
        case "upload":
            data = JSON.parse(data);
            switch(data.type) {
                case "image":
                    child = document.createElement("img");
                    child.src = `/upload/${data.path}`;
                    child.setAttribute("alt", data.description);
                    break;

                case "video":
                    child = document.createElement("video");
                    let vidSrc = document.createElement("source");
                    vidSrc.src = `/upload/${data.path}`;
                    vidSrc.type = data.mime;
                    child.setAttribute("alt", data.description);
                    child.setAttribute("controls", true);
                    child.appendChild(vidSrc);
                    break;

                case "audio":
                    child = document.createElement("audio");
                    let audioSrc = document.createElement("source");
                    audioSrc.src = `/upload/${data.path}`;
                    audioSrc.type = data.mime;
                    child.setAttribute("alt", data.description);
                    child.setAttribute("controls", true);
                    child.appendChild(audioSrc);
                    break;

                case "text":
                case "application":
                    child = document.createElement("a");
                    child.innerHTML = `Open File: ${data.title}`;
                    child.href = `/upload/${data.path}`;
                    break;
            }

            child.setAttribute("section-type", type);
            child.classList.add("post-section");
            child.setAttribute("content-id", data.id);
            v.appendChild(child);
            break;
        case "markdown":
        default:
            child = document.createElement("textarea");
            child.setAttribute("section-type", type);
            child.classList.add("post-section");
            v.appendChild(child);
            child.value = data;
            break;
    }
});


const sectCreate = {
    form: document.getElementById("section-select"),
    select: document.getElementById("s-sect-type"),
    submit: document.getElementById("s-create")
};

let sendPost = () => {
    const sections = document.getElementsByClassName("post-section");
    let data = [];

    for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const type = section.getAttribute("section-type") || "markdown";
        data.push(encodeURIComponent(`content[${i}][type]`) + "=" + encodeURIComponent(type));
        switch(type) {
            case "upload":
                data.push(encodeURIComponent(`content[${i}][data]`) + "=" + encodeURIComponent(section.src));
                data.push(encodeURIComponent(`content[${i}][id]`) + "=" + encodeURIComponent(section.getAttribute("content-id")));
                break;
            case "markdown":
            default:
                data.push(encodeURIComponent(`content[${i}][data]`) + "=" + encodeURIComponent(section.value));
                break;
        }
    }

    fetch(`/admin/posts/${slug}`,{
        method: "POST",
        body: data.join("&"),
        credentials: 'same-origin',
        headers: new Headers({"content-type": "application/x-www-form-urlencoded; charset=UTF-8"})
    }).then((res) => {
        submit.innerText = res.ok ? "Submitted" : res.statusText;
        if(res.ok) return res.json();
    }).then((res) => {
    });
}



sectCreate.submit.addEventListener("click", (e) => {
    e.preventDefault();

    const newSect = document.createElement("section");
    sectionsContainer.appendChild(newSect);

    let child;

    switch(sectCreate.select.options[sectCreate.select.selectedIndex].value) {
        case "text":
            child = document.createElement("textarea");
            child.setAttribute("section-type", "markdown");
            child.classList.add("post-section");
            newSect.appendChild(child);
            break;
        case "upload":
            child = document.createElement("form");
            newSect.appendChild(child);
            const imgSelect = document.createElement("input");
            imgSelect.type = "file";
            imgSelect.classList.add("media");
            const imgSubmit = document.createElement("button");
            imgSubmit.type = "submit";
            imgSubmit.innerText = "Upload File";
            child.appendChild(imgSelect);
            child.appendChild(imgSubmit);
            child.addEventListener("submit", (e) => {
                e.preventDefault();
                const data = new FormData();
                const fileInputs = [...child.getElementsByClassName("media")];
                let files = [];
                fileInputs.forEach(v => {
                    if(v.files) [...v.files].forEach(vv => {
                        files.push(vv);
                    })
                });

                files.forEach((v) => {
                    data.append(`media`, v, v.name);
                });

                fetch("/upload", {
                    method: "POST",
                    body: data
                }).then(res => {
                    if(res.ok) return res.json();
                    else return;
                }).then(res => {
                    if(!res || res.error) {
                        console.error(res);
                        return;
                    }
                    const img = document.createElement("img");
                    img.src = `/upload/${res.media[0].data.path}`;
                    img.setAttribute("section-type", "img");
                    img.setAttribute("content-id", res.media[0].data.id);
                    img.classList.add("post-section");
                    newSect.insertBefore(img, child);
                    child.remove();
                });
            })
            break;
    }

    sectionButtons(newSect);
})

submit.addEventListener("click", sendPost);

*/

// Post Details
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
                property.value = res.media[0].data.id;
                fetch(`/admin/posts/${slug}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: (encodeURIComponent(property.name) + "=" + encodeURIComponent(res.media[0].data.id))
                }).then(res => {
                    if(!res.ok) console.error("Response failed");

                    return;
                }).then(res => {
                    createSetProperty(property);
                });
            });
            break;
        
        case "textbox":
        case "text":
        default:
            fetch(`/admin/posts/${slug}`, {
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
            fileLink.href = `/upload/id/${property.value}`;
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
    fetch(`/admin/posts/${slug}`, {
        method: "DELETE"
    }).then((res) => {
        if(!res.ok) del.innerHTML = "Delete Failed";

        return res.json();
    }).then((res) => {
        if(res.success) window.location.replace("/admin");
    });
});