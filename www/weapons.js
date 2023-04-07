import { Vec, Line, Rect, Circle } from "./math.js";
import * as conf from "./conf.js";
import * as collision from "./collision/collision.js"
import { Tile } from "./map.js";

class Laser {
    static TYPE_LASER = 0;
    static TYPE_BOUNCY = 1;
    static TYPE_MISSILE = 2;

    static LASER_DRAW_LENGTH = 15;
    static BOUNCY_DRAW_LENGTH = 600;

    type;
    playerId;
    line = new Line();
    drawPoints;
    dir = new Vec();
    compensated = false;
    activeTicks = 0;

    constructor(type, playerId, pos, angle) {
        this.type = type;
        this.playerId = playerId;
        this.line.start.set(pos);
        this.line.end.set(pos);
        this.drawPoints = [new Vec(this.line.start), new Vec(this.line.end)];
        this.dir = new Vec(Math.cos(angle), Math.sin(angle));
    }
}

function update(game) {
    for (let i = game.laserList.length-1; i >= 0; i--) {
        game.laserList[i].activeTicks += 1;
        if (game.laserList[i].activeTicks > conf.LASER_TIME_TICKS) {
            game.laserList[i] = game.laserList[game.laserList.length-1];
            game.laserList.splice(game.laserList.length-1, 1);
        }
    }

    for (let i = game.laserList.length-1; i >= 0; i--) {
        let laser = game.laserList[i];
        let speed = conf.LASER_SPEED;
        if (laser.type === Laser.TYPE_BOUNCY) {
            speed = conf.BOUNCY_SPEED;
        }
        // TODO: are client and server moving laser at same time on same tick?
        let numberSteps = 1;
        if (!laser.compensated) {
            laser.compensated = true;
            let tickDiff = game.player.predictedInputs.unacked.length;
            if (tickDiff < 0) { // client tick wrapped and server tick has not
                tickDiff += 256;
            }
            numberSteps += tickDiff;
            laser.activeTicks += tickDiff;
        }

        for (let j = 0; j < numberSteps; j++) {
            let line = laser.line;
            line.end = line.end.add(laser.dir.scale(speed));
            laser.drawPoints[laser.drawPoints.length-1].set(line.end);

            const [bounced, destroyed] = processCollisions(game, laser);
            if (destroyed) {
                game.laserList[i] = game.laserList[game.laserList.length-1];
                game.laserList.splice(game.laserList.length-1, 1);
                break;
            }
            if (!bounced) {
                line.start.set(line.end);
            }
            limitLaserDrawLength(laser);
        }
    }
}

function limitLaserDrawLength(laser) {
    let size = 0;
    for (let i = 0; i < laser.drawPoints.length-1; i++) {
        let p0 = laser.drawPoints[i];
        let p1 = laser.drawPoints[i+1];
        size += p0.distanceTo(p1);
    }

    let maxDrawLength = Laser.LASER_DRAW_LENGTH;
    if (laser.type === Laser.TYPE_BOUNCY) {
        maxDrawLength = Laser.BOUNCY_DRAW_LENGTH;
    }

    while (size > maxDrawLength) {
        const diff = size - maxDrawLength;
        const disp = laser.drawPoints[1].sub(laser.drawPoints[0]);
        const dispLen = disp.length();
        if (dispLen <= diff) {
            size -= dispLen;
            laser.drawPoints.splice(0, 1);
            continue;
        }

        laser.drawPoints[0] = laser.drawPoints[0].add(disp.scale(diff/dispLen));
        break;
    }
}

// Returns [bounced, destroyed] status after collision checks
function processCollisions(game, laser) {
    let [hitDist, hitPos, normal] = checkWallHit(game, laser.line);
    let [hitPlayer, hitPlayerPos] = checkPlayerHit(game, laser, hitDist);
    if (hitDist < 0 && hitPlayer === null) {
        return [false, false];
    }

    if (hitPlayer !== null) {
        console.log("hit player");
    } else if (laser.type == Laser.TYPE_BOUNCY) {
        bounce(laser, hitPos, normal);
        return [true, false];
    }

    return [false, true];
}

function checkWallHit(game, line) {
	let tileRect = new Rect(new Vec(), new Vec(conf.TILE_SIZE, conf.TILE_SIZE));
	let lineLen = line.length();
	let tileSample = game.map.sampleSolidTiles(line.end, lineLen);
	let hitPos, hitNormal;
	let hitDist = -1.0;
    const t0 = new Vec(); const t1 = new Vec(); const t2 = new Vec();
	for (let tile of tileSample) {
		tileRect.pos.set(tile.pos);
        let overlap, normal;
        if (tile.type === Tile.WALL) {
            [overlap, normal] = collision.lineRectOverlap(line, tileRect);
            if (overlap === null) {
                continue;
            }
        } else if (tile.type === Tile.WALL_TRIANGLE || tile.type === Tile.WALL_TRIANGLE_CORNER) {
            tile.setTrianglePoints(t0, t1, t2);
            [overlap, normal] = collision.lineTriangleOverlap(line, t0, t1, t2);
            if (overlap === null) {
                continue;
            }
            console.log("tri: ", overlap, normal)
        }

		let hit = line.end.add(overlap);
		let dist = line.start.distanceTo(hit);
		if (hitDist < 0 || dist < hitDist) {
			hitPos = hit;
			hitDist = dist;
            hitNormal = normal;
		}
	}
	return [hitDist, hitPos, hitNormal];
}

function checkPlayerHit(game, laser, hitDist) {
	let hitPos = null;
	let hitPlayer = null;

    // Check local player
    if (game.player.id !== laser.playerId) {
        let [dist, hit] = checkSingePlayerHit(game.player, laser);
        if (dist !== null && (hitDist < 0 || dist < hitDist)) {
            hitPos = hit;
            hitDist = dist;
            hitPlayer = game.player;
        }
    }

    // Check other players
	for (let player of game.otherPlayers) {
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
    laser.drawPoints[laser.drawPoints.length-1].set(hitPos);
    laser.drawPoints.push(new Vec(laser.line.end));
}

export {Laser, update};