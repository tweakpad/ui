/**
 * Column resize of the text editor's tables (`uwg-te-req-tables-6`, `uwg-te-tab-anatomy-tables-r4`):
 * the `text-editor-resize-handle` separator on one column boundary, run by the shared
 * `ResizeSeparatorController`. A pointer drag moves a guide line within the limits and commits one
 * `table.column-widths` request on release; Escape or pointer cancellation restores without a
 * request. On the focused separator the arrow toward the inline end widens the column by 8 CSS
 * pixels (32 with Shift, 1 with Alt), the opposite arrow narrows it, Home sets the minimum and End
 * the maximum, each step one request.
 */
import {
  ResizeSeparatorController,
  type ResizeSeparatorAttributes,
  type ResizeSeparatorProposal,
} from '../../../foundation/resize-separator.js';
import type { ChangeReason } from '../../../foundation/types.js';

/** The narrowest column, in CSS pixels (`uwg-te-req-tables-6`). */
export const TABLE_COLUMN_MIN = 48;

/** The key steps of the separator: 8 CSS pixels, 32 with Shift, 1 with Alt. */
export const TABLE_RESIZE_STEPS = Object.freeze({ step: 8, shift: 32, alt: 1 });

/** The column that the separator resizes, measured when the separator is placed. */
export interface TableResizeTarget {
  readonly table: string;
  /** The column before the boundary. */
  readonly column: number;
  /** The width of every column in CSS pixels, as laid out. */
  readonly widths: readonly number[];
  /** The visible inline size of the table's scroll wrapper, in CSS pixels. */
  readonly visible: number;
}

/**
 * The separator's maximum: the larger of the wrapper's visible inline size and the column's width
 * when the drag starts or the separator takes focus.
 */
export function columnResizeMax(visible: number, width: number): number {
  return Math.max(TABLE_COLUMN_MIN, visible, width);
}

/**
 * The widths of a resize: every column at its measured width (the first resize declares them all),
 * the resized one at `width`, each rounded and at least the minimum (`uwg-te-req-tables-6`).
 */
export function resizedWidths(
  measured: readonly number[],
  column: number,
  width: number,
): readonly number[] {
  return measured.map((value, index) =>
    Math.max(TABLE_COLUMN_MIN, Math.round(index === column ? width : value)),
  );
}

export interface TableResizeHost {
  /** The widget element: its document takes the drag cursor and the selection block. */
  readonly element: HTMLElement;
  direction(): 'ltr' | 'rtl';
  /** True while read-only or disabled. */
  disabled(): boolean;
  /** Issues the one `table.column-widths` request of a settled resize. */
  commit(
    table: string,
    widths: readonly number[],
    reason: Extract<ChangeReason, 'drag' | 'keyboard'>,
    event: Event | null,
  ): void;
  /** The guide moved or went away: the overlay needs a pass. */
  changed(): void;
}

/** The resize separator of the active table (`views/table-chrome.ts` places it). */
export class TextEditorTableResize {
  readonly #host: TableResizeHost;
  #target: TableResizeTarget | null = null;
  /** The maximum frozen at drag start or at focus. */
  #max = TABLE_COLUMN_MIN;
  /** The width the drag proposes now; null outside a drag. */
  #live: number | null = null;
  #focused = false;
  readonly separator: ResizeSeparatorController;

  constructor(host: TableResizeHost) {
    this.#host = host;
    this.separator = new ResizeSeparatorController({
      host: host.element,
      axis: () => 'horizontal',
      direction: () => host.direction(),
      value: () => this.#width(),
      min: () => TABLE_COLUMN_MIN,
      max: () => this.#max,
      steps: () => TABLE_RESIZE_STEPS,
      disabled: () => this.#target === null || host.disabled(),
      scale: () => 1,
      propose: (proposal) => this.#proposal(proposal),
    });
  }

  get target(): TableResizeTarget | null {
    return this.#target;
  }

  /** True during a pointer drag. */
  get dragging(): boolean {
    return this.separator.dragging;
  }

  /**
   * The signed distance of the guide from the boundary in CSS pixels along the inline axis, or null
   * outside a drag.
   */
  get guideOffset(): number | null {
    if (this.#live === null) return null;
    return this.#live - this.#width();
  }

  /**
   * Places the separator on a column; ignored during a drag, and the maximum is kept while the
   * separator holds focus on the same column.
   */
  setTarget(target: TableResizeTarget | null): void {
    if (this.separator.dragging) return;
    const same =
      target !== null &&
      this.#target !== null &&
      target.table === this.#target.table &&
      target.column === this.#target.column;
    this.#target = target;
    if (!target) return;
    if (!(same && this.#focused)) this.#max = this.#maxOf(target);
  }

  /** The separator's role, orientation and values; null without a target. */
  attributes(): ResizeSeparatorAttributes | null {
    return this.#target ? this.separator.attributes() : null;
  }

  /** The separator took or lost focus: the maximum freezes while it holds focus. */
  focusChanged(focused: boolean): void {
    this.#focused = focused;
    if (focused && this.#target) this.#max = this.#maxOf(this.#target);
  }

  /** A press on the separator element starts a drag that freezes the maximum. */
  pointerDown(event: PointerEvent, element: HTMLElement): void {
    if (this.#target) this.#max = this.#maxOf(this.#target);
    this.separator.pointerDown(event, element);
  }

  /** Abandons a drag and forgets the target (disconnect, readOnly, a lost table). */
  reset(): void {
    this.separator.cancel();
    this.#target = null;
    this.#live = null;
  }

  #width(): number {
    const target = this.#target;
    return target ? (target.widths[target.column] ?? TABLE_COLUMN_MIN) : TABLE_COLUMN_MIN;
  }

  #maxOf(target: TableResizeTarget): number {
    return columnResizeMax(target.visible, target.widths[target.column] ?? 0);
  }

  #proposal(proposal: ResizeSeparatorProposal): void {
    const target = this.#target;
    if (!target) return;
    if (proposal.phase === 'live') {
      this.#live = proposal.value;
      this.#host.changed();
      return;
    }
    const dragged = proposal.source === 'pointer';
    this.#live = null;
    if (dragged) this.#host.changed();
    if (proposal.phase === 'cancelled') return;
    // A press that did not move commits nothing.
    if (dragged && proposal.delta === 0) return;
    const width = Math.round(proposal.value);
    const widths = resizedWidths(target.widths, target.column, width);
    // The next key press steps from the committed width before the next layout pass.
    this.#target = { ...target, widths };
    this.#host.commit(target.table, widths, dragged ? 'drag' : 'keyboard', proposal.event);
  }
}
