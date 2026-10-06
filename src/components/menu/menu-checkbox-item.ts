import { html, type PropertyValues } from 'lit';
import { TpMenuItem } from './menu-item.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import { PresenceController } from '../../foundation/presence.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import type { ChangeReason } from '../../foundation/types.js';
import { checkIcon } from '../../icons/check.js';
import { TpIcon } from '../icon.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';

export class TpMenuCheckboxItem extends TpMenuItem {
  static override tagName = 'tp-menu-checkbox-item';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpIcon];
  }
  static override properties = {
    ...TpMenuItem.properties,
    checked: { type: Boolean, noAccessor: true },
    defaultChecked: { type: Boolean, attribute: 'default-checked' },
    keepMounted: { type: Boolean, attribute: 'keep-mounted' },
    onCheckedChange: { attribute: false },
  };
  override closeOnClick = false;
  defaultChecked: boolean | undefined;
  keepMounted = false;
  onCheckedChange: ((event: TpValueChangeEvent<boolean>) => void) | undefined;
  #checked: boolean | undefined;
  #indicator: HTMLElement | null = null;
  #indicatorRef = (element: HTMLElement | null): void => {
    this.#indicator = element;
  };
  #state = new ControllableState({
    host: this,
    initialValue: false,
    readControlledValue: () => this.#checked,
    readDefaultValue: () => this.defaultChecked ?? false,
    hasDefaultValue: () => this.defaultChecked !== undefined,
    onChange: (event) => this.onCheckedChange?.(event),
    onCommit: () => this.requestUpdate(),
    diagnostic: (message) => this.emit('tp-diagnostic', { code: 'menu-checked-state', message }),
  });
  #presence = new PresenceController(this, {
    surface: () => this.#indicator,
    keepMounted: () => this.keepMounted,
  });
  get checked(): boolean {
    return this.#state.value;
  }
  set checked(value: boolean | undefined) {
    const previous = this.#checked;
    this.#checked = value === undefined ? undefined : Boolean(value);
    this.requestUpdate('checked', previous);
    if (this.hasUpdated) this.#state.sync();
  }
  protected override get itemRole(): string {
    return 'menuitemcheckbox';
  }
  protected override get itemSuffix(): string {
    return 'checkbox-item';
  }
  protected override get itemChecked(): boolean {
    return this.checked;
  }
  protected override itemSelection(event: Event, reason: ChangeReason): boolean {
    return this.#state.set(!this.checked, reason, event);
  }
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    this.#presence.setPresent(this.checked);
  }
  protected override get itemContent(): unknown {
    return html`${super.itemContent}${this.renderPart(
      'indicator',
      { checked: this.checked, disabled: this.itemDisabled, presence: this.#presence.state },
      {
        tag: 'span',
        enabled: this.#presence.mounted,
        reference: this.#indicatorRef,
        properties: {
          class: 'indicator',
          'aria-hidden': 'true',
          'data-checked': this.checked,
          'data-unchecked': !this.checked,
          'data-presence': this.#presence.state,
          'data-starting-style': this.#presence.state === 'starting',
          'data-ending-style': this.#presence.state === 'ending',
        },
        content: html`<tp-icon .icon=${checkIcon} size="var(--tp-icon-size-sm)"></tp-icon>`,
      },
    )}`;
  }
}
