/** GLSL ES 3.00 sources and CPU-side math for the carousel shader transition. */
export type CarouselShaderVariant = 'wipe' | 'displace' | 'chromatic';
export const shaderVariants: Record<CarouselShaderVariant, number> = {
  wipe: 0,
  displace: 1,
  chromatic: 2,
};

/** Full-screen triangle; vUv has its origin at the top-left like image rows. */
export const vertexSource = `#version 300 es
out vec2 vUv;
void main() {
  // Vertices (0,0), (2,0), (0,2) cover the viewport; position 0..1 is the visible square.
  vec2 position = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = vec2(position.x, 1.0 - position.y);
  gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);
}`;

export const fragmentSource = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform sampler2D uFrom;
uniform sampler2D uTo;
uniform vec4 uFromMap;   // xy scale, zw offset: cover-fit and focal point
uniform vec4 uToMap;
uniform float uProgress; // 0 shows uFrom, 1 shows uTo
uniform vec2 uDirection; // unit travel direction of the reveal in uv space
uniform float uVelocity; // 0..1 normalized gesture speed
uniform float uSoftness; // half-width of the transition band
uniform float uIntensity;
uniform float uScale;    // noise frequency
uniform float uSeed;
uniform int uVariant;

// Value noise and fBm: smooth, cheap, no texture fetches.
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int octave = 0; octave < 4; octave++) {
    value += amplitude * noise(p);
    p = p * 2.03 + 17.0;
    amplitude *= 0.5;
  }
  return value;
}

// Textures are sRGB, so sampling returns linear light; blend linearly and encode once.
vec4 sampleCover(sampler2D image, vec4 map, vec2 uv) {
  // Mirror instead of clamping so displaced samples never smear edge pixels.
  uv = 1.0 - abs(1.0 - mod(uv, 2.0));
  return texture(image, uv * map.xy + map.zw);
}
// Zoom toward the center and drift along the travel direction; with |drift| <= zoom / 2 the
// sample stays inside the image, and zoom 0 is the exact DOM presentation.
vec2 drift(vec2 uv, vec2 dir, float zoom, float amount) {
  return 0.5 + (uv - 0.5) * (1.0 - zoom) + dir * amount * zoom * 0.5;
}
vec3 encodeSrgb(vec3 linear) {
  vec3 low = linear * 12.92;
  vec3 high = 1.055 * pow(linear, vec3(1.0 / 2.4)) - 0.055;
  return mix(low, high, step(vec3(0.0031308), linear));
}

void main() {
  vec2 uv = vUv;
  vec2 dir = normalize(uDirection);
  float span = abs(dir.x) + abs(dir.y);
  // 0 where the reveal starts, 1 where it ends.
  float along = dot(uv - 0.5, dir) / span + 0.5;
  float grain = (fbm(uv * uScale + uSeed) - 0.5) * uIntensity;
  float reach = uSoftness + abs(uIntensity) * 0.5;
  float edge = mix(-reach, 1.0 + reach, uProgress);
  float revealed = 1.0 - smoothstep(edge - uSoftness, edge + uSoftness, along + grain);
  float band = 1.0 - abs(revealed * 2.0 - 1.0);
  float speed = clamp(uVelocity, 0.0, 1.0);

  // The outgoing image eases forward while the incoming one settles into place; both are
  // exact at their own end of the transition, so handing over to the DOM never jumps.
  // Sampling against the travel direction moves content with it.
  vec2 fromUv = drift(uv, -dir, 0.08 * uProgress, 1.0);
  vec2 toUv = drift(uv, dir, 0.08 * (1.0 - uProgress), 1.0);
  // Velocity stretches both images along the travel direction inside the band.
  vec2 smear = dir * band * speed * 0.08;
  fromUv += smear;
  toUv += smear;

  vec4 fromColor;
  vec4 toColor;
  if (uVariant == 1) {
    vec2 normal = vec2(-dir.y, dir.x);
    float wobble = fbm(uv * uScale * 1.7 - uSeed) - 0.5;
    vec2 push = (dir + normal * wobble) * band * uIntensity * 0.35;
    fromColor = sampleCover(uFrom, uFromMap, fromUv + push * revealed);
    toColor = sampleCover(uTo, uToMap, toUv - push * (1.0 - revealed));
  } else if (uVariant == 2) {
    vec2 shift = dir * band * (0.006 + speed * 0.03) * (0.5 + uIntensity);
    fromColor = vec4(
      sampleCover(uFrom, uFromMap, fromUv + shift).r,
      sampleCover(uFrom, uFromMap, fromUv + shift * 0.5).g,
      sampleCover(uFrom, uFromMap, fromUv).b,
      sampleCover(uFrom, uFromMap, fromUv).a);
    toColor = vec4(
      sampleCover(uTo, uToMap, toUv - shift).r,
      sampleCover(uTo, uToMap, toUv - shift * 0.5).g,
      sampleCover(uTo, uToMap, toUv).b,
      sampleCover(uTo, uToMap, toUv).a);
  } else {
    fromColor = sampleCover(uFrom, uFromMap, fromUv);
    toColor = sampleCover(uTo, uToMap, toUv);
  }
  vec4 color = mix(fromColor, toColor, revealed);
  // Premultiplied output: encode color, keep coverage.
  vec3 straight = color.a > 0.0 ? color.rgb / color.a : vec3(0.0);
  outColor = vec4(encodeSrgb(straight) * color.a, color.a);
}`;

/**
 * Cover-fit mapping from canvas uv to texture uv, honoring an object-position focal point:
 * `textureUv = uv * scale + offset`.
 */
export function coverMap(
  canvasWidth: number,
  canvasHeight: number,
  textureWidth: number,
  textureHeight: number,
  focalX = 0.5,
  focalY = 0.5,
): [number, number, number, number] {
  if (!(canvasWidth > 0 && canvasHeight > 0 && textureWidth > 0 && textureHeight > 0))
    return [1, 1, 0, 0];
  const ratio = canvasWidth / canvasHeight / (textureWidth / textureHeight);
  const scaleX = ratio > 1 ? 1 : ratio;
  const scaleY = ratio > 1 ? 1 / ratio : 1;
  return [scaleX, scaleY, (1 - scaleX) * focalX, (1 - scaleY) * focalY];
}

/** Parse `object-position` percentages and keywords into a 0..1 focal point. */
export function focalPoint(objectPosition: string): [number, number] {
  const keyword: Record<string, number> = { left: 0, top: 0, center: 0.5, right: 1, bottom: 1 };
  const parts = objectPosition.trim().split(/\s+/);
  const read = (part: string | undefined) =>
    part === undefined
      ? 0.5
      : part in keyword
        ? keyword[part]!
        : part.endsWith('%')
          ? Math.min(1, Math.max(0, parseFloat(part) / 100))
          : 0.5;
  const [first, second] = parts;
  // Keyword order may be vertical-first ("top left").
  if (first === 'top' || first === 'bottom') return [read(second), read(first)];
  return [read(first), read(second)];
}

/**
 * Reveal direction in uv space. The upcoming item arrives from the inline end (or block end),
 * so the reveal travels toward the start; RTL mirrors it.
 */
export function revealDirection(
  orientation: 'horizontal' | 'vertical',
  direction: 'ltr' | 'rtl',
  angle?: number,
): [number, number] {
  if (angle !== undefined && Number.isFinite(angle)) {
    const radians = (angle * Math.PI) / 180;
    return [Math.cos(radians), Math.sin(radians)];
  }
  if (orientation === 'vertical') return [0, -1];
  return direction === 'rtl' ? [1, 0] : [-1, 0];
}
