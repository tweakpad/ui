import { afterEach, describe, expect, it, vi } from 'vitest';
import { ANNOUNCEMENT_REGION_SETTLE_DELAY } from '../../../foundation/announcer.js';
import type { TpSurfaceOpenChangeEvent } from '../../../foundation/surface-state.js';
import { textEditorTools } from '../../../foundation/text-editor/builtin-tools.js';
import { BASE_CAPABILITIES } from '../../../foundation/text-editor/capabilities.js';
import { defaultTextEditorLayout } from '../../../foundation/text-editor/layout.js';
import type { TextEditorEngineState } from '../../../foundation/text-editor/model.js';
import { preReadyState } from '../../../foundation/text-editor/state.js';
import { textEditorStrings } from '../../../foundation/text-editor/strings.js';
import {
  defineTextEditorTool,
  resolveTextEditorTools,
  type TextEditorTool,
  type TextEditorToolContext,
} from '../../../foundation/text-editor/tools.js';
import { TextEditorAnnouncer } from '../announcer.js';
import { suggestionEntries } from '../tools/commands.js';
import {
  activeSuggestionTriggers,
  currentSuggestion,
  entryOpensSurface,
  SuggestionDismissals,
  suggestionKey,
  suggestionProposal,
  suggestionSource,
  suggestionText,
  SUGGESTION_ANNOUNCEMENT,
  suggestionCloseReason,
  suggestionInputReason,
  TextEditorSuggestions,
  type TextEditorSuggestionGate,
  type TextEditorSuggestionsHost,
} from './suggestions.js';

afterEach(() => vi.useRealTimers());

const OPEN_GATE: TextEditorSuggestionGate = Object.freeze({
  ready: true,
  editable: true,
  disabled: false,
  focused: true,
});

const mention = defineTextEditorTool({
  id: 'mention',
  kind: 'suggestion',
  label: 'Mention',
  surfaces: [],
  suggest: { trigger: '@' },
});
const registry = resolveTextEditorTools({
  builtins: textEditorTools,
  tools: [mention],
  capabilities: new Set(BASE_CAPABILITIES),
});

function caret(
  textBefore: string,
  offset = textBefore.length,
  extra: Partial<TextEditorEngineState> = {},
): TextEditorEngineState & { readonly caret: NonNullable<TextEditorEngineState['caret']> } {
  const point = { block: 'b1', offset };
  return {
    ...preReadyState({ editable: true, empty: false }),
    selection: { kind: 'text' as const, anchor: point, head: point, empty: true },
    ...extra,
    caret: { point, textBefore, inCode: false },
  };
}

describe('suggestion triggers (uwg-te-req-inline-2)', () => {
  const triggers = activeSuggestionTriggers(registry, {
    ...defaultTextEditorLayout,
    suggestions: ['slash', 'mention', 'unknown', 'bold'],
  });

  it('activates the suggestion tools that the layout lists, in its order', () => {
    expect(triggers).toEqual([
      { tool: 'slash', trigger: '/' },
      { tool: 'mention', trigger: '@' },
    ]);
    expect(activeSuggestionTriggers(registry, defaultTextEditorLayout)).toEqual([
      { tool: 'slash', trigger: '/' },
    ]);
  });

  it('matches at the start of a textblock or after whitespace, with the query and the range', () => {
    const match = currentSuggestion(caret('Hi @ad', 10), triggers)!;
    expect(match).toMatchObject({
      tool: 'mention',
      trigger: '@',
      query: 'ad',
      range: { block: 'b1', from: 7, to: 10 },
    });
    expect(currentSuggestion(caret('/hea'), triggers)).toMatchObject({
      tool: 'slash',
      query: 'hea',
    });
    // Fullwidth forms match as their trigger.
    expect(currentSuggestion(caret('／hea'), triggers)).toMatchObject({ tool: 'slash' });
    expect(currentSuggestion(caret('＠ada'), triggers)).toMatchObject({ tool: 'mention' });
  });

  it('never matches inside a word, in code, in a link, after whitespace or for a range', () => {
    expect(currentSuggestion(caret('a/b'), triggers)).toBeNull();
    expect(currentSuggestion(caret('/a b'), triggers)).toBeNull();
    expect(
      currentSuggestion(
        { ...caret('/a'), caret: { ...caret('/a').caret, inCode: true } },
        triggers,
      ),
    ).toBeNull();
    expect(
      currentSuggestion(
        caret('/a', 2, {
          link: { href: 'https://x.test', range: { block: 'b1', from: 0, to: 2 } },
        }),
        triggers,
      ),
    ).toBeNull();
    const point = { block: 'b1', offset: 2 };
    expect(
      currentSuggestion(
        {
          ...caret('/a'),
          selection: {
            kind: 'text',
            anchor: { block: 'b1', offset: 0 },
            head: point,
            empty: false,
          },
        },
        triggers,
      ),
    ).toBeNull();
    expect(currentSuggestion(caret('/a'), [])).toBeNull();
  });

  it('keys an occurrence by its textblock, cell, offset and trigger', () => {
    const a = currentSuggestion(caret('/a'), triggers)!;
    const b = currentSuggestion(caret('/ab'), triggers)!;
    expect(a.key).toBe(b.key);
    const cell = { ...caret('/a').caret.point, cell: { row: 1, column: 2, paragraph: 0 } };
    const inCell = currentSuggestion(
      { ...caret('/a'), caret: { point: cell, textBefore: '/a', inCode: false } },
      triggers,
    )!;
    expect(inCell.key).not.toBe(a.key);
    expect(inCell.range.cell).toEqual({ row: 1, column: 2, paragraph: 0 });
  });
});

