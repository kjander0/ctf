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
function circleTriangleOverlap(circle, t0, t1, t2) {
	// Triangle points and normals
	//        t2
	//        /\
	// n2 <- /  \ -> n1
	//      /    \
	//  t0 /______\ t1
	//         |
	//        n0


	// TODO, test just bottom side first
	let n0 = t1.sub(t0).normalize();
	let tmpX = n0.x;
	n0.x = n0.y;
	n0.y = -tmpX;
	let u0 = circle.pos.sub(t0)
	let u0DotNormal = u0.dot(n0);


	if (u0DotNormal > 0) {
		if (u0DotNormal > circle.radius) {
			return null;
		}

		let l0Dotu0 = t1.sub(t0).dot(u0);

	}

	let n1 = t2.sub(t1).normalize();
	tmpX = n1.x;
	n1.x = n1.y;
	n1.y = -tmpX;
	let d1 = circle.pos.sub(t1).dot(n1);
	if (d1 >= circle.radius) {
		return null;
	}

	let n2 = t0.sub(t2).normalize();
	tmpX = n2.x;
	n2.x = n2.y;
	n2.y = -tmpX;
	let d2 = circle.pos.sub(t2).dot(n2);
	if (d2 >= circle.radius) {
		return null;
	}

	function pointOverlap(point, circle) {
		const disp = point.sub(circle.pos);
		const dispLen = disp.length();
		const overlap = circle.radius - dispLen;
		if (overlap <= 0) {
			return null;
		}
		return disp.scale(overlap/dispLen);
	}

	function lineOverlap(normal, dist) {
		const overlap = circle.radius - dist;
		if (overlap <= 0) {
			return null;
		}
		return normal.scale(-overlap);
	}

	// First, we check cases where centre of circle is outside the triangle
	if (d0 > 0) {
		if (d1 > 0) { // case: t1 closest point
			return pointOverlap(t1, circle);
		}
		if (d2 > 0) { // case: t0 closest point
			return pointOverlap(t0, circle);

		}
		// case: t0 -> t1 closest line
		return lineOverlap(n0, d0);
	}
	if (d1 > 0) {
		if (d2 > 0) { // case: t2 closest point
			return pointOverlap(t2, circle);
		}
		// case: t1 -> t2 closest line
		return lineOverlap(n1, d1);
	}

	if (d2 > 0) { // case: t2 -> t0 closest line
		return lineOverlap(n2, d2);

	}

	// case: circle centre within triangle, overlaps is from nearest side
	if (d0 > d1) {
		if (d0 > d2) {
			return n0.scale(d0 - circle.radius);
		}
		return n2.scale(d2 - circle.radius);
	}
	if (d1 > d2) {
		return n1.scale(d1 - circle.radius);
	}
	return n2.scale(d2 - circle.radius);
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

export {circleRectOverlap, lineCircleOverlap, lineRectOverlap, circleTriangleOverlap};