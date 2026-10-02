import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../foundation/element.js';
import { TpOpenChangeEvent, TpValueChangeEvent } from '../foundation/events.js';
import { FloatingDismissController } from '../foundation/floating-dismiss.js';
import { PresenceController } from '../foundation/presence.js';
import {
  positionSurface,
  type Placement,
  type PositioningHandle,
} from '../foundation/positioning.js';
import { TypeaheadController } from '../foundation/typeahead.js';
import { createId } from '../foundation/id.js';
import { safeCorridor } from '../foundation/safe-corridor.js';
import type { ChangeReason } from '../foundation/types.js';
import { controlStyles, eventReason } from './shared.js';

export class TpMenu extends TpElement {
  static tagName = 'tp-menu';
  static override properties = {
    ...TpElement.properties,
    open: { type: Boolean, reflect: true },
    placement: { type: String },
    loopFocus: { type: Boolean, attribute: 'loop-focus' },
    value: { type: String, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    controlStyles,
    css`
      :host {
        display: inline-block;
      }

      .surface {
        position: fixed;
        z-index: 1000;
        min-inline-size: 10rem;
        max-block-size: var(--tp-available-height, 24rem);
        overflow: auto;
      }

      .surface[hidden] {
        display: none;
      }

      .items {
        display: grid;
        gap: calc(var(--tp-space-1) / 2);
      }
    `,
  ];
  open = false;
  value = '';
  placement: Placement = 'bottom';
  loopFocus = true;
  override orientation: 'horizontal' | 'vertical' = 'vertical';
  protected items: HTMLElement[] = [];
  protected active: HTMLElement | null = null;
  protected readonly contentId = createId('tp-menu-content');
  protected position: PositioningHandle | null = null;
  readonly presence = new PresenceController(this, {
    surface: () => this.renderRoot.querySelector('.surface'),
  });
  readonly dismissController = new FloatingDismissController(this, {
    open: () => this.open,
    anchor: () => this.trigger,
    outside: () => true,
    escape: () => true,
    dismiss: (event) => {
      if (this.setOpen(false, 'dismiss', event) && event instanceof KeyboardEvent)
        this.trigger?.focus();
    },
  });
  readonly #typeahead = new TypeaheadController();
  #observer: MutationObserver | null = null;
  #partCleanups: Array<() => void> = [];
  #hoverTimer: number | undefined;
  #corridorCleanup: (() => void) | undefined;
  get trigger(): HTMLElement | null {
    return this.querySelector<HTMLElement>(':scope > [slot="trigger"]');
  }
  protected get anchor(): Element | null {
    return this.trigger;
  }
  protected get partPrefix(): string {
    return 'menu';
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer = new MutationObserver(() => this.syncItems());
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'value'],
    });
    this.addEventListener('pointerleave', this.#leave);
    if (this.hasUpdated) this.requestUpdate();
  }
  protected override render() {
    return html`<div part=${this.partPrefix}>
      <slot
        name="trigger"
        @slotchange=${this.syncItems}
        @click=${this.#triggerClick}
        @keydown=${this.#triggerKey}
      ></slot>
      <div
        class="surface"
        part=${`${this.partPrefix}-content`}
        id=${this.contentId}
        role="menu"
        aria-label=${this.getAttribute('aria-label') ?? 'Actions'}
        aria-orientation=${this.orientation}
        ?hidden=${!this.presence.mounted}
        data-state=${this.presence.state}
        @click=${this.#click}
        @keydown=${this.#key}
        @pointermove=${this.#hover}
        @focusin=${this.#focus}
      >
        <div class="items"><slot @slotchange=${this.syncItems}></slot></div>
      </div>
    </div>`;
  }
  syncItems = (): void => {
    for (const cleanup of this.#partCleanups) cleanup();
    this.#partCleanups = [];
    const previousIndex = this.items.indexOf(this.active!);
    this.items = [
      ...this.querySelectorAll<HTMLElement>(
        '[value], [role^="menuitem"], a[href], tp-menu > [slot="trigger"]',
      ),
    ].filter(
      (item) =>
        (item !== this.trigger && item.closest('tp-menu, tp-context-menu') === this) ||
        (item.slot === 'trigger' && item.parentElement?.parentElement === this),
    );
    this.items = this.items.filter((item) => !item.matches('tp-menu, tp-context-menu'));
    if (!this.active || !this.items.includes(this.active) || this.isDisabled(this.active))
      this.active =
        this.items.slice(Math.max(0, previousIndex)).find((item) => !this.isDisabled(item)) ??
        this.items.find((item) => !this.isDisabled(item)) ??
        null;
    for (const item of this.items) {
      if (!item.getAttribute('role')?.startsWith('menuitem')) item.setAttribute('role', 'menuitem');
      item.tabIndex = item === this.active ? 0 : -1;
      const suffix =
        item.slot === 'trigger' && item.parentElement instanceof TpMenu
          ? 'sub-trigger'
          : item.getAttribute('role') === 'menuitemcheckbox'
            ? 'checkbox-item'
            : item.getAttribute('role') === 'menuitemradio'
              ? 'radio-item'
              : 'item';
      item.part.add(`${this.partPrefix}-${suffix}`);
      this.#partCleanups.push(
        this.presentationController.registerPart(`${this.partPrefix}-${suffix}`, item),
      );
      item.setAttribute('aria-disabled', String(this.isDisabled(item)));
    }
    if (this.partPrefix === 'menu') {
      this.trigger?.setAttribute('aria-haspopup', 'menu');
      this.trigger?.setAttribute('aria-controls', this.contentId);
      this.trigger?.setAttribute('aria-expanded', String(this.open));
    }
    if (this.trigger)
      this.#partCleanups.push(
        this.presentationController.registerPart(
          `${this.partPrefix}-${this.partPrefix === 'context-menu' ? 'target' : 'trigger'}`,
          this.trigger,
        ),
      );
  };
  protected isDisabled(item: HTMLElement): boolean {
    return this.disabled || item.hasAttribute('disabled');
  }
  highlight(item: HTMLElement | null, focus = false): void {
    if (!item || this.isDisabled(item)) return;
    this.active = item;
    for (const member of this.items) {
      member.toggleAttribute('data-highlighted', member === item);
      member.tabIndex = member === item ? 0 : -1;
    }
    if (focus) item.focus();
  }
  proposeOpen(open: boolean, reason: ChangeReason, event?: Event): boolean {
    return (
      this.open === open ||
      this.dispatchEvent(new TpOpenChangeEvent(open, this.open, reason, event))
    );
  }
  setOpen(open: boolean, reason: ChangeReason = 'programmatic', event?: Event): boolean {
    if (open && this.disabled) return false;
    if (this.parentElement instanceof TpMenubar)
      return this.parentElement.requestMenu(this, open, reason, event);
    if (!this.proposeOpen(open, reason, event)) return false;
    this.open = open;
    if (!open) for (const child of this.querySelectorAll<TpMenu>('tp-menu')) child.open = false;
    return true;
  }
  #triggerClick = (event: MouseEvent): void => {
    if (
      !event.defaultPrevented &&
      this.setOpen(!this.open, event.detail === 0 ? 'keyboard' : 'pointer', event) &&
      this.open &&
      event.detail === 0
    )
      void this.updateComplete.then(() =>
        this.highlight(this.items.find((item) => !this.isDisabled(item)) ?? null, true),
      );
  };
  #triggerKey = (event: KeyboardEvent): void => {
    const nested = Boolean(this.parentElement?.closest('tp-menu, tp-context-menu'));
    const forward = this.direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    if (
      event.defaultPrevented ||
      (!['ArrowDown', 'ArrowUp'].includes(event.key) && !(nested && event.key === forward))
    )
      return;
    event.preventDefault();
    if (this.setOpen(true, 'keyboard', event))
      void this.updateComplete.then(async () => {
        await this.updateComplete;
        this.highlight(
          event.key === 'ArrowUp'
            ? (this.items.filter((item) => !this.isDisabled(item)).at(-1) ?? null)
            : (this.items.find((item) => !this.isDisabled(item)) ?? null),
          true,
        );
      });
  };
  #item(event: Event): HTMLElement | null {
    return (
      event
        .composedPath()
        .find(
          (item): item is HTMLElement => item instanceof HTMLElement && this.items.includes(item),
        ) ?? null
    );
  }
  #hover = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') return;
    const item = this.#item(event);
    if (!item || item === this.active) return;
    this.highlight(item);
    this.ownerDocument.defaultView?.clearTimeout(this.#hoverTimer);
    const child =
      item.slot === 'trigger' && item.parentElement instanceof TpMenu ? item.parentElement : null;
    for (const member of this.querySelectorAll<TpMenu>(':scope > tp-menu'))
      if (member !== child) member.setOpen(false, 'pointer', event);
    if (child)
      this.#hoverTimer = this.ownerDocument.defaultView?.setTimeout(
        () => child.setOpen(true, 'pointer', event),
        100,
      );
  };
  #leave = (event: PointerEvent): void => {
    this.ownerDocument.defaultView?.clearTimeout(this.#hoverTimer);
    if (!this.open || !this.parentElement?.closest('tp-menu, tp-context-menu') || !this.trigger)
      return;
    const surface = this.renderRoot.querySelector<HTMLElement>('.surface');
    if (!surface) return;
    this.#corridorCleanup?.();
    this.#corridorCleanup = safeCorridor(this.trigger, surface, event, (source) =>
      this.setOpen(false, 'pointer', source),
    );
  };
  #focus = (event: FocusEvent): void => this.highlight(this.#item(event));
  #click = (event: MouseEvent): void => {
    const item = this.#item(event);
    if (item) this.activate(item, event);
  };
  protected activate(item: HTMLElement, event: Event): void {
    if (event.defaultPrevented || this.isDisabled(item)) {
      event.preventDefault();
      return;
    }
    if (item.slot === 'trigger' && item.parentElement instanceof TpMenu) return;
    const role = item.getAttribute('role');
    const value = item.getAttribute('value') ?? '';
    const checked = item.getAttribute('aria-checked') === 'true';
    const check = role === 'menuitemcheckbox';
    const radio = role === 'menuitemradio';
    const proposal = check
      ? new TpValueChangeEvent(!checked, checked, 'selection', event)
      : new TpValueChangeEvent(value, this.value, 'selection', event);
    if ((check || radio) && !this.dispatchEvent(proposal)) {
      event.preventDefault();
      return;
    }
    if (!this.emit('tp-action', { value, item, sourceEvent: event }, { cancelable: true })) {
      event.preventDefault();
      return;
    }
    if (check) item.setAttribute('aria-checked', String(!checked));
    if (radio) {
      const group = item.closest('[role="group"]') ?? this;
      for (const member of this.items.filter(
        (member) =>
          member.getAttribute('role') === 'menuitemradio' &&
          (member.closest('[role="group"]') ?? this) === group,
      ))
        member.setAttribute('aria-checked', String(member === item));
      this.value = value;
    }
    const close = item.hasAttribute('close-on-click')
      ? item.getAttribute('close-on-click') !== 'false'
      : !check && !radio && !item.matches('a[href]');
    if (close) {
      if (!this.setOpen(false, eventReason(event), event)) return;
      let owner = this.parentElement?.closest<TpMenu>('tp-menu, tp-context-menu') ?? null;
      while (owner) {
        if (!owner.setOpen(false, eventReason(event), event)) break;
        owner = owner.parentElement?.closest<TpMenu>('tp-menu, tp-context-menu') ?? null;
      }
    }
  }
  #key = (event: KeyboardEvent): void => {
    if (
      event.defaultPrevented ||
      event.composedPath().find((node) => node instanceof TpMenu) !== this
    )
      return;
    const enabled = this.items.filter((item) => !this.isDisabled(item));
    const current = this.#item(event) ?? this.active;
    const forward = this.direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const backward = this.direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    if (
      event.key === forward &&
      current?.slot === 'trigger' &&
      current.parentElement instanceof TpMenu
    ) {
      const child = current.parentElement;
      event.preventDefault();
      if (child.setOpen(true, 'keyboard', event))
        void child.updateComplete.then(() =>
          child.highlight(child.items.find((item) => !child.isDisabled(item)) ?? null, true),
        );
      return;
    }
    if (event.key === backward && this.parentElement?.closest('tp-menu, tp-context-menu')) {
      event.preventDefault();
      if (this.setOpen(false, 'keyboard', event)) this.trigger?.focus();
      return;
    }
    if (event.key === 'Tab') {
      this.setOpen(false, 'keyboard', event);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      if (current) {
        event.preventDefault();
        current.click();
      }
      return;
    }
    const nextKey =
      this.orientation === 'vertical'
        ? 'ArrowDown'
        : this.direction === 'rtl'
          ? 'ArrowLeft'
          : 'ArrowRight';
    const previousKey =
      this.orientation === 'vertical'
        ? 'ArrowUp'
        : this.direction === 'rtl'
          ? 'ArrowRight'
          : 'ArrowLeft';
    let index = enabled.indexOf(current!);
    if (event.key === nextKey || event.key === previousKey) {
      index += event.key === nextKey ? 1 : -1;
      index = this.loopFocus
        ? (index + enabled.length) % enabled.length
        : Math.max(0, Math.min(enabled.length - 1, index));
    } else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = enabled.length - 1;
    else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey)
      index = this.#typeahead.search(
        enabled.map((item) => ({
          value: item.getAttribute('value') ?? '',
          label: item.textContent?.trim() ?? '',
        })),
        event.key,
        index,
      );
    else return;
    if (enabled[index]) {
      event.preventDefault();
      this.highlight(enabled[index]!, true);
    }
  };
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.syncItems();
    if (changed.has('open') || changed.has('placement')) {
      this.presence.setPresent(this.open);
      this.position?.destroy();
      this.position = null;
      if (this.open) void this.updateComplete.then(() => this.startPosition());
    }
  }
  protected startPosition(): void {
    const surface = this.renderRoot.querySelector<HTMLElement>('.surface');
    if (this.open && this.isConnected && this.anchor && surface) {
      this.position?.destroy();
      this.position = positionSurface(this.anchor, surface, {
        strategy: 'fixed',
        placement: this.placement,
      });
    }
  }
  override disconnectedCallback(): void {
    this.position?.destroy();
    this.#observer?.disconnect();
    this.#typeahead.reset();
    this.removeEventListener('pointerleave', this.#leave);
    this.ownerDocument.defaultView?.clearTimeout(this.#hoverTimer);
    this.#corridorCleanup?.();
    for (const child of this.querySelectorAll<TpMenu>('tp-menu')) child.open = false;
    for (const cleanup of this.#partCleanups) cleanup();
    this.#partCleanups = [];
    super.disconnectedCallback();
  }
}

export class TpMenubar extends TpElement {
  static tagName = 'tp-menubar';
  static override properties = {
    ...TpElement.properties,
    value: { type: String, reflect: true },
    loopFocus: { type: Boolean, attribute: 'loop-focus' },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      [role='menubar'] {
        display: flex;
      }

      :host([orientation='vertical']) [role='menubar'] {
        flex-direction: column;
      }
    `,
  ];
  value = '';
  loopFocus = true;
  #menus: TpMenu[] = [];
  #observer: MutationObserver | undefined;
  #original = new Map<TpMenu, { role: string | null; tabindex: string | null; open: boolean }>();
  #parts: Array<() => void> = [];
  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer = new MutationObserver(() => this.#sync());
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled'],
    });
    if (this.hasUpdated) this.#sync();
  }
  requestMenu(menu: TpMenu, open: boolean, reason: ChangeReason, event?: Event): boolean {
    if (this.disabled || !this.#menus.includes(menu)) return false;
    const previous = this.#menus.find((item) => item.open);
    const next = open ? (menu.getAttribute('value') ?? menu.id) : '';
    if (previous && previous !== menu && !previous.proposeOpen(false, reason, event)) return false;
    if (!menu.proposeOpen(open, reason, event)) return false;
    if (!this.dispatchEvent(new TpValueChangeEvent(next, this.value, reason, event))) return false;
    for (const member of this.#menus) member.open = open && member === menu;
    this.value = next;
    this.#sync();
    return true;
  }
  #sync = (): void => {
    const previous = this.#menus;
    this.#menus = [...this.children].filter((child): child is TpMenu => child instanceof TpMenu);
    for (const menu of previous) if (!this.#menus.includes(menu)) this.#release(menu);
    for (const cleanup of this.#parts) cleanup();
    this.#parts = [];
    if (
      this.value &&
      !this.#menus.some((menu) => (menu.getAttribute('value') ?? menu.id) === this.value)
    )
      this.value = '';
    const active =
      this.#menus.find((menu) => menu.open) ?? this.#menus.find((menu) => !menu.disabled);
    for (const menu of this.#menus) {
      if (!menu.id) menu.id = createId('tp-menubar-menu');
      const trigger = menu.trigger;
      if (!trigger) continue;
      if (!this.#original.has(menu))
        this.#original.set(menu, {
          role: trigger.getAttribute('role'),
          tabindex: trigger.getAttribute('tabindex'),
          open: menu.open,
        });
      trigger.setAttribute('role', 'menuitem');
      trigger.tabIndex = !this.disabled && menu === active ? 0 : -1;
      this.#parts.push(this.presentationController.registerPart('menubar-menu', menu));
      this.#parts.push(this.presentationController.registerPart('menubar-trigger', trigger));
      const content = menu.renderRoot?.querySelector<HTMLElement>('[part~="menu-content"]');
      if (content)
        this.#parts.push(this.presentationController.registerPart('menubar-content', content));
    }
  };
  #release(menu: TpMenu): void {
    const original = this.#original.get(menu);
    menu.open = false;
    if (original && menu.trigger) {
      for (const [name, value] of [
        ['role', original.role],
        ['tabindex', original.tabindex],
      ] as const) {
        if (value === null) menu.trigger.removeAttribute(name);
        else menu.trigger.setAttribute(name, value);
      }
    }
    this.#original.delete(menu);
  }
  #hover = (event: PointerEvent): void => {
    if (event.pointerType === 'touch' || !this.#menus.some((menu) => menu.open)) return;
    const menu = this.#menus.find(
      (item) => item.trigger && event.composedPath().includes(item.trigger),
    );
    if (menu && !menu.open) this.requestMenu(menu, true, 'pointer', event);
  };
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('value'))
      for (const menu of this.#menus)
        menu.open = (menu.getAttribute('value') ?? menu.id) === this.value;
    this.#sync();
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    for (const menu of this.#menus) this.#release(menu);
    for (const cleanup of this.#parts) cleanup();
    this.#parts = [];
    super.disconnectedCallback();
  }
  #key = (event: KeyboardEvent): void => {
    const menu = event
      .composedPath()
      .find((node): node is TpMenu => node instanceof TpMenu && this.#menus.includes(node));
    if (!menu || event.defaultPrevented) return;
    const enabled = this.#menus.filter((item) => !item.disabled);
    const nextKey =
      this.orientation === 'horizontal'
        ? this.direction === 'rtl'
          ? 'ArrowLeft'
          : 'ArrowRight'
        : 'ArrowDown';
    const previousKey =
      this.orientation === 'horizontal'
        ? this.direction === 'rtl'
          ? 'ArrowRight'
          : 'ArrowLeft'
        : 'ArrowUp';
    let index = enabled.indexOf(menu);
    if (event.key === nextKey || event.key === previousKey) index += event.key === nextKey ? 1 : -1;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = enabled.length - 1;
    else if (event.key === 'Tab') {
      if (menu.open) this.requestMenu(menu, false, 'keyboard', event);
      return;
    } else return;
    index = this.loopFocus
      ? (index + enabled.length) % enabled.length
      : Math.max(0, Math.min(index, enabled.length - 1));
    const next = enabled[index];
    if (!next) return;
    event.preventDefault();
    if (this.#menus.some((item) => item.open) && !this.requestMenu(next, true, 'keyboard', event))
      return;
    for (const member of this.#menus)
      if (member.trigger) member.trigger.tabIndex = member === next ? 0 : -1;
    next.trigger?.focus();
  };
  protected override render() {
    return html`<div
      part="menubar"
      role="menubar"
      aria-label=${this.getAttribute('aria-label') ?? 'Application menu'}
      aria-orientation=${this.orientation}
      @keydown=${this.#key}
      @pointerover=${this.#hover}
    >
      <slot @slotchange=${this.#sync}></slot>
    </div>`;
  }
}

/** Navigation stays native: links and composed disclosure controls retain normal Tab order. */
export class TpNavigationMenu extends TpElement {
  static tagName = 'tp-navigation-menu';
  static override properties = {
    ...TpElement.properties,
    value: { type: String, reflect: true },
    defaultValue: { type: String, attribute: 'default-value' },
    openDelay: { type: Number, attribute: 'open-delay' },
    closeDelay: { type: Number, attribute: 'close-delay' },
    placement: { type: String },
  };
  value = '';
  defaultValue = '';
  openDelay = 50;
  closeDelay = 50;
  placement: Placement = 'bottom';
  #items: Array<{
    item: HTMLElement;
    value: string;
    trigger: HTMLElement | null;
    content: HTMLElement | null;
  }> = [];
  #parts: Array<() => void> = [];
  #position: PositioningHandle | undefined;
  #timer: number | undefined;
  #corridor: (() => void) | undefined;
  #observer: MutationObserver | undefined;
  #initialized = false;
  readonly dismissController = new FloatingDismissController(this, {
    open: () => Boolean(this.value),
    anchor: () => this.#items.find((item) => item.value === this.value)?.trigger ?? null,
    outside: () => true,
    escape: () => true,
    dismiss: (event) => {
      const active = this.#items.find((item) => item.value === this.value);
      const restore =
        event instanceof KeyboardEvent &&
        active?.content?.contains(this.ownerDocument.activeElement);
      if (this.#select('', event) && restore) active?.trigger?.focus();
    },
  });
  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer = new MutationObserver(() => this.#sync());
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'disabled'],
    });
    if (this.hasUpdated) this.#sync();
  }
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      [part='navigation-menu-list'] {
        display: flex;
        align-items: center;
        gap: var(--tp-space-2);
      }

      :host([orientation='vertical']) [part='navigation-menu-list'] {
        flex-direction: column;
        align-items: start;
      }
    `,
  ];
  #sync = (): void => {
    for (const cleanup of this.#parts) cleanup();
    this.#parts = [];
    const values = new Set<string>();
    this.#items = [...this.children]
      .filter((item): item is HTMLElement => item instanceof HTMLElement)
      .flatMap((item) => {
        const value =
          item.getAttribute('value') || item.id || (item.id = createId('tp-navigation-item'));
        if (values.has(value)) return [];
        values.add(value);
        const trigger = item.querySelector<HTMLElement>(
          '[slot="trigger"], [part~="navigation-menu-trigger"]',
        );
        const content = item.querySelector<HTMLElement>(
          '[slot="content"], [part~="navigation-menu-content"]',
        );
        this.#parts.push(this.presentationController.registerPart('navigation-menu-item', item));
        if (trigger && content) {
          trigger.id ||= createId('tp-navigation-trigger');
          content.id ||= createId('tp-navigation-content');
          trigger.setAttribute('aria-controls', content.id);
          trigger.setAttribute('aria-expanded', String(value === this.value));
          content.setAttribute('aria-labelledby', trigger.id);
          content.hidden = value !== this.value;
          this.#parts.push(
            this.presentationController.registerPart('navigation-menu-trigger', trigger),
          );
          this.#parts.push(
            this.presentationController.registerPart('navigation-menu-content', content),
          );
        }
        for (const link of [item, ...item.querySelectorAll<HTMLElement>('a[href]')].filter((node) =>
          node.matches('a[href]'),
        ))
          this.#parts.push(this.presentationController.registerPart('navigation-menu-link', link));
        return [{ item, value, trigger, content }];
      });
    if (!this.#initialized) {
      this.#initialized = true;
      if (!this.value) this.value = this.defaultValue;
    }
    if (this.value && !values.has(this.value)) this.value = '';
    this.#position?.destroy();
    this.#position = undefined;
    const active = this.#items.find((item) => item.value === this.value);
    if (active?.trigger && active.content)
      this.#position = positionSurface(active.trigger, active.content, {
        strategy: 'fixed',
        placement: this.placement,
      });
  };
  #select(value: string, event: Event): boolean {
    if (this.disabled || value === this.value) return false;
    if (!this.dispatchEvent(new TpValueChangeEvent(value, this.value, eventReason(event), event)))
      return false;
    this.value = value;
    return true;
  }
  #click = (event: MouseEvent): void => {
    if (event.defaultPrevented) return;
    const path = event.composedPath();
    const item = this.#items.find((item) => item.trigger && path.includes(item.trigger));
    if (item && !item.trigger?.matches(':disabled, [disabled]'))
      this.#select(item.value === this.value ? '' : item.value, event);
    else if (
      path.some(
        (node) =>
          node instanceof HTMLElement &&
          node.matches('a[href][close-on-click]:not([close-on-click="false"])'),
      )
    )
      this.#select('', event);
  };
  #navigationKey = (event: KeyboardEvent): void => {
    if (event.defaultPrevented) return;
    const controls = this.#items
      .map(
        (item) =>
          item.trigger ??
          (item.item.matches('a[href]')
            ? item.item
            : item.item.querySelector<HTMLElement>('a[href]')),
      )
      .filter(
        (item): item is HTMLElement => Boolean(item) && !item!.matches(':disabled, [disabled]'),
      );
    const current = controls.findIndex((item) => event.composedPath().includes(item));
    if (current < 0) return;
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
    const next = event.key === forward ? current + 1 : event.key === backward ? current - 1 : -1;
    if (controls[next]) {
      event.preventDefault();
      controls[next]!.focus();
    }
  };
  #enter = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') return;
    const item = this.#items.find((item) => event.composedPath().includes(item.item));
    if (!item) return;
    this.ownerDocument.defaultView?.clearTimeout(this.#timer);
    this.#corridor?.();
    if (item.trigger && item.content && !item.trigger.matches(':disabled, [disabled]'))
      this.#timer = this.ownerDocument.defaultView?.setTimeout(
        () => this.#select(item.value, event),
        this.openDelay,
      );
  };
  #leave = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') return;
    const active = this.#items.find((item) => item.value === this.value);
    if (event.relatedTarget instanceof Node && active?.item.contains(event.relatedTarget)) return;
    this.ownerDocument.defaultView?.clearTimeout(this.#timer);
    const close = (source: PointerEvent): void => {
      this.#timer = this.ownerDocument.defaultView?.setTimeout(
        () => this.#select('', source),
        this.closeDelay,
      );
    };
    this.#corridor?.();
    if (active?.trigger && active.content)
      this.#corridor = safeCorridor(active.trigger, active.content, event, close);
    else close(event);
  };
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('value') || changed.has('placement')) this.#sync();
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.ownerDocument.defaultView?.clearTimeout(this.#timer);
    this.#corridor?.();
    this.#position?.destroy();
    for (const cleanup of this.#parts) cleanup();
    this.#parts = [];
    super.disconnectedCallback();
  }
  protected override render() {
    return html`<nav
      part="navigation-menu"
      aria-label=${this.getAttribute('aria-label') ?? 'Navigation'}
      @click=${this.#click}
      @keydown=${this.#navigationKey}
      @pointerover=${this.#enter}
      @pointerout=${this.#leave}
    >
      <div part="navigation-menu-list" role="list">
        <slot @slotchange=${this.#sync}></slot>
      </div>
    </nav>`;
  }
}

