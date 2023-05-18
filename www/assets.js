import { Shader } from "./gfx/shader.js";
import { gl } from "./gfx/gl.js";
import { Font } from "./gfx/text.js";
import { Texture, TextureArray } from "./gfx/texture.js";

let shapeVertSrc;
let shapeFragSrc;
let texVertSrc;
let texFragSrc;
let texArrayVertSrc;
let texArrayFragSrc;
let lightsVertSrc;
let lightsFragSrc;
let spriteVertSrc;
let spriteFragSrc;
let gammaFragSrc;

let shapeShader;
let texShader;
let texArrayShader;
let particleShader;

let albedoAtlas;
let normalAtlas;

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

    texArrayVertSrc = await requestText("assets/shaders/texture_array.vert");
    texArrayFragSrc = await requestText("assets/shaders/texture_array.frag");

    lightsVertSrc = await requestText("assets/shaders/lights.vert");
    lightsFragSrc = await requestText("assets/shaders/lights.frag");

    spriteVertSrc = await requestText("assets/shaders/sprite.vert");
    spriteFragSrc = await requestText("assets/shaders/sprite.frag");

    const particleVertSrc = await requestText("assets/shaders/particle.vert");
    const particleFragSrc = await requestText("assets/shaders/particle.frag");


    gammaFragSrc = await requestText("assets/shaders/gamma.frag");

    shapeShader = new Shader(shapeVertSrc, shapeFragSrc);
    texShader = new Shader(texVertSrc, texFragSrc);
    texArrayShader = new Shader(texArrayVertSrc, texArrayFragSrc);
    particleShader = new Shader(particleVertSrc, particleFragSrc);

    // ========== TEXTURES ==========
    albedoAtlas = await loadAtlas("assets/albedo_atlas.png", "assets/albedo_atlas.json", true);
    normalAtlas = await loadAtlas("assets/normal_atlas.png", "assets/normal_atlas.json", false);

    const flagImage = await requestImage("assets/flag.png");
    textures["flag"] = Texture.fromImage(flagImage, true);
    // ========== FONTS ==========
    const arialFontTexture = Texture.fromImage(await requestImage("assets/arial.png"), false, false);
    const arialCSVText = await requestText("assets/arial.csv");
    arialFont = new Font(arialFontTexture, arialCSVText);
}

async function loadAtlas(imgPath, infoPath, srgb) {
    const img = await requestImage(imgPath);
    const txt = await requestText(infoPath);
    return await TextureArray.load(img, txt, srgb);
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
    texArrayFragSrc,
    lightsVertSrc,
    lightsFragSrc,
    spriteVertSrc,
    spriteFragSrc,
    gammaFragSrc,

    shapeShader,
    texShader,
    texArrayShader,
    particleShader,

    albedoAtlas,
    normalAtlas,

    shipPixelRatio,

    arialFont,
}