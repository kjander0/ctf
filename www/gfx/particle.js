import {Vec} from "../math.js";
import * as assets from "../assets.js";
import {Mesh, Model,  VertAttrib} from "./mesh.js";
import {Color} from "./color.js";

const SHAPE_TYPE_CIRCLE = 0;
const SHAPE_TYPE_CONE = 1; 

class EmitterParams {
    startPos = new Vec();

    // Shape params
    shapeType = SHAPE_TYPE_CIRCLE;
    circleRadius = 10;

    numParticles = 10;

    startColor = new Color(1, 1, 1, 1);
    startSpeed = 10;
}

// TODO: pack all draw data together so it is drawn with one vbo/model
class Emitter {
    params;
    pos;

    // (x, y, r, g, b, a) per pixel particle 
    pixelData;

    // (vx, vy) per particle
    particleVelocities;

    tickCount = 0;

    constructor(params) {
        this.params = params;
        this.pos = new Vec(params.startPos);

        this.pixelData = new Array(params.numParticles * 6);
        for (let i = 0; i < params.numParticles; i++) {
            THESE INDICES ARE WRONG!!!
            this.pixelData[i++] = this.pos.x;
            this.pixelData[i++] = this.pos.y;
            this.pixelData[i++] = params.startColor.r;
            this.pixelData[i++] = params.startColor.g;
            this.pixelData[i++] = params.startColor.b;
            this.pixelData[i] = params.startColor.a;
        }

        this.particleVelocities = new Array(params.numParticles * 2);
        for (let i = 0; i < params.numParticles; i++) {
            this.particleVelocities[i++] = (2 * Math.random() - 1) * params.startSpeed;
            this.particleVelocities[i] = (2 * Math.random() - 1) * params.startSpeed;
        }
    }

    translate() {
        // TODO
        // infer velocity for adding to particles
    }

    active() {
        return tickCount < 100;
    }

    update() {
        this.tickCount++;
        for (let i = 0; i < this.params.numParticles; i++) {
            this.pixelData[i] += this.particleVelocities[i];
            this.pixelData[i+1] += this.particleVelocities[i+1];
        }
    }

    makeModel(gl) {
        const mesh = new Mesh(VertAttrib.POS_BIT | VertAttrib.COLOR_BIT);
        mesh.setData(this.pixelData);
        return new Model(gl, mesh, gl.POINTS, assets.shapeShader);
    }
}

export {Emitter, EmitterParams};