import { css, html, unsafeCSS, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import type { ChangeReason } from '../../foundation/types.js';
import { createId } from '../../foundation/id.js';
import { blockSpanGeometry } from '../../foundation/indicator-geometry.js';
import {
  prepareMotion,
  type MotionHandle,
  type MotionRoleDefinition,
} from '../../foundation/motion.js';
import { observeResize } from '../../foundation/observation.js';
import { scrollableAncestors } from '../../foundation/scroll.js';
import { ScrollSpyController, type ScrollSpyResult } from '../../foundation/scroll-spy.js';
import { motionTransition } from '../../presentation/motion.js';
import { tableOfContentsPresentation } from '../../presentation/families/table-of-contents.js';
import { TpTableOfContentsItem } from './table-of-contents-item.js';

export interface TableOfContentsMessages {
  readonly title?: string;
}
export const DEFAULT_TABLE_OF_CONTENTS_MESSAGES: Required<TableOfContentsMessages> = {
  title: 'On this page',
};

export const tableOfContentsMotionRoles = {
  indicator: { name: 'indicator', kind: 'state', phases: ['change'], completion: 'non-blocking' },
} as const satisfies Record<string, MotionRoleDefinition>;

/** The decoded identifier a URL fragment names, or null. */
function fragmentKey(hash: string): string | null {
  if (hash.length < 2) return null;
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return hash.slice(1);
  }
}

/** A scroll root given as a component with a viewport (Scroll area, Message scroller). */
const viewportOf = (element: Element): Element =>
  (element as Element & { viewportElement?: Element | null }).viewportElement ?? element;

/**
 * "On this page" navigation (`ucl20-table-of-contents`, behavior Foundation §18.15 Scroll spy).
 *
 * Items name their targets; nothing is scanned from the content. The current target is the
 * innermost one whose region contains the reading line of the targets' scroll container.
 *
 * @slot - `tp-table-of-contents-item` elements.
 * @slot title - Title content; replaces `label` and the title message.
 * @csspart table-of-contents - The `nav` landmark.
 * @csspart title - The visible name.
 * @csspart list - The list carrying the rail.
 * @csspart rail - The decorative line on the inline-start edge.
 * @csspart indicator - The mark spanning the active items.
 * @fires tp-value-change - Non-cancelable `value` proposal (`scroll`, `link-press`).
 * @fires tp-diagnostic - Unresolved or duplicate targets.
 */