describe('suggestion dismissal (uwg-te-req-inline-2)', () => {
  it('keeps a dismissed occurrence closed until its trigger is removed', () => {
    const dismissals = new SuggestionDismissals();
    dismissals.dismiss('one');
    dismissals.retain('one');
    expect(dismissals.isDismissed('one')).toBe(true);
    // The trigger went: typing it again opens a new occurrence.
    dismissals.retain(null);
    expect(dismissals.isDismissed('one')).toBe(false);
    dismissals.dismiss('two');
    dismissals.retain('three');
    expect(dismissals.isDismissed('two')).toBe(false);
  });
});

describe('suggestion keys and requests', () => {
  const key = (init: Partial<KeyboardEvent>) =>
    suggestionKey({
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      key: '',
      ...init,
    });

  it('forwards Up, Down, Home and End, Enter and Tab, and Escape, but not Shift+Tab', () => {
    expect(['ArrowUp', 'ArrowDown', 'Home', 'End'].map((name) => key({ key: name }))).toEqual([
      'navigate',
      'navigate',
      'navigate',
      'navigate',
    ]);
    expect([key({ key: 'Enter' }), key({ key: 'Tab' })]).toEqual(['activate', 'activate']);
    expect(key({ key: 'Escape' })).toBe('dismiss');
    expect([
      key({ key: 'a' }),
      key({ key: 'ArrowDown', shiftKey: true }),
      key({ key: 'Enter', ctrlKey: true }),
      key({ key: 'Tab', shiftKey: true }),
    ]).toEqual([null, null, null, null]);
  });

  it('requests the slash tool with the entry or the node tool with the item, reason item-press', () => {
    const event = new Event('keydown');
    expect(suggestionProposal({ tool: 'slash' }, 'heading-1', event)).toMatchObject({
      target: 'slash',
      value: 'heading-1',
      surface: 'slash',
      reason: 'item-press',
      sourceEvent: event,
    });
    const item = { name: 'Ada' };
    expect(suggestionProposal({ tool: 'mention' }, { index: 0, item }, event)).toMatchObject({
      target: 'mention',
      value: item,
      surface: 'suggestion',
    });
    // A source result reaches the list as its value: the whole command item of the entry.
    const record = { value: { index: 0, item }, label: 'Ada', text: 'Ada' };
    expect(suggestionProposal({ tool: 'mention' }, record, event).value).toBe(item);
  });

  it('knows the entries that open a surface', () => {
    expect(
      ['image', 'link', 'table', 'paragraph'].map((id) =>
        entryOpensSurface((textEditorTools as Record<string, TextEditorTool>)[id]),
      ),
    ).toEqual([true, true, true, false]);
    expect(entryOpensSurface(undefined)).toBe(false);
  });
});

