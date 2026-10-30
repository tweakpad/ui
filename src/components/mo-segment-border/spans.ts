import { screen, smooth, wrap, type LightField } from '../../foundation/border-ring/light-field.js';
import type { RingSamples } from '../../foundation/border-ring/ring-samples.js';

/** A lit stretch of the line, as fractions of the perimeter (it may wrap past either end). */
export interface LitSpan {
  readonly start: number;
  readonly end: number;
}

/** A glowing segment softens over its last pixels and is hot within a few more. */
const SPAN_EDGE_PX = 4;
const SPAN_CORE_PX = 10;

/**
 * Lights glowing segments into `field` (CL Segment border `mbs-segments`): full strength along
 * each stretch, through the start of the line, soft at its ends and turning to the core color
 * near them.
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
      light = screen(light, smooth(Math.min(1, edge / SPAN_EDGE_PX)));
      const k = Math.max(0, 1 - edge / SPAN_CORE_PX) ** 2;
      hot = Math.max(hot, k);
      wide = Math.max(wide, 1 + 0.3 * k);
    }
    intensity[index] = light;
    core[index] = hot;
    swell[index] = wide;
  }
}
