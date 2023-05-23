import {Vec} from "../math.js";
import * as assets from "../assets.js";
import {Mesh, Model,  VertAttrib} from "./mesh.js";
import {Color} from "./color.js";
import { gl, sizeOf } from "./gl.js";
import { Texture } from "./texture.js";

const SHAPE_TYPE_CIRCLE = 0;
const SHAPE_TYPE_CONE = 1;

// TODO: GPU PARTICLES

// Types of particles I want to support
// - sparks from getting hit
// - sparks/plasma trailing off laser bullets
// - smoke coming off damaged player
// - explosions from grenades/deaths (parts of players flying off)

// - USE uber particle shader with defines for each particle type
    // - can have loads more parameters/animation curves
    // - reuse functions for common things, probs not gonna be that many different particle types anyway!
    // - entropy texture

// - I want to be able to remove emitters, but keep their remaining particles on screen
//      -use a incrementing number to stage new particles, and just stop incrementing it
// - I want more complex easing curves
// - I want emitters to follow player/bullets (use transform feedback/texture for positions)

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
const PARTICLE_SCALE_ROT_LOC = 10;
const PARTICLE_TEXTURE_LOC = 11;

const EMITTER_TIME_LOC = 12;
const EMITTER_SIZE_LOC = 13;

// GPU particles with particle state stored in textures
class ParticleSystem {
    model;

    particleVbo;
    emitterList = new Array(MAX_EMITTERS);

    floatsPerParticle;
    floatsPerEmitter;

    emitterVbo;
    emitterTimeVbo;
    emitterAttribs;

    timeSecs = 0;

    constructor() {
        const mesh = new Mesh(VertAttrib.POS_BIT);
        mesh.addRect(-1, -1, 2, 2);

        this.model = new Model(
            gl,
            mesh,
            gl.TRIANGLES,
            assets.particleShader,
            [assets.smokeTexture],
            null,
            0,
        );

        assets.particleShader.setUniform("maxNumberParticles", MAX_EMITTER_PARTICLES);

        gl.bindVertexArray(this.model.vao);

        // =========== Particle Data ==========
        const particleAttribs = [
            new VertAttrib(PARTICLE_POS_LOC, 2, gl.FLOAT, 1),   // position
            new VertAttrib(PARTICLE_VEL_LOC, 4, gl.FLOAT, 1),   // start and end velocity
            new VertAttrib(PARTICLE_START_COLOR_LOC, 4, gl.FLOAT, 1), // start color
            new VertAttrib(PARTICLE_END_COLOR_LOC, 4, gl.FLOAT, 1), // end color
            new VertAttrib(PARTICLE_TIME_LOC, 2, gl.FLOAT, 1), // start and end time (secs)
            new VertAttrib(PARTICLE_SCALE_ROT_LOC, 4, gl.FLOAT, 1),
            new VertAttrib(PARTICLE_TEXTURE_LOC, 1, gl.FLOAT, 1),
        ];

        this.floatsPerParticle = 0;
        for (let attrib of particleAttribs) {
            this.floatsPerParticle += attrib.size;
        }
        const floatBytes = sizeOf(gl.FLOAT);
        let stride = this.floatsPerParticle * floatBytes;

        this.particleVbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.particleVbo);


        // FOR TESTING THAT UNITIALISED PARTICLES ARE NOT DRAWN
        // const particleData = new Float32Array(MAX_EMITTERS * MAX_EMITTER_PARTICLES * this.floatsPerParticle);
        // for (let i = 0; i < MAX_EMITTERS * MAX_EMITTER_PARTICLES; i++) {
        //     const angleRads = Math.random() * 2 * Math.PI;
        //     const startSpeed = 0;
        //     const endSpeed = 10;
        //     const startVel = Vec.fromAngleRads(angleRads).scale(startSpeed);
        //     const endVel = Vec.fromAngleRads(angleRads).scale(endSpeed);

        //     const startColor = new Color(1, 1, 1, 1);
        //     const endColor = new Color(1, 1, 1, 1);

        //     particleData[i * this.floatsPerParticle]     = 0;
        //     particleData[i * this.floatsPerParticle + 1] = 0;

