/**
 * Suggestion lists of the text editor (`uwg-te-req-inline-2`, `uwg-te-req-surfaces-2`,
 * `uwg-te-req-a11y-3`): the slash menu and the suggestions of inline nodes, each the list of
 * Command palette under its external-input profile. The editing root keeps focus and supplies the
 * query, the text from a trigger to the caret that the one trigger matcher reads; the router
 * forwards the navigation keys; Escape dismisses the occurrence until its trigger is removed.
 */
import { html, nothing, type TemplateResult } from 'lit';
import type { TpCommandList } from '../../../components/command-palette/list.js';
import type { CommandEntry } from '../../../components/command-palette/model.js';
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
import {
  commandMatchFields,
  isSuggestionEntryValue,
  slashEntries,
  suggestionEntries,
} from '../tools/commands.js';
import { selectionAnchor } from './selection-toolbar.js';

// Triggers and occurrences (uwg-te-req-inline-2) --------------------------------------------

/** An active suggestion tool and its trigger. */
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
  'image',
  'table-size',
]);

/** Whether a slash entry opens a surface once the trigger and query are removed. */
export function entryOpensSurface(tool: TextEditorTool | undefined): boolean {
  return tool !== undefined && SURFACE_ENTRY_KINDS.has(tool.kind);
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
    value: slash ? value : isSuggestionEntryValue(value) ? value.item : value,
    surface: slash ? 'slash' : 'suggestion',
    reason: 'item-press',
    sourceEvent,
    trigger: null,
    focus: true,
  };
}

/** A key that the router forwards while a list shows. */
export type SuggestionKey = 'navigate' | 'activate' | 'dismiss' | null;

/** How a forwarded key acts on the list: Up, Down, Home, End navigate; Enter, Tab activate. */
export function suggestionKey(
  event: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>,
): SuggestionKey {
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key))
    return event.shiftKey ? null : 'navigate';
  if (event.key === 'Enter') return event.shiftKey ? null : 'activate';
  if (event.key === 'Tab') return 'activate';
  if (event.key === 'Escape') return 'dismiss';
  return null;
}

// View -----------------------------------------------------------------------------------------

export interface TextEditorSuggestionsHost {
  requestUpdate(): void;
  strings(): TextEditorStrings;
  registry(): TextEditorToolRegistry | null;
  layout(): TextEditorLayout | null;
  /** The published state. */
  state(): TextEditorEngineState;
  /** Whether a list may show: ready, editable, focus in the editing root, not composing. */
  allowed(): boolean;
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
  announce(message: string): void;
  /** Another transient surface opens: close the others. */
  opening(): void;
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
  #announced: unknown = undefined;
  #referenced = false;
  /** The source of the current suggestion tool, stable while its tool stays. */
  #source: { readonly tool: TextEditorTool; readonly source: SearchSource } | null = null;

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

  /** Reads the occurrence from the state; opens, follows or closes the list without a request. */
  sync(): void {
    const registry = this.#host.registry();
    const layout = this.#host.layout();
    const match =
      registry && layout
        ? currentSuggestion(this.#host.state(), activeSuggestionTriggers(registry, layout))
        : null;
    this.#dismissals.retain(match?.key ?? null);
    const open = match !== null && !this.#dismissals.isDismissed(match.key) && this.#host.allowed();
    const changed =
      open !== this.#open || match?.key !== this.#match?.key || match?.query !== this.#match?.query;
    if (open && !this.#open) this.#host.opening();
    this.#match = match;
    this.#open = open;
    if (!open) this.#active = undefined;
    if (changed) this.#host.requestUpdate();
  }

  /** Closes the list; with `dismiss`, the occurrence stays closed until its trigger goes. */
  close(dismiss = false): void {
    if (dismiss && this.#match) this.#dismissals.dismiss(this.#match.key);
    if (!this.#open) return;
    this.#open = false;
    this.#active = undefined;
    this.#host.requestUpdate();
  }

  /**
   * A key the router forwards while the list shows: whether the list consumed it, so that the
   * router prevents and stops it; keys the list leaves reach the engine.
   */
  forwardKey(event: KeyboardEvent): boolean {
    if (!this.#open || event.isComposing || event.keyCode === 229) return false;
    const kind = suggestionKey(event);
    if (kind === 'dismiss') {
      this.close(true);
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
        ? slashEntries(layout.slash, {
            registry,
            context: this.#host.context('slash'),
            enabled: (entry, context) => this.#host.enabled(entry, context),
            shortcut: (id) => this.#host.shortcut(id),
          })
        : this.#open && tool
          ? undefined
          : [];
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
      .messages=${{ empty: strings.noResults, loading: strings.suggestionsLoading }}
      .initialFocus=${'none'}
      .finalFocus=${'none'}
      .activeValue=${this.#active}
      .onActiveChange=${this.#activeChange}
      .onExecute=${this.#execute}
      .onOpenChange=${this.#openChange}
    ></tp-command-list>`;
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
    this.#open = false;
    this.#match = null;
    this.#source = null;
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
    if (value === undefined || value === null || Object.is(value, this.#announced)) return;
    this.#announced = value;
    const options = [
      ...(list.listElement?.querySelectorAll<HTMLElement>('[role="option"]') ?? []),
    ].filter((option) => !option.hidden);
    const index = options.findIndex((option) => option.dataset['highlighted'] !== undefined);
    const option = options[index];
    if (!option) return;
    const label = option.getAttribute('aria-label') ?? option.textContent?.trim() ?? '';
    const description = option.getAttribute('aria-description');
    const position = fillTemplate(this.#host.strings().announceSuggestionActive, {
      label: description ? `${label}, ${description}` : label,
      position: index + 1,
      count: options.length,
    });
    this.#host.announce(position);
  }

  #sourceFor(tool: TextEditorTool): SearchSource {
    if (this.#source?.tool === tool) return this.#source.source;
    const source: SearchSource = {
      search: async (query, context) => {
        const result = tool.source ? await tool.source({ query, signal: context.signal }) : [];
        if (context.signal.aborted) throw context.signal.reason;
        return suggestionEntries(tool, result);
      },
    };
    this.#source = { tool, source };
    return source;
  }

  readonly #activeChange = (value: unknown): unknown => {
    this.#active = value;
    if (this.#list) this.#publishActive(this.#list);
    return value;
  };

  readonly #openChange = (event: TpSurfaceOpenChangeEvent): void => {
    // Escape and outside presses propose closing: the owner closes and dismisses the occurrence.
    if (!event.detail.value) this.close(true);
  };

  readonly #execute = (record: ChoiceModelRecord, event: Event): void => {
    const match = this.#match;
    if (!match || !this.#open) return;
    const registry = this.#host.registry();
    const entry = match.tool === 'slash' ? registry?.tools.get(String(record.value)) : undefined;
    this.close();
    void this.#host
      .request(suggestionProposal(match, record.value, event))
      .then((outcome) => {
        if (outcome === 'applied' && entry && entryOpensSurface(entry))
          this.#host.openSurface(entry.id, 'slash');
      })
      .catch(() => undefined);
  };
}
