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
  type ScrollEdgeBand,
  type ScrollEdgeMaskRect,
} from '../../presentation/recipes/shared/scroll-edge.js';

type Host = HTMLElement & ReactiveControllerHost & { renderRoot: HTMLElement | DocumentFragment };
export interface NativeScrollEdgeOptions {
  /** Explicit library-owned native scrollports; never scans the document for overflow. */
  viewports: () => readonly HTMLElement[];
  /**
   * The scrolling content layers, watched for changes and searched for sticky content; otherwise
   * the flattened viewport children. The fade itself masks the whole viewport.
   */
  content?: (viewport: HTMLElement) => readonly HTMLElement[];
  /** Elements that stay unfaded where they are, such as a highlighted option. */
  protectedElements?: () => readonly HTMLElement[];
  /**
   * The owner's chrome over the scrollport edges (a sticky header or footer, scroll buttons):
   * the fades start inside it, so content fades as it slides under the chrome.
   */
  insets?: () => ScrollportInsets;
  /**
   * How sticky and fixed content meets the fades: `solid` (default) keeps it unfaded where it
   * is; `content` fades it with the rest, for owners that draw their own edge treatment for
   * their sticky parts (pinned columns).
   */
  sticky?: 'solid' | 'content';
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

/**
 * Shared scroll-edge fades: a mask on each native scroll container. It does not move nodes or
 * replace native scrolling.
 */
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
      // How strongly the fades reach transparent, from 0 (no fade) to 1.
      const raw = Number.parseFloat(
        viewportStyle.getPropertyValue('--tp-scroll-edge-fade-intensity'),
      );
      const intensity = Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 1;
      if (
        contentSecurityPolicy(this.host).disableStyleElements ||
        !(size > 0) ||
        !(intensity > 0) ||
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
      // A band keeps one width while the content scrolls; only its strength follows the
      // distance, so the fade never moves or grows with the content.
      const limit = (
        edge: 'xStart' | 'xEnd' | 'yStart' | 'yEnd',
        distance: number,
        extent: number,
      ): ScrollEdgeBand => {
        const raw = typeof threshold === 'number' ? threshold : (threshold[edge] ?? 0);
        const cutoff = Number.isFinite(raw) ? Math.max(0, raw) : 0;
        const width = Math.min(size, extent / 4);
        const strength =
          distance > cutoff && width > 0 ? intensity * Math.min(1, distance / width) : 0;
        return { size: width, strength };
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
      if (!Object.values(bands).some((band) => band.strength > 0)) continue;
      const box = viewport.getBoundingClientRect();
      const scaleX = viewport.offsetWidth ? box.width / viewport.offsetWidth : 1;
      const scaleY = viewport.offsetHeight ? box.height / viewport.offsetHeight : 1;
      const local = (rect: DOMRect): ScrollEdgeMaskRect => ({
        left: (rect.left - box.left) / scaleX,
        top: (rect.top - box.top) / scaleY,
        width: rect.width / scaleX,
        height: rect.height / scaleY,
      });
      const islands: ScrollEdgeMaskRect[] = [];
      const solid = new Set(this.options.protectedElements?.() ?? []);
      for (const content of contents) {
        if (
          content === viewport ||
          content.hasAttribute('data-tp-scroll-edge-probe') ||
          !content.getClientRects().length
        )
          continue;
        if (!this.options.external) observed.add(content);
        if (this.options.sticky !== 'content')
          for (const element of this.#stickyContent(content)) solid.add(element);
      }
      for (const element of solid) {
        const bounds = element.getBoundingClientRect();
        if (
          bounds.right > box.left &&
          bounds.left < box.right &&
          bounds.bottom > box.top &&
          bounds.top < box.bottom
        )
          islands.push(local(bounds));
      }
      // Keyboard focus stays clear of the fade: the element showing a focus ring (`:focus-visible`,
      // which includes every text field and editable surface) is where the user is working. An
      // element focused by a press fades with its neighbours once it scrolls to an edge. A list
      // that keeps focus on itself and points at its current item through
      // `aria-activedescendant` protects nothing: the owner's scroll padding keeps a revealed item
      // clear of the fade, and an item highlighted by hover at the edge fades like its neighbours.
      const focused =
        active &&
        active !== viewport &&
        composedContains(viewport, active) &&
        active.matches(':focus-visible') &&
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
            const caretBox = caret.getBoundingClientRect();
            if (caretBox.height) focusRect = caretBox;
          }
        }
        const focus = local(focusRect);
        islands.push({
          left: focus.left - 8,
          top: focus.top - 8,
          width: focus.width + 16,
          height: focus.height + 16,
        });
      }
      const original =
        targetMasks.get(viewport)?.state.original ?? owner.getComputedStyle(viewport).maskImage;
      // The container's own focus ring, where it is drawn inside the box (an inset outline).
      const ring =
        viewportStyle.outlineStyle === 'none'
          ? 0
          : Math.max(0, -(Number.parseFloat(viewportStyle.outlineOffset) || 0));
      const mask = scrollEdgeMask(
        { width: viewport.offsetWidth, height: viewport.offsetHeight },
        {
          left: viewport.clientLeft + visible.left,
          top: viewport.clientTop + visible.top,
          width: visible.width,
          height: visible.height,
        },
        bands,
        islands,
        original,
        ring,
      );
      this.#apply(viewport, mask, original);
      next.add(viewport);
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
  /** Sticky and fixed elements in a content layer (cached until the content changes). */
  #stickyContent(content: HTMLElement): HTMLElement[] {
    let found = this.#protected.get(content);
    if (!found) {
      found = [content, ...composedElements(content)].filter((element) => {
        if (element.hasAttribute('data-tp-scroll-edge-probe')) return false;
        const position = this.#owner!.getComputedStyle(element).position;
        return position === 'sticky' || position === 'fixed';
      });
      this.#protected.set(content, found);
    }
    return found;
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
