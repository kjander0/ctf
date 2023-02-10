package mymath

import (
	"math"

	"github.com/kjander0/ctf/logger"
)

// Overlap from c0 to c1
func CircleOverlap(c0 Circle, c1 Circle) (bool, Vec) {
	disp := c1.Pos.Sub(c0.Pos)
	dispLen := disp.Length()
	overlapLen := (c0.Radius + c1.Radius) - dispLen
	if overlapLen <= 0 {
		return false, disp
	}

	return true, disp.Scale(overlapLen / dispLen)
}

// Overlap from rect to circle
func CircleRectOverlap(c Circle, r Rect) (bool, Vec) {
	var overlap Vec

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
		return false, overlap
	}

	// Make sepAxis unit vector
	if sepLen < 1e-6 {
		logger.Debug("doing the crappy overlap case")
		rectMid := r.Pos.Add(r.Size.Scale(0.5))
		sepAxis = closestPoint.Sub(rectMid)
		sepLen = sepAxis.Length()
	}
	sepAxis = sepAxis.Scale(1 / sepLen)

	overlap = closestPoint.Sub(c.Pos.Add(sepAxis.Scale(-c.Radius)))
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
	if t2 < 0 || t1 > 1 {
		return false, u
	}
	pos := l.Start.Add(v.Scale(t1))
	return true, pos.Sub(l.End)
}

func LineRectOverlap(l Line, r Rect) (bool, Vec) {
	u := l.End.Sub(l.Start)

	if r.ContainsPoint(l.Start) {
		// Send start backward so we obtain intersection
		l.Start = l.Start.Sub(u.Resize(r.Size.X + r.Size.Y))
	}

	var intersects bool
	var intersection Vec
	if u.X > 0 {
		intersects, intersection = l.Intersection(r.LeftLine())
	} else {
		intersects, intersection = l.Intersection(r.RightLine())
	}

	if !intersects {
		if u.Y > 0 {
			intersects, intersection = l.Intersection(r.BottomLine())
		} else {
			intersects, intersection = l.Intersection(r.TopLine())
		}
	}

	if intersects {
		return true, intersection.Sub(l.End)
	}
	return false, intersection
}
