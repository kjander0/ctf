#version 300 es
layout (location=0) in vec2 aVertexPosition;
layout (location=3) in vec3 aTexCoord;

out vec3 vTexCoord;
uniform mat3 uCamMatrix;
uniform mat4 uProjMatrix;

void main() {
    vTexCoord = aTexCoord;
    vec2 screenPos = (uCamMatrix * vec3(aVertexPosition, 1)).xy;
    gl_Position = uProjMatrix * vec4(screenPos, 0, 1);
}