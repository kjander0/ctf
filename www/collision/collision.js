import {Vec, Line} from "../math.js";

// Overlap from rect to circle
function circleRectOverlap(c, r) {
	const closestLine = r.closestSide(c.pos);
	const closestPoint = closestLine.closestPoint(c.pos);

	const centreInside = r.containsPoint(c.pos);

	let overlapAxis;
	if (centreInside) {
		overlapAxis = c.pos.sub(closestPoint);
	} else {
		overlapAxis = closestPoint.sub(c.pos);
	}

	let dist = overlapAxis.length();
	if (dist >= c.radius && !centreInside) {
		return null
	}

	// If centre of circle on side of rect, need to make sure axis is non-zero
	if (dist < 1e-6) {
		const rectMid = r.pos.add(r.size.scale(0.5));
		overlapAxis = rectMid.sub(closestPoint).normalize();
	} else {
		overlapAxis = overlapAxis.scale(1/dist);
	}

	return overlapAxis.scale(c.radius - dist);
}

// lines: ccw lines of convex polygon
function circleTriangleOverlap(circle, t0, t1, t2) {
	// Triangle points and normals
	//        t2
	//        /\
	// n2 <- /  \ -> n1
	//      /    \
	//  t0 /______\ t1
	//         |
	//        n0

	const n0 = t1.sub(t0).normalize();
	let tmpX = n0.x;
	n0.x = n0.y;
	n0.y = -tmpX;
	const u0 = circle.pos.sub(t0);
	const u1 = circle.pos.sub(t1);
	const u2 = circle.pos.sub(t2);

	const u0DotNormal = u0.dot(n0);
	if (u0DotNormal > 0) { // below triangle
		return _circleTriangleSideOverlap(circle, u0, u1, t0, t1, n0, u0DotNormal);
	}

	const n1 = t2.sub(t1).normalize();
	tmpX = n1.x;
	n1.x = n1.y;
	n1.y = -tmpX;
	const u1DotNormal = u1.dot(n1);
	if (u1DotNormal > 0) { // below triangle
		return _circleTriangleSideOverlap(circle, u1, u2, t1, t2, n1, u1DotNormal);
	}

	const n2 = t0.sub(t2).normalize();
	tmpX = n2.x;
	n2.x = n2.y;
	n2.y = -tmpX;
	const u2DotNormal = u2.dot(n2);
	if (u2DotNormal > 0) { // below triangle
		return _circleTriangleSideOverlap(circle, u2, u0, t2, t0, n2, u2DotNormal);
	}

	// circle centre withing triangle, overlap is from nearest side
	if (u0DotNormal > u1DotNormal) {
		if (u0DotNormal > u2DotNormal) {
			return n0.scale(u0DotNormal - circle.radius);
		}
		return n2.scale(u2DotNormal - circle.radius);
	}
	if (u1DotNormal > u2DotNormal) {
		return n1.scale(u1DotNormal - circle.radius);
	}
	return n2.scale(u2DotNormal - circle.radius);
}

function _circleTriangleSideOverlap(circle, u0, u1, t0, t1, n0, u0DotNormal) {
	if (u0DotNormal >= circle.radius) {
		return null;
	}

	const l0 = t1.sub(t0);
	const l0Dotu0 = l0.dot(u0);
	if (l0Dotu0 < 0) { // closest to left point
		const u0Len = u0.length();
		if (u0Len >= circle.radius) {
			return null;
		}
		return u0.scale((u0Len - circle.radius)/u0Len);
	}

	if (l0Dotu0 > l0.sqrLength()) { // closest to right point
		const u1Len = u1.length();
		if (u1Len >= circle.radius) {
			return null;
		}
		return u1.scale((u1Len - circle.radius)/u1Len);
	}

	// perpendicular to bottom line
	if (u0DotNormal >= circle.radius) {
		return null;
	}
	return n0.scale(u0DotNormal - circle.radius);
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

function lineTriangleOverlap(line, t0, t1, t2) {
	const l0 = t1.sub(t0);
	const n0 = _clockWiseNormal(l0);
	let d0 = line.start.sub(t0).dot(n0);

	const l1 = t2.sub(t1);
	const n1 = _clockWiseNormal(l1);
	let d1 = line.start.sub(t1).dot(n1);

	const l2 = t0.sub(t2);
	const n2 = _clockWiseNormal(l2);
	let d2 = line.start.sub(t2).dot(n2);

	// if start of line within triangle, move it backwards so we
	// find intersection with the nearest side.
	if (d0 < 0 && d1 < 0 && d2 < 0) {
		line.start = line.start.sub(line.end.sub(line.start).resize(Math.abs(d0) + Math.abs(d1) + Math.abs(d2)));
		d0 = line.start.sub(t0).dot(n0);
		d1 = line.start.sub(t1).dot(n1);
		d2 = line.start.sub(t2).dot(n2);
	}

	if (d0 > 0) {
		const side = new Line(t0, t1);
		const intersect = line.intersection(side);
		if (intersect !== null) {
			return [intersect.sub(line.end), n0];
		}
	}

	if (d1 > 0) {
		const side = new Line(t1, t2);
		const intersect = line.intersection(side);
		if (intersect !== null) {
			return [intersect.sub(line.end), n1];
		}
	}

	if (d2 > 0) {
		const side = new Line(t2, t0);
		const intersect = line.intersection(side);
		if (intersect !== null) {
			return [intersect.sub(line.end), n2];
		}
	}

	return [null, null];
}

function _clockWiseNormal(dir) {
	const normal = dir.normalize();
	const tmpX = normal.x;
	normal.x = normal.y;
	normal.y = -tmpX;
	return normal;
}

export {circleRectOverlap, circleTriangleOverlap, lineCircleOverlap, lineRectOverlap, lineTriangleOverlap};