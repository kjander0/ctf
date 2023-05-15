#version 300 es

layout (location=0) in vec2 aVertexPosition;
layout (location=8) in vec2 aParticlePos;
layout (location=9) in float aEmitterTime;


out vec4 vColor;
uniform mat3 uCamMatrix;
uniform mat4 uProjMatrix;

void main() {
    float pointSize = 10.0;

    vColor = vec4(1, 0, 0, 1);

    vec2 worldPos = pointSize * aVertexPosition + vec2(500, 600) + aParticlePos + aEmitterTime;
    vec2 screenPos = (uCamMatrix * vec3(worldPos, 1)).xy;
    gl_Position = uProjMatrix * vec4(screenPos, 0, 1);
}