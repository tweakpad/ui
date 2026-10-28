import { OwnedAttributes as Attributes } from './owned-attributes.js';
import { CollectionRegistry } from './collection.js';
import { compositeControl } from './composite-control.js';
import { composedContains, composedElements, deepActiveElement, isAvailable } from './focus.js';
import { editableOwnsNavigationKey, keyEventPreempted } from './key-bindings.js';
import { preserveFocusOnPress } from './press.js';
import { CleanupScope } from './services.js';
import {
  connectToolbarMembers,
  itemOwners,
  releaseToolbarMembers,
  roots,
} from './toolbar-membership.js';
import type { Orientation } from './types.js';

export interface ToolbarOptions {
  orientation?: Orientation;
  loopFocus?: boolean;
  disabled?: boolean;
  /**
   * Keeps focus and the selection on the editing target when a control is pressed with the
   * primary pointer button (`uwg-te-tb-req-press`). Default false.
   */
  preserveFocusOnPress?: boolean | undefined;
  /**
   * Whether the toolbar is a stop of the sequential focus order. False keeps every item out of it
   * while focus is outside the toolbar, so that its owner's key binding is the only way in (the
   * contextual profile, `uwg-te-tb-req-context`). Default true.
   */
  sequentialFocus?: boolean | undefined;
}
export interface ToolbarItemOptions {
  kind: 'button' | 'link' | 'input';
  disabled?: boolean;
  focusableWhenDisabled?: boolean;
  /** Overrides the toolbar's `preserveFocusOnPress` for this item; `false` lets its press move focus. */
  preserveFocusOnPress?: boolean | undefined;
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
const observedAttributes = ['disabled', 'hidden', 'inert', 'style', 'class', 'dir', 'href'];

/**
 * Whether the native editor still owns this arrow/Home/End operation. The caret-edge
 * rule is owned by the shared key-binding module (`sec-1920-key-bindings`).
 */
export const toolbarInputOwnsKey = editableOwnsNavigationKey;

/**
 * How a disabled root treats its controls: `focusable` (default) keeps each control that permits
 * it a disabled but focusable stop and links independent; `fully` makes every control of a
 * disabled root fully disabled and skipped, whatever its registration permits, links and inputs
 * included (`node-010070`, `node-001228`).
 */
export type ToolbarDisabledMode = 'focusable' | 'fully';
/** Writes a controller's private mode; assigned once, by the class's static block. */
let applyDisabledMode: (toolbar: ToolbarController, mode: ToolbarDisabledMode) => void;

/**
 * Sets how `toolbar`'s disabled root treats its controls. An owner whose own disabled state must
 * leave nothing focusable, Toggle group members and links included, sets `fully` once and drives
 * the state with `update({ disabled })` (`uwg-te-req-prop-3`, `node-010070`).
 */
export function setToolbarDisabledMode(
  toolbar: ToolbarController,
  mode: ToolbarDisabledMode,
): void {
  applyDisabledMode(toolbar, mode);
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
  /** Whether focus or navigation chose the roving stop; until then it is the first eligible item. */
  #chosen = false;
  #ordered: HTMLElement[] = [];
  #domOrder = new Map<HTMLElement, number>();
  #focused: HTMLElement | null = null;
  #queued = false;
  #disposed = false;
  #focusGeneration = 0;
  #disabledMode: ToolbarDisabledMode = 'focusable';
  readonly #observer: MutationObserver;
  readonly #observed = new Set<Node>();

  static {
    applyDisabledMode = (toolbar, mode) => {
      toolbar.#disabledMode = mode;
      toolbar.refresh();
    };
  }

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
    for (const type of ['click', 'beforeinput'] as const)
      this.#scope.listen(host, type, this.#blockDisabled, { capture: true });
    this.#scope.listen(host, 'auxclick', this.#blockAuxiliary, { capture: true });
    this.#scope.listen(host, 'pointerdown', this.#pointerDown, { capture: true });
    this.#observer = new host.ownerDocument.defaultView!.MutationObserver(this.refresh);
    this.#observe(host);
    if (host.shadowRoot) this.#observe(host.shadowRoot);
    this.#scope.add(() => this.#observer.disconnect());
    this.refresh();
    // Members that exist before their toolbar connect once every field is ready.
    connectToolbarMembers(this);
  }

