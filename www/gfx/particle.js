import {Vec} from "../math.js";
import * as assets from "../assets.js";
import {Mesh, Model,  VertAttrib} from "./mesh.js";
import {Color} from "./color.js";

const SHAPE_TYPE_CIRCLE = 0;
const SHAPE_TYPE_CONE = 1;

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
    startSpeed = new Range(1.5);
    endSpeed = new Range(0.25);
    durationTicks = new Range(8, 12);
}

const sparkEmitterParams = new EmitterParams();

// TODO: probably wanna cache and reuse these objects
class Particle {
    vel;
    accel;
    durationTicks;
}

// TODO: pack all draw data together so it is drawn with one vbo/model
class Emitter {
    static FLOATS_PER_PIXEL = 6;

    params;

    pos = new Vec();
    numParticles;
    circleRadius;

    // contiguous particle data for drawing
    // pixel particle: (x, y, r, g, b, a)
    drawData;

    particles; // particle data for simulation

    tickCount = 0;
    alive = true;

    constructor(pos, params) {
        this.pos.set(pos);
        this.params = params;
        this.numParticles = params.numParticles.sample();
        this.circleRadius = params.circleRadius.sample();

        this.drawData = new Array(this.numParticles * Emitter.FLOATS_PER_PIXEL);
        for (let i = 0; i < this.drawData.length; i+= Emitter.FLOATS_PER_PIXEL) {
            // TODO: find random location within shape
            this.drawData[i] = this.pos.x;
            this.drawData[i+1] = this.pos.y;
            const startColor = params.startColor.sample();
            this.drawData[i+2] = startColor.r;
            this.drawData[i+3] = startColor.g;
            this.drawData[i+4] = startColor.b;
            this.drawData[i+5] = startColor.a;
        }

        this.particles = new Array(this.numParticles);
        for (let i = 0; i < this.numParticles; i++) {
            const angleRads = Math.random() * 2 * Math.PI;
            const startSpeed = params.startSpeed.sample();
            const endSpeed = params.endSpeed.sample();
            const particle = new Particle();
            particle.vel = Vec.fromAngleRads(angleRads).scale(startSpeed);
            particle.durationTicks = params.durationTicks.sample();
            particle.accel = particle.vel.normalize().scale((endSpeed-startSpeed)/particle.durationTicks);
            this.particles[i] = particle;

        }
    }

    translate() {
        // TODO
        // infer velocity for adding to particles
    }

    // Returns true if particles still active
    update() {
        if (!this.alive) {
            return false;
        }

        this.alive = false;
        for (let i = 0; i < this.numParticles; i++) {
            const particle = this.particles[i];
            if (this.tickCount > particle.durationTicks) {
                continue;
            }
            this.alive = true;
            const drawIndex = i * Emitter.FLOATS_PER_PIXEL;
            this.drawData[drawIndex] += particle.vel.x;
            this.drawData[drawIndex+1] += particle.vel.y;
            particle.vel = particle.vel.add(particle.accel);
        }
        this.tickCount++;
        return this.alive;
    }

    makeModel(gl) {
        const mesh = new Mesh(VertAttrib.POS_BIT | VertAttrib.COLOR_BIT);
        mesh.setData(this.drawData);
        // TODO: gl.POINTS has some limitations (limited size and clips early)
        return new Model(gl, mesh, gl.POINTS, assets.shapeShader);
    }
}

export {Emitter, EmitterParams, sparkEmitterParams};