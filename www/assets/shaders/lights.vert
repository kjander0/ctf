#version 300 es
layout (location=0) in vec2 aVertexPosition;
layout (location=2) in vec2 aTexCoord;
layout (location=3) in vec2 aLightPos;

out vec2 vTexCoord;
out vec2 vLightPos;
out vec2 vPos;

uniform mat4 uProjMatrix;
uniform mat3 uCamMatrix;
uniform vec2 uScreenSize;

void main() {
    vLightPos = aLightPos;
    vPos = aVertexPosition + aLightPos;
    vec2 screenPos = (uCamMatrix * vec3(vPos, 1)).xy;
    //vTexCoord = aTexCoord;
    vTexCoord = screenPos / uScreenSize;
    gl_Position = uProjMatrix * vec4(screenPos, 0, 1);
}