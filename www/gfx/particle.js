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

const MAX_PARTICLES_PER_TYPE = 64 * 1024; // emitters * particles per emitter

const MAX_PARTICLE_LIFE_SECS = 10;

const PARTICLE_START_POS_LOC = 5;
const PARTICLE_START_TIME_LOC = 6;

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

class ParticleBatch {
    params;
    vboOffset; // start offset into VBO where all particle data is stored
    numActive = 0;
}

// GPU particles with particle state stored in textures
class ParticleSystem {
    model;

    particleVbo;
    floatsPerParticle;

    emitterList = [];

    particleBatches = new Map(); // emitter batch for each type

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
        gl.bufferData(gl.ARRAY_BUFFER, allParticleTypes.length * MAX_PARTICLES_PER_TYPE * this.floatsPerParticle * floatBytes, gl.STATIC_DRAW);

        let offset = 0;
        for (let attrib of particleAttribs) {
            gl.vertexAttribPointer(attrib.loc, attrib.size, attrib.type, false, stride, offset);
            gl.enableVertexAttribArray(attrib.loc);
            gl.vertexAttribDivisor(attrib.loc, attrib.divisor);
            offset += attrib.size * floatBytes;
        }
        
        // init particle batches
        offset = 0;
        for (let particleType of allParticleTypes) {
            const batch = new ParticleBatch();
            batch.params = paramsMap[particleType];
            batch.vboOffset = offset;
            offset += MAX_PARTICLES_PER_TYPE * this.floatsPerParticle * floatBytes;
            this.emitterBatches.set(particleType, batch);
        }
    }

    addEmitter(type) {
        const emitter = new Emitter(type, paramsMap.get(type));
        this.emitterList.push(emitter);
        console.log("num emitters: " + this.emitterList.length);
        return emitter;
    }

    update(deltaMs) {
        for (let type of allParticleTypes) {
            _updateBatch(this.emitterBatches.get(type), deltaMs);
        }
    }

    _updateBatch(emitterBatch, deltaMs) {
        const emitterList = emitterBatch.list;

        // emit new particles
        for (let i = 0; i < emitterList.length; i++) {
            emitterList[i].timeSecs += deltaMs / 1000;
            emitterList[i].particleAccum += deltaMs / 1000 * emitterBatch.params.particlesPerSec;

            this._emitParticles(emitterBatch, i);
        }

        // free up finished emitters
        for (let i = emitterList.length -1; i >= 0; i--) {
            if (emitterList[i] !== undefined && !emitterList[i].finished()) {
                break;
            }
            this.emitterList[i] = undefined;
        }
    }

    _emitParticles(emitterBatch, emitterIndex) {
        const emitter = emitterBatch.list[emitterIndex];
        if (emitter === undefined || emitter.finished()) {
            return;
        }

        let numNew = Math.floor(emitter.particleAccum);
        if (numNew === 0) {
            return;
        }
        emitter.particleAccum -= numNew; 
        emitter.numEmitted += numNew;
        
        const particleData = new Float32Array(numNew * this.floatsPerParticle);
        for (let i = 0; i < numNew; i++) {
            particleData[i * this.floatsPerParticle]     = emitter.pos.x;
            particleData[i * this.floatsPerParticle + 1] = emitter.pos.y;
            particleData[i * this.floatsPerParticle + 2] = emitter.timeSecs;
        }

        const byteOffset = emitterBatch.particleByteOffset + emitterIndex * MAX_EMITTER_PARTICLES * this.floatsPerParticle * sizeOf(gl.FLOAT);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.particleVbo);
        gl.bufferSubData(gl.ARRAY_BUFFER, byteOffset, particleData);
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
    endSecs;
    particleAccum = 0;
    

    numEmitted = 0;

    constructor(type) {
        this.type = type;
        const params = paramsMap.get(type);
        this.endSecs = params.numParticles / params.particlesPerSec + MAX_PARTICLE_LIFE_SECS;
    }

    moveTo() {
        // TODO
        // infer velocity for adding to particles
    }

    finished() {
    }
}

export {ParticleSystem, Emitter};