import { Vec, compareFloat } from "../math.js";

function computeUniqueAxes(points) {
    const axes = [];
    for (let i = 0; i < points.length-1; i++) {
        const newAxis = new Vec(-points[i+1], point[i]).normalize(); // perpendicular to edge
        for (let axis of axes) {
            const sameness = Math.abs(axis.dot(newAxis));
            if (compareFloat(sameness, 1.0, 1e-3)) { // check for duplicate (parallel)
                axes.push(newAxis);
                break;
            }
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

