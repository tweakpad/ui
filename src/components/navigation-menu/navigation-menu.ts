import { css, html, nothing, type PropertyValues } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { TpHoverSurface } from '../anchored-surface.js';
import { TpNavigationMenuItem, type NavigationMenuOwner } from './navigation-menu-item.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import { TpSurfaceOpenChangeEvent } from '../../foundation/surface-state.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import { OwnedPortal } from '../../foundation/owned-portal.js';
import {
  composedContains,
  deepActiveElement,
  focusableElements,
  shadowReferenceTarget,
} from '../../foundation/focus.js';
import { setPartComposition } from '../../presentation/controller.js';
import { createId } from '../../foundation/id.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import type {
  Alignment,
  CollisionPolicy,
  GeometryOffset,
  PositioningStrategy,
} from '../../foundation/positioning.js';
import type { ChangeReason } from '../../foundation/types.js';

interface NavigationMember {
  host: HTMLElement;
  value: string;
  trigger: HTMLElement | null;
  content: HTMLElement | null;
  registeredTrigger: HTMLElement | null;
  releaseTrigger?: (() => void) | undefined;
  parts: Array<() => void>;
  portal?: OwnedPortal;
  container: HTMLElement | null;
  reference(element: Element | undefined): void;
}
/** Native navigation policy; its scalar value is the only state proposal owner. */
export class TpNavigationMenu extends TpHoverSurface implements NavigationMenuOwner {
  static tagName = 'tp-navigation-menu';
  static override properties = {
    ...TpHoverSurface.properties,
    value: { type: String, noAccessor: true },
    defaultValue: { type: String, attribute: 'default-value' },
    onValueChange: { attribute: false },
  };
  static override styles = [
    TpHoverSurface.styles,
    css`
      :host {
        display: block;
        max-inline-size: max-content;
      }

      .list {
        display: flex;
        align-items: center;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .list[data-orientation='vertical'] {
        flex-direction: column;
        align-items: stretch;
      }

      .popup {
        overflow: visible;
      }

      .viewport {
        box-sizing: content-box;
        overflow: hidden;
        inline-size: var(--tp-popup-width, auto);
        block-size: var(--tp-popup-height, auto);
      }

      .body {
        overflow: visible;
      }

      .viewport-entry {
        inline-size: max-content;
        max-inline-size: var(--tp-available-width, calc(100vw - 10px));
      }

      .navigation-entry {
        inline-size: max-content;
        max-inline-size: var(--tp-available-width, calc(100vw - 10px));
      }

      .navigation-content {
        min-inline-size: 0;
      }
    `,
  ];
  defaultValue: string | undefined;
  onValueChange: ((event: TpValueChangeEvent<string>) => void) | undefined;
  override portal = true;
  override modal = false;
  override showViewport = true;
  override openOnHover = true;
  override orientation: 'horizontal' | 'vertical' = 'horizontal';
  override align: Alignment = 'center';
  override sideOffset: GeometryOffset = 8;
  override positionMethod: PositioningStrategy = 'absolute';
  override collisionAvoidance: CollisionPolicy = { side: 'flip', align: 'flip' };
  #provided: string | undefined;
  #members: NavigationMember[] = [];
  #observer: MutationObserver | undefined;
  #syncing = false;
  #queued = false;
  #diagnostics = new Set<string>();
  #valueState = new ControllableState<string>({
    host: this,
    initialValue: '',
    readControlledValue: () => this.#provided,
    readDefaultValue: () => this.defaultValue ?? '',
    hasDefaultValue: () => this.defaultValue !== undefined,
    onChange: (event) => this.onValueChange?.(event),
    onCommit: (value, previous, reason) => this.#commitValue(value, previous, reason),
    diagnostic: (message) => this.diagnostic('navigation-value', message),
  });
  constructor() {
    super();
    const isOpen = () => !!this.#active && !this.disabled;
    this.setOpenCoordinator({
      get open() {
        return isOpen();
      },
      request: (open, reason, event, trigger) => {
        const member = this.#members.find(
          (member) =>
            member.trigger === trigger ||
            (!!member.trigger && composedContains(member.trigger, trigger)),
        );
        return this.#select(open ? (member?.value ?? '') : '', reason, event);
      },
    });
    this.content = (payload) => this.#renderMember(payload as NavigationMember);
  }
  get value(): string {
    return this.#valueState.value;
  }
  set value(value: string | null | undefined) {
    const previous = this.#provided;
    this.#provided = value === undefined ? undefined : String(value ?? '');
    this.requestUpdate('value', previous);
    if (this.hasUpdated) this.#valueState.sync();
  }
  get #active(): NavigationMember | undefined {
    return this.#members.find(
      (member) =>
        member.value === this.value &&
        !member.host.matches('[disabled]') &&
        member.trigger &&
        (member.host instanceof TpNavigationMenuItem ? member.host.hasContent : member.content),
    );
  }
  protected override get partPrefix(): string {
    return 'navigation-menu';
  }
  protected override partName(suffix: string): string {
    return suffix === 'content' ? 'popup' : super.partName(suffix);
  }
  protected override get overlayRole(): string {
    return 'region';
  }
  protected override get triggerHasPopup(): string | null {
    return null;
  }
  protected override get surfaceModal(): boolean {
    return false;
  }
  protected override get surfaceMotionRole(): boolean {
    return false;
  }
  protected override get focusOpens(): boolean {
    return false;
  }
  protected override get pressToggles(): boolean {
    return true;
  }
  protected override get defaultHoverDelay(): number {
    return 50;
  }
  protected override get defaultCloseDelay(): number {
    return 50;
  }
  // The list/Trigger units remain in the navigation landmark. Only Item content is projected.
  protected override get contentNodes(): readonly Node[] {
    return [];
  }
  protected override syncSlot = (): void => {
    this.itemChanged();
  };
  itemChanged = (): void => {
    if (this.#queued) return;
    this.#queued = true;
    queueMicrotask(() => {
      this.#queued = false;
      if (this.isConnected) {
        this.#syncMembers();
        this.requestUpdate();
      }
    });
  };
  registerItemPart(name: string, element: HTMLElement): () => void {
    return this.presentationController.registerPart(name, element);
  }
  #select(value: string, reason: ChangeReason, event?: Event): boolean {
    if (
      this.disabled ||
      (value &&
        !this.#members.some(
          (member) => member.value === value && !member.host.matches('[disabled]'),
        ))
    )
      return false;
    return this.#valueState.set(value, reason, event) && this.value === value;
  }
  #commitValue(value: string, previous: string, reason: ChangeReason): void {
    const member = this.#active;
    this.acceptCoordinatedOpen(
      new TpSurfaceOpenChangeEvent(!!member, !!previous, reason),
      member?.trigger,
    );
    this.trigger = member?.trigger ?? this.trigger;
    this.payloadValue = member;
    for (const entry of this.#members) {
      if (entry.host instanceof TpNavigationMenuItem) entry.host.requestUpdate();
      else this.#updateNative(entry);
    }
    this.requestUpdate();
  }
  closeFromLink(event: Event): void {
    this.#select('', 'link-press', event);
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer = new this.ownerDocument.defaultView!.MutationObserver(this.itemChanged);
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'slot', 'disabled', 'active'],
    });
  }
  #syncMembers(): void {
    if (this.#syncing) return;
    this.#syncing = true;
    try {
      const previous = this.#members;
      const previousActive = previous.find((member) => member.value === this.value);
      const values = new Set<string>();
      const next: NavigationMember[] = [];
      for (const host of [...this.children].filter(
        (node): node is HTMLElement => node.namespaceURI === 'http://www.w3.org/1999/xhtml',
      )) {
        const custom = host instanceof TpNavigationMenuItem;
        const value = custom
          ? host.value
          : host.getAttribute('value') || host.id || (host.id = createId('tp-navigation-item'));
        if (values.has(value)) {
          if (!this.#diagnostics.has(value)) {
            this.#diagnostics.add(value);
            this.diagnostic(
              `navigation-duplicate:${value}`,
              'Navigation Item values must be unique; the later duplicate is excluded.',
            );
          }
          continue;
        }
        values.add(value);
        let member = previous.find((member) => member.host === host);
        if (!member) {
          const entry: NavigationMember = {
            host,
            value,
            trigger: null,
            content: null,
            registeredTrigger: null,
            parts: [],
            container: null,
            reference: (element) => {
              entry.container = (element as HTMLElement | undefined) ?? null;
              if (entry.host instanceof TpNavigationMenuItem)
                entry.host.setContentContainer(entry.container);
              else this.#updateNative(entry);
            },
          };
          member = entry;
          if (!custom) member.portal = new OwnedPortal(host, TpNavigationMenu.styles);
        }
        member.value = value;
        if (custom) {
          host.navigationOwner = this;
          setPartComposition(host, this, this.partPresentation);
          member.trigger = host.triggerElement;
          member.content = host.contentElement;
        } else {
          const owned = member.portal!.ownedChildren;
          member.trigger =
            owned.find(
              (node): node is HTMLElement =>
                node.nodeType === 1 && (node as Element).getAttribute('slot') === 'trigger',
            ) ?? null;
          member.content =
            owned.find(
              (node): node is HTMLElement =>
                node.nodeType === 1 && (node as Element).getAttribute('slot') === 'content',
            ) ?? null;
          if (
            member.content &&
            !member.container &&
            member.content.hidden !== (member.value !== this.value)
          )
            member.content.hidden = member.value !== this.value;
        }
        if (member.trigger !== member.registeredTrigger) {
          member.releaseTrigger?.();
          member.registeredTrigger = member.trigger;
          member.releaseTrigger = member.trigger
            ? this.registerTrigger(member.trigger, { identifier: value, payload: member })
            : undefined;
        }
        member.parts.splice(0).forEach((release) => release());
        if (!custom) member.parts.push(this.registerItemPart('navigation-menu-item', host));
        const owned = custom
          ? []
          : member
              .portal!.ownedChildren.filter((node): node is HTMLElement => node.nodeType === 1)
              .flatMap((node) => [node, ...node.querySelectorAll<HTMLElement>('a[href]')]);
        for (const link of owned)
          if (link.matches('a[href]'))
            member.parts.push(this.registerItemPart('navigation-menu-link', link));
        next.push(member);
      }
      for (const member of previous) if (!next.includes(member)) this.#release(member);
      this.#members = next;
      if (
        this.value &&
        (!values.has(this.value) || (previousActive && !next.includes(previousActive))) &&
        !this.#valueState.controlled
      )
        this.#valueState.set('', 'missing', undefined, { cancelable: false });
      const active = this.#active;
      if (!active && this.state.open)
        this.acceptCoordinatedOpen(new TpSurfaceOpenChangeEvent(false, true, 'missing'));
      if (active && this.payloadValue !== active) {
        this.acceptCoordinatedOpen(
          new TpSurfaceOpenChangeEvent(true, this.state.open, 'programmatic'),
          active.trigger,
        );
        this.trigger = active.trigger;
        this.payloadValue = active;
      }
    } finally {
      this.#syncing = false;
    }
  }
  #release(member: NavigationMember): void {
    member.releaseTrigger?.();
    member.parts.splice(0).forEach((release) => release());
    member.portal?.clear();
    if (member.host instanceof TpNavigationMenuItem) {
      member.host.navigationOwner = null;
      member.host.setContentContainer(null);
      setPartComposition(member.host, this);
    }
  }
  #updateNative(member: NavigationMember): void {
    if (!member.portal) return;
    if (!member.container) {
      member.portal.clear();
      return;
    }
    const content = member.content;
    const open = member.value === this.value;
    if (content) content.hidden = false;
    member.portal.update(
      member.container,
      this.renderPart(
        'navigation-menu-content',
        { open, value: member.value },
        {
          properties: {
            class: 'navigation-content',
            role: 'group',
            '.ariaLabelledByElements': member.trigger
              ? [
                  shadowReferenceTarget(
                    member.trigger.shadowRoot?.querySelector('button,a[href],[role="button"]') ??
                      member.trigger,
                  ),
                ]
              : [],
            '.inert': !open,
            'aria-hidden': open ? undefined : 'true',
            'data-open': open,
            'data-closed': !open,
            'data-viewport': String(this.showViewport),
            '@click': this.#linkClick,
          },
          content: html`<slot name="content"></slot>`,
        },
      ),
      { projectedNodes: content ? [content] : [] },
    );
  }
  #renderMember(member: NavigationMember | undefined): unknown {
    if (!member) return nothing;
    return html`<div class="navigation-entry" ${ref(member.reference)}></div>`;
  }
  #linkClick = (event: MouseEvent): void => {
    const link = event
      .composedPath()
      .find(
        (node): node is HTMLAnchorElement =>
          (node as Element).localName === 'a' && (node as Element).hasAttribute('href'),
      );
    if (link?.hasAttribute('close-on-click') && link.getAttribute('close-on-click') !== 'false')
      queueMicrotask(() => {
        if (!event.defaultPrevented && !componentHandlingPrevented(event))
          this.closeFromLink(event);
      });
  };
  #listKey = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || componentHandlingPrevented(event)) return;
    const controls = this.#members
      .map(
        (member) =>
          member.trigger ??
          (member.host.matches('a[href]')
            ? member.host
            : member.host.querySelector<HTMLElement>('a[href]')),
      )
      .filter(
        (element): element is HTMLElement => !!element && !element.matches('[disabled],:disabled'),
      );
    const index = controls.findIndex((element) => event.composedPath().includes(element));
    if (index < 0) return;
    const forward =
      this.orientation === 'vertical'
        ? 'ArrowDown'
        : this.direction === 'rtl'
          ? 'ArrowLeft'
          : 'ArrowRight';
    const backward =
      this.orientation === 'vertical'
        ? 'ArrowUp'
        : this.direction === 'rtl'
          ? 'ArrowRight'
          : 'ArrowLeft';
    const next =
      event.key === forward
        ? index + 1
        : event.key === backward
          ? index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? controls.length - 1
              : -1;
    if (controls[next]) {
      event.preventDefault();
      controls[next]!.focus();
    } else if (
      (event.key === 'ArrowDown' && this.orientation === 'horizontal') ||
      (this.orientation === 'vertical' &&
        event.key === (this.direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight'))
    ) {
      const member = this.#members.find((member) => member.trigger === controls[index]);
      if (
        member &&
        (member.value === this.value || this.#select(member.value, 'list-navigation', event))
      ) {
        event.preventDefault();
        void this.updateComplete.then(() => focusableElements(this.popupElement!)[0]?.focus());
      }
    }
  };
  protected override focusOnOpen(): void {
    // The default is no focus movement; an explicit shared focus policy still applies.
    super.focusOnOpen();
  }
  protected override surfaceKeydown = (event: KeyboardEvent): void => {
    if (
      event.key !== 'Tab' ||
      event.defaultPrevented ||
      componentHandlingPrevented(event) ||
      !this.portal ||
      !this.popupElement
    )
      return;
    // Item portals introduce separate focus scopes. Keep sequential navigation
    // within the flattened content; shared surface policy owns leaving it.
    const items = focusableElements(this.popupElement);
    const index = items.indexOf(deepActiveElement(this.ownerDocument) as HTMLElement);
    const next = index < 0 ? undefined : items[index + (event.shiftKey ? -1 : 1)];
    if (index >= 0) {
      event.preventDefault();
      if (next) next.focus();
      else if (event.shiftKey) this.triggerElement?.focus();
      else {
        const controls = focusableElements(this.renderRoot);
        const triggerIndex = controls.indexOf(this.triggerElement!);
        const following = triggerIndex < 0 ? undefined : controls[triggerIndex + 1];
        if (following) {
          following.focus();
          this.setOpen(false, 'focus-outside', event);
        } else this.focusOutside(1);
      }
    }
  };
  protected override popupProperties(): Record<string, unknown> {
    return {
      ...super.popupProperties(),
      '.ariaLabelledByElements': this.triggerElement
        ? [shadowReferenceTarget(this.triggerElement)]
        : [],
    };
  }
  protected override focusOnClose(): void {
    if (
      this.popupElement &&
      composedContains(this.popupElement, deepActiveElement(this.ownerDocument))
    )
      super.focusOnClose();
  }
  protected override render() {
    return html`${this.renderPart(
      'navigation-menu',
      { value: this.value, orientation: this.orientation },
      {
        tag: 'nav',
        properties: {
          'aria-label': this.getAttribute('aria-label') || 'Navigation',
          '@click': this.#linkClick,
        },
        content: this.renderPart(
          'navigation-menu-list',
          { orientation: this.orientation },
          {
            tag: 'ul',
            properties: {
              class: 'list',
              role: 'list',
              'data-orientation': this.orientation,
              '@keydown': this.#listKey,
            },
            content: html`<slot @slotchange=${this.itemChanged}></slot>`,
          },
        ),
      },
    )}${this.portal ? nothing : this.renderLayer()}`;
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#syncMembers();
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#observer = undefined;
    for (const member of this.#members) this.#release(member);
    this.#members = [];
    super.disconnectedCallback();
  }
}
