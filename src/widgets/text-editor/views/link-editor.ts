/**
 * The link editor (`uwg-te-req-surfaces-3`): the URL Input with its apply action and the Buttons
 * that open and remove the link, in the context bar centered just below the fixed toolbar, while
 * the selection lies inside one link. It shows while the editor is ready and editable and focus
 * is in the widget, takes no focus by itself, applies on Enter or its apply action through the
 * link tool, removes through `link.unset`, and Escape returns focus to the editing root. Alt+F10
 * reaches it as a contextual surface; Tab reaches it after the editing root. The link popover,
 * which the link tool opens, hides it while it is open. It enters and leaves through the context
 * bar presence (`TextEditorContextBarPresence`).
 */
import { css, html, type ReactiveControllerHost, type TemplateResult } from 'lit';
import { ref } from 'lit/directives/ref.js';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import { composedContains, deepActiveElement } from '../../../foundation/focus.js';
import type {
  TextEditorAccess,
  TextEditorRequestOutcome,
  TextEditorRequestProposal,
} from '../../../foundation/text-editor/controller.js';
import type {
  TextEditorEngineState,
  TextEditorLinkState,
} from '../../../foundation/text-editor/model.js';
import type { TextEditorStrings } from '../../../foundation/text-editor/strings.js';
import { checkIcon } from '../../../icons/check.js';
import { externalLinkIcon } from '../../../icons/external-link.js';
import { unlinkIcon } from '../../../icons/link.js';
import type { TextEditorContextualSurface } from '../focus.js';
import { TextEditorContextBarPresence } from './context-bar.js';
import { linkApplyDecision, linkApplyProposal, linkRemoveProposal } from './link-popover.js';
import type { BlockBand } from './selection-anchor.js';

/** Structure of the link editor: a context bar entry (see `textEditorStyles`). */
export const linkEditorStyles = css`
  [part~='text-editor-link-editor'][hidden] {
    display: none !important;
  }
`;

/** The place of the editor in the Alt+F10 cycle: after the selection toolbar. */
export const LINK_EDITOR_ORDER = 0.5;

export interface LinkEditorVisibility {
  /** The link at the selection, or null. */
  readonly link: TextEditorLinkState | null;
  readonly ready: boolean;
  readonly editable: boolean;
  /** Focus is in the widget, outside the fixed toolbar. */
  readonly focusInside: boolean;
  readonly dragging: boolean;
  /** A suggestion list, a popover or a menu of a grip, the cell handle or the gutter is open. */
  readonly surfaceOpen: boolean;
}

/** Whether the editor shows (`uwg-te-req-surfaces-3`). */
export function linkEditorVisible(input: LinkEditorVisibility): boolean {
  return (
    input.link !== null &&
    input.ready &&
    input.editable &&
    input.focusInside &&
    !input.dragging &&
    !input.surfaceOpen
  );
}

/** Whether two link states name the same link: the same destination over the same range. */
export function sameLink(a: TextEditorLinkState | null, b: TextEditorLinkState | null): boolean {
  if (a === b) return true;
  if (!a || !b || a.href !== b.href) return false;
  return (
    a.range.block === b.range.block &&
    a.range.from === b.range.from &&
    a.range.to === b.range.to &&
    a.range.cell?.row === b.range.cell?.row &&
    a.range.cell?.column === b.range.cell?.column
  );
}

export interface TextEditorLinkEditorHost {
  /** The widget: the owner of the context bar motion role and the host of the presence. */
  readonly element: HTMLElement & ReactiveControllerHost;
  readonly renderRoot: ShadowRoot;
  /** Re-renders the element. */
  requestUpdate(): void;
  strings(): TextEditorStrings;
  /** The editor is ready. */
  ready(): boolean;
  state(): TextEditorEngineState;
  /** The link at the selection now. */
  link(): TextEditorLinkState | null;
  access(): TextEditorAccess;
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

/** The link editor of one widget, in the context bar under the toolbar. */
export class TextEditorLinkEditor {
  readonly #host: TextEditorLinkEditorHost;
  readonly #releaseContextual: () => void;
  readonly #presence: TextEditorContextBarPresence;
  #element: HTMLElement | null = null;
  #input: HTMLElement | null = null;
  #link: TextEditorLinkState | null = null;
  #draft = '';
  #invalid = false;
  #shown = false;

