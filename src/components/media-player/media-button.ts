import { css, html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import type { MediaRequestAction, MediaRequestOptions } from '../../foundation/media/requests.js';
import type { MediaState } from '../../foundation/media/state.js';
import { mediaIcons } from '../../icons/media.js';

import type {
  MediaButtonContext,
  MediaButtonIcon,
  MediaButtonView,
  MediaMarkers,
} from './button-state.js';
import { TpMediaElement, type MediaPlayerApi } from './context.js';
import { TpButton } from '../button/button.js';
import { TpIcon } from '../icon/icon.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';

export type MediaButtonVariant = TpButton['variant'];
export type MediaButtonSize = TpButton['size'];

/** Sends a request with a runtime action/value pair through `TpMediaElement.request`. */
type LooseRequest = (
  action: MediaRequestAction,
  value: unknown,
  options: MediaRequestOptions,
) => Promise<unknown>;

/** Writes host markers; `previous` lists names set last time so stale ones are removed. */
export function applyMediaMarkers(
  host: HTMLElement,
  markers: MediaMarkers,
  previous: ReadonlySet<string>,
): Set<string> {
  const names = new Set(Object.keys(markers));
  for (const name of previous) if (!names.has(name)) host.removeAttribute(name);
  for (const [name, value] of Object.entries(markers)) {
    if (value === true) host.setAttribute(name, '');
    else if (value === false || value === null) host.removeAttribute(name);
    else host.setAttribute(name, value);
  }
  return names;
}

const ATTACH_EVENTS = ['tp-media-attach', 'tp-media-detach'] as const;

/**
 * Shared media button (Library mp-l-buttons). Composes `tp-button` (`variant="ghost"`,
 * `size="icon"`, `focusable-when-disabled`) and `tp-icon`:
 *
 * - The accessible name is the state-dependent label (`aria-label` on the native control); no
 *   button uses `aria-pressed`. `label` replaces the message for every state.
 * - `aria-keyshortcuts` comes from the player's published key binding for the button's action and
 *   is passed through the Button `button` part contract.
 * - Each state's icon renders inside a named slot (for example `<svg slot="pause">`), falling back
 *   to the library media artwork.
 * - Unavailable or disabled controls stay focusable with `aria-disabled`; unsupported (or empty
 *   list) controls are `hidden` (`data-availability`, `data-disabled`, `data-hidden`).
 * - Activation issues the view's request with reason `trigger-press` and the click as
 *   `sourceEvent`. A rejected request already emitted `tp-media-request-failed` and is swallowed.
 *
 * @csspart button - The native control of the composed Button.
 * @csspart icon - The fallback state icon (`tp-icon`).
 * @csspart text - Visible text of text-bearing buttons (playback rate, live).
 */
export abstract class TpMediaButtonElement extends TpMediaElement {
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpButton, TpIcon];
  }
  static override properties: PropertyDeclarations = {
    ...TpMediaElement.properties,
    label: { type: String },
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
  };

  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-flex;
        vertical-align: middle;
        flex: none;
      }

      /* The composed Button paints the unavailable state; the host is not dimmed twice. */
      :host([data-disabled]) {
        cursor: auto;
        opacity: 1;
      }

      [part~='mark'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: inherit;
      }

      ::slotted(svg),
      ::slotted(img) {
        display: block;
        inline-size: var(--tp-icon-size-md);
        block-size: var(--tp-icon-size-md);
      }

      @media (pointer: coarse) {
        tp-button::part(button) {
          min-inline-size: var(--tp-target-size-min);
          min-block-size: var(--tp-target-size-min);
        }
      }
    `,
  ];

  /** Overrides the state-dependent accessible name for every state. */
  label = '';
  /** Forwarded to the composed Button. */
  variant: MediaButtonVariant = 'ghost';
  /** Forwarded to the composed Button. */
  size: MediaButtonSize = 'icon';

  #view: MediaButtonView | undefined;
  #markers = new Set<string>();
  #observed: { player: MediaPlayerApi; release: () => void } | undefined;

  /** The current view (label, icon, markers, request). */
  get view(): MediaButtonView | undefined {
    return this.#view;
  }

  /** The resolved accessible name. */
  get accessibleLabel(): string {
    return this.label || this.#view?.label || '';
  }

  /** Computes the view for the current state. */
  protected abstract computeView(state: MediaState, context: MediaButtonContext): MediaButtonView;

  /** Whether a Menu that uses this button as its trigger replaces the button's own action. */
  protected get opensMenuWhenTrigger(): boolean {
    return false;
  }

  protected get buttonContext(): MediaButtonContext {
    const player = this.player;
    return {
      messages: this.mediaMessages,
      locale: this.mediaLocale,
      capability: (action) => player?.requestAvailability(action) ?? 'unavailable',
    };
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observed?.release();
    this.#observed = undefined;
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    this.#observeAttach();
    const view = (this.#view = this.computeView(this.mediaState, this.buttonContext));
    this.controlAvailability(view.feature, view.policy);
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    if (this.#view) this.#markers = applyMediaMarkers(this, this.#view.markers, this.#markers);
  }

  /** Focus goes to the composed Button's control (Menu focus return, tooltips, hotkeys). */
  override focus(options?: FocusOptions): void {
    const button = this.renderRoot.querySelector<HTMLElement>('tp-button');
    if (button) button.focus(options);
    else super.focus(options);
  }

  override blur(): void {
    const button = this.renderRoot.querySelector<HTMLElement>('tp-button');
    if (button) button.blur();
    else super.blur();
  }

  protected override render() {
    const view = this.#view;
    const availability = this.availability;
    const shortcut = view?.shortcut
      ? this.shortcut(view.shortcut.action, view.shortcut.value)?.aria
      : undefined;
    const contracts = {
      ...this.partContracts,
      button: {
        ...this.partContracts['button'],
        hostProperties: {
          ...this.partContracts['button']?.hostProperties,
          'aria-keyshortcuts': shortcut || null,
        },
      },
    };
    return html`<tp-button
      exportparts="button"
      ?data-media-text=${Boolean(view?.text)}
      .variant=${this.variant}
      .size=${this.size}
      .focusableWhenDisabled=${true}
      .disabled=${availability?.disabled ?? true}
      .ariaLabel=${this.accessibleLabel}
      .partContracts=${contracts}
      @click=${this.#click}
      ><span part="mark" slot="icon-start"
        >${view?.icon ? this.renderIcon(view.icon) : nothing}${
          view?.text ? html`<span part="text">${view.text}</span>` : nothing
        }</span
      ></tp-button
    >`;
  }

  /** The named-slot chain for one state icon over its fallback artwork. */
  protected renderIcon(icon: MediaButtonIcon): unknown {
    const names = [icon.slot, ...(icon.fallbackSlots ?? [])];
    return names.reduceRight<unknown>(
      (inner, name) => html`<slot name=${name}>${inner}</slot>`,
      html`<tp-icon part="icon" .icon=${mediaIcons[icon.name]}></tp-icon>`,
    );
  }

  /** Whether the click should not run the button's own action. */
  protected skipActivation(event: MouseEvent): boolean {
    void event;
    return false;
  }

  /** Runs the view's request (override for extra behavior). */
  protected activate(event: MouseEvent): Promise<unknown> {
    const request = this.#view?.request;
    if (!request) return Promise.resolve(undefined);
    return this.sendRequest(request.action, request.value, event);
  }

  /** `request()` with reason `trigger-press`; failures were already reported by the player. */
  protected sendRequest(
    action: MediaRequestAction,
    value: unknown,
    event: Event,
  ): Promise<unknown> {
    const request = this.request as unknown as LooseRequest;
    return request
      .call(this, action, value, { reason: 'trigger-press', sourceEvent: event })
      .catch(() => undefined);
  }

  /**
   * Whether a Menu currently uses this button as its trigger: the Menu writes
   * `aria-haspopup="menu"` on the trigger's semantic control (the composed Button's native
   * control), or on the host when no semantic control was resolved.
   */
  protected isMenuTrigger(): boolean {
    const button = this.renderRoot.querySelector('tp-button');
    const control = button?.shadowRoot?.querySelector('[part~="button"]');
    return [this, button, control].some(
      (element) => element?.getAttribute('aria-haspopup') === 'menu',
    );
  }

  #click = (event: MouseEvent): void => {
    if (event.defaultPrevented || componentHandlingPrevented(event)) return;
    const availability = this.availability;
    if (!availability || availability.disabled || availability.hidden) return;
    // Menu-trigger mode (mp-l-menu-trigger): the Menu opens; the button does not act.
    if (this.opensMenuWhenTrigger && this.isMenuTrigger()) return;
    if (this.skipActivation(event)) return;
    void this.activate(event);
  };

  /** Attach and detach change capability without necessarily changing state. */
  #observeAttach(): void {
    const player = this.player;
    if (this.#observed?.player === player) return;
    this.#observed?.release();
    this.#observed = undefined;
    const target = player as unknown as EventTarget | null;
    if (!player || !target || typeof target.addEventListener !== 'function') return;
    const update = () => this.requestUpdate();
    for (const type of ATTACH_EVENTS) target.addEventListener(type, update);
    this.#observed = {
      player,
      release: () => {
        for (const type of ATTACH_EVENTS) target.removeEventListener(type, update);
      },
    };
  }
}
