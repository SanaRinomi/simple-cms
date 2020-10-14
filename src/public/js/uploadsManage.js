const uploads = document.getElementsByClassName("list-elem");

[...uploads].forEach(upload => {
    const del = upload.getElementsByClassName("button-delete")[0];
    const id = upload.getAttribute("upload-id");

    del.addEventListener("click", () => {
        fetch(`/upload/id/${id}`, {
            method: "DELETE"
        }).then((res) => {
            if(!res.ok) del.innerHTML = "Delete Failed";

            return res.json();
        }).then((res) => {
            if(res.success) upload.remove();
        });
    });
});