describe('suggestion option names (uwg-te-req-a11y-3)', () => {
  it("names a source result by its label's text, not by the command item object", () => {
    const tool = {
      id: 'mention',
      suggest: { label: (item: unknown) => (item as { name: string }).name },
    } as unknown as TextEditorTool;
    const [entry] = suggestionEntries(tool, [{ name: 'Mara Quint' }]);
    expect(String(entry)).toBe('[object Object]');
    expect(suggestionText(entry)).toBe('Mara Quint');
    expect(suggestionText('heading-2')).toBe('heading-2');
    expect(suggestionText(null)).toBe('');
  });
});

describe('suggestion sources (uwg-te-req-inline-2)', () => {
  const people = [{ name: 'Mara Quint' }, { name: 'Tomas Lindqvist' }];
  const toolWith = (source: TextEditorTool['source']) =>
    ({
      id: 'mention',
      suggest: { label: (item: unknown) => (item as { name: string }).name },
      source,
    }) as unknown as TextEditorTool;
  const context = (signal = new AbortController().signal) => ({
    signal,
    limit: -1,
    locale: undefined,
  });

  it('answers a synchronous source synchronously, so the list shows no loading state', () => {
    const result = suggestionSource(toolWith(() => people)).search('m', context());
    expect(typeof (result as PromiseLike<unknown>).then).toBe('undefined');
    expect([...(result as Iterable<unknown>)].map(suggestionText)).toEqual([
      'Mara Quint',
      'Tomas Lindqvist',
    ]);
  });

  it('answers an asynchronous source once it settles, and rejects a query that a newer one aborted', async () => {
    const asynchronous = suggestionSource(toolWith(async () => people));
    const result = asynchronous.search('m', context());
    expect(typeof (result as PromiseLike<unknown>).then).toBe('function');
    expect(((await result) as unknown[]).map(suggestionText)).toEqual([
      'Mara Quint',
      'Tomas Lindqvist',
    ]);
    const controller = new AbortController();
    const pending = asynchronous.search('m', context(controller.signal));
    controller.abort(new Error('newer'));
    await expect(pending).rejects.toThrow('newer');
  });
});

describe('suggestion list references (uwg-te-req-a11y)', () => {
  it('references the highlight of asynchronous results once its option has rendered', async () => {
    const references: (string | null)[] = [];
    const layout = { ...defaultTextEditorLayout, suggestions: ['mention'] };
    const view = new TextEditorSuggestions({
      requestUpdate: () => undefined,
      strings: () => textEditorStrings,
      registry: () => registry,
      layout: () => layout,
      state: () => caret('@a'),
      gate: () => OPEN_GATE,
      context: () => ({}) as TextEditorToolContext,
      enabled: () => true,
      shortcut: () => undefined,
      rangeRects: () => [],
      caretRect: () => null,
      content: () => null,
      request: () => Promise.resolve('applied'),
      openSurface: () => undefined,
      referenceList: (id) => void references.push(id),
      announce: () => undefined,
      opening: () => undefined,
    });
    view.sync();
    expect(view.isOpen).toBe(true);
    let rendered: { id: string } | null = null;
    const list = {
      updateComplete: Promise.resolve(),
      updatePosition: () => Promise.resolve(),
      activeDescendantReference: () => rendered,
      highlightedValue: undefined,
      listElement: null,
    };
    view.updated({ querySelector: () => list } as unknown as ShadowRoot);
    await Promise.resolve();
    await Promise.resolve();
    const template = view.render() as { values: unknown[] };
    const onActiveChange = template.values.find(
      (value): value is (value: unknown) => unknown =>
        typeof value === 'function' && /#publishActive/.test(String(value)),
    )!;
    // Results arrive later: the list highlights the first one before its option renders.
    let settle: () => void = () => undefined;
    list.updateComplete = new Promise<void>((resolve) => (settle = resolve));
    onActiveChange({ index: 0, item: 'Ada' });
    expect(references).toEqual([]);
    rendered = { id: 'option-ada' };
    settle();
    await list.updateComplete;
    for (let tick = 0; tick < 4; tick++) await Promise.resolve();
    expect(references).toEqual(['option-ada']);
  });
});

// Open lane and announcements -------------------------------------------------------------------