export class TpContextMenu extends TpMenu {
  static tagName = 'tp-context-menu';
  static override properties = { ...TpMenu.properties, for: { type: String } };
  for = '';
  #target: HTMLElement | null = null;
  #point: HTMLElement | null = null;
  #touch: { id: number; x: number; y: number } | undefined;
  #touchTimer: number | undefined;
  #keyboardOpen = false;
  protected override get partPrefix(): string {
    return 'context-menu';
  }
  override get trigger(): HTMLElement | null {
    return this.#target;
  }
  protected override get anchor(): Element | null {
    return this.#point ?? this.#target;
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.#bindTarget();
  }
  #bindTarget(): void {
    this.#unbindTarget();
    const targetId = this.for || this.getAttribute('for');
    this.#target = targetId ? this.ownerDocument.getElementById(targetId) : this.parentElement;
    this.#target?.addEventListener('contextmenu', this.#context);
    this.#target?.addEventListener('keydown', this.#contextKey);
    this.#target?.addEventListener('pointerdown', this.#touchStart);
    this.#target?.addEventListener('pointermove', this.#touchMove);
    this.#target?.addEventListener('pointerup', this.#touchEnd);
    this.#target?.addEventListener('pointercancel', this.#touchEnd);
  }
  #unbindTarget(): void {
    this.#touchEnd();
    this.#target?.removeEventListener('contextmenu', this.#context);
    this.#target?.removeEventListener('keydown', this.#contextKey);
    this.#target?.removeEventListener('pointerdown', this.#touchStart);
    this.#target?.removeEventListener('pointermove', this.#touchMove);
    this.#target?.removeEventListener('pointerup', this.#touchEnd);
    this.#target?.removeEventListener('pointercancel', this.#touchEnd);
  }
  #touchStart = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') return;
    if (!event.isPrimary || this.#touch) {
      this.#touchEnd();
      return;
    }
    this.#touch = { id: event.pointerId, x: event.clientX, y: event.clientY };
    this.#touchTimer = this.ownerDocument.defaultView?.setTimeout(() => {
      const point = this.#touch;
      if (point) this.#openAt(point.x, point.y, event, 10);
    }, 500);
  };
  #touchMove = (event: PointerEvent): void => {
    if (
      this.#touch &&
      (event.pointerId !== this.#touch.id ||
        Math.abs(event.clientX - this.#touch.x) > 10 ||
        Math.abs(event.clientY - this.#touch.y) > 10)
    )
      this.#touchEnd();
  };
  #touchEnd = (): void => {
    this.ownerDocument.defaultView?.clearTimeout(this.#touchTimer);
    this.#touch = undefined;
  };
  #context = (event: MouseEvent): void => {
    if (event.defaultPrevented) return;
    const box = this.#target?.getBoundingClientRect();
    const keyboard = event.button === 0 && event.clientX === 0 && event.clientY === 0;
    this.#openAt(
      keyboard && box ? box.left : event.clientX,
      keyboard && box ? box.bottom : event.clientY,
      event,
    );
    if (keyboard) this.#keyboardOpen = true;
  };
  #contextKey = (event: KeyboardEvent): void => {
    if (event.key !== 'ContextMenu' && !(event.key === 'F10' && event.shiftKey)) return;
    const box = this.#target?.getBoundingClientRect();
    if (box) this.#openAt(box.left, box.bottom, event);
  };
  #openAt(x: number, y: number, event: Event, extent = 0): void {
    if (!this.setOpen(true, eventReason(event), event)) return;
    event.preventDefault();
    this.#point ??= this.ownerDocument.createElement('span');
    this.#keyboardOpen = event instanceof KeyboardEvent;
    this.#point.style.cssText = `position:fixed;left:${x - extent / 2}px;top:${y - extent / 2}px;width:${extent}px;height:${extent}px;pointer-events:none`;
    if (!this.#point.parentNode) this.renderRoot.append(this.#point);
    void this.updateComplete.then(() => {
      this.startPosition();
      this.highlight(this.items.find((item) => !this.isDisabled(item)) ?? null, this.#keyboardOpen);
    });
  }
  override disconnectedCallback(): void {
    this.#unbindTarget();
    this.#point?.remove();
    this.#point = null;
    super.disconnectedCallback();
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('for')) this.#bindTarget();
    if (!this.open) {
      if (this.#keyboardOpen) this.#target?.focus();
      this.#keyboardOpen = false;
      this.#point?.remove();
      this.#point = null;
    }
  }
}
