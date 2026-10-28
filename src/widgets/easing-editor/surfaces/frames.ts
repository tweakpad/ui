import { svg, type PropertyValues } from 'lit';
import { TpElement } from '../../../foundation/element.js';
import { easingFunction } from '../../../foundation/easing/evaluate.js';
import type { EasingCurve, ProgressionRange } from '../../../foundation/easing/types.js';
import { easingEditorPresentation } from '../../../presentation/families/easing-editor.js';
import { DEFAULT_STRINGS, resolveStrings } from '../strings.js';
import { easingSurfaceStyles } from '../styles.js';
import type { EasingEditorStrings } from '../types.js';
import { curveRange, FRAME_TICKS, frameTicks } from './geometry.js';

/**
 * The frames bar: a fixed number of ticks at the eased positions over the graph's range, so dense
 * ticks show where the motion is slow whatever the duration (Widgets 6.2 Anatomy frames row). A
 * render-only surface exposed as an image named with its tick count.
 */
export class TpEasingEditorFrames extends TpElement {
  static tagName = 'tp-easing-editor-frames';
  static override presentation = easingEditorPresentation;
  static override properties = {
    ...TpElement.properties,
    curve: { attribute: false },
    shownRange: { attribute: false },
    label: { type: String },
    strings: { attribute: false },
  };
  static override styles = [TpElement.styles, easingSurfaceStyles];

  curve: EasingCurve | null = null;
  /** The range the owner shows, shared with the graph. */
  shownRange: ProgressionRange | null = null;
  label = '';
  strings: Partial<EasingEditorStrings> = {};

  #range: ProgressionRange = { min: 0, max: 1 };

  get presentationOwner(): HTMLElement | null {
    const root = this.getRootNode();
    return root instanceof ShadowRoot ? (root.host as HTMLElement) : null;
  }

  get count(): number {
    return FRAME_TICKS;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (changed.has('curve') || changed.has('shownRange'))
      this.#range = this.shownRange ?? curveRange(this.curve);
  }

  protected override render() {
    const text = this.strings === DEFAULT_STRINGS ? DEFAULT_STRINGS : resolveStrings(this.strings);
    const curve = this.curve;
    const count = this.count;
    const ticks = curve ? frameTicks(easingFunction(curve), count, this.#range) : [];
    const name = `${this.label ? `${this.label}: ` : ''}${text.frames}: ${count}`;
    return this.renderPart(
      'easing-editor-frames',
      { count, kind: curve?.kind ?? null },
      {
        tag: 'div',
        properties: {
          part: 'easing-editor-frames',
          class: 'surface frames',
          role: 'img',
          'aria-label': name,
          'data-disabled': this.disabled,
        },
        content: svg`<svg class="plot" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">${ticks.map(
          (tick) =>
            svg`<line part="easing-editor-frames-tick" class="tick" x1=${(tick * 100).toFixed(3)} y1="0" x2=${(tick * 100).toFixed(3)} y2="10" vector-effect="non-scaling-stroke"></line>`,
        )}</svg>`,
      },
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-easing-editor-frames': TpEasingEditorFrames;
  }
}
