#version 300 es

layout (location=0) in vec2 aVertexPosition;
layout (location=8) in int aEmitterNum;

out vec4 vColor;
uniform mat3 uCamMatrix;
uniform mat4 uProjMatrix;
uniform sampler2D uTex0;

void main() {
    float pointSize = 10.0;
    vec2 texSize = vec2(textureSize(uTex0, 0));

    vColor = vec4(1, 0, 0, 1);

    vec2 pixelOffset = vec2(mod(float(gl_InstanceID * 4), texSize.x), floor(float(gl_InstanceID) / texSize.x)) + 0.5;
    vec4 pixel0 = texture(uTex0, (pixelOffset) / texSize.x);
    vec4 pixel1 = texture(uTex0, (pixelOffset + vec2(1.0, 0.0)) / texSize.x);
    vec4 pixel2 = texture(uTex0, (pixelOffset + vec2(2.0, 0.0)) / texSize.x);
    vec4 pixel3 = texture(uTex0, (pixelOffset + vec2(3.0, 0.0)) / texSize.x);

    // TODO: emitter pos passed as instance attrib too

    vec2 particlePos = pixel0.xy;

    vec2 worldPos = pointSize * aVertexPosition + vec2(500, 600) + particlePos * 5.0;
    vec2 screenPos = (uCamMatrix * vec3(worldPos, 1)).xy;
    gl_Position = uProjMatrix * vec4(screenPos, 0, 1);

    gl_PointSize = 32.0; // TODO: remove this once we have better method of drawing particles
}