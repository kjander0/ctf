import {Transform} from "../math.js";

class Camera {
    transform = new Transform();
    invTransform = new Transform();
    projMatrix = new Float32Array(16);

    update(x, y, width, height) {
        this.transform = Transform.translation(-width/2.0 + x, -height/2.0 + y);
        this.invTransform = this.transform.affineInverse();

        const scaleX = 2 / width;
        const scaleY = 2 / height;
        this.projMatrix[0] = scaleX;
        this.projMatrix[5] = scaleY;
        this.projMatrix[10] = -1;
        this.projMatrix[12] = -1;
        this.projMatrix[13] = -1;
        this.projMatrix[15] = 1;
    }

    unproject(pos) {
        return this.transform.mul(pos);
    }
}

export {Camera};