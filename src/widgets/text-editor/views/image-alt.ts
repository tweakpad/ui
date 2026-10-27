/**
 * The alternative text field (`uwg-te-req-surfaces-4`, `uwg-te-tab-anatomy-r16`): a floating
 * Input in the overlay, inside the top-left corner of the one image block that a block selection
 * holds, with its apply action. It shows while the editor is ready and editable and focus is in
 * the widget, takes no focus by itself, applies on Enter or its apply action through
 * `block.set-attrs`, and Escape returns focus to the editing root with the block still selected.
 * Alt+F10 reaches it as a contextual surface; Tab reaches it after the editing root.
 */
import { css, html, type TemplateResult } from 'lit';
import { ref } from 'lit/directives/ref.js';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import { composedContains, deepActiveElement } from '../../../foundation/focus.js';
import type { TextEditorAccess } from '../../../foundation/text-editor/controller.js';
import type {
  TextEditorRequestOutcome,
  TextEditorRequestProposal,
} from '../../../foundation/text-editor/controller.js';
import type {
  TextEditorBlockTree,
  TextEditorEngineState,
  TextEditorSelection,
} from '../../../foundation/text-editor/model.js';
import type { TextEditorStrings } from '../../../foundation/text-editor/strings.js';
import { checkIcon } from '../../../icons/check.js';
import type { TextEditorContextualSurface } from '../focus.js';
import type {
  OverlayBox,
  OverlayGeometry,
  OverlayInstance,
  OverlayLayer,
  OverlayMeasureContext,
} from '../geometry.js';

/** The image that the alternative text field edits: the one image of a block selection. */
/** Structure of the alternative text field: an overlay mark placed from the layer origin. */
export const imageAltStyles = css`
  [part~='text-editor-alt-input'] {
    position: absolute;
    top: 0;
    left: 0;
    box-sizing: border-box;
    pointer-events: auto;
  }

  [part~='text-editor-alt-input'][hidden] {
    display: none !important;
  }
`;

export interface ImageAltTarget {
  readonly id: string;
  readonly alt: string;
}

/** The selected image, or `null` for any other selection. */
export function imageAltTarget(
  selection: Pick<TextEditorSelection, 'kind'> & { readonly ids?: readonly string[] },
  tree: Pick<TextEditorBlockTree, 'get'> | null,
): ImageAltTarget | null {
  if (selection.kind !== 'blocks' || !tree || selection.ids?.length !== 1) return null;
  const block = tree.get(selection.ids[0]!);
  if (!block || block.kind !== 'image') return null;
  const alt = block.attrs['alt'];
  return { id: block.id, alt: typeof alt === 'string' ? alt : '' };
}

export interface ImageAltVisibility {
  readonly target: ImageAltTarget | null;
  readonly ready: boolean;
  readonly editable: boolean;
  /** Focus is in the widget, outside the fixed toolbar. */
  readonly focusInside: boolean;
  readonly dragging: boolean;
  /** A suggestion list, a popover or a menu of a grip, the cell handle or the gutter is open. */
  readonly surfaceOpen: boolean;
}

/** Whether the field shows (`uwg-te-req-surfaces-4`). */
export function imageAltVisible(input: ImageAltVisibility): boolean {
  return (
    input.target !== null &&
    input.ready &&
    input.editable &&
    input.focusInside &&
    !input.dragging &&
    !input.surfaceOpen
  );
}

/** The request that applies an alternative text, reason `item-press`; it moves no focus. */
export function imageAltProposal(
  id: string,
  alt: string,
  sourceEvent: Event | undefined,
): TextEditorRequestProposal {
  return {
    target: [{ type: 'block.set-attrs', id, attrs: { alt } }],
    surface: 'content',
    reason: 'item-press',
    sourceEvent,
    trigger: null,
    focus: false,
  };
}

/** The inset of the field from the image's top and start edges, in CSS pixels. */
export const IMAGE_ALT_INSET = 8;

/** The place of the field in the Alt+F10 cycle: after the selection toolbar. */
export const IMAGE_ALT_ORDER = 0.5;

