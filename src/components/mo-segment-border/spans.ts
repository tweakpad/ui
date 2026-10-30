import { screen, smooth, wrap, type LightField } from '../../foundation/border-ring/light-field.js';
import type { RingSamples } from '../../foundation/border-ring/ring-samples.js';

/** A lit stretch of the line, as fractions of the perimeter (it may wrap past either end). */
export interface LitSpan {
  readonly start: number;
  readonly end: number;
}

/** A glowing segment fades in over a share of its length at each end, up to this many pixels. */
const SPAN_FADE_SHARE = 0.3;
const SPAN_FADE_PX = 28;
/** How far the fully lit stretch turns toward the core color. */
const SPAN_CORE = 0.35;

/**
 * Lights glowing segments into `field` (CL Segment border `mbs-segments`): full strength along
 * each stretch, through the start of the line, fading out softly toward both ends, with the fully
 * lit part turned slightly toward the core color.
 */
export function lightSpans(
  field: LightField,
  samples: RingSamples,
  spans: readonly LitSpan[],
): void {
  const { intensity, core, swell } = field;
  const length = Math.max(samples.length, 1e-6);
  for (let index = 0; index < samples.count; index++) {
    const u = samples.s[index]! / length;
    let light = 0;
    let hot = 0;
    let wide = 1;
    for (const span of spans) {
      const from = Math.min(span.start, span.end);
      const size = Math.min(1, Math.abs(span.end - span.start));
      if (size * length < 0.5) continue;
      const along = wrap(u - from);
      if (along > size) continue;
      const edge = Math.min(along, size - along) * length;
      const fade = Math.max(1, Math.min(SPAN_FADE_PX, size * length * SPAN_FADE_SHARE));
      const k = smooth(Math.min(1, edge / fade));
      light = screen(light, k);
      hot = Math.max(hot, SPAN_CORE * k ** 3);
      wide = Math.max(wide, 1 + 0.2 * k);
    }
    intensity[index] = light;
    core[index] = hot;
    swell[index] = wide;
  }
}
