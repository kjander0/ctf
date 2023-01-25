function lerpVec(a, b, frac) {
    frac = Math.max(0, Math.min(1, frac));
    return a.scale(1-frac).add(b.scale(frac));
}

export {lerpVec};