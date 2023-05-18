#version 300 es
precision mediump float;

out vec4 fragColor;
in vec4 vColor;
in vec2 worldPos;
in vec2 particlePos;

void main() {
    float atten = (10.0 - length(worldPos - particlePos))/10.0;
    fragColor = atten * vColor;
}