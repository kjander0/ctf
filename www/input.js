import { Vec } from "./math.js";

class Command {
    cmd;

    constructor(cmd) {
        this.cmd = cmd;
    }
}

class Input {
    static CMD_LEFT = 0;
    static CMD_RIGHT = 1;
    static CMD_UP = 2;
    static CMD_DOWN = 3;
    static CMD_SHOOT = 4;

    _mousePos = new Vec();
    _canvas;
    _commandMap = {};
    _keyMap = {};

    constructor(canvas) {
        this._canvas = canvas;
        this._keyMap['a'] = Input.CMD_LEFT;
        this._keyMap['d'] = Input.CMD_RIGHT;
        this._keyMap['w'] = Input.CMD_UP;
        this._keyMap['s'] = Input.CMD_DOWN;

        let commands = [
            Input.CMD_LEFT, Input.CMD_RIGHT, Input.CMD_UP,
            Input.CMD_DOWN, Input.CMD_SHOOT
        ];
        commands.forEach((cmd) => {
            this._commandMap[cmd] = new Command(cmd);
        });
        document.addEventListener("keydown", (event) => this._onKeyDown(event));
        document.addEventListener("keyup", (event) => this._onKeyUp(event));
        canvas.addEventListener("mousedown", (event) => this._onMouseDown(event));
        canvas.addEventListener("mouseup", (event) => this._onMouseUp(event));
        canvas.addEventListener("mousemove", (event) => this._onMouseMove(event));
    }

    mousePos() {
        return new Vec(this._mousePos);
    }

    isActive(cmd_type) {
        return this._commandMap[cmd_type].isActive;
    }

    wasActive(cmd_type) {
        return this._commandMap[cmd_type].wasActive;
    }

    _clientToCanvasPos(clientPos) {
        let rect = this._canvas.getBoundingClientRect();
        return clientPos.subXY(rect.x, rect.y);
    }

    _onKeyDown(event) {
        if (event.repeat) {
            return
        }
        let key = event.key.toLowerCase();
        let cmd_type = this._keyMap[key];
        if (!cmd_type) {
            return;
        }
        let cmd = this._commandMap[cmd_type];
        if (!cmd) {
            return;
        }
        cmd.active = true;
        cmd.wasActive = true;
    }
    
    _onKeyUp(event) {
        if (event.repeat) {
            return
        }
        let key = event.key.toLowerCase();
        let cmd_type = this._keyMap[key];
        if (!cmd_type) {
            return;
        }
        let cmd = this._commandMap[cmd_type];
        if (!cmd) {
            return;
        }
        cmd.active = false;
    }
    
    _onMouseDown(event) {
        console.log(this._clientToCanvasPos(new Vec(event.clientX, event.clientY)));
    }
    
    _onMouseUp(event) {
        console.log(this._clientToCanvasPos(new Vec(event.clientX, event.clientY)));
    }
    
    _onMouseMove(event) {
        console.log(this._clientToCanvasPos(new Vec(event.clientX, event.clientY)));
    }
}

export { Input };