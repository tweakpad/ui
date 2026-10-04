import { OwnedAttributes as Attributes } from './owned-attributes.js';
import { CollectionRegistry } from './collection.js';
import { compositeControl } from './composite-control.js';
import { composedContains, composedElements, deepActiveElement, isAvailable } from './focus.js';
import { componentHandlingPrevented } from './part.js';
import { CleanupScope } from './services.js';
import type { Orientation } from './types.js';

export interface ToolbarOptions {
  orientation?: Orientation;
  loopFocus?: boolean;
  disabled?: boolean;
}
export interface ToolbarItemOptions {
  kind: 'button' | 'link' | 'input';
  disabled?: boolean;
  focusableWhenDisabled?: boolean;
}
export interface ToolbarRegistration<T> {
  update(options: Partial<T>): void;
  dispose(): void;
}
type Item = {
  element: HTMLElement;
  options: ToolbarItemOptions;
  attributes: Attributes;
  release: () => void;
};
type Group = { element: HTMLElement; disabled?: boolean; attributes: Attributes };
const roots = new WeakMap<HTMLElement, ToolbarController>();
const itemOwners = new WeakMap<HTMLElement, ToolbarController>();

/** Whether the native editor still owns this arrow/Home/End operation. */
export function toolbarInputOwnsKey(event: KeyboardEvent, element: HTMLElement): boolean {
  if (event.isComposing || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey)
    return true;
  if (!['input', 'textarea'].includes(element.localName)) return false;
  const input = element as HTMLInputElement | HTMLTextAreaElement;
  if (input.readOnly || input.disabled) return false;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  if (start === null || end === null) {
    // Numeric/date/range editors own their native increment/decrement arrows.
    return event.key.startsWith('Arrow');
  }
  if (event.key === 'Home' || event.key === 'End') return true;
  if (start !== end) return event.key.startsWith('Arrow');
  const rtl = element.ownerDocument.defaultView?.getComputedStyle(element).direction === 'rtl';
  if (event.key === 'ArrowLeft') return rtl ? end < input.value.length : start > 0;
  if (event.key === 'ArrowRight') return rtl ? start > 0 : end < input.value.length;
  if (element.localName === 'textarea') {
    if (event.key === 'ArrowUp') return start > 0;
    if (event.key === 'ArrowDown') return end < input.value.length;
  }
  return false;
}

/** Opt-in Foundation focus composition. Child controls retain value/action/form ownership. */
export class ToolbarController {
  readonly #collection = new CollectionRegistry();
  readonly #scope = new CleanupScope();
  readonly #attributes: Attributes;
  readonly #items = new Map<HTMLElement, Item>();
  readonly #groups = new Set<Group>();
  readonly #separators = new Set<() => void>();
  readonly #releases = new Set<() => void>();
  #options: ToolbarOptions;
  #current: HTMLElement | null = null;
  #ordered: HTMLElement[] = [];
  #domOrder = new Map<HTMLElement, number>();
  #focused: HTMLElement | null = null;
  #queued = false;
  #disposed = false;
  #focusGeneration = 0;
  readonly #observer: MutationObserver;
  readonly #observed = new Set<Node>();

  constructor(
    readonly host: HTMLElement,
    options: ToolbarOptions = {},
  ) {
    if (roots.has(host)) throw new Error('This root already has a ToolbarController.');
    this.#options = { ...options };
    this.#attributes = new Attributes(host);
    roots.set(host, this);
    this.#scope.listen(host, 'keydown', this.#keyDown);
    this.#scope.listen(host, 'focusin', this.#focusIn);
    this.#scope.listen(host, 'focusout', this.#focusOut);
    for (const type of ['click', 'beforeinput', 'pointerdown'] as const)
      this.#scope.listen(host, type, this.#blockDisabled, { capture: true });
    this.#observer = new host.ownerDocument.defaultView!.MutationObserver(this.refresh);
    this.#observe(host);
    if (host.shadowRoot) this.#observe(host.shadowRoot);
    this.#scope.add(() => this.#observer.disconnect());
    this.refresh();
  }

