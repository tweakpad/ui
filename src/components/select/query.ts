import { ControllableState } from '../../foundation/controllable-state.js';
import type { ChoiceCollectionController } from '../../foundation/choice-collection.js';
import { TpValueChangeEvent } from '../../foundation/events.js';
import { resolveLocale } from '../../foundation/services.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import type { ChangeReason } from '../../foundation/types.js';
import type { SelectRecord } from './model.js';
import type { TpSelect } from './select.js';
import { createSelectFilter, type SelectFilter } from './filter.js';
import type { SelectMessages, SelectQueryRecordMetadata } from './query-types.js';
import { TextIndex } from '../../foundation/search/text-index.js';
import { matchText, termRanges } from '../../foundation/search/match.js';
import { tokenize } from '../../foundation/search/normalize.js';
import { SearchRun } from '../../foundation/search/search-run.js';
import type { SearchSource } from '../../foundation/search/source.js';
import type { SearchHit, SearchRange, SearchStatus } from '../../foundation/search/types.js';

interface QueryOwner {
  collection: ChoiceCollectionController<unknown, SelectRecord>;
  selection: ControllableState<unknown>;
  values(value: unknown): unknown[];
  text(value: unknown): string;
  select(record: SelectRecord, event: Event): void;
  metadata(record: SelectRecord): SelectQueryRecordMetadata;
  /** Autocomplete: no selection lane; the text is the value. */
  selectionFree(): boolean;
  /** Event name of text-lane proposals. */
  eventName(): string;
  changed(event: TpValueChangeEvent<string>): void;
  committed(): void;
  messages(): Required<SelectMessages>;
  searchStatus(status: SearchStatus, query: string, total: number, error?: unknown): void;
  submit(event: Event): void;
}

