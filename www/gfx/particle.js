import {Vec} from "../math.js";
import * as assets from "../assets.js";
import {Mesh, Model,  VertAttrib} from "./mesh.js";
import {Color} from "./color.js";
import { gl, sizeOf } from "./gl.js";
import { Texture } from "./texture.js";

const SHAPE_TYPE_CIRCLE = 0;
const SHAPE_TYPE_CONE = 1;

// TODO: GPU PARTICLES
// - each particle has a bunch of state, all of it dynamic
//      - attributes in vbo
//      - quad positions (get explanded in shader)

// Pre-allocate all particles we could ever want
// Shader pass to init particles
// Shader pass to update particle data
// SHader pass to draw particles

// - store particle state in texture (n pixels per particle)
// - sample above texture for each rect instance
// - chunk up texture for each emitter

const MAX_EMITTERS = 256;
const MAX_EMITTER_PARTICLES = 1024;

const PARTICLE_POS_LOC = 5;
const PARTICLE_VEL_LOC = 6;
const PARTICLE_START_COLOR_LOC = 7;
const PARTICLE_END_COLOR_LOC = 8;
const PARTICLE_TIME_LOC = 9;

const EMITTER_TIME_LOC = 10;

// GPU particles with particle state stored in textures
class ParticleSystem {
    model;

    particleVbo;
    emitterVbo;

    emitterList = [];

    floatsPerParticle;

    constructor() {
        const mesh = new Mesh(VertAttrib.POS_BIT);
        mesh.addRect(-1, -1, 2, 2);

        this.model = new Model(
            gl,
            mesh,
            gl.TRIANGLES,
            assets.particleShader,
            null,
            null,
            0,
        );

        gl.bindVertexArray(this.model.vao);

        const particleAttribs = [
            new VertAttrib(PARTICLE_POS_LOC, 2, gl.FLOAT, 1),   // position
            new VertAttrib(PARTICLE_VEL_LOC, 4, gl.FLOAT, 1),   // start and end velocity
            new VertAttrib(PARTICLE_START_COLOR_LOC, 4, gl.FLOAT, 1), // start color
            new VertAttrib(PARTICLE_END_COLOR_LOC, 4, gl.FLOAT, 1), // end color
            new VertAttrib(PARTICLE_TIME_LOC, 2, gl.FLOAT, 1), // start and end time (secs)
        ];

        this.floatsPerParticle = 0;
        for (let attrib of particleAttribs) {
            this.floatsPerParticle += attrib.size;
        }
        const floatBytes = sizeOf(gl.FLOAT);
        let stride = this.floatsPerParticle * floatBytes;

        this.particleVbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.particleVbo);
        gl.bufferData(gl.ARRAY_BUFFER, MAX_EMITTERS * MAX_EMITTER_PARTICLES * this.floatsPerParticle, gl.STATIC_DRAW);

        let offset = 0;
        for (let attrib of particleAttribs) {
            gl.vertexAttribPointer(attrib.loc, attrib.size, attrib.type, false, stride, offset);
            gl.enableVertexAttribArray(attrib.loc);
            gl.vertexAttribDivisor(attrib.loc, attrib.divisor);
            offset += attrib.size * floatBytes;
        }

