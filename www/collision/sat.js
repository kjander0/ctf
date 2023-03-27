import { Vec, Rect, compareFloat } from "../math.js";

const _rectAxes = [new Vec(1, 0), new Vec(0, 1)];

function test() {
    const r0 = new Rect(new Vec(0, 0), new Vec(50, 20));
    const r1 = new Rect(new Vec(40, 8), new Vec(80, 16));

    const overlap = rectOverlap(r0, r1);
}

function rectOverlap(r0, r1) {
    const points0 = _rectPoints(r0);
    const points1 = _rectPoints(r1);
    const overlap = _findMinOverlap(points0, points1, _rectAxes);
    return overlap;
}

function circleRectOverlap(c, r) {
    const rectPoints = _rectPoints(r);
    let axes = _rectAxes.slice();

    // Add seperation axes from rect corners to circle centre
    for (let p of rectPoints) {
        axes.push(c.pos.sub(p).normalize());
    }

    let minOverlap = 0;
    let minOverlapAxis = null;
    for (let axis of axes) {
        const circlePoints = [
            c.pos.add(axis.scale(c.radius)),
            c.pos.add(axis.scale(-c.radius)),
        ];
        const overlap = _checkOverlap(circlePoints, rectPoints, axis);
        if (overlap === null) {
            return null; // seperating axis found!
        }

        if (minOverlapAxis !== null && Math.abs(overlap) >= Math.abs(minOverlap)) {
            continue;
        }

        minOverlap = overlap;
        minOverlapAxis = axis;
    }

    return minOverlapAxis.scale(minOverlap);
}

function _computeAxes(points) {
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

function _uniqueAxes(axes) {
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

function _projection(points, axis) {
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
function _checkOverlap(points0, points1, axis) {
    const [min0, max0] = _projection(points0, axis);
    const [min1, max1] = _projection(points1, axis);

    if (max1 <= min0 || min1 >= max0) {
        return null;
    }

    if (min0 + max0 < min1 + max1) {
        return max0 - min1;
    } else {
        return min0 - max1;
    }
}

function _findMinOverlap(points0, points1, axes) {
    let minOverlap = 0;
    let minOverlapAxis = null;

    for (let axis of axes) {
        const overlap = _checkOverlap(points0, points1, axis);
        if (overlap === null) {
            return null; // seperating axis found!
        }

        if (minOverlapAxis !== null && Math.abs(overlap) >= Math.abs(minOverlap)) {
            continue;
        }

        minOverlap = overlap;
        minOverlapAxis = axis;
    }

    return minOverlapAxis.scale(minOverlap);
}

function _rectPoints(rect) {
    return [
        new Vec(rect.pos.x, rect.pos.y + rect.size.y), new Vec(rect.pos).add(rect.size),
        new Vec(rect.pos), new Vec(rect.pos.x + rect.size.x, rect.pos.y),
    ];
}

export {test, rectOverlap, circleRectOverlap};