export interface ImageAltPlacement {
  readonly left: number;
  readonly top: number;
  /** The widest the field may be: the image's width less the insets. */
  readonly maxWidth: number;
}

/**
 * Where the field goes: inside the image's box at its top-left corner (top-right in a
 * right-to-left widget), inset by `IMAGE_ALT_INSET`, narrowed to the image when it is narrower
 * than the field.
 */
export function imageAltPlacement(
  box: OverlayBox,
  size: { readonly width: number; readonly height: number },
  rtl: boolean,
): ImageAltPlacement {
  const inset = IMAGE_ALT_INSET;
  const maxWidth = Math.max(0, box.width - 2 * inset);
  const width = Math.min(size.width, maxWidth);
  const left = rtl ? box.left + box.width - inset - width : box.left + inset;
  return { left, top: box.top + inset, maxWidth };
}

export interface TextEditorImageAltHost {
  readonly renderRoot: ShadowRoot;
  readonly geometry: OverlayGeometry;
  /** Re-renders the element. */
  requestUpdate(): void;
  strings(): TextEditorStrings;
  instance(): OverlayInstance | null;
  state(): TextEditorEngineState;
  access(): TextEditorAccess;
  direction(): 'ltr' | 'rtl';
  /** The fixed toolbar part, or null. */
  toolbar(): HTMLElement | null;
  dragging(): boolean;
  /** A suggestion list, a popover or a menu of a grip, the cell handle or the gutter is open. */
  surfaceOpen(): boolean;
  request(proposal: TextEditorRequestProposal): Promise<TextEditorRequestOutcome>;
  /** Returns focus to the editing root with its selection, through the adapter. */
  focusEditing(): void;
  registerContextual(surface: TextEditorContextualSurface): () => void;
}

/** The alternative text field of one widget: an overlay layer over the selected image. */
export class TextEditorImageAltField implements OverlayLayer<ImageAltPlacement | null> {
  readonly #host: TextEditorImageAltHost;
  readonly #removeLayer: () => void;
  readonly #releaseContextual: () => void;
  #element: HTMLElement | null = null;
  #input: HTMLElement | null = null;
  #target: ImageAltTarget | null = null;
  #draft = '';
  #shown = false;
  #placed = false;

