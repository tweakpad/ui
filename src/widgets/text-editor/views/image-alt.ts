/**
 * The alternative text field (`uwg-te-req-surfaces-4`, `uwg-te-tab-anatomy-r16`): an Input with
 * its apply action in the context bar, the slot centered just below the fixed toolbar that the
 * contextual editors of the widget share, for the one uploaded image block that a block selection
 * holds. It shows while the editor is ready and editable and focus is in the widget, takes no
 * focus by itself, applies on Enter or its apply action through `block.set-attrs`, and Escape
 * returns focus to the editing root with the block still selected. Alt+F10 reaches it as a
 * contextual surface; Tab reaches it after the editing root.
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
import type { OverlayInstance } from '../geometry.js';

/** Structure of the alternative text field: a context bar entry (see `textEditorStyles`). */
export const imageAltStyles = css`
  [part~='text-editor-alt-input'][hidden] {
    display: none !important;
  }
`;

export interface ImageAltTarget {
  readonly id: string;
  readonly alt: string;
}

/**
 * The selected image, or `null` for any other selection and for a pending image: the field
 * describes an image that is there, so it shows once the upload resolved the source.
 */
export function imageAltTarget(
  selection: Pick<TextEditorSelection, 'kind'> & { readonly ids?: readonly string[] },
  tree: Pick<TextEditorBlockTree, 'get'> | null,
): ImageAltTarget | null {
  if (selection.kind !== 'blocks' || !tree || selection.ids?.length !== 1) return null;
  const block = tree.get(selection.ids[0]!);
  if (!block || block.kind !== 'image') return null;
  const src = block.attrs['src'];
  if (typeof src !== 'string' || src === '') return null;
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

/** The place of the field in the Alt+F10 cycle: after the selection toolbar. */
export const IMAGE_ALT_ORDER = 0.5;

export interface TextEditorImageAltHost {
  readonly renderRoot: ShadowRoot;
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

/** The alternative text field of one widget, in the context bar under the toolbar. */
export class TextEditorImageAltField {
  readonly #host: TextEditorImageAltHost;
  readonly #releaseContextual: () => void;
  #element: HTMLElement | null = null;
  #input: HTMLElement | null = null;
  #target: ImageAltTarget | null = null;
  #draft = '';
  #shown = false;

  constructor(host: TextEditorImageAltHost) {
    this.#host = host;
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

  /** Leaves the Alt+F10 cycle. */
  dispose(): void {
    this.#releaseContextual();
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

  /** The field, rendered in the context bar; its draft follows the selected image. */
  render(): TemplateResult {
    const strings = this.#host.strings();
    const visibility = this.#visibility();
    const target = visibility.target;
    if (target?.id !== this.#target?.id || (target && target.alt !== this.#target?.alt))
      this.#draft = target?.alt ?? '';
    this.#target = target;
    this.#shown = imageAltVisible(visibility);
    return html`<div
      part="text-editor-alt-input"
      class="context-bar"
      role="group"
      aria-label=${strings.imageAlt}
      ?hidden=${!this.#shown}
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

  // Field ---------------------------------------------------------------------------------------

  readonly #bind = (element: Element | undefined): void => {
    this.#element = (element as HTMLElement | undefined) ?? null;
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
