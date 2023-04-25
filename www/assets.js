import { Shader } from "./gfx/shader.js";
import { gl } from "./gfx/gl.js";
import { Font } from "./gfx/text.js";
import { Texture } from "./gfx/texture.js";

let shapeVertSrc;
let shapeFragSrc;
let texVertSrc;
let texFragSrc;
let lightsVertSrc;
let lightsFragSrc;
let spriteVertSrc;
let spriteFragSrc;
let gammaFragSrc;

let shapeShader;
let texShader;

let arialFont;

const textures = {};

const shipPixelRatio = 406/512;

const srgbImageList = [
    "ship",
    "floor",
    "wall",
    "wall_triangle",
    "wall_triangle_corner",
    "flag",
]

const xyzImageList = [
    "ship_normal",
    "floor_normal",
    "wall_normal",
    "wall_triangle_normal",
    "wall_triangle_corner_normal",
]

async function loadAssets() {    
    // TODO: load assets in parallel


    // ========== SHADERS ==========
    shapeVertSrc = await requestText("assets/shaders/shape.vert");
    shapeFragSrc = await requestText("assets/shaders/shape.frag");

    texVertSrc = await requestText("assets/shaders/texture.vert");
    texFragSrc = await requestText("assets/shaders/texture.frag");

    lightsVertSrc = await requestText("assets/shaders/lights.vert");
    lightsFragSrc = await requestText("assets/shaders/lights.frag");

    spriteVertSrc = await requestText("assets/shaders/sprite.vert");
    spriteFragSrc = await requestText("assets/shaders/sprite.frag");

    gammaFragSrc = await requestText("assets/shaders/gamma.frag");

    shapeShader = new Shader(gl, shapeVertSrc, shapeFragSrc);
    texShader = new Shader(gl, texVertSrc, texFragSrc);

    // ========== IMAGES ==========
    for (let name of srgbImageList) {
        let img = await requestImage("assets/" + name + ".png");
        textures[name] = Texture.fromImage(img, true);
    }
    for (let name of xyzImageList) {
        let img = await requestImage("assets/" + name + ".png");
        textures[name] = Texture.fromImage(img, false);
    }

    // ========== FONTS ==========
    const arialFontImage = await requestImage("assets/arial.png");
    const arialCSVText = await requestText("assets/arial.csv");
    arialFont = new Font(arialFontImage, arialCSVText);
}

// TODO: reuse this function for conf.js
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

function getTexture(name) {
    return textures[name];
}

export {
    loadAssets,
    requestText,
    requestImage,
    getTexture,

    shapeVertSrc,
    shapeFragSrc,
    texVertSrc,
    texFragSrc,
    lightsVertSrc,
    lightsFragSrc,
    spriteVertSrc,
    spriteFragSrc,
    gammaFragSrc,

    shapeShader,
    texShader,

    shipPixelRatio,

    arialFont,
}