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
    static CMD_SECONDARY = 5;
    static CMD_LAST = 6; // MUST BE LAST

    _commands = [];
    _keyMap = {};

    graphics;

    constructor(graphics) {
        this.graphics = graphics;

        this._keyMap['a'] = Input.CMD_LEFT;
        this._keyMap['d'] = Input.CMD_RIGHT;
        this._keyMap['w'] = Input.CMD_UP;
        this._keyMap['s'] = Input.CMD_DOWN;

        for (let i = 0; i < Input.CMD_LAST; i++) {
            this._commands.push(new Command(i));
        }
        document.addEventListener("keydown", (event) => this._onKeyDown(event));
        document.addEventListener("keyup", (event) => this._onKeyUp(event));
        document.addEventListener("mousedown", (event) => this._onMouseDown(event));
        document.addEventListener("mouseup", (event) => this._onMouseUp(event));
        document.addEventListener("mousemove", (event) => this._onMouseMove(event));
        // Suppress right click context menu
        document.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            return false;
        }, false);
    }

    getCommand(cmdIndex) {
        return this._commands[cmdIndex];
    }

    isActive(cmdIndex) {
        return this._commands[cmdIndex].active;
    }

    wasActivated(cmdIndex) {
        return this._commands[cmdIndex].wasActivated;
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
        cmd.wasActivated = true;
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

    _relPos(clientX, clientY) {
        const clientRect = this.graphics.canvas.getBoundingClientRect();
        return new Vec(clientX / clientRect.width * this.graphics.screenSize.x, (1 - clientY / clientRect.height) *  this.graphics.screenSize.y);
    }
    
    _onMouseDown(event) {
        let cmdIndex = Input.CMD_SHOOT;
        if (event.button === 2) {
            cmdIndex = Input.CMD_SECONDARY;
        }
        let cmd = this._commands[cmdIndex];
        if (cmd === undefined) {
            return;
        }

        cmd.mousePos = this._relPos(event.clientX, event.clientY);
        cmd.active = true;
        cmd.wasActivated = true;
        cmd._pressed = true;
    }
    
    _onMouseUp(event) {
        let cmdIndex = Input.CMD_SHOOT;
        if (event.button === 2) {
            cmdIndex = Input.CMD_SECONDARY;
        }
        let cmd = this._commands[cmdIndex];
        if (cmd === undefined) {
            return;
        }
        cmd.mousePos = this._relPos(event.clientX, event.clientY);
        cmd._pressed = false;
    }
    
    _onMouseMove(event) {
    }

    postUpdate() {
        for (const cmd of this._commands) {
            if (!cmd._pressed) {
                cmd.active = false;
            }
            cmd.wasActivated = false;
        }
    }
}

export { Input};