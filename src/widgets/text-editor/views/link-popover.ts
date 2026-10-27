/**
 * The link popover (`uwg-te-req-surfaces-3`, `uwg-te-tab-anatomy-r14`): a state-driven Popover
 * without a Trigger, anchored to the link at the selection or to the selection, holding the URL
 * Input with its apply action and the Buttons that open and remove the link. It opens from the
 * link tool and Mod+K, prefilled with the link at the selection, never by itself; closing with
 * focus inside returns focus to the editing root with its selection through the adapter.
 */
import { html, type TemplateResult } from 'lit';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import { allowedUrl, linkProtocols } from '../../../foundation/markdown/url.js';
import type { VirtualAnchor } from '../../../foundation/positioning.js';
import type { TpSurfaceOpenChangeEvent } from '../../../foundation/surface-state.js';
import type {
  TextEditorRequestOutcome,
  TextEditorRequestProposal,
} from '../../../foundation/text-editor/controller.js';
import type {
  TextEditorLinkState,
  TextEditorTextRange,
} from '../../../foundation/text-editor/model.js';
import type { TextEditorStrings } from '../../../foundation/text-editor/strings.js';
import type { TextEditorRequestSurface } from '../../../foundation/text-editor/tools.js';
import type { ChangeReason } from '../../../foundation/types.js';
import { checkIcon } from '../../../icons/check.js';
import { externalLinkIcon } from '../../../icons/external-link.js';
import { unlinkIcon } from '../../../icons/link.js';
import { selectionAnchor } from './selection-anchor.js';

/** What applying a URL does: nothing for an empty URL, an invalid mark, or one `link.set`. */
export type LinkApplyDecision =
  | { readonly kind: 'empty' }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'apply'; readonly href: string };

/** Whether a URL applies under the link policy (`uwg-te-req-surfaces-3`). */
export function linkApplyDecision(
  url: string,
  protocols: readonly string[] = linkProtocols(null),
): LinkApplyDecision {
  const href = url.trim();
  if (!href) return { kind: 'empty' };
  return allowedUrl(href, protocols) ? { kind: 'apply', href } : { kind: 'invalid' };
}

/**
 * The request that applies a link: the link tool with `{ href }`, reason `item-press`. It moves no
 * focus: the popover closes with `item-press` once it applied and returns focus to the editing
 * root itself, so focus leaving it first does not close it as `focus-outside`.
 */
export function linkApplyProposal(
  href: string,
  surface: TextEditorRequestSurface,
  sourceEvent: Event | undefined,
): TextEditorRequestProposal {
  return {
    target: 'link',
    value: { href },
    surface,
    reason: 'item-press',
    sourceEvent,
    trigger: null,
    focus: false,
  };
}

/**
 * The request that removes the link at the selection (`link.unset`, reason `item-press`); like
 * Apply, it leaves focus to the popover's closing.
 */
export function linkRemoveProposal(
  range: TextEditorTextRange | undefined,
  surface: TextEditorRequestSurface,
  sourceEvent: Event | undefined,
): TextEditorRequestProposal {
  return {
    target: [{ type: 'link.unset', ...(range ? { range } : {}) }],
    surface,
    reason: 'item-press',
    sourceEvent,
    trigger: null,
    focus: false,
  };
}

/**
 * Whether a close of a popover returns focus to the editing root: not when focus already left
 * the widget, and not for a press in the editing root, which keeps the caret it placed.
 */
export function popoverCloseRefocuses(
  reason: string | undefined,
  sourceEvent: Event | undefined,
  content: Element | null,
): boolean {
  if (reason === 'focus-outside') return false;
  if (reason === 'outside-press' && content && sourceEvent?.composedPath().includes(content))
    return false;
  return true;
}

export interface TextEditorLinkPopoverHost {
  /** Re-renders the element. */
  requestUpdate(): void;
  strings(): TextEditorStrings;
  /** The link at the selection now. */
  link(): TextEditorLinkState | null;
  /** The client rectangles of a range, of the selection and of the caret, while ready. */
  rangeRects(range: TextEditorTextRange): readonly DOMRectReadOnly[];
  selectionRects(): readonly DOMRectReadOnly[];
  caretRect(): DOMRectReadOnly | null;
  content(): HTMLElement | null;
  request(proposal: TextEditorRequestProposal): Promise<TextEditorRequestOutcome>;
  /** Returns focus to the editing root with its selection, through the adapter. */
  focusEditing(): void;
  /** This surface opens, for `reason`: close the other transient surfaces with it. */
  opening(reason?: ChangeReason): void;
  /** A change of the open lane with its reason (`uwg-te-tab-reasons` r12, r13). */
  lane?(open: boolean, reason: ChangeReason): void;
}

/** The link popover of one widget. */
export class TextEditorLinkPopover {
  readonly #host: TextEditorLinkPopoverHost;
  readonly #anchor: VirtualAnchor;
  #open = false;
  #draft = '';
  #invalid = false;
  #surface: TextEditorRequestSurface = 'api';
  #link: TextEditorLinkState | null = null;
  #closing: { reason: string | undefined; event: Event | undefined } | null = null;
  #input: HTMLElement | null = null;

