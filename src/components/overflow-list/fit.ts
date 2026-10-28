import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { scheduleLayoutPass } from '../../foundation/layout-batch.js';
import { blockSpan, inlineSize, isVerticalWritingMode } from '../../foundation/logical-size.js';
import { observeFonts, observeResize } from '../../foundation/observation.js';
import {
  fitPartition,
  limitPartition,
  shownRange,
  type OverflowCollapseFrom,
} from '../../foundation/overflow-fit.js';
import { groupLines } from '../../foundation/text-split/lines.js';

/** What to fit, read from the host after each update. */
export interface OverflowFitState {
  /** Items in document order. */
  readonly items: readonly Element[];
  /** How many Items the current rendering shows. */
  readonly shown: number;
  readonly maxRows: number;
  readonly limit: number | undefined;
  readonly from: OverflowCollapseFrom;
  /** The rendered Count, shown in the list or kept in the measuring pool. */
  readonly count: Element | null;
  /** Whether the Count is shown in the list. */
  readonly countShown: boolean;
  /** Changes when the Count's text source changes (messages or a Consumer Count). */
  readonly countSource: unknown;
  /** The omitted count the rendered default Count presents; undefined for a Consumer Count. */
  readonly countPresents: number | undefined;
  /** The list part that wraps the shown Items. */
  readonly list: HTMLElement;
  /** The zero-height sizer that supplies the intrinsic inline size. */
  readonly sizer: HTMLElement;
  /**
   * The measuring pool, whose content box is the available inline size, and the gap probe,
   * whose inline size is the gap; neither changes with the block-size lock.
   */
  readonly pool: HTMLElement;
  readonly gapProbe: HTMLElement;
}

/** What the host does with a fit. */
export interface OverflowFitHost extends ReactiveControllerHost, HTMLElement {
  /** Presents `shown` Items. */
  adoptShown(shown: number): void;
  /** The presented partition fits its rows. */
  partitionSettled(): void;
  /**
   * Lays out default Counts for these omitted counts so the next pass can measure them; false
   * when they are already laid out.
   */
  probeCounts(hidden: readonly number[]): boolean;
  /** An Item cannot be measured as one box or grows to fill its row. */
  itemDiagnostic(kind: 'contents' | 'growing'): void;
}

interface Measured {
  readonly available: number;
  readonly gap: number;
  readonly sizes: readonly number[];
  readonly countSize: number | undefined;
  /** Sizes of the probed default Counts by omitted count. */
  readonly probes: ReadonlyMap<number, number>;
  readonly rows: number;
  readonly blockSize: number;
}

/** Inline size of an element's margin box. */
function outerInlineSize(element: Element, style: CSSStyleDeclaration, vertical: boolean): number {
  return (
    inlineSize(element.getBoundingClientRect(), vertical) +
    (parseFloat(style.marginInlineStart) || 0) +
    (parseFloat(style.marginInlineEnd) || 0)
  );
}

/**
 * Fits Items into `maxRows` rows (Foundation §18.24 `ovl-fit`, `ovl-refit`). Each pass, batched
 * across instances, releases the block-size lock, measures the Items (shown ones in the list,
 * omitted ones in the measuring pool), the Count, the gap and the available inline size, then
 * either presents a new partition, narrows one that renders more rows than allowed, or settles
 * and locks the list at its fitted block size so a stale partition never moves the content after it.
 */
export class OverflowFitController implements ReactiveController {
  readonly #host: OverflowFitHost;
  #state: OverflowFitState | undefined;
  /** Measured Count sizes by omitted count. */
  readonly #countSizes = new Map<number, number>();
  #countEstimate = 0;
  #countSource: unknown;
  /** Inputs of the last fit; a narrowing ceiling holds while they stay the same. */
  #key = '';
  #ceiling = Number.POSITIVE_INFINITY;
  /** The previous pass changed the intrinsic size and left its choice to this one. */
  #resized = false;
  #releaseFonts: (() => void) | undefined;
  readonly #observed = new Map<Element, () => void>();

  constructor(host: OverflowFitHost) {
    this.#host = host;
    host.addController(this);
  }

