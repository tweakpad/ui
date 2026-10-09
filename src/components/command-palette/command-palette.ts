import { css, html, type TemplateResult, type PropertyValues } from 'lit';
import { shortcutKeys } from '../key-hint/shortcut.js';
import { TpDialog } from '../dialog/dialog.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import { TpValueChangeEvent } from '../../foundation/events.js';
import { composedContains, deepActiveElement } from '../../foundation/focus.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import type { ChangeReason } from '../../foundation/types.js';
import type { ChoiceModelRecord } from '../../foundation/choice-model.js';
import type { SelectEntry } from '../select/types.js';

import type { CommandEntry, CommandItem, CommandFilter } from './model.js';
import { TextIndex } from '../../foundation/search/text-index.js';
import { renderHighlighted } from '../../foundation/search/highlight.js';
import type { SearchRange } from '../../foundation/search/types.js';
import { resolveLocale } from '../../foundation/services.js';
import { commandPalettePresentation } from '../../presentation/families/command-palette.js';
import { dialogPresentation } from '../../presentation/families/dialog.js';
import { TpCommandList } from './list.js';
import { TpIcon } from '../icon/icon.js';
import { TpKeyHintGroup } from '../key-hint/key-hint-group.js';
import { TpKeyHint } from '../key-hint/key-hint.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';

