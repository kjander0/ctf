import { Vec, Rect, Circle, Line } from "./math.js"
import { Input } from "./input.js"
import {Predicted} from "./predicted.js"
import * as conf from "./conf.js"
import * as sound from "./sound.js"
import * as collision from "./collision/collision.js"
import * as sat from "./collision/sat.js"

class PlayerPredicted {
    pos = new Vec();
    dir = new Vec();
    energy = conf.MAX_LASER_ENERGY;
    bouncyEnergy = conf.MAX_BOUNCY_ENERGY;

    constructor (other) {
        if (other !== undefined) {
            this.set(other);
        }
    }

    set(other) {
        this.pos.set(other.pos);
        this.dir.set(other.dir);
        this.energy = other.energy;
        this.bouncyEnergy = other.bouncyEnergy;
    }
}

class Player {
    static STATE_SPECTATING = 0;
    static STATE_JAILED = 1;
    static STATE_ALIVE = 2;

    static MAX_INPUT_PREDICTIONS = 60;
    static MAX_DIR_PREDICTIONS = 5;

    id;
    state = Player.STATE_SPECTATING;
    stateChanged = false;
    inputState = null;
    predictedInputs = new Predicted(Player.MAX_INPUT_PREDICTIONS);
    predictedDirs = new Predicted(Player.MAX_DIR_PREDICTIONS);
    // direction numbers
    // 4 3 2
    // 5 0 1
    // 6 7 8
    lastAckedDirNum = 0; // used for extrapolating movement of other players
    prevPos = new Vec();
    pos = new Vec();

    acked = new PlayerPredicted();
    predicted = new PlayerPredicted();
}

class PlayerInputState {
    clientTick = 0;
    left = false;
    right = false;
    up = false;
    down = false;
    doShoot = false;
    doSecondary = false;
    aimAngle = 0;
}

function sampleInput(game) {
    let inputState = new PlayerInputState();
    inputState.clientTick = game.clientTick;
    if (game.input.isActive(Input.CMD_LEFT)) {
        inputState.left = true;
    }
    if (game.input.isActive(Input.CMD_RIGHT)) {
        inputState.right = true;
    }
    if (game.input.isActive(Input.CMD_UP)) {
        inputState.up = true;
    }
    if (game.input.isActive(Input.CMD_DOWN)) {
        inputState.down = true;
    }

    let shootCmd = game.input.getCommand(Input.CMD_SHOOT);
    if (shootCmd.wasActivated) {
        if (game.player.predicted.energy >= conf.LASER_ENERGY_COST) {
            inputState.doShoot = true;
            let aimPos = game.graphics.camera.unproject(shootCmd.mousePos);
            inputState.aimAngle = _calcAimAngle(game.player.pos, aimPos);
        }
    }

    let secondaryCmd = game.input.getCommand(Input.CMD_SECONDARY);
    if (secondaryCmd.wasActivated) {
        console.log(game.player.predicted.bouncyEnergy, conf.BOUNCY_ENERGY_COST);
        if (game.player.predicted.bouncyEnergy >= conf.BOUNCY_ENERGY_COST) {
            inputState.doSecondary = true;
            let aimPos = game.graphics.camera.unproject(secondaryCmd.mousePos);
            inputState.aimAngle = _calcAimAngle(game.player.pos, aimPos);
        }
    }

    game.player.inputState = inputState;
    game.player.predictedInputs.predict(inputState, game.clientTick);
}

function update(game) {
    for (let other of game.otherPlayers) {
        _updateOtherPlayer(other, game);
    }

    _updatePlayer(game);
}

