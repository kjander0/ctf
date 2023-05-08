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

    await loadAtlasTextures("albedo_atlas", true);
    await loadAtlasTextures("normal_atlas", false);

    // ========== FONTS ==========
    const arialFontTexture = getTexture("arial");
    const arialCSVText = await requestText("assets/arial.csv");
    arialFont = new Font(arialFontTexture, arialCSVText);
}

async function loadAtlasTextures(name, srgb) {
    const atlasImage = await requestImage("assets/" + name + ".png");
    const atlasTex = Texture.fromImage(atlasImage, srgb);
    const atlasInfo = JSON.parse(await requestText("assets/" + name + ".json"));
    for (let [name, info] of Object.entries(atlasInfo.frames)) {
        console.assert(!info.rotated);
        const subTex = atlasTex.subTexture(info.frame.x, info.frame.y, info.frame.w, info.frame.h);
        subTex.srcOffsetX = info.spriteSourceSize.x;
        subTex.srcOffsetY = info.sourceSize.h - (info.spriteSourceSize.y + info.spriteSourceSize.h);
        if (info.trimmed) {
            console.log(name + " was trimmed ", subTex.srcOffsetX, subTex.srcOffsetY);
        }
        textures[name] = subTex;
    }
}

// TODO: reuse this function for conf.js
async function requestText(urlPath) {
    return (await request(urlPath)).responseText;
}

async function request(urlPath, responseType="") {
    let url = window.location.origin + '/' + urlPath
    return new Promise(function(resolve, reject) {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.responseType = responseType;
        xmlHttp.onload = function() { 
            if (xmlHttp.status == 200) {
                resolve(xmlHttp);
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
    const tex = textures[name];
    if (tex === undefined) {
        throw "texture not defined: " + name;
    }
    return tex;
}

export {
    loadAssets,
    requestText,
    requestImage,
    request,
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