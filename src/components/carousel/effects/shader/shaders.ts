/** GLSL ES 3.00 sources and CPU-side math for the carousel shader transition. */
export type CarouselShaderVariant = 'wipe' | 'displace' | 'chromatic' | 'crosswarp' | 'glass';
export const shaderVariants: Record<CarouselShaderVariant, number> = {
  wipe: 0,
  displace: 1,
  chromatic: 2,
  crosswarp: 3,
  glass: 4,
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
// Glass: a rounded ridge across the moving front, with noise ripples on its surface; 0 off
// the ridge. The front runs from fully before the frame to fully past it.
float glassHeight(vec2 p, vec2 dir, float span, float front, float width) {
  // One smooth octave keeps the surface a clean lens; fBm detail would read as noise.
  float ripple = noise(p * uScale * 0.6 + uSeed) - 0.5;
  float along = dot(p - 0.5, dir) / span + 0.5 + ripple * uIntensity * 0.3;
  float d = (along - front) / width;
  float ridge = max(0.0, 1.0 - d * d);
  // Cubed, the profile meets flat glass with zero slope and curvature, so the refraction
  // fades in from nothing instead of starting at a visible edge.
  return ridge * ridge * ridge * (1.0 + ripple * uIntensity * 0.5);
}
vec3 encodeSrgb(vec3 linear) {
  vec3 low = linear * 12.92;
  vec3 high = 1.055 * pow(linear, vec3(1.0 / 2.4)) - 0.055;
  return mix(low, high, step(vec3(0.0031308), linear));
}

void main() {
  vec2 uv = vUv;
  vec2 dir = normalize(uDirection);
  float progress = clamp(uProgress, 0.0, 1.0);
  float speed = clamp(uVelocity, 0.0, 1.0);
  // The outgoing image eases forward while the incoming one settles into place; both are
  // exact at their own end of the transition, so handing over to the DOM never jumps.
  // Sampling against the travel direction moves content with it.
  vec2 fromUv = drift(uv, -dir, 0.08 * progress, 1.0);
  vec2 toUv = drift(uv, dir, 0.08 * (1.0 - progress), 1.0);
  vec4 color;
  if (uVariant == 0) {
    // Wipe: a noise-edged front travels across the frame.
    float span = abs(dir.x) + abs(dir.y);
    // 0 where the reveal starts, 1 where it ends.
    float along = dot(uv - 0.5, dir) / span + 0.5;
    float grain = (fbm(uv * uScale + uSeed) - 0.5) * uIntensity;
    float reach = uSoftness + abs(uIntensity) * 0.5;
    float edge = mix(-reach, 1.0 + reach, progress);
    float revealed = 1.0 - smoothstep(edge - uSoftness, edge + uSoftness, along + grain);
    float band = 1.0 - abs(revealed * 2.0 - 1.0);
    // Velocity stretches both images along the travel direction inside the band.
    vec2 smear = dir * band * speed * 0.08;
    color = mix(
      sampleCover(uFrom, uFromMap, fromUv + smear),
      sampleCover(uTo, uToMap, toUv + smear),
      revealed);
  } else if (uVariant == 4) {
    // Glass: a refracting ridge sweeps along the direction. The new image lies behind it and
    // the old one ahead; through the glass both are refracted by its surface normal, each
    // colour channel by a slightly different index (dispersion), with a Fresnel rim and a
    // soft specular highlight. Off the ridge the height is 0, so both ends are exact.
    float span = abs(dir.x) + abs(dir.y);
    float width = 0.2 + uSoftness;
    float reach = width + abs(uIntensity) * 0.15;
    float front = mix(-reach, 1.0 + reach, progress);
    float e = 0.002;
    vec2 grad = vec2(
      glassHeight(uv + vec2(e, 0.0), dir, span, front, width) -
        glassHeight(uv - vec2(e, 0.0), dir, span, front, width),
      glassHeight(uv + vec2(0.0, e), dir, span, front, width) -
        glassHeight(uv - vec2(0.0, e), dir, span, front, width)) / (2.0 * e);
    vec3 normal = normalize(vec3(-grad * 0.05 * (1.0 + speed), 1.0));
    // The new image lies behind the ridge; the crossing follows the rippled front.
    float along = dot(uv - 0.5, dir) / span + 0.5 +
      (noise(uv * uScale * 0.6 + uSeed) - 0.5) * uIntensity * 0.3;
    // The images fade across the whole ridge with a smootherstep, so there is no visible seam.
    float t = clamp(0.5 - 0.5 * (along - front) / width, 0.0, 1.0);
    float crossed = t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
    // The surface normal bends the view like a lens; flat glass (off the ridge) bends nothing.
    vec2 bend = normal.xy * (0.05 + 0.12 * uIntensity) * (1.0 + speed);
    float spread = 0.06 + 0.12 * uIntensity;
    vec3 refracted;
    for (int channel = 0; channel < 3; channel++) {
      vec2 offset = bend * (1.0 + (float(channel) - 1.0) * spread);
      vec4 a = sampleCover(uFrom, uFromMap, fromUv + offset);
      vec4 b = sampleCover(uTo, uToMap, toUv + offset);
      refracted[channel] = mix(a, b, crossed)[channel];
    }
    // Fresnel: reflectance grows as the surface turns away from the viewer, so the slopes catch
    // the light while the flat crest and the edges stay clear.
    float tilt = length(normal.xy);
    float fresnel = pow(clamp(tilt * 1.6, 0.0, 1.0), 3.0);
    vec3 light = normalize(vec3(-0.4, -0.6, 1.0));
    vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
    float specular = pow(max(dot(normal, halfway), 0.0), 60.0) * smoothstep(0.02, 0.2, tilt);
    // Slopes facing away from the light are slightly darker, which gives the ridge depth.
    float shade = 1.0 - 0.18 * clamp(-dot(normal.xy, light.xy) * 2.0, 0.0, 1.0);
    vec3 shine = vec3(1.0) * (fresnel * 0.3 + specular * 0.6);
    color = vec4(refracted * shade + shine, 1.0);
  } else if (uVariant == 3) {
    // Crosswarp: each pixel crosses over in travel order while the outgoing image zooms in and
    // the incoming one zooms out to rest. Noise shapes the crossing so there is no straight
    // seam, and a noise vector field morphs both images while they cross.
    float span = abs(dir.x) + abs(dir.y);
    float along = dot(uv - 0.5, dir) / span + 0.5;
    float shape = (fbm(uv * uScale + uSeed) - 0.5) * uIntensity * 0.6;
    // The expanded range keeps every pixel exactly old at 0 and new at 1 despite the noise.
    float reach = abs(uIntensity) * 0.3;
    float x = smoothstep(0.0, 1.0, progress * (2.0 + 2.0 * reach) - reach - along + shape);
    float crossing = 4.0 * x * (1.0 - x);
    vec2 field = vec2(
      fbm(uv * uScale * 0.8 + uSeed + 3.1),
      fbm(uv * uScale * 0.8 - uSeed - 1.7)) - 0.5;
    vec2 morph = field * crossing * (0.08 + 0.3 * uIntensity) * (1.0 + speed);
    vec2 fromWarp = (uv - 0.5) * (1.0 - 0.6 * x) + 0.5 - dir * x * 0.08 + morph;
    vec2 toWarp = (uv - 0.5) * (0.4 + 0.6 * x) + 0.5 + dir * (1.0 - x) * 0.08 - morph;
    color = mix(
      sampleCover(uFrom, uFromMap, fromWarp),
      sampleCover(uTo, uToMap, toWarp),
      x);
  } else {
    // Displacement map: fBm noise that flows along the travel direction as the transition
    // advances. Its value sets how far each pixel is pushed and when it crosses over, so the
    // change sweeps through the noise instead of along a front.
    float map = smoothstep(0.2, 0.8, fbm((uv - dir * progress * 0.25) * uScale * 1.5 + uSeed));
    float spread = 0.35 + uSoftness;
    float crossed = smoothstep(0.0, 1.0, progress * (1.0 + spread) - map * spread);
    // The outgoing image is pushed along the direction and the incoming one arrives from
    // behind; each displacement is zero at its own end of the transition.
    vec2 push = dir * map * (0.2 + 0.8 * uIntensity) * (1.0 + speed);
    vec2 away = push * progress;
    vec2 behind = push * (1.0 - progress);
    vec4 fromColor;
    vec4 toColor;
    if (uVariant == 1) {
      fromColor = sampleCover(uFrom, uFromMap, fromUv - away);
      toColor = sampleCover(uTo, uToMap, toUv + behind);
    } else {
      // Chromatic: a gentler displacement that each channel follows by a different amount,
      // so colour fringes trail along the direction.
      vec2 a = away * 0.5;
      vec2 b = behind * 0.5;
      fromColor = vec4(
        sampleCover(uFrom, uFromMap, fromUv - a * 1.25).r,
        sampleCover(uFrom, uFromMap, fromUv - a).g,
        sampleCover(uFrom, uFromMap, fromUv - a * 0.75).b,
        sampleCover(uFrom, uFromMap, fromUv - a).a);
      toColor = vec4(
        sampleCover(uTo, uToMap, toUv + b * 1.25).r,
        sampleCover(uTo, uToMap, toUv + b).g,
        sampleCover(uTo, uToMap, toUv + b * 0.75).b,
        sampleCover(uTo, uToMap, toUv + b).a);
    }
    color = mix(fromColor, toColor, crossed);
  }
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

/** Travel direction of a shader transition: an edge, or a corner for a diagonal. */
export type CarouselShaderDirection =
  'left' | 'right' | 'up' | 'down' | 'up-left' | 'up-right' | 'down-left' | 'down-right';

const diagonal = Math.SQRT1_2;
/** Unit travel vectors in uv space, whose y axis points down like image rows. */
export const shaderDirections: Record<CarouselShaderDirection, [number, number]> = {
  left: [-1, 0],
  right: [1, 0],
  up: [0, -1],
  down: [0, 1],
  'up-left': [-diagonal, -diagonal],
  'up-right': [diagonal, -diagonal],
  'down-left': [-diagonal, diagonal],
  'down-right': [diagonal, diagonal],
};

/**
 * Travel direction in uv space. By default the upcoming item arrives from the inline end
 * (or block end), so the transition travels toward the start; RTL mirrors it.
 */
export function revealDirection(
  orientation: 'horizontal' | 'vertical',
  direction: 'ltr' | 'rtl',
  travel?: CarouselShaderDirection,
): [number, number] {
  const preset = travel ? shaderDirections[travel] : undefined;
  if (preset) return [...preset];
  if (orientation === 'vertical') return [0, -1];
  return direction === 'rtl' ? [1, 0] : [-1, 0];
}
