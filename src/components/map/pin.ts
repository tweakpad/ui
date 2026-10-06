import { css, html, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { normalizePosition, type MapPosition } from '../../foundation/map/geo.js';
import type { MapState } from '../../foundation/map/state.js';
import { TpMapElement, type MapApi, type MapPinRecord } from './context.js';
import { TpMapOverlay } from './overlay.js';

export type MapPinAnchor = 'bottom' | 'center';

/**
 * A positioned, selectable map pin (`ucl21-map` Pin; behavior `sec-1812-map` map-f-pins,
 * map-f-pin-keyboard, map-f-pin-semantics).
 *
 * Authored default-slot content (for example an inline SVG) is the pin's visual; it stays the
 * consumer's DOM and inherits `color` from the pin. Without content the default marker renders.
 * A child `tp-map-overlay` opens anchored to the pin while it is selected.
 *
 * @slot - The pin visual. Defaults to the marker graphic.
 * @csspart pin - The focusable button placed at the position.
 * @csspart pin-visual - The default marker graphic.
 */
export class TpMapPin extends TpMapElement implements MapPinRecord {
  static tagName = 'tp-map-pin';
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpMapOverlay];
  }
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', slotAssignment: 'manual' };
  static override properties = {
    ...TpMapElement.properties,
    value: { type: String, reflect: true },
    latitude: { type: Number },
    longitude: { type: Number },
    label: { type: String },
    anchor: { type: String, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        position: absolute;
        inset-block-start: 0;
        inset-inline-start: 0;
        display: block;
        inline-size: 0;
        block-size: 0;
      }

      [part~='pin'] {
        position: absolute;
        inset-block-start: 0;
        left: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        translate: -50% -100%;
        transform-origin: 50% 100%;
        outline: none;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
      }

      :host([anchor='center']) [part~='pin'] {
        translate: -50% -50%;
        transform-origin: 50% 50%;
      }

      [part~='pin-visual'] {
        position: relative;
        display: block;
        inline-size: 1.75rem;
        block-size: 1.75rem;
        border-radius: 50% 50% 50% 0;
        rotate: -45deg;

        /* The rotated tip extends 0.207 of the size below the box: keep it on the anchor. */
        margin-block-end: calc(1.75rem * 0.207);
      }

      :host([anchor='center']) [part~='pin-visual'] {
        border-radius: 50%;
        rotate: none;
        margin: 0;
        inline-size: 1.25rem;
        block-size: 1.25rem;
      }

      [part~='pin-visual']::after {
        content: '';
        position: absolute;
        inset: 30%;
        border-radius: 50%;
      }

      ::slotted(svg),
      ::slotted(img) {
        display: block;
      }
    `,
  ];

  /** Identity within the map (required, unique). */
  value = '';
  /** Decimal degrees (required). */
  latitude = Number.NaN;
  /** Decimal degrees (required). */
  longitude = Number.NaN;
  /** Accessible name (required). */
  label = '';
  /** Which point of the visual sits on the position. */
  anchor: MapPinAnchor = 'bottom';

  #release: (() => void) | undefined;
  #registered: (HTMLElement & MapApi) | null = null;
  #children: MutationObserver | undefined;
  #labelDiagnosed = false;
  #settled = false;

  get position(): MapPosition | null {
    const { latitude, longitude } = this;
    return Number.isFinite(latitude) && Number.isFinite(longitude)
      ? normalizePosition({ latitude, longitude })
      : null;
  }

  get pinDisabled(): boolean {
    return this.disabled || Boolean(this.owner?.disabled);
  }

  get accessibleLabel(): string {
    return this.label.trim() || this.messages.pin;
  }

  /** Whether this pin is the map's effective selection. */
  get selected(): boolean {
    return this.#registered?.isPinSelected(this) ?? false;
  }

  /** The focusable button (overlay anchor). */
  get control(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>("[part~='pin']") ?? null;
  }

  /** The child overlay, if any. */
  get overlay(): TpMapOverlay | null {
    return (
      ([...this.children].find((child) => child instanceof TpMapOverlay) as TpMapOverlay) ?? null
    );
  }

  override focus(options?: FocusOptions): void {
    const control = this.control;
    if (control) control.focus(options);
    else super.focus(options);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    const view = this.ownerDocument.defaultView;
    this.#children = view ? new view.MutationObserver(() => this.#assign()) : undefined;
    this.#children?.observe(this, { childList: true });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#children?.disconnect();
  }

  protected override bindOwner(owner: (HTMLElement & MapApi) | null): void {
    // Pins are projected by their map, so only a direct child can register.
    const map = owner && this.parentElement === owner ? owner : null;
    if (owner && !map)
      this.emit('tp-diagnostic', {
        code: 'map-pin-parent',
        message: 'tp-map-pin must be a direct child of its tp-map.',
      });
    if (map !== this.#registered) {
      this.#release?.();
      this.#release = undefined;
      this.#registered = map;
      if (map) this.#release = map.registerPin(this);
    }
    super.bindOwner(owner);
  }

  protected override selectState(state: MapState): unknown {
    return [state.status, state.selectedPin];
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    // Registration already read the initial values; later changes re-place the pin.
    if (
      this.#settled &&
      (['value', 'latitude', 'longitude', 'disabled'] as const).some((key) => changed.has(key))
    )
      this.#registered?.pinChanged(this);
    this.#settled = true;
    if (!this.label.trim() && !this.#labelDiagnosed) {
      this.#labelDiagnosed = true;
      this.emit('tp-diagnostic', {
        code: 'map-pin-label',
        message: `Map pin "${this.value}" has no label; its accessible name falls back to "${this.accessibleLabel}".`,
      });
    }
    const selected = this.selected;
    this.toggleAttribute('data-selected', selected);
    this.toggleAttribute('data-disabled', this.pinDisabled);
    const overlay = this.overlay;
    overlay?.syncFromPin(this, selected);
    const control = this.control;
    if (control)
      (control as HTMLElement & { ariaControlsElements: Element[] | null }).ariaControlsElements =
        selected && overlay ? [overlay] : null;
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed);
    this.#assign();
  }

  protected override render() {
    const map = this.#registered;
    const tabbable = map?.isPinTabStop(this) ?? false;
    const disabled = this.pinDisabled || !map;
    return html`<div
        part="pin"
        role="button"
        tabindex=${tabbable ? '0' : '-1'}
        aria-label=${this.accessibleLabel}
        aria-pressed=${this.selected ? 'true' : 'false'}
        aria-disabled=${disabled ? 'true' : 'false'}
        @click=${this.#click}
        @keydown=${this.#keydown}
        @focus=${this.#focus}
      >
        <slot class="visual-slot"><span part="pin-visual"></span></slot>
      </div>
      <slot class="overlay-slot"></slot>`;
  }

  #assign(): void {
    const root = this.renderRoot as ShadowRoot | undefined;
    const visual = root?.querySelector<HTMLSlotElement>('slot.visual-slot');
    const overlay = root?.querySelector<HTMLSlotElement>('slot.overlay-slot');
    if (!visual || !overlay) return;
    const overlays: Element[] = [];
    const content: Node[] = [];
    for (const node of this.childNodes) {
      if (node instanceof TpMapOverlay) overlays.push(node);
      else if (node.nodeType === 1 || (node.nodeType === 3 && node.textContent?.trim()))
        content.push(node);
    }
    visual.assign(...(content as Element[]));
    overlay.assign(...overlays);
  }

  #focus = (): void => {
    this.#registered?.pinFocused(this);
  };

  #click = (event: MouseEvent): void => {
    const map = this.#registered;
    if (!map) return;
    // The engine may prevent focus on press; keep focus with the pressed pin.
    if (this.ownerDocument.activeElement !== this)
      this.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    map.pressPin(this, event.detail === 0 ? 'keyboard' : 'item-press', event);
  };

  #keydown = (event: KeyboardEvent): void => {
    const map = this.#registered;
    if (!map || event.altKey || event.ctrlKey || event.metaKey) return;
    const rtl = this.direction === 'rtl';
    const previous = rtl ? 'ArrowRight' : 'ArrowLeft';
    const next = rtl ? 'ArrowLeft' : 'ArrowRight';
    let handled = true;
    switch (event.key) {
      case 'ArrowUp':
      case previous:
        map.focusPin(this, 'previous');
        break;
      case 'ArrowDown':
      case next:
        map.focusPin(this, 'next');
        break;
      case 'Home':
        map.focusPin(this, 'first');
        break;
      case 'End':
        map.focusPin(this, 'last');
        break;
      case 'Enter':
      case ' ':
        if (!event.repeat) map.pressPin(this, 'keyboard', event);
        break;
      case 'Escape':
        if (map.state.selectedPin !== null)
          void map
            .request('select-pin', null, {
              reason: 'escape-key',
              sourceEvent: event,
              trigger: this,
            })
            .catch(() => undefined);
        else handled = false;
        break;
      default:
        handled = false;
    }
    if (!handled) return;
    // map-f-pin-keyboard: handled keys never reach the engine.
    event.preventDefault();
    event.stopPropagation();
  };
}