/** A mention list's view over a host whose state and gate a test publishes. */
function laneFixture(overrides: Partial<TextEditorSuggestionsHost> = {}) {
  const layout = { ...defaultTextEditorLayout, suggestions: ['mention'] };
  let state: TextEditorEngineState = caret('');
  let gate: TextEditorSuggestionGate = OPEN_GATE;
  const view = new TextEditorSuggestions({
    requestUpdate: () => undefined,
    strings: () => textEditorStrings,
    registry: () => registry,
    layout: () => layout,
    state: () => state,
    gate: () => gate,
    context: () => ({}) as TextEditorToolContext,
    enabled: () => true,
    shortcut: () => undefined,
    rangeRects: () => [],
    caretRect: () => null,
    content: () => null,
    request: () => Promise.resolve('applied'),
    openSurface: () => undefined,
    referenceList: () => undefined,
    announce: () => undefined,
    opening: () => undefined,
    ...overrides,
  });
  /** Publishes the caret after `text`, `edited` raising the content version, with a gate. */
  const publish = (
    text: string,
    edited: boolean,
    closed: Partial<TextEditorSuggestionGate> = {},
  ) => {
    state = { ...caret(text), contentVersion: state.contentVersion + (edited ? 1 : 0) };
    gate = { ...OPEN_GATE, ...closed };
    view.sync();
  };
  /** Removes any trigger, then types `@a`: the list shows, opened by `input`. */
  const open = () => {
    publish('', true);
    publish('@a', true);
    expect(view.isOpen).toBe(true);
    expect(view.lane).toEqual({ open: true, reason: 'input' });
  };
  return { view, publish, open };
}

/** A property binding of the list, such as `onOpenChange`. */
function listBinding(view: TextEditorSuggestions, name: string): unknown {
  const template = view.render() as { strings: readonly string[]; values: readonly unknown[] };
  const index = template.strings.findIndex((part) => part.trimEnd().endsWith(`.${name}=`));
  expect(index).toBeGreaterThanOrEqual(0);
  return template.values[index];
}

const key = (name: string) =>
  ({
    key: name,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    isComposing: false,
    keyCode: 0,
  }) as KeyboardEvent;

