import type { ReactiveController, ReactiveControllerHost } from 'lit';
import {
  contentSecurityPolicy,
  subscribeContentSecurity,
} from '../../foundation/content-security.js';
import {
  nativeScrollEdges,
  insetScrollport,
  type ScrollEdges,
  type ScrollportInsets,
} from '../../foundation/scroll.js';
import { observeScroll, observeSelection } from '../../foundation/observation.js';
import { composedContains, composedElements, deepActiveElement } from '../../foundation/focus.js';
import {
  ComposedEnvironmentObserver,
  changedStyleProperties,
} from '../../foundation/composed-environment.js';
import { GeneratedStyleResource } from '../../foundation/generated-style.js';
import {
  scrollEdgeCss,
  scrollEdgeMask,
  type ScrollEdgeMaskRect,
} from '../../presentation/recipes/shared/scroll-edge.js';

type Host = HTMLElement & ReactiveControllerHost & { renderRoot: HTMLElement | DocumentFragment };
export interface NativeScrollEdgeOptions {
  /** Explicit library-owned native scrollports; never scans the document for overflow. */
  viewports: () => readonly HTMLElement[];
  /** Optional explicit non-scroll content layers; otherwise uses flattened viewport children. */
  content?: (viewport: HTMLElement) => readonly HTMLElement[];
  /** Native chrome known by an owner, including parts across shadow boundaries. */
  protectedElements?: () => readonly HTMLElement[];
  /** Uncovered content region, using the native owner's measured overlay extents. */
  insets?: () => ScrollportInsets;
  /** Existing owners can provide their measured state rather than a second state owner. */
  read?: (viewport: HTMLElement) => ScrollEdges;
  threshold?: () => number | Partial<Record<'xStart' | 'xEnd' | 'yStart' | 'yEnd', number>>;
  /** Scroll Area already schedules scroll/content/resize measurements. */
  external?: boolean;
  /** Editing surfaces also track the caret when the selection moves without a scroll. */
  selection?: boolean;
}
interface Binding {
  viewport: HTMLElement;
  probe: HTMLElement;
  release: () => void;
}
interface Owned {
  style: string;
  marker: string | null;
  original: string;
  values: Map<string, { previous: string; applied: string }>;
}
type Mask = ReturnType<typeof scrollEdgeMask>;
const targetMasks = new WeakMap<
  HTMLElement,
  { state: Owned; masks: Map<NativeScrollEdges, Mask> }
>();
const properties = [
  '--_tp-scroll-edge-image',
  '--_tp-scroll-edge-size',
  '--_tp-scroll-edge-position',
  '--_tp-scroll-edge-composite',
];
/**
 * Whether a host asks for scroll-edge fades: `scroll-edge-fade` present, unless its value is
 * `false`, so a default-on host can be turned off by attribute.
 */
function fadeEnabled(host: Element): boolean {
  return (
    host.hasAttribute('scroll-edge-fade') && host.getAttribute?.('scroll-edge-fade') !== 'false'
  );
}

