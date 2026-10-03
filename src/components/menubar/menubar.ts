import { css, html, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import { TpSurfaceOpenChangeEvent } from '../../foundation/surface-state.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import type { ChangeReason } from '../../foundation/types.js';
import { createId } from '../../foundation/id.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import type { TpMenu, MenuBarOwner } from '../menu/menu.js';
import { setPartComposition } from '../../presentation/controller.js';
import type { PartPresentation } from '../../presentation/resolver.js';

interface Member {
  menu: TpMenu;
  identifier: string;
  target: HTMLElement | null;
  original: Map<string, string | null>;
  parts: Array<() => void>;
}
/** One scalar value commits the entire bar; child surfaces are passive derived views. */
export class TpMenubar extends TpElement implements MenuBarOwner {
  static tagName = 'tp-menubar';
  static override properties = {
    ...TpElement.properties,
    value: { type: String, noAccessor: true },
    defaultValue: { type: String, attribute: 'default-value' },
    onValueChange: { attribute: false },
    loopFocus: { type: Boolean, attribute: 'loop-focus' },
    modal: { type: Boolean },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      .bar {
        display: flex;
        align-items: center;
      }

      .bar[data-orientation='vertical'] {
        flex-direction: column;
        align-items: start;
      }
    `,
  ];
  defaultValue: string | undefined;
  onValueChange: ((event: TpValueChangeEvent<string>) => void) | undefined;
  loopFocus = true;
  modal = true;
  override orientation: 'horizontal' | 'vertical' = 'horizontal';
  #provided: string | undefined;
  #members: Member[] = [];
  #focusMember: TpMenu | null = null;
  #observer: MutationObserver | undefined;
  #pending = new Map<TpMenu, TpSurfaceOpenChangeEvent>();
  #diagnostics = new Set<string>();
  #compositions = new Map<TpElement, PartPresentation>();
  #partsQueued = false;
  itemChanged = (): void => {
    if (this.#partsQueued) return;
    this.#partsQueued = true;
    queueMicrotask(() => {
      this.#partsQueued = false;
      if (this.isConnected) this.#syncTriggers();
    });
  };
  #state = new ControllableState<string>({
    host: this,
    initialValue: '',
    readControlledValue: () => this.#provided,
    readDefaultValue: () => this.defaultValue ?? '',
    hasDefaultValue: () => this.defaultValue !== undefined,
    onChange: (event) => this.onValueChange?.(event),
    onCommit: (value, previous, reason) => this.#commit(value, previous, reason),
    diagnostic: (message) => this.#diagnose('state', message),
  });
  get value(): string {
    return this.#state.value;
  }
  set value(value: string | null | undefined) {
    const previous = this.#provided;
    this.#provided = value === undefined ? undefined : String(value ?? '');
    this.requestUpdate('value', previous);
    if (this.hasUpdated) this.#state.sync();
  }
  #diagnose(code: string, message: string): void {
    if (this.#diagnostics.has(code)) return;
    this.#diagnostics.add(code);
    this.emit('tp-diagnostic', { code: `menubar-${code}`, message });
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer = new this.ownerDocument.defaultView!.MutationObserver(this.#sync);
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'id', 'disabled'],
    });
  }
  requestMenu(menu: TpMenu, open: boolean, reason: ChangeReason, event?: Event): boolean {
    const member = this.#members.find((member) => member.menu === menu);
    if (!member || this.disabled || menu.disabled) return false;
    const next = open ? member.identifier : '';
    if (next === this.value) return false;
    const previous = this.#members.find((member) => member.identifier === this.value);
    this.#pending.clear();
    if (previous && previous.menu !== menu)
      this.#pending.set(previous.menu, previous.menu.stageOpen(false, reason, event));
    this.#pending.set(menu, menu.stageOpen(open, reason, event, menu.menuTriggerHost));
    if (
      [...this.#pending.values()].some(
        (proposal) => proposal.defaultPrevented || proposal.detail.cancelled,
      )
    ) {
      this.#pending.clear();
      return false;
    }
    const accepted = this.#state.set(next, reason, event, {
      ...(menu.menuTrigger ? { trigger: menu.menuTrigger } : {}),
    });
    this.#pending.clear();
    return accepted && this.value === next;
  }
  #commit(value: string, previous: string, reason: ChangeReason): void {
    // ControllableState has already published the sole scalar getter before any child sees a commit.
    for (const member of this.#members) {
      const open = member.identifier === value && !this.disabled && !member.menu.disabled;
      const wasOpen = member.identifier === previous;
      if (open !== wasOpen) {
        const staged = this.#pending.get(member.menu);
        const event =
          staged?.detail.value === open
            ? staged
            : new TpSurfaceOpenChangeEvent(open, wasOpen, reason);
        member.menu.acceptCoordinatedOpen(event, member.menu.menuTriggerHost);
      }
      member.menu.requestUpdate();
    }
    this.#syncTriggers();
  }
  #restore(member: Member): void {
    member.parts.splice(0).forEach((release) => release());
    if (member.target)
      for (const [name, value] of member.original) {
        if (value === null) member.target.removeAttribute(name);
        else member.target.setAttribute(name, value);
      }
    member.original.clear();
    member.target = null;
  }
  #release(member: Member): void {
    this.#restore(member);
    member.menu.acceptCoordinatedOpen(
      new TpSurfaceOpenChangeEvent(false, member.menu.open, 'anchor-removed'),
    );
    member.menu.setOpenCoordinator(undefined);
    member.menu.setMenuBar(null);
  }
  #sync = (): void => {
    if (!this.isConnected) return;
    const menus = [...this.querySelectorAll<TpMenu>('tp-menu')].filter(
      (menu) => (menu.closest('tp-menubar') as Element | null) === this && !menu.parentMenu,
    );
    const previous = this.#members;
    const previousActive = previous.find((member) => member.identifier === this.value);
    const next: Member[] = [];
    const ids = new Set<string>();
    for (const menu of menus) {
      menu.id ||= createId('tp-menubar-menu');
      const identifier = menu.value || menu.id;
      if (ids.has(identifier)) {
        this.#diagnose(
          `duplicate:${identifier}`,
          'Each participating Menu requires a unique value or id; later duplicates are excluded.',
        );
        continue;
      }
      ids.add(identifier);
      let member = previous.find((member) => member.menu === menu);
      if (!member) {
        const isOpen = () =>
          this.value === (menu.value || menu.id) && !this.disabled && !menu.disabled;
        const accepted = menu.setOpenCoordinator({
          get open() {
            return isOpen();
          },
          request: (open, reason, event) => this.requestMenu(menu, open, reason, event),
        });
        if (!accepted) continue;
        member = { menu, identifier, target: null, original: new Map(), parts: [] };
        menu.setMenuBar(this);
      }
      member.identifier = identifier;
      next.push(member);
    }
    for (const member of previous) if (!next.includes(member)) this.#release(member);
    this.#members = next;
    if (
      this.value &&
      (!next.some((member) => member.identifier === this.value) ||
        (previousActive && !next.includes(previousActive))) &&
      !this.#state.controlled
    )
      this.#state.set('', 'missing', undefined, { cancelable: false });
    if (
      this.#focusMember &&
      !next.some((member) => member.menu === this.#focusMember && !member.menu.disabled)
    ) {
      const index = previous.findIndex((member) => member.menu === this.#focusMember);
      this.#focusMember =
        next.slice(Math.max(0, index)).find((member) => !member.menu.disabled)?.menu ??
        next.filter((member) => !member.menu.disabled).at(-1)?.menu ??
        null;
      this.#focusMember?.menuTrigger?.focus();
    }
    this.#syncTriggers();
  };
  #syncTriggers(): void {
    const owners = new Set<TpElement>();
    const selected = this.#members.find((member) => member.identifier === this.value);
    const focus =
      this.#focusMember ??
      selected?.menu ??
      this.#members.find((member) => !member.menu.disabled)?.menu;
    for (const member of this.#members) {
      const target = member.menu.menuTrigger;
      if (target !== member.target) {
        this.#restore(member);
        member.target = target;
        if (target)
          member.original = new Map(
            ['role', 'tabindex', 'aria-disabled'].map((name) => [name, target.getAttribute(name)]),
          );
      }
      if (target) {
        target.setAttribute('role', 'menuitem');
        target.tabIndex = !this.disabled && !member.menu.disabled && member.menu === focus ? 0 : -1;
        target.setAttribute('aria-disabled', String(this.disabled || member.menu.disabled));
      }
      member.parts.splice(0).forEach((release) => release());
      for (const part of member.menu.menubarPartTargets) {
        owners.add(part.owner);
        if (this.#compositions.get(part.owner) !== this.partPresentation) {
          setPartComposition(part.owner, this, this.partPresentation);
          this.#compositions.set(part.owner, this.partPresentation);
        }
        member.parts.push(part.owner.presentationController.registerPart(part.name, part.element));
      }
    }
    for (const owner of this.#compositions.keys())
      if (!owners.has(owner)) {
        setPartComposition(owner, this);
        this.#compositions.delete(owner);
      }
  }
  handleMenuKey(menu: TpMenu, event: KeyboardEvent): boolean {
    if (event.defaultPrevented || componentHandlingPrevented(event) || this.disabled) return false;
    const enabled = this.#members.filter((member) => !member.menu.disabled && member.target);
    const index = enabled.findIndex((member) => member.menu === menu);
    if (index < 0) return false;
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
    let next =
      event.key === forward
        ? index + 1
        : event.key === backward
          ? index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? enabled.length - 1
              : -1;
    if (next < 0 && event.key !== backward) return false;
    if (![forward, backward, 'Home', 'End'].includes(event.key)) return false;
    event.preventDefault();
    next = this.loopFocus
      ? (next + enabled.length) % enabled.length
      : Math.min(enabled.length - 1, Math.max(0, next));
    const target = enabled[next];
    if (!target) return true;
    if (
      this.value &&
      target.identifier !== this.value &&
      !this.requestMenu(target.menu, true, 'list-navigation', event)
    )
      return true;
    this.#focusMember = target.menu;
    this.#syncTriggers();
    target.target?.focus();
    return true;
  }
  #key = (event: KeyboardEvent): void => {
    const member = this.#members.find(
      (member) => !!member.target && event.composedPath().includes(member.target),
    );
    if (member) this.handleMenuKey(member.menu, event);
  };
  #hover = (event: PointerEvent): void => {
    if (event.pointerType === 'touch' || !this.value || componentHandlingPrevented(event)) return;
    const member = this.#members.find(
      (member) => !!member.target && event.composedPath().includes(member.target),
    );
    if (member && member.identifier !== this.value)
      this.requestMenu(member.menu, true, 'trigger-hover', event);
  };
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#sync();
    if (changed.has('disabled') || changed.has('modal'))
      for (const member of this.#members) member.menu.requestUpdate();
  }
  protected override render() {
    return this.renderPart(
      'menubar',
      { value: this.value, disabled: this.disabled, orientation: this.orientation },
      {
        properties: {
          class: 'bar',
          role: 'menubar',
          'aria-label': this.getAttribute('aria-label') || 'Application menu',
          'aria-orientation': this.orientation,
          'data-orientation': this.orientation,
          'data-disabled': this.disabled,
          '@keydown': this.#key,
          '@pointerover': this.#hover,
        },
        content: html`<slot @slotchange=${this.#sync}></slot>`,
      },
    );
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#observer = undefined;
    for (const member of this.#members) this.#release(member);
    this.#members = [];
    this.#pending.clear();
    for (const owner of this.#compositions.keys()) setPartComposition(owner, this);
    this.#compositions.clear();
    super.disconnectedCallback();
  }
}
