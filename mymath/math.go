package mymath

import (
	"math"
)

type Vec struct {
	X float64
	Y float64
}

type Rect struct {
	Pos  Vec
	Size Vec
}

type Circle struct {
	Pos    Vec
	Radius float64
}

type Line struct {
	Start Vec
	End   Vec
}

// Compare returns true even if start/end are opposite
func CompareLine(a, b Line, eps float64) bool {
	return CompareVec(a.Start, b.Start, eps) && CompareVec(a.End, b.End, eps) || CompareVec(a.Start, b.End, eps) && CompareVec(a.End, b.Start, eps)
}

func CompareVec(a, b Vec, eps float64) bool {
	return CompareFloat(a.X, b.X, eps) && CompareFloat(a.Y, b.Y, eps)
}

func CompareFloat(a, b, eps float64) bool {
	return math.Abs(a-b) < eps
}

func (l Line) Intersection(other Line) (bool, Vec) {
	u := l.End.Sub(l.Start)
	v := other.End.Sub(other.Start)

	vCrossU := v.Cross(u)
	if CompareFloat(vCrossU, 0, 1e-6) { // Lines parallel
		if CompareFloat(l.Start.Sub(other.Start).Cross(v), 0, 1e-6) { // Collinear
			vLenSquared := v.Dot(v)
			t0 := l.Start.Sub(other.Start).Dot(v) / vLenSquared
			t1 := l.End.Sub(other.Start).Dot(v) / vLenSquared
			if t0 > t1 {
				t0, t1 = t1, t0
			}
			if t0 >= 0 && t0 <= 1 || t1 >= 0 && t1 <= 1 || t0 <= 0 && t1 >= 1 {
				// return middle of overlap
				intersectT := (math.Max(0, t0) + math.Min(1, t1)) / 2
				return true, other.Start.Add(v.Scale(intersectT))
			}
		}
		return false, u
	}

	s := l.Start.Sub(other.Start).Cross(v) / vCrossU
	t := l.Start.Sub(other.Start).Cross(u) / vCrossU

	if s >= 0 && s <= 1 && t >= 0 && t <= 1 {
		return true, l.Start.Add(u.Scale(s))
	}
	return false, u
}

func (l Line) ClosestPoint(p Vec) Vec {
	u := l.End.Sub(l.Start)
	v := p.Sub(l.Start)

	uLen := u.Length()
	if uLen < 1e-6 {
		return l.Start
	}

	sLen := v.Dot(u) / uLen

	if sLen < 0 {
		return l.Start
	} else if sLen > uLen {
		return l.End
	}

	s := u.Resize(sLen)
	return l.Start.Add(s)
}

func (l Line) Length() float64 {
	return l.End.Sub(l.Start).Length()
}

func (l Line) Translate(offset Vec) Line {
	l.Start = l.Start.Add(offset)
	l.End = l.End.Add(offset)
	return l
}

func (l Line) Midpoint() Vec {
	return l.Start.Add(l.End).Scale(0.5)
}

func (r *Rect) ClosestPoint(p Vec) Vec {
	closestPoint := r.Pos

	if p.X < r.Pos.X {
		closestPoint = r.LeftLine().ClosestPoint(p)
	} else if p.X > r.Pos.X+r.Size.X {
		closestPoint = r.RightLine().ClosestPoint(p)
	} else if p.Y < r.Pos.Y {
		closestPoint = r.BottomLine().ClosestPoint(p)
	} else if p.Y > r.Pos.Y+r.Size.Y {
		closestPoint = r.TopLine().ClosestPoint(p)
	} else {
		closestPoint = p
	}
	return closestPoint
}

func (r Rect) ClosestSide(pos Vec) Line {
	closestDist := r.TopLine().ClosestPoint(pos).DistanceTo(pos)
	closestLine := r.TopLine()

	candidateDist := r.BottomLine().ClosestPoint(pos).DistanceTo(pos)
	if candidateDist < closestDist {
		closestDist = candidateDist
		closestLine = r.BottomLine()
	}

	candidateDist = r.LeftLine().ClosestPoint(pos).DistanceTo(pos)
	if candidateDist < closestDist {
		closestDist = candidateDist
		closestLine = r.LeftLine()
	}

	candidateDist = r.RightLine().ClosestPoint(pos).DistanceTo(pos)
	if candidateDist < closestDist {
		closestDist = candidateDist
		closestLine = r.RightLine()
	}
	return closestLine
}

func (r Rect) Midpoint() Vec {
	return r.Pos.Add(r.Size.Scale(0.5))
}

func (r Rect) ContainsPoint(p Vec) bool {
	return p.X > r.Pos.X && p.X < r.Pos.X+r.Size.X && p.Y > r.Pos.Y && p.Y < r.Pos.Y+r.Size.Y
}

func (r Rect) TopLine() Line {
	return Line{r.Pos.AddXY(0, r.Size.Y), r.Pos.Add(r.Size)}
}

func (r Rect) BottomLine() Line {
	return Line{r.Pos, r.Pos.AddXY(r.Size.X, 0)}
}

func (r Rect) LeftLine() Line {
	return Line{r.Pos, r.Pos.AddXY(0, r.Size.Y)}
}

func (r Rect) RightLine() Line {
	return Line{r.Pos.AddXY(r.Size.X, 0), r.Pos.Add(r.Size)}
}

func (v Vec) Cross(u Vec) float64 {
	return v.X*u.Y - v.Y*u.X
}

func (v Vec) RotateCW() Vec {
	v.X, v.Y = v.Y, -v.X
	return v
}

func (v Vec) RotateCCW() Vec {
	v.X, v.Y = -v.Y, v.X
	return v
}

func (v Vec) Add(u Vec) Vec {
	v.X += u.X
	v.Y += u.Y
	return v
}

func (v Vec) AddXY(X, Y float64) Vec {
	return Vec{v.X + X, v.Y + Y}
}

func (v Vec) Sub(u Vec) Vec {
	v.X -= u.X
	v.Y -= u.Y
	return v
}

func (v Vec) Scale(s float64) Vec {
	v.X *= s
	v.Y *= s
	return v
}

func (v Vec) ScaleXY(xScale, yScale float64) Vec {
	v.X *= xScale
	v.Y *= yScale
	return v
}

func (v Vec) Length() float64 {
	return math.Sqrt(v.X*v.X + v.Y*v.Y)
}

func (v Vec) Resize(l float64) Vec {
	return v.Normalize().Scale(l)
}

func (v Vec) Normalize() Vec {
	return v.Scale(1.0 / v.Length())
}

func (v Vec) Dot(u Vec) float64 {
	return v.X*u.X + v.Y*u.Y
}

func (v Vec) DistanceTo(u Vec) float64 {
	a := v.Sub(u)
	return a.Length()
}

func (v Vec) Angle() float64 {
	return math.Atan2(v.Y, v.X)
}

// Rotate vector CCW
func (v Vec) Rotate(angle float64) Vec {
	currentAngle := v.Angle()
	currentAngle += angle
	mag := v.Length()
	return Vec{mag * math.Cos(currentAngle), mag * math.Sin(currentAngle)}
}

func (v Vec) Reflect(normal Vec) Vec {
	return v.Sub(normal.Scale(2.0 * v.Dot(normal)))
}