  constructor(host: TextEditorLinkPopoverHost) {
    this.#host = host;
    this.#anchor = selectionAnchor(
      () => {
        const link = this.#link;
        const rects = link ? host.rangeRects(link.range) : host.selectionRects();
        if (rects.length) return rects;
        const caret = host.caretRect();
        return caret ? [caret] : [];
      },
      () => host.content(),
    );
  }

  get isOpen(): boolean {
    return this.#open;
  }

  /**
   * Opens, prefilled with the link at the selection, for requests of `surface`; `reason` is the
   * opening's (a control's `trigger-press`, Mod+K's `hotkey`, a run's `imperative-action`).
   */
  open(surface: TextEditorRequestSurface, reason: ChangeReason = 'imperative-action'): void {
    this.#host.opening(reason);
    this.#link = this.#host.link();
    this.#draft = this.#link?.href ?? '';
    this.#invalid = false;
    this.#surface = surface;
    this.#closing = null;
    const opened = !this.#open;
    this.#open = true;
    if (opened) this.#host.lane?.(true, reason);
    this.#host.requestUpdate();
  }

  /**
   * Closes; `reason` and `event` decide where focus returns, and the lane records the reason
   * (`programmatic` without one).
   */
  close(reason?: ChangeReason, event?: Event): void {
    if (!this.#open) return;
    this.#closing = { reason, event };
    this.#open = false;
    this.#host.lane?.(false, reason ?? 'programmatic');
    this.#host.requestUpdate();
  }

  render(): TemplateResult {
    const strings = this.#host.strings();
    const link = this.#open ? this.#link : null;
    // The Field owns the URL's validity, from the link policy rather than the url type's own check.
    return html`<tp-popover
      part="text-editor-link-popover"
      label=${strings.link}
      side="block-end"
      align="start"
      .portal=${false}
      .modal=${false}
      .open=${this.#open}
      .anchor=${this.#anchor}
      .initialFocus=${this.#initialFocus}
      .finalFocus=${this.#finalFocus}
      @tp-open-change=${this.#openChange}
      ><div class="link-popover">
        <tp-field .invalid=${this.#invalid}
          ><tp-input-group .invalid=${this.#invalid}
            ><tp-input
              type="url"
              label=${strings.link}
              placeholder=${strings.linkPlaceholder}
              .value=${this.#draft}
              .invalid=${this.#invalid}
              .onValueChange=${this.#draftChange}
              .inputElementReference=${this.#inputReference}
              @keydown=${this.#keyDown}
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
          size="icon-sm"
          .icon=${externalLinkIcon}
          .ariaLabel=${strings.openLink}
          .href=${link?.href ?? null}
          target="_blank"
          rel="noopener"
          .disabled=${!link}
        ></tp-button>
        <tp-button
          variant="ghost"
          size="icon-sm"
          .icon=${unlinkIcon}
          .ariaLabel=${strings.removeLink}
          .disabled=${!link}
          @click=${this.#remove}
        ></tp-button></div
    ></tp-popover>`;
  }

  /**
   * The popover's input, else its first focusable; one stable reference, so that a render of the
   * element leaves the closed popover as it is.
   */
  readonly #initialFocus = (): HTMLElement | boolean => this.#input ?? true;

  // Stable callbacks: a new function in the input's property would update it on every render.
  readonly #draftChange = (event: TpValueChangeEvent<unknown>): void => {
    this.#draft = String(event.detail.value ?? '');
    this.#invalid = false;
    this.#host.requestUpdate();
  };

  readonly #inputReference = (element: HTMLElement | null): void => {
    this.#input = element;
  };

  readonly #finalFocus = (): boolean => {
    const closing = this.#closing;
    this.#closing = null;
    if (popoverCloseRefocuses(closing?.reason, closing?.event, this.#host.content()))
      this.#host.focusEditing();
    return false;
  };

  readonly #openChange = (event: TpSurfaceOpenChangeEvent): void => {
    if (event.target !== event.currentTarget) return;
    event.stopPropagation();
    if (!event.detail.value) this.close(event.detail.reason, event.detail.sourceEvent);
  };

  readonly #keyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' || event.isComposing || event.defaultPrevented) return;
    event.preventDefault();
    this.#apply(event);
  };

  readonly #apply = (event: Event): void => {
    const decision = linkApplyDecision(this.#draft);
    if (decision.kind === 'empty') return;
    if (decision.kind === 'invalid') {
      this.#invalid = true;
      this.#host.requestUpdate();
      return;
    }
    void this.#host
      .request(linkApplyProposal(decision.href, this.#surface, event))
      .then((outcome) => {
        if (outcome === 'applied') this.close('item-press', event);
      })
      .catch(() => undefined);
  };

  readonly #remove = (event: Event): void => {
    const link = this.#link;
    if (!link) return;
    void this.#host
      .request(linkRemoveProposal(link.range, this.#surface, event))
      .then((outcome) => {
        if (outcome === 'applied') this.close('item-press', event);
      })
      .catch(() => undefined);
  };
}
