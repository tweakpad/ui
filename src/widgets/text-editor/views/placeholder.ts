/**
 * The overlay text of the text editor (`uwg-te-tab-anatomy-r6`, `uwg-te-tab-props-r4`,
 * `uwg-te-req-pres-5`, `uwg-te-req-prop-3`): the document placeholder at the first block of an
 * empty document, or the empty-block hint at the empty block holding the caret, in one pooled span
 * that copies the metrics of the block it overlays.
 */
import { html, type TemplateResult } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { contentBox, cssPixels } from '../../../foundation/text-editor/content/box.js';
import type { TextEditorAccess } from '../../../foundation/text-editor/controller.js';
import type { TextEditorEngineState } from '../../../foundation/text-editor/model.js';
import type {
  OverlayBox,
  OverlayGeometry,
  OverlayLayer,
  OverlayMeasureContext,
} from '../geometry.js';

export interface TextEditorPlaceholderOptions {
  /** The element's `placeholder`. */
  readonly placeholder: string;
  /** The resolved `strings.emptyBlockHint`. */
  readonly hint: string;
  /** The element's `readOnly` and its effective `disabled` (fieldset and Field included). */
  readonly access: TextEditorAccess;
}

/**
 * What the overlay shows: the document placeholder at the first block, or the hint at the empty
 * caret block.
 */
export type TextEditorPlaceholder =
  | { readonly kind: 'document'; readonly text: string }
  | { readonly kind: 'hint'; readonly text: string; readonly block: string };

/** The block metrics the span copies, by CSS property name. */
export const PLACEHOLDER_COPIED_PROPERTIES = [
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'font-stretch',
  'font-variant',
  'font-feature-settings',
  'font-variation-settings',
  'line-height',
  'letter-spacing',
  'word-spacing',
  'text-transform',
  'text-indent',
  'padding-inline-start',
  'direction',
  'text-align',
] as const;

export type PlaceholderCopiedProperty = (typeof PLACEHOLDER_COPIED_PROPERTIES)[number];

/** The span's border box in overlay coordinates. */
export interface PlaceholderBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

/** A block's border plus padding on each physical side, in CSS pixels (computed style). */
export interface PlaceholderBlockInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface TextEditorPlaceholderPlacement {
  /** The model it was measured for (a stale one is not applied). */
  readonly placeholder: TextEditorPlaceholder;
  readonly box: PlaceholderBox;
  readonly style: Readonly<Record<PlaceholderCopiedProperty, string>>;
}

/**
 * The overlay text for a state (`uwg-te-tab-props-r4`, `uwg-te-req-pres-5`, `uwg-te-req-prop-3`).
 * Readiness-free: before ready it reads the pre-ready state, whose `empty` reflects the pending
 * content.
 */
export function placeholderModel(
  state: TextEditorEngineState,
  options: TextEditorPlaceholderOptions,
): TextEditorPlaceholder | null {
  if (state.composing) return null;
  // The document placeholder shows in every access state, before ready included.
  if (state.empty)
    return options.placeholder ? { kind: 'document', text: options.placeholder } : null;
  const { access, hint } = options;
  const emptyBlock = state.emptyBlock;
  if (
    !hint ||
    !state.focused ||
    !state.editable ||
    access.readOnly ||
    access.disabled ||
    emptyBlock === null
  )
    return null;
  return { kind: 'hint', text: hint, block: emptyBlock.id };
}

/**
 * The span box from the block's first line box and its inline-start padding, so that the span's
 * text starts where the block's does.
 */
export function placeholderBox(
  line: OverlayBox,
  paddingInlineStart: number,
  rtl: boolean,
): PlaceholderBox {
  return {
    left: rtl ? line.left : line.left - paddingInlineStart,
    top: line.top,
    width: line.width + paddingInlineStart,
  };
}

/**
 * The first line of an empty preview block: its content box, the border box (overlay
 * coordinates) inset by `insets`; a size past zero clamps to 0.
 */
export function previewFirstLine(border: OverlayBox, insets: PlaceholderBlockInsets): OverlayBox {
  return {
    left: border.left + insets.left,
    top: border.top + insets.top,
    width: Math.max(0, border.width - insets.left - insets.right),
    height: Math.max(0, border.height - insets.top - insets.bottom),
  };
}

/** A block's border plus padding per side, through the one content-box owner. */
function blockInsets(style: CSSStyleDeclaration): PlaceholderBlockInsets {
  const inner = contentBox({ left: 0, top: 0, right: 0, bottom: 0 }, style);
  return { top: inner.top, right: 0 - inner.right, bottom: 0 - inner.bottom, left: inner.left };
}

function copiedStyle(style: CSSStyleDeclaration): Record<PlaceholderCopiedProperty, string> {
  return Object.fromEntries(
    PLACEHOLDER_COPIED_PROPERTIES.map((name) => [name, style.getPropertyValue(name)]),
  ) as Record<PlaceholderCopiedProperty, string>;
}

const sameTarget = (a: TextEditorPlaceholder, b: TextEditorPlaceholder): boolean =>
  a.kind === b.kind && (a.kind === 'document' || (b.kind === 'hint' && a.block === b.block));