        //     particleData[i * this.floatsPerParticle + 2] = startVel.x;
        //     particleData[i * this.floatsPerParticle + 3] = startVel.y;
        //     particleData[i * this.floatsPerParticle + 4] = endVel.x;
        //     particleData[i * this.floatsPerParticle + 5] = endVel.y;

        //     particleData[i * this.floatsPerParticle + 6] = startColor.r;
        //     particleData[i * this.floatsPerParticle + 7] = startColor.g;
        //     particleData[i * this.floatsPerParticle + 8] = startColor.b;
        //     particleData[i * this.floatsPerParticle + 9] = startColor.a;

        //     particleData[i * this.floatsPerParticle + 10] = endColor.r;
        //     particleData[i * this.floatsPerParticle + 11] = endColor.g;
        //     particleData[i * this.floatsPerParticle + 12] = endColor.b;
        //     particleData[i * this.floatsPerParticle + 13] = endColor.a;

        //     particleData[i * this.floatsPerParticle + 14] = 0;
        //     particleData[i * this.floatsPerParticle + 15] = 10;
        // }
        // gl.bufferData(gl.ARRAY_BUFFER, particleData, gl.STATIC_DRAW);


        gl.bufferData(gl.ARRAY_BUFFER, MAX_EMITTERS * MAX_EMITTER_PARTICLES * this.floatsPerParticle * sizeOf(gl.FLOAT), gl.STATIC_DRAW);

        let offset = 0;
        for (let attrib of particleAttribs) {
            gl.vertexAttribPointer(attrib.loc, attrib.size, attrib.type, false, stride, offset);
            gl.enableVertexAttribArray(attrib.loc);
            gl.vertexAttribDivisor(attrib.loc, attrib.divisor);
            offset += attrib.size * floatBytes;
        }

        
        // =========== Emitter Data ==========
        this.emitterAttribs = [
            new VertAttrib(EMITTER_SIZE_LOC, 1, gl.FLOAT, MAX_EMITTER_PARTICLES)
        ];

        this.floatsPerEmitter = 0;
        for (let attrib of this.emitterAttribs) {
            this.floatsPerEmitter += attrib.size;
        }

