import { Shader } from "./gfx/shader.js";
import { gl } from "./gfx/gl.js";
import { Font } from "./gfx/text.js";

// TODO: Automate all this for each time a new asset is added
let shipAlbedoImage;
let shipNormalImage;
let floorAlbedoImage;
let floorNormalImage;
let wallAlbedoImage;
let wallNormalImage;
let cornerTriangleAlbedoImage;
let cornerTriangleNormalImage;
let triangleAlbedoImage;
let triangleNormalImage;
let flagImage;

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

const shipPixelRatio = 406/512;

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
    shipAlbedoImage = await requestImage("assets/ship.png");
    shipNormalImage = await requestImage("assets/ship_normal.png");

    floorAlbedoImage = await requestImage("assets/floor.png");
    floorNormalImage = await requestImage("assets/floor_normal.png");

    wallAlbedoImage = await requestImage("assets/wall.png");
    wallNormalImage = await requestImage("assets/wall_normal.png");

    cornerTriangleAlbedoImage = await requestImage("assets/wall_triangle_corner.png");
    cornerTriangleNormalImage = await requestImage("assets/wall_triangle_corner_normal.png");

    triangleAlbedoImage = await requestImage("assets/wall_triangle.png");
    triangleNormalImage = await requestImage("assets/wall_triangle_normal.png");
    
    flagImage = await requestImage("assets/flag.png");


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

export {
    loadAssets,
    requestText,
    requestImage,

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

    shipAlbedoImage,
    shipNormalImage,
    floorAlbedoImage,
    floorNormalImage,
    wallAlbedoImage,
    wallNormalImage,
    cornerTriangleAlbedoImage,
    cornerTriangleNormalImage,
    triangleAlbedoImage,
    triangleNormalImage,
    shipPixelRatio,
    flagImage,

    arialFont,
}