import { Vec } from "./math.js";

class Command {
    cmdIndex;
    active = false;
    wasActivated = false;
    mousePos = new Vec();
    _pressed = false;

    constructor(cmdIndex) {
        this.cmdIndex = cmdIndex;
    }
}

class Input {
    static CMD_LEFT = 0;
    static CMD_RIGHT = 1;
    static CMD_UP = 2;
    static CMD_DOWN = 3;
    static CMD_SHOOT = 4;
    static CMD_LAST = 5; // MUST BE LAST

    _pixiApp;
    _commands = [];
    _keyMap = {};

    constructor(pixiApp) {
        this._pixiApp = pixiApp;
        pixiApp.stage.interactive = true;
        pixiApp.stage.hitArea = pixiApp.screen;
        this._keyMap['a'] = Input.CMD_LEFT;
        this._keyMap['d'] = Input.CMD_RIGHT;
        this._keyMap['w'] = Input.CMD_UP;
        this._keyMap['s'] = Input.CMD_DOWN;

        for (let i = 0; i < Input.CMD_LAST; i++) {
            this._commands.push(new Command(i));
        }

        document.addEventListener("keydown", (event) => this._onKeyDown(event));
        document.addEventListener("keyup", (event) => this._onKeyUp(event));
        pixiApp.stage.addEventListener("mousedown", (event) => this._onMouseDown(event));
        pixiApp.stage.addEventListener("mouseup", (event) => this._onMouseUp(event));
        pixiApp.stage.addEventListener("mousemove", (event) => this._onMouseMove(event));
    }

    isActive(cmdIndex) {
        return this._commands[cmdIndex].active;
    }

    _onKeyDown(event) {
        if (event.repeat) {
            return
        }
        let key = event.key.toLowerCase();
        let cmdIndex = this._keyMap[key];
        if (cmdIndex === undefined) {
            return;
        }
        let cmd = this._commands[cmdIndex];
        if (cmd === undefined) {
            return;
        }
        cmd.active = true;
        cmd.activated = true;
        cmd._pressed = true;
    }
    
    _onKeyUp(event) {
        if (event.repeat) {
            return
        }
        let key = event.key.toLowerCase();
        let cmdIndex = this._keyMap[key];
        if (cmdIndex === undefined) {
            return;
        }
        let cmd = this._commands[cmdIndex];
        if (cmd === undefined) {
            return;
        }
        cmd._pressed = false;
    }
    
    _onMouseDown(event) {
        let cmdIndex = Input.CMD_SHOOT;
        let cmd = this._commands[cmdIndex];
        if (cmd === undefined) {
            return;
        }
        cmd.mousePos = new Vec(event.globalX, event.globalY);
        cmd.active = true;
        cmd.activated = true;
        cmd._pressed = true;
    }
    
    _onMouseUp(event) {
        let cmdIndex = Input.CMD_SHOOT;
        let cmd = this._commands[cmdIndex];
        if (cmd === undefined) {
            return;
        }
        cmd.mousePos = new Vec(event.globalX, event.globalY);
        cmd._pressed = false;
    }
    
    _onMouseMove(event) {
    }
}

function postUpdate(world) {
    for (const cmd of world.input._commands) {
        if (!cmd._pressed) {
            cmd.active = false;
        }
        cmd.activated = false;
    }
}

export { Input, postUpdate };