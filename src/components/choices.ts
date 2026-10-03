import { css } from 'lit';
import { TpCombobox } from './combobox/index.js';
import type { ComboboxChoiceOption } from './combobox/types.js';
import { eventReason } from './shared.js';
export * from './combobox/index.js';
export { TpSelect } from './select/index.js';

export class TpCommandPalette extends TpCombobox {
  static tagName = 'tp-command-palette';
  static override properties = {
    ...TpCombobox.properties,
    loopNavigation: { type: Boolean, attribute: 'loop-navigation' },
  };
  static override styles = [
    TpCombobox.styles,
    css`
      :host {
        position: fixed;
        z-index: 1200;
        inset: 15vh auto auto 50%;
        translate: -50% 0;
        width: min(calc(var(--tp-spacing) * 180), calc(100vw - calc(var(--tp-spacing) * 10)));
        display: none;
      }

      :host([data-open]) {
        display: block;
      }

      .listbox {
        position: static;
        margin-top: var(--tp-space-1);
      }
    `,
  ];
  loopNavigation = false;
  protected override get navigationLoops(): boolean {
    return this.loopNavigation;
  }
  protected override get isOpenControlled(): boolean {
    return false;
  }
  protected override get usesOwnFloatingSurface(): boolean {
    return false;
  }
  protected override selectOption(option: ComboboxChoiceOption, event: Event): void {
    if (option.disabled || this.effectiveDisabled) return;
    this.emit('tp-execute', { commandId: option.value, sourceEvent: event });
    this.setOpen(false, eventReason(event), event);
  }
}
