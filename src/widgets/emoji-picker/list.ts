import { html, type CSSResultGroup, type PropertyValues } from 'lit';
import { TpSelect } from '../../components/select/select.js';
import { TpIcon } from '../../components/icon/icon.js';
import type { ChoiceModelRecord } from '../../foundation/choice-model.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import type { ChangeReason } from '../../foundation/types.js';
import { navigationIcons } from '../../icons/navigation.js';
import { emojiPickerPresentation } from '../../presentation/families/emoji-picker.js';
import { selectPresentation } from '../../presentation/families/select.js';
import { emojiListStyles } from './styles.js';

const parts: Record<string, string> = {
  'select-anchor': 'emoji-picker-search',
  'select-input': 'emoji-picker-input',
  'select-clear': 'emoji-picker-clear',
  'select-list': 'emoji-picker-list',
  'select-group': 'emoji-picker-group',
  'select-label': 'emoji-picker-group-label',
  'select-row': 'emoji-picker-row',
  'select-option': 'emoji-picker-item',
  'select-empty-state': 'emoji-picker-empty',
  'select-status': 'emoji-picker-status',
};
/** The list's public parts, forwarded through the widget's shadow root. */
export const LIST_PARTS = [...Object.values(parts), 'emoji-picker-image'].join(', ');

/**
 * The emoji picker's collection: the actual Select in its inline searchable grid mode with its
 * own virtual window. Picks and highlights go to the widget, which owns every lane.
 */
export class TpEmojiPickerList extends TpSelect {
  static override tagName = 'tp-emoji-picker-list';
  /** Library elements this element renders; defining it defines them too. */
  static override get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [...super.elementDependencies, TpIcon];
  }
  static override presentation = emojiPickerPresentation;
  static override presentationFamilies = [selectPresentation];
  static override styles: CSSResultGroup = [TpSelect.styles, emojiListStyles];
  static override properties = {
    ...TpSelect.properties,
    listName: { attribute: false },
    optionName: { attribute: false },
    onPick: { attribute: false },
    onHighlight: { attribute: false },
    onTopGroup: { attribute: false },
    onUserScroll: { attribute: false },
  };
  override searchable = true;
  override inline = true;
  override grid = true;
  override virtualized = true;
  override showTrigger = false;
  override showClear = true;
  /** The widget owns the value: the clear action clears the query only. */
  override clearBehavior = 'query' as const;
  override autoHighlight = true;
  /** Accessible name of the listbox. */
  listName = '';
  /** Accessible name of an option, from its value. */
  optionName: ((value: unknown) => string) | undefined;
  onPick: ((value: unknown, event: Event) => void) | undefined;
  onHighlight:
    ((value: unknown, details: { index: number; reason: ChangeReason }) => void) | undefined;
  /** The group at the top of the list changed. */
  onTopGroup: ((group: unknown) => void) | undefined;
  /** The user scrolls the list (wheel, touch or a press on it), as opposed to a reveal. */
  onUserScroll: (() => void) | undefined;
  #topGroup: unknown;
  constructor() {
    super();
    this.onItemHighlighted = (value, details) => this.onHighlight?.(value, details);
  }
  override connectedCallback(): void {
    super.connectedCallback();
    for (const type of ['wheel', 'touchstart', 'pointerdown'])
      this.renderRoot.addEventListener(type, this.#userScroll, { passive: true });
  }
  override disconnectedCallback(): void {
    for (const type of ['wheel', 'touchstart', 'pointerdown'])
      this.renderRoot.removeEventListener(type, this.#userScroll);
    super.disconnectedCallback();
  }
  #userScroll = (event: Event): void => {
    if (event.composedPath().includes(this.listElement as EventTarget)) this.onUserScroll?.();
  };
  /** Scrolls the category of `value` to the top and highlights `value`, without moving focus. */
  revealCategory(value: unknown): void {
    const record = this.choiceCollection.visible.find((entry) => Object.is(entry.value, value));
    if (!record) return;
    this.revealGroupStart(record);
    this.highlightRecord(record);
  }
  /** The group at the top of the list (a Select group node), if any. */
  get currentGroup(): unknown {
    return this.topGroup;
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#notifyTopGroup();
  }
  protected override listScrolled(): void {
    this.#notifyTopGroup();
  }
  #notifyTopGroup(): void {
    // Results have no current category; reading the window's top waits for the query to clear.
    if (this.inputValue.trim()) return;
    const group = this.topGroup;
    if (group === this.#topGroup) return;
    this.#topGroup = group;
    this.onTopGroup?.(group);
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
  protected override get listLabel(): string {
    return this.listName || super.listLabel;
  }
  protected override optionAccessibleName(record: ChoiceModelRecord): string {
    return this.optionName?.(record.value) ?? record.text;
  }
  protected override optionIndicator(): boolean {
    return false;
  }
  protected override selectOption(record: ChoiceModelRecord, event: Event): void {
    if (
      this.effectiveDisabled ||
      record.disabled ||
      !this.choiceCollection.visible.includes(record)
    )
      return;
    this.onPick?.(record.value, event);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-emoji-picker-list': TpEmojiPickerList;
  }
}