/** Shared content-layer adapter; it does not move nodes or replace native scrolling. */
export class NativeScrollEdges implements ReactiveController {
  readonly #bindings = new Map<HTMLElement, Binding>();
  readonly #owned = new Map<HTMLElement, Owned>();
  readonly #resources = new Map<Document | ShadowRoot, GeneratedStyleResource>();
  readonly #environment: ComposedEnvironmentObserver;
  #resize?: ResizeObserver;
  #mutations?: MutationObserver;
  #frame: number | undefined;
  #owner: (Window & typeof globalThis) | null = null;
  readonly #observed = new Set<Element>();
  #media?: MediaQueryList;
  #releaseSelection: (() => void) | undefined;
  #releaseSecurity: (() => void) | undefined;
  #connected = false;
  #protected = new WeakMap<HTMLElement, HTMLElement[]>();
  readonly #refresh = (): void => {
    if (!this.#connected) return;
    this.#protected = new WeakMap();
    this.schedule();
  };
  constructor(
    readonly host: Host,
    readonly options: NativeScrollEdgeOptions,
  ) {
    this.#environment = new ComposedEnvironmentObserver(host, this.#refresh);
    host.addController(this);
  }
  hostConnected(): void {
    if (!fadeEnabled(this.host)) return;
    this.#protected = new WeakMap();
    this.#owner = this.host.ownerDocument.defaultView;
    if (!this.#owner) return;
    this.#connected = true;
    this.#environment.connect();
    this.#releaseSecurity = subscribeContentSecurity(this.host, this.schedule);
    this.#resize = new this.#owner.ResizeObserver(this.#refresh);
    this.#mutations = new this.#owner.MutationObserver((records) => {
      if (
        records.some((record) => {
          if (record.type !== 'attributes')
            return !(
              record.target instanceof this.#owner!.Element &&
              record.target.closest('[data-tp-scroll-edge-probe]')
            );
          const target = record.target as HTMLElement;
          if (record.attributeName !== 'style') return true;
          if (target.getAttribute('style') === this.#owned.get(target)?.style) return false;
          return [...changedStyleProperties(record.oldValue, target.getAttribute('style'))].some(
            (k) => !k.startsWith('--_tp-scroll-edge-'),
          );
        })
      )
        this.#refresh();
    });
    this.#media = this.#owner.matchMedia('(forced-colors: active)');
    this.#media.addEventListener('change', this.schedule);
    this.host.addEventListener('slotchange', this.#refresh, true);
    if (this.options.selection)
      this.#releaseSelection = observeSelection(this.host.ownerDocument, this.#selection);
    this.schedule();
  }
  hostUpdated(): void {
    const enabled = fadeEnabled(this.host);
    if (enabled && !this.#connected) this.hostConnected();
    else if (!enabled && this.#connected) this.hostDisconnected();
    else this.schedule();
  }
  hostDisconnected(): void {
    this.#connected = false;
    if (this.#frame !== undefined) this.#owner?.cancelAnimationFrame(this.#frame);
    this.#frame = undefined;
    this.#environment.disconnect();
    this.#releaseSecurity?.();
    this.#releaseSecurity = undefined;
    this.#resize?.disconnect();
    this.#observed.clear();
    this.#mutations?.disconnect();
    this.#media?.removeEventListener('change', this.schedule);
    this.host.removeEventListener('slotchange', this.#refresh, true);
    this.#releaseSelection?.();
    this.#releaseSelection = undefined;
    for (const binding of this.#bindings.values()) {
      binding.release();
      binding.probe.remove();
    }
    this.#bindings.clear();
    this.#restore();
    for (const resource of this.#resources.values()) resource.dispose();
    this.#resources.clear();
    this.#owner = null;
  }
  readonly #selection = (): void => {
    const active = deepActiveElement(this.host.ownerDocument);
    if (active && [...this.#bindings.keys()].some((viewport) => composedContains(viewport, active)))
      this.schedule();
  };
  invalidateContent(): void {
    this.#refresh();
  }
  readonly schedule = (): void => {
    if (!this.#connected || !this.#owner || this.#frame !== undefined) return;
    this.#frame = this.#owner.requestAnimationFrame(() => {
      this.#frame = undefined;
      this.#sync();
    });
  };
  #sync(): void {
    const owner = this.#owner;
    if (!owner || !this.host.isConnected) return;
    if (this.host.ownerDocument.defaultView !== owner) {
      this.hostDisconnected();
      this.hostConnected();
      return;
    }
    const viewports = new Set(
      this.options.viewports().filter((v) => {
        if (!v.isConnected) return false;
        const style = owner.getComputedStyle(v);
        return [style.overflowX, style.overflowY].some(
          (value) => value === 'auto' || value === 'scroll',
        );
      }),
    );
    for (const [viewport, binding] of this.#bindings)
      if (!viewports.has(viewport)) {
        binding.release();
        binding.probe.remove();
        this.#bindings.delete(viewport);
      }
    const observed = new Set<Element>();
    this.#mutations?.disconnect();
    const watch = (element: HTMLElement) => {
      if (this.options.external) return;
      observed.add(element);
      this.#mutations?.observe(element, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ['style', 'class', 'hidden', 'dir', 'slot'],
      });
    };
    for (const viewport of viewports) {
      if (!this.#bindings.has(viewport)) {
        const probe = viewport.ownerDocument.createElement('span');
        probe.setAttribute('data-tp-scroll-edge-probe', '');
        probe.setAttribute('aria-hidden', 'true');
        probe.style.cssText =
          'position:fixed;inset:0 auto auto 0;display:block;visibility:hidden;pointer-events:none;inline-size:var(--tp-scroll-edge-fade-size,24px);block-size:0;contain:strict;overflow:hidden';
        // Keep the measuring node outside engine- and consumer-owned scrolling content.
        this.host.renderRoot.append(probe);
        const events = ['focusin', 'focusout', 'input', 'keyup', 'pointerup'];
        for (const event of events) viewport.addEventListener(event, this.schedule);
        const releaseScroll = this.options.external
          ? () => {}
          : observeScroll(viewport, { scroll: this.schedule, timing: { immediate: true } });
        this.#bindings.set(viewport, {
          viewport,
          probe,
          release: () => {
            releaseScroll();
            for (const event of events) viewport.removeEventListener(event, this.schedule);
          },
        });
      }
      observed.add(this.#bindings.get(viewport)!.probe);
      watch(viewport);
    }
    const active = deepActiveElement(this.host.ownerDocument);
    const next = new Set<HTMLElement>();
    for (const binding of this.#bindings.values()) {
      const viewport = binding.viewport;
      const contents = this.options.content?.(viewport) ?? this.#children(viewport);
      for (const content of contents) watch(content);
      const viewportStyle = owner.getComputedStyle(viewport);
      const length = viewportStyle.getPropertyValue('--tp-scroll-edge-fade-size').trim() || '24px';
      if (binding.probe.style.inlineSize !== length) binding.probe.style.inlineSize = length;
      if (binding.probe.style.font !== viewportStyle.font)
        binding.probe.style.font = viewportStyle.font;
      const size = Number.parseFloat(owner.getComputedStyle(binding.probe).inlineSize);
      if (
        contentSecurityPolicy(this.host).disableStyleElements ||
        !(size > 0) ||
        this.#media?.matches ||
        !owner.CSS.supports('mask-clip', 'no-clip')
      )
        continue;
      const edges = this.options.read?.(viewport) ?? nativeScrollEdges(viewport);
      const visible = insetScrollport(
        viewport.clientWidth,
        viewport.clientHeight,
        this.options.insets?.(),
      );
      const threshold = this.options.threshold?.() ?? 0;
      const limit = (
        edge: 'xStart' | 'xEnd' | 'yStart' | 'yEnd',
        distance: number,
        extent: number,
      ) => {
        const raw = typeof threshold === 'number' ? threshold : (threshold[edge] ?? 0);
        const cutoff = Number.isFinite(raw) ? Math.max(0, raw) : 0;
        return distance > cutoff ? Math.min(size, distance, extent / 4) : 0;
      };
      const xStart = limit('xStart', edges.xStart, visible.width),
        xEnd = limit('xEnd', edges.xEnd, visible.width);
      const yStart = limit('yStart', edges.yStart, visible.height),
        yEnd = limit('yEnd', edges.yEnd, visible.height);
      const bands = {
        left: edges.reverseX ? xEnd : xStart,
        right: edges.reverseX ? xStart : xEnd,
        top: edges.reverseY ? yEnd : yStart,
        bottom: edges.reverseY ? yStart : yEnd,
      };
      if (!Object.values(bands).some(Boolean)) continue;
      const box = viewport.getBoundingClientRect();
      const scaleX = viewport.offsetWidth ? box.width / viewport.offsetWidth : 1;
      const scaleY = viewport.offsetHeight ? box.height / viewport.offsetHeight : 1;
      for (const content of contents) {
        if (
          content === viewport ||
          content.hasAttribute('data-tp-scroll-edge-probe') ||
          !content.getClientRects().length
        )
          continue;
        if (!this.options.external) observed.add(content);
        const style = owner.getComputedStyle(content);
        if (style.position === 'sticky' || style.position === 'fixed') continue;
        const target = content.getBoundingClientRect();
        const local = (rect: DOMRect): ScrollEdgeMaskRect => ({
          left: (rect.left - target.left) / scaleX,
          top: (rect.top - target.top) / scaleY,
          width: rect.width / scaleX,
          height: rect.height / scaleY,
        });
        const protectedRects: ScrollEdgeMaskRect[] = [];
        let protectedNodes = this.#protected.get(content);
        if (!protectedNodes) {
          protectedNodes = composedElements(content).filter((child) => {
            if (child.hasAttribute('data-tp-scroll-edge-probe')) return false;
            const cs = owner.getComputedStyle(child);
            return (
              cs.position === 'sticky' ||
              cs.position === 'fixed' ||
              !!child.shadowRoot?.querySelector('[data-tp-scroll-edge-probe]') ||
              ((cs.overflowX === 'auto' ||
                cs.overflowX === 'scroll' ||
                cs.overflowY === 'auto' ||
                cs.overflowY === 'scroll') &&
                (child.scrollWidth > child.clientWidth || child.scrollHeight > child.clientHeight))
            );
          });
          this.#protected.set(content, protectedNodes);
        }
        for (const child of new Set([
          ...protectedNodes,
          ...(this.options.protectedElements?.() ?? []),
        ])) {
          const bounds = child.getBoundingClientRect();
          if (
            bounds.right > box.left &&
            bounds.left < box.right &&
            bounds.bottom > box.top &&
            bounds.top < box.bottom
          )
            protectedRects.push(local(bounds));
        }
        // A list that keeps focus on itself and points at its current item through
        // `aria-activedescendant` protects nothing: the owner's scroll padding keeps a revealed item
        // clear of the fade, and an item highlighted by hover at the edge fades like its neighbours.
        const focused =
          active &&
          composedContains(content, active) &&
          !active.hasAttribute('aria-activedescendant')
            ? active
            : null;
        if (focused) {
          let focusRect = focused.getBoundingClientRect();
          if ((focused as HTMLElement).isContentEditable) {
            const selection = this.host.ownerDocument.getSelection();
            if (selection?.focusNode) {
              const caret = this.host.ownerDocument.createRange();
              caret.setStart(selection.focusNode, selection.focusOffset);
              caret.collapse(true);
              const box = caret.getBoundingClientRect();
              if (box.height) focusRect = box;
            }
          }
          const focus = local(focusRect);
          protectedRects.push({
            left: focus.left - 8,
            top: focus.top - 8,
            width: focus.width + 16,
            height: focus.height + 16,
          });
        }
        const rect = {
          left: (box.left + viewport.clientLeft * scaleX - target.left) / scaleX + visible.left,
          top: (box.top + viewport.clientTop * scaleY - target.top) / scaleY + visible.top,
          width: visible.width,
          height: visible.height,
        };
        const original = targetMasks.get(content)?.state.original ?? style.maskImage;
        const mask = scrollEdgeMask(rect, bands, protectedRects, original, {
          width: target.width / scaleX,
          height: target.height / scaleY,
        });
        this.#apply(content, mask, original);
        next.add(content);
      }
    }
    for (const element of this.#observed)
      if (!observed.has(element)) this.#resize?.unobserve(element);
    for (const element of observed)
      if (!this.#observed.has(element)) this.#resize?.observe(element);
    this.#observed.clear();
    for (const element of observed) this.#observed.add(element);
    for (const target of this.#owned.keys()) if (!next.has(target)) this.#restore(target);
    const roots = new Set([...this.#owned.keys()].map((target) => target.getRootNode()));
    for (const [root, resource] of this.#resources)
      if (!roots.has(root)) {
        resource.dispose();
        this.#resources.delete(root);
      }
  }
  #children(element: HTMLElement): HTMLElement[] {
    return [...element.children].flatMap((child) =>
      child.localName === 'slot'
        ? (child as HTMLSlotElement)
            .assignedElements({ flatten: true })
            .filter((v): v is HTMLElement => v instanceof this.#owner!.HTMLElement)
        : child instanceof this.#owner!.HTMLElement
          ? [child]
          : [],
    );
  }
  #apply(target: HTMLElement, mask: ReturnType<typeof scrollEdgeMask>, original: string): void {
    const root = target.getRootNode() as Document | ShadowRoot;
    if (!this.#resources.has(root)) {
      const resource = new GeneratedStyleResource(this.host, root);
      resource.setText(scrollEdgeCss);
      this.#resources.set(root, resource);
    }
    let lease = targetMasks.get(target);
    if (!lease) {
      const state: Owned = {
        marker: target.getAttribute('data-tp-scroll-edge-mask'),
        original,
        values: new Map(),
        style: '',
      };
      lease = { state, masks: new Map() };
      targetMasks.set(target, lease);
    }
    this.#owned.set(target, lease.state);
    lease.masks.set(this, mask);
    this.#paint(target);
  }
  #paint(target: HTMLElement): void {
    const lease = targetMasks.get(target)!;
    const own = lease.state;
    const masks = [...lease.masks.values()];
    const image = masks.map((mask) => mask.image).join(',');
    const size = masks.map((mask) => mask.size).join(',');
    const position = masks.map((mask) => mask.position).join(',');
    const composite = masks
      .map((mask, i) =>
        i < masks.length - 1 ? mask.composite.replace(/add$/, 'intersect') : mask.composite,
      )
      .join(',');
    for (const [i, value] of [image, size, position, composite].entries()) {
      const name = properties[i]!;
      const old = own.values.get(name);
      if (target.style.getPropertyValue(name) === value) continue;
      const previous = old?.previous ?? target.style.getPropertyValue(name);
      target.style.setProperty(name, value);
      own.values.set(name, { previous, applied: target.style.getPropertyValue(name) });
    }
    if (!target.hasAttribute('data-tp-scroll-edge-mask'))
      target.setAttribute('data-tp-scroll-edge-mask', '');
    own.style = target.getAttribute('style') ?? '';
  }
  #restore(target?: HTMLElement): void {
    if (!target) {
      for (const element of [...this.#owned.keys()]) this.#restore(element);
      return;
    }
    const own = this.#owned.get(target);
    if (!own) return;
    this.#owned.delete(target);
    const lease = targetMasks.get(target)!;
    lease.masks.delete(this);
    if (lease.masks.size) {
      this.#paint(target);
      return;
    }
    targetMasks.delete(target);
    for (const [name, state] of own.values)
      if (target.style.getPropertyValue(name) === state.applied) {
        if (state.previous) target.style.setProperty(name, state.previous);
        else target.style.removeProperty(name);
      }
    if (own.marker === null) target.removeAttribute('data-tp-scroll-edge-mask');
    else target.setAttribute('data-tp-scroll-edge-mask', own.marker);
    this.#owned.delete(target);
  }
}
