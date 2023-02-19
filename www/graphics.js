import {lerpVec, extrapolateVec} from "./interpolate.js";
import { Vec } from "./math.js";
import {Map} from "./map.js";
import * as conf from "./conf.js";

class Graphics {
    pixiApp;
    camContainer;
    screenRect;
    lineGfx = new PIXI.Graphics();
    uiGfx = new PIXI.Graphics();

    constructor(pixiApp) {
        console.log(pixiApp);
        this.pixiApp = pixiApp;
        this.screenRect = pixiApp.screen;
        this.camContainer = new PIXI.Container();
        this.camContainer.scale.set(1, -1);
        pixiApp.stage.addChild(this.camContainer);
        pixiApp.stage.addChild(this.uiGfx);
        this.camContainer.addChild(this.lineGfx);
        pixiApp.renderer.on("resize", (w, h) => { this.resize(w, h) });
        this.resize(this.screenRect.width, this.screenRect.height);
    }

    moveCamera(x, y) {
        let centreOffsetX = x - this.screenRect.width/2;
        let centreOffsetY = y - this.screenRect.height/2;
        this.camContainer.position.x = -centreOffsetX;
        this.camContainer.position.y = this.screenRect.height + centreOffsetY;
    }

    unproject(pos) {
        let p = new PIXI.Point(pos.x, pos.y);
        let m = this.camContainer.localTransform;
        m.applyInverse(p, p);
        return new Vec(p.x, p.y);
    }

    resize(screenWidth, screenHeight) {
        console.log("resize: ", screenWidth, screenHeight);
        this.moveCamera(screenWidth/2, screenHeight/2);
    }

    addPlayer() {
        const geometry = new PIXI.Geometry()
            .addAttribute('aVertexPosition', // the attribute name
                [   0, 0,
                    30, 0,
                    30, 30,
                    0, 30],
                2)
            .addAttribute('aTextureCoord',
                [   0, 0,
                    1, 0,
                    1, 1,
                    0, 1],
                2)
            .addIndex([0, 1, 2, 0, 2, 3]);
        
        const vertSrc = `
precision highp float;
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat3 projectionMatrix;

varying vec2 vTextureCoord;

void main(void){
   gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
   vTextureCoord = aTextureCoord;
}`;

        const fragSrc = `
precision mediump float;
varying vec2 vTextureCoord;

uniform sampler2D uSampler;

void main(void) {
    gl_FragColor = texture2D(uSampler, vTextureCoord);
}`;

        const tex = PIXI.Texture.from('assets/ship.png');

        const uniforms = {
            uSampler: tex,
        };

        const shader = PIXI.Shader.from(vertSrc, fragSrc, uniforms);
        console.log(shader.program.vertexSrc);
        const quad = new PIXI.Mesh(geometry, shader);
        const quadContainer = new PIXI.Container();
        quadContainer.addChild(quad);
        quadContainer.x = 200;
        this.camContainer.addChild(quadContainer);
        console.log(quad);
        return quadContainer;

        // let sprite = PIXI.Sprite.from('assets/ship.png');
        // sprite.anchor.set(0.5);
        // sprite.width = 30;
        // sprite.height = 30;
        // this.camContainer.addChild(sprite);
        // return sprite;
    }

    addCircle(color, fill=true) {
        // TODO: reuse pixi.Geometry for each instance of a drawable
        let p = new PIXI.Graphics();
        if (fill) {
            p.beginFill(color);
        } else {
            p.lineStyle(1, color);
        }
        p.drawCircle(0, 0, 10);
        if (fill) {
            p.endFill();
        }
        this.camContainer.addChild(p);
        return p;
    }

    addLevel(rows) {
        let g = new PIXI.Graphics();
        g.beginFill(0x555555);
        for (let r = 0; r < rows.length; r++) {
            for (let c = 0; c < rows[r].length; c++) {
                if (rows[r][c] !== Map.WALL) {
                    continue;
                }
                g.drawRect(c * conf.TILE_SIZE, (r) * conf.TILE_SIZE, conf.TILE_SIZE, conf.TILE_SIZE);
            }
        }
        this.camContainer.addChild(g);
    }

    addHit(pos) {
        let g = new PIXI.Graphics();
        g.beginFill(0xff0000);
        g.drawCircle(pos.x, pos.y, 2);
        g.endFill();
        this.camContainer.addChild(g);
        return g;
    }

    remove(graphic) {
        this.camContainer.removeChild(graphic);
        graphic.destroy();
    }

    update(world) {
        // TODO SPRITE RENDERING
        // use meshses and attach shaders to them
        // renderer.render() draw all normal maps to a texture (what resolution?)
        // normals texture as input, loop through lights to draw normal map lighting
        // feed normal map lighting into filter for final rendering


        let lerpFraction = world.accumMs/conf.UPDATE_MS;
        let lerpPos = lerpVec(world.player.prevPos, world.player.pos, lerpFraction);
        world.player.graphic.x = lerpPos.x;
        world.player.graphic.y = lerpPos.y;
        world.player.lastAckedGraphic.x = world.player.lastAckedPos.x;
        world.player.lastAckedGraphic.y = world.player.lastAckedPos.y;
        world.player.correctedGraphic.x = world.player.correctedPos.x;
        world.player.correctedGraphic.y = world.player.correctedPos.y;
    
        this.moveCamera(lerpPos.x, lerpPos.y);
    
    
        for (let other of world.otherPlayers) {
            let lerpPos = lerpVec(other.prevPos, other.pos, lerpFraction);
            other.graphic.x = lerpPos.x;
            other.graphic.y = lerpPos.y;
            other.lastAckedGraphic.x = other.lastAckedPos.x;
            other.lastAckedGraphic.y = other.lastAckedPos.y;
        }
    
        this.lineGfx.clear();
        this.lineGfx.lineStyle(1, 0xff0000, 1);
        for (let laser of world.laserList) {
            this.lineGfx.moveTo(laser.line.start.x, laser.line.start.y);
            this.lineGfx.lineTo(laser.line.end.x, laser.line.end.y);
        }
    
        // Draw UI
        this.uiGfx.clear();
        let border = 10;
        let barWidth = 80;
        let barHeight = 10;
        this.uiGfx.beginFill(0xaaaa00);
        let ratio = world.player.energy / conf.PLAYER_ENERGY;
        this.uiGfx.drawRect(this.screenRect.width/2 - barWidth/2, this.screenRect.height - barHeight - border, barWidth * ratio, barHeight);
        this.uiGfx.endFill();
        this.uiGfx.lineStyle(2, 0xaa2222);
        this.uiGfx.drawRect(this.screenRect.width/2 - barWidth/2, this.screenRect.height - barHeight - border, barWidth, barHeight);
    }
}

export {Graphics};