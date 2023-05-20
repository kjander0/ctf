#version 300 es

// Per vertex attribs
layout (location=0) in vec2 aVertexPosition;

// Per Particle attribs
layout (location=5) in vec2 aParticlePos;
layout (location=6) in vec4 aParticleVel;
layout (location=7) in vec4 aParticleStartColor;
layout (location=8) in vec4 aParticleEndColor;
layout (location=9) in vec2 aParticleTime;
layout (location=10) in vec4 aParticleScaleRot;
layout (location=11) in float aParticleTexture;

// Per emitter attribs
layout (location=12) in float aEmitterTime;
layout (location=13) in float aEmitterSize;

out vec2 vTexCoord;
out vec4 vColor;

uniform mat3 uCamMatrix;
uniform mat4 uProjMatrix;
uniform float maxNumberParticles;

void main() {
    vTexCoord = (aVertexPosition + 1.0) / 2.0;

    float startSecs = aParticleTime.x;
    float lifeSecs = aParticleTime.y;
    float time = aEmitterTime - startSecs;
    float lerp = time / lifeSecs; // TODO: handle overflow of time

    vColor = mix(aParticleStartColor, aParticleEndColor, lerp);

    vec2 startVel = aParticleVel.xy;
    vec2 endVel = aParticleVel.zw;
    vec2 accel = (endVel - startVel) / lifeSecs;
    vec2 displacement = startVel * time + 0.5 * (endVel - startVel) / lifeSecs * time * time;

    float startScale = aParticleScaleRot.x;
    float endScale = aParticleScaleRot.y;
    float startAngle = aParticleScaleRot.z;
    float endAngle = aParticleScaleRot.w;
    float scale = mix(startScale, endScale, lerp);
    float angleRads = mix(startAngle, endAngle, lerp);
    mat2 rotMat = mat2(cos(angleRads), sin(angleRads), -sin(angleRads), cos(angleRads));


    float pointSize = scale * step(0.0, time) * (1.0 - step(lifeSecs, time));
    float particleNum = mod(float(gl_InstanceID), maxNumberParticles);
    pointSize *= 1.0 - step(aEmitterSize, particleNum); // TODO: don't show particles outside numParticles in emitter
    
    vec2 particlePos = aParticlePos + displacement;
    vec2 worldPos = rotMat * pointSize * aVertexPosition + particlePos;
    vec2 screenPos = (uCamMatrix * vec3(worldPos, 1)).xy;
    gl_Position = uProjMatrix * vec4(screenPos, 0, 1);
}