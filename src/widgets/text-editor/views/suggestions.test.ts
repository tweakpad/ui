import { describe, expect, it } from 'vitest';
import { textEditorTools } from '../../../foundation/text-editor/builtin-tools.js';
import { BASE_CAPABILITIES } from '../../../foundation/text-editor/capabilities.js';
import { defaultTextEditorLayout } from '../../../foundation/text-editor/layout.js';
import type { TextEditorEngineState } from '../../../foundation/text-editor/model.js';
import { preReadyState } from '../../../foundation/text-editor/state.js';
import {
  defineTextEditorTool,
  resolveTextEditorTools,
  type TextEditorTool,
} from '../../../foundation/text-editor/tools.js';
import {
  activeSuggestionTriggers,
  currentSuggestion,
  entryOpensSurface,
  SuggestionDismissals,
  suggestionKey,
  suggestionProposal,
} from './suggestions.js';

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

  it('forwards Up, Down, Home and End, Enter and Tab, and Escape', () => {
    expect(['ArrowUp', 'ArrowDown', 'Home', 'End'].map((name) => key({ key: name }))).toEqual([
      'navigate',
      'navigate',
      'navigate',
      'navigate',
    ]);
    expect([
      key({ key: 'Enter' }),
      key({ key: 'Tab' }),
      key({ key: 'Tab', shiftKey: true }),
    ]).toEqual(['activate', 'activate', 'activate']);
    expect(key({ key: 'Escape' })).toBe('dismiss');
    expect([
      key({ key: 'a' }),
      key({ key: 'ArrowDown', shiftKey: true }),
      key({ key: 'Enter', ctrlKey: true }),
    ]).toEqual([null, null, null]);
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
