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

const MAX_EMITTERS_PER_TYPE = 64;
const MAX_EMITTER_PARTICLES = 1024;

const PARTICLE_START_POS_LOC = 5;
const PARTICLE_START_TIME_LOC = 6;

const EMITTER_TIME_LOC = 10;

const PARTICLE_TYPE_SPARKS = 0;

const allParticleTypes = [
    PARTICLE_TYPE_SPARKS,
];

class EmitterParams {
    numParticles = 100;
    particlesPerSec = 50;
}

const paramsMap = new Map();
{
    const params = new EmitterParams();
    paramsMap.set(PARTICLE_TYPE_SPARKS, params);
}

// Describes batch of emitters of same type
class EmitterBatch {
    type;
    list = new Array(MAX_EMITTERS_PER_TYPE);
    particleByteOffset;
    emitterByteOffset;
}

// GPU particles with particle state stored in textures
class ParticleSystem {
    model;

    particleVbo;
    floatsPerParticle;

    emitterVbo;
    floatsPerEmitter;

    emitterBatches = new Map(); // emitter batch for each type

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

        gl.bindVertexArray(this.model.vao);

        // Specify particle VBO and attribs
        const particleAttribs = [
            new VertAttrib(PARTICLE_START_POS_LOC, 2, gl.FLOAT, 1),
            new VertAttrib(PARTICLE_START_TIME_LOC, 1, gl.FLOAT, 1),
        ];

        this.floatsPerParticle = 0;
        for (let attrib of particleAttribs) {
            this.floatsPerParticle += attrib.size;
        }
        const floatBytes = sizeOf(gl.FLOAT);
        let stride = this.floatsPerParticle * floatBytes;

        this.particleVbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.particleVbo);
        gl.bufferData(gl.ARRAY_BUFFER, allParticleTypes.length * MAX_EMITTERS_PER_TYPE * MAX_EMITTER_PARTICLES * this.floatsPerParticle * sizeOf(gl.FLOAT), gl.STATIC_DRAW);

        let offset = 0;
        for (let attrib of particleAttribs) {
            gl.vertexAttribPointer(attrib.loc, attrib.size, attrib.type, false, stride, offset);
            gl.enableVertexAttribArray(attrib.loc);
            gl.vertexAttribDivisor(attrib.loc, attrib.divisor);
            offset += attrib.size * floatBytes;
        }

        // Specify emitter VBO and attribs
        const emitterAttribs = [
            new VertAttrib(EMITTER_TIME_LOC, 1, gl.FLOAT, 1),
        ];

        this.floatsPerEmitter = 0;
        for (let attrib of emitterAttribs) {
            this.floatsPerEmitter += attrib.size;
        }
        stride = this.floatsPerEmitter * floatBytes;

        this.emitterVbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.emitterVbo);
        gl.bufferData(gl.ARRAY_BUFFER, allParticleTypes.length * MAX_EMITTERS_PER_TYPE * floatsPerEmitter * sizeOf(gl.FLOAT), gl.STATIC_DRAW);

        offset = 0;
        for (let attrib of emitterAttribs) {
            gl.vertexAttribPointer(attrib.loc, attrib.size, attrib.type, false, stride, offset);
            gl.enableVertexAttribArray(attrib.loc);
            gl.vertexAttribDivisor(attrib.loc, attrib.divisor);
            offset += attrib.size * floatBytes;
        }
        
        // Create emitter batches
        { 
            let particleOffset = 0;
            let emitterOffset = 0;
            for (let particleType of allParticleTypes) {
                const batch = new EmitterBatch();
                batch.type = particleType;
                batch.particleByteOffset = particleOffset;
                batch.emitterByteOffset = emitterOffset;
                particleOffset += MAX_EMITTERS_PER_TYPE * MAX_EMITTER_PARTICLES * this.floatsPerParticle * floatBytes;
                emitterOffset += MAX_EMITTERS_PER_TYPE * floatsPerEmitter * floatBytes;
                this.emitterBatches.set(particleType, batch);
            }
        }
    }

    addEmitter(type) {
        const emitter = new Emitter(type, paramsMap.get(type));

        const emitterBatch = this.emitterBatches.get(type);

        let emitterList = emitterBatch.list;

        // Find next free emittter, else override the first
        let emitterIndex = 0;
        for (; emitterIndex < emitterList.length; emitterIndex++) {
            if (emitterList[emitterIndex] === undefined) {
                break;
            }
        }

        emitterList[emitterIndex] = emitter;

        const emitterVboOffset = emitterBatch.emitterByteOffset + emitterIndex * this.floatsPerEmitter * sizeOf(gl.FLOAT);
        const emitterData = new Float32Array([0]);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.emitterVbo);
        gl.bufferSubData(gl.ARRAY_BUFFER, emitterVboOffset, emitterData);
    }

    update(deltaMs) {
        for (let type of allParticleTypes) {
            const emitterBatch = this.emitterBatches.get(type);
        }
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

// TODO: pack all draw data together so it is drawn with one vbo/model
class Emitter {
    type;
    pos = new Vec();
    timeSecs = 0;
    emitAccumSecs = 0;
    

    numEmitted = 0;

    constructor(type) {
        this.type = type;
    }

    moveTo() {
        // TODO
        // infer velocity for adding to particles
    }

    finished() {
    }
}

export {ParticleSystem, Emitter};