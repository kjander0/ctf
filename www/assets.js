//let shipAlbedoTex = gfx.Texture.fromUrl("assets/ship.png", true);
//let shipNormalTex = gfx.Texture.fromUrl("assets/ship_normal.png", false);

// TODO: reuse this function for conf.js

let shipAlbedoTex;
let shipNormalTex;

let shapeVertSrc;
let shapeFragSrc;
let texVertSrc;
let texFragSrc;

async function loadAssets() {
    shipAlbedoTex = await requestImage("assets/ship.png");
    shipNormalTex = await requestImage("assets/ship_normal.png");

    shapeVertSrc = await requestText("assets/shaders/shape.vert");
    shapeFragSrc = await requestText("assets/shaders/shape.frag");
    texVertSrc = await requestText("assets/shaders/texture.vert");
    texFragSrc = await requestText("assets/shaders/texture.frag");
}

async function requestText(urlPath) {
    let url = window.location.origin + '/' + urlPath
    return new Promise(function(resolve, reject) {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.onload = function() { 
            if (xmlHttp.status == 200) {
                resolve(xmlHttp.responseText);
                return;
            }
            reject("failed to retrieve: " + url);
        }
        xmlHttp.open("GET", url, true); // true for asynchronous 
        xmlHttp.send(null);
    });
}

async function requestImage(urlPath) {
    let url = window.location.origin + '/' + urlPath
    return new Promise(function(resolve, reject) {
        const image = new Image();
        image.onload = () => {
            resolve(image);
        };
        image.onerror = () => {
            reject("failed to retrieve: " + url);
        };
        image.src = url;
    });
}

export {
    loadAssets,
    requestText,
    requestImage,
    shapeVertSrc,
    shapeFragSrc,
    texVertSrc,
    texFragSrc,
    //shipAlbedoTex,
    //shipNormalTex,
}