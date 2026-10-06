import { css, html, nothing, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { GeneratedStyleResource } from '../../foundation/generated-style.js';
import { resolvesReducedMotion } from '../../foundation/motion.js';
import type { ChangeReason } from '../../foundation/types.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import { windowFrameSource } from '../../foundation/map/camera.js';
import {
  MapController,
  type MapCameraDetail,
  type MapConfig,
  type MapControllerHost,
  type MapPressDetail,
  type MapRequestAction,
  type MapRequestDetail,
  type MapRequestFailedDetail,
  type MapRequestOptions,
  type MapRequestOutcome,
  type MapRequestValues,
} from '../../foundation/map/controller.js';
import type { MapEngine, MapEngineInstance, MapScheme } from '../../foundation/map/engine.js';
import {
  type MapBounds,
  type MapCameraTarget,
  type MapPadding,
  type MapPoint,
  type MapPosition,
  parseBounds,
  parsePosition,
} from '../../foundation/map/geo.js';
import type { MapState, MapSubscribeOptions } from '../../foundation/map/state.js';
import {
  type MapTheme,
  type ResolvedMapTheme,
  resolveMapTheme,
  resolveScheme,
} from '../../foundation/map/theme.js';
import { mapPresentation } from '../../presentation/families/map.js';
import { TpSpinner } from '../spinner/spinner.js';
import {
  DEFAULT_MAP_MESSAGES,
  mapBrand,
  type MapApi,
  type MapMessages,
  type MapPinRecord,
} from './context.js';

export type MapRevealPolicy = 'none' | 'if-hidden' | 'always';

const positionConverter = {
  fromAttribute: (value: string | null) => (value === null ? null : parsePosition(value)),
};
const boundsConverter = {
  fromAttribute: (value: string | null) => (value === null ? null : parseBounds(value)),
};
/** `interactive` defaults to true; only the text `false` turns it off. */
const defaultTrueConverter = {
  fromAttribute: (value: string | null) => value !== 'false',
  toAttribute: (value: boolean) => (value ? null : 'false'),
};
const finiteOr = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/** A pointer press on a pin implies the pin is visible, so it never triggers reveal. */
const PIN_REASONS = new Set<ChangeReason>(['item-press']);

interface PinEntry {
  readonly wrapper: HTMLDivElement;
  readonly slot: HTMLSlotElement;
  placed: boolean;
}

/**
 * Interactive geographic map (`ucl21-map`, behavior `sec-1812-map`).
 *
 * The basemap is rendered by a consumer-supplied engine (`engine`). Pins (`tp-map-pin`) are
 * light-DOM children projected to engine-placed anchors by manual slot assignment; their content
 * is never copied. The selected pin's `tp-map-overlay` opens anchored to it. Controls
 * (`tp-map-control`) may live inside the map or anywhere with `map="id"`.
 *
 * @slot - Controls and other content laid over the viewport's top inline-end corner.
 * @slot status - Replaces the empty, loading and error message.
 * @csspart viewport - The labelled region that contains the engine surface and pins.
 * @csspart status - The empty, loading or error status.
 * @csspart controls - The container of default-slot content over the viewport.
 * @fires tp-map-ready - The engine is ready; `detail.native` is the engine's map object.
 * @fires tp-map-error - The engine failed; `detail.error`.
 * @fires tp-map-request - Cancelable; every camera and selection request.
 * @fires tp-map-request-failed - A request rejected.
 * @fires tp-map-camera-change - The camera moved (at most once per frame).
 * @fires tp-map-camera-commit - The camera settled.
 * @fires tp-map-press - A press on the basemap outside pins and overlays.
 * @fires tp-value-change - Cancelable selection proposal (`selectedPin`).
 */
export class TpMap extends TpElement implements MapApi {
  static tagName = 'tp-map';
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpSpinner];
  }
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', slotAssignment: 'manual' };
  static override presentation = mapPresentation;
  static override properties = {
    ...TpElement.properties,
    engine: { attribute: false },
    defaultCenter: { attribute: 'default-center', converter: positionConverter },
    defaultZoom: { type: Number, attribute: 'default-zoom' },
    defaultBounds: { attribute: 'default-bounds', converter: boundsConverter },
    minZoom: { type: Number, attribute: 'min-zoom' },
    maxZoom: { type: Number, attribute: 'max-zoom' },
    fitPadding: { type: Number, attribute: 'fit-padding' },
    selectedPin: { attribute: 'selected-pin', noAccessor: true },
    defaultSelectedPin: { attribute: 'default-selected-pin' },
    reveal: { type: String },
    revealZoom: { type: Number, attribute: 'reveal-zoom' },
    interactive: { converter: defaultTrueConverter },
    cooperativeGestures: { type: Boolean, attribute: 'cooperative-gestures' },
    theme: { attribute: false },
    label: { type: String },
    messages: { attribute: false },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        position: relative;
        display: block;
        overflow: hidden;
        inline-size: 100%;
        block-size: 24rem;
        isolation: isolate;
      }

      [part~='viewport'] {
        position: absolute;
        inset: 0;
      }

      .surface {
        position: absolute;
        inset: 0;
      }

      [part~='status'] {
        position: absolute;
        inset: 0;
        z-index: 3;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
      }

      [part~='controls'] {
        position: absolute;
        inset-block-start: var(--tp-space-3);
        inset-inline-end: var(--tp-space-3);
        z-index: 2;
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-2);
      }

      [part~='controls'][hidden] {
        display: none;
      }

      .pin-anchor {
        inline-size: 0;
        block-size: 0;
        overflow: visible;
      }

      .pin-anchor[data-selected] {
        z-index: 1;
      }

      .probe {
        position: absolute;
        inline-size: 0;
        block-size: 0;
        overflow: hidden;
        pointer-events: none;
      }
    `,
  ];

  readonly [mapBrand] = true as const;

  /** The engine adapter that renders the basemap (property only). */
  engine: MapEngine | null = null;
  /** Home center (`latitude,longitude`). */
  defaultCenter: MapPosition | null = null;
  /** Home zoom on the 256-pixel scale. */
  defaultZoom = 1;
  /** Home region (`south,west,north,east`), fitted with `fitPadding`. */
  defaultBounds: MapBounds | null = null;
  minZoom = 0;
  maxZoom = 20;
  /** Padding in CSS pixels for fitting and reveal visibility. */
  fitPadding = 48;
  /** Uncontrolled initial selection. */
  defaultSelectedPin: string | null = null;
  /** Reveal after a selection not made on the pin itself. */
  reveal: MapRevealPolicy = 'if-hidden';
  /** Zoom used when revealing; `null` keeps the current zoom. */
  revealZoom: number | null = null;
  /** Engine gestures and keyboard. */
  interactive = true;
  /** Modifier-gated wheel zoom and two-finger touch pan. */
  cooperativeGestures = false;
  /** Basemap theme roles (property only). */
  theme: MapTheme | null = null;
  /** Viewport accessible name; falls back to the map message. */
  label: string | null = null;
  /** Strings with English fallbacks, inherited by constituents. */
  messages: MapMessages = {};
  /** Observes selection proposals before dispatch. */
  onSelectedPinChange: ((event: TpValueChangeEvent<string | null>) => void) | undefined;

  readonly controller: MapController;
  #provided: string | null | undefined;
  readonly #selection: ControllableState<string | null>;
  readonly #pins: MapPinRecord[] = [];
  readonly #entries = new Map<MapPinRecord, PinEntry>();
  readonly #duplicates = new Set<MapPinRecord>();
  readonly #frameCallbacks = new Set<() => void>();
  #lastFocused: MapPinRecord | null = null;
  #pinPress = false;
  #pinsQueued = false;
  #scheme: MapScheme = 'light';
  #resolvedTheme: ResolvedMapTheme | null = null;
  #styles = new Map<string, { resource: GeneratedStyleResource; count: number }>();
  #resize: ResizeObserver | undefined;
  #mutations: MutationObserver | undefined;
  #schemeObserver: MutationObserver | undefined;
  #media: MediaQueryList | undefined;
  #canvas: CanvasRenderingContext2D | null | undefined;
  #colorCache = new Map<string, string | null>();
  #unsubscribe: (() => void) | undefined;
  #connectedOnce = false;
  #publishedSelection: string | null = null;

  constructor() {
    super();
    this.controller = new MapController(this.#controllerHost());
    this.#selection = new ControllableState<string | null>({
      host: this,
      initialValue: null,
      readControlledValue: () => this.#provided,
      readDefaultValue: () => this.defaultSelectedPin ?? null,
      hasDefaultValue: () => this.defaultSelectedPin != null,
      onChange: (event) => this.onSelectedPinChange?.(event),
      onCommit: (value, previous, reason) => this.#selectionCommitted(value, previous, reason),
      diagnostic: (message) => this.#diagnostic('map-selection', message),
    });
  }

  // Public API -------------------------------------------------------------------------------

  /** Controlled selection; `undefined` makes the lane uncontrolled. */
  get selectedPin(): string | null {
    return this.#selection.value;
  }
  set selectedPin(value: string | null | undefined) {
    const previous = this.selectedPin;
    this.#provided = value === undefined ? undefined : value === null ? null : String(value);
    if (this.hasUpdated) this.#selection.sync();
    this.requestUpdate('selectedPin', previous);
  }

  /** The latest frozen state snapshot. */
  get state(): MapState {
    return this.controller.state;
  }

  /** The engine's native map object, or `null`. */
  get native(): unknown {
    return this.controller.native;
  }

  /** The mounted engine instance while ready (advanced use). */
  get engineInstance(): MapEngineInstance | null {
    return this.controller.instance;
  }

  get mapMessages(): Required<MapMessages> {
    return { ...DEFAULT_MAP_MESSAGES, ...this.messages };
  }

  get viewportElement(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>("[part~='viewport']") ?? null;
  }

  request<A extends MapRequestAction>(
    action: A,
    value: MapRequestValues[A],
    options?: MapRequestOptions,
  ): Promise<MapRequestOutcome> {
    return this.controller.request(action, value, {
      ...options,
      reason: options?.reason ?? 'imperative-action',
    });
  }

  zoomIn(step?: number, options?: MapRequestOptions): Promise<MapRequestOutcome> {
    return this.request('zoom-in', step, options);
  }

  zoomOut(step?: number, options?: MapRequestOptions): Promise<MapRequestOutcome> {
    return this.request('zoom-out', step, options);
  }

  resetView(options?: MapRequestOptions): Promise<MapRequestOutcome> {
    return this.request('reset', undefined, options);
  }

  flyTo(target: MapCameraTarget, options?: MapRequestOptions): Promise<MapRequestOutcome> {
    return this.request('fly-to', target, options);
  }

  fitBounds(
    bounds: MapBounds | string,
    fit: { padding?: MapPadding; maxZoom?: number } = {},
    options?: MapRequestOptions,
  ): Promise<MapRequestOutcome> {
    const parsed = parseBounds(bounds);
    if (!parsed) return Promise.reject(new TypeError('fitBounds requires south,west,north,east.'));
    return this.request('fit-bounds', { bounds: parsed, ...fit }, options);
  }

  fitPins(
    fit?: { padding?: MapPadding; maxZoom?: number },
    options?: MapRequestOptions,
  ): Promise<MapRequestOutcome> {
    return this.request('fit-pins', fit, options);
  }

  /** Proposes a selection (`null` clears it); the reveal policy applies after commit. */
  selectPin(value: string | null, options?: MapRequestOptions): Promise<MapRequestOutcome> {
    return this.request('select-pin', value, options);
  }

  /** Centers a pin, at `zoom`, else `reveal-zoom`, else the current zoom. */
  revealPin(value: string, zoom?: number, options?: MapRequestOptions): Promise<MapRequestOutcome> {
    return this.request('reveal-pin', zoom === undefined ? { value } : { value, zoom }, options);
  }

  project(position: MapPosition): MapPoint {
    return this.controller.project(position);
  }

  unproject(point: MapPoint): MapPosition {
    return this.controller.unproject(point);
  }

  subscribe<S>(
    selector: (state: MapState) => S,
    callback: (selected: S) => void,
    options?: MapSubscribeOptions<S>,
  ): () => void {
    return this.controller.subscribe(selector, callback, options);
  }

  /** Re-reads the color scheme and theme tokens (for example after a scoped theme change). */
  refreshAppearance(): void {
    this.#colorCache.clear();
    this.#resolveAppearance(true);
  }

  // Pin registry (MapApi) ---------------------------------------------------------------------

  registerPin(pin: MapPinRecord): () => void {
    if (!this.#entries.has(pin)) {
      const wrapper = this.ownerDocument.createElement('div');
      wrapper.className = 'pin-anchor';
      const slot = this.ownerDocument.createElement('slot');
      wrapper.append(slot);
      this.#entries.set(pin, { wrapper, slot, placed: false });
      this.#pins.push(pin);
      this.#sortPins();
      this.#assignSlots();
      this.#placePin(pin);
      this.#pinsChanged();
    }
    return () => this.#unregisterPin(pin);
  }

  pinChanged(pin: MapPinRecord): void {
    if (!this.#entries.has(pin)) return;
    this.#placePin(pin);
    // Pins report changes from their own update; settle registry effects afterwards.
    if (this.#pinsQueued) return;
    this.#pinsQueued = true;
    queueMicrotask(() => {
      this.#pinsQueued = false;
      this.#pinsChanged();
    });
  }

  isPinSelectable(pin: MapPinRecord): boolean {
    const entry = this.#entries.get(pin);
    return (
      Boolean(entry?.placed) && !pin.pinDisabled && !this.#duplicates.has(pin) && !this.disabled
    );
  }

  isPinSelected(pin: MapPinRecord): boolean {
    return this.#effectiveSelection() === pin.value && !this.#duplicates.has(pin);
  }

  isPinTabStop(pin: MapPinRecord): boolean {
    return this.#tabStop() === pin;
  }

  pinFocused(pin: MapPinRecord): void {
    if (this.#lastFocused === pin) return;
    this.#lastFocused = pin;
    this.#updatePins();
  }

  focusPin(from: MapPinRecord, target: 'previous' | 'next' | 'first' | 'last'): boolean {
    const eligible = this.#eligiblePins();
    if (!eligible.length) return false;
    const index = eligible.indexOf(from);
    const next =
      target === 'first'
        ? eligible[0]
        : target === 'last'
          ? eligible.at(-1)
          : target === 'next'
            ? eligible[Math.min(eligible.length - 1, index + 1)]
            : eligible[Math.max(0, index - 1)];
    if (!next || next === from) return false;
    this.#lastFocused = next;
    this.#updatePins();
    next.focus({ preventScroll: true });
    // map-f-pin-keyboard: a focused pin must not stay hidden outside the viewport.
    const position = next.position;
    if (position && !this.controller.isVisible(position, this.#config().fitPadding))
      void this.controller
        .request(
          'reveal-pin',
          { value: next.value, zoom: this.controller.state.camera.zoom },
          { reason: 'keyboard', trigger: next },
        )
        .catch(() => undefined);
    return true;
  }

  pressPin(pin: MapPinRecord, reason: ChangeReason, sourceEvent: Event): void {
    if (!this.isPinSelectable(pin)) return;
    this.#pinPress = true;
    try {
      void this.controller
        .request('select-pin', pin.value, { reason, sourceEvent, trigger: pin })
        .catch(() => undefined);
    } finally {
      this.#pinPress = false;
    }
  }

  onCameraFrame(callback: () => void): () => void {
    this.#frameCallbacks.add(callback);
    return () => this.#frameCallbacks.delete(callback);
  }

  // Lifecycle --------------------------------------------------------------------------------

  override connectedCallback(): void {
    super.connectedCallback();
    const view = this.ownerDocument.defaultView;
    this.#media = view?.matchMedia('(prefers-color-scheme: dark)');
    this.#media?.addEventListener('change', this.#schemeChanged);
    this.#schemeObserver = view ? new view.MutationObserver(this.#schemeChanged) : undefined;
    for (const element of [this.ownerDocument.documentElement, this.ownerDocument.body])
      if (element)
        this.#schemeObserver?.observe(element, {
          attributes: true,
          attributeFilter: ['class', 'style', 'data-theme', 'data-color-scheme'],
        });
    this.#mutations = view ? new view.MutationObserver(() => this.#assignSlots()) : undefined;
    this.#mutations?.observe(this, { childList: true });
    this.#unsubscribe = this.controller.subscribe(
      (state) =>
        [state.status, state.moving, state.scheme, state.canZoomIn, state.canZoomOut] as const,
      () => this.requestUpdate(),
    );
    if (this.#connectedOnce) {
      this.#resolveAppearance(false);
      this.controller.connect();
      this.#observeSize();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#media?.removeEventListener('change', this.#schemeChanged);
    this.#schemeObserver?.disconnect();
    this.#mutations?.disconnect();
    this.#resize?.disconnect();
    this.#unsubscribe?.();
    this.controller.disconnect();
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed);
    this.#connectedOnce = true;
    this.#assignSlots();
    this.#resolveAppearance(false);
    this.controller.updateConfig();
    this.controller.connect();
    this.controller.setEngine(this.engine);
    this.#observeSize();
    this.#publishSelection();
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has('defaultSelectedPin') && !this.hasUpdated) this.#selection.sync();
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const state = this.controller.state;
    this.dataset.status = state.status;
    this.dataset.scheme = state.scheme;
    this.toggleAttribute('data-moving', state.moving);
    this.toggleAttribute('data-selected', this.#effectiveSelection() !== null);
    if (!this.hasUpdated) return;
    if (changed.has('engine') && this.#connectedOnce) this.controller.setEngine(this.engine);
    const config = [
      'minZoom',
      'maxZoom',
      'interactive',
      'cooperativeGestures',
      'disabled',
      'fitPadding',
      'revealZoom',
      'defaultCenter',
      'defaultZoom',
      'defaultBounds',
    ] as const;
    if (config.some((key) => changed.has(key))) {
      this.controller.updateConfig();
      if (
        (['defaultCenter', 'defaultZoom', 'defaultBounds'] as const).some((key) => changed.has(key))
      )
        this.controller.syncPendingCamera();
    }
    if (changed.has('theme')) this.#resolveAppearance(true);
    if (
      changed.has('disabled') ||
      changed.has('selectedPin') ||
      changed.has('defaultSelectedPin')
    ) {
      this.#publishSelection();
      this.#updatePins();
    }
  }

  // Rendering --------------------------------------------------------------------------------

  protected override render() {
    const state = this.controller.state;
    const messages = this.mapMessages;
    const status = state.status;
    const statusText =
      status === 'error'
        ? messages.error
        : status === 'loading'
          ? messages.loading
          : !this.engine
            ? messages.empty
            : '';
    const showStatus = status !== 'ready' && Boolean(statusText || status === 'loading');
    return html`<div
      part="viewport"
      role="region"
      aria-label=${this.label || messages.map}
      aria-busy=${status === 'loading' ? 'true' : 'false'}
    >
      <div class="surface"></div>
      ${
        showStatus
          ? html`<div part="status" role=${status === 'error' ? 'alert' : 'status'}>
              <slot name="status"
                >${
                  status === 'loading'
                    ? html`<tp-spinner label=${messages.loading}></tp-spinner>`
                    : nothing
                }<span>${statusText}</span></slot
              >
            </div>`
          : nothing
      }
      <div part="controls" hidden><slot class="controls-slot"></slot></div>
      <span class="probe" aria-hidden="true"></span>
    </div>`;
  }

  // Internals --------------------------------------------------------------------------------

  #controllerHost(): MapControllerHost {
    return {
      viewport: () => this.renderRoot?.querySelector<HTMLElement>('.surface') ?? null,
      viewportSize: () => {
        const surface = this.renderRoot?.querySelector<HTMLElement>('.surface');
        return { width: surface?.clientWidth ?? 0, height: surface?.clientHeight ?? 0 };
      },
      config: () => this.#config(),
      appearance: () => ({ scheme: this.#scheme, theme: this.#resolvedTheme }),
      pinPositions: () =>
        this.#eligiblePins()
          .map((pin) => pin.position)
          .filter((position): position is MapPosition => position !== null),
      pinPosition: (value) => {
        const pin = this.#pinByValue(value);
        return pin ? pin.position : undefined;
      },
      select: (value, reason, sourceEvent) => {
        if (value !== null) {
          const pin = this.#pinByValue(value);
          if (!pin || !this.isPinSelectable(pin)) return false;
        }
        if (value === this.#selection.value) return true;
        return this.#selection.set(value, reason, sourceEvent);
      },
      reducedMotion: () => resolvesReducedMotion(this),
      adoptStyles: (cssText) => this.#adoptStyles(cssText),
      frames: () => windowFrameSource(this.ownerDocument.defaultView ?? window),
      dispatchRequest: (detail: MapRequestDetail) =>
        this.emit('tp-map-request', detail, { cancelable: true }),
      requestFailed: (detail: MapRequestFailedDetail) => this.emit('tp-map-request-failed', detail),
      ready: (native) => {
        this.emit('tp-map-ready', { native });
        this.#updatePins();
        this.#runFrame();
      },
      failed: (error) => {
        this.emit('tp-map-error', { error });
        this.#updatePins();
      },
      cameraChanged: (detail: MapCameraDetail) => this.emit('tp-map-camera-change', detail),
      cameraCommitted: (detail: MapCameraDetail) => {
        this.emit('tp-map-camera-commit', detail);
        this.#runFrame();
      },
      pressed: (detail: MapPressDetail) => {
        this.emit('tp-map-press', detail);
        if (this.#selection.value !== null)
          void this.controller
            .request('select-pin', null, {
              reason: 'outside-press',
              sourceEvent: detail.sourceEvent,
            })
            .catch(() => undefined);
      },
      frame: () => this.#runFrame(),
      diagnostic: (code, message) => this.#diagnostic(code, message),
    };
  }

  #config(): MapConfig {
    const minZoom = finiteOr(this.minZoom, 0);
    const maxZoom = Math.max(minZoom, finiteOr(this.maxZoom, 20));
    const revealZoom = this.revealZoom;
    return {
      defaultCenter: this.defaultCenter ? parsePosition(this.defaultCenter) : null,
      defaultZoom: finiteOr(this.defaultZoom, 1),
      defaultBounds: this.defaultBounds ? parseBounds(this.defaultBounds) : null,
      minZoom,
      maxZoom,
      fitPadding: Math.max(0, finiteOr(this.fitPadding, 48)),
      revealZoom: typeof revealZoom === 'number' && Number.isFinite(revealZoom) ? revealZoom : null,
      interactive: this.interactive !== false,
      cooperativeGestures: Boolean(this.cooperativeGestures),
      disabled: this.disabled,
    };
  }

  #runFrame(): void {
    for (const callback of this.#frameCallbacks) callback();
  }

  #diagnostic(code: string, message: string): void {
    this.emit('tp-diagnostic', { code, message });
  }

  #observeSize(): void {
    const surface = this.renderRoot.querySelector<HTMLElement>('.surface');
    const view = this.ownerDocument.defaultView;
    if (!surface || !view?.ResizeObserver) return;
    this.#resize?.disconnect();
    this.#resize = new view.ResizeObserver(() => this.controller.refresh());
    this.#resize.observe(surface);
  }

  #adoptStyles(cssText: string): () => void {
    const root = this.renderRoot as ShadowRoot;
    let entry = this.#styles.get(cssText);
    if (!entry) {
      const resource = new GeneratedStyleResource(this, root);
      resource.setText(cssText);
      entry = { resource, count: 0 };
      this.#styles.set(cssText, entry);
    }
    entry.count += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const current = this.#styles.get(cssText);
      if (!current || --current.count > 0) return;
      current.resource.dispose();
      this.#styles.delete(cssText);
    };
  }

  // Slot projection (map-f-pin-content) ------------------------------------------------------

  #assignSlots(): void {
    const root = this.renderRoot as ShadowRoot | undefined;
    if (!root) return;
    const controls = root.querySelector<HTMLSlotElement>('slot.controls-slot');
    const status = root.querySelector<HTMLSlotElement>('slot[name="status"]');
    const rest: Node[] = [];
    const statusNodes: Element[] = [];
    for (const node of this.childNodes) {
      if (this.#entries.has(node as MapPinRecord)) continue;
      if (node.nodeType === 1 && (node as Element).localName === 'tp-map-pin') continue;
      if (node.nodeType === 1 && (node as Element).getAttribute('slot') === 'status')
        statusNodes.push(node as Element);
      else if (node.nodeType === 1 || (node.nodeType === 3 && node.textContent?.trim()))
        rest.push(node);
    }
    controls?.assign(...(rest as Element[]));
    const container = root.querySelector<HTMLElement>("[part~='controls']");
    if (container) container.hidden = rest.length === 0;
    status?.assign(...statusNodes);
    for (const [pin, entry] of this.#entries) entry.slot.assign(pin);
  }

  #placePin(pin: MapPinRecord): void {
    const entry = this.#entries.get(pin);
    if (!entry) return;
    const position = pin.position;
    if (position) {
      this.controller.placeOverlay(entry.wrapper, position);
      entry.placed = true;
    } else if (entry.placed) {
      this.controller.removeOverlay(entry.wrapper);
      entry.placed = false;
    }
  }

  #unregisterPin(pin: MapPinRecord): void {
    const entry = this.#entries.get(pin);
    if (!entry) return;
    this.#entries.delete(pin);
    this.#pins.splice(this.#pins.indexOf(pin), 1);
    this.controller.removeOverlay(entry.wrapper);
    entry.wrapper.remove();
    if (this.#lastFocused === pin) this.#lastFocused = null;
    this.#pinsChanged();
    // map-f-selection: removing the selected pin clears an uncontrolled lane with `missing`.
    if (
      pin.value === this.#selection.value &&
      !this.#selection.controlled &&
      !this.#pinByValue(pin.value)
    )
      this.#selection.set(null, 'missing');
  }

  #sortPins(): void {
    this.#pins.sort((a, b) =>
      a === b ? 0 : a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    );
  }

  #pinsChanged(): void {
    this.#sortPins();
    const seen = new Set<string>();
    const duplicates = new Set<MapPinRecord>();
    for (const pin of this.#pins) {
      if (seen.has(pin.value)) duplicates.add(pin);
      seen.add(pin.value);
    }
    for (const pin of duplicates)
      if (!this.#duplicates.has(pin))
        this.#diagnostic('map-duplicate-pin', `Duplicate map pin value "${pin.value}".`);
    this.#duplicates.clear();
    for (const pin of duplicates) this.#duplicates.add(pin);
    this.controller.syncPendingCamera();
    this.#publishSelection();
    this.#updatePins();
  }

  #pinByValue(value: string): MapPinRecord | undefined {
    return this.#pins.find((pin) => pin.value === value && !this.#duplicates.has(pin));
  }

  #eligiblePins(): MapPinRecord[] {
    return this.#pins.filter(
      (pin) => this.#entries.get(pin)?.placed && !pin.pinDisabled && !this.#duplicates.has(pin),
    );
  }

  #tabStop(): MapPinRecord | null {
    const eligible = this.#eligiblePins();
    const selected = this.#effectiveSelection();
    return (
      (selected !== null ? eligible.find((pin) => pin.value === selected) : undefined) ??
      (this.#lastFocused && eligible.includes(this.#lastFocused) ? this.#lastFocused : undefined) ??
      eligible[0] ??
      null
    );
  }

  #updatePins(): void {
    const selected = this.#effectiveSelection();
    for (const [pin, entry] of this.#entries) {
      entry.wrapper.toggleAttribute('data-selected', selected !== null && pin.value === selected);
      pin.requestUpdate();
    }
  }

  /** map-f-selection: a value naming no selectable pin publishes `null`. */
  #effectiveSelection(): string | null {
    const value = this.#selection.value;
    if (value === null || value === undefined) return null;
    const pin = this.#pinByValue(value);
    return pin && this.isPinSelectable(pin) ? value : null;
  }

  #publishSelection(): void {
    const effective = this.#effectiveSelection();
    const previous = this.#publishedSelection;
    this.#publishedSelection = effective;
    this.controller.store.patch({ selectedPin: effective });
    this.toggleAttribute('data-selected', effective !== null);
    // A late-registered selected pin takes effect and the reveal policy applies.
    if (effective !== null && previous !== effective && this.hasUpdated && !this.#pinPress)
      this.#applyReveal(effective, 'programmatic');
  }

  #selectionCommitted(value: string | null, previous: string | null, reason: ChangeReason): void {
    this.requestUpdate('selectedPin', previous);
    const fromPin = this.#pinPress && PIN_REASONS.has(reason);
    const effective = this.#effectiveSelection();
    const before = this.#publishedSelection;
    this.#publishedSelection = effective;
    this.controller.store.patch({ selectedPin: effective }, reason);
    this.#updatePins();
    if (value !== null && effective === value && before !== effective && !fromPin)
      this.#applyReveal(value, reason);
  }

  /** map-f-reveal */
  #applyReveal(value: string, reason: ChangeReason): void {
    if (this.reveal === 'none') return;
    const pin = this.#pinByValue(value);
    const position = pin?.position;
    if (!position) return;
    if (this.reveal !== 'always' && this.controller.isVisible(position, this.#config().fitPadding))
      return;
    void this.controller.request('reveal-pin', { value }, { reason }).catch(() => undefined);
  }

  // Appearance (map-f-appearance) ------------------------------------------------------------

  readonly #schemeChanged = (): void => {
    this.#colorCache.clear();
    this.#resolveAppearance(true);
  };

  #resolveAppearance(push: boolean): void {
    if (!this.isConnected) return;
    const view = this.ownerDocument.defaultView;
    if (!view) return;
    const scheme = resolveScheme(
      view.getComputedStyle(this).colorScheme ?? '',
      view.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
    );
    const changed = scheme !== this.#scheme;
    if (changed) this.#colorCache.clear();
    this.#scheme = scheme;
    this.#resolvedTheme = resolveMapTheme(this.theme, scheme, (value) => this.#resolveColor(value));
    if (push || changed) this.controller.updateAppearance();
  }

  /** Resolves any CSS color (tokens, `light-dark()`, modern spaces) to sRGB for the engine. */
  #resolveColor(value: string): string | null {
    if (this.#colorCache.has(value)) return this.#colorCache.get(value)!;
    const probe = this.renderRoot?.querySelector<HTMLElement>('.probe');
    const view = this.ownerDocument.defaultView;
    if (!probe || !view) return null;
    probe.style.color = '';
    probe.style.color = value;
    if (!probe.style.color) {
      this.#colorCache.set(value, null);
      return null;
    }
    const computed = view.getComputedStyle(probe).color;
    probe.style.color = '';
    if (this.#canvas === undefined) {
      const canvas = this.ownerDocument.createElement('canvas');
      canvas.width = canvas.height = 1;
      this.#canvas = canvas.getContext('2d', { willReadFrequently: true });
    }
    const context = this.#canvas;
    let result: string | null = computed || null;
    if (context) {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = '#000';
      context.fillStyle = computed;
      context.fillRect(0, 0, 1, 1);
      const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(0, 0, 1, 1).data;
      const hex = (n: number) => n.toString(16).padStart(2, '0');
      result =
        a >= 255
          ? `#${hex(r)}${hex(g)}${hex(b)}`
          : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
    }
    this.#colorCache.set(value, result);
    return result;
  }
}
