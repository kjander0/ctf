import { Vec, Line, Rect, Circle } from "./math.js";
import * as conf from "./conf.js";
import * as collision from "./collision/collision.js"
import { TileType, posFromRowCol } from "./map.js";

class Laser {
    static TYPE_LASER = 0;
    static TYPE_BOUNCY = 1;
    static TYPE_MISSILE = 2;

    static LASER_DRAW_LENGTH = 45;
    static BOUNCY_DRAW_LENGTH = 110;

    type;
    playerId;
    line = new Line();
    drawPoints;
    dir = new Vec();
    activeTicks = 0;
    compensated = false;
    startServerTick;

    constructor(type, playerId, pos, angle, serverTick) {
        this.type = type;
        this.playerId = playerId;
        this.line.start.set(pos);
        this.line.end.set(pos);
        this.drawPoints = [new Vec(this.line.start), new Vec(this.line.end)];
        this.dir = new Vec(Math.cos(angle), Math.sin(angle));
        this.startServerTick = serverTick;
    }

    getSpeed() {
        switch (this.type) {
            case Laser.TYPE_LASER:
                return conf.LASER_SPEED;
            case Laser.TYPE_BOUNCY:
                return conf.BOUNCY_SPEED;
            default:
                throw "unsupported laser type";
        }
    }

    getDrawLength() {
        let size = 0;
        for (let i = 0; i < this.drawPoints.length-1; i++) {
            let p0 = this.drawPoints[i];
            let p1 = this.drawPoints[i+1];
            size += p0.distanceTo(p1);
        }
        return size;
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
        let numberSteps = 1;
        if (!laser.compensated) { // one off lag compensation of projectiles
            laser.compensated = true;

            // For lasers from other players we fast forward them to account for how far ahead we
            // have predicted our own movement. Preferences laser location relative to us, versus relative
            // to other players.
            if (laser.playerId !== game.player.id) {
                const tickDiff = game.player.predictedInputs.unacked.length-1;
                numberSteps += tickDiff;
                laser.activeTicks += tickDiff;
            }
            
            // Fast forward lasers to the current tick (lasers can be older if we received multiple messages
            // on the same client tick)
            let tickDiff = game.serverTick - laser.startServerTick;
            if (tickDiff < 0) { // game.serverTick wrapped > 255
                tickDiff += 256;
            }
            numberSteps += tickDiff;
            laser.activeTicks += tickDiff;
        }

        for (let j = 0; j < numberSteps; j++) {
            let line = laser.line;
            line.start.set(line.end);
            line.end = line.end.add(laser.dir.scale(laser.getSpeed()));
            laser.drawPoints[laser.drawPoints.length-1].set(line.end);
            if (processCollisions(game, laser)) {
                game.laserList[i] = game.laserList[game.laserList.length-1];
                game.laserList.splice(game.laserList.length-1, 1);
                break;
            }
            _reduceLaserDrawLength(laser);
        }
    }
}

function _reduceLaserDrawLength(laser) {
    let size = laser.getDrawLength();

    let targetDrawLength = Laser.LASER_DRAW_LENGTH;
    if (laser.type === Laser.TYPE_BOUNCY) {
        targetDrawLength = Laser.BOUNCY_DRAW_LENGTH;
    }
    // Keep an extra segment worth of length for lerping
    targetDrawLength += laser.getSpeed();

    while (size > targetDrawLength) {
        const diff = size - targetDrawLength;
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

// Returns true if laser has hit a wall and should be destroyed
function processCollisions(game, laser) {
    // Keep resolving collisions until laser has stopped bouncing
    while (true) {
        let [hitDist, hitPos, normal] = checkWallHit(game, laser.line);
        let [hitPlayerDist, hitPlayerPos, hitPlayer] = checkPlayerHit(game, laser);
        if (hitPlayerDist !== null && (hitDist === null || hitPlayerDist < hitDist)) {
            hitDist = hitPlayerDist;
            hitPos = hitPlayerPos;
        }

        if (hitDist === null) {
            return false
        }

        if (laser.type !== Laser.TYPE_BOUNCY) {
            return true;
        }

        if (hitPlayer !== null) {
            return true;
        }

        bounce(laser, hitPos, normal);
    }
}

function checkWallHit(game, line) {
	let lineLen = line.length();
	let tileSample = game.map.sampleSolidTiles(line.end, lineLen);
	let hitPos, hitNormal;
	let hitDist = null;
    let tileRect = new Rect(new Vec(), new Vec(conf.TILE_SIZE, conf.TILE_SIZE));
    const t0 = new Vec(); const t1 = new Vec(); const t2 = new Vec();
	for (let tile of tileSample) {
		tileRect.pos.set(tile.pos);
        let hit, normal;
        if (tile.type === TileType.WALL) {
            [hit, normal] = collision.laserRectIntersect(line, tileRect);
            if (hit === null) {
                continue;
            }
        } else if (tile.type === TileType.WALL_TRIANGLE || tile.type === TileType.WALL_TRIANGLE_CORNER) {
            tile.setTrianglePoints(t0, t1, t2);
            [hit, normal] = collision.laserTriangleIntersect(line, t0, t1, t2);
            if (hit === null) {
                continue;
            }
        }

		let dist = line.start.distanceTo(hit);
		if (hitDist === null || dist < hitDist) {
			hitPos = hit;
			hitDist = dist;
            hitNormal = normal;
		}
	}
	return [hitDist, hitPos, hitNormal];
}

function checkPlayerHit(game, laser) {
	let hitPos = null;
    let hitDist = null;
	let hitPlayer = null;

    // Check local player
    if (game.player.id !== laser.playerId) {
        let [dist, hit] = _checkSinglePlayerHit(game.player, laser);
        if (dist !== null && (hitDist === null || dist < hitDist)) {
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
        let [dist, hit] = _checkSinglePlayerHit(player, laser);
        if (dist === null) {
            continue;
        }
        if (hitDist === null || dist < hitDist) {
            hitPos = hit;
            hitDist = dist;
            hitPlayer = player;
        }
	}

	return [hitDist, hitPos, hitPlayer];
}

function _checkSinglePlayerHit(player, laser) {
    // TODO: for other players predictedPos might be more accurate in general
    let playerCircle = new Circle(player.pos, conf.PLAYER_RADIUS);
    let hitPos = collision.laserCircleIntersect(laser.line, playerCircle);
    if (hitPos === null) {
        return [null, null];
    }
    let dist = laser.line.start.distanceTo(hitPos);
    
    return [dist, hitPos];
}

function bounce(laser, hitPos, normal) {
	const incident = laser.line.end.sub(laser.line.start);
	laser.dir = incident.reflect(normal).normalize();
	laser.line.start = hitPos;
    let newLen = laser.line.end.sub(hitPos).length();
	laser.line.end = hitPos.add(laser.dir.scale(newLen));
    laser.drawPoints[laser.drawPoints.length-1].set(hitPos);
    laser.drawPoints.push(new Vec(laser.line.end));
}

export {Laser, update};