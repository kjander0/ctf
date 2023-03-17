import {Player} from "./player.js";

class WorldState {
    player = new Player();
    otherPlayers = [];
    laserList = [];

    set(other) {
        this.player.set(other.player);

        this.otherPlayers = [];
        for (let otherPlayer of other.otherPlayers) {
            this.otherPlayers.push(new Player().set(otherPlayer));
        }

        this.laserList = [];
        for (let otherLaser of other.laserList) {
            this.laserList.push(new Laser().set(otherLaser))
        }
    }
}

class WorldHistory {
    _startIndex = 0;
    size = 0;
    _capacity;
    _buffer = [];

    constructor(capacity) {
        this._capacity = capacity;
        for (let i = 0; i < capacity; i++) {
            this._buffer.push(new WorldState());
        }
    }

    push(world) {
        const nextIndex = (this._startIndex + this.size) % this._capacity;
        if (this.size === this._capacity) {
            this._startIndex = (this._startIndex + 1) % this._capacity;
        } else {
            this.size++;
        }
        console.log("start: ", this._startIndex, " size: ", this.size, " push to: ", nextIndex);
        this._buffer[nextIndex].set(world);
    }

    //  index 0 returns oldest value
    //  index -1 returns latest value
    get(index) {
        index %= this.size;
        if (index < 0) {
            index += this.size;
        }
        index = (index + this._startIndex) % this._capacity;
        console.log("start: ", this._startIndex, " size: ", this.size, " get: ", index);
        return this._buffer[index];
    }
}

export { WorldState, WorldHistory };