describe('suggestion closing reasons (uwg-te-tab-reasons r13, uwg-te-req-inline-2)', () => {
  it('classifies a closing by the gate, then by the input that left the trigger context', () => {
    const none = { edited: false, keyed: false };
    const both = { edited: true, keyed: true };
    expect(suggestionCloseReason({ ...OPEN_GATE, disabled: true, focused: false }, both)).toBe(
      'disabled',
    );
    expect(suggestionCloseReason({ ...OPEN_GATE, editable: false }, both)).toBe('programmatic');
    expect(suggestionCloseReason({ ...OPEN_GATE, ready: false }, both)).toBe('programmatic');
    expect(suggestionCloseReason({ ...OPEN_GATE, focused: false }, both)).toBe('focus-outside');
    expect(suggestionCloseReason(OPEN_GATE, both)).toBe('input');
    expect(suggestionCloseReason(OPEN_GATE, { edited: false, keyed: true })).toBe('keyboard');
    expect(suggestionCloseReason(OPEN_GATE, { ...none, pressed: true })).toBe('pointer');
    // A caret that neither an edit, a key nor a press moved: a selection a run set.
    expect(suggestionCloseReason(OPEN_GATE, none)).toBe('imperative-action');
    expect(suggestionInputReason({ edited: true, keyed: false })).toBe('input');
    // An edit carries the reason of its change: a paste, a drop, an undo by key, menu or run.
    for (const edit of ['input-paste', 'drag', 'hotkey', 'engine', 'imperative-action'] as const)
      expect(suggestionInputReason({ edited: true, keyed: true, edit })).toBe(edit);
  });

  it('records Escape as escape-key and keeps the occurrence dismissed while typing more', () => {
    const { view, publish, open } = laneFixture();
    open();
    expect(view.forwardKey(key('Escape'))).toBe(true);
    expect(view.lane).toEqual({ open: false, reason: 'escape-key' });
    publish('@ad', true);
    expect(view.isOpen).toBe(false);
    expect(view.lane).toEqual({ open: false, reason: 'escape-key' });
  });

  it('records whitespace or an edit as input, a key as keyboard and a press as pointer', () => {
    const { view, publish, open } = laneFixture();
    open();
    publish('@a ', true);
    expect(view.lane).toEqual({ open: false, reason: 'input' });
    open();
    // ArrowLeft reaches the engine, which moves the caret before the trigger.
    expect(view.forwardKey(key('ArrowLeft'))).toBe(false);
    publish('', false);
    expect(view.lane).toEqual({ open: false, reason: 'keyboard' });
    open();
    // A press in the editing root moves the caret out of the trigger context.
    view.pressed();
    publish('', false);
    expect(view.lane).toEqual({ open: false, reason: 'pointer' });
  });

  it('records the cause of an edit, reports each lane change and opens with its reason', () => {
    let edit: string | null = 'input-paste';
    const lanes: unknown[] = [];
    const openings: unknown[] = [];
    const { view, publish } = laneFixture({
      editReason: () => edit as never,
      lane: (lane) => lanes.push(lane),
      opening: (reason) => openings.push(reason),
    });
    publish('', true);
    // A paste of "@a" opens the list with input-paste and closes the other surfaces with it.
    publish('@a', true);
    expect(view.lane).toEqual({ open: true, reason: 'input-paste' });
    expect(openings).toEqual(['input-paste']);
    // An undo by Mod+Z that removes the trigger closes it with hotkey.
    edit = 'hotkey';
    publish('', true);
    expect(view.lane).toEqual({ open: false, reason: 'hotkey' });
    expect(lanes).toEqual([
      { open: true, reason: 'input-paste' },
      { open: false, reason: 'hotkey' },
    ]);
    // Another surface opening closes the list with the reason that opens it.
    edit = 'input';
    publish('@a', true);
    view.close(true, 'hotkey');
    expect(view.lane).toEqual({ open: false, reason: 'hotkey' });
  });

  it("records the list's outside-press and focus-outside proposals", () => {
    const { view, open } = laneFixture();
    for (const reason of ['outside-press', 'focus-outside'] as const) {
      open();
      const onOpenChange = listBinding(view, 'onOpenChange') as (
        event: TpSurfaceOpenChangeEvent,
      ) => void;
      onOpenChange({ detail: { value: false, reason } } as TpSurfaceOpenChangeEvent);
      expect(view.isOpen).toBe(false);
      expect(view.lane).toEqual({ open: false, reason });
    }
  });

  it('records focus leaving, disabled, read-only and a remount on a state publication', () => {
    const { view, publish, open } = laneFixture();
    const cases: [Partial<TextEditorSuggestionGate>, string][] = [
      [{ focused: false }, 'focus-outside'],
      [{ disabled: true, focused: false }, 'disabled'],
      [{ editable: false }, 'programmatic'],
      [{ ready: false }, 'programmatic'],
    ];
    for (const [closed, reason] of cases) {
      open();
      publish('@a', false, closed);
      expect(view.isOpen).toBe(false);
      expect(view.lane).toEqual({ open: false, reason });
    }
    // A disconnection closes a shown list programmatically.
    open();
    view.release();
    expect(view.lane).toEqual({ open: false, reason: 'programmatic' });
  });
});

/** An element in the widget's shadow root that holds the announcer's regions. */
class FakeNode {
  readonly nodeType = 1;
  readonly attributes = new Map<string, string>();
  readonly style = { setProperty: () => undefined };
  readonly children: FakeNode[] = [];
  parentNode: FakeNode | null = null;
  textContent = '';
  constructor(readonly ownerDocument: unknown) {}
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
  append(child: FakeNode): void {
    child.remove();
    child.parentNode = this;
    this.children.push(child);
  }
  remove(): void {
    this.parentNode?.children.splice(this.parentNode.children.indexOf(this), 1);
    this.parentNode = null;
  }
}

function fakeRoot(): FakeNode {
  const document = {
    nodeType: 9,
    defaultView: {
      setTimeout: (callback: () => void, delay: number) => globalThis.setTimeout(callback, delay),
      clearTimeout: (id: number) => globalThis.clearTimeout(id),
    },
    createElement: () => new FakeNode(document),
  };
  return new FakeNode(document);
}

/** An option of the list as the view reads it. */
function fakeOption(label: string, description: string | null = null, hidden = false) {
  return {
    hidden,
    textContent: label,
    dataset: {} as Record<string, string | undefined>,
    getAttribute: (name: string) =>
      name === 'aria-label' ? label : name === 'aria-description' ? description : null,
  };
}