/** The pooled writer of the placeholder span. */
export class TextEditorPlaceholderLayer implements OverlayLayer<TextEditorPlaceholderPlacement | null> {
  readonly #geometry: OverlayGeometry;
  readonly #remove: () => void;
  #span: HTMLElement | null = null;
  #model: TextEditorPlaceholder | null = null;
  /** What the span shows now, so that `apply` writes only changes and never reads the span. */
  #shown = false;
  #text = '';
  #width = '';
  #translate = '';
  #style: Partial<Record<PlaceholderCopiedProperty, string>> = {};

  /** Registers itself with the geometry; touches no global. */
  constructor(geometry: OverlayGeometry) {
    this.#geometry = geometry;
    this.#remove = geometry.addLayer(this);
  }

  /** The `ref` callback for the span `renderPlaceholder` renders. */
  readonly bind = (element: Element | undefined): void => {
    const span = (element as HTMLElement | undefined) ?? null;
    if (span === this.#span) return;
    // A new span starts as `renderPlaceholder` renders it: hidden, with no text and no style.
    this.#span = span;
    this.#shown = false;
    this.#text = '';
    this.#width = '';
    this.#translate = '';
    this.#style = {};
    if (span && this.#model) this.#geometry.invalidate('state');
  };

  get placeholder(): TextEditorPlaceholder | null {
    return this.#model;
  }

  /**
   * Sets the model. A new target (kind or block) or `null` hides the span at once; a text-only
   * change rewrites the text at once; any change invalidates so the next pass places it.
   */
  update(placeholder: TextEditorPlaceholder | null): void {
    const current = this.#model;
    if (
      current === placeholder ||
      (current &&
        placeholder &&
        sameTarget(current, placeholder) &&
        current.text === placeholder.text)
    )
      return;
    this.#model = placeholder;
    if (!current || !placeholder || !sameTarget(current, placeholder)) this.hide();
    else if (this.#shown) this.#writeText(placeholder.text);
    this.#geometry.invalidate('state');
  }

  /** Removes the layer from the geometry. */
  release(): void {
    this.#remove();
    this.hide();
  }

  wanted(): boolean {
    return this.#model !== null && this.#span !== null;
  }

  measure(context: OverlayMeasureContext): TextEditorPlaceholderPlacement | null {
    const placeholder = this.#model;
    if (!placeholder || !this.#span) return null;
    const { source, owner } = context;
    if (source.kind === 'instance') {
      const { instance } = source;
      const id = placeholder.kind === 'hint' ? placeholder.block : instance.getBlocks().roots[0];
      if (id === undefined) return null;
      const element = instance.blockElement(id);
      const rects = instance.blockRects(id);
      if (!element || !rects) return null;
      const style = owner.getComputedStyle(element);
      return {
        placeholder,
        box: placeholderBox(
          context.toOverlay(rects.firstLine),
          cssPixels(style.getPropertyValue('padding-inline-start')),
          style.getPropertyValue('direction') === 'rtl',
        ),
        style: copiedStyle(style),
      };
    }
    // Before ready only the document placeholder exists, over the preview's first block (F-13).
    if (placeholder.kind !== 'document') return null;
    const block = source.root.firstElementChild;
    if (!block) return null;
    const rect = block.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;
    const style = owner.getComputedStyle(block);
    return {
      placeholder,
      box: placeholderBox(
        previewFirstLine(context.toOverlay(rect), blockInsets(style)),
        cssPixels(style.getPropertyValue('padding-inline-start')),
        style.getPropertyValue('direction') === 'rtl',
      ),
      style: copiedStyle(style),
    };
  }

  apply(placement: TextEditorPlaceholderPlacement | null): void {
    const span = this.#span;
    if (!span) return;
    if (!placement || placement.placeholder !== this.#model) {
      this.hide();
      return;
    }
    for (const name of PLACEHOLDER_COPIED_PROPERTIES) {
      const value = placement.style[name];
      if (this.#style[name] === value) continue;
      this.#style[name] = value;
      span.style.setProperty(name, value);
    }
    const { box } = placement;
    const width = `${box.width}px`;
    if (width !== this.#width) span.style.setProperty('width', (this.#width = width));
    // A transform: moving the text records no layout shift.
    const translate = `${box.left}px ${box.top}px`;
    if (translate !== this.#translate)
      span.style.setProperty('translate', (this.#translate = translate));
    this.#writeText(placement.placeholder.text);
    if (!this.#shown) {
      this.#shown = true;
      span.hidden = false;
    }
  }

  hide(): void {
    const span = this.#span;
    if (!span) return;
    if (this.#shown) {
      this.#shown = false;
      span.hidden = true;
    }
    this.#writeText('');
  }

  #writeText(text: string): void {
    const span = this.#span;
    if (!span || text === this.#text) return;
    this.#text = text;
    span.textContent = text;
  }
}

/** The one pooled span (`uwg-te-tab-anatomy-r6`), rendered inside the overlay part. */
export function renderPlaceholder(layer: TextEditorPlaceholderLayer): TemplateResult {
  return html`<span
    part="text-editor-placeholder"
    aria-hidden="true"
    hidden
    ${ref(layer.bind)}
  ></span>`;
}
