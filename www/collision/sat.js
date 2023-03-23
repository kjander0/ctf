import { Vec, compareFloat } from "../math.js";

function computeUniqueAxes(points) {
    const axes = [];
    for (let i = 0; i < points.length-1; i++) {
        const edge = points[i+1].sub(points[i]);
        const newAxis = new Vec(-edge.y, edge.x).normalize(); // perpendicular to edge

        let isDuplicate = false;
        for (let axis of axes) {
            const sameness = Math.abs(axis.dot(newAxis));
            if (compareFloat(sameness, 1.0, 1e-3)) {
                isDuplicate = true;
                break;
            }
        }

        if (!isDuplicate) {
            axes.push(newAxis);
        }
    }
    return axes;
}

function projection(points, axis) {
    let min = null;
    let max = null;

    for (let p of points) {
        let s = p.dot(axis);
        if (min === null || s < min) {
            min = s;
        }
        if (max === null || s > max) {
            max = s;
        }
    }
    return [min, max];
}

// overlap of points0 over points1 on axis
// 0 means no overlap
// -ve means overlaps in opposite axis dir
function overlap(points0, points1, axis) {
    const {min0, max0} = projection(points0, axis);
    const {min1, max1} = projection(points1, axis);

    if (max1 > min0 && min1 < max0) {
        if (min0 + max0 < min1, max1) {
            return max0 - min1;
        } else {
            return max1 - min0;
        }
    }
    return 0;
}

function test() {
    const points0  = [
        new Vec(0, 0), new Vec(50, 0),
        new Vec(50, 20), new Vec(0, 20),
    ];
    const points1  = [
        new Vec(40, 8), new Vec(80, 8),
        new Vec(80, 16), new Vec(40, 16),
    ];

    let axes0 = computeUniqueAxes(points0);
    console.log(axes0);
    let axes1 = computeUniqueAxes(points1);
    console.log(axes1);
}

export {test};

