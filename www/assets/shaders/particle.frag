#version 300 es
precision mediump float;

out vec4 fragColor;
in vec4 vColor;
in vec2 worldPos;
in vec2 particlePos;

void main() {
    PASS PARTICLE START/END SIZE AS ATTRIBUTE

    DO BETTER ALPHA BLENDING OF PARTICLES (STOP THE DARK OUTLINES)
    float atten = (5.0 - length(worldPos - particlePos))/5.0;
    fragColor = vColor;
    fragColor.a *= atten;
}