import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement, TpFormElement } from '../foundation/element.js';
import { ControllableState } from '../foundation/controllable-state.js';
import type { TpValueChangeEvent } from '../foundation/events.js';
import { SyntheticPress } from '../foundation/synthetic-press.js';
import { componentHandlingPrevented } from '../foundation/part.js';
import type { ChangeReason } from '../foundation/types.js';

export interface ToggleSelectionOwner {
  readonly variant: 'ghost' | 'outline';
  readonly size: 'sm' | 'default' | 'lg';
  isPressed(member: TpToggle): boolean;
  isDisabled(member: TpToggle): boolean;
  tabStop(member: TpToggle): number;
  requestToggle(member: TpToggle, pressed: boolean, event: Event): void;
  memberChanged(member: TpToggle): void;
}

/** Shared action owner for standalone Toggle and ToggleGroup items. */
export class TpToggle extends TpFormElement {
  static tagName = 'tp-toggle';
  static override properties = {
    ...TpFormElement.properties,
    pressed: { type: Boolean, noAccessor: true },
    defaultPressed: { type: Boolean, attribute: 'default-pressed' },
    onPressedChange: { attribute: false },
    ariaLabel: { type: String, attribute: 'aria-label' },
    nativeAction: { type: Boolean, attribute: 'native-action' },
    variant: { type: String, reflect: true, noAccessor: true },
    size: { type: String, reflect: true, noAccessor: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-block;
      }

      .control {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      .control > * {
        position: relative;
        z-index: 1;
      }

      .content {
        display: inline-flex;
        align-items: center;
        justify-content: inherit;
        min-inline-size: 0;
      }

      .content > slot {
        display: contents;
      }
    `,
  ];
  #provided: boolean | undefined;
  #variant: 'ghost' | 'outline' = 'ghost';
  #size: 'sm' | 'default' | 'lg' = 'default';
  #owner: ToggleSelectionOwner | null = null;
  #control: HTMLElement | null = null;
  #focusVisible = false;
  #contentObserver: MutationObserver | null = null;
  declare ariaLabel: string | null;
  defaultPressed: boolean | undefined;
  onPressedChange: ((event: TpValueChangeEvent<boolean>) => void) | undefined;
  nativeAction = true;
  #state = new ControllableState({
    host: this,
    initialValue: false,
    readControlledValue: () => this.#provided,
    readDefaultValue: () => this.defaultPressed,
    hasDefaultValue: () => this.defaultPressed !== undefined,
    onChange: (event) => this.onPressedChange?.(event),
    onCommit: (_value, previous) => this.requestUpdate('pressed', previous),
    diagnostic: (message) => this.emit('tp-diagnostic', { code: 'toggle-state', message }),
  });
  #press = new SyntheticPress((event) => this.#request(event), false);
  get pressed(): boolean {
    return this.#owner?.isPressed(this) ?? this.#state.value;
  }
  set pressed(value: boolean | undefined) {
    const previous = this.pressed;
    this.#provided = value === undefined ? undefined : Boolean(value);
    if (this.hasUpdated) this.#state.sync();
    this.requestUpdate('pressed', previous);
  }
  get variant(): 'ghost' | 'outline' {
    return this.#owner?.variant ?? this.#variant;
  }
  set variant(value: 'ghost' | 'outline') {
    const previous = this.variant;
    this.#variant = value;
    this.requestUpdate('variant', previous);
  }
  get size(): 'sm' | 'default' | 'lg' {
    return this.#owner?.size ?? this.#size;
  }
  set size(value: 'sm' | 'default' | 'lg') {
    const previous = this.size;
    this.#size = value;
    this.requestUpdate('size', previous);
  }
  get selectionOwner(): ToggleSelectionOwner | null {
    return this.#owner;
  }
  set selectionOwner(owner: ToggleSelectionOwner | null) {
    if (owner === this.#owner) return;
    this.#owner = owner;
    this.requestUpdate();
  }
  get controlElement(): HTMLElement | null {
    return this.#control;
  }
  get toggleDisabled(): boolean {
    return this.effectiveDisabled || (this.#owner?.isDisabled(this) ?? false);
  }
  protected override focusTarget(): HTMLElement | null {
    return this.#control;
  }
  #reference = (element: HTMLElement | null): void => {
    if (element !== this.#control) {
      this.#press.reset();
      if (this.#focusVisible) {
        this.#focusVisible = false;
        this.requestUpdate();
      }
    }
    this.#control = element;
  };
  #syncFocusVisible = (): void => {
    const visible = this.isConnected && (this.#control?.matches(':focus-visible') ?? false);
    if (visible !== this.#focusVisible) {
      this.#focusVisible = visible;
      this.requestUpdate();
    }
  };
  #syncIconEdges = (): void => {
    if (!this.isConnected) {
      this.removeAttribute('data-icon-inline-start');
      this.removeAttribute('data-icon-inline-end');
      return;
    }
    const content = this.renderRoot.querySelector('[part~="toggle-content"]');
    const candidates: Element[] = content ? [...content.querySelectorAll('[data-icon]')] : [];
    for (const slot of content?.querySelectorAll('slot') ?? []) {
      for (const assigned of slot.assignedElements({ flatten: true })) {
        if (assigned.hasAttribute('data-icon')) candidates.push(assigned);
        candidates.push(...assigned.querySelectorAll('[data-icon]'));
      }
    }
    const owned = candidates.filter((element) => {
      const toggle = element.closest('tp-toggle');
      return !toggle || toggle === this;
    });
    this.toggleAttribute(
      'data-icon-inline-start',
      owned.some((element) => element.getAttribute('data-icon') === 'inline-start'),
    );
    this.toggleAttribute(
      'data-icon-inline-end',
      owned.some((element) => element.getAttribute('data-icon') === 'inline-end'),
    );
  };
  override connectedCallback(): void {
    super.connectedCallback();
    this.#contentObserver = new this.ownerDocument.defaultView!.MutationObserver(
      this.#syncIconEdges,
    );
    const options = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-icon', 'slot'],
    };
    this.#contentObserver.observe(this, options);
    this.#contentObserver.observe(this.renderRoot, options);
    this.#syncIconEdges();
  }
  protected override render() {
    const disabled = this.toggleDisabled;
    const state = {
      pressed: this.pressed,
      disabled,
      readOnly: this.readOnly,
      focusVisible: this.#focusVisible,
    };
    const part = this.#owner ? 'toggle-group-item' : 'toggle';
    const content = this.renderPart('toggle-content', state, {
      tag: 'span',
      properties: { class: 'content' },
      content: html`<slot @slotchange=${this.#syncIconEdges}></slot>`,
    });
    // Item is the existing Toggle root, with an additional public group part token.
    const binding = this.partContracts[part] ? part : 'toggle';
    return this.renderPart(binding, state, {
      tag: this.nativeAction ? 'button' : 'span',
      reference: this.#reference,
      onHandlerPrevented: {
        '@keydown': () => {
          this.#press.reset();
          this.#syncFocusVisible();
        },
        '@keyup': () => {
          this.#press.reset();
          this.#syncFocusVisible();
        },
      },
      properties: {
        part: `toggle focusable${this.#owner ? ' toggle-group-item' : ''}`,
        class: 'control',
        role: 'button',
        type: this.nativeAction ? 'button' : undefined,
        '.disabled': this.nativeAction ? disabled : undefined,
        'aria-disabled': disabled ? 'true' : undefined,
        'aria-pressed': String(this.pressed),
        'aria-label': this.ariaLabel || undefined,
        'data-pressed': this.pressed,
        'data-unpressed': !this.pressed,
        'data-disabled': disabled,
        'data-focus-visible': this.#focusVisible,
        tabindex: disabled ? -1 : (this.#owner?.tabStop(this) ?? 0),
        '@click': (event: Event) => {
          queueMicrotask(() => {
            if (this.isConnected && !componentHandlingPrevented(event)) this.#request(event);
          });
        },
        '@keydown': (event: KeyboardEvent) => {
          this.#syncFocusVisible();
          if (!this.nativeAction && !disabled && !this.readOnly) this.#press.keyDown(event);
        },
        '@keyup': (event: KeyboardEvent) => {
          this.#syncFocusVisible();
          if (!this.nativeAction && !disabled && !this.readOnly) this.#press.keyUp(event);
        },
        '@focus': this.#syncFocusVisible,
        '@pointerdown': () => queueMicrotask(this.#syncFocusVisible),
        '@pointerup': this.#syncFocusVisible,
        '@blur': () => {
          this.#press.reset();
          this.#focusVisible = false;
          this.requestUpdate();
        },
      },
      content,
    });
  }
  #request(event: Event): void {
    if (this.toggleDisabled || this.readOnly) return;
    if (this.#owner) this.#owner.requestToggle(this, !this.pressed, event);
    else this.#state.set(!this.pressed, 'trigger-press', event);
  }
  setPressed(pressed: boolean, reason: ChangeReason = 'programmatic', event?: Event): void {
    if (this.#owner) {
      this.emit('tp-diagnostic', {
        code: 'toggle-group-owner',
        message: 'Set the owning Toggle Group value; grouped Toggles do not own pressed state.',
      });
      return;
    }
    this.#state.set(pressed, reason, event);
  }
  override activateFromLabel(): void {
    if (this.toggleDisabled || this.readOnly) return;
    this.focus();
    this.#control?.click();
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#syncIconEdges();
    this.toggleAttribute('data-pressed', this.pressed);
    this.toggleAttribute('data-unpressed', !this.pressed);
    this.toggleAttribute('data-disabled', this.toggleDisabled);
    this.toggleAttribute('data-focus-visible', this.#focusVisible);
    // Toggle is an action, not a checkbox/form participant (Foundation 13.6).
    this.setFormValue(null);
    if (changed.has('value') || changed.has('disabled') || changed.has('readOnly'))
      this.#owner?.memberChanged(this);
  }
  protected resetFormValue(): void {
    /* No implicit form participation. */
  }
  override disconnectedCallback(): void {
    this.#contentObserver?.disconnect();
    this.#contentObserver = null;
    this.removeAttribute('data-icon-inline-start');
    this.removeAttribute('data-icon-inline-end');
    this.#press.reset();
    this.#focusVisible = false;
    this.removeAttribute('data-focus-visible');
    this.requestUpdate();
    super.disconnectedCallback();
  }
}
