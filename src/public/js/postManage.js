const posts = document.getElementsByClassName("list-elem");

[...posts].forEach(post => {
    const del = post.getElementsByClassName("button-delete")[0];
    const update = post.getElementsByClassName("button-update")[0];
    const link = post.getElementsByClassName("list-link")[0];
    const title = post.getElementsByClassName("input-title")[0];

    del.addEventListener("click", () => {
        fetch(link.href, {
            method: "DELETE"
        }).then((res) => {
            if(!res.ok) del.innerHTML = "Delete Failed";

            return res.json();
        }).then((res) => {
            if(res.success) post.remove();
        });
    });

    update.addEventListener("click", () => {
        fetch(link.href,{
            method: "POST",
            body: "title=" + encodeURIComponent(title.value),
            credentials: 'same-origin',
            headers: new Headers({"content-type": "application/x-www-form-urlencoded; charset=UTF-8"})
        }).then((res) => {
            update.innerText = res.ok ? "Submitted" : res.statusText;
            if(res.ok) return res.json();
        }).then((res) => {
            if(res.success) link.getElementsByTagName("h4")[0].innerText = title.value;
        });
    });
});