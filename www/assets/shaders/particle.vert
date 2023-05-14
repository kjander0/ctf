#version 300 es

layout (location=0) in vec2 aVertexPosition;
layout (location=8) in int aEmitterNum;

out vec4 vColor;
uniform mat3 uCamMatrix;
uniform mat4 uProjMatrix;
uniform sampler2D uTex0;

void main() {
    vec2 texCoord = vec2(gl_InstanceID, gl_InstanceID);
    float pointSize = 10.0;
    vColor = texture(uTex0, texCoord);
    vec2 worldPos = pointSize * aVertexPosition + vec2(200, 200);
    worldPos.x += float(aEmitterNum) * 25.0;
    vec2 screenPos = (uCamMatrix * vec3(worldPos, 1)).xy;
    gl_Position = uProjMatrix * vec4(screenPos, 0, 1);

    gl_PointSize = 32.0; // TODO: remove this once we have better method of drawing particles
}