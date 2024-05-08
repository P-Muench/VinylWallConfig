import {ShelfRenderer, loadJSON} from './ShelfRenderer.js'

const loader = new ldloader({root: "#my-loader"});

for (let i = 0; i < document.getElementsByClassName("ShelfCanvasSmall").length; i++) {
    let el = document.getElementsByClassName("ShelfCanvasSmall").item(i);
    let sr = new ShelfRenderer(el, null);

    loadJSON("/shelf_json/" + el.id.substring(11), (data) => {
        loader.on()
        sr.loadFromJson.bind(sr)(data);
        loader.off()
    }, console.log);

}
