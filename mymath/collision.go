package mymath

import (
	"math"
)

// Overlap from rect to circle
func CircleRectOverlap(c Circle, r Rect) (bool, Vec) {
	closestLine := r.ClosestSide(c.Pos)
	closestPoint := closestLine.ClosestPoint(c.Pos)

	centreInside := r.ContainsPoint(c.Pos)

	var overlapAxis Vec
	if centreInside {
		overlapAxis = c.Pos.Sub(closestPoint)
	} else {
		overlapAxis = closestPoint.Sub(c.Pos)
	}

	dist := overlapAxis.Length()
	if dist >= c.Radius && !centreInside {
		return false, Vec{}
	}

	// Make sepAxis unit vector
	if dist < 1e-6 {
		rectMid := r.Pos.Add(r.Size.Scale(0.5))
		overlapAxis = rectMid.Sub(closestPoint).Normalize()
	} else {
		overlapAxis = overlapAxis.Scale(1 / dist)
	}
	return true, overlapAxis.Scale(c.Radius - dist)
}

// lines: ccw lines of convex polygon
func CircleTriangleOverlap(circle Circle, t0 Vec, t1 Vec, t2 Vec) (bool, Vec) {
	// Triangle points and normals
	//        t2
	//        /\
	// n2 <- /  \ -> n1
	//      /    \
	//  t0 /______\ t1
	//         |
	//        n0

	// vectors from tri vertices to circle centre
	u0 := circle.Pos.Sub(t0)
	u1 := circle.Pos.Sub(t1)
	u2 := circle.Pos.Sub(t2)

	n0 := t1.Sub(t0).Normalize()
	n0.X, n0.Y = n0.Y, -n0.X

	u0DotNormal := u0.Dot(n0)
	if u0DotNormal > 0 { // below triangle
		return circleTriangleSideOverlap(circle, u0, u1, t0, t1, n0, u0DotNormal)
	}

	n1 := t2.Sub(t1).Normalize()
	n1.X, n1.Y = n1.Y, -n1.X
	u1DotNormal := u1.Dot(n1)
	if u1DotNormal > 0 { // below triangle
		return circleTriangleSideOverlap(circle, u1, u2, t1, t2, n1, u1DotNormal)
	}

	n2 := t0.Sub(t2).Normalize()
	n2.X, n2.Y = n2.Y, -n2.X
	u2DotNormal := u2.Dot(n2)
	if u2DotNormal > 0 { // below triangle
		return circleTriangleSideOverlap(circle, u2, u0, t2, t0, n2, u2DotNormal)
	}

	// circle centre withing triangle, overlap is from nearest side
	if u0DotNormal > u1DotNormal {
		if u0DotNormal > u2DotNormal {
			return true, n0.Scale(u0DotNormal - circle.Radius)
		}
		return true, n2.Scale(u2DotNormal - circle.Radius)
	}
	if u1DotNormal > u2DotNormal {
		return true, n1.Scale(u1DotNormal - circle.Radius)
	}
	return true, n2.Scale(u2DotNormal - circle.Radius)
}

func circleTriangleSideOverlap(circle Circle, u0 Vec, u1 Vec, t0 Vec, t1 Vec, n0 Vec, u0DotNormal float64) (bool, Vec) {
	if u0DotNormal >= circle.Radius {
		return false, Vec{}
	}

	l0 := t1.Sub(t0)
	l0Dotu0 := l0.Dot(u0)
	if l0Dotu0 < 0 { // closest to left point
		u0Len := u0.Length()
		if u0Len >= circle.Radius {
			return false, Vec{}
		}
		return true, u0.Scale((u0Len - circle.Radius) / u0Len)
	}

	if l0Dotu0 > l0.SqrLength() { // closest to right point
		u1Len := u1.Length()
		if u1Len >= circle.Radius {
			return false, Vec{}
		}
		return true, u1.Scale((u1Len - circle.Radius) / u1Len)
	}

	// perpendicular to bottom line
	if u0DotNormal >= circle.Radius {
		return false, Vec{}
	}
	return true, n0.Scale(u0DotNormal - circle.Radius)
}

