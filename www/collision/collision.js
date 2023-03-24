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

export {circleRectOverlap, lineCircleOverlap, lineRectOverlap};