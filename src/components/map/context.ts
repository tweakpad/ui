/**
 * Map constituent API (`sec-1812-map` map-f-owner; Library `ucl21-map`).
 *
 * Pins and controls resolve their map through the portal-aware nearest owner, or through a `map`
 * id reference when they live outside the map subtree. A constituent without a map diagnoses and
 * renders disabled.
 */
import type { PropertyDeclarations, PropertyValues, ReactiveControllerHost } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { resolveOwner } from '../../foundation/portal-ownership.js';
import type { ChangeReason } from '../../foundation/types.js';
import type {
  MapRequestAction,
  MapRequestOptions,
  MapRequestOutcome,
  MapRequestValues,
} from '../../foundation/map/controller.js';
import type { MapPosition } from '../../foundation/map/geo.js';
import {
  DEFAULT_MAP_STATE,
  type MapState,
  type MapSubscribeOptions,
} from '../../foundation/map/state.js';
import { mapPresentation } from '../../presentation/families/map.js';

/** Brand carried by `tp-map`; the owner lookup tests it instead of `instanceof`. */
export const mapBrand: unique symbol = Symbol.for('tweakpad.map');

export interface MapMessages {
  /** Viewport name. */
  map?: string;
  loading?: string;
  error?: string;
  /** Status shown while no engine is assigned. */
  empty?: string;
  zoomIn?: string;
  zoomOut?: string;
  reset?: string;
  fitPins?: string;
  /** Fallback pin name. */
  pin?: string;
  /** Name of the built-in control group. */
  controls?: string;
}

export const DEFAULT_MAP_MESSAGES: Required<MapMessages> = Object.freeze({
  map: 'Map',
  loading: 'Loading map…',
  error: 'The map could not be loaded.',
  empty: 'No map engine is configured.',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  reset: 'Reset view',
  fitPins: 'Show all locations',
  pin: 'Location',
  controls: 'Map controls',
});

/** A pin as the map sees it. */
export interface MapPinRecord extends HTMLElement {
  readonly value: string;
  readonly position: MapPosition | null;
  readonly pinDisabled: boolean;
  readonly accessibleLabel: string;
  focus(options?: FocusOptions): void;
  /** Re-renders the pin after map state that affects it changed. */
  requestUpdate(): void;
}

/** What a constituent may rely on from its map. `TpMap` implements it. */
export interface MapApi {
  readonly [mapBrand]: true;
  readonly state: MapState;
  readonly disabled: boolean;
  readonly mapMessages: Required<MapMessages>;
  request<A extends MapRequestAction>(
    action: A,
    value: MapRequestValues[A],
    options?: MapRequestOptions,
  ): Promise<MapRequestOutcome>;
  subscribe<S>(
    selector: (state: MapState) => S,
    callback: (selected: S) => void,
    options?: MapSubscribeOptions<S>,
  ): () => void;
  /** Registers a pin; returns the unregistration. */
  registerPin(pin: MapPinRecord): () => void;
  /** Re-reads a registered pin's value, position and disabled state. */
  pinChanged(pin: MapPinRecord): void;
  /** Whether `pin` is the composite tab stop. */
  isPinTabStop(pin: MapPinRecord): boolean;
  /** Whether `pin` is the effective selection. */
  isPinSelected(pin: MapPinRecord): boolean;
  /** Whether `pin` can be selected (not disabled, unique value, placed). */
  isPinSelectable(pin: MapPinRecord): boolean;
  /** Records focus for the composite tab stop. */
  pinFocused(pin: MapPinRecord): void;
  /** Moves focus among placed pins (`map-f-pin-keyboard`); returns whether focus moved. */
  focusPin(from: MapPinRecord, target: 'previous' | 'next' | 'first' | 'last'): boolean;
  /** Proposes selecting `pin` from a press on the pin itself. */
  pressPin(pin: MapPinRecord, reason: ChangeReason, sourceEvent: Event): void;
  /** The viewport element (overlay collision boundary). */
  readonly viewportElement: HTMLElement | null;
  /** Registers a callback run once per camera frame; returns the removal. */
  onCameraFrame(callback: () => void): () => void;
}

export const isMap = (node: Node): node is HTMLElement & MapApi =>
  (node as Partial<MapApi>)[mapBrand] === true;

/** The map that owns `host` (`map-f-owner`), or `null`. */
export function mapOf(host: Node, mapId?: string | null): (HTMLElement & MapApi) | null {
  return resolveOwner(host, isMap, mapId);
}

/**
 * Base class for map constituents: a `map` id reference, owner resolution that retries once the
 * map upgrades, a subscription to the map state, and the `diagnostic` channel.
 */
export class TpMapElement extends TpElement {
  static override presentation = mapPresentation;
  static override properties: PropertyDeclarations = {
    ...TpElement.properties,
    map: { type: String },
  };

  /** Id of a map outside this element's subtree. */
  map: string | null = null;

  #owner: (HTMLElement & MapApi) | null = null;
  #unsubscribe: (() => void) | undefined;
  #diagnosed = false;
  #retry = 0;

  /** The resolved map, or `null`. */
  get owner(): (HTMLElement & MapApi) | null {
    return this.#owner;
  }

  /** The latest map state (defaults without a map). */
  get mapState(): MapState {
    return this.#owner?.state ?? DEFAULT_MAP_STATE;
  }

  get messages(): Required<MapMessages> {
    return this.#owner?.mapMessages ?? DEFAULT_MAP_MESSAGES;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.resolveOwner();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    cancelAnimationFrame(this.#retry);
    this.bindOwner(null);
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has('map') && this.isConnected) this.resolveOwner();
  }

  /** Re-resolves the owner (id reference or nearest map). */
  protected resolveOwner(): void {
    const owner = mapOf(this, this.map);
    if (owner) {
      this.#diagnosed = false;
      this.bindOwner(owner);
      return;
    }
    this.bindOwner(null);
    // The map may not be upgraded or parsed yet: retry when tp-map is defined and next frame.
    const view = this.ownerDocument.defaultView;
    view?.customElements
      .whenDefined('tp-map')
      .then(() => {
        if (this.isConnected && !this.#owner) this.#retryResolve();
      })
      .catch(() => undefined);
  }

  #retryResolve(): void {
    cancelAnimationFrame(this.#retry);
    this.#retry = requestAnimationFrame(() => {
      if (!this.isConnected || this.#owner) return;
      const owner = mapOf(this, this.map);
      if (owner) this.bindOwner(owner);
      else if (!this.#diagnosed) {
        this.#diagnosed = true;
        this.emit('tp-diagnostic', {
          code: 'map-owner',
          message: `${this.localName} has no map; place it inside tp-map or set map="id".`,
        });
      }
    });
  }

  /** Binds to `owner` (or unbinds); subclasses extend to register. */
  protected bindOwner(owner: (HTMLElement & MapApi) | null): void {
    if (owner === this.#owner) return;
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    this.#owner = owner;
    if (owner)
      this.#unsubscribe = owner.subscribe(
        (state) => this.selectState(state),
        () => this.requestUpdate(),
      );
    this.requestUpdate();
  }

  /** The state slice that re-renders this constituent. */
  protected selectState(state: MapState): unknown {
    return state;
  }
}

export type MapHost = ReactiveControllerHost & HTMLElement;
