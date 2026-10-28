import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { TpFormElement } from '../../foundation/form-element.js';
import { ControllableState, orderedValuesEqual } from '../../foundation/controllable-state.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import { CollectionRegistry } from '../../foundation/collection.js';
import { TpValueChangeEvent } from '../../foundation/events.js';
import type {
  ToolbarController,
  ToolbarItemOptions,
  ToolbarRegistration,
} from '../../foundation/toolbar.js';
import { toolbarItemOwner, whenToolbar } from '../../foundation/toolbar-membership.js';
import type { ChangeReason } from '../../foundation/types.js';
import { setPartComposition } from '../../presentation/controller.js';
import { toggleGroupJoinedPresentation } from '../../presentation/recipes/toggle-group.js';
import { TpToggle, type ToggleSelectionOwner, type ToggleSize } from '../toggle/toggle.js';
import { normalizeToggleValues, toggleSelection } from './selection.js';
import { toggleGroupPresentation } from '../../presentation/families/toggle-group.js';

const listConverter = {
  fromAttribute: (value: string | null) =>
    value === null ? undefined : normalizeToggleValues(value),
  toAttribute: (value: readonly string[] | undefined) =>
    value === undefined ? null : JSON.stringify(value),
};

/**
 * A set of Toggles with one shared selection, single or multiple, and one tab stop: arrow keys move
 * between the Toggles without pressing them. The selection is an ordered list of the pressed
 * Toggles' values in both modes. It submits no form value.
 *
 * @slot - The Toggles, each with a unique `value`.
 * @fires tp-value-change - Cancelable proposal of a new selection before it commits; `detail.value`
 * is the list of pressed values, with `detail.previousValue` and the `detail.reason`.
 */
