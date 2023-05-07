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
    static CMD_DROP_FLAG = 6;
    static CMD_TOGGLE_DEBUG = 7;
    static CMD_TOGGLE_RECORD = 8;
    static CMD_LAST = 9; // MUST BE LAST

    _commands = [];
    _keyMap = {};

    _doRecord = false;
    _recordedEvents = [];
    _didRecordEvent = false;
    _playbackIndex = 0;

    graphics;

    constructor(graphics) {
        this.graphics = graphics;

        this._keyMap['a'] = Input.CMD_LEFT;
        this._keyMap['d'] = Input.CMD_RIGHT;
        this._keyMap['w'] = Input.CMD_UP;
        this._keyMap['s'] = Input.CMD_DOWN;
        this._keyMap['g'] = Input.CMD_DROP_FLAG;
        this._keyMap['p'] = Input.CMD_TOGGLE_DEBUG;
        this._keyMap['r'] = Input.CMD_TOGGLE_RECORD;


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

    toggleRecord() {
        if (!this._doRecord) {
            this._recordedEvents = [];
        }
        this._doRecord = !this._doRecord;
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
        if (this._doRecord && this._keyMap[key] !== Input.CMD_TOGGLE_RECORD) {
            this._recordedEvents.push(event);
            this._didRecordEvent = true;
        }

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
        if (this._doRecord && this._keyMap[key] !== Input.CMD_TOGGLE_RECORD) {
            this._recordedEvents.push(event);
            this._didRecordEvent = true;
        }

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
        if (this._doRecord) {
            this._recordedEvents.push(event);
            this._didRecordEvent = true;
        }

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
        if (this._doRecord) {
            this._recordedEvents.push(event);
            this._didRecordEvent = true;
        }

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

    reset() {
        for (const cmd of this._commands) {
            if (!cmd._pressed) {
                cmd.active = false;
            }
            cmd.wasActivated = false;
        }

        if (this._doRecord && !this._didRecordEvent) {
            this._recordedEvents.push(null);
        }
        this._didRecordEvent = false;

        if (!this._doRecord && this._recordedEvents.length > 0) {
            console.log("playback: ", this._playbackIndex, " / ", this._recordedEvents.length)
            const evt = this._recordedEvents[this._playbackIndex];
            if (evt !== null) {
                if (evt.type === "mousedown") {
                    this._onMouseDown(evt);
                } else if (evt.type === "mouseup") {
                    this._onMouseUp(evt);
                } else if (evt.type === "keydown") {
                    this._onKeyDown(evt);
                } else if (evt.type === "keyup") {
                    this._onKeyUp(evt);
                }
            }
            this._playbackIndex = (this._playbackIndex + 1) % this._recordedEvents.length;
        }
    }
}

export { Input };