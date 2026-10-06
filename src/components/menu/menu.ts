import { css, type PropertyValues } from 'lit';
import { TpHoverSurface, type AnchoredTriggerOptions } from '../anchored-surface.js';
import { TpMenuItem, type MenuItemOwner } from './menu-item.js';
import { chevronRightIcon } from '../../icons/chevron-right.js';
import type { TpIcon } from '../icon.js';
import { ContextInvocation } from './context-invocation.js';
import { TpMenuRadioGroup } from './menu-radio-group.js';
import {
  ChoiceCollectionController,
  type ChoiceRecord,
} from '../../foundation/choice-collection.js';
import { composedContains, composedParent, deepActiveElement } from '../../foundation/focus.js';
import { logicalPortalOwner } from '../../foundation/owned-portal.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import { setPartComposition } from '../../presentation/controller.js';
import { resolveLocale } from '../../foundation/services.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import type {
  AnchorGeometry,
  Alignment,
  CollisionPolicy,
  PositioningStrategy,
} from '../../foundation/positioning.js';
import type { ChangeReason } from '../../foundation/types.js';
import type { TpElement } from '../../foundation/element.js';
import { surfaceInteraction } from '../../foundation/surface-focus.js';
import { menuPresentation } from '../../presentation/families/menu.js';

export interface MenuBarOwner {
  readonly interactionElement: HTMLElement;
  readonly disabled: boolean;
  readonly modal: boolean;
  handleMenuKey(menu: TpMenu, event: KeyboardEvent): boolean;
  itemChanged(): void;
}
export interface MenuPartTarget {
  name: string;
  element: HTMLElement;
  owner: TpElement;
}
interface CommandRecord extends ChoiceRecord<HTMLElement> {
  element: HTMLElement;
  item?: TpMenuItem;
  submenu?: TpMenu;
}
export function nearestMenu(node: Node | null): TpMenu | null {
  const visited = new Set<Node>();
  for (let current = node; current && !visited.has(current);) {
    visited.add(current);
    if ((current as Element).localName === 'tp-menu') return current as TpMenu;
    const parent = composedParent(current);
    const portal = logicalPortalOwner(current);
    current = portal && logicalPortalOwner(parent) !== portal ? portal : parent;
  }
  return null;
}
function semanticTarget(element: HTMLElement): HTMLElement {
  return (
    element.shadowRoot?.querySelector<HTMLElement>('button,a[href],[role="menuitem"],[tabindex]') ??
    element
  );
}

