import { Vec, Line, Rect, Circle } from "./math.js";
import * as conf from "./conf.js";
import * as collision from "./collision.js"

class Laser {
    static TYPE_LASER = 0;
    static TYPE_BOUNCY = 1;
    static TYPE_MISSILE = 2;

    type;
    playerId;
    line = new Line();
    dir = new Vec();
    compensated = false;
    activeTicks = 0;

    constructor(type, playerId, pos, angle) {
        this.type = type;
        this.playerId = playerId;
        this.line.start.set(pos);
        this.line.end.set(pos);
        this.dir = new Vec(Math.cos(angle), Math.sin(angle));
    }
}

function update(world) {
    for (let i = world.laserList.length-1; i >= 0; i--) {
        world.laserList[i].activeTicks += 1;
        if (world.laserList[i].activeTicks > conf.LASER_TIME_TICKS) {
            world.laserList[i] = world.laserList[world.laserList.length-1];
            world.laserList.splice(world.laserList.length-1, 1);
        }
    }

    for (let i = world.laserList.length-1; i >= 0; i--) {
        let laser = world.laserList[i];
        let speed = conf.LASER_SPEED;
        if (laser.type === Laser.TYPE_BOUNCY) {
            speed = conf.BOUNCY_SPEED;
        }
        // TODO: are client and server moving laser at same time on same tick?
        let numberSteps = 1;
        if (!laser.compensated) {
            laser.compensated = true;
            let tickDiff = world.player.predictedInputs.unacked.length;
            if (tickDiff < 0) { // client tick wrapped and server tick has not
                tickDiff += 256;
            }
            numberSteps += tickDiff;
            laser.activeTicks += tickDiff;
        }

        for (let j = 0; j < numberSteps; j++) {
            let line = laser.line;
            line.start.set(line.end);
            line.end = line.end.add(laser.dir.scale(speed));
            if (processCollisions(world, laser)) {
                world.laserList[i] = world.laserList[world.laserList.length-1];
                world.laserList.splice(world.laserList.length-1, 1);
                break;
            }
        }
    }
}

function processCollisions(world, laser) {
    let [hitDist, hitPos, normal] = checkWallHit(world, laser.line);
    let [hitPlayer, hitPlayerPos] = checkPlayerHit(world, laser, hitDist);
    if (hitDist < 0 && hitPlayer === null) {
        return false;
    }

    if (hitPlayer !== null) {
        console.log("hit player");
    } else if (laser.type == Laser.TYPE_BOUNCY) {
        bounce(laser, hitPos, normal);
        return false;
    }

    return true;
}

function checkWallHit(world, line) {
	let tileRect = new Rect(new Vec(), new Vec(conf.TILE_SIZE, conf.TILE_SIZE));
	let lineLen = line.length();
	let tileSample = world.map.sampleSolidTiles(line.end, lineLen);
	let hitPos, normal;
	let hitDist = -1.0;
	for (let tilePos of tileSample) {
		tileRect.pos.set(tilePos);
		let [overlap, rectNormal] = collision.lineRectOverlap(line, tileRect);
		if (overlap === null) {
			continue;
		}
		let hit = line.end.add(overlap);
		let dist = line.start.distanceTo(hit);
		if (hitDist < 0 || dist < hitDist) {
			hitPos = hit;
			hitDist = dist;
            normal = rectNormal;
		}
	}
	return [hitDist, hitPos, normal];
}

function checkPlayerHit(world, laser, hitDist) {
	let hitPos = null;
	let hitPlayer = null;

    // Check local player
    if (world.player.id !== laser.playerId) {
        let [dist, hit] = checkSingePlayerHit(world.player, laser);
        if (dist !== null && (hitDist < 0 || dist < hitDist)) {
            hitPos = hit;
            hitDist = dist;
            hitPlayer = world.player;
        }
    }

    // Check other players
	for (let player of world.otherPlayers) {
		if (player.id == laser.playerId) {
			continue;
		}
        let [dist, hit] = checkSingePlayerHit(player, laser);
        if (dist === null) {
            continue;
        }

        if (hitDist < 0 || dist < hitDist) {
            hitPos = hit;
            hitDist = dist;
            hitPlayer = player;
        }
	}

	return [hitPlayer, hitPos];
}

function checkSingePlayerHit(player, laser) {
    // TODO: for other players predictedPos might be more accurate in general
    let playerCircle = new Circle(player.pos, conf.PLAYER_RADIUS);
    let overlap = collision.lineCircleOverlap(playerCircle, laser.line);
    if (overlap === null) {
        return [null, null];
    }
    let hit = laser.line.end.add(overlap);
    let dist = laser.line.start.distanceTo(hit);
    
    return [dist, hit];
}

function bounce(laser, hitPos, normal) {
	let incident = laser.line.end.sub(laser.line.start);
	let len = incident.length();
	let newLen = len - hitPos.sub(laser.line.start).length();
	laser.dir = incident.reflect(normal).normalize();
	laser.line.start = hitPos;
	laser.line.end = hitPos.add(laser.dir.scale(newLen));
}

export {Laser, update};