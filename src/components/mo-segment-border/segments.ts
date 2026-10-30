import type { RingSamples } from '../../foundation/border-ring/ring-samples.js';
import { transitionTimings } from '../../foundation/motion.js';
import { parseEasing } from '../../foundation/motion-easing.js';
import { parseStates, SegmentRun, type SegmentTiming, type Span } from './segment-timeline.js';

const SEGMENT = 'tp-mo-border-segment';
const DEFAULT_DRAW = '0% 0%, 0% 100%';
/** Points of the box each origin keyword names, as fractions of its width and height. */
const ORIGINS: Readonly<Record<string, readonly [number, number]>> = {
  'top-left': [0, 0],
  top: [0.5, 0],
  'top-right': [1, 0],
  right: [1, 0.5],
  'bottom-right': [1, 1],
  bottom: [0.5, 1],
  'bottom-left': [0, 1],
  left: [0, 0.5],
};
/** Plain segments' look, copied from each segment as written so theme colors keep following. */
const LOOK = [
  ['--tp-mo-border-segment-color', '--_seg-color'],
  ['--tp-mo-border-segment-width', '--_seg-width'],
  ['--tp-mo-border-segment-cap', '--_seg-cap'],
] as const;

interface Entry {
  readonly element: Element;
  readonly key: string;
  readonly run: SegmentRun;
  readonly glow: boolean;
  readonly origin: string;
  /** Inline style of a plain segment's line. */
  readonly style: string;
  offset: number;
}

const frac = (value: number) => value - Math.floor(value);

/** A segment's timing, from its attributes and the computed transition of its timing probe. */
function readTiming(element: Element, style: CSSStyleDeclaration): SegmentTiming {
  const repeatText = element.getAttribute('repeat')?.trim() ?? '';
  const [probe] = transitionTimings(style);
  return {
    duration: probe?.duration ?? 0,
    delay: probe?.delay ?? 0,
    easing: parseEasing(probe?.easing || 'linear'),
    repeat: repeatText === 'infinite' ? Infinity : Math.max(0, Math.floor(Number(repeatText) || 0)),
    alternate: element.hasAttribute('alternate'),
  };
}

/**
 * The segments of a Segment border (CL Segment border `mbs-segments`): reads its `tp-mo-border-segment` children,
 * keeps one run per valid segment, places each origin on the line, and reports where each
 * segment is drawn now.
 */
export class BorderSegments {
  #entries: Entry[] = [];
  #samples: RingSamples | null = null;
  #width = 0;
  #height = 0;

  constructor(
    private readonly owner: HTMLElement,
    private readonly report: (code: string, message: string) => void,
  ) {}

  get count(): number {
    return this.#entries.length;
  }

  get hasGlow(): boolean {
    return this.#entries.some((entry) => entry.glow);
  }

  /** The plain segments' line styles, in order; one line is drawn for each. */
  get plainStyles(): string[] {
    return this.#entries.filter((entry) => !entry.glow).map((entry) => entry.style);
  }

  /** Whether the owner has segment children (valid or not). */
  get present(): boolean {
    return this.owner.querySelector(`:scope > ${SEGMENT}`) !== null;
  }

