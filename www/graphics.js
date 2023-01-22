class Graphics {
    camContainer;
    screenRect;

    constructor(pixiApp) {
        this.screenRect = pixiApp.screen;
        this.camContainer = new PIXI.Container();
        this.camContainer.scale.y = -1;
        pixiApp.stage.addChild(this.camContainer);
        pixiApp.renderer.on("resize", (w, h) => { this.resize(w, h) });
    }

    moveCamera(x, y) {
        let centreOffsetX = x - this.screenRect.width/2;
        let centreOffsetY = y - this.screenRect.height/2;
        this.camContainer.position.x = -centreOffsetX;
        this.camContainer.position.y = this.screenRect.height + centreOffsetY;
    }

    resize(screenWidth, screenHeight) {
        moveCamera(screenWidth/2, screenHeight/2);
    }

    addPlayer() {
        // TODO: reuse pixi.Geometry for each instance of a drawable
        let p = new PIXI.Graphics();
        p.beginFill(0x00AA33);
        p.drawCircle(0, 0, 10);
        p.endFill();
        this.camContainer.addChild(p);
        return p;
    }
}

function update(world) {
    world.player.graphic.x = world.player.pos.x;
    world.player.graphic.y = world.player.pos.y;
}

export {Graphics, update}