#version 300 es
precision mediump float;

in vec2 vTexCoord;
in vec4 vColor;

out vec4 fragColor;

uniform sampler2D uTex0;


void main() {
    fragColor = texture(uTex0, vTexCoord);
    fragColor.a *= vColor.a;
}