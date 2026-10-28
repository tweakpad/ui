/**
 * Suggestion lists of the text editor (`uwg-te-req-inline-2`, `uwg-te-req-surfaces-2`,
 * `uwg-te-req-a11y-3`): the slash menu and the suggestions of inline nodes, each the list of
 * Command palette under its external-input profile. The editing root keeps focus and supplies the
 * query, the text from a trigger to the caret that the one trigger matcher reads; the router
 * forwards the navigation keys; Escape dismisses the occurrence until its trigger is removed.
 */
import { css, html, nothing, type TemplateResult } from 'lit';
import type { TpCommandList } from '../../../components/command-palette/list.js';
import type { CommandEntry } from '../../../components/command-palette/model.js';
import type { AnnounceOptions } from '../../../foundation/announcer.js';
import type { ChoiceModelRecord } from '../../../foundation/choice-model.js';
import { createId } from '../../../foundation/id.js';
import type { KeyShortcut } from '../../../foundation/key-bindings.js';
import type { VirtualAnchor } from '../../../foundation/positioning.js';
import type { SearchSource } from '../../../foundation/search/source.js';
import type { TpSurfaceOpenChangeEvent } from '../../../foundation/surface-state.js';
import { fillTemplate } from '../../../foundation/template.js';
import type {
  TextEditorRequestOutcome,
  TextEditorRequestProposal,
} from '../../../foundation/text-editor/controller.js';
import type { TextEditorLayout } from '../../../foundation/text-editor/layout.js';
import type {
  TextEditorEngineState,
  TextEditorTextRange,
} from '../../../foundation/text-editor/model.js';
import type { TextEditorStrings } from '../../../foundation/text-editor/strings.js';
import { matchTrigger } from '../../../foundation/text-editor/triggers.js';
import type {
  TextEditorRequestSurface,
  TextEditorTool,
  TextEditorToolContext,
  TextEditorToolKind,
  TextEditorToolRegistry,
} from '../../../foundation/text-editor/tools.js';
import type { ChangeReason } from '../../../foundation/types.js';
import {
  commandEntriesKey,
  commandMatchFields,
  isSuggestionEntryValue,
  slashEntries,
  suggestionEntries,
} from '../tools/commands.js';
import { stableRecord } from '../tools/stable.js';
import { selectionAnchor } from './selection-anchor.js';

/**
 * The entries of a closed list, one array: the closed list renders with the element on every state
 * publication, and a new array would update it each time.
 */
const NO_ENTRIES: readonly CommandEntry[] = Object.freeze([]);

// Triggers and occurrences (uwg-te-req-inline-2) --------------------------------------------

/** An active suggestion tool and its trigger. */
/** Structure of the suggestion list's host: it takes no space; its popup lives in the top layer. */
export const suggestionsStyles = css`
  [part~='text-editor-suggestions'] {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    display: block;
    inline-size: 0;
    block-size: 0;
    overflow: clip;
  }
`;

export interface TextEditorSuggestionTrigger {
  readonly tool: string;
  readonly trigger: string;
}

/**
 * The active suggestion tools in the order `layout.suggestions` lists them: available suggestion
 * tools with a trigger.
 */
export function activeSuggestionTriggers(
  registry: TextEditorToolRegistry,
  layout: TextEditorLayout,
): TextEditorSuggestionTrigger[] {
  const triggers: TextEditorSuggestionTrigger[] = [];
  for (const id of layout.suggestions) {
    const tool = registry.tools.get(id);
    const trigger = tool?.suggest?.trigger;
    if (tool?.kind !== 'suggestion' || !trigger || !registry.isAvailable(id)) continue;
    if (!triggers.some((entry) => entry.trigger === trigger)) triggers.push({ tool: id, trigger });
  }
  return triggers;
}

/** A trigger occurrence before the caret. */
export interface TextEditorSuggestionMatch {
  readonly tool: string;
  readonly trigger: string;
  /** The text from the trigger to the caret, without the trigger. */
  readonly query: string;
  /** The trigger and the query, which an insertion replaces. */
  readonly range: TextEditorTextRange;
  /** The occurrence's identity: its textblock, cell, offset and trigger. */
  readonly key: string;
}

