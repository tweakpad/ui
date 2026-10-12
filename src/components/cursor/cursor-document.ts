import { composedParent } from '../../foundation/focus.js';
import { observeScroll } from '../../foundation/observation.js';
import { OwnedAttributes } from '../../foundation/owned-attributes.js';
import { CleanupScope } from '../../foundation/services.js';
import {
  composedDepth,
  mouseLikePointer,
  selectActiveZone,
  type HoveredZone,
} from './zone-resolution.js';

/**
 * Per-document state shared by every Custom cursor root (Foundation `cc-gating`, `cc-tracking`,
 * `cc-native-lease`, `cc-layer`, `cc-zones`, `cc-innermost`): one set of pointer listeners,
 * the pointer capability, the hovered zones, the native-hide leases and the top-layer re-raise.
 * Listeners are installed with the first root and removed with the last.
 */
export interface CursorPoint {
  readonly x: number;
  readonly y: number;
}

/** A root as the registry drives it. */
export interface CursorParticipant {
  readonly element: HTMLElement;
  /** Whether the root takes a zone at all (region scope ignores zones outside the region). */
  accepts(zone: CursorZoneLike): boolean;
  pointerMoved(point: CursorPoint, event: PointerEvent): void;
  pointerLeft(event: Event | null): void;
  gateChanged(event: Event | null): void;
  pressedChanged(pressed: boolean, event: PointerEvent): void;
  zonesChanged(event: Event | null, updated: CursorZoneLike | null): void;
  raise(): void;
}

/** A zone as the registry sees it. */
export interface CursorZoneLike {
  readonly element: HTMLElement;
  readonly disabled: boolean;
  addresses(root: CursorParticipant): boolean;
  hoveredChanged(hovered: boolean): void;
}

/** Marks the scope element whose subtree hides the host pointer. */
export const NATIVE_HIDE_ATTRIBUTE = 'data-tp-cursor-hidden';
/** Marks a cursor surface so its own top-layer toggles never trigger a re-raise. */
export const SURFACE_ATTRIBUTE = 'data-tp-cursor-surface';
export const CAPABLE_QUERY = '(hover: hover) and (pointer: fine)';

interface Lease {
  count: number;
  readonly owned: OwnedAttributes;
}

const registries = new WeakMap<Document, CursorDocument>();

export class CursorDocument {
  static for(document: Document): CursorDocument {
    let registry = registries.get(document);
    if (!registry) registries.set(document, (registry = new CursorDocument(document)));
    return registry;
  }

  readonly #document: Document;
  readonly #roots: CursorParticipant[] = [];
  readonly #zones = new Map<Element, CursorZoneLike>();
  readonly #hovered = new Map<CursorZoneLike, HoveredZone<CursorZoneLike>>();
  readonly #leases = new Map<Element, Lease>();
  #order = 0;
  #listeners: CleanupScope | undefined;
  #capable = false;
  #mouseLike = false;
  #pointer: CursorPoint | null = null;
  #pressed = false;
  #raising = false;

  private constructor(document: Document) {
    this.#document = document;
  }

  /** The last mouse-like pointer point, in client coordinates. */
  get pointer(): CursorPoint | null {
    return this.#pointer;
  }

  get pressed(): boolean {
    return this.#pressed;
  }

  /** Whether the host has a hovering fine pointer. */
  get capable(): boolean {
    return this.#capable;
  }

  /** Whether a mouse-like pointer has been seen since the last touch. */
  get mouseLike(): boolean {
    return this.#mouseLike;
  }

  /** Whether roots may follow: a capable host with a mouse-like pointer that has moved. */
  get engaged(): boolean {
    return this.#capable && this.#mouseLike && this.#pointer !== null;
  }

  get roots(): readonly CursorParticipant[] {
    return this.#roots;
  }