interface CachedIndex {
  readonly records: readonly SelectRecord[];
  readonly texts: readonly string[];
  readonly fields: unknown;
  readonly locale: string | undefined;
  readonly index: TextIndex<SelectRecord>;
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
  /** Matched ranges of each visible record's text, computed when first rendered. */
  readonly #ranges = new Map<
    SelectRecord,
    readonly SearchRange[] | (() => readonly SearchRange[])
  >();
  /** Whether the visible order is a ranking rather than source order. */
  ranked = false;
  #index: CachedIndex | undefined;
  #hits: SearchHit[] | undefined;
  #requested: { source: SearchSource; query: string } | undefined;
  #preparing = false;
  readonly run = new SearchRun<unknown>({
    results: (hits) => {
      this.#hits = hits;
      if (!this.#preparing) this.host.requestUpdate();
    },
    status: (status, query, total, error) => this.owner.searchStatus(status, query, total, error),
  });
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
        new TpValueChangeEvent(value, previous, reason, source, options, owner.eventName()),
      onChange: (event) => owner.changed(event),
      onCommit: () => {
        this.completion = '';
        owner.committed();
        host.requestUpdate();
      },
    });
  }
  get value(): string {
    return this.state.value;
  }
  /** Source results in order, or the authoritative filtered items; undefined when matching locally. */
  get resultItems(): readonly unknown[] | undefined {
    const h = this.host;
    if (h.filteredItems !== undefined) return h.filteredItems;
    if (h.source) return this.#hits?.map((hit) => hit.item) ?? [];
    return undefined;
  }
  get searchStatus(): SearchStatus {
    return this.run.status;
  }
  /** Loading, from the loading property or a pending source query. */
  get busy(): boolean {
    return this.host.loading || (!!this.host.source && this.run.status === 'loading');
  }
  #locale(): string | undefined {
    return this.host.locale ?? resolveLocale(this.host);
  }
  /** Starts a source query for the current text while suggestions are shown. */
  prepare(): void {
    const h = this.host;
    const source = h.searchable && h.filteredItems === undefined ? h.source : undefined;
    if (!source) {
      if (this.#requested || this.#hits) {
        this.#requested = undefined;
        this.#hits = undefined;
        this.run.cancel();
      }
      return;
    }
    this.state.initialize();
    const query = this.value;
    if (!h.open || (this.#requested?.source === source && this.#requested?.query === query)) return;
    this.#requested = { source, query };
    this.#preparing = true;
    try {
      this.run.request(source as SearchSource<unknown>, query, {
        delay: h.searchDelay,
        limit: h.limit,
        locale: this.#locale(),
      });
    } finally {
      this.#preparing = false;
    }
  }
  sync(previousHighlight = this.owner.collection.highlighted): void {
    this.state.initialize();
    const h = this.host,
      c = this.owner.collection,
      query = this.value;
    this.#ranges.clear();
    this.ranked = false;
    if (!h.searchable) {
      c.setFilter(() => true);
      return;
    }
    const old = previousHighlight,
      changed = query !== this.#lastQuery;
    this.#lastQuery = query;
    const locale = this.#locale();
    this.#matcher = createSelectFilter(locale ? { locale } : {});
    const selection = this.owner.selection.value;
    const results = this.resultItems;
    let candidates: SelectRecord[];
    if (results !== undefined) {
      candidates = [
        ...new Set(
          results.flatMap((item) => c.source.filter((record) => this.matches(record, item))),
        ),
      ];
      this.ranked = true;
      if (h.highlightMatches) this.#resultRanges(candidates, query, locale);
    } else if (
      h.filter === null ||
      h.completionMode === 'inline' ||
      h.completionMode === 'none' ||
      !query.trim() ||
      (!this.owner.selectionFree() &&
        !h.multiple &&
        selection != null &&
        query === this.owner.text(selection))
    )
      candidates = [...c.source];
    else if (h.filter)
      candidates = c.source.filter((record) =>
        h.filter!(this.owner.metadata(record).source, query, () => record.text),
      );
    else if (h.matching === 'fuzzy') {
      const hits = this.#search(locale).search(query);
      candidates = hits.map((hit) => hit.item);
      this.ranked = true;
      for (const hit of hits)
        this.#ranges.set(
          hit.item,
          () => hit.matches?.find((match) => match.field === 'text')?.ranges ?? [],
        );
    } else {
      const mode = h.matching === 'prefix' || h.matching === 'exact' ? h.matching : 'contains';
      candidates = c.source.filter((record) => {
        const ranges = matchText(record.text, query, mode, locale);
        if (ranges) {
          this.#ranges.set(record, ranges);
          return true;
        }
        return this.#extraTexts(record).some((text) => matchText(text, query, mode, locale));
      });
    }
    const limited = h.limit < 0 ? candidates : candidates.slice(0, Math.floor(h.limit));
    const visible = new Set(limited);
    c.setFilter((record) => visible.has(record), limited);
    if ((old && !c.visible.includes(old)) || (changed && !h.keepHighlight)) c.activeIndex = -1;
    if (
      (h.autoHighlight === 'always' || (h.autoHighlight && query !== '')) &&
      !c.highlighted &&
      h.open &&
      !this.composing
    )
      c.boundary();
    this.notify('programmatic');
    const messages = this.owner.messages();
    this.status = this.busy
      ? messages.loading
      : h.source && this.run.status === 'error'
        ? messages.error
        : messages.results(c.visible.length);
  }
  /** The ranked index over the current records, rebuilt only when their texts change. */
  #search(locale: string | undefined): TextIndex<SelectRecord> {
    const records = this.owner.collection.source,
      fields = this.host.matchFields,
      cached = this.#index;
    if (
      cached &&
      cached.locale === locale &&
      cached.fields === fields &&
      cached.records.length === records.length &&
      records.every(
        (record, index) => record === cached.records[index] && record.text === cached.texts[index],
      )
    )
      return cached.index;
    const index = new TextIndex<SelectRecord>({
      fields: ['text', 'extra'],
      boost: { text: 2 },
      locale,
      extract: (record, field) => (field === 'text' ? record.text : this.#extraTexts(record)),
    });
    index.addAll(records);
    this.#index = {
      records: [...records],
      texts: records.map((record) => record.text),
      fields,
      locale,
      index,
    };
    return index;
  }
  #extraTexts(record: SelectRecord): string[] {
    const value = this.host.matchFields?.(this.owner.metadata(record).source);
    return value == null ? [] : typeof value === 'string' ? [value] : [...value];
  }
  /** Ranges of source results or authoritative items: from the hits, else the query's words. */
  #resultRanges(records: readonly SelectRecord[], query: string, locale: string | undefined): void {
    const terms = tokenize(query, locale).map((token) => token.term);
    const hits = new Map<unknown, SearchHit>();
    if (this.host.filteredItems === undefined)
      for (const hit of this.#hits ?? []) hits.set(hit.item, hit);
    for (const record of records) {
      const hit = hits.get(this.owner.metadata(record).source) ?? hits.get(record.value);
      this.#ranges.set(
        record,
        () =>
          hit?.matches?.find((match) => match.field === 'text')?.ranges ??
          termRanges(record.text, hit?.terms ?? terms, locale),
      );
    }
  }
  /** The matched ranges of `record`'s text, for highlighting. */
  rangesOf(record: SelectRecord): readonly SearchRange[] {
    let ranges = this.#ranges.get(record);
    if (typeof ranges === 'function') this.#ranges.set(record, (ranges = ranges()));
    return ranges ?? [];
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
    const text = this.completion || this.value;
    if (this.editor && this.editor.value !== text) this.editor.value = text;
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
    if (this.owner.selectionFree() && !value.trim() && !this.host.openOnInputClick)
      this.host.setOpen(false, 'input-clear', event);
    else this.host.setOpen(true, 'input', event);
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
    const behavior = this.owner.selectionFree()
      ? 'query'
      : h.clearBehavior === 'contextual'
        ? this.value
          ? 'query'
          : 'selection'
        : h.clearBehavior;
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
    const previous = this.owner.values(this.owner.selection.value),
      index = previous.findIndex((item) => c.equal(item, value));
    if (index < 0) return;
    const fromEditor = event?.target === this.editor;
    this.owner.selection.set(
      previous.filter((item) => !c.equal(item, value)),
      'chip-remove-press',
      event,
    );
    if (this.owner.values(this.owner.selection.value).some((item) => c.equal(item, value))) return;
    void h.updateComplete.then(() => {
      const count = this.owner.values(this.owner.selection.value).length;
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
      this.remove(this.owner.values(this.owner.selection.value)[index], event);
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
      const last = this.owner.values(this.owner.selection.value).at(-1);
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
    } else if (event.key === 'Enter' && this.owner.selectionFree()) {
      // Nothing highlighted: the text stands and the owning form submits, as for a text input.
      event.preventDefault();
      if (h.open && !h.inline) h.setOpen(false, 'keyboard', event);
      this.owner.submit(event);
    } else if (event.key === 'Escape' && !h.open && this.owner.selectionFree() && this.value) {
      event.preventDefault();
      this.state.set('', 'escape-key', event);
      this.restore();
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
      // Render the completion first, then select its suffix.
      this.host.requestUpdate();
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
    this.run.cancel();
    this.#requested = undefined;
    this.completion = '';
    this.composing = false;
    this.#notified = undefined;
  }
}
