import {Vec, Line} from "../math.js";

// Overlap from rect to circle
function circleRectOverlap(c, r) {
	const closestLine = r.closestSide(c.pos);
	const closestPoint = closestLine.closestPoint(c.pos);

	const centreInside = r.containsPoint(c.pos);

	let sepAxis;
	if (centreInside) {
		sepAxis = closestPoint.sub(c.pos);
	} else {
		sepAxis = c.pos.sub(closestPoint);
	}

	let sepLen = sepAxis.length();
	if (sepLen >= c.radius && !centreInside) {
		return null
	}

	// Make sepAxis unit vector
	if (sepLen < 1e-6) {
		const rectMid = r.pos.add(r.size.scale(0.5));
		sepAxis = closestPoint.sub(rectMid);
		sepLen = sepAxis.length();
	}
	sepAxis = sepAxis.scale(1.0 / sepLen);

	const overlap = closestPoint.sub(c.pos.add(sepAxis.scale(-c.radius)));
	return overlap;
}

// lines: ccw lines of convex polygon
function circlePolygonOverlap(c, lines) {
	let minOverlap = 0;
	let minOverlapAxis = null;

	// Check 3 seperating axis for each line:
	// TODO: can skip end point of last line since it should be the same
	//  as the start point of the first line
	for (let l of lines) {
		// 1) axis for outward facing normal of line
		const normal = l.end.sub(l.start).normalize();
		const tmpX = normal.x;
		normal.x = normal.y;
		normal.y = -tmpX;

		let disp = c.pos.sub(l.start);
		let overlap = c.radius - disp.dot(normal);
		if (overlap <= 0) {
			return null;
		}

		if (minOverlapAxis === null || overlap < minOverlap) {
			minOverlap = overlap;
			minOverlapAxis = normal.scale(-1);
		}

		// 2) axis between circle and start point of line
		overlap = c.radius - disp.length();
		if (disp.dot(normal) >= 0) {
			if (overlap <= 0) {
				return null;
			}
	
			if (minOverlapAxis === null || overlap < minOverlap) {
				minOverlap = overlap;
				minOverlapAxis = disp.normalize().scale(-1);
			}
		}


		// 3) axis between circle and end point of line
		// disp = c.pos.sub(l.end);
		// overlap = c.radius - disp.length();
		// if (disp.dot(normal) >= 0) {
		// 	if (overlap <= 0) {
		// 		return null;
		// 	}
	
		// 	if (minOverlapAxis === null || overlap < minOverlap) {
		// 		minOverlap = overlap;
		// 		minOverlapAxis = disp.normalize().scale(-1);
		// 	}
		// }
	}

	return minOverlapAxis.scale(minOverlap);
}

// Overlap from circle to line
function lineCircleOverlap(circle, l) {
	let u = l.start.sub(circle.pos);
	let v = l.end.sub(l.start);
	let a = v.dot(v);
	let b = 2 * u.dot(v);
	let c = u.dot(u) - circle.radius*circle.radius;
	let discriminant = b*b - 4*a*c;
	if (discriminant < 0) {
		return null;
	}

	let sqrt = Math.sqrt(discriminant);
	let t1 = (-b - sqrt) / (2 * a);
	let t2 = (-b + sqrt) / (2 * a);
	if (t2 <= 0 || t1 >= 1) {
		return null;
	}
	let pos = l.start.add(v.scale(t1));
	return pos.sub(l.end);
}

function lineRectOverlap(l, r) {
    l = new Line(l.start, l.end); // copy since we might make changes
	let u = l.end.sub(l.start);

	if (r.containsPoint(l.start)) {
		// Send start backward so we obtain intersection
		l.start = l.start.sub(u.resize(r.size.x + r.size.y));
	}

	let intersection;
	let normal;
	if (u.x > 0) {
		intersection = l.intersection(r.leftLine());
		normal = new Vec(-1, 0);
	} else {
		intersection = l.intersection(r.rightLine());
		normal = new Vec(1, 0);
	}

	if (!intersection) {
		if (u.y > 0) {
			intersection = l.intersection(r.bottomLine());
			normal = new Vec(0, -1);
		} else {
			intersection = l.intersection(r.topLine());
			normal = new Vec(0, 1);
		}
	}

	if (intersection) {
		return [intersection.sub(l.end), normal];
	}
	return [null, null];
}

export {circleRectOverlap, lineCircleOverlap, lineRectOverlap, circlePolygonOverlap};