  constructor(host: TextEditorLinkEditorHost) {
    this.#host = host;
    this.#presence = new TextEditorContextBarPresence(
      { element: host.element, surface: () => this.#element },
      'link',
    );
    this.#releaseContextual = host.registerContextual({
      order: LINK_EDITOR_ORDER,
      applicable: () => this.#shown,
      enter: () => this.focus(),
      holdsFocus: () => this.holdsFocus(),
    });
  }

  /** Whether the editor shows. */
  get shown(): boolean {
    return this.#shown;
  }

  /** Whether focus is in the editor. */
  holdsFocus(): boolean {
    const root = this.#host.renderRoot as ShadowRoot | undefined;
    const active = root ? deepActiveElement(root.ownerDocument) : null;
    return this.#element !== null && active !== null && composedContains(this.#element, active);
  }

  /** Moves focus to the Input while the editor shows (Alt+F10). */
  focus(): boolean {
    if (!this.#shown || !this.#input) return false;
    this.#input.focus();
    return this.holdsFocus();
  }

  /** After the widget rendered: drives the entrance or the exit of the editor. */
  updated(): void {
    this.#presence.updated();
  }

  /** Leaves the Alt+F10 cycle and the widget. */
  dispose(): void {
    this.#releaseContextual();
    this.#presence.dispose();
  }

  /** The band the editor covers, in client coordinates, while it renders; null otherwise. */
  band(): BlockBand | null {
    const element = this.#element;
    if (!this.#presence.mounted || !element) return null;
    const box = element.getBoundingClientRect();
    return { top: box.top, bottom: box.bottom };
  }

  #visibility(): LinkEditorVisibility {
    const host = this.#host;
    const state = host.state();
    const access = host.access();
    const root = host.renderRoot as ShadowRoot | undefined;
    const active = root ? deepActiveElement(root.ownerDocument) : null;
    const toolbar = host.toolbar();
    return {
      link: host.link(),
      ready: host.ready(),
      editable: state.editable && !access.readOnly && !access.disabled,
      focusInside:
        root !== undefined &&
        composedContains(root.host, active) &&
        !(toolbar && composedContains(toolbar, active)),
      dragging: host.dragging(),
      surfaceOpen: host.surfaceOpen(),
    };
  }

  /** The editor, rendered in the context bar; its draft follows the link at the selection. */
  render(): TemplateResult {
    const strings = this.#host.strings();
    const visibility = this.#visibility();
    const link = visibility.link;
    if (!sameLink(link, this.#link)) {
      this.#draft = link?.href ?? '';
      this.#invalid = false;
    }
    this.#link = link;
    this.#shown = linkEditorVisible(visibility);
    this.#presence.set(this.#shown);
    return html`<div
      part="text-editor-link-editor"
      class="context-bar"
      role="group"
      aria-label=${strings.link}
      ?hidden=${!this.#presence.mounted}
      data-starting-style=${this.#presence.starting}
      data-ending-style=${this.#presence.ending}
      ${ref(this.#bind)}
      @keydown=${this.#keyDown}
    >
      <div class="link-editor">
        <!-- The Field owns the URL's validity, from the link policy rather than the url type's own check. -->
        <tp-field .invalid=${this.#invalid}
          ><tp-input-group .invalid=${this.#invalid}
            ><tp-input
              type="url"
              size="sm"
              placeholder=${strings.linkPlaceholder}
              .ariaLabel=${strings.link}
              .value=${this.#draft}
              .invalid=${this.#invalid}
              .onValueChange=${this.#draftChange}
              .inputElementReference=${this.#inputReference}
            ></tp-input
            ><tp-button
              slot="action"
              variant="ghost"
              size="icon-xs"
              .icon=${checkIcon}
              .ariaLabel=${strings.applyLink}
              @click=${this.#apply}
            ></tp-button></tp-input-group
        ></tp-field>
        <tp-button
          variant="ghost"
          size="icon-xs"
          .icon=${externalLinkIcon}
          .ariaLabel=${strings.openLink}
          .href=${link?.href ?? null}
          target="_blank"
          rel="noopener"
          .disabled=${!link}
        ></tp-button>
        <tp-button
          variant="ghost"
          size="icon-xs"
          .icon=${unlinkIcon}
          .ariaLabel=${strings.removeLink}
          .disabled=${!link}
          @click=${this.#remove}
        ></tp-button>
      </div>
    </div>`;
  }

  readonly #bind = (element: Element | undefined): void => {
    this.#element = (element as HTMLElement | undefined) ?? null;
  };

  // The Input is controlled: a render of the element shows the draft it proposes.
  readonly #draftChange = (event: TpValueChangeEvent<unknown>): void => {
    this.#draft = String(event.detail.value ?? '');
    this.#invalid = false;
    this.#host.requestUpdate();
  };

  readonly #inputReference = (element: HTMLElement | null): void => {
    this.#input = element;
  };

  /** Enter applies; Escape returns focus to the editing root with its selection. */
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

  /**
   * Applies the draft to the link at the selection through the link tool, then returns focus to
   * the editing root; an empty draft removes the link, a destination outside the link policy
   * marks the Input invalid.
   */
  readonly #apply = (event: Event): void => {
    const link = this.#link;
    if (!link) return;
    const decision = linkApplyDecision(this.#draft);
    if (decision.kind === 'empty') {
      this.#remove(event);
      return;
    }
    if (decision.kind === 'invalid') {
      this.#invalid = true;
      this.#host.requestUpdate();
      return;
    }
    if (decision.href === link.href) {
      this.#host.focusEditing();
      return;
    }
    void this.#host
      .request(linkApplyProposal(decision.href, 'content', event))
      .then((outcome) => {
        if (outcome === 'applied') this.#host.focusEditing();
      })
      .catch(() => undefined);
  };

  /** Removes the link at the selection, then returns focus to the editing root. */
  readonly #remove = (event: Event): void => {
    const link = this.#link;
    if (!link) return;
    void this.#host
      .request(linkRemoveProposal(link.range, 'content', event))
      .then((outcome) => {
        if (outcome === 'applied') this.#host.focusEditing();
      })
      .catch(() => undefined);
  };
}
