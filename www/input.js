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

    commandMap = {};

    keyMap = {};

    mousePos = new Vec();

    constructor(pixiApp) {
        this.keyMap['a'] = CMD_LEFT;
        this.keyMap['d'] = CMD_RIGHT;
        this.keyMap['w'] = CMD_UP;
        this.keyMap['s'] = CMD_DOWN;

        let commands = [
            Input.CMD_LEFT, Input.CMD_RIGHT, Input.CMD_UP,
            Input.CMD_DOWN, Input.CMD_SHOOT
        ];
        commands.forEach((cmd) => {
            this.commandMap[cmd] = new Command(cmd);
        });
        document.addEventListener("keydown", keyDown);
        document.addEventListener("keyup", keyUp);
        pixiApp.view.onmousedown = pixiMouseDown;
        pixiApp.view.onmouseup = pixiMouseUp;
        pixiApp.view.onmousemove = pixiMouseMove;
    }

    keyDown(event) {
        if (event.repeat) {
            return
        }
        let key = event.key.toLowerCase();
        let cmd_type = this.keyMap[key];
        if (!cmd_type) {
            return;
        }
        cmd = this.commandMap[cmd_type];
        if (!cmd) {
            return;
        }
        cmd.active = true;
        cmd.wasActive = true;
    }
    
    keyUp(event) {
        if (event.repeat) {
            return
        }
        let key = event.key.toLowerCase();
        let cmd_type = this.keyMap[key];
        if (!cmd_type) {
            return;
        }
        cmd = this.commandMap[cmd_type];
        if (!cmd) {
            return;
        }
        cmd.active = false;
    }
    
    pixiMouseDown(event) {
        console.log("mouse down", event.data.global);
        beginCb({type: SHOOT, pos: event.data.global});
    }
    
    pixiMouseUp(event) {
        endCb({type: SHOOT, pos: event.data.global});
    }
    
    pixiMouseMove(event) {
        beginCb({type: AIM, pos: event.data.global})
    }
}

export { Input };