        // Emitter instance variables
        const emitterData = new Float32Array([0]);
        this.emitterVbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.emitterVbo);
        gl.bufferData(gl.ARRAY_BUFFER, emitterData, gl.STATIC_DRAW);
        const attribSize = 1;
        const attribType = gl.FLOAT;
        gl.vertexAttribPointer(EMITTER_TIME_LOC, attribSize, attribType, false, 0, 0);
        gl.enableVertexAttribArray(EMITTER_TIME_LOC);
        gl.vertexAttribDivisor(EMITTER_TIME_LOC, MAX_EMITTER_PARTICLES);
    }

    addEmitter(pos, params) {
        const emitter = new Emitter(pos, params);
        const vboOffset = this.emitterList.length * MAX_EMITTER_PARTICLES * this.floatsPerParticle * sizeOf(gl.FLOAT);
        this.emitterList.push(emitter);
        this.model.numInstances = this.emitterList.length * MAX_EMITTER_PARTICLES;

        // Particle instance data
        const particleData = new Float32Array(MAX_EMITTER_PARTICLES * this.floatsPerParticle);
        for (let i = 0; i < MAX_EMITTER_PARTICLES; i++) {
            const angleRads = Math.random() * 2 * Math.PI;
            const startSpeed = params.startSpeed.sample();
            const endSpeed = params.endSpeed.sample();
            const startVel = Vec.fromAngleRads(angleRads).scale(startSpeed);
            const endVel = Vec.fromAngleRads(angleRads).scale(endSpeed);

            const startColor = params.startColor.sample();
            const endColor = params.endColor.sample();

            particleData[i * this.floatsPerParticle]     = emitter.pos.x;
            particleData[i * this.floatsPerParticle + 1] = emitter.pos.y;

            particleData[i * this.floatsPerParticle + 2] = startVel.x;
            particleData[i * this.floatsPerParticle + 3] = startVel.y;
            particleData[i * this.floatsPerParticle + 4] = endVel.x;
            particleData[i * this.floatsPerParticle + 5] = endVel.y;

            particleData[i * this.floatsPerParticle + 6] = startColor.r;
            particleData[i * this.floatsPerParticle + 7] = startColor.g;
            particleData[i * this.floatsPerParticle + 8] = startColor.b;
            particleData[i * this.floatsPerParticle + 9] = startColor.a;

            particleData[i * this.floatsPerParticle + 10] = endColor.r;
            particleData[i * this.floatsPerParticle + 11] = endColor.g;
            particleData[i * this.floatsPerParticle + 12] = endColor.b;
            particleData[i * this.floatsPerParticle + 13] = endColor.a;

            particleData[i * this.floatsPerParticle + 14] = params.startSecs.sample();
            particleData[i * this.floatsPerParticle + 15] = params.lifeSecs.sample();
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.particleVbo);
        gl.bufferSubData(gl.ARRAY_BUFFER, vboOffset, particleData);
    }

    update(deltaMs) {
        const times = [];
        for (let emitter of this.emitterList) {
            emitter.timeSecs += deltaMs/1000;
            times.push(emitter.timeSecs);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.emitterVbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(times), gl.STATIC_DRAW);
    }

    dispose() {
        // TODO
    }
}

class Range {
    start;
    end;

    constructor (start, end=null) {
        this.start = start;
        this.end = end;
        if (this.end === null) {
            this.end = this.start;
        }
    }

    sample() {
        const frac = Math.random();
        if (!isNaN(this.start)) {
            return this.start * (1-frac) + this.end * frac;
        }

        if (this.start instanceof Vec || this.start instanceof Color) {
            return this.start.scale(1-frac).add(this.end.scale(frac));
        }
        throw "unsupported range type: " + typeof(this.start);
    }
}

class EmitterParams {
    // Group params
    shapeType = SHAPE_TYPE_CIRCLE;
    circleRadius = new Range(5);
    numParticles = new Range(10);

    // Particle Params
    startColor = new Range(new Color(1, 1, 1, 1));
    endColor = new Range(new Color(1, 1, 0, 1));
    startSpeed = new Range(60);
    endSpeed = new Range(0.0);
    startSecs = new Range(0, 3);
    lifeSecs = new Range(2, 3);
}

// TODO: pack all draw data together so it is drawn with one vbo/model
class Emitter {
    pos = new Vec();
    params;
    timeSecs = 0;

    numParticles;
    circleRadius;

    constructor(pos, params) {
        this.pos.set(pos);
        this.params = params;

        this.numParticles = params.numParticles.sample();
        this.circleRadius = params.circleRadius.sample();
    }

    moveTo() {
        // TODO
        // infer velocity for adding to particles
    }
}

const sparkEmitterParams = new EmitterParams();


export {ParticleSystem, Emitter, EmitterParams, sparkEmitterParams};