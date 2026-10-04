import { css, html, nothing, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { OwnedPortal } from '../../foundation/owned-portal.js';
import { PresenceController } from '../../foundation/presence.js';
import { createId } from '../../foundation/id.js';
import { chevronDownIcon } from '../../icons/chevron-down.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import { shadowReferenceTarget } from '../../foundation/focus.js';

export interface NavigationMenuOwner extends HTMLElement {
  readonly value: string;
  readonly disabled: boolean;
  readonly showViewport: boolean;
  readonly direction: 'ltr' | 'rtl';
  readonly orientation: 'horizontal' | 'vertical';
  readonly viewportState: { activationDirection: 'forward' | 'backward' | null };
  itemChanged(): void;
  closeFromLink(event: Event): void;
}
/** Native navigation content stays attached to its original constituent and is never cloned. */
export class TpNavigationMenuItem extends TpElement {
  static tagName = 'tp-navigation-menu-item';
  static override properties = {
    ...TpElement.properties,
    value: { type: String },
    keepMounted: { type: Boolean, attribute: 'keep-mounted' },
    showIndicator: { type: Boolean, attribute: 'show-indicator' },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: contents;
      }

      .item {
        display: flex;
        position: relative;
        align-items: center;
      }

      .item[data-orientation='vertical'] {
        inline-size: 100%;
      }

      .item[data-orientation='vertical'] ::slotted([slot='trigger']),
      .item[data-orientation='vertical'] ::slotted(a[href]) {
        inline-size: 100%;
      }

      .content {
        position: relative;
        min-inline-size: 0;
      }

      .content[hidden] {
        display: none;
      }

      .indicator {
        display: inline-flex;
        align-items: center;
        pointer-events: none;
      }
    `,
  ];
  value = createId('tp-navigation-item');
  keepMounted = false;
  showIndicator = true;
  #owner: NavigationMenuOwner | null = null;
  #portal = new OwnedPortal(this, TpNavigationMenuItem.styles);
  #indicatorPortal = new OwnedPortal(this, TpNavigationMenuItem.styles);
  #container: HTMLElement | null = null;
  #content: HTMLElement | null = null;
  #parts = new Map<string, () => void>();
  #elements = new Map<string, HTMLElement>();
  #links = new Map<HTMLElement, { release: () => void; current: string | null }>();
  #refs = new Map<string, (element: HTMLElement | null) => void>();
  #observer: MutationObserver | undefined;
  #presence = new PresenceController(this, {
    surface: () => this.#content,
    keepMounted: () => this.keepMounted,
  });
  get navigationOwner(): NavigationMenuOwner | null {
    return this.#owner;
  }
  get presentationTagName(): string {
    return 'tp-navigation-menu';
  }
  get presentationOwner(): HTMLElement | null {
    return this.#owner;
  }
  set navigationOwner(owner: NavigationMenuOwner | null) {
    if (this.#owner === owner) return;
    this.#owner = owner;
    this.requestUpdate();
  }
  get active(): boolean {
    return this.#owner?.value === this.value && !this.disabled && !this.#owner.disabled;
  }
  get triggerElement(): HTMLElement | null {
    return (
      this.#portal.ownedChildren.find(
        (node): node is HTMLElement =>
          node.nodeType === 1 && (node as Element).getAttribute('slot') === 'trigger',
      ) ?? null
    );
  }
  get contentElement(): HTMLElement | null {
    return this.#content;
  }
  get hasContent(): boolean {
    return this.#contentNodes.length > 0;
  }
  get #contentNodes(): readonly Node[] {
    return this.#portal.ownedChildren.filter(
      (node) => node.nodeType === 1 && (node as Element).getAttribute('slot') === 'content',
    );
  }
  setContentContainer(container: HTMLElement | null): void {
    if (container === this.#container) return;
    this.#container = container;
    this.requestUpdate();
  }
  #reference(name: string): (element: HTMLElement | null) => void {
    let ref = this.#refs.get(name);
    if (!ref) {
      ref = (element) => {
        this.#parts.get(name)?.();
        this.#parts.delete(name);
        if (name === 'navigation-menu-content') this.#content = element;
        if (element) this.#elements.set(name, element);
        else this.#elements.delete(name);
        if (element) this.#parts.set(name, this.presentationController.registerPart(name, element));
      };
      this.#refs.set(name, ref);
    }
    return ref;
  }
  #changed = (): void => {
    this.#owner?.itemChanged();
    this.requestUpdate();
  };
  #link = (event: MouseEvent): void => {
    const link = event
      .composedPath()
      .find(
        (node): node is HTMLAnchorElement =>
          (node as Element).localName === 'a' && (node as Element).hasAttribute('href'),
      );
    if (
      !link ||
      !link.hasAttribute('close-on-click') ||
      link.getAttribute('close-on-click') === 'false'
    )
      return;
    queueMicrotask(() => {
      if (!event.defaultPrevented && !componentHandlingPrevented(event))
        this.#owner?.closeFromLink(event);
    });
  };
  #renderContent(): unknown {
    const direction = this.#owner?.viewportState.activationDirection;
    const backwards = direction === 'backward';
    const activationDirection = !direction
      ? undefined
      : this.#owner?.orientation === 'vertical'
        ? backwards
          ? 'up'
          : 'down'
        : backwards !== (this.#owner?.direction === 'rtl')
          ? 'left'
          : 'right';
    return this.renderPart(
      'navigation-menu-content',
      {
        open: this.active,
        closed: !this.active,
        presence: this.#presence.state,
        value: this.value,
      },
      {
        reference: this.#reference('navigation-menu-content'),
        enabled: this.#presence.mounted,
        properties: {
          class: 'content',
          role: 'group',
          '.ariaLabelledByElements': this.triggerElement
            ? [
                shadowReferenceTarget(
                  this.triggerElement.shadowRoot?.querySelector('button,a[href],[role="button"]') ??
                    this.triggerElement,
                ),
              ]
            : [],
          '.inert': !this.active,
          hidden: this.#presence.state === 'retained',
          'aria-hidden': this.active ? undefined : 'true',
          'data-open': this.active,
          'data-closed': !this.active,
          'data-viewport': String(this.#owner?.showViewport ?? true),
          'data-activation-direction': activationDirection,
          'data-starting-style': this.#presence.state === 'starting',
          'data-ending-style': this.#presence.state === 'ending',
          '@click': this.#link,
        },
        content: html`<slot name="content" @slotchange=${this.#changed}></slot>`,
      },
    );
  }
  #renderIndicator(): unknown {
    return this.renderPart(
      'navigation-menu-indicator',
      { open: this.active },
      {
        tag: 'span',
        reference: this.#reference('navigation-menu-indicator'),
        properties: { class: 'indicator', 'aria-hidden': 'true', 'data-open': this.active },
        content: html`<slot name="indicator"
          ><tp-icon .icon=${chevronDownIcon} size="calc(var(--tp-icon-size-sm) * 0.75)"></tp-icon
        ></slot>`,
      },
    );
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer = new this.ownerDocument.defaultView!.MutationObserver(this.#changed);
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['slot', 'disabled', 'active', 'aria-current'],
    });
    this.#owner?.itemChanged();
  }
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    this.#presence.setPresent(this.active);
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const trigger = this.triggerElement;
    if (this.showIndicator && trigger) {
      this.#indicatorPortal.update(trigger, this.#renderIndicator(), {
        projectedNodes: this.#indicatorPortal.ownedChildren.filter(
          (node) => node.nodeType === 1 && (node as Element).getAttribute('slot') === 'indicator',
        ),
      });
      const host = this.#indicatorPortal.host;
      if (host) {
        const namedMark =
          trigger.localName === 'tp-button' ||
          !!trigger.shadowRoot?.querySelector('slot[name="icon-end"]');
        const slot = namedMark ? 'icon-end' : '';
        if (host.slot !== slot) host.slot = slot;
      }
    } else this.#indicatorPortal.clear();
    if (this.#container)
      this.#portal.update(this.#container, this.#renderContent(), {
        projectedNodes: this.#contentNodes,
      });
    else this.#portal.clear();
    const roots = [...this.#portal.ownedChildren].filter(
      (node): node is Element => node.nodeType === 1,
    );
    const currentLinks = new Set<HTMLElement>();
    for (const root of roots)
      for (const link of [root, ...root.querySelectorAll('a[href]')])
        if (link.matches('a[href]')) {
          const element = link as HTMLElement;
          currentLinks.add(element);
          if (!this.#links.has(element))
            this.#links.set(element, {
              release: this.presentationController.registerPart('navigation-menu-link', element),
              current: element.getAttribute('aria-current'),
            });
          if (
            link.hasAttribute('active') &&
            link.getAttribute('active') !== 'false' &&
            link.getAttribute('aria-current') !== 'page'
          )
            link.setAttribute('aria-current', 'page');
          else if (
            (!link.hasAttribute('active') || link.getAttribute('active') === 'false') &&
            link.getAttribute('aria-current') === 'page' &&
            this.#links.get(element)?.current !== 'page'
          ) {
            const original = this.#links.get(element)?.current;
            if (original === null || original === undefined) link.removeAttribute('aria-current');
            else link.setAttribute('aria-current', original);
          }
        }
    for (const [link, record] of this.#links)
      if (!currentLinks.has(link)) {
        record.release();
        if (link.getAttribute('aria-current') === 'page' && record.current !== 'page') {
          if (record.current === null) link.removeAttribute('aria-current');
          else link.setAttribute('aria-current', record.current);
        }
        this.#links.delete(link);
      }
    if (changed.has('disabled') || changed.has('value')) this.#owner?.itemChanged();
  }
  protected override render() {
    return this.renderPart(
      'navigation-menu-item',
      { value: this.value, open: this.active, disabled: this.disabled },
      {
        tag: 'li',
        reference: this.#reference('navigation-menu-item'),
        properties: {
          class: 'item',
          role: 'listitem',
          'data-orientation': this.#owner?.orientation ?? 'horizontal',
          '@click': this.#link,
          'data-open': this.active,
          'data-closed': !this.active,
        },
        content: html`<slot name="trigger" @slotchange=${this.#changed}></slot
          ><slot @slotchange=${this.#changed}></slot
          >${this.#container || this.#owner ? nothing : this.#renderContent()}`,
      },
    );
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#observer = undefined;
    this.#portal.clear();
    this.#indicatorPortal.clear();
    this.#container = null;
    this.#parts.forEach((release) => release());
    this.#parts.clear();
    this.#elements.clear();
    this.#links.forEach(({ release, current }, link) => {
      release();
      if (link.getAttribute('aria-current') === 'page' && current !== 'page') {
        if (current === null) link.removeAttribute('aria-current');
        else link.setAttribute('aria-current', current);
      }
    });
    this.#links.clear();
    this.#owner?.itemChanged();
    this.#owner = null;
    super.disconnectedCallback();
  }
}