export class TpToggleGroup
  extends TpFormElement<readonly string[]>
  implements ToggleSelectionOwner
{
  static tagName = 'tp-toggle-group';
  static override presentation = toggleGroupPresentation;
  static override properties = {
    ...TpFormElement.properties,
    value: { noAccessor: true, converter: listConverter },
    defaultValue: { attribute: 'default-value', converter: listConverter },
    onValueChange: { attribute: false },
    multiple: { type: Boolean, reflect: true, noAccessor: true },
    selectionMode: { type: String, attribute: 'selection-mode', reflect: true, noAccessor: true },
    loopFocus: { type: Boolean, attribute: 'loop-focus' },
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    spacing: { type: Number, reflect: true },
    label: { type: String },
  };
  static override styles = [
    TpElement.styles,
    css`
      /* The group sizes to its members, and an inline size authored on the host is
         the group's own size (the visible group fills the host; vertical members stretch). */
      :host {
        display: inline-flex;
        inline-size: fit-content;
        min-inline-size: 0;
        max-inline-size: 100%;
      }

      .group {
        display: flex;
        flex: 1;
        align-items: center;
        flex-wrap: wrap;
        min-inline-size: 0;
      }

      :host([orientation='vertical']) .group {
        flex-direction: column;
        align-items: stretch;
      }

      ::slotted(tp-toggle:focus-within) {
        z-index: 1;
      }
    `,
  ];
  #provided: readonly string[] | undefined;
  #multiple = false;
  /**
   * The pressed values at first render, as a JSON array in the attribute, when the page does not
   * own `value`.
   */
  defaultValue: readonly string[] | undefined;
  /**
   * Called with each proposed selection before it commits; assign `value` to accept it or cancel
   * the event to reject it.
   */
  onValueChange: ((event: TpValueChangeEvent<readonly string[]>) => void) | undefined;
  /** Whether the arrow keys wrap from the last Toggle to the first and back. */
  loopFocus = true;
  /** The paint of every Toggle in the group, overriding their own. */
  variant: 'ghost' | 'outline' = 'ghost';
  /**
   * The size of every Toggle in the group, overriding their own; the `icon-*` sizes make square
   * Toggles for Icons alone.
   */
  size: ToggleSize = 'default';
  /**
   * The gap between the Toggles in spacing units; `0` joins them into one segmented control with
   * shared seams.
   */
  spacing = 2;
  /** The accessible name of the group when no Field names it. */
  label = '';
  override orientation: 'horizontal' | 'vertical' = 'horizontal';
  #members: TpToggle[] = [];
  #excluded = new Set<TpToggle>();
  #registry = new CollectionRegistry();
  #focused: TpToggle | null = null;
  #observer: MutationObserver | undefined;
  #scheduled = false;
  #registered = new Map<TpToggle, { target: HTMLElement; cleanup: () => void }>();
  // Inside a Toolbar root the group is a Toolbar group: its part is the registered group and its
  // members are Toolbar items (`uwg-te-toggle-group-req-toolbar`, `node-009977`).
  #toolbar: ToolbarController | null = null;
  #toolbarCancel: (() => void) | null = null;
  #toolbarGroup: {
    element: HTMLElement;
    disabled: boolean;
    registration: ToolbarRegistration<{ disabled?: boolean }>;
  } | null = null;
  #toolbarItems = new Map<
    TpToggle,
    { excluded: boolean; registration: ToolbarRegistration<ToolbarItemOptions> }
  >();
  #part: HTMLElement | null = null;
  #state = new ControllableState<readonly string[]>({
    host: this,
    initialValue: [],
    readControlledValue: () => this.#provided,
    readDefaultValue: () =>
      this.defaultValue === undefined ? undefined : normalizeToggleValues(this.defaultValue),
    hasDefaultValue: () => this.defaultValue !== undefined,
    equals: orderedValuesEqual,
    onChange: (event) => this.onValueChange?.(event),
    onCommit: (_value, previous) => {
      this.requestUpdate('value', previous);
      this.#syncMembers();
    },
    diagnostic: (message) => this.#diagnose('state', message),
  });
  override get value(): readonly string[] {
    return this.#state.value;
  }
  override set value(value: readonly string[] | undefined) {
    const previous = this.value;
    this.#provided = value === undefined ? undefined : normalizeToggleValues(value);
    if (this.hasUpdated) this.#state.sync();
    this.requestUpdate('value', previous);
  }
  /** Lets each Toggle be pressed independently; otherwise pressing one releases the others. */
  get multiple(): boolean {
    return this.#multiple;
  }
  set multiple(value: boolean) {
    const previous = this.#multiple;
    this.#multiple = Boolean(value);
    this.requestUpdate('multiple', previous);
    this.requestUpdate('selectionMode');
  }
  /** The same choice as `multiple`, as a word: `single` or `multiple`. */
  get selectionMode(): 'single' | 'multiple' {
    return this.multiple ? 'multiple' : 'single';
  }
  set selectionMode(value: 'single' | 'multiple') {
    this.multiple = value === 'multiple';
  }
  protected override associationTarget(): HTMLElement | null {
    return this.renderRoot.querySelector('.group');
  }
  protected override focusTarget(): HTMLElement | null {
    return this.#members.find((member) => this.tabStop(member) === 0)?.controlElement ?? null;
  }
  /**
   * Whether the given Toggle's value is in the selection; Toggles call it to render their state.
   */
  isPressed(member: TpToggle): boolean {
    const value = this.multiple ? this.value : this.value.slice(0, 1);
    return !this.#excluded.has(member) && value.includes(member.value);
  }
  /** Whether the group disables the given Toggle. */
  isDisabled(member: TpToggle): boolean {
    return this.effectiveDisabled || this.#excluded.has(member);
  }
  /**
   * The tab index of the given Toggle: `0` for the one the group's tab stop lands on, `-1` for the
   * rest.
   */
  tabStop(member: TpToggle): number {
    if (this.isDisabled(member) || member.effectiveDisabled) return -1;
    const enabled = this.#members.filter(
      (item) => !this.isDisabled(item) && !item.effectiveDisabled,
    );
    const target =
      this.#focused && enabled.includes(this.#focused)
        ? this.#focused
        : (enabled.find((item) => this.isPressed(item)) ?? enabled[0]);
    return member === target ? 0 : -1;
  }
  /** Re-reads the Toggles after one is added, removed or changes its value or disabled state. */
  memberChanged(): void {
    this.#schedule();
  }
  /** Proposes pressing or releasing the given Toggle; Toggles call it when pressed. */
  requestToggle(member: TpToggle, pressed: boolean, source: Event): void {
    if (
      !this.#members.includes(member) ||
      this.isDisabled(member) ||
      member.effectiveDisabled ||
      this.readOnly ||
      member.readOnly
    )
      return;
    // Child callback may veto, but group alone publishes the composed value lane.
    const childProposal = new TpValueChangeEvent(
      pressed,
      this.isPressed(member),
      'trigger-press',
      source,
    );
    member.onPressedChange?.(childProposal);
    if (childProposal.defaultPrevented || childProposal.detail.cancelled) return;
    const next = toggleSelection(
      this.value,
      member.value,
      this.multiple,
      this.#members.filter((item) => !this.#excluded.has(item)).map((item) => item.value),
    );
    this.#state.set(next, 'trigger-press', source);
  }
  /**
   * Proposes a new selection as if the user had made it, notifying listeners first; single mode
   * keeps only the first value.
   */
  setValue(value: readonly string[], reason: ChangeReason = 'programmatic', source?: Event): void {
    const normalized = normalizeToggleValues(value);
    this.#state.set(this.multiple ? normalized : normalized.slice(0, 1), reason, source);
  }
  protected override render() {
    const state = {
      value: this.value,
      disabled: this.effectiveDisabled,
      multiple: this.multiple,
      orientation: this.orientation,
    };
    return this.renderPart('toggle-group', state, {
      tag: 'div',
      reference: this.#partReference,
      properties: {
        class: 'group',
        role: 'group',
        'aria-label': this.label || this.getAttribute('aria-label') || undefined,
        'aria-disabled': this.effectiveDisabled ? 'true' : undefined,
        'data-orientation': this.orientation,
        'data-multiple': this.multiple,
        style: {
          gap: `calc(var(--tp-spacing) * ${Number.isFinite(this.spacing) ? Math.max(0, this.spacing) : 2})`,
        },
        '@keydown': this.#key,
        '@focusin': this.#focusIn,
      },
      content: html`<slot @slotchange=${this.#schedule}></slot>`,
    });
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer = new this.ownerDocument.defaultView!.MutationObserver(this.#schedule);
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'value',
        'disabled',
        'readonly',
        'data-icon-inline-start',
        'data-icon-inline-end',
      ],
    });
    this.#schedule();
    this.#toolbarCancel = whenToolbar(this, (toolbar) => {
      this.#toolbar = toolbar;
      this.#schedule();
      return () => this.#releaseToolbar();
    });
  }
  #partReference = (element: HTMLElement | null): void => {
    if (element === this.#part) return;
    this.#part = element;
    if (this.#toolbar) this.#schedule();
  };
  #schedule = (): void => {
    if (this.#scheduled || !this.isConnected) return;
    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;
      if (this.isConnected) {
        this.#syncMembers();
        this.requestUpdate();
      }
    });
  };
  #syncMembers(): void {
    const members = [...this.querySelectorAll<TpToggle>('tp-toggle')].filter(
      (member) => member.closest('tp-toggle-group') === this,
    );
    for (const previous of this.#members) if (!members.includes(previous)) this.#release(previous);
    this.#members = members;
    this.#excluded.clear();
    const values = new Set<string>();
    this.#registry = new CollectionRegistry();
    for (const member of members) {
      if (!member.value || values.has(member.value)) {
        this.#excluded.add(member);
        this.#diagnose(
          'member:' + member.value,
          'Toggle Group items require unique nonempty values; later duplicates are excluded.',
        );
      } else values.add(member.value);
    }
    if (!this.multiple && this.value.length > 1)
      this.#diagnose(
        'cardinality',
        'Single selection accepts at most one value; only the first value is derived.',
      );
    for (const [index, member] of members.entries()) {
      member.selectionOwner = this;
      setPartComposition(
        member,
        this,
        this.spacing === 0
          ? {
              toggle: {
                styleHook: toggleGroupJoinedPresentation(
                  index,
                  members.length,
                  this.orientation,
                  member.hasAttribute('data-icon-inline-start'),
                  member.hasAttribute('data-icon-inline-end'),
                  `${this.size}`.startsWith('icon'),
                ),
              },
            }
          : undefined,
      );
      this.#registry.register({
        element: member,
        disabled: member.effectiveDisabled || this.isDisabled(member),
        value: member.value,
      });
      member.requestUpdate();
      void member.updateComplete.then(() => {
        if (!this.isConnected || member.selectionOwner !== this) return;
        const target = member.controlElement;
        const registered = this.#registered.get(member);
        if (target && registered?.target !== target) {
          registered?.cleanup();
          this.#registered.set(member, {
            target,
            cleanup: this.presentationController.registerPart('toggle-group-item', target),
          });
        }
      });
    }
    this.#syncToolbar();
  }
  /**
   * Registers the `toggle-group` part as the Toolbar group and every member as a `button` item:
   * a disabled member, or every member of a disabled group, stays a focusable stop that cannot
   * activate (`node-010070`), as the text editor's toolbars require of the Toggle groups they
   * render while the editor is enabled (`uwg-te-req-a11y-2`, `uwg-te-req-tools-1`), and an
   * excluded member is skipped as the standalone group skips it. A toolbar whose disabled mode is
   * `fully` skips every member while its root is disabled (`uwg-te-req-prop-3`, `node-010070`).
   */
  #syncToolbar(): void {
    const toolbar = this.#toolbar;
    if (!toolbar) return;
    const part = this.#part;
    const disabled = this.effectiveDisabled;
    if (this.#toolbarGroup && this.#toolbarGroup.element !== part) {
      this.#toolbarGroup.registration.dispose();
      this.#toolbarGroup = null;
    }
    if (part && !this.#toolbarGroup)
      this.#toolbarGroup = {
        element: part,
        disabled,
        registration: toolbar.registerGroup(part, { disabled }),
      };
    else if (this.#toolbarGroup && this.#toolbarGroup.disabled !== disabled) {
      this.#toolbarGroup.disabled = disabled;
      this.#toolbarGroup.registration.update({ disabled });
    }
    for (const member of this.#members) {
      const excluded = this.#excluded.has(member);
      const item = this.#toolbarItems.get(member);
      if (item) {
        if (item.excluded === excluded) continue;
        item.excluded = excluded;
        item.registration.update({ focusableWhenDisabled: !excluded });
      } else if (toolbarItemOwner(member))
        this.#diagnose(
          'toolbar-member',
          'A Toggle group inside a Toolbar registers its own Toggles; do not register them as Toolbar items.',
        );
      else
        this.#toolbarItems.set(member, {
          excluded,
          registration: toolbar.registerItem(member, {
            kind: 'button',
            focusableWhenDisabled: !excluded,
          }),
        });
    }
  }
  #releaseToolbar(): void {
    for (const item of this.#toolbarItems.values()) item.registration.dispose();
    this.#toolbarItems.clear();
    this.#toolbarGroup?.registration.dispose();
    this.#toolbarGroup = null;
    if (!this.#toolbar) return;
    this.#toolbar = null;
    // Standalone again: the group's own tab stop and arrow keys return.
    for (const member of this.#members) member.requestUpdate();
  }
  #release(member: TpToggle): void {
    if (member.selectionOwner === this) member.selectionOwner = null;
    setPartComposition(member, this);
    this.#registered.get(member)?.cleanup();
    this.#registered.delete(member);
    this.#toolbarItems.get(member)?.registration.dispose();
    this.#toolbarItems.delete(member);
  }
  #focusIn = (event: FocusEvent): void => {
    const member = event
      .composedPath()
      .find((node): node is TpToggle => node instanceof TpToggle && this.#members.includes(node));
    if (
      member &&
      !this.isDisabled(member) &&
      !member.effectiveDisabled &&
      this.#focused !== member
    ) {
      this.#focused = member;
      for (const item of this.#members) item.requestUpdate();
    }
  };
  #key = (event: KeyboardEvent): void => {
    // Inside a Toolbar its arrow, Home and End keys are the Toolbar's.
    if (this.#toolbar) return;
    if (this.effectiveDisabled || componentHandlingPrevented(event) || event.isComposing) return;
    const member = event
      .composedPath()
      .find((node): node is TpToggle => node instanceof TpToggle && this.#members.includes(node));
    if (!member) return;
    const next = this.#registry.handleArrowKey(event, member, this.orientation, this.direction, {
      loop: this.loopFocus,
    });
    if (next instanceof TpToggle) {
      this.#focused = next;
      for (const item of this.#members) item.requestUpdate();
    }
  };
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#syncMembers();
    this.toggleAttribute('data-multiple', this.multiple);
    this.setFormValue(null);
  }
  protected resetFormValue(): void {
    /* Action group has no implicit form value. */
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#toolbarCancel?.();
    this.#toolbarCancel = null;
    this.#releaseToolbar();
    for (const member of this.#members) this.#release(member);
    this.#members = [];
    this.#focused = null;
    super.disconnectedCallback();
  }
  #diagnose(code: string, message: string): void {
    this.diagnose('toggle-group-' + code, message, { once: true });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-toggle-group': TpToggleGroup;
  }
}
