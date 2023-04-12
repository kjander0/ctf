class Color {
    r;
    g;
    b;
    a;
    
    constructor (r, g, b, a=1) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    set(r, g, b, a=1) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    add(other) {
        return new Color(this.r + other.r, this.g + other.g, this.b + other.b, this.a + other.a);
    }

    scale(s) {
        return new Color(s * this.r, s * this.g, s * this.b, s * this.a);
    }

    lerp(toColor, fraction) {
        return this.scale(1-fraction).add(toColor.scale(fraction));
    }
}

export {Color};