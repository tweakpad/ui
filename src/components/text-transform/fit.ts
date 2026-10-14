import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { observeFonts, observeResize } from '../../foundation/observation.js';
import {
  fitCut,
  joinCut,
  truncationUnits,
  type TruncatePosition,
  type TruncateUnit,
  type TruncationCut,
  type TruncationMeasure,
} from '../../foundation/text-transform/truncate.js';

/** What to fit: one line of text, cut at `position` by `by` units, keeping at most `limit`. */
export interface FitRequest {
  readonly text: string;
  readonly position: Exclude<TruncatePosition, 'none'>;
  readonly by: TruncateUnit;
  readonly limit: number | undefined;
  readonly locale: string | undefined;
}

/** The rendered elements the fit reads. */
export interface FitElements {
  /** The block whose inline size is available to the text. */
  readonly box: HTMLElement;
  /** The hidden copy of the whole text; its inline size never depends on the cut. */
  readonly sizer: HTMLElement;
  /** The presented text. */
  readonly shown: HTMLElement;
  /** The hidden omission mark. */
  readonly omission: HTMLElement;
}

interface Measured {
  readonly units: string[];
  readonly measure: TruncationMeasure;
}

const TOLERANCE = 0.5;

function textNode(element: Element, text: string): Text | undefined {
  for (const node of element.childNodes)
    if (node.nodeType === 3 && (node as Text).data === text) return node as Text;
  return undefined;
}

function vertical(element: Element): boolean {
  const mode = getComputedStyle(element).writingMode;
  return mode.startsWith('vertical') || mode.startsWith('sideways');
}

function inlineSize(rect: DOMRect, isVertical: boolean): number {
  return isVertical ? rect.height : rect.width;
}

// Fits read layout. Updates of many elements queue their reads here and run them together after
// those updates, so one layout serves them all instead of one per element.
const pending = new Map<object, () => void>();

function schedule(owner: object, read: () => void): void {
  if (!pending.size)
    queueMicrotask(() => {
      const reads = [...pending.values()];
      pending.clear();
      for (const run of reads) run();
    });
  pending.set(owner, read);
}

/**
 * Chooses the cut of one line of text that fits its box (Foundation §18.23 `ttf-fit`, `ttf-refit`).
 * Prefix and suffix sizes are measured from the rendered sizer once per text, unit and font, so
 * a resize only redoes the arithmetic; the presented cut is checked once against the box.
 */
export class TruncationFitController implements ReactiveController {
  readonly #host: ReactiveControllerHost & HTMLElement;
  #request: FitRequest | undefined;
  #elements: FitElements | undefined;
  #key = '';
  readonly #measured = new Map<TruncateUnit, Measured>();
  #text = '';
  #cut: { units: readonly string[]; cut: TruncationCut } | null = null;
  #checked = '';
  #fittedSize = Number.NaN;
  #sizerSize = Number.NaN;
  #vertical: boolean | undefined;
  #releaseBox: (() => void) | undefined;
  #releaseSizer: (() => void) | undefined;
  #releaseFonts: (() => void) | undefined;
  #observedBox: HTMLElement | undefined;
  #observedSizer: HTMLElement | undefined;

  constructor(host: ReactiveControllerHost & HTMLElement) {
    this.#host = host;
    host.addController(this);
  }

  /** The presented text: the request's text, or its cut. */
  text(request: FitRequest): string {
    const key = this.#keyOf(request);
    return key === this.#key && this.#cut ? this.#text : request.text;
  }

  /** Whether the presented text is a cut of the request's text. */
  truncated(request: FitRequest): boolean {
    return this.#keyOf(request) === this.#key && this.#cut !== null;
  }

  /** Adopts the request and its rendered elements after each host update; clears without them. */
  sync(request: FitRequest | undefined, elements: FitElements | undefined): void {
    if (!request || !elements) {
      this.#stop();
      this.#request = undefined;
      this.#elements = undefined;
      this.#key = '';
      this.#cut = null;
      this.#measured.clear();
      return;
    }
    const key = this.#keyOf(request);
    if (key !== this.#key) {
      this.#measured.clear();
      this.#cut = null;
      this.#checked = '';
    }
    this.#key = key;
    this.#request = request;
    this.#elements = elements;
    this.#observe(elements);
    schedule(this, () => {
      if (!this.#check()) this.#fit();
    });
  }

  hostConnected(): void {
    if (this.#elements) this.#observe(this.#elements);
  }

  hostDisconnected(): void {
    this.#stop();
  }

  #keyOf(request: FitRequest): string {
    const { text, position, by, limit, locale } = request;
    return JSON.stringify([text, position, by, limit ?? null, locale ?? '']);
  }

  #observe(elements: FitElements): void {
    if (this.#observedBox !== elements.box) {
      this.#releaseBox?.();
      this.#observedBox = elements.box;
      this.#releaseBox = observeResize(elements.box, () => this.#fit());
    }
    if (this.#observedSizer !== elements.sizer) {
      this.#releaseSizer?.();
      this.#observedSizer = elements.sizer;
      // The sizer changes inline size only when the text's font does.
      this.#releaseSizer = observeResize(elements.sizer, () => {
        const size = inlineSize(elements.sizer.getBoundingClientRect(), vertical(elements.sizer));
        if (Math.abs(size - this.#sizerSize) > 0.01) this.#remeasure();
      });
    }
    this.#releaseFonts ??= observeFonts(this.#host.ownerDocument, () => this.#remeasure());
  }

