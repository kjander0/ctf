import {Transform} from "../math.js";

class Camera {
    transform = new Transform();
    invTransform = new Transform();

    update(x, y, width, height) {
        this.transform = Transform.translation(-width/2.0 + x, -height/2.0 + y);
        this.invTransform = this.transform.affineInverse();
    }

    unproject(pos) {
        return this.transform.mul(pos);
    }
}

export {Camera};