/** Actual command-menu owner, with trigger/context invocation, nested Menu and Menubar. */
export class TpMenu extends TpHoverSurface implements MenuItemOwner {
  /** Menu restores lost focus to its last item, as Base UI Menu passes `restoreFocus`. */
  protected override get surfaceRestoreFocus(): 'popup' | 'previous' {
    return 'previous';
  }
  static tagName = 'tp-menu';
  static override presentation = menuPresentation;
  static override properties = {
    ...TpHoverSurface.properties,
    value: { type: String },
    invocation: { type: String, reflect: true },
    for: { type: String },
    itemVariant: { type: String, attribute: 'item-variant' },
    loopFocus: { type: Boolean, attribute: 'loop-focus' },
    highlightItemOnHover: { type: Boolean, attribute: 'highlight-item-on-hover' },
    closeParentOnEscape: { type: Boolean, attribute: 'close-parent-on-escape' },
    closeParentOnEsc: { type: Boolean, attribute: 'close-parent-on-esc', noAccessor: true },
  };
  static override styles = [
    TpHoverSurface.styles,
    css`
      .popup {
        min-inline-size: calc(var(--tp-spacing) * 32);
      }

      .body {
        display: flex;
        flex-direction: column;
      }
    `,
  ];
  value = '';
  invocation: 'trigger' | 'context' = 'trigger';
  for = '';
  itemVariant: 'ghost' | 'destructive' = 'ghost';
  loopFocus = true;
  highlightItemOnHover = true;
  closeParentOnEscape = false;
  override orientation: 'horizontal' | 'vertical' = 'vertical';
  override portal = true;
  override modal = true;
  override openOnHover = false;
  override align: Alignment = 'center';
  override positionMethod: PositioningStrategy = 'absolute';
  override collisionAvoidance: CollisionPolicy = { side: 'flip', align: 'flip' };
  #bar: MenuBarOwner | null = null;
  #indicators = new Map<HTMLElement, TpIcon>();
  #keyboard = false;
  #lastOpening = false;
  #openingLast = false;
  #parent: TpMenu | null = null;
  #items: CommandRecord[] = [];
  #parts: Array<() => void> = [];
  #groups = new Set<TpMenuRadioGroup>();
  #groupLabels = new Map<
    HTMLElement,
    { labels: readonly Element[] | null; attribute: string | null; applied: Element }
  >();
  #native = new Map<HTMLElement, Map<string, string | null>>();
  #nativeStates = new Map<HTMLElement, ControllableState<boolean | string>>();
  #scheduled = false;
  // Stored only on rootMenu. Ancestor collections retain their return position,
  // but only this menu may publish an active item across the visible tree.
  #highlightOwner: TpMenu | null = null;
  readonly #collection = new ChoiceCollectionController<HTMLElement, CommandRecord>({
    locale: () => resolveLocale(this),
  });
  readonly #context = new ContextInvocation({
    document: () => this.ownerDocument,
    targetId: () => this.for,
    children: () => this.ownedChildren,
    parent: () => this.parentElement,
    disabled: () => this.surfaceDisabled,
    isOpen: () => this.open,
    setTarget: (target) => {
      this.trigger = target;
    },
    targetRemoved: () => {
      this.setOpen(false, 'anchor-removed');
    },
    registerTarget: (target) => this.presentationController.registerPart('menu-target', target),
    requestOpen: (event, target) => this.requestOpen(true, 'trigger-press', event, target),
    reposition: () => {
      this.requestUpdate();
      void this.updateComplete.then(() => {
        if (this.isConnected && this.invocation === 'context') this.startPosition();
      });
    },
  });
  protected override get triggerHasPopup(): string | null {
    return this.invocation === 'context' ? null : super.triggerHasPopup;
  }
  protected override anchorGeometry(): AnchorGeometry | null {
    return this.invocation === 'context' ? this.#context.anchor : super.anchorGeometry();
  }
  protected override syncSlotTriggers(): void {
    if (this.invocation === 'context') this.#context.bindTarget();
    else super.syncSlotTriggers();
  }
  override registerTrigger(element: HTMLElement, options: AnchoredTriggerOptions = {}): () => void {
    if (this.invocation !== 'context') return super.registerTrigger(element, options);
    this.diagnostic(
      'context-target',
      'Menu context invocation uses one target and does not support detached triggers or handles.',
    );
    return () => {};
  }
  protected override focusOnClose(): void {
    const owner = this.rootMenu.#highlightOwner;
    const target = owner?.highlightedItem;
    let parent = this.parentMenu;
    let trigger = this.menuTrigger;
    while (parent && parent !== owner) {
      trigger = parent.menuTrigger;
      parent = parent.parentMenu;
    }
    if (
      owner &&
      parent === owner &&
      target &&
      target !== trigger &&
      this.popupElement &&
      composedContains(this.popupElement, deepActiveElement(this.ownerDocument))
    ) {
      // Parent navigation has already chosen another item. Do not restore the
      // abandoned trigger (including when this is a deeper portaled descendant).
      (owner.#keyboard ? target : owner.popupElement)?.focus({ preventScroll: true });
      return;
    }
    if (this.invocation !== 'context' || this.#context.shouldRestoreFocus(this.popupElement))
      super.focusOnClose();
    if (this.parentMenu && deepActiveElement(this.ownerDocument) === this.menuTrigger) {
      const record = this.parentMenu.#items.find((item) => item.submenu === this);
      if (record) this.parentMenu.#highlight(record, this.#keyboard);
    }
  }
  protected override closed(): void {
    super.closed();
    this.#context.closed();
  }
  protected override get partPrefix(): string {
    return this.#parent?.itemPartPrefix ?? 'menu';
  }
  override get presentationTagName(): string {
    return `tp-${this.partPrefix}`;
  }
  protected override partName(suffix: string): string {
    const nested = this.#parent && (suffix === 'content' || suffix === 'trigger');
    return `${this.partPrefix}-${nested ? `sub-${suffix}` : suffix}`;
  }
  get menuDisabled(): boolean {
    return this.surfaceDisabled;
  }
  get typing(): boolean {
    return this.#collection.typeahead.typing;
  }
  setMenuBar(owner: MenuBarOwner | null): void {
    this.#bar = owner;
    this.requestUpdate();
  }
  protected override get surfaceDisabled(): boolean {
    return super.surfaceDisabled || !!this.#bar?.disabled || !!this.#parent?.menuDisabled;
  }
  get itemPartPrefix(): string {
    return this.partPrefix;
  }
  get presentationFamilyTagNames(): readonly string[] {
    return this.rootMenu.#bar ? ['tp-menubar'] : [];
  }
  protected override get overlayRole(): string {
    return 'menu';
  }
  protected override get surfaceMotionRole(): boolean {
    return false;
  }
  protected override get surfaceModal(): boolean {
    return !this.parentMenu && (this.#bar?.modal ?? super.surfaceModal);
  }
  protected override get surfaceBranchElements(): readonly Element[] {
    const elements = super.surfaceBranchElements;
    return this.#bar ? [...elements, this.#bar.interactionElement] : elements;
  }
  protected override get focusOpens(): boolean {
    return false;
  }
  protected override get pressToggles(): boolean {
    return true;
  }
  protected override get defaultHoverDelay(): number {
    return 100;
  }
  protected override get defaultCloseDelay(): number {
    return 0;
  }
  get closeParentOnEsc(): boolean {
    return this.closeParentOnEscape;
  }
  set closeParentOnEsc(value: boolean) {
    this.closeParentOnEscape = value;
  }
  get rootMenu(): TpMenu {
    return this.parentMenu?.rootMenu ?? this;
  }
  get parentMenu(): TpMenu | null {
    return this.#parent;
  }
  get menuTriggerHost(): HTMLElement | null {
    return this.trigger ?? this.records.keys().next().value ?? null;
  }
  get menuTrigger(): HTMLElement | null {
    const trigger = this.menuTriggerHost;
    return trigger ? semanticTarget(trigger) : null;
  }
  get commandItems(): readonly HTMLElement[] {
    return this.#items.map((record) => record.element);
  }
  /** Current targets retain their actual constituent's presentation owner. */
  get menubarPartTargets(): readonly MenuPartTarget[] {
    const targets: MenuPartTarget[] = [{ name: 'menubar-menu', element: this, owner: this }];
    const add = (name: string, element: HTMLElement | null, owner: TpElement = this): void => {
      if (element) targets.push({ name: `menubar-${name}`, element, owner });
    };
    add(this.parentMenu ? 'sub-trigger' : 'trigger', this.menuTrigger);
    add(this.parentMenu ? 'sub-content' : 'content', this.popupElement);
    for (const record of this.#items) {
      if (record.submenu) targets.push(...record.submenu.menubarPartTargets);
      else add('item', record.element, record.item ?? this);
    }
    for (const element of this.#ownedElements()) {
      if (nearestMenu(composedParent(element)) !== this) continue;
      if (element instanceof TpMenuRadioGroup) add('group', element.controlElement, element);
      else if (element.matches('[role="group"]')) add('group', element);
      else if (element.matches('tp-separator,[role="separator"]')) add('separator', element);
      else if (element.hasAttribute('data-menu-shortcut')) add('shortcut', element);
    }
    return targets;
  }
  get highlightedItem(): HTMLElement | null {
    return this.open && this.rootMenu.#highlightOwner === this
      ? this.#collection.element(this.#collection.highlighted)
      : null;
  }
  itemChanged = (): void => {
    if (this.#scheduled) return;
    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;
      if (this.isConnected) this.#syncItems();
    });
  };
  override connectedCallback(): void {
    this.#parent = nearestMenu(composedParent(this));
    super.connectedCallback();
    if (this.invocation === 'context') this.#context.connect();
    if (this.#parent) {
      // The same Root is a submenu; these are the source SubmenuRoot policies.
      this.openOnHover = true;
      this.side = 'inline-end';
      this.align = 'start';
      this.#parent.itemChanged();
    }
  }
  #ownedElements(): HTMLElement[] {
    return this.contentElements.flatMap((element) => [
      element,
      ...element.querySelectorAll<HTMLElement>('*'),
    ]);
  }
  #syncItems(): void {
    const previous = this.#items;
    const oldIndex = this.#collection.activeIndex;
    const active = deepActiveElement(this.ownerDocument);
    const hadFocus = previous.some(
      (record) => record.element === active || record.element.contains(active),
    );
    const elements = this.#ownedElements();
    const records: CommandRecord[] = [];
    for (const element of elements) {
      const own = nearestMenu(composedParent(element));
      if (own !== this) continue;
      if (element.localName === 'tp-menu') {
        const submenu = element as TpMenu;
        setPartComposition(submenu, this, this.partPresentation);
        const target = submenu.menuTrigger;
        if (target)
          records.push({
            value: element,
            label: target.textContent?.trim() ?? '',
            text: target.getAttribute('aria-label') ?? target.textContent?.trim() ?? '',
            disabled: this.menuDisabled || submenu.disabled,
            element: target,
            submenu,
          });
      } else if (element instanceof TpMenuItem) {
        element.menuOwner = this;
        setPartComposition(element, this, this.partPresentation);
        if (element.controlElement)
          records.push({
            value: element,
            label: element.label || element.textContent?.trim() || '',
            text: element.label || element.textContent?.trim() || '',
            disabled: element.itemDisabled,
            element: element.controlElement,
            item: element,
          });
      } else if (
        element.matches(
          '[value],[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"],a[href]',
        ) &&
        !(element instanceof TpMenuRadioGroup) &&
        !element.closest('tp-menu-item,tp-menu-checkbox-item,tp-menu-radio-item')
      ) {
        records.push({
          value: element,
          label: element.getAttribute('label') || element.textContent?.trim() || '',
          disabled:
            this.menuDisabled || element.matches(':disabled,[disabled],[aria-disabled="true"]'),
          element: semanticTarget(element),
        });
      }
    }
    for (const record of previous) {
      const replacement = records.find((next) => next.value === record.value);
      if (!replacement) this.#releaseItem(record);
      else if (replacement.element !== record.element) this.#restoreNative(record.element);
    }
    this.#items = records;
    for (const [owner, state] of this.#nativeStates) {
      if (
        !records.some(
          (record) =>
            record.element === owner ||
            (record.element.getAttribute('role') === 'menuitemradio' &&
              this.#nativeRadioGroup(record.element) === owner),
        )
      ) {
        this.removeController(state);
        this.#nativeStates.delete(owner);
      }
    }
    this.#collection.setSource(records);
    for (const release of this.#parts.splice(0)) release();
    for (const record of records) {
      const element = record.element;
      if (!record.item) {
        if (!this.#native.has(element))
          this.#native.set(
            element,
            new Map(
              ['role', 'tabindex', 'data-highlighted', 'data-focus-visible', 'aria-disabled'].map(
                (name) => [name, element.getAttribute(name)],
              ),
            ),
          );
        if (
          !element.hasAttribute('role') ||
          ['button', 'link'].includes(element.getAttribute('role')!)
        )
          element.setAttribute('role', 'menuitem');
        element.tabIndex = -1;
      }
      const suffix = record.submenu
        ? 'sub-trigger'
        : record.item?.localName === 'tp-menu-checkbox-item'
          ? 'checkbox-item'
          : record.item?.localName === 'tp-menu-radio-item'
            ? 'radio-item'
            : 'item';
      if (!record.item && !record.submenu)
        this.#parts.push(this.presentationController.registerPart(this.partName(suffix), element));
    }
    const groups = new Set<TpMenuRadioGroup>();
    for (const element of elements) {
      if (nearestMenu(composedParent(element)) !== this) continue;
      if (element instanceof TpMenuRadioGroup) {
        groups.add(element);
        element.menuOwner = this;
        setPartComposition(element, this, this.partPresentation);
      }
      const suffix =
        element instanceof TpMenuRadioGroup
          ? 'radio-group'
          : element.matches('[role="group"]')
            ? 'group'
            : element.matches('tp-separator,[role="separator"]')
              ? 'separator'
              : element.hasAttribute('data-menu-label')
                ? 'label'
                : element.hasAttribute('data-menu-shortcut')
                  ? 'shortcut'
                  : undefined;
      if (suffix && !(element instanceof TpMenuRadioGroup))
        this.#parts.push(this.presentationController.registerPart(this.partName(suffix), element));
    }
    for (const group of this.#groups)
      if (!groups.has(group)) {
        group.menuOwner = null;
        setPartComposition(group, this);
      }
    this.#groups = groups;
    this.#syncGroupLabels(elements);
    if (
      hadFocus &&
      !records.some((record) => record.element === active || record.element.contains(active))
    ) {
      this.#collection.activeIndex = Math.min(Math.max(oldIndex, 0), records.length - 1);
      this.#highlight(this.#collection.highlighted, true);
    } else this.#syncHighlight();
  }
  #releaseItem(record: CommandRecord): void {
    if (record.submenu) setPartComposition(record.submenu, this);
    if (record.item) {
      record.item.menuOwner = null;
      setPartComposition(record.item, this);
    }
    this.#restoreNative(record.element);
  }
  #restoreNative(element: HTMLElement): void {
    const original = this.#native.get(element);
    for (const [name, value] of original ?? []) {
      if (value === null) element.removeAttribute(name);
      else element.setAttribute(name, value);
    }
    this.#native.delete(element);
  }
  #restoreGroupLabel(group: HTMLElement): void {
    const record = this.#groupLabels.get(group);
    if (!record) return;
    if (
      group.ariaLabelledByElements?.length === 1 &&
      group.ariaLabelledByElements[0] === record.applied
    ) {
      group.ariaLabelledByElements = record.labels;
      if (record.attribute !== null) group.setAttribute('aria-labelledby', record.attribute);
    }
    this.#groupLabels.delete(group);
  }
  #syncGroupLabels(elements: readonly HTMLElement[]): void {
    const current = new Set<HTMLElement>();
    for (const group of elements) {
      if (!group.matches('[role="group"]') || nearestMenu(composedParent(group)) !== this) continue;
      const label = [...group.querySelectorAll<HTMLElement>('[data-menu-label]')].find(
        (candidate) => candidate.closest('[role="group"]') === group,
      );
      if (!label || group.hasAttribute('aria-label')) continue;
      const existing = this.#groupLabels.get(group);
      if (
        !existing &&
        (group.hasAttribute('aria-labelledby') || group.ariaLabelledByElements?.length)
      )
        continue;
      current.add(group);
      if (existing?.applied === label) continue;
      this.#restoreGroupLabel(group);
      this.#groupLabels.set(group, {
        labels: group.ariaLabelledByElements,
        attribute: group.getAttribute('aria-labelledby'),
        applied: label,
      });
      group.ariaLabelledByElements = [label];
    }
    for (const group of this.#groupLabels.keys())
      if (!current.has(group)) this.#restoreGroupLabel(group);
  }
  #syncHighlight(): void {
    for (const record of this.#items) {
      const highlighted =
        this.open &&
        this.rootMenu.#highlightOwner === this &&
        record === this.#collection.highlighted;
      record.item?.setHighlight(highlighted, this.#keyboard);
      if (!record.item) {
        record.element.toggleAttribute('data-highlighted', highlighted);
        record.element.toggleAttribute('data-focus-visible', highlighted && this.#keyboard);
      }
    }
  }
  #highlight(record: CommandRecord | undefined, keyboard: boolean, event?: Event): void {
    const root = this.rootMenu;
    const previousOwner = root.#highlightOwner;
    if (record) root.#highlightOwner = this;
    else if (previousOwner === this) root.#highlightOwner = null;
    this.#keyboard = keyboard;
    this.#collection.activeIndex = record ? this.#items.indexOf(record) : -1;
    if (previousOwner && previousOwner !== this) previousOwner.#syncHighlight();
    this.#syncHighlight();
    if (record) {
      for (const item of this.#items) {
        const child = item.submenu;
        if (!child?.open || item === record) continue;
        child.setOpen(false, 'list-navigation', event);
      }
    }
    if (keyboard) {
      record?.element.focus({ preventScroll: true });
      const scrollOptions = { block: 'nearest', inline: 'nearest', container: 'nearest' } as const;
      record?.element.scrollIntoView(scrollOptions);
    }
  }
  requestItem(item: TpMenuItem, event: Event, commit: () => boolean): void {
    const record = this.#items.find((record) => record.item === item);
    if (!record || record.disabled || !this.open) return;
    if (
      !this.emit(
        'tp-action',
        { value: item.value, item, sourceEvent: event },
        { cancelable: true },
      ) ||
      !commit()
    )
      return;
    if (!this.#bar) this.value = String(item.value ?? item.label ?? item.textContent ?? '');
    if (item.closeOnClick) this.closeBranch('item-press', event);
  }
  closeBranch(reason: ChangeReason, event?: Event): void {
    if (this.setOpen(false, reason, event)) this.parentMenu?.closeBranch(reason, event);
  }
  #nativeClick = (event: MouseEvent): void => {
    const record = this.#items.find((record) => event.composedPath().includes(record.element));
    if (!record || record.item || record.submenu) return;
    queueMicrotask(() => {
      if (record.disabled || event.defaultPrevented || componentHandlingPrevented(event)) return;
      const element = record.element;
      const value = record.value.getAttribute('value') ?? element.getAttribute('value') ?? '';
      if (
        !this.emit(
          'tp-action',
          { value, item: record.value, sourceEvent: event },
          { cancelable: true },
        )
      )
        return;
      const role = element.getAttribute('role');
      if (role === 'menuitemcheckbox' || role === 'menuitemradio') {
        const checkbox = role === 'menuitemcheckbox';
        const owner = checkbox ? element : this.#nativeRadioGroup(element);
        let state = this.#nativeStates.get(owner);
        if (!state) {
          state = new ControllableState<boolean | string>({
            host: this,
            initialValue: checkbox
              ? element.getAttribute('aria-checked') === 'true'
              : (this.#items
                  .find(
                    (member) =>
                      member.element.getAttribute('role') === 'menuitemradio' &&
                      this.#nativeRadioGroup(member.element) === owner &&
                      member.element.getAttribute('aria-checked') === 'true',
                  )
                  ?.value.getAttribute('value') ?? ''),
            onCommit: (next) => {
              if (checkbox) element.setAttribute('aria-checked', String(next));
              else
                for (const member of this.#items)
                  if (
                    member.element.getAttribute('role') === 'menuitemradio' &&
                    this.#nativeRadioGroup(member.element) === owner
                  )
                    member.element.setAttribute(
                      'aria-checked',
                      String(member.value.getAttribute('value') === next),
                    );
            },
          });
          this.#nativeStates.set(owner, state);
        }
        const next = checkbox ? !state.value : value;
        if (!Object.is(next, state.value) && !state.set(next, 'selection', event)) return;
      }
      const close = record.element.hasAttribute('close-on-click')
        ? record.element.getAttribute('close-on-click') !== 'false'
        : !record.element.matches('a[href],[role="menuitemcheckbox"],[role="menuitemradio"]');
      if (close)
        this.closeBranch(record.element.matches('a[href]') ? 'link-press' : 'item-press', event);
    });
  };
  #nativeRadioGroup(element: HTMLElement): HTMLElement {
    return element.closest<HTMLElement>('[role="group"]') ?? this;
  }
  #pointer = (event: PointerEvent): void => {
    if (
      !this.#ownsMenuEvent(event) ||
      event.pointerType === 'touch' ||
      !this.highlightItemOnHover ||
      componentHandlingPrevented(event)
    )
      return;
    const record = this.#items.find(
      (record) =>
        event.composedPath().includes(record.element) ||
        (record.item && event.composedPath().includes(record.item)),
    );
    if (record && !record.disabled) this.#highlight(record, false, event);
  };
  #ownsMenuEvent(event: Event): boolean {
    return (
      event.composedPath().find((node) => (node as Element).getAttribute?.('role') === 'menu') ===
      this.popupElement
    );
  }
  #itemFocus = (event: FocusEvent): void => {
    if (!this.#ownsMenuEvent(event)) return;
    const record = this.#items.find((item) => event.composedPath().includes(item.element));
    if (record && !record.disabled) this.#highlight(record, this.#keyboard, event);
  };
  protected override popupProperties(): Record<string, unknown> {
    return {
      ...super.popupProperties(),
      'aria-orientation': this.orientation,
      '@click': this.#nativeClick,
      '@pointermove': this.#pointer,
      '@focusin': this.#itemFocus,
    };
  }
  protected override surfaceKeydown = (event: KeyboardEvent): void => {
    if (
      event.defaultPrevented ||
      componentHandlingPrevented(event) ||
      event.isComposing ||
      this.menuDisabled
    )
      return;
    // A nested popup owns its own list; parent listeners must not navigate twice.
    const root = event
      .composedPath()
      .find(
        (node) => node === this.popupElement || (node as Element).getAttribute?.('role') === 'menu',
      );
    if (root !== this.popupElement) return;
    const highlighted = this.#collection.highlighted;
    const forward = this.direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const backward = this.direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    if (event.key === forward && highlighted?.submenu) {
      event.preventDefault();
      highlighted.submenu.setOpen(true, 'list-navigation', event);
      return;
    }
    if (event.key === backward && this.parentMenu) {
      event.preventDefault();
      this.setOpen(false, 'list-navigation', event);
      this.menuTrigger?.focus();
      return;
    }
    if (!this.parentMenu && this.#bar?.handleMenuKey(this, event)) return;
    if (event.key === 'Tab') {
      event.preventDefault();
      const rootMenu = this.rootMenu;
      this.closeBranch('focus-outside', event);
      void rootMenu.updateComplete.then(() => rootMenu.focusOutside(event.shiftKey ? -1 : 1));
      return;
    }
    const next = this.orientation === 'vertical' ? 'ArrowDown' : forward;
    const previous = this.orientation === 'vertical' ? 'ArrowUp' : backward;
    let record: CommandRecord | undefined;
    if (event.key === next || event.key === previous)
      record = this.#collection.move(event.key === next ? 1 : -1, this.loopFocus);
    else if (event.key === 'Home' || event.key === 'End')
      record = this.#collection.boundary(event.key === 'End');
    else if (
      event.key.length === 1 &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      (event.key !== ' ' || this.#collection.typeahead.typing)
    )
      record = this.#collection.search(event.key);
    if (record) {
      event.preventDefault();
      this.#highlight(record, true, event);
    }
  };
  protected override bindInteraction(
    element: HTMLElement,
    options: AnchoredTriggerOptions,
  ): () => void {
    const release = super.bindInteraction(element, options);
    const key = (event: KeyboardEvent): void => {
      if (
        this.parentMenu ||
        event.defaultPrevented ||
        componentHandlingPrevented(event) ||
        this.triggerDisabled(element, options)
      )
        return;
      if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
      event.preventDefault();
      this.#openingLast = event.key === 'ArrowUp';
      this.requestOpen(true, 'list-navigation', event, element);
      if (this.open) {
        this.#collection.openAt([], this.#openingLast);
        this.#highlight(this.#collection.highlighted, true);
      }
    };
    element.addEventListener('keydown', key);
    return () => {
      release();
      element.removeEventListener('keydown', key);
    };
  }
  protected override accepted(open: boolean, reason: ChangeReason, event?: Event): void {
    super.accepted(open, reason);
    if (open) {
      this.#lastOpening =
        surfaceInteraction(event) === 'keyboard' ||
        reason === 'list-navigation' ||
        (this.invocation === 'context' && this.#context.keyboardOpening);
      this.#collection.typeahead.reset();
      if (this.parentMenu)
        for (const sibling of this.parentMenu.#items)
          if (sibling.submenu && sibling.submenu !== this && sibling.submenu.open)
            sibling.submenu.setOpen(false, 'sibling-open', event);
    } else
      for (const child of this.#items)
        if (child.submenu?.open) child.submenu.setOpen(false, 'dismiss', event);
  }
  protected override focusOnOpen(): void {
    this.#syncItems();
    if (this.#lastOpening) {
      this.#collection.openAt([], this.#openingLast);
      this.#highlight(this.#collection.highlighted, true);
    } else {
      this.#highlight(undefined, false);
      this.popup?.focus({ preventScroll: true });
    }
    this.#openingLast = false;
  }
  protected override dismissSurface(event: Event): void {
    if (event.type === 'keydown') {
      this.setOpen(false, 'escape-key', event);
      if (this.closeParentOnEscape) this.parentMenu?.closeBranch('escape-key', event);
    } else this.closeBranch('outside-press', event);
  }
  #syncSubmenuIndicators(): void {
    for (const [target, icon] of this.#indicators) {
      if (
        !this.#parent ||
        !this.records.has(target) ||
        [...target.children].some(
          (child) =>
            child !== icon &&
            child.getAttribute('slot') === 'icon-end' &&
            !child.hasAttribute('data-menu-hint'),
        )
      ) {
        icon.remove();
        this.#indicators.delete(target);
      }
    }
    if (!this.#parent) return;
    for (const target of this.records.keys()) {
      // A trailing `data-menu-hint` (for example the selected value) keeps the chevron after it.
      if (
        !this.#indicators.has(target) &&
        !target.querySelector('[slot="icon-end"]:not([data-menu-hint])')
      ) {
        const icon = this.ownerDocument.createElement('tp-icon') as TpIcon;
        icon.icon = chevronRightIcon;
        icon.size = 'var(--tp-icon-size-sm)';
        icon.slot = 'icon-end';
        icon.style.marginInlineStart = 'auto';
        icon.style.pointerEvents = 'none';
        this.#indicators.set(target, icon);
        target.append(icon);
      }
      const icon = this.#indicators.get(target);
      if (icon) icon.style.rotate = this.direction === 'rtl' ? '180deg' : '0deg';
    }
  }
  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('invocation') && changed.get('invocation') !== undefined) {
      if (this.open) this.setOpen(false, 'anchor-removed');
      this.#context.disconnect();
      this.resetTriggerRegistrations();
      if (this.invocation === 'context') this.#context.connect();
    }
    if (changed.has('for') && this.invocation === 'context') this.#context.bindTarget();
    super.updated(changed);
    this.#syncSubmenuIndicators();
    this.#syncItems();
    this.rootMenu.#bar?.itemChanged();
  }
  override disconnectedCallback(): void {
    if (this.rootMenu.#highlightOwner === this) this.rootMenu.#highlightOwner = null;
    this.#context.disconnect();
    for (const icon of this.#indicators.values()) icon.remove();
    this.#indicators.clear();
    for (const child of this.#items)
      if (child.submenu?.open) child.submenu.setOpen(false, 'anchor-removed');
    for (const record of this.#items) this.#releaseItem(record);
    this.#items = [];
    this.#parts.splice(0).forEach((release) => release());
    for (const group of this.#groups) {
      group.menuOwner = null;
      setPartComposition(group, this);
    }
    this.#groups.clear();
    for (const group of this.#groupLabels.keys()) this.#restoreGroupLabel(group);
    this.#collection.disconnect();
    for (const state of this.#nativeStates.values()) this.removeController(state);
    this.#nativeStates.clear();
    this.#parent?.itemChanged();
    this.#parent = null;
    super.disconnectedCallback();
  }
}
