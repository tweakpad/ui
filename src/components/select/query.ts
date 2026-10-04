import { ControllableState } from '../../foundation/controllable-state.js';
import type { ChoiceCollectionController } from '../../foundation/choice-collection.js';
import { TpValueChangeEvent } from '../../foundation/events.js';
import { resolveLocale } from '../../foundation/services.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import type { ChangeReason } from '../../foundation/types.js';
import type { SelectRecord } from './model.js';
import type { TpSelect } from './select.js';
import { createSelectFilter, type SelectFilter } from './filter.js';
import type { SelectQueryRecordMetadata } from './query-types.js';

interface QueryOwner {
  collection: ChoiceCollectionController<unknown, SelectRecord>;
  selection: ControllableState<unknown>;
  values(value: unknown): unknown[];
  text(value: unknown): string;
  select(record: SelectRecord, event: Event): void;
  metadata(record: SelectRecord): SelectQueryRecordMetadata;
}
/** Editable policy only. Select retains the sole selection, collection and surface lifecycle. */
export class SelectQueryController {
  providedValue: string | undefined;
  editor: HTMLInputElement | null = null;
  anchor: HTMLElement | null = null;
  completion = '';
  composing = false;
  status = '';
  #lastQuery = '';
  #matcher: SelectFilter | undefined;
  #notified: { value: unknown; index: number } | undefined;
  readonly state: ControllableState<string>;
  constructor(
    readonly host: TpSelect,
    readonly owner: QueryOwner,
  ) {
    this.state = new ControllableState({
      host,
      initialValue: '',
      readControlledValue: () => this.providedValue,
      readDefaultValue: () => host.defaultInputValue ?? '',
      hasDefaultValue: () => host.defaultInputValue !== undefined,
      eventFactory: (value, previous, reason, source, options) =>
        new TpValueChangeEvent(value, previous, reason, source, options, 'tp-input-value-change'),
      onChange: (event) => host.onInputValueChange?.(event),
      onCommit: () => {
        this.completion = '';
        host.requestUpdate();
      },
    });
  }
  get value(): string {
    return this.state.value;
  }
  sync(previousHighlight = this.owner.collection.highlighted): void {
    this.state.initialize();
    const h = this.host,
      c = this.owner.collection,
      query = this.value;
    if (!h.searchable) {
      c.setFilter(() => true);
      return;
    }
    const old = previousHighlight,
      changed = query !== this.#lastQuery;
    this.#lastQuery = query;
    const locale = h.locale ?? resolveLocale(h);
    this.#matcher = createSelectFilter(locale ? { locale } : {});
    const ordered = h.filteredItems?.flatMap((item) =>
      c.source.filter((record) => this.matches(record, item)),
    );
    const selectedText = !h.multiple && h.value != null ? this.owner.text(h.value) : '';
    const candidates = [...new Set(ordered ?? c.source)].filter(
      (record) =>
        ordered !== undefined ||
        h.filter === null ||
        h.completionMode === 'inline' ||
        h.completionMode === 'none' ||
        (!h.multiple && query === selectedText) ||
        (h.filter
          ? h.filter(this.owner.metadata(record).source, query, () => record.text)
          : this.#matcher!.contains(record.text, query)),
    );
    const results = h.limit < 0 ? candidates : candidates.slice(0, Math.floor(h.limit));
    const visible = new Set(results);
    c.setFilter((record) => visible.has(record), results);
    if ((old && !c.visible.includes(old)) || (changed && !h.keepHighlight)) c.activeIndex = -1;
    if (
      (h.autoHighlight === 'always' || (h.autoHighlight && query !== '')) &&
      !c.highlighted &&
      h.open &&
      !this.composing
    )
      c.boundary();
    this.notify('programmatic');
    this.status = h.loading
      ? 'Loading suggestions.'
      : `${c.visible.length} ${c.visible.length === 1 ? 'result' : 'results'} available.`;
  }
  matches(record: SelectRecord, item: unknown): boolean {
    return (
      Object.is(this.owner.metadata(record).source, item) ||
      this.owner.collection.equal(record.value, item)
    );
  }
  mounted(record: SelectRecord): boolean {
    return (
      !this.host.virtualized ||
      !this.host.mountedItems ||
      this.host.mountedItems.some((item) => this.matches(record, item))
    );
  }
  restore(): void {
    if (this.editor) this.editor.value = this.completion || this.value;
  }
  input(event: Event): void {
    if (this.host.effectiveDisabled || this.host.readOnly || !this.host.searchable) {
      this.restore();
      return;
    }
    if (this.composing) return;
    const value = (event.currentTarget as HTMLInputElement).value;
    this.state.set(value, 'input', event);
    this.completion = '';
    this.restore();
    this.sync();
    this.host.setOpen(true, 'input', event);
    this.host.requestUpdate();
  }
  selected(record: SelectRecord, event: Event): void {
    this.state.set(
      this.host.multiple ? '' : record.text,
      this.host.multiple ? 'input-clear' : 'item-press',
      event,
      this.host.multiple ? { metadata: { itemPress: true } } : undefined,
    );
    this.completion = '';
    this.editor?.focus({ preventScroll: true });
  }
  clear(event?: Event): void {
    const h = this.host;
    if (h.readOnly || h.effectiveDisabled) return;
    const behavior =
      h.clearBehavior === 'contextual' ? (this.value ? 'query' : 'selection') : h.clearBehavior;
    const value = h.multiple ? [] : null;
    if (behavior === 'both')
      ControllableState.transaction([
        this.owner.selection.proposal(value, 'clear', event),
        this.state.proposal('', 'clear', event),
      ]);
    else if (behavior === 'query') this.state.set('', 'clear', event);
    else this.owner.selection.set(value, 'clear', event);
    this.completion = '';
    this.editor?.focus({ preventScroll: true });
    h.requestUpdate();
  }
  remove(value: unknown, event?: Event): void {
    const h = this.host,
      c = this.owner.collection;
    if (!h.multiple || h.readOnly || h.effectiveDisabled) return;
    const previous = this.owner.values(h.value),
      index = previous.findIndex((item) => c.equal(item, value));
    if (index < 0) return;
    const fromEditor = event?.target === this.editor;
    this.owner.selection.set(
      previous.filter((item) => !c.equal(item, value)),
      'chip-remove-press',
      event,
    );
    if (this.owner.values(h.value).some((item) => c.equal(item, value))) return;
    void h.updateComplete.then(() => {
      const count = this.owner.values(h.value).length;
      const target =
        fromEditor || !count
          ? this.editor
          : (h.renderRoot.querySelector<HTMLElement>(
              `[data-chip-index="${Math.min(index, count - 1)}"]`,
            ) ?? this.editor);
      target?.focus({ preventScroll: true });
    });
  }
  chipKey(event: KeyboardEvent, index: number): void {
    if (event.defaultPrevented || componentHandlingPrevented(event)) return;
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      this.remove(this.owner.values(this.host.value)[index], event);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const rtl =
        this.host.ownerDocument.defaultView!.getComputedStyle(this.host).direction === 'rtl';
      const next = index + ((event.key === 'ArrowRight') !== rtl ? 1 : -1);
      (
        this.host.renderRoot.querySelector<HTMLElement>(`[data-chip-index="${next}"]`) ??
        this.editor
      )?.focus();
    }
  }
  key(event: KeyboardEvent): void {
    const h = this.host,
      c = this.owner.collection;
    if (
      event.defaultPrevented ||
      componentHandlingPrevented(event) ||
      event.isComposing ||
      this.composing ||
      event.keyCode === 229 ||
      h.effectiveDisabled
    )
      return;
    if (event.key === 'Escape' && this.completion) {
      event.preventDefault();
      event.stopPropagation();
      this.completion = '';
      this.restore();
      return;
    }
    if (h.readOnly) return;
    if (event.key === 'Backspace' && !this.value && h.multiple) {
      const last = this.owner.values(h.value).at(-1);
      if (last !== undefined) {
        event.preventDefault();
        this.remove(last, event);
      }
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const wasOpen = h.open;
      h.setOpen(true, 'list-navigation', event);
      if (!h.open) return;
      if (h.grid && wasOpen) this.moveGrid(event.key === 'ArrowDown' ? 1 : -1);
      else if (wasOpen) c.move(event.key === 'ArrowDown' ? 1 : -1, h.loopFocus);
      else c.boundary(event.key === 'ArrowUp');
      this.highlight('list-navigation');
    } else if ((event.key === 'Home' || event.key === 'End') && h.open) {
      event.preventDefault();
      c.boundary(event.key === 'End');
      this.highlight('list-navigation');
    } else if (event.key === 'Enter' && h.open && c.highlighted) {
      event.preventDefault();
      this.owner.select(c.highlighted, event);
    } else if (event.key === 'Escape' && h.open && !h.inline) {
      event.preventDefault();
      h.setOpen(false, 'escape-key', event);
    } else if (event.key === 'Tab' && h.open && !h.inline)
      h.setOpen(false, 'list-navigation', event);
    else if (
      h.grid &&
      h.open &&
      c.highlighted &&
      (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
    ) {
      event.preventDefault();
      const rtl = h.ownerDocument.defaultView!.getComputedStyle(h).direction === 'rtl';
      const current = c.highlighted;
      const row = c.visible.filter(
        (record) =>
          !record.disabled && this.owner.metadata(record).row === this.owner.metadata(current).row,
      );
      const index = row.indexOf(current) + ((event.key === 'ArrowRight') !== rtl ? 1 : -1);
      c.activeIndex = c.visible.indexOf(
        row[
          h.loopFocus
            ? (index + row.length) % row.length
            : Math.max(0, Math.min(row.length - 1, index))
        ]!,
      );
      this.highlight('list-navigation');
    }
  }
  moveGrid(delta: number): void {
    const c = this.owner.collection,
      enabled = c.visible.filter((record) => !record.disabled),
      current = c.highlighted;
    if (!current) {
      c.boundary(delta < 0);
      return;
    }
    const row = (record: SelectRecord) => this.owner.metadata(record).row;
    const rows = [...new Set(enabled.map(row))],
      column = enabled.filter((record) => row(record) === row(current)).indexOf(current);
    let next = rows.indexOf(row(current)) + delta;
    next = this.host.loopFocus
      ? (next + rows.length) % rows.length
      : Math.max(0, Math.min(rows.length - 1, next));
    const candidates = enabled.filter((record) => row(record) === rows[next]);
    const target = candidates[Math.min(column, candidates.length - 1)];
    if (target) c.activeIndex = c.visible.indexOf(target);
  }
  highlight(reason: ChangeReason): void {
    const c = this.owner.collection,
      record = c.highlighted;
    this.notify(reason);
    this.completion = '';
    if (
      record &&
      reason !== 'pointer' &&
      ['both', 'inline'].includes(this.host.completionMode) &&
      this.value &&
      this.#matcher?.startsWith(record.text, this.value)
    ) {
      this.completion = record.text;
      void this.host.updateComplete.then(() => {
        if (this.completion)
          this.editor?.setSelectionRange(this.value.length, this.completion.length);
      });
    }
    // Pointer highlighting never changes scroll position or refocuses the list.
    if (reason === 'list-navigation')
      void this.host.updateComplete.then(() => {
        c.element(c.highlighted)?.scrollIntoView({
          block: 'nearest',
          inline: 'nearest',
          container: 'nearest',
        } as ScrollIntoViewOptions);
      });
    this.host.requestUpdate();
  }
  notify(reason: ChangeReason): void {
    const record = this.owner.collection.highlighted,
      index = record ? this.owner.metadata(record).logicalIndex : -1;
    if (
      record &&
      this.#notified &&
      this.owner.collection.equal(record.value, this.#notified.value) &&
      index === this.#notified.index
    )
      return;
    if (!record && !this.#notified) return;
    this.#notified = record ? { value: record.value, index } : undefined;
    this.host.onItemHighlighted?.(record?.value ?? null, { index, reason });
  }
  resetTransient(event?: Event): void {
    this.state.set('', 'input-clear', event);
    this.owner.collection.activeIndex = -1;
    this.completion = '';
    this.host.requestUpdate();
  }
  disconnect(): void {
    this.completion = '';
    this.composing = false;
    this.#notified = undefined;
  }
}
