import { Vec, compareFloat } from "../math.js";

function computeAxes(points) {
    const axes = [];
    for (let i = 0; i < points.length; i++) {
        const p0 = points[i];
        let nextIndex = i+1;
        if (nextIndex === points.length) {
            nextIndex = 0;
        }
        const p1 = points[nextIndex];
        const edge = p1.sub(p0);
        const newAxis = new Vec(-edge.y, edge.x).normalize(); // perpendicular to edge
        axes.push(newAxis);
    }
    return axes;
}

function uniqueAxes(axes) {
    const uniqueAxes = [];

    for (let axis of axes) {
        let isDuplicate = false;
        for (let otherAxis of uniqueAxes) {
            const sameness = Math.abs(axis.dot(otherAxis));
            if (compareFloat(sameness, 1.0, 1e-3)) {
                isDuplicate = true;
                break;
            }
        }
        if (!isDuplicate) {
            uniqueAxes.push(axis);
        }
    }
    return uniqueAxes;
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
function checkOverlap(points0, points1, axis) {
    const [min0, max0] = projection(points0, axis);
    const [min1, max1] = projection(points1, axis);

    if (max1 <= min0 || min1 >= max0) {
        return 0;
    }

    if (min0 + max0 < min1 + max1) {
        return max0 - min1;
    } else {
        return min0 - max1;
    }
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

    let axes = computeAxes(points0).concat(computeAxes(points1));
    axes = uniqueAxes(axes);
    console.log(axes);

    for (let axis of axes) {
        const overlap = checkOverlap(points0, points1, axis);
        console.log(overlap);
    }

    keep track of smallest overlap axis, ignoring those occluded by tiling
}

export {test};

