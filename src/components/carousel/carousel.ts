import { html, nothing, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { cache } from 'lit/directives/cache.js';
import { keyed } from 'lit/directives/keyed.js';
import { TpElement } from '../../foundation/element.js';
import { bindPart, type PartState } from '../../foundation/part.js';
import { createId } from '../../foundation/id.js';
import { OwnedAttributes } from '../../foundation/owned-attributes.js';
import { composedContains } from '../../foundation/focus.js';
import { OwnedStyles } from '../../foundation/owned-styles.js';
import { CleanupScope, Scheduler, EnvironmentService } from '../../foundation/services.js';
import { CollectionRegistry } from '../../foundation/collection.js';
import {
  resolvesReducedMotion,
  prepareMotion,
  type MotionHandle,
} from '../../foundation/motion.js';
import { ScrollbarController } from '../../foundation/scrollbar.js';
import {
  CarouselController,
  type CarouselInput,
  type CarouselProjection,
  type CarouselGeometry,
} from '../../foundation/carousel/controller.js';
import { carouselItems, type CarouselItemResolvers } from '../../foundation/carousel/model.js';
import {
  resolveCarouselConfiguration,
  type CarouselConfiguration,
} from '../../foundation/carousel/configuration.js';
import { CarouselVirtualCache } from '../../foundation/carousel/virtual.js';
import {
  CarouselTransport,
  carouselMotionRoles,
  carouselMotionTiming,
  carouselScrollbarVisibilityMotion,
} from '../../foundation/carousel/transport.js';
import {
  CarouselRenderGuard,
  carouselPositionText,
  carouselScrollbarActivity,
  carouselScrollbarValue,
} from '../../foundation/carousel/status.js';
import {
  carouselAutoplayAction,
  toggleCarouselAutoplay,
} from '../../foundation/carousel/autoplay.js';
import {
  bindCarouselGesture,
  bindCarouselKeyboard,
  bindCarouselWheel,
  carouselTarget,
  carouselInteractive,
  carouselHideOnClickIgnored,
  type CarouselElements,
} from '../../foundation/carousel/input.js';
import { carouselLoopPermutation } from '../../foundation/carousel/loop.js';
import { carouselVisible, closestCarouselSnap } from '../../foundation/carousel/layout.js';
import type {
  CarouselId,
  CarouselItem,
  CarouselOptions,
  CarouselSnapshot,
  CarouselRenderContext,
  CarouselItemOptions,
} from '../../foundation/carousel/types.js';
import { chevronRightIcon } from '../../icons/chevron-right.js';
import { renderScrollbar, scrollbarStyles } from '../shared-scrollbar.js';
import { carouselStyles } from './styles.js';

interface SlotRecord {
  id: string;
  name: string;
  attributes: OwnedAttributes;
}
interface Shell {
  element: HTMLElement;
  styles: OwnedStyles;
  attributes: OwnedAttributes;
  unregister: () => void;
}
export class TpCarousel<T = unknown> extends TpElement {
  static tagName = 'tp-carousel';
  static override properties = {
    ...TpElement.properties,
    value: { attribute: false },
    defaultValue: { attribute: false },
    index: { type: Number, reflect: true, noAccessor: true },
    loop: { type: Boolean },
    itemsPerMovement: { type: Number, attribute: 'items-per-movement' },
    autoplay: { type: Number },
    items: { attribute: false },
    getItemId: { attribute: false },
    getItemLabel: { attribute: false },
    getItemOptions: { attribute: false },
    renderItem: { attribute: false },
    options: { attribute: false },
    onControllerChange: { attribute: false },
    label: { type: String },
  };
  static override styles = [TpElement.styles, scrollbarStyles, carouselStyles];
  value: number | undefined;
  defaultValue: number | undefined;
  loop = false;
  itemsPerMovement = 1;
  autoplay = 0;
  override orientation: 'horizontal' | 'vertical' = 'horizontal';
  items: readonly T[] | undefined;
  getItemId: ((item: T, index: number) => CarouselId) | undefined;
  getItemLabel: ((item: T, index: number) => string) | undefined;
  getItemOptions: ((item: T, index: number) => CarouselItemOptions) | undefined;
  renderItem: ((item: T, context: CarouselRenderContext) => unknown) | undefined;
  options: CarouselOptions = {};
  onControllerChange: ((controller: CarouselController | null) => void) | undefined;
  label = '';
  #initialIndex = 0;
  #initialIndexExplicit = false;
  #controller: CarouselController | null = null;
  #snapshot: CarouselSnapshot | null = null;
  #projection: CarouselProjection | null = null;
  #transport: CarouselTransport | null = null;
  #scope: CleanupScope | undefined;
  #scheduler: Scheduler | undefined;
  #refresh: (() => void) | undefined;
  #records: readonly CarouselItem[] = [];
  #slots = new Map<HTMLElement, SlotRecord>();
  #slotIdentities = new WeakMap<HTMLElement, string>();
  #shells = new Map<CarouselId, Shell>();
  #references = new Map<CarouselId, (element: HTMLElement | null) => void>();
  readonly #collection = new CollectionRegistry();
  readonly #cache = new CarouselVirtualCache<unknown>();
  #resizeSizes = new WeakMap<Element, string>();
  #partReleases = new Map<string, () => void>();
  #actionRefs = new Map<string, (element: HTMLElement | null) => void>();
  #diagnostics = new Set<string>();
  #viewportId = createId('tp-carousel-viewport');
  #announcement = '';
  #dragging = false;
  #navigationHidden = false;
  #indicatorsHidden = false;
  #order: Array<CarouselId | symbol> = [];
  #fillers: symbol[] = [];
  #physicalOffset = 0;
  #trackStyles: OwnedStyles | undefined;
  #barVisible = false;
  #barMotion: MotionHandle | undefined;
  #lastCallback: typeof this.onControllerChange;
  #notifiedController: CarouselController | null | undefined;
  #dataMode: boolean | undefined;
  #lastAnnouncementId: CarouselId | null = null;
  #rendererGeneration = {};
  #lastRenderer: typeof this.renderItem;
  #lastDataMode: boolean | undefined;
  #projectedId: CarouselId | null = null;
  #preloaded = new Set<string>();
  #dynamicBulletIndex = 0;
  #previousBullet: number | undefined;
  readonly #indicatorGuard = new CarouselRenderGuard<unknown>();
  /** The timer starts synchronously after initialization; before that the control names Pause. */
  #autoplayReady = false;
  readonly #bar = new ScrollbarController({
    read: () => {
      const config = this.#config,
        scrollbar = config.scrollbar;
      const viewport = this.#elements?.viewport;
      return {
        track:
          scrollbar && scrollbar.element
            ? carouselTarget(scrollbar.element, this)
            : this.renderRoot.querySelector<HTMLElement>('.scrollbar'),
        thumb:
          scrollbar && scrollbar.thumbElement
            ? carouselTarget(scrollbar.thumbElement, this)
            : this.renderRoot.querySelector<HTMLElement>('.tp-scrollbar-thumb'),
        orientation: config.orientation,
        rtl: config.orientation === 'horizontal' && this.direction === 'rtl',
        viewportExtent: viewport
          ? config.orientation === 'horizontal'
            ? viewport.clientWidth
            : viewport.clientHeight
          : 0,
        contentExtent: this.#projection?.layout.extent ?? 0,
        progress: this.#snapshot?.previewProgress ?? 0,
        disabled:
          this.disabled ||
          this.readOnly ||
          !this.#snapshot?.measured ||
          (this.#snapshot?.snapCount ?? 0) < 2,
        draggable: !!scrollbar && scrollbar.draggable,
        visibility: scrollbar ? scrollbar.visibility : 'always',
        hideDelay: 1000,
        retainOnHover: true,
        thumbSize: scrollbar ? scrollbar.thumbSize : 'auto',
        snapElement: config.transport === 'scroll' ? (viewport ?? null) : null,
      };
    },
    move: (progress, event, reason) => {
      const snaps = this.#projection?.layout.snaps;
      if (!snaps?.length) return;
      this.#controller?.autoplay.setReason('scrollbar', true);
      this.#controller?.preview(
        snaps[0]!.position + progress * (snaps.at(-1)!.position - snaps[0]!.position),
        reason,
      );
      void event;
    },
    finish: (cancelled, event, reason) => {
      const controller = this.#controller;
      if (!controller) return;
      const action = cancelled
        ? controller.restorePreview()
        : controller.settlePreview({ reason, sourceEvent: event });
      void action.finally(() => controller.autoplay.setReason('scrollbar', false));
    },
    changed: () => {
      this.requestUpdate();
      this.#animateScrollbar();
    },
    error: (error) => this.#diagnose('Carousel scrollbar failed.', error),
  });
  get controller(): CarouselController | null {
    return this.#controller?.snapshot.initialized ? this.#controller : null;
  }
  get index(): number {
    return this.#controller?.index ?? this.#initialIndex;
  }
  set index(value: number) {
    const previous = this.index;
    if (this.#controller) {
      void this.#controller.scrollToIndex(value);
      return;
    }
    this.#initialIndex = value;
    this.#initialIndexExplicit = true;
    this.requestUpdate('index', previous);
  }
  get indicatorType(): string {
    return this.#config.indicators ? this.#config.indicators.type : 'fraction';
  }
  get controlsPlacement(): string {
    return this.#config.navigation.placement;
  }
  get #config(): CarouselConfiguration {
    return (
      this.#controller?.configuration ??
      resolveCarouselConfiguration(this.options, {
        orientation: this.orientation,
        loop: this.loop,
        itemsPerMovement: this.itemsPerMovement,
        autoplay: this.autoplay,
      })
    );
  }
  get #elements(): CarouselElements | null {
    const root = this.renderRoot.querySelector<HTMLElement>('.root'),
      viewport = this.renderRoot.querySelector<HTMLElement>('.viewport'),
      track = this.renderRoot.querySelector<HTMLElement>('.carousel-track');
    return root && viewport && track ? { root, viewport, track } : null;
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.#scope = new CleanupScope();
    this.#scheduler = new Scheduler(this.ownerDocument.defaultView ?? undefined);
    this.#scope.add(() => this.#scheduler?.dispose());
    const Observer = this.ownerDocument.defaultView?.MutationObserver;
    if (Observer) {
      const observer = new Observer((records) => {
        if (
          records.some((record) => {
            if (record.type === 'childList')
              return record.target === this || this.#config.observation.observeItemSubtree;
            const slot = this.#slots.get(record.target as HTMLElement);
            return !(
              record.attributeName === 'slot' &&
              slot &&
              (record.target as Element).getAttribute('slot') === slot.name
            );
          })
        )
          this.#schedule();
      });
      observer.observe(this, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          'id',
          'slot',
          'hidden',
          'disabled',
          'data-tp-autoplay-delay',
          'dir',
          'aria-label',
        ],
      });
      this.#scope.add(() => observer.disconnect());
    }
    this.#scope.listen(this, 'load', () => this.#schedule(), { capture: true });
    this.#scope.listen(this, 'error', () => this.#schedule(), { capture: true });
    void this.ownerDocument.fonts?.ready.then(() => {
      if (this.isConnected) this.#schedule();
    });
    if (this.hasUpdated) void this.updateComplete.then(() => this.#initialize());
  }
  override disconnectedCallback(): void {
    this.#controller?.release();
    this.#controller = null;
    this.#autoplayReady = false;
    this.#indicatorGuard.reset();
    this.#transport?.dispose();
    this.#transport = null;
    this.#trackStyles?.dispose();
    this.#trackStyles = undefined;
    this.#scope?.dispose();
    this.#scope = undefined;
    this.#refresh = undefined;
    this.#bar.dispose();
    this.#barMotion?.cancel();
    for (const slot of this.#slots.values()) slot.attributes.dispose();
    this.#slots.clear();
    for (const shell of this.#shells.values()) {
      shell.styles.dispose();
      shell.attributes.dispose();
      shell.unregister();
    }
    this.#shells.clear();
    for (const release of this.#partReleases.values()) release();
    this.#partReleases.clear();
    this.#cache.clear();
    this.#preloaded.clear();
    this.#snapshot = null;
    this.#projection = null;
    this.#notify(null);
    super.disconnectedCallback();
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (!this.#controller) {
      this.#initialize();
      return;
    }
    if (
      [
        'defaultValue',
        'items',
        'getItemId',
        'getItemLabel',
        'getItemOptions',
        'renderItem',
        'options',
        'orientation',
        'loop',
        'itemsPerMovement',
        'autoplay',
        'disabled',
        'readOnly',
        'motionPolicy',
      ].some((key) => changed.has(key as keyof TpCarousel<T>))
    ) {
      this.#collect();
      void this.#controller.update();
    } else if (changed.has('value')) void this.#controller.update(true);
    if (changed.has('onControllerChange') && this.#lastCallback !== this.onControllerChange)
      this.#notify(this.controller);
    this.#bar.measure();
    this.#syncVisibility();
  }
  readonly #tabInert = new Set<CarouselId>();
  #initialize(): void {
    const elements = this.#elements;
    if (!this.isConnected || this.#controller || !elements) return;
    if (!this.ariaLabel && !this.label) this.#diagnose('Carousel requires an accessible label.');
    this.#collect();
    const controller = new CarouselController({
      host: this,
      owner: this.ownerDocument.defaultView!,
      read: () => this.#read(),
      validateOption: (group, value) => this.#validateOption(group, value),
      measure: (config) => this.#measure(config),
      render: (snapshot, projection) => this.#project(snapshot, projection),
      move: (position, request) => this.#transport?.move(position + this.#physicalOffset, request),
      readPosition: () => (this.#transport?.position ?? 0) - this.#physicalOffset,
      cancel: () => {
        this.#transport?.cancel();
        this.#bar.end(true);
      },
      bind: (owner) => this.#bind(owner),
      focusedId: () => {
        const active = new EnvironmentService(this.ownerDocument).activeElement();
        return (
          this.#records.find((item) => item.element && composedContains(item.element, active))
            ?.id ??
          [...this.#shells].find(([, shell]) => composedContains(shell.element, active))?.[0] ??
          null
        );
      },
      diagnose: (message, error) => this.#diagnose(message, error),
    });
    this.#controller = controller;
    this.#transport = new CarouselTransport(
      this,
      elements,
      () => this.#controller,
      () => this.#physicalOffset,
    );
    this.#trackStyles = new OwnedStyles(elements.track);
    this.#scope?.add(
      controller.subscribe((snapshot) => {
        const previous = this.#snapshot;
        const released = previous?.initialized && !snapshot.initialized;
        this.#snapshot = snapshot;
        // Every movement source publishes through the controller, so this one path
        // reveals a while-scrolling bar for buttons, gestures, wheel, keys, timer and API.
        const scrollbar = this.#config.scrollbar;
        if (
          scrollbar &&
          scrollbar.visibility === 'while-scrolling' &&
          carouselScrollbarActivity(previous, snapshot)
        )
          this.#bar.activity();
        if (released) this.#notify(null);
        this.requestUpdate('index', this.getAttribute('index'));
        for (const [marker, value] of Object.entries({
          transitioning: snapshot.animating,
          locked: snapshot.locked,
          'autoplay-running': snapshot.autoplayRunning,
          'autoplay-paused': snapshot.autoplayPaused,
          virtual: !!snapshot.virtual,
        }))
          this.toggleAttribute(`data-${marker}`, value);
      }),
    );
    this.#scope?.add(
      controller.on('settled', (snapshot) => {
        if (
          snapshot.selectedId !== this.#lastAnnouncementId &&
          controller.lastReason !== 'automatic-advance'
        ) {
          this.#announcement =
            this.#config.messages.announce?.(snapshot) ?? this.#positionText(snapshot);
          this.requestUpdate();
        }
        this.#lastAnnouncementId = snapshot.selectedId;
      }),
    );
    this.#scope?.add(controller.on('reinitialized', () => this.#notify(this.controller)));
    this.#scope?.add(
      controller.on('initialized', () => {
        this.#autoplayReady = true;
      }),
    );
    void controller.initialize().then(() => {
      if (this.#controller === controller && this.isConnected) this.#notify(this.controller);
    });
  }
  #read(): CarouselInput {
    return {
      items: this.#records,
      options: this.options,
      orientation: this.orientation,
      loop: this.loop,
      itemsPerMovement: this.itemsPerMovement,
      autoplay: this.autoplay,
      disabled: this.disabled,
      readOnly: this.readOnly,
      direction: this.direction,
      ...(this.#initialIndexExplicit ? { index: this.#initialIndex } : {}),
      ...(this.value === undefined ? {} : { value: this.value }),
      ...(this.defaultValue === undefined ? {} : { defaultValue: this.defaultValue }),
    };
  }
  #validateOption(group: string, value: unknown): boolean {
    if (group === 'virtual') return !value || !!this.#dataMode;
    if (group === 'breakpointsBase')
      return (
        value === 'window' ||
        value === 'container' ||
        !!carouselTarget(value as CarouselConfiguration['breakpointsBase'], this)
      );
    if (!value || typeof value !== 'object') return true;
    const fields = value as Record<string, unknown>;
    for (const key of [
      'target',
      'handle',
      'noSwipeSelector',
      'ignoreSelector',
      'previousElement',
      'nextElement',
      'element',
      'thumbElement',
    ]) {
      const selector = fields[key];
      if (typeof selector === 'string' && selector !== 'root' && selector !== 'track')
        this.matches(selector);
    }
    return true;
  }
  #collect(): void {
    const children = Array.from(this.children).filter(
      (element): element is HTMLElement =>
        element.nodeType === 1 &&
        !['previous', 'next', 'indicators', 'controls', 'autoplay-control'].includes(
          this.#slots.get(element as HTMLElement)?.attributes.original('slot') ??
            element.getAttribute('slot') ??
            '',
        ),
    );
    const data = this.items !== undefined;
    if (!data && this.#dataMode && this.options.virtual && this.options.virtual.enabled !== false) {
      this.#diagnose(
        'Disable Carousel virtualization before switching from data to slots; retaining coherent data.',
      );
      return;
    }
    if (data && children.length) {
      this.#diagnose('Carousel data items and default slide children cannot be supplied together.');
      if (this.#dataMode !== undefined && this.#dataMode !== data) return;
    }
    this.#dataMode = data;
    if (data) {
      for (const slot of this.#slots.values()) slot.attributes.dispose();
      this.#slots.clear();
      const resolvers: CarouselItemResolvers<T> = {
        ...(this.getItemId ? { getItemId: this.getItemId } : {}),
        ...(this.getItemLabel ? { getItemLabel: this.getItemLabel } : {}),
        ...(this.getItemOptions ? { getItemOptions: this.getItemOptions } : {}),
      };
      try {
        this.#records = carouselItems(this.items!, resolvers, (message) => this.#diagnose(message));
      } catch (error) {
        this.#diagnose('Carousel item resolver failed; retaining coherent content.', error);
      }
      if (!this.renderItem && this.items!.some((item) => item !== null && typeof item === 'object'))
        this.#diagnose('Carousel object data requires renderItem.');
    } else {
      const live = new Set(children);
      for (const [element, slot] of this.#slots)
        if (!live.has(element)) {
          slot.attributes.dispose();
          this.#slots.delete(element);
        }
      const seen = new Set<CarouselId>();
      const records: CarouselItem[] = [];
      children.forEach((element, index) => {
        let slot = this.#slots.get(element);
        if (!slot) {
          let identity = this.#slotIdentities.get(element);
          if (!identity) {
            identity = createId('tp-carousel-item');
            this.#slotIdentities.set(element, identity);
          }
          slot = {
            id: identity,
            name: createId('tp-carousel-slot'),
            attributes: new OwnedAttributes(element),
          };
          this.#slots.set(element, slot);
        }
        const id = element.id || slot.id;
        if (seen.has(id)) {
          this.#diagnose(`Duplicate Carousel slide ID at source index ${index}.`);
          return;
        }
        seen.add(id);
        slot.attributes.set('slot', slot.name);
        const delay = Number(element.getAttribute('data-tp-autoplay-delay'));
        records.push(
          Object.freeze({
            id,
            index,
            value: element,
            element,
            label: element.getAttribute('aria-label') ?? `${index + 1}`,
            hidden:
              !!element.hidden ||
              this.ownerDocument.defaultView?.getComputedStyle(element).display === 'none',
            disabled: element.hasAttribute('disabled'),
            ...(Number.isFinite(delay) && delay > 0 ? { autoplayDelay: delay } : {}),
          }),
        );
      });
      this.#records = Object.freeze(records);
      if (this.#config.virtual) this.#diagnose('Carousel virtualization requires data mode.');
    }
    this.#cache.reset(this.renderItem);
    this.#cache.retain(new Set(this.#records.map((item) => item.id)));
    const ids = new Set(this.#records.map((item) => item.id));
    for (const id of this.#references.keys()) if (!ids.has(id)) this.#references.delete(id);
    if (this.#lastRenderer !== this.renderItem || this.#lastDataMode !== this.#dataMode) {
      this.#rendererGeneration = {};
      this.#lastRenderer = this.renderItem;
      this.#lastDataMode = this.#dataMode;
    }
  }
  #measure(config: CarouselConfiguration): CarouselGeometry {
    const elements = this.#elements;
    const window = this.ownerDocument.defaultView;
    let width = elements?.viewport.clientWidth ?? 0,
      height = elements?.viewport.clientHeight ?? 0;
    if (elements && window) {
      const style = window.getComputedStyle(elements.viewport);
      width -= parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      height -= parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    }
    width = config.layout.measurementOverride?.width ?? width;
    height = config.layout.measurementOverride?.height ?? height;
    let base: HTMLElement | null = null;
    if (config.breakpointsBase === 'container') base = this.#elements?.root ?? null;
    else if (config.breakpointsBase !== 'window')
      base = carouselTarget(config.breakpointsBase, this);
    if (config.breakpointsBase !== 'window' && !base)
      this.#diagnose('Carousel breakpoint base is unavailable.');
    const horizontal = config.orientation === 'horizontal';
    const measured = this.#records
      .filter((item) => !item.hidden)
      .map((item) => {
        let size =
          config.virtual && config.layout.itemsPerView === 'auto' ? config.virtual.itemSize : 0;
        const element = item.element ?? this.#shells.get(item.id)?.element;
        if (element && window && !(config.virtual && config.layout.itemsPerView === 'auto')) {
          const style = window.getComputedStyle(element);
          const raw = parseFloat(horizontal ? style.width : style.height);
          const padding = horizontal
            ? parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
            : parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
          const margin = horizontal
            ? parseFloat(style.marginLeft) + parseFloat(style.marginRight)
            : parseFloat(style.marginTop) + parseFloat(style.marginBottom);
          const border = horizontal
            ? parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth)
            : parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
          size = Number.isFinite(raw)
            ? raw + margin + (style.boxSizing === 'border-box' ? 0 : padding + border)
            : horizontal
              ? element.offsetWidth
              : element.offsetHeight;
        }
        return { index: item.index, size, disabled: item.disabled };
      });
    return {
      width,
      height,
      items: measured,
      source: config.layout.measurementOverride ? 'override' : 'observed',
      breakpointWidth:
        base?.clientWidth ?? (config.breakpointsBase === 'window' ? (window?.innerWidth ?? 0) : 0),
      breakpointHeight:
        base?.clientHeight ??
        (config.breakpointsBase === 'window' ? (window?.innerHeight ?? 0) : 0),
    };
  }
  async #project(snapshot: CarouselSnapshot, projection: CarouselProjection): Promise<void> {
    const focused = new EnvironmentService(this.ownerDocument).activeElement();
    if (
      [...this.#shells].some(
        ([id, shell]) =>
          composedContains(shell.element, focused) &&
          !projection.items.some((item) => item.id === id && !item.hidden),
      )
    )
      this.#elements?.viewport.focus({ preventScroll: true });
    const anchor =
      this.#projectedId === null ? undefined : this.#shells.get(this.#projectedId)?.element;
    const before = anchor?.getBoundingClientRect();
    const oldPosition = this.#transport?.position ?? 0;
    const oldOrder = [...this.#order];
    this.#snapshot = snapshot;
    this.#projection = projection;
    while (this.#fillers.length < projection.loop.fillers)
      this.#fillers.push(Symbol('carousel-filler'));
    this.#fillers.length = projection.loop.mode === 'continuous' ? projection.loop.fillers : 0;
    const ids: Array<CarouselId | symbol> = [
      ...projection.items.filter((item) => !item.hidden).map((item) => item.id),
      ...this.#fillers,
    ];
    const cycle = projection.layout.sizes.reduce(
      (sum, size) => sum + size + projection.layout.gap,
      0,
    );
    const minimum = projection.layout.snaps[0]?.position ?? 0;
    const normalizedPosition =
      projection.loop.mode === 'continuous' && cycle > 0
        ? ((((projection.position - minimum) % cycle) + cycle) % cycle) + minimum
        : projection.position;
    const previewIndex =
      projection.layout.snaps[closestCarouselSnap(projection.layout, normalizedPosition) ?? 0]
        ?.index;
    const placementId =
      Math.abs(snapshot.previewProgress - snapshot.progress) > 0.0001
        ? (projection.items.find((item) => item.index === previewIndex)?.id ?? snapshot.selectedId)
        : snapshot.selectedId;
    this.#order = this.#order.filter((id) => ids.includes(id));
    for (const id of ids) if (!this.#order.includes(id)) this.#order.push(id);
    if (projection.loop.mode === 'continuous' && placementId !== null) {
      const active = this.#order.indexOf(placementId);
      this.#order = [
        ...carouselLoopPermutation(
          this.#order,
          active,
          projection.loop,
          undefined,
          this.#config.layout.centered,
          projection.layout.before,
          projection.layout.positions.length > 1
            ? projection.layout.positions[1]! - projection.layout.positions[0]!
            : 1,
        ),
      ];
    } else this.#order = ids;
    this.requestUpdate();
    await this.updateComplete;
    if (!this.isConnected || this.#projection !== projection) return;
    const track = this.#elements?.track;
    if (!track) return;
    this.#trackStyles?.set('--tp-carousel-gap', `${projection.layout.gap}px`);
    const horizontal = snapshot.orientation === 'horizontal';
    const native = this.#config.transport === 'scroll';
    const contentExtent = projection.layout.sizes.reduce(
      (sum, size) => sum + size + projection.layout.gap,
      -projection.layout.gap,
    );
    const nativeBefore = native ? Math.max(0, -(projection.layout.snaps[0]?.position ?? 0)) : 0;
    const nativeAfter = native
      ? Math.max(
          0,
          (projection.layout.snaps.at(-1)?.position ?? 0) +
            (horizontal ? this.#measure(this.#config).width : this.#measure(this.#config).height) -
            contentExtent,
        )
      : 0;
    this.#trackStyles?.set('padding-inline-start', horizontal ? `${nativeBefore}px` : '0px');
    this.#trackStyles?.set('padding-inline-end', horizontal ? `${nativeAfter}px` : '0px');
    this.#trackStyles?.set('padding-top', horizontal ? '0px' : `${nativeBefore}px`);
    this.#trackStyles?.set('padding-bottom', horizontal ? '0px' : `${nativeAfter}px`);
    let physical = 0;
    this.#physicalOffset = 0;
    const full = carouselVisible(
      projection.layout,
      projection.position,
      horizontal ? this.#measure(this.#config).width : this.#measure(this.#config).height,
      true,
    );
    const active = new EnvironmentService(this.ownerDocument).activeElement();
    for (const id of this.#order) {
      if (typeof id === 'symbol') {
        physical += (projection.layout.sizes.at(-1) ?? 0) + projection.layout.gap;
        continue;
      }
      const item = projection.items.find((item) => item.id === id);
      if (!item) continue;
      const ordinal = projection.layout.indices.indexOf(item.index),
        size = projection.layout.sizes[ordinal] ?? 0;
      if (id === placementId)
        this.#physicalOffset =
          physical -
          (projection.layout.starts[ordinal] ?? 0) -
          (projection.position - normalizedPosition);
      const shell = this.#shells.get(id);
      if (shell) {
        shell.styles.set('width', horizontal ? `${size}px` : '100%');
        shell.styles.set('height', horizontal ? 'auto' : `${size}px`);
        shell.styles.set('position', snapshot.virtual ? 'absolute' : 'relative');
        shell.styles.set(
          'inset-inline-start',
          snapshot.virtual && horizontal ? `${physical + nativeBefore}px` : 'auto',
        );
        shell.styles.set(
          'top',
          snapshot.virtual && !horizontal ? `${physical + nativeBefore}px` : 'auto',
        );
        const visible = snapshot.visibleIds.includes(id);
        const pinnedFocus =
          snapshot.virtual?.pinnedId === id && composedContains(shell.element, active);
        if (
          !visible &&
          !pinnedFocus &&
          active &&
          (composedContains(shell.element, active) ||
            (item.element && composedContains(item.element, active)))
        )
          this.#elements?.viewport.focus({ preventScroll: true });
        shell.attributes.set(
          'inert',
          (visible || pinnedFocus || !snapshot.measured) && !this.#tabInert.has(id)
            ? shell.attributes.original('inert')
            : '',
        );
        shell.attributes.set('data-visible', visible ? '' : null);
        shell.attributes.set('data-fully-visible', full.includes(item.index) ? '' : null);
      }
      physical += size + projection.layout.gap;
    }
    if (projection.loop.mode !== 'continuous') this.#physicalOffset = 0;
    if (
      projection.loop.mode === 'continuous' &&
      before &&
      anchor?.isConnected &&
      oldOrder.some((id, index) => this.#order[index] !== id)
    ) {
      const after = anchor.getBoundingClientRect();
      const delta = horizontal
        ? (after.left - before.left) * (snapshot.direction === 'rtl' ? -1 : 1)
        : after.top - before.top;
      await this.#transport?.compensate(oldPosition + delta);
      if (this.#projection !== projection) return;
    }
    this.#projectedId = placementId;
    if (snapshot.virtual) {
      this.#trackStyles?.set(
        'width',
        horizontal
          ? `${Math.max(0, physical - projection.layout.gap) + nativeBefore + nativeAfter}px`
          : '100%',
      );
      this.#trackStyles?.set(
        'height',
        horizontal
          ? `${Math.max(0, ...[...this.#shells.values()].map((shell) => shell.element.offsetHeight))}px`
          : `${Math.max(0, physical - projection.layout.gap) + nativeBefore + nativeAfter}px`,
      );
    } else {
      this.#trackStyles?.set('width', 'auto');
      this.#trackStyles?.set('height', 'auto');
    }
    if (this.#config.layout.autoHeight && horizontal) {
      const acceptedIndices = carouselVisible(
        projection.layout,
        projection.layout.snaps[snapshot.snapIndex ?? 0]?.position ?? 0,
        this.#measure(this.#config).width,
        false,
        projection.loop.mode === 'continuous',
      );
      const heights = projection.items
        .filter((item) => acceptedIndices.includes(item.index))
        .map(
          (item) =>
            (item.element ?? this.#shells.get(item.id)?.element)?.getBoundingClientRect().height ??
            0,
        );
      if (heights.length)
        void this.#transport?.autoHeight(Math.max(...heights), snapshot.snapIndex);
    }
    this.#bar.measure();
    this.#preload();
  }
  #bind(controller: CarouselController): () => void {
    const scope = new CleanupScope(),
      elements = this.#elements;
    if (!elements) return () => {};
    try {
      for (const selector of [
        this.#config.interaction.noSwipeSelector,
        this.#config.mousewheel ? this.#config.mousewheel.ignoreSelector : null,
      ])
        if (selector) this.matches(selector);
      bindCarouselKeyboard(controller, elements, scope);
      bindCarouselWheel(controller, elements, scope);
      bindCarouselGesture(controller, elements, scope, (dragging) => {
        this.#dragging = dragging;
        this.toggleAttribute('data-dragging', dragging);
        this.requestUpdate();
      });
      this.#transport?.bind(scope);
    } catch (error) {
      this.#diagnose(
        'Invalid Carousel input target or selector; input binding was released.',
        error,
      );
      scope.dispose();
      return () => {};
    }
    const window = this.ownerDocument.defaultView;
    if (window?.ResizeObserver && this.#config.observation.resizeObserver) {
      const observer = new window.ResizeObserver((entries) => {
        let changed = false;
        for (const entry of entries) {
          const box = Array.isArray(entry.contentBoxSize)
            ? entry.contentBoxSize[0]
            : (entry.contentBoxSize as unknown as ResizeObserverSize);
          const signature = `${box?.inlineSize ?? entry.contentRect.width}:${box?.blockSize ?? entry.contentRect.height}`;
          if (this.#resizeSizes.get(entry.target) !== signature) {
            this.#resizeSizes.set(entry.target, signature);
            changed = true;
          }
        }
        if (changed) this.#schedule();
      });
      observer.observe(elements.viewport);
      for (const item of this.#records) if (item.element) observer.observe(item.element);
      scope.add(() => observer.disconnect());
    }
    if (window && this.#config.observation.windowResize) {
      scope.listen(window, 'resize', () => this.#schedule());
      const resize = () => this.#schedule();
      window.addEventListener('orientationchange', resize);
      scope.add(() => window.removeEventListener('orientationchange', resize));
    }
    if (window?.MutationObserver && this.#config.observation.observeParents) {
      const observer = new window.MutationObserver(() => this.#schedule());
      for (let parent = this.parentElement; parent; parent = parent.parentElement)
        observer.observe(parent, {
          attributes: true,
          attributeFilter: ['class', 'style', 'hidden', 'dir'],
        });
      scope.add(() => observer.disconnect());
    }
    if (window?.MutationObserver && this.#config.observation.observeItemSubtree) {
      const observer = new window.MutationObserver(() => this.#schedule());
      for (const item of this.#records)
        if (item.element)
          observer.observe(item.element, { childList: true, subtree: true, characterData: true });
      scope.add(() => observer.disconnect());
    }
    // Hide-on-click controls return on a new hover or keyboard focus entry. Touch
    // contact and pointer-initiated focus precede the click itself, so they would
    // immediately undo the click's own toggle; touch users toggle by tapping again.
    let pointerFocus = false;
    let releasePointerFocus: (() => void) | undefined;
    scope.add(() => releasePointerFocus?.());
    scope.listen(
      elements.root,
      'pointerdown',
      () => {
        pointerFocus = true;
        releasePointerFocus?.();
        releasePointerFocus = this.#scheduler?.timeout(() => {
          pointerFocus = false;
        }, 0);
      },
      { capture: true },
    );
    scope.listen(elements.root, 'pointerenter', (event) => {
      controller.autoplay.setReason('hover', true);
      this.#bar.hover(true);
      if ((event as PointerEvent).pointerType !== 'touch') this.#reshowControls();
    });
    scope.listen(elements.root, 'focusin', (event) => {
      const from = (event as FocusEvent).relatedTarget as Node | null;
      if (!pointerFocus && (!from || !composedContains(elements.root, from)))
        this.#reshowControls();
    });
    scope.listen(elements.root, 'pointerleave', () => {
      controller.autoplay.setReason('hover', false);
      this.#bar.hover(false);
    });
    this.#bindFocus(controller, elements, scope);
    scope.listen(elements.root, 'focusout', () =>
      queueMicrotask(() => {
        if (!elements.root.matches(':focus-within')) controller.autoplay.setReason('focus', false);
      }),
    );
    const environment = () => {
      controller.autoplay.setReason('hidden', this.ownerDocument.hidden);
      controller.autoplay.setReason('reduced-motion', resolvesReducedMotion(this));
    };
    this.ownerDocument.addEventListener('visibilitychange', environment);
    scope.add(() => this.ownerDocument.removeEventListener('visibilitychange', environment));
    const media = window?.matchMedia('(prefers-reduced-motion: reduce)');
    if (media) {
      media.addEventListener('change', environment);
      scope.add(() => media.removeEventListener('change', environment));
    }
    controller.autoplay.setReason('focus', elements.root.matches(':focus-within'));
    controller.autoplay.setReason('hover', elements.root.matches(':hover'));
    environment();
    for (const action of ['previous', 'next'] as const) {
      const target = this.#config.navigation[`${action}Element`];
      const slotted = this.querySelector<HTMLElement>(`:scope > [slot="${action}"]`);
      if (!target && !slotted) continue;
      const element = target ? carouselTarget(target, this) : slotted;
      if (!element) {
        this.#diagnose(`Carousel ${action} target is unavailable.`);
        continue;
      }
      const attributes = new OwnedAttributes(element);
      scope.add(() => attributes.dispose());
      if (!element.hasAttribute('aria-label') || this.options.messages?.[action])
        attributes.set('aria-label', this.#config.messages[action]);
      const update = () => {
        const available =
          action === 'previous'
            ? controller.snapshot.canScrollPrevious
            : controller.snapshot.canScrollNext;
        attributes.set('disabled', available ? null : '');
        attributes.set('aria-disabled', available ? null : 'true');
      };
      scope.add(controller.subscribe(update));
      scope.listen(element, 'click', (event) => {
        if (!event.defaultPrevented)
          void controller[action]({ reason: 'trigger-press', sourceEvent: event });
      });
    }
    if (this.#config.scrollbar && this.#config.scrollbar.element) {
      const element = carouselTarget(this.#config.scrollbar.element, this);
      if (element) {
        const attributes = new OwnedAttributes(element);
        scope.add(() => attributes.dispose());
        scope.listen(element, 'pointerdown', this.#bar.pointerDown);
        scope.listen(element, 'keydown', this.#scrollbarKey);
        scope.listen(element, 'focusin', () => {
          this.#bar.focus(true);
          controller.autoplay.setReason('scrollbar-focus', true);
        });
        scope.listen(element, 'focusout', () => {
          this.#bar.focus(false);
          controller.autoplay.setReason('scrollbar-focus', false);
        });
        scope.listen(element, 'pointerenter', () => this.#bar.hover(true));
        scope.listen(element, 'pointerleave', () => this.#bar.hover(false));
        scope.add(
          controller.subscribe((snapshot) => {
            const interactive = !!this.#config.scrollbar && this.#config.scrollbar.draggable;
            attributes.set('role', interactive ? 'scrollbar' : null);
            attributes.set(
              'tabindex',
              interactive && !this.disabled && !this.readOnly ? '0' : '-1',
            );
            attributes.set('aria-label', this.#config.messages.scrollbar);
            attributes.set('aria-orientation', snapshot.orientation);
            attributes.set('aria-controls', this.#viewportId);
            const value = carouselScrollbarValue(this.#config.messages.position, snapshot);
            attributes.set('aria-valuemin', String(value.min));
            attributes.set('aria-valuemax', String(value.max));
            attributes.set('aria-valuenow', String(value.now));
            attributes.set('aria-valuetext', interactive ? value.text : null);
          }),
        );
      }
    }
    return () => scope.dispose();
  }
  #schedule(): void {
    if (!this.isConnected) return;
    this.#refresh?.();
    this.#refresh = this.#scheduler?.animationFrame(() => {
      this.#refresh = undefined;
      this.#collect();
      if (this.#controller) void this.#controller.update();
      else this.#initialize();
    });
  }
  #preload(): void {
    if (!this.#config.loading.preload || !this.#snapshot || this.#snapshot.selectedIndex === null)
      return;
    const current = this.#records.findIndex((item) => item.id === this.#snapshot?.selectedId),
      count = this.#records.length;
    const visited = new Set<CarouselId>();
    for (
      let delta = -this.#config.loading.adjacent;
      delta <= this.#config.loading.adjacent;
      delta++
    ) {
      let index = current + delta;
      if (this.loop && count) index = ((index % count) + count) % count;
      const item = this.#records[index];
      if (!item || visited.has(item.id)) continue;
      visited.add(item.id);
      const content = item.element ?? this.#shells.get(item.id)?.element;
      for (const image of content?.querySelectorAll('img') ?? [])
        if (image.loading === 'lazy' && !image.complete) {
          const preload = this.ownerDocument.createElement('link');
          preload.rel = 'preload';
          preload.as = 'image';
          preload.href = image.currentSrc || image.src;
          if (preload.href && !this.#preloaded.has(preload.href)) {
            this.#preloaded.add(preload.href);
            this.ownerDocument.head.append(preload);
            this.#scope?.add(() => preload.remove());
          }
        }
    }
  }
  #notify(controller: CarouselController | null): void {
    if (this.#lastCallback === this.onControllerChange && this.#notifiedController === controller)
      return;
    this.#lastCallback = this.onControllerChange;
    this.#notifiedController = controller;
    try {
      this.onControllerChange?.(controller);
    } catch (error) {
      this.#diagnose('Carousel controller callback failed.', error);
    }
  }
  #diagnose(message: string, error?: unknown): void {
    if (this.#diagnostics.has(message)) return;
    this.#diagnostics.add(message);
    this.dispatchEvent(
      new CustomEvent('tp-diagnostic', {
        detail: { code: 'carousel', message, error },
        bubbles: true,
        composed: true,
      }),
    );
  }
  #shellReference(id: CarouselId): (element: HTMLElement | null) => void {
    let reference = this.#references.get(id);
    if (reference) return reference;
    reference = (element) => {
      const previous = this.#shells.get(id);
      if (previous?.element === element) return;
      if (previous) {
        previous.styles.dispose();
        previous.attributes.dispose();
        previous.unregister();
        this.#shells.delete(id);
      }
      if (element)
        this.#shells.set(id, {
          element,
          styles: new OwnedStyles(element),
          attributes: new OwnedAttributes(element),
          unregister: this.#collection.register({
            element,
            order: () => this.#records.find((item) => item.id === id)?.index ?? 0,
            eligible: () => !!this.#snapshot?.visibleIds.includes(id),
          }),
        });
    };
    this.#references.set(id, reference);
    return reference;
  }
  #actionReference(part: string, key = part): (element: HTMLElement | null) => void {
    let reference = this.#actionRefs.get(key);
    if (reference) return reference;
    reference = (element) => {
      this.#partReleases.get(key)?.();
      this.#partReleases.delete(key);
      if (element)
        this.#partReleases.set(key, this.presentationController.registerPart(part, element));
    };
    this.#actionRefs.set(key, reference);
    return reference;
  }
  #state(): PartState {
    return Object.freeze({
      orientation: this.#snapshot?.orientation ?? this.orientation,
      direction: this.direction,
      disabled: this.disabled,
      readOnly: this.readOnly,
      selectedIndex: this.#snapshot?.selectedIndex ?? null,
      dragging: this.#dragging,
      transitioning: this.#snapshot?.animating ?? false,
      locked: this.#snapshot?.locked ?? true,
    });
  }
  #positionText(snapshot = this.#snapshot): string {
    return carouselPositionText(this.#config.messages.position, snapshot);
  }
  #reshowControls(): void {
    if (!this.#navigationHidden && !this.#indicatorsHidden) return;
    this.#navigationHidden = false;
    this.#indicatorsHidden = false;
    this.requestUpdate();
  }
  #button(
    part: string,
    label: string,
    disabled: boolean,
    click: (event: Event) => void,
    content: unknown,
    action?: string,
  ): unknown {
    return this.renderPart(part, this.#state(), {
      tag: 'tp-button',
      properties: {
        class: action ?? part,
        part: action ?? part,
        type: 'button',
        variant: 'outline',
        size: action && this.#config.navigation.icons ? 'icon-sm' : 'sm',
        '.ariaLabel': label,
        '.disabled': disabled,
        exportparts: `button: ${part}${action ? `, button: ${action}` : ''}`,
        '@click': click,
        '.partContracts': { button: { elementReference: this.#actionReference(part) } },
      },
      protectedProperties: ['.partContracts'],
      content,
    });
  }
  #navigation(action: 'previous' | 'next'): unknown {
    const config = this.#config.navigation;
    if (!config.enabled || !config[action] || config[`${action}Element`] || this.#navigationHidden)
      return nothing;
    if (this.querySelector(`:scope > [slot="${action}"]`))
      return html`<slot name=${action} @slotchange=${() => this.#schedule()}></slot>`;
    const disabled = !(action === 'previous'
      ? this.#snapshot?.canScrollPrevious
      : this.#snapshot?.canScrollNext);
    return this.#button(
      `carousel-${action}`,
      this.#config.messages[action],
      disabled,
      (event) => {
        if (!event.defaultPrevented)
          void this.#controller?.[action]({ reason: 'trigger-press', sourceEvent: event });
      },
      config.icons
        ? html`<tp-icon
            slot="icon-start"
            class="arrow"
            data-action=${action}
            data-direction=${this.direction}
            data-orientation=${this.#config.orientation}
            .icon=${chevronRightIcon}
            size="1em"
          ></tp-icon>`
        : this.#config.messages[action],
      action,
    );
  }
  #indicators(): unknown {
    const dynamicIndex = this.#dynamicBulletIndex,
      previousBullet = this.#previousBullet;
    return this.#indicatorGuard.render(
      () => this.#renderIndicators(),
      nothing,
      (error) => {
        // Cancel the failed render, including its dynamic-window bookkeeping.
        this.#dynamicBulletIndex = dynamicIndex;
        this.#previousBullet = previousBullet;
        this.#diagnose(
          'Carousel indicator renderer or formatter failed; previous indicator content retained.',
          error,
        );
      },
    );
  }
  #renderIndicators(): unknown {
    const config = this.#config.indicators,
      snapshot = this.#snapshot;
    if (!config || !snapshot || this.#indicatorsHidden) return nothing;
    if (this.querySelector(':scope > [slot="indicators"]'))
      return html`<slot name="indicators" @slotchange=${() => this.#schedule()}></slot>`;
    const current = snapshot.snapIndex ?? 0,
      count = snapshot.snapCount;
    if (config.dynamic && this.#previousBullet !== undefined && config.dynamicCount > 1)
      this.#dynamicBulletIndex = Math.max(
        0,
        Math.min(
          config.dynamicCount - 1,
          this.#dynamicBulletIndex + current - this.#previousBullet,
        ),
      );
    if (!config.dynamic) this.#dynamicBulletIndex = 0;
    this.#previousBullet = current;
    const firstMain = Math.max(0, current - this.#dynamicBulletIndex);
    const lastMain = firstMain + Math.min(count, config.dynamicCount) - 1;
    let content: unknown;
    if (config.type === 'fraction')
      content = this.renderPart('carousel-status', this.#state(), {
        tag: 'span',
        properties: { part: 'carousel-status status' },
        content:
          this.#config.messages.status?.(snapshot) ??
          `${config.formatCurrent(count ? current + 1 : 0)} / ${config.formatTotal(count)}`,
      });
    else if (config.type === 'progress')
      content = html`<tp-progress
        class=${(this.#config.orientation === 'vertical') !== config.opposite ? 'progress-vertical' : ''}
        .value=${count ? ((current + 1) / count) * 100 : 0}
        .label=${this.#config.messages.scrollbar}
        .partPresentation=${
          (this.#config.orientation === 'vertical') !== config.opposite
            ? {
                'progress-track': {
                  styleHook: {
                    'writing-mode': 'vertical-lr',
                    height: '100%',
                    width: 'var(--tp-space-1)',
                    'inline-size': '100%',
                    'block-size': 'var(--tp-space-1)',
                  },
                },
              }
            : {}
        }
      ></tp-progress>`;
    else if (config.type === 'custom') content = config.renderCustom?.(snapshot);
    else
      content = Array.from({ length: count }, (_, index) => {
        const context = Object.freeze({
          index,
          count,
          current: current === index,
          sourceIndex: this.#projection?.layout.snaps[index]?.index ?? 0,
        });
        const hidden = config.dynamic && (index < firstMain - 2 || index > lastMain + 2);
        if (hidden) return nothing;
        const distance =
          index < firstMain ? firstMain - index : index > lastMain ? index - lastMain : 0;
        const bulletClass = `bullet${config.dynamic && distance ? (distance === 1 ? ' bullet-near' : ' bullet-far') : ''}`;
        const label = this.#config.messages.position(index + 1, count);
        const inner =
          config.renderIndicator?.(context) ??
          html`<span class=${bulletClass} aria-hidden="true"></span>`;
        return config.clickable
          ? this.renderPart(
              'carousel-indicator',
              { ...this.#state(), ...context },
              {
                tag: 'tp-button',
                properties: {
                  type: 'button',
                  variant: 'ghost',
                  size: 'icon-xs',
                  '.ariaLabel': label,
                  '.disabled': this.disabled || this.readOnly,
                  part: '',
                  exportparts: 'button: carousel-indicator',
                  '.partContracts': {
                    button: {
                      hostProperties: {
                        'aria-current': current === index ? 'true' : undefined,
                        'data-current': String(current === index),
                      },
                      elementReference: this.#actionReference(
                        'carousel-indicator',
                        `carousel-indicator-${index}`,
                      ),
                    },
                  },
                  'data-current': current === index,
                  '@click': (event: Event) => {
                    if (!event.defaultPrevented)
                      void this.#controller?.scrollToIndex(context.sourceIndex, {
                        reason: 'item-press',
                        sourceEvent: event,
                      });
                  },
                },
                protectedProperties: ['.partContracts'],
                content: inner,
              },
            )
          : html`<span
              role="img"
              class=${bulletClass}
              data-current=${String(current === index)}
              aria-label=${label}
              >${config.renderIndicator?.(context) ?? nothing}</span
            >`;
      });
    return this.renderPart('carousel-indicator', this.#state(), {
      properties: {
        class: 'indicators',
        'data-type': config.type,
        role: config.type === 'bullets' ? 'group' : nothing,
        'aria-label': config.type === 'bullets' ? this.#positionText() : nothing,
      },
      content,
    });
  }
  #syncVisibility(): void {
    const snapshot = this.#snapshot;
    if (!snapshot) return;
    const active = new EnvironmentService(this.ownerDocument).activeElement();
    for (const [id, shell] of this.#shells) {
      const visible = snapshot.visibleIds.includes(id);
      const item = this.#records.find((item) => item.id === id);
      const pinnedFocus =
        snapshot.virtual?.pinnedId === id && composedContains(shell.element, active);
      if (
        !visible &&
        !pinnedFocus &&
        snapshot.measured &&
        active &&
        (composedContains(shell.element, active) ||
          (item?.element && composedContains(item.element, active)))
      )
        this.#elements?.viewport.focus({ preventScroll: true });
      shell.attributes.set(
        'inert',
        (visible || pinnedFocus || !snapshot.measured) && !this.#tabInert.has(id)
          ? shell.attributes.original('inert')
          : '',
      );
      shell.attributes.set('data-visible', visible ? '' : null);
    }
  }
  #bindFocus(
    controller: CarouselController,
    elements: CarouselElements,
    scope: CleanupScope,
  ): void {
    let active = true;
    const release = () => {
      this.#tabInert.clear();
      this.#syncVisibility();
    };
    scope.add(() => {
      active = false;
      release();
    });
    scope.listen(
      elements.root,
      'keydown',
      (event) => {
        if (
          event.key !== 'Tab' ||
          event.defaultPrevented ||
          controller.snapshot.loopMode !== 'continuous'
        )
          return;
        const target = event.composedPath()[0] as Node | undefined;
        const item = this.#records.find((item) => {
          const shell = this.#shells.get(item.id)?.element;
          return !!target && !!shell && composedContains(shell, target);
        });
        const eligible = this.#records.filter((record) => !record.hidden && !record.disabled);
        if (!item || item.id !== (event.shiftKey ? eligible[0] : eligible.at(-1))?.id) return;
        release();
        for (const [id, shell] of this.#shells) {
          if (id === item.id || shell.element.hasAttribute('inert')) continue;
          this.#tabInert.add(id);
          shell.attributes.set('inert', '');
        }
        scope.add(this.#scheduler!.timeout(release, 0));
      },
      { capture: true },
    );
    scope.listen(elements.root, 'focusin', (event) => {
      controller.autoplay.setReason('focus', true);
      const target = event.composedPath()[0] as Node | undefined;
      const item = this.#records.find((item) => {
        const shell = this.#shells.get(item.id)?.element;
        return !!target && !!shell && composedContains(shell, target);
      });
      if (!item || controller.snapshot.visibleIds.includes(item.id)) return;
      void controller
        .scrollToId(item.id, { reason: 'focus', speed: 0, sourceEvent: event })
        .then((result) => {
          if (!active || this.#controller !== controller || result.status !== 'rejected') return;
          const focused = new EnvironmentService(this.ownerDocument).activeElement();
          const shell = this.#shells.get(item.id)?.element;
          if (shell && composedContains(shell, focused))
            elements.viewport.focus({ preventScroll: true });
        });
    });
  }
  #entryPosition(id: CarouselId | symbol): number {
    const layout = this.#projection?.layout;
    if (!layout) return 0;
    let position =
      this.#config.transport === 'scroll' ? Math.max(0, -(layout.snaps[0]?.position ?? 0)) : 0;
    for (const key of this.#order) {
      if (key === id) break;
      const item = this.#records.find((item) => item.id === key);
      const size =
        typeof key === 'symbol'
          ? layout.sizes.at(-1)
          : layout.sizes[layout.indices.indexOf(item?.index ?? -1)];
      position += (size ?? 0) + layout.gap;
    }
    return position;
  }
  #renderFiller(id: symbol): unknown {
    const horizontal = this.#config.orientation === 'horizontal';
    const size = this.#projection?.layout.sizes.at(-1) ?? 0;
    const virtual = !!this.#snapshot?.virtual;
    return html`<div
      class="item"
      inert
      aria-hidden="true"
      ${bindPart({
        style: {
          width: horizontal ? `${size}px` : '100%',
          height: horizontal ? '0px' : `${size}px`,
          position: virtual ? 'absolute' : 'relative',
          ...(virtual
            ? horizontal
              ? { insetInlineStart: `${this.#entryPosition(id)}px` }
              : { top: `${this.#entryPosition(id)}px` }
            : {}),
        },
      })}
    ></div>`;
  }
  #renderItem(item: CarouselItem): unknown {
    const snapshot = this.#snapshot,
      projection = this.#projection;
    const context: CarouselRenderContext = Object.freeze({
      id: item.id,
      index: item.index,
      selected: snapshot?.selectedId === item.id,
      visible: snapshot?.visibleIds.includes(item.id) ?? false,
      preview: snapshot?.visibleIds.includes(item.id) === true && snapshot?.selectedId !== item.id,
    });
    const ordinal = projection?.layout.indices.indexOf(item.index) ?? -1;
    const size = ordinal >= 0 ? projection?.layout.sizes[ordinal] : undefined;
    let content: unknown;
    if (item.element)
      content = html`<slot name=${this.#slots.get(item.element)?.name ?? ''}></slot>`;
    else {
      try {
        content = this.renderItem
          ? this.renderItem(item.value as T, context)
          : typeof item.value === 'string' || typeof item.value === 'number'
            ? String(item.value)
            : nothing;
      } catch (error) {
        this.#diagnose('Carousel renderer failed.', error);
        content = nothing;
      }
    }
    return this.renderPart(
      'carousel-item',
      { ...this.#state(), ...context },
      {
        properties: {
          class: 'item',
          role: 'group',
          'aria-roledescription': this.#config.messages.slide,
          'aria-label': `${item.label}${item.label ? ', ' : ''}${this.#config.messages.position(item.index + 1, this.#records.length)}`,
          'data-selected': context.selected,
          'data-disabled': item.disabled,
          'data-snap': projection?.layout.snaps.some((snap) => snap.index === item.index) ?? false,
          '@click': (event: Event) => {
            if (
              this.#config.interaction.navigateOnItemClick &&
              !event.defaultPrevented &&
              !carouselInteractive(event, event.currentTarget as HTMLElement)
            )
              void this.#controller?.scrollToId(item.id, {
                reason: 'item-press',
                sourceEvent: event,
              });
          },
          style:
            size === undefined
              ? {}
              : {
                  ...(this.#config.orientation === 'horizontal'
                    ? { width: `${size}px` }
                    : { height: `${size}px` }),
                  ...(snapshot?.virtual
                    ? {
                        position: 'absolute',
                        ...(this.#config.orientation === 'horizontal'
                          ? { insetInlineStart: `${this.#entryPosition(item.id)}px` }
                          : { top: `${this.#entryPosition(item.id)}px` }),
                      }
                    : {}),
                },
        },
        reference: this.#shellReference(item.id),
        content,
      },
    );
  }
  readonly #scrollbarKey = (event: KeyboardEvent): void => {
    const config = this.#config.scrollbar;
    if (
      event.defaultPrevented ||
      !config ||
      !config.draggable ||
      this.disabled ||
      this.readOnly ||
      event.isComposing ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey
    )
      return;
    const current = this.#snapshot?.snapIndex ?? 0;
    const previous =
      this.#config.orientation === 'vertical'
        ? 'ArrowUp'
        : this.direction === 'rtl'
          ? 'ArrowRight'
          : 'ArrowLeft';
    const next =
      this.#config.orientation === 'vertical'
        ? 'ArrowDown'
        : this.direction === 'rtl'
          ? 'ArrowLeft'
          : 'ArrowRight';
    const index =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? (this.#snapshot?.snapCount ?? 1) - 1
          : event.key === previous || event.key === 'PageUp'
            ? current - 1
            : event.key === next || event.key === 'PageDown'
              ? current + 1
              : current;
    const snap = this.#projection?.layout.snaps[index];
    if (snap && index !== current) {
      event.preventDefault();
      void this.#controller?.scrollToIndex(snap.index, { reason: 'keyboard', sourceEvent: event });
    }
  };
  #renderScrollbar(): unknown {
    const config = this.#config.scrollbar;
    if (!config || !config.enabled || config.element) return nothing;
    const value = carouselScrollbarValue(this.#config.messages.position, this.#snapshot);
    return renderScrollbar(this, this.#bar, this.#state(), {
      trackPart: 'carousel-scrollbar',
      thumbPart: 'carousel-thumb',
      properties: {
        class: 'scrollbar tp-scrollbar',
        'aria-hidden': config.draggable ? nothing : 'true',
        role: config.draggable ? 'scrollbar' : nothing,
        tabindex: config.draggable && !this.disabled && !this.readOnly ? 0 : -1,
        'aria-label': this.#config.messages.scrollbar,
        'aria-controls': this.#viewportId,
        'aria-orientation': this.#config.orientation,
        'aria-valuemin': value.min,
        'aria-valuemax': value.max,
        'aria-valuenow': value.now,
        'aria-valuetext': config.draggable ? value.text : nothing,
        '@keydown': this.#scrollbarKey,
      },
    });
  }
  #animateScrollbar(): void {
    const visible = this.#bar.visible;
    if (visible === this.#barVisible) return;
    const previous = this.#barVisible;
    this.#barVisible = visible;
    const target = this.renderRoot.querySelector<HTMLElement>('.scrollbar');
    if (!target) return;
    this.#barMotion?.cancel();
    const motion = prepareMotion(
      this,
      target,
      carouselMotionRoles.scrollbarVisibility,
      carouselScrollbarVisibilityMotion(previous, visible, this.#config.orientation),
      {
        play: () => {
          const animation = target.animate(
            [{ opacity: previous ? 1 : 0 }, { opacity: visible ? 1 : 0 }],
            carouselMotionTiming(this, visible ? 0 : 400),
          );
          return {
            finished: animation.finished.then(() => undefined),
            cancel: () => animation.cancel(),
          };
        },
      },
    );
    this.#barMotion = motion;
    motion.start();
  }
  protected override render(): unknown {
    const state = this.#state(),
      config = this.#config;
    const records = this.#order.length
      ? this.#order
          .map((id) => (typeof id === 'symbol' ? id : this.#records.find((item) => item.id === id)))
          .filter((item): item is CarouselItem | symbol => item !== undefined)
      : this.#records;
    const mounted = this.#snapshot?.virtual?.mountedIds;
    const selected = mounted
      ? records.filter((item) => typeof item === 'symbol' || mounted.includes(item.id))
      : records;
    // The label names the action for the actual timer state, including finite-end
    // and stopAfterInteraction stops; Resume restarts a stopped timer.
    const autoplayAction =
      this.#controller && this.#autoplayReady
        ? carouselAutoplayAction(this.#controller.autoplay)
        : 'pause';
    const auto =
      this.autoplay > 0
        ? this.#button(
            'carousel-autoplay-control',
            config.messages[autoplayAction],
            this.disabled || this.readOnly,
            () => {
              if (this.#controller) toggleCarouselAutoplay(this.#controller.autoplay);
            },
            config.messages[autoplayAction],
          )
        : nothing;
    const track = this.renderPart('carousel-track', state, {
      properties: {
        class: 'track carousel-track',
        part: 'carousel-track track',
        'data-orientation': config.orientation,
        'data-centered': config.layout.centered,
        'data-draggable': config.transport === 'transform' && config.interaction.enabled,
        'data-grab': config.interaction.grabCursor,
        'data-dragging': this.#dragging,
      },
      content: keyed(
        this.#rendererGeneration,
        config.virtual && config.virtual.cache
          ? repeat(
              records,
              (item) => (typeof item === 'symbol' ? item : item.id),
              (item) =>
                typeof item === 'symbol'
                  ? this.#renderFiller(item)
                  : keyed(
                      this.#cache.render(item.id, item.value, () => ({}), true),
                      cache(
                        !mounted || mounted.includes(item.id)
                          ? html`${this.#renderItem(item)}`
                          : nothing,
                      ),
                    ),
            )
          : repeat(
              selected,
              (item) => (typeof item === 'symbol' ? item : item.id),
              (item) =>
                typeof item === 'symbol' ? this.#renderFiller(item) : this.#renderItem(item),
            ),
      ),
    });
    const viewport = this.renderPart('carousel-viewport', state, {
      properties: {
        class: 'viewport',
        part: 'carousel-viewport viewport',
        id: this.#viewportId,
        tabindex: 0,
        'data-orientation': config.orientation,
        'data-transport': config.transport,
      },
      content: track,
    });
    const controls =
      config.navigation.enabled || config.indicators
        ? this.renderPart('carousel-controls', state, {
            properties: {
              class: 'controls',
              part: 'carousel-controls controls',
              'data-placement': config.navigation.placement,
              'data-orientation': config.orientation,
            },
            content: html`${this.#navigation('previous')}${this.#indicators()}${this.#navigation('next')}`,
          })
        : nothing;
    return this.renderPart('carousel', state, {
      tag: 'section',
      properties: {
        class: 'root',
        part: 'carousel root',
        role: 'region',
        'aria-roledescription': 'carousel',
        'aria-label': this.ariaLabel || this.label || nothing,
        '@click': (event: Event) => {
          const navigation = config.navigation.hideOnClick,
            indicators = !!config.indicators && config.indicators.hideOnClick;
          const root = event.currentTarget as HTMLElement;
          if (
            (!navigation && !indicators) ||
            carouselHideOnClickIgnored(event, root, [
              root.querySelector('.controls'),
              root.querySelector('.scrollbar'),
              config.scrollbar && config.scrollbar.element
                ? carouselTarget(config.scrollbar.element, this)
                : null,
            ])
          )
            return;
          if (navigation) this.#navigationHidden = !this.#navigationHidden;
          if (indicators) this.#indicatorsHidden = !this.#indicatorsHidden;
          this.requestUpdate();
        },
      },
      content: html`${auto}${viewport}${controls}${this.#renderScrollbar()}${this.renderPart('carousel-announcements', state, { properties: { class: 'visually-hidden', 'aria-live': 'polite', 'aria-atomic': 'true' }, content: this.#announcement })}<slot
          hidden
          @slotchange=${() => this.#schedule()}
        ></slot>`,
    });
  }
}
