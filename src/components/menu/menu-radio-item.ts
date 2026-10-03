import { html, type PropertyValues } from 'lit';
import { TpMenuItem } from './menu-item.js';
import type { TpMenuRadioGroup } from './menu-radio-group.js';
import { PresenceController } from '../../foundation/presence.js';
import { composedParent } from '../../foundation/focus.js';
import type { ChangeReason } from '../../foundation/types.js';
import type { IconDefinition } from '../../icons/types.js';

// The source RadioItemIndicator circle is artwork passed through the shared Icon owner.
const radioMark: IconDefinition = {
  viewBox: '0 0 8 8',
  paths: [{ d: 'M4 0a4 4 0 1 0 0 8a4 4 0 0 0 0-8', fill: 'currentColor', stroke: 'none' }],
};

export class TpMenuRadioItem extends TpMenuItem {
  static override tagName = 'tp-menu-radio-item';
  static override properties = {
    ...TpMenuItem.properties,
    keepMounted: { type: Boolean, attribute: 'keep-mounted' },
  };
  override closeOnClick = false;
  keepMounted = false;
  #group: TpMenuRadioGroup | null = null;
  #release: (() => void) | undefined;
  #indicator: HTMLElement | null = null;
  #indicatorRef = (element: HTMLElement | null): void => {
    this.#indicator = element;
  };
  #presence = new PresenceController(this, {
    surface: () => this.#indicator,
    keepMounted: () => this.keepMounted,
  });
  get radioGroup(): TpMenuRadioGroup | null {
    return this.#group;
  }
  get checked(): boolean {
    return !!this.#group && Object.is(this.#group.value, this.value);
  }
  override get itemDisabled(): boolean {
    return (
      super.itemDisabled || !this.#group || this.#group.disabled || !this.#group.isSelectable(this)
    );
  }
  protected override get itemRole(): string {
    return 'menuitemradio';
  }
  protected override get itemSuffix(): string {
    return 'radio-item';
  }
  protected override get itemChecked(): boolean {
    return this.checked;
  }
  protected override itemSelection(event: Event, reason: ChangeReason): boolean {
    return this.#group?.select(this, event, reason) ?? false;
  }
  #syncGroup(): void {
    let group: TpMenuRadioGroup | null = null;
    for (let node = composedParent(this); node; node = composedParent(node)) {
      if ((node as Element).localName === 'tp-menu-radio-group') {
        group = node as TpMenuRadioGroup;
        break;
      }
      if (['tp-menu', 'tp-context-menu'].includes((node as Element).localName)) break;
    }
    if (group === this.#group) return;
    this.#release?.();
    this.#group = group;
    this.#release = group?.register(this);
    this.requestUpdate();
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.#syncGroup();
  }
  override disconnectedCallback(): void {
    this.#release?.();
    this.#release = undefined;
    this.#group = null;
    super.disconnectedCallback();
  }
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    this.#syncGroup();
    this.#presence.setPresent(this.checked);
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('value')) this.#group?.memberChanged();
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
        content: html`<tp-icon
          .icon=${radioMark}
          size="calc(var(--tp-icon-size-sm) / 2)"
        ></tp-icon>`,
      },
    )}`;
  }
}
