import { css, html, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import type { MapState } from '../../foundation/map/state.js';
import { homeIcon, scanIcon } from '../../icons/map.js';
import { minusIcon } from '../../icons/minus.js';
import { plusIcon } from '../../icons/plus.js';
import type { IconDefinition } from '../../icons/types.js';
import { TpButton } from '../button.js';
import { TpIcon } from '../icon.js';
import { TpMapElement, type MapMessages } from './context.js';

export type MapControlAction = 'zoom-in' | 'zoom-out' | 'reset' | 'fit-pins';

const ACTIONS: Record<MapControlAction, { icon: IconDefinition; message: keyof MapMessages }> = {
  'zoom-in': { icon: plusIcon, message: 'zoomIn' },
  'zoom-out': { icon: minusIcon, message: 'zoomOut' },
  reset: { icon: homeIcon, message: 'reset' },
  'fit-pins': { icon: scanIcon, message: 'fitPins' },
};

/**
 * A map action control (`ucl21-map` Control; behavior `sec-1812-map` map-f-controls). Place it
 * inside `tp-map` or anywhere with `map="id"`. Composes Button and Icon; it stays focusable and
 * reports `aria-disabled` while the map is missing, disabled or not ready, and at a zoom limit.
 *
 * @slot - Replaces the default icon.
 * @csspart button - The composed Button's native control.
 * @csspart icon - The default icon.
 */
export class TpMapControl extends TpMapElement {
  static tagName = 'tp-map-control';
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpButton, TpIcon];
  }
  static override properties = {
    ...TpMapElement.properties,
    action: { type: String, reflect: true },
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

  /** The bound action. */
  action: MapControlAction = 'zoom-in';
  /** Overrides the action message as the accessible name. */
  label = '';
  /** Forwarded to the composed Button. */
  variant: TpButton['variant'] = 'outline';
  /** Forwarded to the composed Button. */
  size: TpButton['size'] = 'icon';

  get accessibleLabel(): string {
    const definition = ACTIONS[this.action] ?? ACTIONS['zoom-in'];
    return this.label || this.messages[definition.message];
  }

  /** Whether activation would act now. */
  get available(): boolean {
    const map = this.owner;
    const state = this.mapState;
    if (!map || map.disabled || this.disabled || state.status !== 'ready') return false;
    if (this.action === 'zoom-in') return state.canZoomIn;
    if (this.action === 'zoom-out') return state.canZoomOut;
    if (this.action === 'fit-pins') return state.pinCount > 0;
    return true;
  }

  /** The composed Button, so a Button group joins this control's seams. */
  get groupBoundary(): Element | null {
    return this.renderRoot?.querySelector('tp-button') ?? null;
  }

  override focus(options?: FocusOptions): void {
    const button = this.renderRoot.querySelector<HTMLElement>('tp-button');
    if (button) button.focus(options);
    else super.focus(options);
  }

  protected override selectState(state: MapState): unknown {
    return [state.status, state.canZoomIn, state.canZoomOut, state.pinCount];
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.toggleAttribute('data-disabled', !this.available);
    this.dataset.action = this.action;
  }

  protected override render() {
    const definition = ACTIONS[this.action] ?? ACTIONS['zoom-in'];
    return html`<tp-button
      exportparts="button"
      .variant=${this.variant}
      .size=${this.size}
      .focusableWhenDisabled=${true}
      .disabled=${!this.available}
      .ariaLabel=${this.accessibleLabel}
      @click=${this.#click}
      ><slot slot="icon-start"><tp-icon part="icon" .icon=${definition.icon}></tp-icon></slot
    ></tp-button>`;
  }

  #click = (event: MouseEvent): void => {
    const map = this.owner;
    if (!map || !this.available) return;
    const options = { reason: 'trigger-press' as const, sourceEvent: event, trigger: this };
    const request =
      this.action === 'zoom-in'
        ? map.request('zoom-in', undefined, options)
        : this.action === 'zoom-out'
          ? map.request('zoom-out', undefined, options)
          : this.action === 'reset'
            ? map.request('reset', undefined, options)
            : map.request('fit-pins', undefined, options);
    void request.catch(() => undefined);
  };
}
