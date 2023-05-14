#version 300 es
precision mediump float;

in vec2 vTexCoord;
out vec4 fragColor;

void main() {
    fragColor = vec4(vTexCoord, 0, 1);
}