import {ShelfRenderer, AlbumPicker, loadJSON} from './ShelfRenderer.js'

const button = document.getElementById("editButton")
const loader = new ldloader({root: "#my-loader"});

let el = document.getElementsByClassName("ShelfCanvas").item(0);
let sr = new ShelfRenderer(el, (shelfspot) => {
            return () => {
                sr.togglePause();
                openAlbumPicker(loader, (id) => {
                                    console.log(shelfspot)
                        sr.fetchAndReload("/shelfspot/set/", {
                            "playable_id": id,
                            "shelfspot_id": shelfspot.jsonData["id"]
                        })
                        disposeAlbumPickerDOM();
                        sr.togglePause()
                    },
                    (event) => sr.togglePause());
}});

loadJSON("/shelf_json/" + el.id.substring(11), (data) => {
    console.log(data)
    sr.loadFromJson.bind(sr)(data);
    button.addEventListener("click", sr.toggleEditMode.bind(sr));
}, console.log);


const editButton = document.getElementById("editButton")

function generateAlbumPickerDOM(onExit = (evt) => {
}) {
    let pauseMask = document.createElement("div");
    pauseMask.setAttribute("id", "pauseMask")
    pauseMask.setAttribute("class", "pauseMask")

    let albumPickerCanvas = document.createElement("canvas");
    albumPickerCanvas.setAttribute("id", "AlbumPicker");
    albumPickerCanvas.setAttribute("class", "AlbumPicker");

    const searchBar = document.getElementById("searchBar")
    searchBar.style.position = "absolute"

    editButton.after(pauseMask)
    pauseMask.after(albumPickerCanvas);
    pauseMask.onclick = onExit;
    return albumPickerCanvas;
}

function disposeAlbumPickerDOM() {
    let pauseMask = document.getElementById("pauseMask");
    let albumPickerCanvas = document.getElementById("AlbumPicker");
    const searchBar = document.getElementById("searchBar")
    searchBar.style.position = ""

    pauseMask.parentNode.removeChild(pauseMask)
    albumPickerCanvas.parentNode.removeChild(albumPickerCanvas)
}

function openAlbumPicker(loaderAnimation, onClickCallback, onExit = (event) => {
}) {
    let albumPickerCanvas = generateAlbumPickerDOM(
        (event) => {
            disposeAlbumPickerDOM();
            onExit(event)
        });

    let ap = new AlbumPicker(albumPickerCanvas, loaderAnimation, onClickCallback);

    const formEl = document.getElementById("searchQueryInput")
    const formButton = document.getElementById("searchQuerySubmit")
    const search = function () {
        console.log("Submit: ", formEl.value);
        loaderAnimation?.on()
        const query = "/album/library?search_txt=" + formEl.value;
        loadJSON(query, (data) => {
            ap.loadFromJson.bind(ap)(data, query);
            loaderAnimation?.off()
        },);
    }
    formEl.onkeydown = (event) => {
        if (event.code === "Enter") search()
    }
    formButton.onclick = (event) => {
        search()
    }

    loadJSON("/album/library/", (data) => {
        ap.loadFromJson.bind(ap)(data, "/album/library/?");
    },);
}