  constructor(host: TextEditorImageAltHost) {
    this.#host = host;
    this.#removeLayer = host.geometry.addLayer(this);
    this.#releaseContextual = host.registerContextual({
      order: IMAGE_ALT_ORDER,
      applicable: () => this.#shown,
      enter: () => this.focus(),
      holdsFocus: () => this.holdsFocus(),
    });
  }

  /** Whether the field shows. */
  get shown(): boolean {
    return this.#shown;
  }

  /** Whether focus is in the field. */
  holdsFocus(): boolean {
    const root = this.#host.renderRoot as ShadowRoot | undefined;
    const active = root ? deepActiveElement(root.ownerDocument) : null;
    return this.#element !== null && active !== null && composedContains(this.#element, active);
  }

  /** Moves focus to the Input while the field shows (Alt+F10). */
  focus(): boolean {
    if (!this.#shown || !this.#input) return false;
    this.#input.focus();
    return this.holdsFocus();
  }

  /** Removes the layer and leaves the Alt+F10 cycle. */
  dispose(): void {
    this.#releaseContextual();
    this.#removeLayer();
    this.hide();
  }

  #visibility(): ImageAltVisibility {
    const host = this.#host;
    const instance = host.instance();
    const state = host.state();
    const access = host.access();
    // A render before the first connection has no render root yet.
    const root = host.renderRoot as ShadowRoot | undefined;
    const active = root ? deepActiveElement(root.ownerDocument) : null;
    const toolbar = host.toolbar();
    return {
      target: imageAltTarget(state.selection, instance?.getBlocks() ?? null),
      ready: instance !== null,
      editable: state.editable && !access.readOnly && !access.disabled,
      focusInside:
        root !== undefined &&
        composedContains(root.host, active) &&
        !(toolbar && composedContains(toolbar, active)),
      dragging: host.dragging(),
      surfaceOpen: host.surfaceOpen(),
    };
  }

  /** The field, rendered inside the overlay part; its draft follows the selected image. */
  render(): TemplateResult {
    const strings = this.#host.strings();
    const visibility = this.#visibility();
    const target = visibility.target;
    if (target?.id !== this.#target?.id || (target && target.alt !== this.#target?.alt))
      this.#draft = target?.alt ?? '';
    this.#target = target;
    const shown = imageAltVisible(visibility);
    if (shown !== this.#shown) {
      this.#shown = shown;
      if (!shown) this.hide();
      this.#host.geometry.invalidate('state');
    }
    return html`<div
      part="text-editor-alt-input"
      class="alt-input"
      role="group"
      aria-label=${strings.imageAlt}
      hidden
      ${ref(this.#bind)}
      @keydown=${this.#keyDown}
    >
      <tp-input-group
        ><tp-input
          size="sm"
          placeholder=${strings.imageAlt}
          .ariaLabel=${strings.imageAlt}
          .value=${this.#draft}
          .onValueChange=${this.#draftChange}
          .inputElementReference=${this.#inputReference}
        ></tp-input
        ><tp-button
          slot="action"
          variant="ghost"
          size="icon-xs"
          .icon=${checkIcon}
          .ariaLabel=${strings.applyAlt}
          @click=${this.#apply}
        ></tp-button
      ></tp-input-group>
    </div>`;
  }

  // Overlay layer -------------------------------------------------------------------------------

  wanted(): boolean {
    return this.#shown && this.#element !== null;
  }

  measure(context: OverlayMeasureContext): ImageAltPlacement | null {
    const element = this.#element;
    const id = this.#target?.id;
    if (!this.#shown || !element || id === undefined || context.source.kind !== 'instance')
      return null;
    const rects = context.source.instance.blockRects(id);
    if (!rects) return null;
    return imageAltPlacement(
      context.toOverlay(rects.content),
      { width: element.offsetWidth, height: element.offsetHeight },
      this.#host.direction() === 'rtl',
    );
  }

  apply(placement: ImageAltPlacement | null): void {
    const element = this.#element;
    if (!element) return;
    if (!placement) {
      this.hide();
      return;
    }
    element.style.setProperty('translate', `${placement.left}px ${placement.top}px`);
    element.style.setProperty('max-inline-size', `${placement.maxWidth}px`);
    if (!this.#placed) {
      this.#placed = true;
      element.hidden = false;
    }
  }

  hide(): void {
    const element = this.#element;
    if (!element || !this.#placed) return;
    this.#placed = false;
    element.hidden = true;
  }

  // Field ---------------------------------------------------------------------------------------

  readonly #bind = (element: Element | undefined): void => {
    const next = (element as HTMLElement | undefined) ?? null;
    if (next === this.#element) return;
    this.#element = next;
    this.#placed = false;
    if (next) this.#host.geometry.invalidate('state');
  };

  // The Input is controlled: a render of the element shows the draft it proposes.
  readonly #draftChange = (event: TpValueChangeEvent<unknown>): void => {
    this.#draft = String(event.detail.value ?? '');
    this.#host.requestUpdate();
  };

  readonly #inputReference = (element: HTMLElement | null): void => {
    this.#input = element;
  };

  /** Enter applies; Escape returns focus to the editing root with the block still selected. */
  readonly #keyDown = (event: KeyboardEvent): void => {
    if (event.isComposing || event.defaultPrevented) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      this.#apply(event);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.#host.focusEditing();
    }
  };

  /** Applies the draft to the selected image, then returns focus to the editing root. */
  readonly #apply = (event: Event): void => {
    const target = this.#target;
    if (!target) return;
    const alt = this.#draft;
    if (alt === target.alt) {
      this.#host.focusEditing();
      return;
    }
    void this.#host
      .request(imageAltProposal(target.id, alt, event))
      .then((outcome) => {
        if (outcome === 'applied') this.#host.focusEditing();
      })
      .catch(() => undefined);
  };
}