/**
 * The occurrence of an active trigger before a collapsed caret, read from the state through the
 * one matcher: at the start of a textblock or after whitespace, never in code or a link, the
 * fullwidth form of a trigger matching too; `null` otherwise.
 */
export function currentSuggestion(
  state: TextEditorEngineState,
  triggers: readonly TextEditorSuggestionTrigger[],
): TextEditorSuggestionMatch | null {
  const { selection, caret } = state;
  if (!triggers.length || selection.kind !== 'text' || !selection.empty || !caret) return null;
  const match = matchTrigger(
    caret.textBefore,
    triggers.map((entry) => entry.trigger),
    { inCode: caret.inCode, inLink: state.link !== null },
  );
  if (!match) return null;
  const from = caret.point.offset - (caret.textBefore.length - match.offset);
  if (from < 0) return null;
  const tool = triggers.find((entry) => entry.trigger === match.trigger)!.tool;
  const cell = caret.point.cell;
  const range: TextEditorTextRange = {
    block: caret.point.block,
    ...(cell ? { cell } : {}),
    from,
    to: caret.point.offset,
  };
  const cellKey = cell ? `${cell.row}.${cell.column}.${cell.paragraph}` : '';
  return {
    tool,
    trigger: match.trigger,
    query: match.query,
    range,
    key: `${range.block}|${cellKey}|${from}|${match.trigger}`,
  };
}

/**
 * The occurrences that Escape dismissed: an occurrence stays dismissed, keeping its typed text,
 * until its trigger is removed, after which typing it again opens a new occurrence.
 */
export class SuggestionDismissals {
  #keys = new Set<string>();

  dismiss(key: string): void {
    this.#keys.add(key);
  }

  isDismissed(key: string): boolean {
    return this.#keys.has(key);
  }

  /** Forgets every dismissed occurrence but the current one, whose trigger is still there. */
  retain(current: string | null): void {
    if (this.#keys.size === 0) return;
    this.#keys = current !== null && this.#keys.has(current) ? new Set([current]) : new Set();
  }

  clear(): void {
    this.#keys.clear();
  }
}

/** Kinds of a slash entry that open a surface instead of acting at once. */
const SURFACE_ENTRY_KINDS: ReadonlySet<TextEditorToolKind> = new Set<TextEditorToolKind>([
  'link',
  'table-size',
]);

/** Whether a slash entry opens a surface once the trigger and query are removed. */
export function entryOpensSurface(tool: TextEditorTool | undefined): boolean {
  return tool !== undefined && SURFACE_ENTRY_KINDS.has(tool.kind);
}

/**
 * The item of an executed suggestion entry. A source's result is the list's value as it stands,
 * so an executed record holds the whole command item, whose own value is the entry value.
 */
function suggestionItem(value: unknown): unknown {
  if (isSuggestionEntryValue(value)) return value.item;
  const entry = (value as { readonly value?: unknown } | null)?.value;
  return isSuggestionEntryValue(entry) ? entry.item : value;
}

/**
 * The text of a list value, the option's accessible name: a source's result is the whole command
 * item, whose label renders as content, so its `text` names it; any other value names itself.
 */
/**
 * The list's source for a suggestion tool: the tool's items as command entries, synchronously when
 * the tool answers synchronously, so the list shows them without a loading state, else once its
 * promise settles, unless a newer query aborted it.
 */
export function suggestionSource(tool: TextEditorTool): SearchSource {
  return {
    search: (query, context) => {
      const result = tool.source ? tool.source({ query, signal: context.signal }) : [];
      if (!isThenable(result)) return suggestionEntries(tool, result);
      return Promise.resolve(result).then((items) => {
        if (context.signal.aborted) throw context.signal.reason;
        return suggestionEntries(tool, items);
      });
    },
  };
}

function isThenable<T>(value: T | PromiseLike<T>): value is PromiseLike<T> {
  return typeof (value as PromiseLike<T> | null)?.then === 'function';
}

export function suggestionText(value: unknown): string {
  const text = (value as { readonly text?: unknown } | null)?.text;
  return typeof text === 'string' ? text : String(value ?? '');
}

/** The request of an executed entry: the slash tool with the entry, or the node's tool with the item. */
export function suggestionProposal(
  match: Pick<TextEditorSuggestionMatch, 'tool'>,
  value: unknown,
  sourceEvent: Event | undefined,
): TextEditorRequestProposal {
  const slash = match.tool === 'slash';
  return {
    target: match.tool,
    value: slash ? value : suggestionItem(value),
    surface: slash ? 'slash' : 'suggestion',
    reason: 'item-press',
    sourceEvent,
    trigger: null,
    focus: true,
  };
}

/** A key that the router forwards while a list shows. */
export type SuggestionKey = 'navigate' | 'activate' | 'dismiss' | null;

/**
 * How a forwarded key acts on the list: Up, Down, Home, End navigate; Enter, Tab activate
 * (`uwg-te-tab-keymap-host` r9). Shift+Tab is no list key: it acts as it would with the list
 * closed, and the list closes with the reason of what it did.
 */
export function suggestionKey(
  event: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>,
): SuggestionKey {
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key))
    return event.shiftKey ? null : 'navigate';
  if (event.key === 'Enter') return event.shiftKey ? null : 'activate';
  if (event.key === 'Tab') return event.shiftKey ? null : 'activate';
  if (event.key === 'Escape') return 'dismiss';
  return null;
}

