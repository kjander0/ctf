#version 300 es
precision mediump float;

uniform sampler2D uTex0;

in vec2 vTexCoord;
out vec4 fragColor;

void main() {
    fragColor = texture(uTex0, vTexCoord);
}