#version 300 es
layout (location=0) in vec2 aVertexPosition;
layout (location=1) in vec4 aColor;

out vec4 vColor;
uniform mat3 uCamMatrix;
uniform mat4 uProjMatrix;
void main() {
    vColor = aColor;
    vec2 screenPos = (uCamMatrix * vec3(aVertexPosition, 1)).xy;
    gl_Position = uProjMatrix * vec4(screenPos, 0, 1);

    gl_PointSize = 1.0; // TODO: remove this once we have better method of drawing particles
}