  addRoot(root: CursorParticipant): () => void {
    this.#roots.push(root);
    if (!this.#listeners) this.#install();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const index = this.#roots.indexOf(root);
      if (index >= 0) this.#roots.splice(index, 1);
      if (!this.#roots.length) this.#uninstall();
    };
  }

  addZone(zone: CursorZoneLike): () => void {
    this.#zones.set(zone.element, zone);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.#zones.delete(zone.element);
      if (this.#hovered.delete(zone)) this.#notifyZones(null, null);
    };
  }

  /** A zone's own enter boundary event. */
  zoneEntered(zone: CursorZoneLike, event: Event | null): void {
    if (this.#hovered.has(zone)) return;
    this.#record(zone);
    zone.hoveredChanged(true);
    this.#notifyZones(event, null);
  }

  zoneLeft(zone: CursorZoneLike, event: Event | null): void {
    if (!this.#hovered.delete(zone)) return;
    zone.hoveredChanged(false);
    this.#notifyZones(event, null);
  }

  /** A zone's properties changed; roots using it re-apply it. */
  zoneUpdated(zone: CursorZoneLike): void {
    for (const root of this.#roots) root.zonesChanged(null, zone);
  }

  /** The innermost hovered zone addressing `root`. */
  activeZone(root: CursorParticipant): CursorZoneLike | null {
    return selectActiveZone(this.#hovered.values(), root);
  }

  /**
   * Hides the host pointer below `element` while any holder keeps the lease (Foundation
   * `cc-native-lease`); the returned function releases one registration.
   */
  acquireNativeHide(element: HTMLElement): () => void {
    let lease = this.#leases.get(element);
    if (!lease) {
      lease = { count: 0, owned: new OwnedAttributes(element) };
      lease.owned.set(NATIVE_HIDE_ATTRIBUTE, '');
      this.#leases.set(element, lease);
    }
    lease.count += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const current = this.#leases.get(element);
      if (!current) return;
      current.count -= 1;
      if (current.count <= 0) {
        current.owned.dispose();
        this.#leases.delete(element);
      }
    };
  }

  /** Registrations holding the lease on `element`, for tests and diagnostics. */
  nativeHideCount(element: Element): number {
    return this.#leases.get(element)?.count ?? 0;
  }

  /**
   * Re-resolves the zones under the last pointer point from hit testing (after scrolling
   * without pointer movement, and for the refresh action).
   */
  rehit(event: Event | null): void {
    const point = this.#pointer;
    if (!point) return;
    let element = this.#document.elementFromPoint(point.x, point.y);
    while (element?.shadowRoot) {
      const inner = element.shadowRoot.elementFromPoint(point.x, point.y);
      if (!inner || inner === element) break;
      element = inner;
    }
    const inside = new Set<CursorZoneLike>();
    for (let node: Node | null = element; node; node = composedParent(node)) {
      const zone = this.#zones.get(node as Element);
      if (zone) inside.add(zone);
    }
    let changed = false;
    for (const zone of [...this.#hovered.keys()])
      if (!inside.has(zone)) {
        this.#hovered.delete(zone);
        zone.hoveredChanged(false);
        changed = true;
      }
    for (const zone of inside)
      if (!this.#hovered.has(zone)) {
        this.#record(zone);
        zone.hoveredChanged(true);
        changed = true;
      }
    if (changed) this.#notifyZones(event, null);
  }

  #record(zone: CursorZoneLike): void {
    this.#hovered.set(zone, {
      zone,
      depth: composedDepth(zone.element),
      order: ++this.#order,
      get disabled() {
        return zone.disabled;
      },
      addresses: (root) =>
        zone.addresses(root as CursorParticipant) && (root as CursorParticipant).accepts(zone),
    });
  }

  #notifyZones(event: Event | null, updated: CursorZoneLike | null): void {
    for (const root of this.#roots) root.zonesChanged(event, updated);
  }

  #notifyGate(event: Event | null): void {
    for (const root of this.#roots) root.gateChanged(event);
  }

  #install(): void {
    const scope = (this.#listeners = new CleanupScope());
    const document = this.#document;
    const view = document.defaultView;
    const listen = (
      target: EventTarget,
      type: string,
      listener: (event: never) => void,
      options?: AddEventListenerOptions,
    ) => {
      target.addEventListener(type, listener as EventListener, options);
      scope.add(() => target.removeEventListener(type, listener as EventListener, options));
    };
    const capture = { capture: true, passive: true };
    listen(document, 'pointermove', this.#move, capture);
    listen(document, 'pointerdown', this.#down, capture);
    listen(document, 'pointerup', this.#up, capture);
    listen(document, 'pointercancel', this.#up, capture);
    listen(document, 'pointerout', this.#out, capture);
    // Top-layer entries (Foundation cc-layer): toggle events are not composed, so overlays inside
    // shadow roots are caught through the composed signals that accompany them: focus moving into
    // the surface, the click that opened it and the library's own open-change notifications.
    listen(document, 'beforetoggle', this.#toggle, { capture: true });
    listen(document, 'toggle', this.#toggle, { capture: true });
    listen(document, 'focusin', this.#raiseLater, { capture: true, passive: true });
    listen(document, 'click', this.#raiseLater, { capture: true, passive: true });
    listen(document, 'tp-open-change', this.#raiseLater, { capture: true, passive: true });
    listen(document, 'tp-open-change-complete', this.#raiseLater, { capture: true, passive: true });
    if (view) {
      listen(view, 'blur', this.#blur);
      const media = view.matchMedia(CAPABLE_QUERY);
      this.#capable = media.matches;
      listen(media, 'change', this.#capability);
    }
    scope.add(observeScroll(document, { scrollEnd: (event) => this.rehit(event) }));
  }

  #uninstall(): void {
    this.#listeners?.dispose();
    this.#listeners = undefined;
    this.#hovered.clear();
    this.#pressed = false;
  }

  readonly #move = (event: PointerEvent): void => {
    if (!mouseLikePointer(event.pointerType)) {
      if (this.#mouseLike) {
        this.#mouseLike = false;
        this.#notifyGate(event);
      }
      return;
    }
    const changed = !this.#mouseLike || this.#pointer === null;
    this.#mouseLike = true;
    this.#pointer = { x: event.clientX, y: event.clientY };
    if (changed) this.#notifyGate(event);
    for (const root of this.#roots) root.pointerMoved(this.#pointer, event);
  };

  readonly #down = (event: PointerEvent): void => {
    if (!mouseLikePointer(event.pointerType)) {
      if (this.#mouseLike) {
        this.#mouseLike = false;
        this.#notifyGate(event);
      }
      return;
    }
    if (event.button !== 0 || this.#pressed) return;
    this.#pressed = true;
    for (const root of this.#roots) root.pressedChanged(true, event);
  };

  readonly #up = (event: PointerEvent): void => {
    if (!this.#pressed || (event.type === 'pointerup' && event.button !== 0)) return;
    this.#pressed = false;
    for (const root of this.#roots) root.pressedChanged(false, event);
  };

  readonly #out = (event: PointerEvent): void => {
    if (event.relatedTarget !== null || !mouseLikePointer(event.pointerType)) return;
    for (const root of this.#roots) root.pointerLeft(event);
  };

  readonly #blur = (event: Event): void => {
    for (const root of this.#roots) root.pointerLeft(event);
  };

  readonly #capability = (event: MediaQueryListEvent): void => {
    this.#capable = event.matches;
    this.#notifyGate(event);
  };

  readonly #toggle = (event: Event): void => {
    const target = event.target as Element | null;
    if (
      (event as ToggleEvent).newState !== 'open' ||
      !target ||
      target.hasAttribute(SURFACE_ATTRIBUTE)
    )
      return;
    this.#raiseLater();
  };

  /** Re-enters every surface into the top layer once the current task has finished opening. */
  readonly #raiseLater = (): void => {
    if (this.#raising || !this.#roots.length) return;
    this.#raising = true;
    queueMicrotask(() => {
      this.#raising = false;
      for (const root of this.#roots) root.raise();
    });
  };
}
