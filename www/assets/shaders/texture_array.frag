#version 300 es
precision mediump float;
precision mediump sampler2DArray;

uniform sampler2DArray uTex0;

in vec3 vTexCoord; // texture array is sampled with 3d coord
out vec4 fragColor;

void main() {
    fragColor = texture(uTex0, vTexCoord);
}