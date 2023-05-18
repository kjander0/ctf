#version 300 es

layout (location=0) in vec2 aVertexPosition;
layout (location=5) in vec2 aParticlePos;
layout (location=6) in vec4 aParticleVel;
layout (location=7) in vec4 aParticleStartColor;
layout (location=8) in vec4 aParticleEndColor;
layout (location=9) in vec2 aParticleTime;

layout (location=10) in float aEmitterTime;
layout (location=11) in float aEmitterSize;

out vec4 vColor;
out vec2 worldPos;
out vec2 particlePos;
uniform mat3 uCamMatrix;
uniform mat4 uProjMatrix;
uniform float maxNumberParticles;

void main() {
    float startSecs = aParticleTime.x;
    float lifeSecs = aParticleTime.y;
    float time = aEmitterTime - startSecs;
    float lerp = time / lifeSecs; // TODO: handle overflow of time

    vColor = mix(aParticleStartColor, aParticleEndColor, lerp);

    vec2 startVel = aParticleVel.xy;
    vec2 endVel = aParticleVel.zw;
    vec2 accel = (endVel - startVel) / lifeSecs;
    vec2 displacement = startVel * time + 0.5 * (endVel - startVel) / lifeSecs * time * time;

    float pointSize = 10.0 * step(0.0, time) * (1.0 - step(lifeSecs, time));
    float particleNum = mod(float(gl_InstanceID), maxNumberParticles);
    pointSize *= 1.0 - step(aEmitterSize, particleNum); // TODO: don't show particles outside numParticles in emitter
    
    particlePos = aParticlePos + displacement;
    worldPos = pointSize * aVertexPosition + particlePos;
    vec2 screenPos = (uCamMatrix * vec3(worldPos, 1)).xy;
    gl_Position = uProjMatrix * vec4(screenPos, 0, 1);
}