  #stop(): void {
    this.#releaseBox?.();
    this.#releaseSizer?.();
    this.#releaseFonts?.();
    this.#releaseBox = this.#releaseSizer = this.#releaseFonts = undefined;
    this.#observedBox = this.#observedSizer = undefined;
  }

  #remeasure(): void {
    this.#measured.clear();
    this.#vertical = undefined;
    this.#checked = '';
    this.#fit(true);
  }

  #measure(by: TruncateUnit, request: FitRequest, elements: FitElements): Measured | null {
    const cached = this.#measured.get(by);
    if (cached) return cached;
    const node = textNode(elements.sizer, request.text);
    if (!node) return null;
    const isVertical = (this.#vertical = vertical(elements.box));
    this.#sizerSize = inlineSize(elements.sizer.getBoundingClientRect(), isVertical);
    const units = truncationUnits(request.text, by, request.locale);
    const boundaries = [0];
    for (const unit of units) boundaries.push(boundaries[boundaries.length - 1]! + unit.length);
    const { data } = node;
    const range = node.ownerDocument.createRange();
    const size = (start: number, end: number): number => {
      if (end <= start) return 0;
      range.setStart(node, start);
      range.setEnd(node, end);
      return inlineSize(range.getBoundingClientRect(), isVertical);
    };
    const heads = new Map<number, number>();
    const tails = new Map<number, number>();
    const measure: TruncationMeasure = {
      count: units.length,
      full: size(0, data.length),
      omission: inlineSize(elements.omission.getBoundingClientRect(), isVertical),
      head(k) {
        let width = heads.get(k);
        if (width === undefined) {
          let end = boundaries[k]!;
          while (end > 0 && /\s/u.test(data[end - 1]!)) end -= 1;
          heads.set(k, (width = size(0, end)));
        }
        return width;
      },
      tail(k) {
        let width = tails.get(k);
        if (width === undefined) {
          let start = boundaries[units.length - k]!;
          while (start < data.length && /\s/u.test(data[start]!)) start += 1;
          tails.set(k, (width = k ? size(start, data.length) : 0));
        }
        return width;
      },
    };
    const measured = { units, measure };
    this.#measured.set(by, measured);
    return measured;
  }

  #available(elements: FitElements): number {
    this.#vertical ??= vertical(elements.box);
    return inlineSize(elements.box.getBoundingClientRect(), this.#vertical);
  }

  /**
   * Chooses the cut for the current size. Without `force`, an unchanged size keeps the presented
   * cut, including one the check narrowed.
   */
  #fit(force = false): void {
    const request = this.#request;
    const elements = this.#elements;
    // A box outside the rendering (hidden or disconnected) cannot be measured; its resize refits.
    if (!request || !elements?.box.isConnected || !elements.box.getClientRects().length) return;
    const available = this.#available(elements);
    if (!force && available === this.#fittedSize && this.#measured.has(request.by)) return;
    this.#fittedSize = available;
    let measured = this.#measure(request.by, request, elements);
    if (!measured) return;
    let cut = fitCut(measured.measure, available, request.position, request.limit);
    // A word that alone does not fit is cut by characters rather than leaving only the omission.
    if (
      cut &&
      request.by === 'words' &&
      cut.head + cut.tail === 0 &&
      request.limit !== 0 &&
      available > measured.measure.omission
    ) {
      const chars = this.#measure('chars', request, elements);
      if (chars) {
        measured = chars;
        cut = fitCut(chars.measure, available, request.position);
      }
    }
    this.#adopt(cut ? { units: measured.units, cut } : null);
  }

  /** Narrows a presented cut that the rendered text shows wider than its box; true when it did. */
  #check(): boolean {
    const elements = this.#elements;
    const current = this.#cut;
    if (!elements || !current || this.#checked === this.#text) return false;
    this.#checked = this.#text;
    const node = textNode(elements.shown, this.#text);
    if (!node || !elements.box.getClientRects().length) return false;
    const isVertical = (this.#vertical ??= vertical(elements.box));
    const range = node.ownerDocument.createRange();
    range.selectNodeContents(node);
    const overflow =
      inlineSize(range.getBoundingClientRect(), isVertical) -
      inlineSize(elements.box.getBoundingClientRect(), isVertical);
    const { head, tail } = current.cut;
    if (overflow <= TOLERANCE || head + tail === 0) return false;
    this.#adopt({
      units: current.units,
      cut: head >= tail && head > 0 ? { head: head - 1, tail } : { head, tail: tail - 1 },
    });
    return true;
  }

  #adopt(next: { units: readonly string[]; cut: TruncationCut } | null): void {
    const text = next ? joinCut(next.units, next.cut) : (this.#request?.text ?? '');
    const changed = text !== this.#text || (next === null) !== (this.#cut === null);
    this.#cut = next;
    this.#text = text;
    if (changed) this.#host.requestUpdate();
  }
}
