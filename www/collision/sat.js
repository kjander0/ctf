import { Vec, compareFloat } from "../math.js";

const rectAxes = [new Vec(1, 0), new Vec(0, 1)];

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
        return null;
    }

    if (min0 + max0 < min1 + max1) {
        return max0 - min1;
    } else {
        return min0 - max1;
    }
}

function findMinOverlap(points0, points1, axes) {
    let minOverlap = 0;
    let minOverlapAxis = null;

    for (let axis of axes) {
        const overlap = checkOverlap(points0, points1, axis);
        if (overlap === null) {
            return null; // seperating axis found!
        }

        if (minOverlapAxis !== null && Math.abs(overlap) >= Math.abs(minOverlap)) {
            continue;
        }

        minOverlap = overlap;
        minOverlapAxis = axis;
        // keep track of smallest overlap axis, ignoring those occluded by tiling
    }

    return minOverlapAxis.scale(minOverlap);
}

function rectOverlap(r0, r1) {
    const points0 = rectPoints(r0);
    const points1 = rectPoints(r1);
    const overlap = findMinOverlap(points0, points1, rectAxes);
    return overlap;
}

function rectPoints(rect) {
    return [
        new Vec(rect.pos.x, rect.pos.y + rect.size.y), new Vec(rect.pos).add(rect.size),
        new Vec(rect.pos), new Vec(rect.pos.x + rect.size.x, rect.pos.y),
    ];


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
}

export {test};