function _updatePlayer(game) {
    if (game.player.stateChanged) {
        game.player.pos.set(game.player.acked.pos);
        game.player.prevPos.set(game.player.acked.pos);
        game.player.predicted.set(game.player.acked);
        game.player.stateChanged = false;
        return;
    }

    if (game.player.inputState.doShoot) {
        sound.laser.play();
    }
    if (game.player.inputState.doSecondary) {
        sound.bouncy.play();
    }

    game.player.predicted = new PlayerPredicted(game.player.acked);
    // TODO: make dirFromInput function so we don't have these 4 if conditions repeated twice
    for (let unacked of game.player.predictedInputs.unacked) {
        let inputState = unacked.val;
        let disp = _calcDisplacement(inputState);
        game.player.predicted.pos = game.player.predicted.pos.add(disp);
        _constrainPlayerPos(game, game.player.predicted.pos);

        if (inputState.doShoot && game.player.predicted.energy >= conf.LASER_ENERGY_COST) {
            game.player.predicted.energy -= conf.LASER_ENERGY_COST;
        }
        if (inputState.doSecondary && game.player.predicted.bouncyEnergy >= conf.BOUNCY_ENERGY_COST) {
            game.player.predicted.bouncyEnergy -= conf.BOUNCY_ENERGY_COST;
        }
        game.player.predicted.energy = Math.min(game.player.predicted.energy+1, conf.MAX_LASER_ENERGY);
        game.player.predicted.bouncyEnergy = Math.min(game.player.predicted.bouncyEnergy+1, conf.MAX_BOUNCY_ENERGY);
    }

    // Display pos is slowly corrected to predicted pos
    game.player.prevPos = game.player.pos;
    let disp = _calcDisplacement(game.player.inputState);
    game.player.pos = game.player.pos.add(disp);
    _constrainPlayerPos(game, game.player.pos);
    
    let correction = game.player.predicted.pos.sub(game.player.pos);
    let corrLen = correction.length();
    if (corrLen > conf.PLAYER_SPEED) {
        correction = correction.scale(conf.PLAYER_SPEED / corrLen);
    }

    game.player.stateChanged = false;
    //game.player.pos = game.player.pos.add(correction);

}

function _updateOtherPlayer(player, game) {
    player.prevPos.set(player.pos);
    player.pos.set(player.acked.pos);
    for (const predicted of player.predictedDirs.unacked) {
        let disp = _dirFromNum(predicted.val).scale(conf.PLAYER_SPEED);
        player.pos = player.pos.add(disp);
    }

    // Predict movement for next tick
    let lastTick = player.predictedDirs.lastTickOrNull();
    if (lastTick === null) {
        lastTick = game.serverTick;
    }
    player.predictedDirs.predict(player.lastAckedDirNum, lastTick+1);
}

function _constrainPlayerPos(game, pos) {
	// TODO can optimize by only sampling tiles in direction of movement
	const tileSample = game.map.sampleSolidTiles(pos, conf.PLAYER_RADIUS);
    const tileRect = new Rect(new Vec(), new Vec(conf.TILE_SIZE, conf.TILE_SIZE));
	const playerCircle = new Circle(pos, conf.PLAYER_RADIUS);
    //const playerRect = new Rect(new Vec(), new Vec(conf.PLAYER_RADIUS * 2, conf.PLAYER_RADIUS * 2));



	for (let tilePos of tileSample) {
        //playerRect.pos.set(pos.subXY(conf.PLAYER_RADIUS, conf.PLAYER_RADIUS));
        playerCircle.pos.set(pos);
		tileRect.pos.set(tilePos);

        DRAW AN ACTUAL TRIANGLE
        const p0 = tileRect.pos;
        const p1 = tileRect.pos.addXY(tileRect.size.x, 0);
        const p2 = tileRect.pos.add(tileRect.size);
        const overlap = collision.circleTriangleOverlap(playerCircle, p0, p1,p2);
		//const overlap = collision.circleRectOverlap(playerCircle, tileRect)
        //const overlap = sat.rectOverlap(playerRect, tileRect);
        //const overlap = sat.circleRectOverlap(playerCircle, tileRect);
		if (overlap === null) {
			continue
		}
		pos.set(pos.sub(overlap))
        console.log(overlap);
	}
}

function _calcAimAngle(startPos, aimPos) {
    let dir = aimPos.sub(startPos);
    if (dir.length() < 1e-3) {
        return 0;
    }
    return Math.atan2(dir.y, dir.x);
}

function _calcDisplacement(input) {
    let dir = new Vec();
    if (input.left) {
        dir.x -= 1;
    }
    if (input.right) {
        dir.x += 1;
    }
    if (input.up) {
        dir.y += 1;
    }
    if (input.down) {
        dir.y -= 1;
    }
    let len = dir.length();
    if (len < 1e-6) {
        return dir;
    }
    return dir.scale(conf.PLAYER_SPEED/len);
}

// direction numbers
// 4 3 2
// 5 0 1
// 6 7 8
function _dirFromNum(num) {
    if (num == 1) {
        return new Vec(1, 0);
    }
    if (num == 2) {
        return new Vec(1, 1);
    }
    if (num == 3) {
        return new Vec(0, 1);
    }
    if (num == 4) {
        return new Vec(-1, 1);
    }
    if (num == 5) {
        return new Vec(-1, 0);
    }
    if (num == 6) {
        return new Vec(-1, -1);
    }
    if (num == 7) {
        return new Vec(0, -1);
    }
    if (num == 8) {
        return new Vec(1, -1);
    }
    return new Vec(0, 0);
}

export {Player, PlayerInputState, sampleInput, update}