        this.emitterVbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.emitterVbo);
        gl.bufferData(gl.ARRAY_BUFFER, MAX_EMITTERS * this.floatsPerEmitter * sizeOf(gl.FLOAT), gl.STATIC_DRAW);

        offset = 0;
        stride = this.floatsPerEmitter * floatBytes;
        for (let attrib of this.emitterAttribs) {
            gl.vertexAttribPointer(attrib.loc, attrib.size, attrib.type, false, stride, offset);
            gl.enableVertexAttribArray(attrib.loc);
            gl.vertexAttribDivisor(attrib.loc, attrib.divisor);
            offset += attrib.size * sizeOf(gl.FLOAT);
        }

        // Seperate vbo holding time for each active emitter
        this.emitterTimeVbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.emitterTimeVbo);
        gl.bufferData(gl.ARRAY_BUFFER, MAX_EMITTERS * sizeOf(gl.FLOAT), gl.STATIC_DRAW);
        gl.vertexAttribPointer(EMITTER_TIME_LOC, 1, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(EMITTER_TIME_LOC);
        gl.vertexAttribDivisor(EMITTER_TIME_LOC, MAX_EMITTER_PARTICLES);
    }

    addEmitter(emitter) {
        let emitterIndex = 0;
        let numDefined = 0;
        for (let i = 0; i < this.emitterList.length; i++) {
            numDefined = i+1;
            if (this.emitterList[i] === undefined) {
                emitterIndex = i;
                break; // end loop at last defined so we know how many to draw
            }

            if (this.emitterList[i].finished()) {
                emitterIndex = i;
            }
        }
        this.emitterList[emitterIndex] = emitter;
        this.model.numInstances = numDefined * MAX_EMITTER_PARTICLES;


        const emitterVboOffset = emitterIndex * this.floatsPerEmitter * sizeOf(gl.FLOAT);
        const emitterData = new Float32Array([emitter.numParticles]);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.emitterVbo);
        gl.bufferSubData(gl.ARRAY_BUFFER, emitterVboOffset, emitterData);
    }

    update(deltaMs) {
        // Initialize new particles
        const numNew = 1;

        for (let emitterIndex = 0; emitterIndex < this.emitterList.length; emitterIndex++) {
            this._emitParticles(emitterIndex);
        }

        let lastDefined = this.emitterList.length-1;
        for (; lastDefined >= 0; lastDefined--) {
            if (this.emitterList[lastDefined] !== undefined && !this.emitterList[lastDefined].finished()) {
                break;
            }
            this.emitterList[lastDefined] = undefined;
        }

        const timeData = new Float32Array(lastDefined+1);
        for (let i = 0; i < timeData.length; i++) {
            const emitter = this.emitterList[i];
            emitter.timeSecs += deltaMs / 1000;
            timeData[i] = emitter.timeSecs;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.emitterTimeVbo);
        gl.bufferData(gl.ARRAY_BUFFER, timeData, gl.STATIC_DRAW);
    }

    _emitParticles(emitterIndex) {
        const emitter = this.emitterList[emitterIndex];

        if (emitter === undefined || emitter.finished() || emitter.numEmitted >= emitter.numParticles) {
            return;
        }

        let numNew = Math.min(particlesRemaining, Math.max(1, deltaTime * particlesPerSecond));


        emitter.numEmitted = emitter.numParticles;

        const params = emitter.params;
        
        const particleData = new Float32Array(emitter.numParticles * this.floatsPerParticle);
        for (let i = 0; i < emitter.numParticles; i++) {
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

            particleData[i * this.floatsPerParticle + 14] = emitter.timeSecs;
            particleData[i * this.floatsPerParticle + 15] = params.lifeSecs.sample();

            particleData[i * this.floatsPerParticle + 16] = params.startScale.sample();
            particleData[i * this.floatsPerParticle + 17] = params.endScale.sample();

            let startRot = params.startRot.sample();
            let endRot = params.endRot.sample();

            if (params.lockOrientationToVel) {
                startRot = angleRads;
                endRot = angleRads;
            }
            particleData[i * this.floatsPerParticle + 18] = startRot;
            particleData[i * this.floatsPerParticle + 19] = endRot;
        }
        const particleVboOffset = emitterIndex * MAX_EMITTER_PARTICLES * this.floatsPerParticle * sizeOf(gl.FLOAT);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.particleVbo);
        gl.bufferSubData(gl.ARRAY_BUFFER, particleVboOffset, particleData);
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
    numParticles = new Range(128);
    lockOrientationToVel = false;

    // Particle Params
    startColor = new Range(new Color(1, 1, 1, 1.0));
    endColor = new Range(new Color(1, 1, 1, 0));
    startSpeed = new Range(60, 190);
    endSpeed = new Range(10.0);
    startSecs = new Range(0);
    lifeSecs = new Range(0.3, 0.45);
    startScale = new Range(7.0);
    endScale = new Range(0.1);
    startRot = new Range(-3.0, 3.0);
    endRot = new Range(-3.0, 3.0);
}

// TODO: pack all draw data together so it is drawn with one vbo/model
class Emitter {
    pos = new Vec();
    params;
    timeSecs = 0;

    numEmitted = 0;
    numParticles;
    circleRadius;

    constructor(pos, params) {
        this.pos.set(pos);
        this.params = params;
        console.assert(params.numParticles.end <= MAX_EMITTER_PARTICLES);
        this.numParticles = params.numParticles.sample();
        this.circleRadius = params.circleRadius.sample();
    }

    moveTo() {
        // TODO
        // infer velocity for adding to particles
    }

    finished() {
        return this.timeSecs > this.params.startSecs.end + this.params.lifeSecs.end;
    }
}

// TODO: Sparks should be additive so they get brighter! (like fire)
const sparkEmitterParams = new EmitterParams();
sparkEmitterParams.lockOrientationToVel = true;


export {ParticleSystem, Emitter, EmitterParams, sparkEmitterParams};