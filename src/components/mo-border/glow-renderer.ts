import { CanvasSurface } from '../../foundation/canvas-surface.js';
import { computeField, emptyField, type LightField, type LightSources } from './light-field.js';
import {
  colorResolver,
  cssColor,
  GlowPalette,
  mixLab,
  splitColorList,
  toLab,
  type Lab,
} from './palette.js';
import { ringPath, type RingBox } from './ring-path.js';
import { ringSamples, type RingSamples } from './ring-samples.js';

/** What one paint shows. */
export interface GlowFrame {
  readonly sources: LightSources;
  /** Degrees the colors turn (sweep). */
  readonly rotation: number;
  /** 0 to 1: the fade and loop visibility. */
  readonly level: number;
}

/** The look, read from the host's computed style. */
export interface GlowLook {
  /** The computed color list. */
  readonly colors: string;
  readonly core: string;
  /** Degrees. */
  readonly angle: number;
  readonly intensity: number;
  readonly fill: number;
}

/** Samples per stroke: short enough to follow the colors and the light, long enough to stay cheap. */
const SEGMENT = 3;
const VISIBLE = 0.004;

/**
 * Paints the glow (CL Border `mbx-glow`) on two canvases over the ring box plus a margin: the
 * lit line and the wash on one, the same strokes wider on the other, which the stylesheet blurs
 * into the bloom. Each point of the line takes its color from the color list by angle and turns
 * toward the core color as it is lit hotter.
 */
export class GlowRenderer {
  readonly #bloom: HTMLCanvasElement;
  readonly #surface: CanvasSurface;
  readonly #resolve: (color: string) => readonly [number, number, number, number];
  #box: RingBox | null = null;
  #stroke = 1;
  #spread = 12;
  #margin = 0;
  #samples: RingSamples | null = null;
  #field: LightField = emptyField(0);
  #inner: Path2D | null = null;
  #frame: GlowFrame | null = null;
  #look: GlowLook | null = null;
  #paletteKey = '';
  #palette = new GlowPalette([]);
  #core: Lab | null = null;
  readonly #color: Lab = [0, 0, 0, 0];
  #painted = false;