/** Command query/highlight policy with Dialog as the only optional modal owner. */
export class TpCommandPalette extends TpDialog {
  static override tagName = 'tp-command-palette';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpCommandList, TpIcon, TpKeyHintGroup, TpKeyHint];
  }
  static override presentation = commandPalettePresentation;
  static override presentationFamilies = [dialogPresentation];
  static override properties = {
    ...TpDialog.properties,
    inline: { type: Boolean, reflect: true },
    items: { attribute: false },
    query: { type: String, noAccessor: true },
    defaultQuery: { type: String, attribute: 'default-query' },
    value: { attribute: false, noAccessor: true },
    defaultValue: { attribute: false },
    filter: { attribute: false },
    shouldFilter: { type: Boolean, attribute: 'should-filter' },
    loopNavigation: { type: Boolean, attribute: 'loop-navigation' },
    placeholder: { type: String },
    onQueryChange: { attribute: false },
    onValueChange: { attribute: false },
    onExecute: { attribute: false },
  };
  static override styles = [
    TpDialog.styles,
    css`
      :host([inline]) {
        display: inline-block;
        min-inline-size: 0;
      }

      .header {
        position: absolute;
        inline-size: var(--tp-border-width);
        block-size: var(--tp-border-width);
        padding: 0;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
      }

      .body:has(~ .corner-close) tp-command-list::part(command-palette-input-wrapper) {
        padding-inline-end: calc(var(--tp-control-height-md) + var(--tp-space-2) * 2);
      }

      .corner-close {
        inline-size: var(--tp-control-height-md);
        block-size: var(--tp-control-height-md);
      }

      .corner-close::part(button) {
        block-size: 100%;
      }

      .body {
        padding: 0;
      }

      .content {
        inset-block: min(20dvh, calc(var(--tp-spacing) * 32)) auto;
      }

      tp-command-list {
        display: block;
        inline-size: 100%;
      }
    `,
  ];
  inline = false;
  items: readonly CommandEntry[] | undefined;
  defaultQuery: string | undefined;
  defaultValue: unknown;
  filter: CommandFilter | null | undefined;
  shouldFilter = true;
  loopNavigation = false;
  placeholder = 'Type a command or search…';
  override label = 'Command Palette';
  override description = 'Search for a command to run.';
  override showCloseControl = false;
  onQueryChange: ((event: TpValueChangeEvent<string>) => void) | undefined;
  onValueChange: ((event: TpValueChangeEvent<unknown>) => void) | undefined;
  onExecute: ((event: CustomEvent<{ commandId: unknown; sourceEvent: Event }>) => void) | undefined;
  #providedQuery: string | undefined;
  #providedValue: unknown;
  readonly #query = new ControllableState<string>({
    host: this,
    initialValue: '',
    readControlledValue: () => this.#providedQuery,
    readDefaultValue: () => this.defaultQuery ?? '',
    hasDefaultValue: () => this.defaultQuery !== undefined,
    eventFactory: (value, previous, reason, source, options) =>
      new TpValueChangeEvent(value, previous, reason, source, options, 'tp-query-change'),
    onChange: (event) => this.onQueryChange?.(event),
  });
  readonly #value = new ControllableState<unknown>({
    host: this,
    initialValue: null,
    readControlledValue: () => this.#providedValue,
    readDefaultValue: () => this.defaultValue ?? null,
    hasDefaultValue: () => this.defaultValue !== undefined,
    onChange: (event) => this.onValueChange?.(event),
  });
  #projected: readonly SelectEntry[] = [];
  #visible: unknown[] = [];
  #records = new Map<unknown, CommandItem>();
  #ranges = new Map<unknown, readonly SearchRange[]>();
  #index:
    | { items: readonly CommandItem[]; locale: string | undefined; index: TextIndex<CommandItem> }
    | undefined;
  #wrappers = new Map<unknown, SelectEntry>();
  #observer: MutationObserver | undefined;
  #noExecutableMatch = false;
  #wasOpen = false;
  get query(): string {
    return this.#query.value;
  }
  set query(value: string | undefined) {
    const previous = this.#providedQuery;
    this.#providedQuery = value;
    if (this.hasUpdated) this.#query.sync();
    this.requestUpdate('query', previous);
  }
  get value(): unknown {
    return this.#value.value;
  }
  set value(value: unknown) {
    const previous = this.#providedValue;
    this.#providedValue = value;
    if (this.hasUpdated) this.#value.sync();
    this.requestUpdate('value', previous);
  }
  get inputElement(): HTMLInputElement | null {
    return this.#list?.inputElement ?? null;
  }
  get noExecutableMatch(): boolean {
    return this.#noExecutableMatch;
  }
  get #list(): TpCommandList | null {
    return (this.inline ? this.renderRoot : this.surfaceRoot).querySelector<TpCommandList>(
      'tp-command-list',
    );
  }
  protected override hasBodyContent(): boolean {
    return true;
  }
  protected override renderBody(): unknown {
    return this.#renderCollection();
  }
  protected override render(): TemplateResult<1> {
    return this.inline ? this.#renderCollection() : super.render();
  }
  #renderCollection(): TemplateResult<1> {
    return html`<tp-command-list
      .items=${this.#projected}
      .filteredItems=${this.#visible}
      .inputValue=${this.query}
      .activeValue=${this.value}
      .label=${this.label}
      .placeholder=${this.placeholder}
      .disabled=${this.disabled}
      .loopFocus=${this.loopNavigation}
      .partContracts=${this.partContracts}
      .partPresentation=${this.partPresentation}
      .onInputValueChange=${(event: TpValueChangeEvent<string>) => {
        this.#query.set(event.detail.value, event.detail.reason, event.detail.sourceEvent);
        if (this.#list) this.#list.inputValue = this.query;
      }}
      .onActiveChange=${(value: unknown, details: { index: number; reason: ChangeReason }) => {
        this.#value.set(value, details.reason);
        return this.value;
      }}
      .onExecute=${(record: ChoiceModelRecord, event: Event) => this.#execute(record, event)}
      @tp-input-value-change=${(event: Event) => event.stopPropagation()}
      @tp-field-value=${(event: Event) => event.stopPropagation()}
    >
      <slot name="empty" slot="empty">No results found.</slot>
    </tp-command-list>`;
  }
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    this.#query.initialize();
    this.#value.initialize();
    this.#records.clear();
    const source =
      this.items ??
      [...this.querySelectorAll<HTMLOptionElement>('option')].map((option) => ({
        value: option.value,
        label: option.label,
        disabled: option.disabled,
      }));
    const collect = (entries: readonly CommandEntry[]): void => {
      for (const entry of entries) {
        if (entry && typeof entry === 'object' && 'type' in entry && entry.type === 'group')
          collect(entry.items);
        else if (!(entry && typeof entry === 'object' && 'type' in entry)) {
          const item: CommandItem =
            entry && typeof entry === 'object' ? (entry as CommandItem) : { value: entry };
          if (!this.#records.has(item.value)) this.#records.set(item.value, item);
        }
      }
    };
    collect(source);
    const ranked = this.#rank();
    this.#visible = ranked.map((item) => item.value);
    this.#noExecutableMatch =
      !!ranked.length && ranked.every((item) => this.#records.get(item.value)?.disabled);
    const retained = new Set<unknown>();
    const project = (entries: readonly CommandEntry[]): SelectEntry[] =>
      entries.map((entry) => {
        if (entry && typeof entry === 'object' && 'type' in entry && entry.type === 'group')
          return { ...entry, items: project(entry.items) };
        if (entry && typeof entry === 'object' && 'type' in entry && entry.type === 'separator')
          return entry;
        const item: CommandItem =
          entry && typeof entry === 'object' ? (entry as CommandItem) : { value: entry };
        retained.add(entry);
        let wrapper = this.#wrappers.get(entry) as CommandItem | undefined;
        if (!wrapper) this.#wrappers.set(entry, (wrapper = { value: item.value }));
        for (const key of Object.keys(wrapper))
          if (!(key in item)) delete (wrapper as unknown as Record<string, unknown>)[key];
        Object.assign(wrapper, item, {
          text: item.text ?? (typeof item.label === 'string' ? item.label : String(item.value)),
          label: html`${item.icon ? html`<tp-icon .icon=${item.icon} size="var(--tp-icon-size-sm)" aria-hidden="true"></tp-icon>` : ''}<span>${this.#itemLabel(item)}</span>${item.shortcut ? html`<tp-key-hint-group separator="none" part="command-palette-shortcut-hint" aria-hidden="true">${shortcutKeys(item.shortcut).map((key) => html`<tp-key-hint>${key}</tp-key-hint>`)}</tp-key-hint-group>` : ''}`,
        });
        return wrapper;
      });
    this.#projected = project(source);
    for (const key of this.#wrappers.keys()) if (!retained.has(key)) this.#wrappers.delete(key);
    const visibleEnabled = ranked.filter((item) => !this.#records.get(item.value)?.disabled);
    if (!visibleEnabled.some((item) => Object.is(item.value, this.value)))
      this.#value.set(visibleEnabled[0]?.value ?? null, 'programmatic');
  }
  /**
   * Commands in display order: all of them without filtering, ordered by a supplied filter's
   * rank, or ranked by Text search over each command's text, value and keywords.
   */
  #rank(): Array<{ value: unknown }> {
    const items = [...this.#records.values()];
    this.#ranges.clear();
    if (!this.shouldFilter || this.filter === null) return items;
    if (this.filter)
      return items
        .flatMap((item, index) => {
          const rank = this.filter!(item, this.query);
          return rank === false || !Number.isFinite(rank)
            ? []
            : [{ value: item.value, rank, index }];
        })
        .sort((a, b) => a.rank - b.rank || a.index - b.index);
    const hits = this.#search(items).search(this.query);
    for (const hit of hits) {
      const ranges = hit.matches?.find((match) => match.field === 'text')?.ranges;
      if (ranges) this.#ranges.set(hit.item.value, ranges);
    }
    return hits.map((hit) => hit.item);
  }
  #search(items: readonly CommandItem[]): TextIndex<CommandItem> {
    const locale = resolveLocale(this);
    const cached = this.#index;
    if (
      cached &&
      cached.locale === locale &&
      cached.items.length === items.length &&
      items.every((item, index) => item === cached.items[index])
    )
      return cached.index;
    const index = new TextIndex<CommandItem>({
      fields: ['text', 'value', 'keywords'],
      boost: { text: 2 },
      locale,
      extract: (item, field) =>
        field === 'text'
          ? (item.text ?? (typeof item.label === 'string' ? item.label : String(item.value)))
          : field === 'value'
            ? String(item.value)
            : item.keywords,
    });
    index.addAll(items);
    this.#index = { items, locale, index };
    return index;
  }
  /** The command's label, with matched ranges marked when it is plain text. */
  #itemLabel(item: CommandItem): unknown {
    const label = item.label ?? String(item.value);
    const ranges = this.#ranges.get(item.value);
    return typeof label === 'string' && ranges?.length && (item.text ?? label) === label
      ? renderHighlighted(label, ranges, 'command-palette-match')
      : label;
  }
  #execute(record: ChoiceModelRecord, sourceEvent: Event): void {
    const item = this.#records.get(record.value);
    if (!item || item.disabled || this.disabled || !this.#visible.includes(record.value)) return;
    if (componentHandlingPrevented(sourceEvent)) return;
    const event = new CustomEvent('tp-execute', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: { commandId: record.value, sourceEvent },
    });
    item.onSelect?.(event);
    if (event.defaultPrevented || componentHandlingPrevented(event)) return;
    this.onExecute?.(event);
    this.dispatchEvent(event);
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (this.open && !this.#wasOpen && !this.inline && this.initialFocus === 'first') {
      const list = this.#list;
      const initialTarget = deepActiveElement(this.ownerDocument);
      if (list)
        void list.updateComplete.then(() => {
          if (
            this.open &&
            this.contentElement &&
            composedContains(this.contentElement, initialTarget) &&
            deepActiveElement(this.ownerDocument) === initialTarget
          )
            this.inputElement?.focus({ preventScroll: true });
        });
    }
    this.#wasOpen = this.open;
    this.toggleAttribute('data-empty', !this.#visible.length);
    this.toggleAttribute('data-no-executable-match', this.#noExecutableMatch);
    if (changed.has('inline') && this.inline && this.open) this.setOpen(false, 'programmatic');
  }
  constructor() {
    super();
    this.addEventListener('tp-open-change-complete', (event) => {
      if (event.target !== this || !this.open || this.inline || this.initialFocus !== 'first')
        return;
      const content = this.contentElement;
      const active = deepActiveElement(this.ownerDocument);
      const corner = content?.querySelector('.corner-close');
      const close = this.ownedChildren.find(
        (node) => node instanceof HTMLElement && node.slot === 'close',
      );
      // Dialog may initially focus its close fallback before Select's input renders.
      // Retry at the shared presence boundary without stealing a user's moved focus.
      if (
        content &&
        (active === content ||
          (corner && composedContains(corner, active)) ||
          (close instanceof HTMLElement && composedContains(close, active)))
      )
        this.inputElement?.focus({ preventScroll: true });
    });
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer = new this.ownerDocument.defaultView!.MutationObserver(() =>
      this.requestUpdate(),
    );
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['value', 'label', 'disabled'],
    });
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    super.disconnectedCallback();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-command-palette': TpCommandPalette;
  }
}
