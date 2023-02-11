package mymath

import (
	"math"
)

// Overlap from rect to circle
func CircleRectOverlap(c Circle, r Rect) (bool, Vec) {
	closestLine := r.ClosestSide(c.Pos)
	closestPoint := closestLine.ClosestPoint(c.Pos)

	centreInside := r.ContainsPoint(c.Pos)

	var sepAxis Vec
	if centreInside {
		sepAxis = closestPoint.Sub(c.Pos)
	} else {
		sepAxis = c.Pos.Sub(closestPoint)
	}
	sepLen := sepAxis.Length()

	if sepLen >= c.Radius && !centreInside {
		return false, Vec{}
	}

	// Make sepAxis unit vector
	if sepLen < 1e-6 {
		rectMid := r.Pos.Add(r.Size.Scale(0.5))
		sepAxis = closestPoint.Sub(rectMid)
		sepLen = sepAxis.Length()
	}
	sepAxis = sepAxis.Scale(1.0 / sepLen)

	overlap := closestPoint.Sub(c.Pos.Add(sepAxis.Scale(-c.Radius)))
	return true, overlap
}

// Overlap from circle to line
func LineCircleOverlap(circle Circle, l Line) (bool, Vec) {
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
	pos := l.Start.Add(v.Scale(t1))
	return true, pos.Sub(l.End)
}

func LineRectOverlap(l Line, r Rect) (bool, Vec, Vec) {
	u := l.End.Sub(l.Start)

	if r.ContainsPoint(l.Start) {
		// Send start backward so we obtain intersection
		l.Start = l.Start.Sub(u.Resize(r.Size.X + r.Size.Y))
	}

	var intersects bool
	var intersection Vec
	var normal Vec
	if u.X > 0 {
		intersects, intersection = l.Intersection(r.LeftLine())
		normal = Vec{-1, 0}
	} else {
		intersects, intersection = l.Intersection(r.RightLine())
		normal = Vec{1, 0}
	}

	if !intersects {
		if u.Y > 0 {
			intersects, intersection = l.Intersection(r.BottomLine())
			normal = Vec{0, -1}
		} else {
			intersects, intersection = l.Intersection(r.TopLine())
			normal = Vec{0, 1}
		}
	}

	if intersects {
		return true, intersection.Sub(l.End), normal
	}
	return false, intersection, normal
}