// Open lane (uwg-te-tab-reasons r12, r13) ----------------------------------------------------------

/** What lets a list show, read on each state publication. */
export interface TextEditorSuggestionGate {
  /** An instance is ready: none while the engine loads or remounts. */
  readonly ready: boolean;
  /** The engine reports the document editable and the widget is not read-only. */
  readonly editable: boolean;
  readonly disabled: boolean;
  /** Focus is in the editing root. */
  readonly focused: boolean;
}

/** What reached the editing root since the previous state publication. */
export interface TextEditorSuggestionInput {
  /** The document changed. */
  readonly edited: boolean;
  /** A key that the list left reached the engine. */
  readonly keyed: boolean;
  /** A primary press in the editing root. */
  readonly pressed?: boolean | undefined;
  /** The reason of the document change (a paste's, a drop's, an undo's), else `input`. */
  readonly edit?: ChangeReason | null | undefined;
}

/** A change of a list's open lane; internal, since no public event or state carries it. */
export interface TextEditorSuggestionLane {
  readonly open: boolean;
  readonly reason: ChangeReason;
}

/** The announcement of a highlighted item: polite, one pending message replacing the previous. */
export const SUGGESTION_ANNOUNCEMENT: AnnounceOptions = Object.freeze({
  politeness: 'polite',
  key: 'suggestion',
});

/** Whether the gate lets a list show. */
export function suggestionAllowed(gate: TextEditorSuggestionGate): boolean {
  return gate.ready && gate.editable && !gate.disabled && gate.focused;
}

/**
 * The input that moved the caret onto or off a trigger context (`uwg-te-tab-reasons` r12, r13):
 * an edit with the reason of its change (`input` for typing, `input-paste`, `drag`, `hotkey`,
 * `engine` or `imperative-action` for a paste, a drop or an undo), else a key the list left
 * (`keyboard`), else a press in the editing root (`pointer`), else a selection that a `run` set
 * (`imperative-action`).
 */
export function suggestionInputReason(input: TextEditorSuggestionInput): ChangeReason {
  if (input.edited) return input.edit ?? 'input';
  if (input.keyed) return 'keyboard';
  return input.pressed ? 'pointer' : 'imperative-action';
}

/**
 * Why a shown list closes on a state publication: `disabled` when the widget becomes disabled,
 * `programmatic` when read-only or a remount hides it, `focus-outside` when focus leaves the
 * editing root, and otherwise the input that moved the caret out of the trigger context.
 */
export function suggestionCloseReason(
  gate: TextEditorSuggestionGate,
  input: TextEditorSuggestionInput,
): ChangeReason {
  if (gate.disabled) return 'disabled';
  if (!gate.ready || !gate.editable) return 'programmatic';
  if (!gate.focused) return 'focus-outside';
  return suggestionInputReason(input);
}

// View -----------------------------------------------------------------------------------------

