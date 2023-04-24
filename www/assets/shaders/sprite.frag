#version 300 es
precision mediump float;

uniform sampler2D uTex0; // albedo
uniform sampler2D uTex1; // highlights

in vec2 vTexCoord;
out vec4 fragColor;

void main() {
    fragColor = texture(uTex0, vTexCoord) + texture(uTex1, vTexCoord);
    fragColor.rgb -= 0.25 * pow(fragColor.rgb, vec3(2.0)); // tone map
    fragColor.a = 1.0; // if not this, then disable depth test so final image is not mixed with clearColor
}