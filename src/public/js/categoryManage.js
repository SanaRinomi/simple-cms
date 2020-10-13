const catergories = document.getElementsByClassName("list-elem");

[...catergories].forEach(category => {
    const del = category.getElementsByClassName("button-delete")[0];
    const link = category.getElementsByClassName("list-link")[0];

    del.addEventListener("click", () => {
        fetch(link.href, {
            method: "DELETE"
        }).then((res) => {
            if(!res.ok) del.innerHTML = "Delete Failed";

            return res.json();
        }).then((res) => {
            console.log(res);
            if(res.success) category.remove();
        });
    });
});