export interface TextEditorSuggestionsHost {
  requestUpdate(): void;
  strings(): TextEditorStrings;
  registry(): TextEditorToolRegistry | null;
  layout(): TextEditorLayout | null;
  /** The published state. */
  state(): TextEditorEngineState;
  /** What lets a list show: ready, editable, enabled, focus in the editing root. */
  gate(): TextEditorSuggestionGate;
  /** The tool context of a surface. */
  context(surface: TextEditorRequestSurface): TextEditorToolContext;
  enabled(tool: TextEditorTool, context: TextEditorToolContext): boolean;
  shortcut(toolId: string): KeyShortcut | undefined;
  rangeRects(range: TextEditorTextRange): readonly DOMRectReadOnly[];
  caretRect(): DOMRectReadOnly | null;
  content(): HTMLElement | null;
  request(proposal: TextEditorRequestProposal): Promise<TextEditorRequestOutcome>;
  /** Opens the surface of a slash entry once its request applied. */
  openSurface(toolId: string, surface: TextEditorRequestSurface): void;
  /** Writes `aria-controls` and `aria-activedescendant` on the editing root, `null` removing them. */
  referenceList(id: string | null): void;
  announce(message: string, options: AnnounceOptions): void;
  /** The list opens, for `reason`: close the other transient surfaces with it. */
  opening(reason?: ChangeReason): void;
  /** The reason of the latest document change, read when a publication shows an edit. */
  editReason?(): ChangeReason | null;
  /** A change of the open lane with its reason (`uwg-te-tab-reasons` r12, r13). */
  lane?(lane: TextEditorSuggestionLane): void;
}

/** The suggestion list of one widget. */
export class TextEditorSuggestions {
  readonly #host: TextEditorSuggestionsHost;
  readonly #dismissals = new SuggestionDismissals();
  readonly #id = createId('tp-text-editor-suggestions');
  readonly #anchor: VirtualAnchor;
  #match: TextEditorSuggestionMatch | null = null;
  #open = false;
  #list: TpCommandList | null = null;
  #active: unknown = undefined;
  /** The slash entries last rendered, kept while a render gives entries that render alike. */
  #slash: { readonly key: string; readonly entries: readonly CommandEntry[] } | null = null;
  /** The last announced highlight message, so that an unchanged highlight speaks once. */
  #announced: string | undefined = undefined;
  #referenced = false;
  /** The source of the current suggestion tool, stable while its tool stays. */
  #source: { readonly tool: TextEditorTool; readonly source: SearchSource } | null = null;
  #lane: TextEditorSuggestionLane | null = null;
  /** A key the list left reached the engine since the last state publication. */
  #keyed = false;
  /** A primary press in the editing root since the last state publication. */
  #pressed = false;
  /** The content version of the last state publication, `null` before the first. */
  #contentVersion: number | null = null;