describe('suggestion announcements without a list reference (uwg-te-req-a11y-3)', () => {
  it('V-496: announces label, description and position through the widget announcer, writing no reference', async () => {
    vi.useFakeTimers();
    const root = fakeRoot();
    const announcer = new TextEditorAnnouncer(() => root as unknown as Element);
    const announced: unknown[][] = [];
    const references: (string | null)[] = [];
    const { view, open } = laneFixture({
      referenceList: (id) => void references.push(id),
      announce: (message, options) => {
        announced.push([message, options]);
        announcer.announce(message, options);
      },
    });
    open();
    const options = [
      fakeOption('Ada Park'),
      fakeOption('Bo Lindqvist', 'Release manager'),
      fakeOption('Filtered out', null, true),
      fakeOption('Cyd Moreau'),
    ];
    const list = {
      updateComplete: Promise.resolve(),
      updatePosition: () => Promise.resolve(),
      // The host environment resolves no reference into the list.
      activeDescendantReference: () => null,
      highlightedValue: undefined as unknown,
      listElement: { querySelectorAll: () => options },
    };
    view.updated({ querySelector: () => list } as unknown as ShadowRoot);
    await Promise.resolve();
    const onActiveChange = listBinding(view, 'onActiveChange') as (value: unknown) => unknown;
    const highlight = async (index: number, value: unknown) => {
      options.forEach(
        (option, at) => (option.dataset['highlighted'] = at === index ? '' : undefined),
      );
      list.highlightedValue = value;
      onActiveChange(value);
      await Promise.resolve();
      await Promise.resolve();
    };
    await highlight(0, 'ada');
    await highlight(1, 'bo');
    // The same highlight again is no new highlight.
    await highlight(1, 'bo');
    expect(announced).toEqual([
      ['Ada Park, 1 of 3', SUGGESTION_ANNOUNCEMENT],
      ['Bo Lindqvist, Release manager, 2 of 3', SUGGESTION_ANNOUNCEMENT],
    ]);
    expect(SUGGESTION_ANNOUNCEMENT).toEqual({ politeness: 'polite', key: 'suggestion' });
    expect(references.filter((id) => id !== null)).toEqual([]);
    // One polite region inside the widget's root; the newer keyed message replaced the pending one.
    expect(root.children).toHaveLength(1);
    const region = root.children[0]!;
    expect(Object.fromEntries(region.attributes)).toMatchObject({
      'data-tp-live-region': 'polite',
      role: 'status',
      'aria-live': 'polite',
    });
    vi.advanceTimersByTime(ANNOUNCEMENT_REGION_SETTLE_DELAY);
    expect(region.textContent).toBe('Bo Lindqvist, Release manager, 2 of 3');
    // Disconnection releases the announcer: the region is removed.
    announcer.release();
    expect(root.children).toEqual([]);
    expect(region.parentNode).toBeNull();
  });

  it('V-521: announces the new highlight once the list has rendered it, never the previous one', async () => {
    const announced: string[] = [];
    const { view, open } = laneFixture({
      referenceList: () => undefined,
      announce: (message) => void announced.push(message),
    });
    open();
    const options = [fakeOption('Paragraph'), fakeOption('Heading 1'), fakeOption('Heading 2')];
    let render: () => void = () => undefined;
    const list = {
      updateComplete: Promise.resolve(),
      updatePosition: () => Promise.resolve(),
      activeDescendantReference: () => null,
      highlightedValue: undefined as unknown,
      listElement: { querySelectorAll: () => options },
    };
    const paint = (index: number) =>
      options.forEach(
        (option, at) => (option.dataset['highlighted'] = at === index ? '' : undefined),
      );
    paint(0);
    view.updated({ querySelector: () => list } as unknown as ShadowRoot);
    await Promise.resolve();
    const onActiveChange = listBinding(view, 'onActiveChange') as (value: unknown) => unknown;
    // The list calls the proposal before it commits the highlight and renders it in a later update.
    const arrowDown = async (index: number, value: string) => {
      list.highlightedValue = value;
      list.updateComplete = new Promise<void>((resolve) => (render = resolve));
      onActiveChange(value);
      paint(index);
      render();
      for (let tick = 0; tick < 4; tick++) await Promise.resolve();
    };
    await arrowDown(1, 'heading-1');
    await arrowDown(2, 'heading-2');
    expect(announced).toEqual(['Paragraph, 1 of 3', 'Heading 1, 2 of 3', 'Heading 2, 3 of 3']);
  });
});
