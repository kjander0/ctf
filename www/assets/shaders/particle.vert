#version 300 es

layout (location=0) in vec2 aVertexPosition;
layout (location=5) in vec2 aParticlePos;
layout (location=6) in vec4 aParticleVel;
layout (location=7) in vec4 aParticleStartColor;
layout (location=8) in vec4 aParticleEndColor;
layout (location=9) in vec2 aParticleTime;

layout (location=11) in float aEmitterSize;

out vec4 vColor;
uniform float time;
uniform mat3 uCamMatrix;
uniform mat4 uProjMatrix;

void main() {
    float startSecs = aParticleTime.x;
    float lifeSecs = aParticleTime.y;
    float relTime = time - startSecs;
    float lerp = (relTime - startSecs) / lifeSecs; // TODO: handle overflow of time

    vColor = mix(aParticleStartColor, aParticleEndColor, lerp);

    vec2 startVel = aParticleVel.xy;
    vec2 endVel = aParticleVel.zw;
    vec2 accel = (endVel - startVel) / lifeSecs;
    vec2 displacement = startVel * relTime + 0.5 * (endVel - startVel) / lifeSecs * relTime * relTime;

    float pointSize = 2.0 * step(startSecs, aEmitterTime) * (1.0 - step(startSecs + lifeSecs, aEmitterTime));
    //pointSize *= 1.0 - step(aEmitterSize, float(gl_InstanceID)); // TODO: don't show particles outside numParticles in emitter

    vec2 worldPos = pointSize * aVertexPosition + vec2(500, 600) + aParticlePos + displacement;
    vec2 screenPos = (uCamMatrix * vec3(worldPos, 1)).xy;
    gl_Position = uProjMatrix * vec4(screenPos, 0, 1);
}