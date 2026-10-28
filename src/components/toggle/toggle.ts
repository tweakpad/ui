import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { stateMarkers } from '../../foundation/state-markers.js';
import { TpFormElement } from '../../foundation/form-element.js';
import { CompositeControlController } from '../../foundation/composite-control.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import { SyntheticPress } from '../../foundation/synthetic-press.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import type { ChangeReason } from '../../foundation/types.js';
import { togglePresentation } from '../../presentation/families/toggle.js';
import { fillLayerStyles } from '../../presentation/motion.js';
import type { TpButton } from '../button/button.js';

/**
 * Toggle and Toggle group sizes: the Button sizes, its control steps and their square `icon-*`
 * steps.
 */
export type ToggleSize = TpButton['size'];

export interface ToggleSelectionOwner {
  readonly variant: 'ghost' | 'outline';
  readonly size: ToggleSize;
  isPressed(member: TpToggle): boolean;
  isDisabled(member: TpToggle): boolean;
  tabStop(member: TpToggle): number;
  requestToggle(member: TpToggle, pressed: boolean, event: Event): void;
  memberChanged(member: TpToggle): void;
}

/**
 * A two-state button that stays pressed or unpressed, announced with its pressed state. It is an
 * action with a remembered state, not a form value; inside a Toggle group the group owns its
 * state, size and paint.
 *
 * @slot - The label: text, an Icon, or both. Mark a leading or trailing Icon with
 * `data-icon="inline-start"` or `data-icon="inline-end"` to tighten the padding on that edge.
 * @fires tp-value-change - Cancelable proposal of the inverse pressed state on each press of a
 * standalone Toggle; `detail.value`, `detail.previousValue` and the `detail.reason`.
 */
export class TpToggle extends TpFormElement {
  static tagName = 'tp-toggle';
  static override presentation = togglePresentation;
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

      /* The label never wraps. The visible toggle is the host's box, as Button's is, so a
         stretched or sized host draws a matching toggle. A block-level control opens no line
         box in the host, so the surrounding line height never makes the host taller than its
         size step. */
      .control {
        position: relative;
        inline-size: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        white-space: nowrap;
        cursor: pointer;
      }

      .control > * {
        position: relative;
        z-index: 1;
      }

