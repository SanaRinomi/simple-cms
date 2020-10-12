Dropzone.autoDiscover = false;

const submit = document.getElementById("post-submit");
const sectionsContainer = document.getElementById("post-container");
const slug = document.body.getAttribute("slug");
let counter = 0;

let sectionButtons = (section) => {
    let copyButton = document.createElement("button");
    copyButton.classList.add("section-action");
    copyButton.innerText = "Duplicate";
    copyButton.addEventListener("click", (e) => {
        const parent = e.target.parentNode;
        const clone = parent.cloneNode(true);
        parent.insertAdjacentElement("afterend", clone);
        [...clone.getElementsByClassName("section-action")].forEach(v => {
            v.remove();
        });
        sectionButtons(clone);
    });
    section.appendChild(copyButton);

    let moveUpButton = document.createElement("button");
    moveUpButton.classList.add("section-action");
    moveUpButton.innerText = "/\\";
    moveUpButton.addEventListener("click", (e) => {
        const parent = e.target.parentNode;
        const sibling = parent.previousElementSibling;
        sibling.insertAdjacentElement("beforebegin", parent);
    });
    section.appendChild(moveUpButton);

    let moveDownButton = document.createElement("button");
    moveDownButton.classList.add("section-action");
    moveDownButton.innerText = "\\/";
    moveDownButton.addEventListener("click", (e) => {
        const parent = e.target.parentNode;
        const sibling = parent.nextElementSibling;
        sibling.insertAdjacentElement("afterend", parent);
    });
    section.appendChild(moveDownButton);

    let killButton = document.createElement("button");
    killButton.classList.add("section-action");
    killButton.innerText = "Remove";
    killButton.addEventListener("click", (e) => {
        const parent = e.target.parentNode;
        parent.remove();
    });
    section.appendChild(killButton);
}

[...document.getElementsByClassName("loaded")].forEach(v => {
    const type = v.getAttribute("section-type");
    v.removeAttribute("section-type");
    const data = v.innerHTML;
    v.innerHTML = null;
    v.classList.remove("loaded");
    let child;

    switch (type) {
        case "img":
            child = document.createElement("img");
            child.setAttribute("section-type", type);
            child.classList.add("post-section");
            child.src = data;
            child.setAttribute("content-id", v.getAttribute("content-id"));
            v.removeAttribute("content-id");
            v.appendChild(child);
            child.value = data;
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

    sectionButtons(v);
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
            case "img":
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
        if(res.ok)return res.json();
    }).then((res) => {
        console.log(res);
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
        case "img":
            child = document.createElement("form");
            newSect.appendChild(child);
            const imgSelect = document.createElement("input");
            imgSelect.type = "file";
            imgSelect.classList.add("media");
            const imgSubmit = document.createElement("button");
            imgSubmit.type = "submit";
            imgSubmit.innerText = "Upload Image";
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