  /**
   * Observes a tree inside the toolbar whole, or one element by its own attributes, so that
   * changes elsewhere in a shared or outer tree never refresh (`node-010076`, `uwg-te-req-perf-1`).
   */
  #observe(target: Node, tree = true): void {
    if (this.#observed.has(target)) return;
    this.#observed.add(target);
    this.#observer.observe(
      target,
      tree
        ? { childList: true, subtree: true, attributes: true, attributeFilter: observedAttributes }
        : { attributes: true, attributeFilter: observedAttributes },
    );
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
  get preserveFocusOnPress(): boolean {
    return this.#options.preserveFocusOnPress ?? false;
  }
  get sequentialFocus(): boolean {
    return this.#options.sequentialFocus ?? true;
  }

  /**
   * Moves focus to the first enabled item and makes it the roving stop; returns whether an item
   * took focus. `focusVisible: true` shows the focus indicator where a keyboard command moved
   * focus: browsers do not count a chord with Alt, Control or Meta as keyboard interaction.
   */
  focusFirst(options: { readonly focusVisible?: boolean } = {}): boolean {
    if (this.#disposed) return false;
    this.#sync();
    const first = this.#collection
      .enabled()
      .map((entry) => this.#items.get(entry.element))
      .find((item): item is Item => !!item && !this.#disabled(item));
    if (!first) return false;
    this.#current = first.element;
    this.#chosen = true;
    this.#sync();
    const target = compositeControl(first.element)?.target() ?? first.element;
    target.focus({ preventScroll: true, ...options });
    return composedContains(first.element, deepActiveElement(this.host.ownerDocument));
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
    if (tree.nodeType === 11 && composedContains(this.host, (tree as ShadowRoot).host))
      this.#observe(tree);
    else this.#observe(element, false);
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

  /**
   * Whether the root is disabled in the `fully` mode: every item, links included, is skipped
   * (`node-010070`).
   */
  #fullyDisabled(): boolean {
    return this.disabled && this.#disabledMode === 'fully';
  }

  /** Whether a disabled `item` stays a navigation stop (`node-010070`). */
  #focusableWhenDisabled(item: Item): boolean {
    return item.options.focusableWhenDisabled !== false && !this.#fullyDisabled();
  }

  #disabled(item: Item): boolean {
    if (item.options.kind === 'link') return this.#fullyDisabled();
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
      (!this.#disabled(item) || this.#focusableWhenDisabled(item))
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
    // Before focus or navigation chooses a stop, the first eligible item is the stop, also when
    // items before it become eligible later (a row whose items show once it has measured them).
    if (!this.#chosen)
      this.#current =
        this.#collection.items
          .map((item) => item.element)
          .find((element) => eligible.includes(element)) ?? null;
    else if (!previous || !eligible.includes(previous)) {
      const ordered = this.#collection.items.map((item) => item.element);
      const index = this.#position(previous, ordered);
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
        focusableWhenDisabled: this.#focusableWhenDisabled(item),
        tabIndex:
          item.element === this.#current && (this.sequentialFocus || this.#focused !== null)
            ? 0
            : -1,
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
        } else {
          // A link is disabled only while the root is fully disabled; it keeps its `href`.
          item.attributes.set(
            'aria-disabled',
            disabled ? 'true' : item.attributes.original('aria-disabled'),
          );
          item.attributes.set(
            'data-disabled',
            disabled ? '' : item.attributes.original('data-disabled'),
          );
        }
      }
    }
    if (
      previous &&
      previous !== this.#current &&
      this.#focused === previous &&
      this.#repairsFocus(previous)
    ) {
      const target = this.#current;
      const generation = ++this.#focusGeneration;
      const ready = target ? compositeControl(target)?.host.updateComplete : undefined;
      void Promise.resolve(ready).then(() => {
        if (this.#disposed || generation !== this.#focusGeneration || this.#focused !== previous)
          return;
        if (this.#repairsFocus(previous)) target?.focus({ preventScroll: true });
      });
    }
  }

  /**
   * Where in `ordered` the search for the stop that replaces `previous` starts: its own index while
   * it stays in the root, otherwise just after the nearest item that preceded it and stays. Items
   * that leave with it in the same pass then shift no stop nearer to it out of reach
   * (`node-010076`).
   */
  #position(previous: HTMLElement | null, ordered: HTMLElement[]): number {
    if (!previous) return 0;
    const own = this.#domOrder.has(previous) ? ordered.indexOf(previous) : -1;
    if (own >= 0) return own;
    for (let index = this.#ordered.indexOf(previous) - 1; index >= 0; index--) {
      const element = this.#ordered[index]!;
      const kept = this.#domOrder.has(element) ? ordered.indexOf(element) : -1;
      if (kept >= 0) return kept + 1;
    }
    return 0;
  }

  /**
   * Whether DOM focus follows the tab stop away from `previous`, the item that stopped being one:
   * focus was lost, or it is still on an item that stays in the root or was disconnected. An
   * item that left the root still connected and focused, as an atomic move leaves it, keeps
   * focus; only the tab stop moves (`node-010076`).
   */
  #repairsFocus(previous: HTMLElement): boolean {
    const active = deepActiveElement(this.host.ownerDocument);
    if (!active || active === this.host.ownerDocument.body) return true;
    if (!composedContains(previous, active)) return false;
    return !previous.isConnected || composedContains(this.host, previous);
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
    this.#chosen = true;
    this.refresh();
  };
  #focusOut = (event: FocusEvent): void => {
    const related = event.relatedTarget as Node | null;
    // Out of the sequential order, focus that leaves to nowhere also takes the tab stop away.
    if (related ? !composedContains(this.host, related) : !this.sequentialFocus) {
      this.#focused = null;
      if (!this.sequentialFocus) this.refresh();
    }
  };
  #blockDisabled = (event: Event): void => {
    this.#block(event, this.#eventItem(event));
  };
  /**
   * A middle press opens a link. Only the fully disabled state blocks it; every other state
   * leaves it to the link (`node-001228`).
   */
  #blockAuxiliary = (event: MouseEvent): void => {
    if (this.#fullyDisabled()) this.#block(event, this.#eventItem(event));
  };
  #block(event: Event, item: Item | undefined): boolean {
    if (!item || !this.#disabled(item)) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    return true;
  }
  /**
   * Whether `event` presses this toolbar's own surface: the root, a separator, a group element or
   * a wrapper around its controls. A press inside a popup or dialog, on a control that takes focus
   * itself, or inside a nested toolbar is not one (`uwg-te-tb-req-press`, `node-009977`).
   */
  #pressesSurface(event: Event): boolean {
    for (const node of event.composedPath()) {
      if (node === this.host) return true;
      if (roots.has(node as HTMLElement)) return false;
      if ((node as Node).nodeType !== 1) continue;
      const element = node as HTMLElement;
      if (
        element.localName === 'dialog' ||
        element.hasAttribute('popover') ||
        element.hasAttribute('tabindex') ||
        element.tabIndex >= 0
      )
        return false;
    }
    return false;
  }
  /**
   * A disabled item stays blocked first. Otherwise a held press keeps focus and the selection
   * on the editing target; inputs, and presses while focus is already inside, move focus
   * natively (`uwg-te-tb-req-press`, `uwg-te-req-key-8`). A press on the toolbar's own surface
   * follows the root option and activates nothing.
   */
  #pointerDown = (event: PointerEvent): void => {
    const item = this.#eventItem(event);
    if (item) {
      if (this.#block(event, item) || item.options.kind === 'input') return;
      if (!(item.options.preserveFocusOnPress ?? this.preserveFocusOnPress)) return;
    } else if (!this.preserveFocusOnPress || !this.#pressesSurface(event)) return;
    const active = deepActiveElement(this.host.ownerDocument);
    if (active && composedContains(this.host, active)) return;
    preserveFocusOnPress(event);
  };
  #keyDown = (event: KeyboardEvent): void => {
    if (keyEventPreempted(event)) return;
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
      this.#chosen = true;
      event.stopPropagation();
      this.refresh();
    }
    // A disabled item cannot activate or edit; Escape still reaches an enclosing dismissible
    // layer (`node-010070`, `uwg-te-req-key-4`).
    else if (disabled && event.key !== 'Tab' && event.key !== 'Escape') event.preventDefault();
  };

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#focusGeneration++;
    const reconnectMembers = releaseToolbarMembers(this);
    this.#scope.dispose();
    roots.delete(this.host);
    for (const release of [...this.#releases]) release();
    this.#attributes.dispose();
    this.#current = this.#focused = null;
    this.#chosen = false;
    // Released members connect to an outer toolbar, or wait for the next one.
    reconnectMembers();
  }
}