  #observe(root: Node): void {
    if (this.#observed.has(root)) return;
    this.#observed.add(root);
    this.#observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'hidden', 'inert', 'style', 'class', 'dir', 'href'],
    });
  }

  get orientation(): Orientation {
    return this.#options.orientation ?? 'horizontal';
  }
  get disabled(): boolean {
    return this.#options.disabled ?? false;
  }
  get loopFocus(): boolean {
    return this.#options.loopFocus ?? true;
  }

  update(options: Partial<ToolbarOptions>): void {
    this.#options = { ...this.#options, ...options };
    this.refresh();
  }

  registerItem(
    element: HTMLElement,
    options: ToolbarItemOptions,
  ): ToolbarRegistration<ToolbarItemOptions> {
    if (this.#disposed || itemOwners.has(element)) throw new Error('Invalid Toolbar registration.');
    const item: Item = {
      element,
      options: { ...options },
      attributes: new Attributes(element),
      release: () => {},
    };
    item.release = this.#collection.register({
      element,
      eligible: () => this.#eligible(item),
      order: () => this.#domOrder.get(element) ?? Infinity,
    });
    itemOwners.set(element, this);
    const tree = element.getRootNode();
    if (tree.nodeType === 11) this.#observe(tree);
    this.#items.set(element, item);
    const dispose = () => {
      if (!this.#items.delete(element)) return;
      itemOwners.delete(element);
      item.release();
      compositeControl(element)?.release(this);
      item.attributes.dispose();
      this.#releases.delete(dispose);
      this.refresh();
    };
    this.#releases.add(dispose);
    this.refresh();
    return {
      update: (next) => {
        if (!this.#items.has(element)) return;
        item.options = { ...item.options, ...next };
        this.refresh();
      },
      dispose,
    };
  }

  registerGroup(
    element: HTMLElement,
    options: { disabled?: boolean } = {},
  ): ToolbarRegistration<{ disabled?: boolean }> {
    if (this.#disposed) throw new Error('This ToolbarController is disposed.');
    const group: Group = { element, ...options, attributes: new Attributes(element) };
    this.#groups.add(group);
    const dispose = () => {
      this.#groups.delete(group);
      group.attributes.dispose();
      this.#releases.delete(dispose);
      this.refresh();
    };
    this.#releases.add(dispose);
    this.refresh();
    return {
      update: (next) => {
        if (!this.#groups.has(group)) return;
        Object.assign(group, next);
        this.refresh();
      },
      dispose,
    };
  }

  registerSeparator(
    element: HTMLElement,
    options: { orientation?: Orientation } = {},
  ): ToolbarRegistration<{ orientation?: Orientation }> {
    if (this.#disposed) throw new Error('This ToolbarController is disposed.');
    const attributes = new Attributes(element);
    const separator = element as HTMLElement & { decorative?: boolean; orientation?: Orientation };
    const original = { decorative: separator.decorative, orientation: separator.orientation };
    let applied: Orientation | undefined;
    const sync = () => {
      applied =
        options.orientation ?? (this.orientation === 'horizontal' ? 'vertical' : 'horizontal');
      if ('decorative' in separator && 'orientation' in separator) {
        separator.decorative = false;
        separator.orientation = applied;
      } else {
        attributes.set('role', 'separator');
        attributes.set('aria-orientation', applied);
      }
    };
    this.#separators.add(sync);
    const dispose = () => {
      this.#separators.delete(sync);
      this.#releases.delete(dispose);
      attributes.dispose();
      if (original.decorative !== undefined && separator.decorative === false)
        separator.decorative = original.decorative;
      if (original.orientation !== undefined && separator.orientation === applied)
        separator.orientation = original.orientation;
    };
    this.#releases.add(dispose);
    sync();
    return {
      update: (next) => {
        if (!this.#separators.has(sync)) return;
        options = { ...options, ...next };
        sync();
      },
      dispose,
    };
  }

  #disabled(item: Item): boolean {
    if (item.options.kind === 'link') return false;
    return (
      this.disabled ||
      !!item.options.disabled ||
      (compositeControl(item.element)?.readDisabled() ??
        item.options.disabled ??
        item.attributes.original('disabled') !== null) ||
      [...this.#groups].some(
        (group) => group.disabled && composedContains(group.element, item.element),
      )
    );
  }

  #eligible(item: Item): boolean {
    const target = compositeControl(item.element)?.target() ?? item.element;
    return (
      composedContains(this.host, item.element) &&
      isAvailable(target, true) &&
      (!this.#disabled(item) || item.options.focusableWhenDisabled !== false)
    );
  }

  refresh = (): void => {
    if (this.#queued || this.#disposed) return;
    this.#queued = true;
    queueMicrotask(() => {
      this.#queued = false;
      if (this.#disposed) return;
      this.#sync();
    });
  };

  #sync(): void {
    this.#domOrder = new Map(composedElements(this.host).map((element, index) => [element, index]));
    this.#attributes.set('role', 'toolbar');
    this.#attributes.set('aria-orientation', this.orientation);
    this.#attributes.set('data-orientation', this.orientation);
    this.#attributes.set('data-disabled', this.disabled ? '' : null);
    for (const group of this.#groups) {
      group.attributes.set('role', 'group');
      const disabled =
        this.disabled ||
        group.disabled ||
        [...this.#groups].some(
          (parent) => parent.disabled && composedContains(parent.element, group.element),
        );
      group.attributes.set('data-disabled', disabled ? '' : null);
    }
    for (const sync of this.#separators) sync();
    const eligible = this.#collection.enabled().map((item) => item.element);
    const previous = this.#current;
    if (!previous || !eligible.includes(previous)) {
      const index = Math.max(0, this.#ordered.indexOf(previous!));
      const ordered = this.#collection.items.map((item) => item.element);
      this.#current =
        ordered.slice(index).find((element) => eligible.includes(element)) ??
        ordered
          .slice(0, index)
          .reverse()
          .find((element) => eligible.includes(element)) ??
        eligible[0] ??
        null;
    }
    this.#ordered = this.#collection.items.map((item) => item.element);
    for (const item of this.#items.values()) {
      if (!composedContains(this.host, item.element)) {
        compositeControl(item.element)?.release(this);
        item.attributes.dispose();
        continue;
      }
      const disabled = this.#disabled(item);
      const state = {
        disabled,
        focusableWhenDisabled: item.options.focusableWhenDisabled !== false,
        tabIndex: item.element === this.#current ? 0 : -1,
      };
      const control = compositeControl(item.element);
      if (control) control.apply(this, state, this.refresh);
      else {
        item.attributes.set('tabindex', String(state.tabIndex));
        if (item.options.kind !== 'link') {
          item.attributes.set('aria-disabled', disabled ? 'true' : null);
          item.attributes.set('data-disabled', disabled ? '' : null);
          const nativeDisabled = ['button', 'input', 'textarea', 'select'].includes(
            item.element.localName,
          );
          if (nativeDisabled)
            item.attributes.set('disabled', disabled && !state.focusableWhenDisabled ? '' : null);
          if (item.options.kind === 'input')
            item.attributes.set('readonly', disabled ? '' : item.attributes.original('readonly'));
        }
      }
    }
    if (previous && previous !== this.#current && this.#focused === previous) {
      const active = deepActiveElement(this.host.ownerDocument);
      if (
        !active ||
        active === this.host.ownerDocument.body ||
        composedContains(previous, active)
      ) {
        const target = this.#current;
        const generation = ++this.#focusGeneration;
        const ready = target ? compositeControl(target)?.host.updateComplete : undefined;
        void Promise.resolve(ready).then(() => {
          if (this.#disposed || generation !== this.#focusGeneration || this.#focused !== previous)
            return;
          const active = deepActiveElement(this.host.ownerDocument);
          if (
            !active ||
            active === this.host.ownerDocument.body ||
            composedContains(previous, active)
          )
            target?.focus({ preventScroll: true });
        });
      }
    }
  }

  #eventItem(event: Event): Item | undefined {
    const path = event.composedPath();
    const root = path.find((node) => roots.has(node as HTMLElement));
    if (root !== this.host) return;
    return [...this.#items.values()].find((item) => path.includes(item.element));
  }

  #focusIn = (event: FocusEvent): void => {
    const item = this.#eventItem(event);
    if (!item || !this.#eligible(item)) return;
    this.#current = this.#focused = item.element;
    this.refresh();
  };
  #focusOut = (event: FocusEvent): void => {
    if (event.relatedTarget && !composedContains(this.host, event.relatedTarget as Node))
      this.#focused = null;
  };
  #blockDisabled = (event: Event): void => {
    const item = this.#eventItem(event);
    if (!item || !this.#disabled(item)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  #keyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || componentHandlingPrevented(event) || event.isComposing) return;
    const item = this.#eventItem(event);
    if (!item) return;
    const disabled = this.#disabled(item);
    const target = compositeControl(item.element)?.target() ?? item.element;
    if (!disabled && item.options.kind === 'input' && toolbarInputOwnsKey(event, target)) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const direction =
      this.host.ownerDocument.defaultView?.getComputedStyle(this.host).direction === 'rtl'
        ? 'rtl'
        : 'ltr';
    const next = this.#collection.handleArrowKey(event, item.element, this.orientation, direction, {
      loop: this.loopFocus,
    });
    if (next) {
      this.#current = next;
      event.stopPropagation();
      this.refresh();
    } else if (disabled && event.key !== 'Tab') event.preventDefault();
  };

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#focusGeneration++;
    this.#scope.dispose();
    roots.delete(this.host);
    for (const release of [...this.#releases]) release();
    this.#attributes.dispose();
    this.#current = this.#focused = null;
  }
}