  /** Adopts the rendered state after each host update; stops fitting without one. */
  sync(state: OverflowFitState | undefined): void {
    if (!state) {
      if (this.#state) this.#unlock(this.#state);
      this.#stop();
      this.#state = undefined;
      this.#key = '';
      this.#ceiling = Number.POSITIVE_INFINITY;
      return;
    }
    if (state.countSource !== this.#countSource) {
      this.#countSource = state.countSource;
      this.#forgetCount();
    }
    this.#state = state;
    // An update that runs after the host's removal keeps the state for a reconnection, which
    // observes it again (`hostConnected`): observing now would hold the removed list for good.
    if (!this.#host.isConnected) return;
    this.#observe(state);
    this.#schedule();
  }

  hostConnected(): void {
    if (this.#state) {
      this.#observe(this.#state);
      this.#schedule();
    }
  }

  hostDisconnected(): void {
    this.#stop();
  }

  #schedule(): void {
    scheduleLayoutPass(this, {
      active: () => this.#host.isConnected && this.#state !== undefined,
      write: () => {
        if (this.#state) this.#unlock(this.#state);
      },
      measure: () => (this.#state ? this.#measure(this.#state) : undefined),
      apply: (measured) => {
        if (this.#state && measured) this.#apply(this.#state, measured);
      },
    });
  }

  #observe(state: OverflowFitState): void {
    this.#releaseFonts ??= observeFonts(this.#host.ownerDocument, () => {
      this.#forgetCount();
      this.#schedule();
    });
    // The available inline size and the gap (container or padding changes), every Item, and
    // a Consumer Count, which may change size after it learns the new count.
    const watched = new Set<Element>([state.pool, state.gapProbe, ...state.items]);
    if (state.count && state.count.getRootNode() !== this.#host.shadowRoot)
      watched.add(state.count);
    for (const [element, release] of this.#observed)
      if (!watched.has(element)) {
        release();
        this.#observed.delete(element);
      }
    for (const element of watched)
      if (!this.#observed.has(element))
        this.#observed.set(
          element,
          observeResize(element, () => this.#schedule()),
        );
  }

  #stop(): void {
    this.#releaseFonts?.();
    this.#releaseFonts = undefined;
    for (const release of this.#observed.values()) release();
    this.#observed.clear();
  }

  #forgetCount(): void {
    this.#countSizes.clear();
    this.#countEstimate = 0;
  }

  #unlock(state: OverflowFitState): void {
    state.list.style.removeProperty('block-size');
  }

  #measure(state: OverflowFitState): Measured | undefined {
    const { list, items, count } = state;
    // A list outside the rendering (hidden or disconnected) cannot be measured; its sizer's
    // resize fits it once it renders.
    if (!list.isConnected || !list.getClientRects().length) return undefined;
    const view = list.ownerDocument.defaultView;
    if (!view) return undefined;
    const vertical = isVerticalWritingMode(list);
    const listStyle = view.getComputedStyle(list);
    const rect = list.getBoundingClientRect();
    const available =
      inlineSize(rect, vertical) -
      [
        listStyle.paddingInlineStart,
        listStyle.paddingInlineEnd,
        listStyle.borderInlineStartWidth,
        listStyle.borderInlineEndWidth,
      ].reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
    const sizes = items.map((item) => {
      const style = view.getComputedStyle(item);
      if (style.display === 'contents') this.#host.itemDiagnostic('contents');
      else if ((parseFloat(style.flexGrow) || 0) > 0) this.#host.itemDiagnostic('growing');
      return outerInlineSize(item, style, vertical);
    });
    const countStyle = count ? view.getComputedStyle(count) : undefined;
    if (countStyle?.display === 'contents') this.#host.itemDiagnostic('contents');
    const countSize =
      count && countStyle && count.getClientRects().length
        ? outerInlineSize(count, countStyle, vertical)
        : undefined;
    // The default Count measures as its chrome plus its text; other counts' texts are laid out
    // inside it with the same font.
    const probes = new Map<number, number>();
    const text = state.countPresents !== undefined ? count?.querySelector('.count-text') : null;
    if (countSize !== undefined && text) {
      const chrome = countSize - inlineSize(text.getBoundingClientRect(), vertical);
      for (const probe of count!.querySelectorAll<HTMLElement>('.count-probes > [data-hidden]'))
        probes.set(
          Number(probe.dataset.hidden),
          chrome + inlineSize(probe.getBoundingClientRect(), vertical),
        );
    }
    // Rendered rows: the shown Items and a shown Count, in their visual order.
    const [start, end] = shownRange(items.length, state.shown, state.from);
    const flow = items.slice(start, end);
    if (count && state.countShown) {
      if (state.from === 'start') flow.unshift(count);
      else flow.push(count);
    }
    const boxes = flow
      .map((element) => element.getBoundingClientRect())
      .filter((box) => box.width > 0 || box.height > 0)
      .map((box) => blockSpan(box, vertical));
    const lines = groupLines(boxes);
    return {
      available,
      gap: inlineSize(state.gapProbe.getBoundingClientRect(), vertical),
      sizes,
      countSize,
      probes,
      rows: lines.length ? lines[lines.length - 1]! + 1 : 0,
      blockSize: vertical ? rect.width : rect.height,
    };
  }

  #apply(state: OverflowFitState, measured: Measured): void {
    const total = state.items.length;
    const hidden = total - state.shown;
    if (measured.countSize !== undefined) {
      const presents = state.countPresents ?? (state.countShown ? hidden : undefined);
      if (presents !== undefined) this.#countSizes.set(presents, measured.countSize);
      this.#countEstimate = Math.max(this.#countEstimate, measured.countSize);
    }
    for (const [omitted, size] of measured.probes) {
      this.#countSizes.set(omitted, size);
      this.#countEstimate = Math.max(this.#countEstimate, size);
    }
    const countSize = (omitted: number) => this.#countSizes.get(omitted) ?? this.#countEstimate;
    // A list that takes its inline size from its intrinsic one measured the available size
    // against the previous Items (after an Item change): measure once more before choosing, so
    // a stale size never presents a passing partition that moves a focused Item to the pool.
    if (this.#size(state, measured, countSize) && !this.#resized) {
      this.#resized = true;
      this.#lock(state, measured.blockSize);
      this.#schedule();
      return;
    }
    this.#resized = false;
    const key = JSON.stringify([
      measured.available,
      measured.gap,
      measured.sizes,
      state.maxRows,
      state.limit ?? null,
      state.from,
    ]);
    if (key !== this.#key) {
      this.#key = key;
      this.#ceiling = Number.POSITIVE_INFINITY;
    }
    const fitted = fitPartition({
      sizes: measured.sizes,
      gap: measured.gap,
      available: measured.available,
      maxRows: state.maxRows,
      limit: state.limit,
      from: state.from,
      countSize,
    });
    // The default Count is sized for the count it would present: the fit's choice and the
    // next larger one must rest on measured Counts, so unknown ones are laid out in the pool
    // and measured by the next pass before the choice is presented.
    if (!state.count || state.count.getRootNode() === this.#host.shadowRoot) {
      const cap = limitPartition(total, state.limit);
      const needed = [total - fitted, total - fitted - 1, total]
        .filter((omitted, index) => omitted > 0 && (index !== 1 || fitted + 1 <= cap))
        .filter((omitted) => !this.#countSizes.has(omitted));
      // A probe already laid out yet unmeasured cannot be learned; the estimate stands in.
      if (needed.length && this.#host.probeCounts([...new Set(needed)])) {
        this.#lock(state, measured.blockSize);
        return;
      }
    }
    const shown = Math.min(fitted, this.#ceiling);
    this.#lock(state, measured.blockSize);
    if (shown !== state.shown) {
      this.#host.adoptShown(shown);
      return;
    }
    // The presented partition renders more rows than the arithmetic predicted: show one Item
    // fewer, and keep that ceiling while the inputs stay the same so the fit never alternates.
    if (measured.rows > state.maxRows && state.shown > 0) {
      this.#ceiling = state.shown - 1;
      this.#host.adoptShown(this.#ceiling);
      return;
    }
    this.#host.partitionSettled();
  }

  #lock(state: OverflowFitState, blockSize: number): void {
    state.list.style.setProperty('block-size', `${blockSize}px`);
  }

  /**
   * Intrinsic inline sizes that never depend on the partition: the Count alone, or one row.
   * Returns whether either changed.
   */
  #size(
    state: OverflowFitState,
    measured: Measured,
    countSize: (omitted: number) => number,
  ): boolean {
    const total = state.items.length;
    const cap = limitPartition(total, state.limit);
    const [start, end] = shownRange(total, cap, state.from);
    const row = measured.sizes.slice(start, end);
    let max = row.reduce((sum, size) => sum + size, 0) + measured.gap * Math.max(0, row.length - 1);
    if (cap < total) max += (row.length ? measured.gap : 0) + countSize(total - cap);
    const min = Math.min(countSize(total) || this.#countEstimate, max);
    let changed = false;
    for (const [name, size] of [
      ['--_tp-overflow-min', min],
      ['--_tp-overflow-max', max],
    ] as const) {
      const value = `${Math.ceil(size)}px`;
      if (state.sizer.style.getPropertyValue(name) === value) continue;
      state.sizer.style.setProperty(name, value);
      changed = true;
    }
    return changed;
  }
}
