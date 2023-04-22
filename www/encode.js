import { Vec } from "./math.js";

class Encoder {
    _dv = new DataView(new ArrayBuffer(1024));
    _offset = 0;

    constructor() {
        this.reset();
    }

    reset() {
        this._offset = 0;
    }

    writeUint8(val) {
        this._dv.setUint8(this._offset, val);
        this._offset += 1;
    }

    writeInt32(val) {
        this._dv.setInt32(this._offset, val);
        this._offset += 4;
    }

    writeFloat64(val) {
        this._dv.setFloat64(this._offset, val);
        this._offset += 8;
    }

    writeVec(val) {
        this._dv.setFloat64(this._offset, val.x);
        this._offset += 8;
        this._dv.setFloat64(this._offset, val.y);
        this._offset += 8;
    }

    getView() {
        return new DataView(this._dv.buffer, 0, this._offset);
    }
}

class Decoder {
    _dv;
    _offset = 0;
    _buf;

    constructor(buf) {
        this._buf = buf;
        this._dv = new DataView(buf);
    }

    readInt8() {
        let val = this._dv.getInt8(this._offset);
        this._offset += 1;
        return val;
    }

    readUint8() {
        let val = this._dv.getUint8(this._offset);
        this._offset += 1;
        return val;
    }

    readUint16() {
        let val = this._dv.getUint16(this._offset);
        this._offset += 2;
        return val;
    }

    readInt32() {
        let val = this._dv.getInt32(this._offset);
        this._offset += 4;
        return val;
    }

    readFloat64() {
        let val = this._dv.getFloat64(this._offset);
        this._offset += 8;
        return val;
    }

    readVec() {
        let x = this._dv.getFloat64(this._offset);
        this._offset += 8;
        let y = this._dv.getFloat64(this._offset);
        this._offset += 8;
        return new Vec(x, y);
    }

    uint8Array(size) {
        let arr = new Uint8Array(this._buf, this._offset, size);
        this._offset += size;
        return arr;
    }
}

export {Encoder, Decoder};