// Returns intersection closest to start of line. If the start of the line is within the circle, returns this point.
func LaserCircleIntersect(l Line, circle Circle) (bool, Vec) {
	u := l.Start.Sub(circle.Pos)
	v := l.End.Sub(l.Start)
	a := v.Dot(v)
	b := 2 * u.Dot(v)
	c := u.Dot(u) - circle.Radius*circle.Radius
	discriminant := b*b - 4*a*c
	if discriminant < 0 {
		return false, u
	}
	sqrt := math.Sqrt(discriminant)
	t1 := (-b - sqrt) / (2 * a)
	t2 := (-b + sqrt) / (2 * a)
	if t2 <= 0 || t1 >= 1 {
		return false, u
	}
	return true, l.Start.Add(v.Scale(t1))
}

type Tiling struct {
	Left   bool
	Right  bool
	Top    bool
	Bottom bool
}

func LaserRectIntersect(l Line, r Rect) (bool, Vec, Vec) {
	// Avoid case of laser beggining slightly inside shape (e.g. after a bounce)
	if r.ContainsPoint(l.Start) {
		return false, Vec{}, Vec{}
	}

	lineDir := l.End.Sub(l.Start)
	var intersectsVertical bool
	var intersectionVertical Vec
	var normalVertical Vec
	if lineDir.X > 0 {
		intersectsVertical, intersectionVertical = l.Intersection(r.LeftLine())
		normalVertical = Vec{-1, 0}
	} else if lineDir.X < 0 {
		intersectsVertical, intersectionVertical = l.Intersection(r.RightLine())
		normalVertical = Vec{1, 0}
	}

	var intersectsHorizontal bool
	var intersectionHorizontal Vec
	var normalHorizontal Vec
	if lineDir.Y > 0 {
		intersectsHorizontal, intersectionHorizontal = l.Intersection(r.BottomLine())
		normalHorizontal = Vec{0, -1}
	} else if lineDir.Y < 0 {
		intersectsHorizontal, intersectionHorizontal = l.Intersection(r.TopLine())
		normalHorizontal = Vec{0, 1}
	}

	if intersectsVertical && intersectsHorizontal {
		distVertical := intersectionVertical.DistanceTo(l.Start)
		distHorizontal := intersectionHorizontal.DistanceTo(l.Start)
		if distVertical < distHorizontal {
			return true, intersectionVertical, normalVertical
		}
		return true, intersectionHorizontal, normalHorizontal
	}
	if intersectsVertical {
		return true, intersectionVertical, normalVertical
	}
	if intersectsHorizontal {
		return true, intersectionHorizontal, normalHorizontal
	}
	return false, intersectionVertical, normalVertical
}

func LaserTriangleIntersect(line Line, t0 Vec, t1 Vec, t2 Vec) (bool, Vec, Vec) {
	closestDist := -1.0
	var closestIntersect Vec
	var closestNormal Vec

	dist, intersect, normal := laserTriangleSideIntersect(line, t0, t1)
	if dist >= 0 && (closestDist < 0 || dist < closestDist) {
		closestDist = dist
		closestIntersect = intersect
		closestNormal = normal
	}

	dist, intersect, normal = laserTriangleSideIntersect(line, t1, t2)
	if dist >= 0 && (closestDist < 0 || dist < closestDist) {
		closestDist = dist
		closestIntersect = intersect
		closestNormal = normal
	}

	dist, intersect, normal = laserTriangleSideIntersect(line, t2, t0)
	if dist >= 0 && (closestDist < 0 || dist < closestDist) {
		closestDist = dist
		closestIntersect = intersect
		closestNormal = normal
	}

	return closestDist >= 0, closestIntersect, closestNormal
}

func laserTriangleSideIntersect(line Line, t0 Vec, t1 Vec) (float64, Vec, Vec) {
	normal := clockWiseNormal(t1.Sub(t0))
	if line.Start.Sub(t0).Dot(normal) > 0 { // Avoid case of laser beggining slightly inside shape (e.g. after a bounce)
		side := Line{t0, t1}
		intersected, intersect := line.Intersection(side)
		if intersected {
			dist := intersect.DistanceTo(line.Start)
			return dist, intersect, normal
		}
	}
	return -1.0, normal, normal
}

func clockWiseNormal(dir Vec) Vec {
	normal := dir.Normalize()
	normal.X, normal.Y = normal.Y, -normal.X
	return normal
}
