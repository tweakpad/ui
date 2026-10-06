import type { PropertyValues } from 'lit';
import type { Alignment, LogicalSide } from '../../foundation/positioning.js';
import type { TpOpenChangeEvent } from '../../foundation/events.js';
import { mapPresentation } from '../../presentation/families/map.js';
import { TpPopover } from '../popover/popover.js';
import { mapOf, type MapApi } from './context.js';

interface OverlayPin extends HTMLElement {
  readonly control: HTMLElement | null;
  readonly value: string;
  map: string | null;
}

/**
 * The selected pin's overlay (`ucl21-map` Overlay; behavior `sec-1812-map` map-f-overlay).
 *
 * A non-modal Popover whose open state follows its pin's selection. It is anchored to the pin,
 * uses the map viewport as collision boundary, re-positions on every camera frame and publishes
 * `data-anchor-hidden` while the pin is outside the viewport. Escape and outside presses propose
 * clearing the map selection instead of closing directly. Every Popover slot and part applies
 * (`title`, `description`, `close`, `header`).
 */
export class TpMapOverlay extends TpPopover {
  static override tagName = 'tp-map-overlay';
  static override presentationFamilies = [mapPresentation];

  override side: LogicalSide = 'block-start';
  override align: Alignment = 'center';

  #pin: OverlayPin | null = null;
  #map: (HTMLElement & MapApi) | null = null;
  #releaseFrame: (() => void) | undefined;

  constructor() {
    super();
    // Selection owns the open lane from the start (a surface keeps its initial control mode).
    this.open = false;
    this.initialFocus = 'none';
    this.sideOffset = 8;
    this.addEventListener('tp-open-change', this.#openChange as EventListener);
  }

  /** Called by the owning pin after each update. */
  syncFromPin(pin: OverlayPin, selected: boolean): void {
    this.#pin = pin;
    const map = mapOf(pin, pin.map);
    this.#map = map;
    const control = pin.control;
    if (control && this.anchor !== control) this.anchor = control;
    const viewport = map?.viewportElement ?? null;
    if (viewport && this.collisionBoundary !== viewport) this.collisionBoundary = viewport;
    if (control && this.finalFocus !== control) this.finalFocus = control;
    if (this.open !== selected) this.open = selected;
    this.#trackCamera(selected ? map : null);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#trackCamera(null);
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.toggleAttribute('data-selected', this.open);
  }

  #trackCamera(map: (HTMLElement & MapApi) | null): void {
    this.#releaseFrame?.();
    this.#releaseFrame = map ? map.onCameraFrame(() => void this.updatePosition()) : undefined;
  }

  /** Popover dismissal proposes clearing the map selection (map-f-overlay). */
  #openChange = (event: TpOpenChangeEvent): void => {
    if (event.target !== this || event.detail.value) return;
    const map = this.#map;
    const pin = this.#pin;
    if (!map || !pin) return;
    const source = event.detail.sourceEvent;
    // A press on another pin of the same map selects that pin instead.
    const pressedPin = source
      ?.composedPath?.()
      .some(
        (node) =>
          node !== pin &&
          (node as Element).localName === 'tp-map-pin' &&
          (node as Element).parentElement === map,
      );
    if (pressedPin) return;
    // The map's own controls (inside or bound by id) keep the overlay open while the camera moves.
    const pressedControl = source
      ?.composedPath?.()
      .some(
        (node) =>
          (node as Element).localName === 'tp-map-control' &&
          (node as { owner?: unknown }).owner === map,
      );
    if (pressedControl) {
      event.preventDefault();
      return;
    }
    if (map.state.selectedPin !== pin.value) return;
    const reason = event.detail.reason === 'escape-key' ? 'escape-key' : 'outside-press';
    void map
      .request('select-pin', null, { reason, sourceEvent: source, trigger: pin })
      .catch(() => undefined);
  };
}
