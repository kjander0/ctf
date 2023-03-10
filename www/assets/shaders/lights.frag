#version 300 es
precision mediump float;

uniform sampler2D uTex0; // normals
uniform float uRadius;

in vec2 vTexCoord;
in vec2 vLightPos;
in vec2 vPos;
out vec4 fragColor;

void main() {
    vec4 normalSample = texture(uTex0, vTexCoord);
    vec3 normal = normalize(2.f * normalSample.rgb - vec3(1.f));

    vec3 lightDir = vec3(vPos - vLightPos, 0.01f); // small z component to allow normalize (div by zero)
    float dist = length(lightDir);
    lightDir = normalize(lightDir);

    float attenPower = 3.0;
    float atten = max(abs(pow(-dist/uRadius + 1.0, attenPower)), 0.f);

    vec3 color = atten * dot(normal, -lightDir) * vec3(1., .01, .01);
    fragColor = vec4(color, normalSample.a);
    //fragColor = atten * vec4(1.f, 0.f, 0.f, 1.f);
}