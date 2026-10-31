import { css, html, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { stateMarkers } from '../../foundation/state-markers.js';
import { SyntheticPress } from '../../foundation/synthetic-press.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import type { ChangeReason } from '../../foundation/types.js';
import { setPartComposition } from '../../presentation/controller.js';

export interface MenuItemOwner extends HTMLElement {
  readonly menuDisabled: boolean;
  readonly typing: boolean;
  readonly itemPartPrefix: string;
  readonly itemVariant: 'ghost' | 'destructive';
  readonly presentationFamilyTagNames: readonly string[];
  requestItem(item: TpMenuItem, event: Event, commit: () => boolean): void;
  itemChanged(): void;
}

/**
 * A command in a Menu. Activating it fires the menu's `tp-action` with its `value` and closes the
 * menu.
 *
 * @slot - The label, with an optional leading Icon and a trailing Kbd group marked
 *   `data-menu-shortcut`.
 */
export class TpMenuItem extends TpElement {
  static tagName = 'tp-menu-item';
  static override properties = {
    ...TpElement.properties,
    label: { type: String },
    variant: { type: String, reflect: true },
    inset: { type: Boolean, reflect: true },
    value: { type: String },
    nativeAction: { type: Boolean, attribute: 'native-action' },
    closeOnClick: { type: Boolean, attribute: 'close-on-click' },
    onClick: { attribute: false },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: contents;
      }

      .item {
        position: relative;
        display: flex;
        align-items: center;
        min-inline-size: 0;
        user-select: none;
        cursor: default;
      }

      .label {
        display: flex;
        align-items: center;
        gap: inherit;
        min-inline-size: 0;
        flex: 1 1 auto;
      }

      .label > slot {
        display: contents;
      }

      .label ::slotted(tp-list-item) {
        flex: 1;
      }

      .indicator {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: none;
      }

      .indicator[data-presence='retained'] {
        visibility: hidden;
      }
    `,
  ];
  /** Accessible name of the item, when its content does not say it in words. */
  label = '';
  /** `destructive` marks a command that deletes or cannot be undone; by default the menu's `item-variant`. */
  variant: 'ghost' | 'destructive' | undefined;
  /** Indents the label to the text of items with a leading icon. */
  inset = false;
  /** The treatment in effect: the item's `variant`, else the menu's. */
  get itemVariant(): 'ghost' | 'destructive' {
    return this.variant ?? this.#owner?.itemVariant ?? 'ghost';
  }
  /** The value `tp-action` reports for this item. */
  value: unknown;
  /** Renders a native button, so Enter and Space reach the item's own handlers as a native press. */
  nativeAction = false;
  /** Whether activating the item closes the menu. */
  closeOnClick = true;
  /** Called when the item is activated, before the menu handles it; `preventComponentHandling()` on the event stops the menu. */
  onClick: ((event: Event) => void) | undefined;
  #owner: MenuItemOwner | null = null;
  #control: HTMLElement | null = null;
  #highlighted = false;
  #keyboardHighlight = false;
  #rows = new Set<TpElement>();
  #syncRows = (): void => {
    const rows = new Set(this.querySelectorAll<TpElement>(':scope > tp-list-item'));
    for (const row of this.#rows) if (!rows.has(row)) setPartComposition(row, this);
    for (const row of rows) {
      if (this.#rows.has(row)) continue;
      // The command owns the outer inset; the composed row owns its content layout.
      setPartComposition(row, this, {
        'list-item': { styleHook: { padding: '0' } },
        'list-item-actions': { styleHook: { 'padding-inline-end': 'var(--tp-border-width)' } },
      });
    }
    this.#rows = rows;
  };
  #reference = (element: HTMLElement | null): void => {
    if (this.#control === element) return;
    this.#control = element;
    this.#press.reset();
    this.#owner?.itemChanged();
  };
  #press = new SyntheticPress((event) => this.activate(event), false);
  /** @internal The owning menu. */
  get menuOwner(): MenuItemOwner | null {
    return this.#owner;
  }
  /** @internal Presentation family of the item. */
  get presentationTagName(): string {
    return `tp-${this.#owner?.itemPartPrefix ?? 'menu'}`;
  }
  /** @internal Presentation owner of the item. */
  get presentationOwner(): HTMLElement | null {
    return this.#owner;
  }
  /** @internal Presentation families the item takes part in. */
  get presentationFamilyTagNames(): readonly string[] {
    return this.#owner?.presentationFamilyTagNames ?? [];
  }
  /** @internal The owning menu. */
  set menuOwner(owner: MenuItemOwner | null) {
    if (owner === this.#owner) return;
    this.#owner = owner;
    this.requestUpdate();
  }
  /** @internal The rendered item control. */
  get controlElement(): HTMLElement | null {
    return this.#control;
  }
  /** Whether the item is unavailable, by itself or because its menu is disabled. */
  get itemDisabled(): boolean {
    return this.disabled || !!this.#owner?.menuDisabled;
  }
  /** Whether the item is highlighted. */
  get highlighted(): boolean {
    return this.#highlighted;
  }
  /** @internal Highlights or clears the item. */
  setHighlight(highlighted: boolean, keyboard: boolean): void {
    if (this.#highlighted === highlighted && this.#keyboardHighlight === keyboard) return;
    this.#highlighted = highlighted;
    this.#keyboardHighlight = keyboard;
    this.requestUpdate();
  }
  protected get itemRole(): string {
    return 'menuitem';
  }
  protected get itemSuffix(): string {
    return 'item';
  }
  protected get itemChecked(): boolean | undefined {
    return undefined;
  }
  protected get itemContent(): unknown {
    return html`<span class="label"><slot @slotchange=${this.#syncRows}></slot></span>`;
  }
  protected itemSelection(_event: Event, _reason: ChangeReason): boolean {
    void _event;
    void _reason;
    return true;
  }
  protected get itemPart(): string {
    return `${this.#owner?.itemPartPrefix ?? 'menu'}-${this.itemSuffix}`;
  }
  /** Activates the item as a press would. */
  activate(event: Event): void {
    if (this.itemDisabled || componentHandlingPrevented(event)) return;
    this.onClick?.(event);
    if (componentHandlingPrevented(event) || (this.nativeAction && event.defaultPrevented)) return;
    this.#owner?.requestItem(this, event, () => this.itemSelection(event, 'item-press'));
  }
  /** Moves focus to the item. */
  override focus(options?: FocusOptions): void {
    this.#control?.focus(options);
  }
  /** Clicks the item, activating it. */
  override click(): void {
    this.#control?.click();
  }
  #click = (event: MouseEvent): void => {
    // Bubbling consumer listeners get the same initiating-event veto as delegated handlers.
    queueMicrotask(() => {
      if (this.isConnected) this.activate(event);
    });
  };
  #keyDown = (event: KeyboardEvent): void => {
    if (this.itemDisabled || componentHandlingPrevented(event)) return;
    if (!this.nativeAction && !(event.key === ' ' && this.#owner?.typing))
      this.#press.keyDown(event);
  };
  #keyUp = (event: KeyboardEvent): void => {
    if (this.itemDisabled || componentHandlingPrevented(event)) {
      this.#press.reset();
      return;
    }
    if (!this.nativeAction) this.#press.keyUp(event);
  };
  protected override render() {
    const checked = this.itemChecked;
    const state = { disabled: this.itemDisabled, highlighted: this.highlighted, checked };
    return this.renderPart(this.itemPart, state, {
      tag: this.nativeAction ? 'button' : 'div',
      reference: this.#reference,
      onHandlerPrevented: {
        '@keydown': () => this.#press.reset(),
        '@keyup': () => this.#press.reset(),
      },
      properties: {
        class: 'item',
        role: this.itemRole,
        tabindex: -1,
        type: this.nativeAction ? 'button' : undefined,
        '.disabled': this.nativeAction ? this.itemDisabled : undefined,
        'aria-label': this.label || undefined,
        'aria-disabled': this.itemDisabled ? 'true' : undefined,
        'aria-checked': checked === undefined ? undefined : String(checked),
        ...stateMarkers(
          {
            variant: this.itemVariant,
            inset: this.inset,
            disabled: this.itemDisabled,
            highlighted: this.highlighted,
            focusVisible: this.highlighted && this.#keyboardHighlight,
            checked,
          },
          ['inset', 'disabled', 'highlighted', 'focusVisible', 'checked'],
          ['variant'],
        ),
        '@click': this.#click,
        '@keydown': this.#keyDown,
        '@keyup': this.#keyUp,
        '@blur': () => this.#press.reset(),
      },
      content: this.itemContent,
    });
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#syncRows();
    this.toggleAttribute('data-disabled', this.itemDisabled);
    this.toggleAttribute('data-highlighted', this.highlighted);
    if (changed.has('disabled') || changed.has('label') || changed.has('value'))
      this.#owner?.itemChanged();
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.requestUpdate();
  }
  override disconnectedCallback(): void {
    for (const row of this.#rows) setPartComposition(row, this);
    this.#rows.clear();
    const owner = this.#owner;
    this.#owner = null;
    this.#press.reset();
    owner?.itemChanged();
    super.disconnectedCallback();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-menu-item': TpMenuItem;
  }
}
