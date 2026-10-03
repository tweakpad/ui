import { css, html, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { SyntheticPress } from '../../foundation/synthetic-press.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import type { ChangeReason } from '../../foundation/types.js';

export interface MenuItemOwner extends HTMLElement {
  readonly menuDisabled: boolean;
  readonly typing: boolean;
  readonly itemPartPrefix: string;
  readonly itemVariant: 'ghost' | 'destructive';
  readonly presentationFamilyTagNames: readonly string[];
  requestItem(item: TpMenuItem, event: Event, commit: () => boolean): void;
  itemChanged(): void;
}

/** Command semantics, shared by plain, checkbox and radio Menu constituents. */
export class TpMenuItem extends TpElement {
  static tagName = 'tp-menu-item';
  static override properties = {
    ...TpElement.properties,
    label: { type: String },
    variant: { type: String },
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
        min-inline-size: 0;
        flex: 1 1 auto;
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
  label = '';
  variant: 'ghost' | 'destructive' | undefined;
  get itemVariant(): 'ghost' | 'destructive' {
    return this.variant ?? this.#owner?.itemVariant ?? 'ghost';
  }
  value: unknown;
  nativeAction = false;
  closeOnClick = true;
  onClick: ((event: Event) => void) | undefined;
  #owner: MenuItemOwner | null = null;
  #control: HTMLElement | null = null;
  #highlighted = false;
  #keyboardHighlight = false;
  #reference = (element: HTMLElement | null): void => {
    if (this.#control === element) return;
    this.#control = element;
    this.#press.reset();
    this.#owner?.itemChanged();
  };
  #press = new SyntheticPress((event) => this.activate(event), false);
  get menuOwner(): MenuItemOwner | null {
    return this.#owner;
  }
  get presentationTagName(): string {
    return `tp-${this.#owner?.itemPartPrefix ?? 'menu'}`;
  }
  get presentationOwner(): HTMLElement | null {
    return this.#owner;
  }
  get presentationFamilyTagNames(): readonly string[] {
    return this.#owner?.presentationFamilyTagNames ?? [];
  }
  set menuOwner(owner: MenuItemOwner | null) {
    if (owner === this.#owner) return;
    this.#owner = owner;
    this.requestUpdate();
  }
  get controlElement(): HTMLElement | null {
    return this.#control;
  }
  get itemDisabled(): boolean {
    return this.disabled || !!this.#owner?.menuDisabled;
  }
  get highlighted(): boolean {
    return this.#highlighted;
  }
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
    return html`<span class="label"><slot></slot></span>`;
  }
  protected itemSelection(_event: Event, _reason: ChangeReason): boolean {
    void _event;
    void _reason;
    return true;
  }
  protected get itemPart(): string {
    return `${this.#owner?.itemPartPrefix ?? 'menu'}-${this.itemSuffix}`;
  }
  activate(event: Event): void {
    if (this.itemDisabled || componentHandlingPrevented(event)) return;
    this.onClick?.(event);
    if (componentHandlingPrevented(event) || (this.nativeAction && event.defaultPrevented)) return;
    this.#owner?.requestItem(this, event, () => this.itemSelection(event, 'item-press'));
  }
  override focus(options?: FocusOptions): void {
    this.#control?.focus(options);
  }
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
        'data-variant': this.itemVariant,
        'data-disabled': this.itemDisabled,
        'data-highlighted': this.highlighted,
        'data-focus-visible': this.highlighted && this.#keyboardHighlight,
        'data-checked': checked === true,
        'data-unchecked': checked === false,
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
    this.toggleAttribute('data-disabled', this.itemDisabled);
    this.toggleAttribute('data-highlighted', this.highlighted);
    if (changed.has('disabled') || changed.has('label') || changed.has('value'))
      this.#owner?.itemChanged();
  }
  override disconnectedCallback(): void {
    const owner = this.#owner;
    this.#owner = null;
    this.#press.reset();
    owner?.itemChanged();
    super.disconnectedCallback();
  }
}