export class TpTableOfContents extends TpElement {
  static tagName = 'tp-table-of-contents';
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpTableOfContentsItem];
  }
  static override presentation = tableOfContentsPresentation;
  static override properties = {
    ...TpElement.properties,
    value: { noAccessor: true },
    defaultValue: { type: String, attribute: 'default-value' },
    scrollRoot: { attribute: false },
    scrollRootId: { type: String, attribute: 'scroll-root' },
    activationOffset: { attribute: 'activation-offset' },
    navigation: { type: String, reflect: true },
    scrollBehavior: { type: String, attribute: 'scroll-behavior', reflect: true },
    scrollThrottle: { type: Number, attribute: 'scroll-throttle' },
    scrollDebounce: { type: Number, attribute: 'scroll-debounce' },
    label: { type: String },
    messages: { attribute: false },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      nav {
        display: grid;
      }

      .list {
        position: relative;
        display: grid;
      }

      .rail {
        position: absolute;
        inset-block: 0;
        inset-inline-start: 0;
        pointer-events: none;
      }

      .indicator {
        position: absolute;
        inset-block-start: var(--_tp-toc-indicator-start, 0);
        block-size: var(--_tp-toc-indicator-size, 0);
      }

      .indicator[data-animate] {
        transition: ${unsafeCSS(motionTransition(['inset-block-start', 'block-size']))};
      }

      .indicator[data-tp-motion-driven] {
        transition: none !important;
      }

      [hidden] {
        display: none !important;
      }
    `,
  ];

  defaultValue: string | null = null;
  scrollRoot: Element | null = null;
  scrollRootId: string | null = null;
  activationOffset: string | number | null = null;
  /** `fragment` uses native fragment navigation; `scroll` leaves the URL untouched. */
  navigation: 'fragment' | 'scroll' = 'fragment';
  /** How the content scrolls when navigating; `auto` follows the scroll root's CSS. */
  scrollBehavior: ScrollBehavior = 'smooth';
  /** Milliseconds between scroll updates; 0 updates once per animation frame. */
  scrollThrottle = 0;
  /** Milliseconds of quiet scrolling before an update; wins over `scrollThrottle`. */
  scrollDebounce = 0;
  label = '';
  messages: TableOfContentsMessages = {};
  /** Called with each `value` proposal. */
  onValueChange: ((event: TpValueChangeEvent<string | null>) => void) | undefined;

  readonly #titleId = createId('tp-toc-title');
  readonly #value: ControllableState<string | null>;
  readonly #spy: ScrollSpyController<string>;
  #provided: string | null | undefined;
  #items: TpTableOfContentsItem[] = [];
  #active: readonly string[] = [];
  #reported = new Set<string>();
  #listResize: (() => void) | null = null;
  #itemResize = new Map<Element, () => void>();
  #frame = 0;
  #animate = false;
  #motion: MotionHandle | null = null;
  #reason: ChangeReason | null = null;

  constructor() {
    super();
    this.#value = new ControllableState<string | null>({
      host: this,
      initialValue: null,
      readControlledValue: () => this.#provided,
      readDefaultValue: () => this.defaultValue,
      hasDefaultValue: () => this.hasAttribute('default-value'),
      onChange: (event) => this.onValueChange?.(event),
      diagnostic: (message) => this.#diagnostic('table-of-contents-value', message),
    });
    this.#spy = new ScrollSpyController<string>({
      host: this,
      entries: () => this.#entries(),
      root: () => this.#explicitRoot(),
      offset: () => this.activationOffset,
      timing: () => ({
        ...(this.scrollThrottle > 0 ? { throttle: this.scrollThrottle } : {}),
        ...(this.scrollDebounce > 0 ? { debounce: this.scrollDebounce } : {}),
      }),
      onChange: (result) => this.#spied(result),
    });
  }

  /** The current target's identifier; setting it (even to null) controls the component. */
  get value(): string | null {
    return this.#value.value;
  }
  set value(value: string | null | undefined) {
    const previous = this.value;
    this.#provided = value;
    if (this.hasUpdated) this.#value.sync();
    this.requestUpdate('value', previous);
  }

  /** Identifiers of the targets whose regions contain the reading line, by position. */
  get activeValues(): readonly string[] {
    return this.#active;
  }

  /** The resolved scroll root the spy observes. */
  get resolvedScrollRoot(): HTMLElement | null {
    return this.#spy.root;
  }

  /** Scrolls to an item's target and makes it current, as activating its link does. */
  navigate(value: string): void {
    const item = this.#items.find((candidate) => candidate.key === value);
    const target = item?.resolvedTarget;
    if (!item || !target) return;
    this.#go(value, null, 'programmatic', true);
  }

  /** Recalculates after changes the spy cannot observe, such as transforms. */
  refresh(): void {
    this.#spy.invalidate();
  }

  get tocMessages(): Required<TableOfContentsMessages> {
    return { ...DEFAULT_TABLE_OF_CONTENTS_MESSAGES, ...this.messages };
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // One delegated listener sees TOC links and links in the content alike.
    this.ownerDocument.addEventListener('click', this.#click);
    this.ownerDocument.defaultView?.addEventListener('hashchange', this.#hashChange);
    this.#spy.connect();
  }

  override disconnectedCallback(): void {
    this.ownerDocument.removeEventListener('click', this.#click);
    this.ownerDocument.defaultView?.removeEventListener('hashchange', this.#hashChange);
    this.#spy.disconnect();
    this.#listResize?.();
    this.#listResize = null;
    for (const release of this.#itemResize.values()) release();
    this.#itemResize.clear();
    this.#motion?.cancel();
    this.#motion = null;
    if (this.#frame) this.ownerDocument.defaultView?.cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (changed.has('scrollRoot') || changed.has('scrollRootId')) this.#spy.invalidate();
    if (changed.has('activationOffset')) this.#spy.schedule();
    if (changed.has('scrollThrottle') || changed.has('scrollDebounce')) this.#spy.updateTiming();
  }

  protected override firstUpdated(): void {
    const list = this.renderRoot.querySelector('.list');
    if (list) this.#listResize = observeResize(list, this.#layout);
    this.#slotChange();
    // A fragment present at load names the target the reader landed on.
    this.ownerDocument.defaultView?.requestAnimationFrame(() => {
      if (this.isConnected) this.#followFragment(null);
    });
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#applyItems();
  }

  #explicitRoot(): Element | null {
    if (this.scrollRoot) return viewportOf(this.scrollRoot);
    if (!this.scrollRootId) return null;
    const root = this.getRootNode() as Document | ShadowRoot;
    const element =
      root.getElementById?.(this.scrollRootId) ??
      this.ownerDocument.getElementById(this.scrollRootId);
    return element ? viewportOf(element) : null;
  }

  /** Resolved, deduplicated targets; unresolved and duplicate names are diagnosed once. */
  #entries(): { key: string; element: Element }[] {
    const seen = new Map<Element, TpTableOfContentsItem>();
    const entries: { key: string; element: Element }[] = [];
    for (const item of this.#items) {
      const element = item.resolvedTarget;
      if (!element) {
        if (item.fragment || item.target)
          this.#report(
            `missing:${item.key}`,
            'table-of-contents-target-missing',
            `No target for "${item.href ?? item.key}".`,
          );
        continue;
      }
      this.#reported.delete(`missing:${item.key}`);
      if (seen.has(element)) {
        this.#report(
          `duplicate:${item.key}`,
          'table-of-contents-target-duplicate',
          `"${item.key}" names a target another item already owns.`,
        );
        continue;
      }
      seen.set(element, item);
      entries.push({ key: item.key, element });
    }
    return entries;
  }

  #report(key: string, code: string, message: string): void {
    if (this.#reported.has(key)) return;
    this.#reported.add(key);
    this.#diagnostic(code, message);
  }

  #diagnostic(code: string, message: string): void {
    this.emit('tp-diagnostic', { code, message });
  }

  #spied(result: ScrollSpyResult<string>): void {
    this.#active = result.active;
    const reason: ChangeReason = this.#reason ?? 'scroll';
    if (!Object.is(result.current, this.#value.value) || this.#value.controlled)
      this.#value.set(result.current, reason, result.sourceEvent ?? undefined, {
        cancelable: false,
      });
    this.#animate = true;
    this.#applyItems();
  }

  #slotChange = (): void => {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot:not([name])');
    const items = (slot?.assignedElements({ flatten: true }) ?? []).filter(
      (element): element is TpTableOfContentsItem => element instanceof TpTableOfContentsItem,
    );
    for (const [item, release] of this.#itemResize)
      if (!items.includes(item as TpTableOfContentsItem)) {
        release();
        this.#itemResize.delete(item);
      }
    for (const item of items)
      if (!this.#itemResize.has(item))
        this.#itemResize.set(item, observeResize(item, this.#layout));
    this.#items = items;
    this.#reported.clear();
    this.#applyItems();
    this.#spy.invalidate();
  };

  /** Pushes active and current states to items, following a controlled value. */
  #applyItems(): void {
    const current = this.value;
    const active =
      current !== null && !this.#active.includes(current) ? [current] : [...this.#active];
    for (const item of this.#items) {
      item.active = active.includes(item.key);
      item.current = current !== null && item.key === current;
    }
    this.toggleAttribute('data-active', active.length > 0);
    this.#scheduleIndicator(this.#animate);
    this.#animate = false;
  }

  #layout = (): void => this.#scheduleIndicator(false);

  #scheduleIndicator(animate: boolean): void {
    if (animate) this.#animate = true;
    const view = this.ownerDocument.defaultView;
    if (!view || this.#frame) return;
    const pendingAnimate = animate;
    this.#frame = view.requestAnimationFrame(() => {
      this.#frame = 0;
      this.#placeIndicator(pendingAnimate || this.#animate);
      this.#animate = false;
    });
  }

  #placeIndicator(animate: boolean): void {
    const list = this.renderRoot.querySelector<HTMLElement>('.list');
    const indicator = this.renderRoot.querySelector<HTMLElement>('.indicator');
    if (!list || !indicator) return;
    const active = this.#items.filter((item) => item.active && item.getClientRects().length);
    if (!active.length) {
      indicator.hidden = true;
      indicator.removeAttribute('data-animate');
      return;
    }
    const wasHidden = indicator.hidden;
    const span = blockSpanGeometry(active[0]!, active[active.length - 1]!, list);
    const start = `${span.top}px`,
      size = `${span.height}px`;
    const moved =
      indicator.style.getPropertyValue('--_tp-toc-indicator-start') !== start ||
      indicator.style.getPropertyValue('--_tp-toc-indicator-size') !== size;
    // First placement and layout-only changes jump; changes of the active set glide.
    indicator.toggleAttribute('data-animate', animate && !wasHidden && moved);
    if (animate && !wasHidden && moved) {
      this.#motion?.cancel();
      this.#motion = prepareMotion(this, indicator, tableOfContentsMotionRoles.indicator, {
        phase: 'change',
        fromState: null,
        toState: this.value,
      });
    }
    indicator.style.setProperty('--_tp-toc-indicator-start', start);
    indicator.style.setProperty('--_tp-toc-indicator-size', size);
    indicator.hidden = false;
    this.#motion?.start();
    this.#motion = null;
    this.#revealCurrent();
  }

  /** Keeps the current link visible in this component's own scroll container only. */
  #revealCurrent(): void {
    const item = this.#items.find((candidate) => candidate.current);
    if (!item) return;
    const container = scrollableAncestors(this, true).find(
      (ancestor) =>
        ancestor !== this.ownerDocument.scrollingElement &&
        ancestor !== this.#spy.root &&
        !ancestor.contains(this.#spy.root),
    );
    if (!container) return;
    const box = container.getBoundingClientRect(),
      rect = item.getBoundingClientRect();
    const top = rect.top - box.top - container.clientTop,
      bottom = rect.bottom - box.top - container.clientTop;
    if (top < 0) container.scrollTop += top;
    else if (bottom > container.clientHeight)
      container.scrollTop += bottom - container.clientHeight;
  }

  /** The item key a same-document link names, or null. */
  #linkKey(event: Event): string | null {
    const path = event.composedPath();
    const item = path.find((node): node is TpTableOfContentsItem =>
      this.#items.includes(node as TpTableOfContentsItem),
    );
    if (item) return item.key;
    const anchor = path.find(
      (node): node is HTMLAnchorElement =>
        (node as Element).localName === 'a' && (node as Element).hasAttribute('href'),
    );
    if (!anchor) return null;
    const url = new URL(anchor.href, this.ownerDocument.baseURI);
    const here = this.ownerDocument.location;
    if (url.origin !== here.origin || url.pathname !== here.pathname || url.search !== here.search)
      return null;
    return fragmentKey(url.hash);
  }

  /** Activating any same-document link that names one of our targets navigates through us. */
  #click = (event: MouseEvent): void => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const key = this.#linkKey(event);
    if (key === null || !this.#items.some((item) => item.key === key)) return;
    if (!this.#spy.has(key)) return;
    event.preventDefault();
    this.#go(key, event, 'link-press', true);
  };

  /** History traversal and other fragment changes navigate to a named target. */
  #hashChange = (event: Event): void => this.#followFragment(event);

  #followFragment(event: Event | null): void {
    const key = fragmentKey(this.ownerDocument.location.hash);
    if (key === null || !this.#items.some((item) => item.key === key) || !this.#spy.has(key))
      return;
    // The fragment present at load was already scrolled to by the browser.
    this.#go(key, event, 'programmatic', false, event ? this.scrollBehavior : 'instant');
  }

  /** Scrolls the scroll root to `key`, holds it current and records the fragment if asked. */
  #go(
    key: string,
    event: Event | null,
    reason: ChangeReason,
    record: boolean,
    behavior: ScrollBehavior = this.scrollBehavior,
  ): void {
    this.#reason = reason;
    const navigated = this.#spy.navigate(key, {
      scroll: true,
      behavior,
      sourceEvent: event,
    });
    this.#reason = null;
    if (!navigated || !record || this.navigation !== 'fragment') return;
    const target = this.#items.find((item) => item.key === key)?.resolvedTarget;
    const document = this.ownerDocument;
    if (!target?.id || document.getElementById(target.id) !== target) return;
    const hash = `#${encodeURIComponent(target.id)}`;
    if (document.location.hash !== hash)
      document.defaultView?.history.pushState(document.defaultView.history.state, '', hash);
  }

  protected override render() {
    const messages = this.tocMessages;
    return html`<nav part="table-of-contents" class="root" aria-labelledby=${this.#titleId}>
      <div part="title" class="title" id=${this.#titleId}>
        <slot name="title">${this.label || messages.title}</slot>
      </div>
      <div part="list" class="list" role="list">
        <span part="rail" class="rail" aria-hidden="true"
          ><span part="indicator" class="indicator" hidden></span
        ></span>
        <slot @slotchange=${this.#slotChange}></slot>
      </div>
    </nav>`;
  }
}