  constructor(line: HTMLCanvasElement, bloom: HTMLCanvasElement) {
    this.#bloom = bloom;
    this.#resolve = colorResolver(line.ownerDocument);
    this.#surface = new CanvasSurface({
      canvas: line,
      render: (context, width, height, ratio) => this.#render(context, width, height, ratio),
    });
  }

  connect(): void {
    this.#surface.connect();
  }

  disconnect(): void {
    this.#surface.disconnect();
  }

  /** The ring box, line width, bloom spread and margin (CSS pixels) the canvases cover. */
  setGeometry(box: RingBox, stroke: number, spread: number, margin: number): void {
    this.#box = box;
    this.#stroke = stroke;
    this.#spread = spread;
    this.#margin = margin;
    this.#samples = ringSamples(box, stroke / 2);
    this.#field = emptyField(this.#samples.count);
    this.#inner = typeof Path2D === 'function' ? new Path2D(ringPath(box, stroke).d) : null;
    this.#surface.invalidate();
  }

  /** Paints `frame` with `look` now (from a frame callback), or clears with no frame. */
  paint(frame: GlowFrame | null, look: GlowLook | null): void {
    this.#frame = frame;
    this.#look = look;
    if (!frame && !this.#painted) return;
    this.#surface.paint();
  }

  #updatePalette(look: GlowLook): void {
    const key = `${look.colors}|${look.core}|${look.angle}`;
    if (key === this.#paletteKey) return;
    this.#paletteKey = key;
    const colors = splitColorList(look.colors)
      .map(this.#resolve)
      .filter((color) => color[3] > 0);
    this.#palette = new GlowPalette(colors, look.angle);
    const core = this.#resolve(look.core);
    this.#core = core[3] > 0 ? toLab(core) : null;
  }

  #render(context: CanvasRenderingContext2D, width: number, height: number, ratio: number): void {
    const bloom = this.#bloom.getContext('2d');
    if (this.#bloom.width !== width) this.#bloom.width = width;
    if (this.#bloom.height !== height) this.#bloom.height = height;
    context.clearRect(0, 0, width, height);
    // The surface resets the line canvas; the bloom canvas keeps its last transform until reset.
    bloom?.setTransform(1, 0, 0, 1, 0, 0);
    bloom?.clearRect(0, 0, width, height);
    this.#painted = false;
    const frame = this.#frame;
    const look = this.#look;
    const samples = this.#samples;
    const box = this.#box;
    if (!frame || !look || !samples || !box || samples.count < 2) return;
    const level = frame.level * look.intensity;
    if (level <= VISIBLE) return;
    this.#updatePalette(look);
    const field = computeField(samples, box, frame.sources, this.#field);
    const offset = this.#margin * ratio;
    for (const target of bloom ? [context, bloom] : [context]) {
      target.setTransform(ratio, 0, 0, ratio, offset, offset);
      target.globalCompositeOperation = 'lighter';
      target.lineCap = 'butt';
      target.lineJoin = 'round';
    }
    if (look.fill > 0 && frame.sources.pointer) this.#wash(context, frame, look, field);
    const { count, x, y, angle } = samples;
    const color = this.#color;
    for (let index = 0; index < count; index += SEGMENT) {
      const end = Math.min(index + SEGMENT, count);
      let light = 0;
      let hot = 0;
      let wide = 1;
      for (let step = index; step < end; step++) {
        light += field.intensity[step]!;
        hot = Math.max(hot, field.core[step]!);
        wide = Math.max(wide, field.swell[step]!);
      }
      light /= end - index;
      const alpha = light * level;
      if (alpha < VISIBLE) continue;
      this.#palette.at(angle[index]!, frame.rotation, color);
      if (this.#core) mixLab(color, this.#core, hot, color);
      color[3] *= alpha;
      const style = cssColor(color);
      // Each stroke ends where the next starts; the last closes the loop.
      const last = end === count ? 0 : end;
      const trace = (target: CanvasRenderingContext2D) => {
        target.beginPath();
        target.moveTo(x[index]!, y[index]!);
        for (let step = index + 1; step < end; step++) target.lineTo(x[step]!, y[step]!);
        target.lineTo(x[last]!, y[last]!);
        target.strokeStyle = style;
      };
      trace(context);
      context.lineWidth = this.#stroke * wide;
      context.stroke();
      if (bloom) {
        trace(bloom);
        // The blur spreads the bloom thin; it starts brighter and wider than the line.
        bloom.strokeStyle = cssColor([color[0], color[1], color[2], Math.min(1, color[3] * 1.6)]);
        bloom.lineWidth = this.#stroke * wide * 3 + this.#spread * 0.4;
        bloom.stroke();
      }
    }
    if (bloom && frame.sources.comets) this.#heads(bloom, frame, level);
    this.#painted = true;
  }

  /** A soft round glow on each comet's head, in the bloom only. */
  #heads(bloom: CanvasRenderingContext2D, frame: GlowFrame, level: number): void {
    const samples = this.#samples;
    const comets = frame.sources.comets;
    if (!samples || !comets) return;
    const radius = Math.max(4, this.#spread * 0.7);
    for (const head of comets.heads) {
      const index = Math.min(samples.count - 1, Math.round(head * samples.count));
      const color = this.#palette.at(samples.angle[index]!, frame.rotation, [0, 0, 0, 0]);
      if (this.#core) mixLab(color, this.#core, 0.7, color);
      const x = samples.x[index]!;
      const y = samples.y[index]!;
      const glow = bloom.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, cssColor([color[0], color[1], color[2], color[3] * level * 0.7]));
      glow.addColorStop(1, cssColor([color[0], color[1], color[2], 0]));
      bloom.fillStyle = glow;
      bloom.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  }

  /** A soft fill of light inside the surface around the pointer, in the color at its nearest point. */
  #wash(
    context: CanvasRenderingContext2D,
    frame: GlowFrame,
    look: GlowLook,
    field: LightField,
  ): void {
    const pointer = frame.sources.pointer;
    const samples = this.#samples;
    if (!pointer || !samples || !this.#inner) return;
    let nearest = 0;
    let best = Infinity;
    for (let index = 0; index < samples.count; index++) {
      const distance = Math.hypot(samples.x[index]! - pointer.x, samples.y[index]! - pointer.y);
      if (distance < best) {
        best = distance;
        nearest = index;
      }
    }
    const strength = field.intensity[nearest]! * look.fill * frame.level * look.intensity;
    if (strength < VISIBLE) return;
    const color = this.#palette.at(samples.angle[nearest]!, frame.rotation, [0, 0, 0, 0]);
    if (this.#core) mixLab(color, this.#core, field.core[nearest]! * 0.5, color);
    const gradient = context.createRadialGradient(
      pointer.x,
      pointer.y,
      0,
      pointer.x,
      pointer.y,
      pointer.reach,
    );
    const inner: Lab = [color[0], color[1], color[2], color[3] * strength];
    const outer: Lab = [color[0], color[1], color[2], 0];
    gradient.addColorStop(0, cssColor(inner));
    gradient.addColorStop(1, cssColor(outer));
    context.save();
    context.clip(this.#inner);
    context.fillStyle = gradient;
    context.globalCompositeOperation = 'source-over';
    context.fillRect(
      pointer.x - pointer.reach,
      pointer.y - pointer.reach,
      pointer.reach * 2,
      pointer.reach * 2,
    );
    context.restore();
  }
}