  /**
   * Reads the segments again, keeping the run of every segment that did not change. Returns
   * whether what is drawn (the plain lines or the glow) changed.
   */
  collect(): boolean {
    const view = this.owner.ownerDocument.defaultView;
    if (!view) return false;
    const previous = new Map(this.#entries.map((entry) => [entry.element, entry]));
    const entries: Entry[] = [];
    for (const element of this.owner.querySelectorAll(`:scope > ${SEGMENT}`)) {
      const draw = element.getAttribute('draw')?.trim() || DEFAULT_DRAW;
      const leave = element.getAttribute('leave')?.trim() || '';
      const states = parseStates(draw);
      const exit = leave ? parseStates(leave) : null;
      if (!states || (leave && !exit)) {
        this.report(
          'mo-border-segment-invalid',
          `Segment ${states ? `leave "${leave}"` : `draw "${draw}"`} is not a list of states.`,
        );
        continue;
      }
      const style = view.getComputedStyle(element);
      const timing = readTiming(element, style);
      const glow = element.hasAttribute('glow');
      const origin = element.getAttribute('origin')?.trim() || 'top-left';
      const look = LOOK.map(([name, local]) => {
        const value = style.getPropertyValue(name).trim();
        return value ? `${local}:${value}` : '';
      })
        .filter(Boolean)
        .join(';');
      // Timing is not part of the key: a run whose timing changed keeps its place.
      const key = JSON.stringify([draw, leave, glow, origin, look]);
      const kept = previous.get(element);
      if (kept && kept.key === key) {
        kept.run.timing = timing;
        entries.push(kept);
        continue;
      }
      const entry: Entry = {
        element,
        key,
        run: new SegmentRun(states, exit, timing),
        glow,
        origin,
        style: look,
        offset: 0,
      };
      entry.offset = this.#origin(origin);
      entries.push(entry);
    }
    const shape = (list: Entry[]) => list.map((entry) => `${entry.glow}|${entry.style}`).join(',');
    const changed = shape(entries) !== shape(this.#entries);
    this.#entries = entries;
    return changed;
  }

  /**
   * Reads every segment's timing again, keeping its run's place: the motion preference and scale
   * change the computed times without changing the segments.
   */
  retime(): void {
    const view = this.owner.ownerDocument.defaultView;
    if (!view) return;
    for (const entry of this.#entries)
      entry.run.timing = readTiming(entry.element, view.getComputedStyle(entry.element));
  }

  /** The line's samples and box, to place each origin. */
  setGeometry(samples: RingSamples, width: number, height: number): void {
    this.#samples = samples;
    this.#width = width;
    this.#height = height;
    for (const entry of this.#entries) entry.offset = this.#origin(entry.origin);
  }

  get perimeter(): number {
    return this.#samples?.length ?? 0;
  }

  /** Turns every segment on or off; with `jump`, they go straight to the end or to rest. */
  set(on: boolean, jump: boolean): void {
    for (const entry of this.#entries) {
      if (jump) entry.run.jump(on);
      else entry.run.set(on, this.perimeter);
    }
  }

  /** Advances every segment; returns whether any still moves. */
  step(elapsed: number): boolean {
    let moving = false;
    for (const entry of this.#entries) {
      entry.run.step(elapsed);
      moving ||= entry.run.moving;
    }
    return moving;
  }

  /** Where each segment is drawn now, with its origin: plain ones in order, and the glowing ones. */
  spans(): { plain: Span[]; glow: Span[] } {
    const plain: Span[] = [];
    const glow: Span[] = [];
    const perimeter = this.perimeter;
    for (const entry of this.#entries) {
      const span = entry.run.span(perimeter);
      const placed = { start: span.start + entry.offset, end: span.end + entry.offset };
      (entry.glow ? glow : plain).push(placed);
    }
    return { plain, glow };
  }

  /** The fraction of the line where an origin sits: a keyword's nearest point, or a percentage. */
  #origin(origin: string): number {
    if (origin.endsWith('%')) {
      const value = Number(origin.slice(0, -1));
      return Number.isFinite(value) ? frac(value / 100) : 0;
    }
    const samples = this.#samples;
    const point = ORIGINS[origin] ?? ORIGINS['top-left']!;
    if (!samples || !samples.count) return 0;
    const x = point[0] * this.#width;
    const y = point[1] * this.#height;
    let best = 0;
    let distance = Infinity;
    for (let index = 0; index < samples.count; index++) {
      const d = Math.hypot(samples.x[index]! - x, samples.y[index]! - y);
      if (d < distance) {
        distance = d;
        best = index;
      }
    }
    return samples.s[best]! / Math.max(samples.length, 1e-6);
  }
}

/** Dash attributes that draw `span` on a path of length 1; null when it is too short to show. */
export function spanDash(
  span: Span,
  perimeter: number,
): { dasharray: string; dashoffset: string } | null {
  const start = Math.min(span.start, span.end);
  const length = Math.min(1, Math.abs(span.end - span.start));
  if (length * perimeter < 0.5) return null;
  const offset = -frac(start);
  if (length >= 1) return { dasharray: 'none', dashoffset: '0' };
  // A period of exactly 1 wraps the piece through the path's start without a gap.
  return { dasharray: `${length} ${1 - length}`, dashoffset: `${offset}` };
}
