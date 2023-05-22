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

// Returns intersection closest to start of line. If the start of the line is within the circle, returns this point.
function laserCircleIntersect(l, circle) {
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
	return l.start.add(v.scale(t1));
}

// Return intersection closest to start of line.
function laserRectIntersect(line, rect) {
	// Avoid case of laser beggining slightly inside shape (e.g. after a bounce)
	if (rect.containsPoint(line.start)) {
		return [null, null];
	}

	const lineDir = line.end.sub(line.start);
	let intersectionVertical;
	let normalVertical;
	if (lineDir.x > 0) {
		intersectionVertical = line.intersection(rect.leftLine());
		normalVertical = new Vec(-1, 0);
	} else if (lineDir.x < 0) {
		intersectionVertical = line.intersection(rect.rightLine());
		normalVertical = new Vec(1, 0);
	}

	let intersectionHorizontal;
	let normalHorizontal;
	if (lineDir.y > 0) {
		intersectionHorizontal = line.intersection(rect.bottomLine());
		normalHorizontal = new Vec(0, -1);
	} else if (lineDir.y < 0) {
		intersectionHorizontal = line.intersection(rect.topLine());
		normalHorizontal = new Vec(0, 1);
	}

	if (intersectionVertical && intersectionHorizontal) {
		let distVertical = intersectionVertical.distanceTo(line.start);
		let distHorizontal = intersectionHorizontal.distanceTo(line.start);
		if (distVertical < distHorizontal) {
			return [intersectionVertical, normalVertical];
		} else {
			return [intersectionHorizontal, normalHorizontal];
		}
	}
	if (intersectionVertical) {
		return [intersectionVertical, normalVertical];
	}
	if (intersectionHorizontal) {
		return [intersectionHorizontal, normalHorizontal];
	}
	return [null, null];
}

// Return intersection closest to start of line.
function laserTriangleIntersect(line, t0, t1, t2) {
	let closestDist = -1.0;
	let closestIntersect = null;
	let closestNormal = null;

	let [dist, intersect, normal] = _laserTriangleSideIntersect(line, t0, t1)
	if (dist >= 0 && (closestDist < 0 || dist < closestDist)) {
		closestDist = dist
		closestIntersect = intersect
		closestNormal = normal
	}

	[dist, intersect, normal] = _laserTriangleSideIntersect(line, t1, t2)
	if (dist >= 0 && (closestDist < 0 || dist < closestDist)) {
		closestDist = dist
		closestIntersect = intersect
		closestNormal = normal
	}

	[dist, intersect, normal] = _laserTriangleSideIntersect(line, t2, t0)
	if (dist >= 0 && (closestDist < 0 || dist < closestDist)) {
		closestDist = dist
		closestIntersect = intersect
		closestNormal = normal
	}
	return [closestIntersect, closestNormal];
}

function _laserTriangleSideIntersect(line, t0, t1) {
	const normal = _clockWiseNormal(t1.sub(t0));
	if (line.start.sub(t0).dot(normal) > 0) { // Avoid case of laser beggining slightly inside shape (e.g. after a bounce)
		const side = new Line(t0, t1);
		const intersect = line.intersection(side);
		if (intersect !== null) {
			let dist = intersect.distanceTo(line.start)
			return [dist, intersect, normal];
		}
	}

	return [-1.0, null, null];
}

function _clockWiseNormal(dir) {
	const normal = dir.normalize();
	const tmpX = normal.x;
	normal.x = normal.y;
	normal.y = -tmpX;
	return normal;
}

export {circleRectOverlap, circleTriangleOverlap, laserCircleIntersect, laserRectIntersect, laserTriangleIntersect};