      ${fillLayerStyles('.control')}

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
  #size: ToggleSize = 'default';
  #owner: ToggleSelectionOwner | null = null;
  #control: HTMLElement | null = null;
  // Inside a Toolbar the tab stop and the disabled policy are the Toolbar's; the disabled source
  // stays the Toggle's own and its group's state (`node-011941`, `node-010070`).
  #composite = new CompositeControlController(
    this,
    () => this.#control,
    () => this.toggleDisabled,
  );
  #focusVisible = false;
  #contentObserver: MutationObserver | null = null;
  /** The accessible name of a Toggle that shows only an Icon. */
  declare ariaLabel: string | null;
  /** The pressed state at first render, when the page does not own `pressed`. */
  defaultPressed: boolean | undefined;
  /**
   * Called with each proposed state before it commits; assign `pressed` to accept it or cancel the
   * event to reject it.
   */
  onPressedChange: ((event: TpValueChangeEvent<boolean>) => void) | undefined;
  /**
   * Renders the control as a native button; turn it off only when a part contract supplies another
   * element.
   */
  nativeAction = true;
  #state = new ControllableState({
    host: this,
    initialValue: false,
    readControlledValue: () => this.#provided,
    readDefaultValue: () => this.defaultPressed,
    hasDefaultValue: () => this.defaultPressed !== undefined,
    onChange: (event) => this.onPressedChange?.(event),
    onCommit: (_value, previous) => this.requestUpdate('pressed', previous),
    diagnostic: (message) => this.diagnose('toggle-state', message),
  });
  #press = new SyntheticPress((event) => this.#request(event), false);
  /**
   * Whether the Toggle is pressed. Set it to own the state: presses then propose changes and the
   * Toggle shows only what you assign.
   */
  get pressed(): boolean {
    return this.#owner?.isPressed(this) ?? this.#state.value;
  }
  set pressed(value: boolean | undefined) {
    const previous = this.pressed;
    this.#provided = value === undefined ? undefined : Boolean(value);
    if (this.hasUpdated) this.#state.sync();
    this.requestUpdate('pressed', previous);
  }
  /**
   * The paint: `ghost` shows a fill only while pressed or hovered, `outline` adds a border for a
   * Toggle that stands alone.
   */
  get variant(): 'ghost' | 'outline' {
    return this.#owner?.variant ?? this.#variant;
  }
  set variant(value: 'ghost' | 'outline') {
    const previous = this.variant;
    this.#variant = value;
    this.requestUpdate('variant', previous);
  }
  /**
   * The height and padding, matching the Button sizes; the `icon-*` sizes make a square Toggle for
   * an Icon alone.
   */
  get size(): ToggleSize {
    return this.#owner?.size ?? this.#size;
  }
  set size(value: ToggleSize) {
    const previous = this.size;
    this.#size = value;
    this.requestUpdate('size', previous);
  }
  /** The Toggle group that owns this Toggle's state, if any; set by the group itself. */
  get selectionOwner(): ToggleSelectionOwner | null {
    return this.#owner;
  }
  set selectionOwner(owner: ToggleSelectionOwner | null) {
    if (owner === this.#owner) return;
    this.#owner = owner;
    this.requestUpdate();
  }
  /** The inner button that carries the pressed state and receives focus. */
  get controlElement(): HTMLElement | null {
    return this.#control;
  }
  /** Whether the Toggle is disabled, by itself or by its Toggle group. */
  get toggleDisabled(): boolean {
    return this.effectiveDisabled || (this.#owner?.isDisabled(this) ?? false);
  }
  /** Own, group and Toolbar disabled state: what the control renders and what blocks activation. */
  #blocked(): boolean {
    return this.toggleDisabled || !!this.#composite.state?.disabled;
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
    const disabled = this.#blocked();
    const composite = this.#composite.state;
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
        '.disabled': this.nativeAction
          ? composite
            ? composite.disabled && !composite.focusableWhenDisabled
            : disabled
          : undefined,
        'aria-disabled': disabled ? 'true' : undefined,
        'aria-pressed': String(this.pressed),
        'aria-label': this.ariaLabel || undefined,
        ...stateMarkers({ pressed: this.pressed, disabled, focusVisible: this.#focusVisible }, [
          'pressed',
          'disabled',
          'focusVisible',
        ]),
        tabindex: composite
          ? composite.tabIndex
          : disabled
            ? -1
            : (this.#owner?.tabStop(this) ?? 0),
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
    if (this.#blocked() || this.readOnly) return;
    if (this.#owner) this.#owner.requestToggle(this, !this.pressed, event);
    else this.#state.set(!this.pressed, 'trigger-press', event);
  }
  /**
   * Proposes a new pressed state as if the user had made it, notifying listeners first; a grouped
   * Toggle ignores it, since its group owns the value.
   */
  setPressed(pressed: boolean, reason: ChangeReason = 'programmatic', event?: Event): void {
    if (this.#owner) {
      this.diagnose(
        'toggle-group-owner',
        'Set the owning Toggle Group value; grouped Toggles do not own pressed state.',
      );
      return;
    }
    this.#state.set(pressed, reason, event);
  }
  override activateFromLabel(): void {
    if (this.#blocked() || this.readOnly) return;
    this.focus();
    this.#control?.click();
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#syncIconEdges();
    this.toggleAttribute('data-pressed', this.pressed);
    this.toggleAttribute('data-unpressed', !this.pressed);
    this.toggleAttribute('data-disabled', this.#blocked());
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

declare global {
  interface HTMLElementTagNameMap {
    'tp-toggle': TpToggle;
  }
}