  constructor(host: TextEditorSuggestionsHost) {
    this.#host = host;
    this.#anchor = selectionAnchor(
      () => {
        const match = this.#match;
        if (!match) return [];
        const from = match.range.from;
        const rects = host.rangeRects({
          ...match.range,
          from,
          to: from + match.trigger.length,
        });
        if (rects.length) return rects.slice(0, 1);
        const caret = host.caretRect();
        return caret ? [caret] : [];
      },
      () => host.content(),
    );
  }

  /** Whether the list shows. */
  get isOpen(): boolean {
    return this.#open;
  }

  /** The current occurrence while the list shows. */
  get match(): TextEditorSuggestionMatch | null {
    return this.#open ? this.#match : null;
  }

  /** The last change of the open lane with its reason, `null` before the first. */
  get lane(): TextEditorSuggestionLane | null {
    return this.#lane;
  }

  /** Reads the occurrence from the state; opens, follows or closes the list without a request. */
  sync(): void {
    const registry = this.#host.registry();
    const layout = this.#host.layout();
    const state = this.#host.state();
    const match =
      registry && layout
        ? currentSuggestion(state, activeSuggestionTriggers(registry, layout))
        : null;
    this.#dismissals.retain(match?.key ?? null);
    const edited = this.#contentVersion !== null && state.contentVersion !== this.#contentVersion;
    const input: TextEditorSuggestionInput = {
      edited,
      keyed: this.#keyed,
      pressed: this.#pressed,
      edit: edited ? (this.#host.editReason?.() ?? null) : null,
    };
    this.#contentVersion = state.contentVersion;
    this.#keyed = false;
    this.#pressed = false;
    const gate = this.#host.gate();
    const open =
      match !== null && !this.#dismissals.isDismissed(match.key) && suggestionAllowed(gate);
    const changed =
      open !== this.#open || match?.key !== this.#match?.key || match?.query !== this.#match?.query;
    const reason = open ? suggestionInputReason(input) : suggestionCloseReason(gate, input);
    if (open && !this.#open) this.#host.opening(reason);
    if (open !== this.#open) this.#setLane(open, reason);
    this.#match = match;
    this.#open = open;
    if (!open) this.#active = undefined;
    if (changed) this.#host.requestUpdate();
  }

  /** Closes the list; with `dismiss`, the occurrence stays closed until its trigger goes. */
  close(dismiss = false, reason: ChangeReason = 'programmatic'): void {
    if (dismiss && this.#match) this.#dismissals.dismiss(this.#match.key);
    if (!this.#open) return;
    this.#open = false;
    this.#active = undefined;
    this.#setLane(false, reason);
    this.#host.requestUpdate();
  }

  /** A primary press in the editing root: a caret it moves opens or closes with `pointer`. */
  pressed(): void {
    this.#pressed = true;
  }

  #setLane(open: boolean, reason: ChangeReason): void {
    this.#lane = Object.freeze({ open, reason });
    this.#host.lane?.(this.#lane);
  }

  /**
   * A key the router forwards from the editing root: whether the list consumed it, so that the
   * router prevents and stops it; keys the list leaves reach the engine.
   */
  forwardKey(event: KeyboardEvent): boolean {
    if (event.isComposing || event.keyCode === 229) return false;
    const consumed = this.#open && this.#consumeKey(event);
    // A caret that a key the list leaves moves closes or reopens a list with `keyboard`.
    if (!consumed) this.#keyed = true;
    return consumed;
  }

  #consumeKey(event: KeyboardEvent): boolean {
    const kind = suggestionKey(event);
    if (kind === 'dismiss') {
      this.close(true, 'escape-key');
      return true;
    }
    const list = this.#list;
    if (!list || kind === null) return false;
    return kind === 'navigate' ? list.handleQueryKey(event) : list.activateHighlighted(event);
  }

  render(): TemplateResult | typeof nothing {
    const match = this.#match;
    const registry = this.#host.registry();
    const layout = this.#host.layout();
    if (!registry || !layout || !activeSuggestionTriggers(registry, layout).length) return nothing;
    const strings = this.#host.strings();
    const tool = match ? registry.tools.get(match.tool) : undefined;
    const slash = match?.tool === 'slash';
    const items: readonly CommandEntry[] | undefined =
      this.#open && slash
        ? this.#slashEntries(
            slashEntries(layout.slash, {
              registry,
              context: this.#host.context('slash'),
              enabled: (entry, context) => this.#host.enabled(entry, context),
              shortcut: (id) => this.#host.shortcut(id),
            }),
          )
        : this.#open && tool
          ? undefined
          : NO_ENTRIES;
    return html`<tp-command-list
      part="text-editor-suggestions"
      id=${this.#id}
      class="suggestions"
      label=${tool ? (slash ? strings.slash : strings.suggestions) : strings.suggestions}
      matching="fuzzy"
      highlight-matches
      placement="block-end start"
      .inline=${false}
      .queryOwner=${this.#host.content()}
      .anchor=${this.#anchor}
      .open=${this.#open}
      .inputValue=${this.#open ? (match?.query ?? '') : ''}
      .items=${items}
      .source=${this.#open && tool && !slash ? this.#sourceFor(tool) : undefined}
      .matchFields=${commandMatchFields}
      .itemToText=${suggestionText}
      .messages=${stableRecord({ empty: strings.noResults, loading: strings.suggestionsLoading })}
      .initialFocus=${'none'}
      .finalFocus=${'none'}
      .activeValue=${this.#active}
      .onActiveChange=${this.#activeChange}
      .onExecute=${this.#execute}
      .onOpenChange=${this.#openChange}
    ></tp-command-list>`;
  }

  /**
   * The entries to render: the previous ones while the new ones render alike, so that a render
   * the highlight itself caused (its reference on the editing root) keeps the list's records and
   * the highlight, which a new array would reset to the first entry.
   */
  #slashEntries(entries: readonly CommandEntry[]): readonly CommandEntry[] {
    const key = commandEntriesKey(entries);
    if (this.#slash?.key !== key) this.#slash = { key, entries };
    return this.#slash.entries;
  }

  /** After the render: follows the anchor and publishes the highlighted item. */
  updated(root: ShadowRoot): void {
    const list = root.querySelector<TpCommandList>('tp-command-list.suggestions');
    this.#list = list;
    if (!this.#open || !list) {
      if (this.#referenced) this.#host.referenceList(null);
      this.#referenced = false;
      this.#announced = undefined;
      return;
    }
    void list.updateComplete.then(() => {
      if (!this.#open) return;
      void list.updatePosition();
      this.#publishActive(list);
    });
  }

  /** Clears the dismissed occurrences and closes; called when the widget disconnects. */
  release(): void {
    this.#dismissals.clear();
    if (this.#open) this.#setLane(false, 'programmatic');
    this.#open = false;
    this.#match = null;
    this.#source = null;
    this.#keyed = false;
    this.#pressed = false;
    this.#contentVersion = null;
  }

  #publishActive(list: TpCommandList): void {
    const reference = list.activeDescendantReference();
    if (reference) {
      this.#referenced = true;
      this.#host.referenceList(reference.id || this.#id);
      return;
    }
    if (this.#referenced) this.#host.referenceList(null);
    this.#referenced = false;
    // Without a reference into the list, the live announcer speaks each new highlight.
    const value = list.highlightedValue;
    if (value === undefined || value === null) return;
    const options = [
      ...(list.listElement?.querySelectorAll<HTMLElement>('[role="option"]') ?? []),
    ].filter((option) => !option.hidden);
    const index = options.findIndex((option) => option.dataset['highlighted'] !== undefined);
    const option = options[index];
    if (!option) return;
    const label = option.getAttribute('aria-label') ?? option.textContent?.trim() ?? '';
    const description = option.getAttribute('aria-description');
    const message = fillTemplate(this.#host.strings().announceSuggestionActive, {
      label: description ? `${label}, ${description}` : label,
      position: index + 1,
      count: options.length,
    });
    // The highlighted option is read from the rendered list, which may still show the previous
    // highlight; that message equals the last one and waits for the pass after the render.
    if (message === this.#announced) return;
    this.#announced = message;
    this.#host.announce(message, SUGGESTION_ANNOUNCEMENT);
  }

  #sourceFor(tool: TextEditorTool): SearchSource {
    if (this.#source?.tool === tool) return this.#source.source;
    const source = suggestionSource(tool);
    this.#source = { tool, source };
    return source;
  }

  readonly #activeChange = (value: unknown): unknown => {
    this.#active = value;
    const list = this.#list;
    if (!list) return value;
    this.#publishActive(list);
    // The list commits the highlight after this proposal and renders it in the update it then
    // requests; a highlight that comes with asynchronous results precedes the render of its option.
    void Promise.resolve()
      .then(() => list.updateComplete)
      .then(() => {
        if (this.#open && this.#list === list) this.#publishActive(list);
      });
    return value;
  };

  readonly #openChange = (event: TpSurfaceOpenChangeEvent): void => {
    // Escape, outside presses and focus leaving propose closing: the owner closes and dismisses
    // the occurrence with the proposal's reason.
    if (!event.detail.value) this.close(true, event.detail.reason);
  };

  readonly #execute = (record: ChoiceModelRecord, event: Event): void => {
    const match = this.#match;
    if (!match || !this.#open) return;
    const registry = this.#host.registry();
    const entry = match.tool === 'slash' ? registry?.tools.get(String(record.value)) : undefined;
    this.close(false, 'item-press');
    void this.#host
      .request(suggestionProposal(match, record.value, event))
      .then((outcome) => {
        if (outcome === 'applied' && entry && entryOpensSurface(entry))
          this.#host.openSurface(entry.id, 'slash');
      })
      .catch(() => undefined);
  };
}
