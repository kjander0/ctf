#version 300 es
precision mediump float;
out vec4 fragColor;
in vec4 vColor;
void main() {
    fragColor = vColor;
    fragColor.r = 1.0f;
    fragColor.a = 1.0f;
}