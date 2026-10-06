import { html, type PropertyValues } from 'lit';
import { TpSelect } from '../select/select.js';
import type { SelectRecord } from '../select/model.js';
import type { PartState } from '../../foundation/part.js';
import type { ChangeReason } from '../../foundation/types.js';
import { navigationIcons } from '../../icons/navigation.js';
import { commandPalettePresentation } from '../../presentation/families/command-palette.js';
import { selectPresentation } from '../../presentation/families/select.js';
import { TpIcon } from '../icon.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
const parts: Record<string, string> = {
  'select-anchor': 'command-palette-input-wrapper',
  'select-input': 'command-palette-input',
  'select-list': 'command-palette-list',
  'select-group': 'command-palette-group',
  'select-option': 'command-palette-item',
  'select-separator': 'command-palette-separator',
  'select-empty-state': 'command-palette-empty-state',
};
/** Execution policy on the actual Select collection; no alternative option renderer or popup. */
export class TpCommandList extends TpSelect {
  static override tagName = 'tp-command-list';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpIcon];
  }
  static presentationTagName = 'tp-command-palette';
  static override presentation = commandPalettePresentation;
  static presentationFamilyTagNames = ['tp-select'];
  static override presentationFamilies = [selectPresentation];
  static override properties = {
    ...TpSelect.properties,
    activeValue: { attribute: false },
    onActiveChange: { attribute: false },
    onExecute: { attribute: false },
  };
  override searchable = true;
  override inline = true;
  override showTrigger = false;
  override showClear = false;
  override autoHighlight = 'always' as const;
  override keepHighlight = true;
  activeValue: unknown;
  onActiveChange:
    ((value: unknown, details: { index: number; reason: ChangeReason }) => unknown) | undefined;
  onExecute: ((record: SelectRecord, event: Event) => void) | undefined;
  constructor() {
    super();
    this.onItemHighlighted = (value, details) => {
      this.activeValue = this.onActiveChange ? this.onActiveChange(value, details) : value;
      this.#restoreActive();
    };
  }
  #restoreActive(): void {
    this.choiceCollection.activeIndex = this.choiceCollection.visible.findIndex(
      (record) => Object.is(record.value, this.activeValue) && !record.disabled,
    );
  }
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    this.#restoreActive();
  }
  protected override render() {
    return html`${this.renderPart('command-palette', { empty: !this.choiceCollection.visible.length }, { content: super.render() })}`;
  }
  protected override renderQueryPrefix(): unknown {
    return html`<tp-icon
      slot="prefix"
      .icon=${navigationIcons.search}
      size="var(--tp-icon-size-sm)"
      aria-hidden="true"
    ></tp-icon>`;
  }
  protected override choicePart(name: string): string {
    return parts[name] ?? name;
  }
  protected override choiceState(state: PartState): PartState {
    return { ...state, selected: !!state.highlighted };
  }
  protected override optionAccessibleName(record: SelectRecord): string {
    return record.text;
  }
  protected override optionAriaSelected(record: SelectRecord): boolean {
    return this.choiceCollection.highlighted === record;
  }
  protected override selectOption(record: SelectRecord, event: Event): void {
    if (
      this.effectiveDisabled ||
      record.disabled ||
      !this.choiceCollection.visible.includes(record)
    )
      return;
    this.onExecute?.(record, event);
  }
}
