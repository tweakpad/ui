import { describe, expect, it } from 'vitest';
import type { TextEditorPortableInline } from '../../content/portable.js';
import type { TextEditorEngineState } from '../../model.js';
import { deepFreeze } from '../../../freeze.js';
import { TOGGLE_MARKS } from '../../actions.js';
import { MARKS_OFF, NO_SELECTION, preReadyState } from '../../state.js';
import {
  alignOf,
  blockKindKeys,
  caretTextBefore,
  commonAlign,
  markState,
  selectionAlign,
  TEXT_BEFORE_LIMIT,
} from './state.js';
import type { TextEditorPortableBlock } from '../../content/portable.js';

const OFF = {
  bold: 'off',
  italic: 'off',
  underline: 'off',
  strike: 'off',
  code: 'off',
  superscript: 'off',
  subscript: 'off',
  textColor: null,
  highlight: null,
};

describe('mark state (uwg-te-req-engine-4)', () => {
  it('turns every mark off and sets no color without selected text', () => {
    const marks = markState([]);
    expect(marks).toEqual(OFF);
    expect(Object.isFrozen(marks)).toBe(true);
  });

  it('reports a caret from the marks that typed text takes', () => {
    expect(markState([{ bold: true, code: true, textColor: 'blue' }])).toEqual({
      ...OFF,
      bold: 'on',
      code: 'on',
      textColor: 'blue',
    });
    expect(markState([null])).toEqual(OFF);
  });

  it('is on for every run, mixed for some and off for none', () => {
    const marks = markState([
      { bold: true, italic: true, superscript: true, link: 'https://example.com' },
      { bold: true, underline: true },
      { bold: true, strike: true, subscript: true },
      undefined,
    ]);
    expect(marks).toEqual({
      ...OFF,
      bold: 'mixed',
      italic: 'mixed',
      underline: 'mixed',
      strike: 'mixed',
      superscript: 'mixed',
      subscript: 'mixed',
    });
    expect(markState([{ italic: true }, { italic: true }]).italic).toBe('on');
  });

  it('gives a color shared by every run, mixed when they differ or some have none', () => {
    expect(markState([{ textColor: 'green' }, { textColor: 'green', bold: true }]).textColor).toBe(
      'green',
    );
    expect(markState([{ textColor: 'green' }, {}]).textColor).toBe('mixed');
    expect(markState([{ highlight: 'yellow' }, { highlight: 'red' }]).highlight).toBe('mixed');
    expect(markState([{}, {}]).highlight).toBeNull();
  });
});

describe('uwg-te-req-engine-4, uwg-te-req-prop-2: the states without a selection or marks', () => {
  it('are one frozen marks-off state and one frozen no-selection value, shared with the store', () => {
    expect(markState([])).toBe(MARKS_OFF);
    expect(MARKS_OFF).toEqual(OFF);
    expect(Object.keys(MARKS_OFF)).toEqual([...TOGGLE_MARKS, 'textColor', 'highlight']);
    expect(Object.isFrozen(MARKS_OFF) && Object.isFrozen(NO_SELECTION)).toBe(true);
    const state = preReadyState({ editable: true, empty: true });
    expect(state.marks).toBe(MARKS_OFF);
    expect(state.selection).toBe(NO_SELECTION);
  });
});

describe('common alignment (uwg-te-req-engine-4)', () => {
  it('reports the alignment every textblock shares, mixed, or null for the default', () => {
    expect(commonAlign([])).toBeNull();
    expect(commonAlign([null, 'start', undefined])).toBeNull();
    expect(commonAlign(['center', 'center'])).toBe('center');
    expect(commonAlign(['justify'])).toBe('justify');
    expect(commonAlign(['center', null])).toBe('mixed');
    expect(commonAlign(['start', 'end'])).toBe('mixed');
  });
});

describe('text before the caret (uwg-te-req-engine-4)', () => {
  it('writes a hard break as a line feed and an inline node as U+FFFC', () => {
    const units: TextEditorPortableInline[] = [
      { type: 'text', text: 'Ask ', marks: { bold: true } },
      { type: 'custom', name: 'mention', attrs: { label: 'Ana' } },
      { type: 'hard-break' },
      { type: 'text', text: 'now' },
    ];
    expect(caretTextBefore(units)).toBe('Ask ￼\nnow');
    expect(caretTextBefore([])).toBe('');
  });

  it('keeps at most the last 64 UTF-16 code units, or every unit for the input rules', () => {
    expect(TEXT_BEFORE_LIMIT).toBe(64);
    const long = 'x'.repeat(66) + 'ab';
    expect(caretTextBefore([{ type: 'text', text: long }])).toBe(long.slice(-64));
    expect(caretTextBefore([{ type: 'text', text: long }]).length).toBe(64);
    expect(caretTextBefore([{ type: 'text', text: long }], Infinity)).toBe(long);
    expect(caretTextBefore([{ type: 'text', text: 'abc' }], 0)).toBe('');
    expect(caretTextBefore([{ type: 'text', text: '😀ab' }], 3)).toBe('\uDE00ab');
  });
});

describe('block kinds and the frozen state (uwg-te-req-engine-4, uwg-te-tab-engine r3)', () => {
  it('lists the distinct kinds in document order, a heading by its level', () => {
    const keys = blockKindKeys([
      { kind: 'heading', attrs: { level: 2 } },
      { kind: 'paragraph', attrs: { align: null } },
      { kind: 'heading', attrs: { level: 2 } },
      { kind: 'heading', attrs: { level: 3 } },
      { kind: 'callout', attrs: { tone: 'note' } },
    ]);
    expect(keys).toEqual(['heading:2', 'paragraph', 'heading:3', 'callout']);
    expect(Object.isFrozen(keys)).toBe(true);
    expect(blockKindKeys([])).toEqual([]);
  });

  it('deep-freezes a built state in place, keeping its frozen parts', () => {
    const marks = markState([{ bold: true }]);
    const base = preReadyState({ editable: true, empty: false });
    const state: TextEditorEngineState = {
      ...base,
      version: 3,
      marks,
      selection: {
        kind: 'text',
        anchor: { block: 'p1', offset: 0 },
        head: { block: 'p1', offset: 2 },
        empty: false,
      },
      blockKinds: ['paragraph'],
      block: { id: 'p1', kind: 'paragraph', attrs: { align: null }, depth: 0 },
    };
    expect(deepFreeze(state)).toBe(state);
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.selection)).toBe(true);
    expect(state.selection.kind === 'text' && Object.isFrozen(state.selection.anchor)).toBe(true);
    expect(Object.isFrozen(state.blockKinds)).toBe(true);
    expect(Object.isFrozen(state.block?.attrs)).toBe(true);
    expect(state.marks).toBe(marks);
    expect(state.history).toBe(base.history);
  });
});

describe('uwg-te-req-engine-4: the common alignment of the selection', () => {
  const blocks: TextEditorPortableBlock[] = [
    { type: 'paragraph', id: 'p1', align: 'center', content: [] },
    { type: 'code', id: 'k1', text: 'x' },
    { type: 'heading', id: 'h1', level: 2, align: 'center', content: [] },
    { type: 'list-task', id: 'l1', checked: false, content: [], children: [] },
    { type: 'divider', id: 'd1' },
    { type: 'custom', id: 'c1', name: 'note', attrs: {}, content: [] },
  ];

  it('alignOf leaves out code blocks, atoms and tables', () => {
    expect(blocks.map(alignOf)).toEqual(['center', undefined, 'center', null, undefined, null]);
    expect(alignOf({ type: 'quote', id: 'q1', align: 'start', content: [] })).toBeNull();
  });

  it('state.align over the spanned blocks; null in table cells and cell ranges', () => {
    const point = { block: 'p1', offset: 0 };
    const text = { kind: 'text' as const, anchor: point, head: point, empty: true };
    expect(selectionAlign(text, blocks.slice(0, 3))).toBe('center');
    expect(selectionAlign(text, blocks.slice(0, 4))).toBe('mixed');
    expect(selectionAlign(text, [blocks[1]!])).toBeNull();
    const cell = { block: 't1', cell: { row: 0, column: 0, paragraph: 0 }, offset: 0 };
    expect(
      selectionAlign({ kind: 'text', anchor: cell, head: cell, empty: true }, blocks.slice(0, 1)),
    ).toBeNull();
    expect(
      selectionAlign(
        { kind: 'cells', table: 't1', range: { anchor: cell.cell, head: cell.cell } },
        blocks.slice(0, 1),
      ),
    ).toBeNull();
    expect(selectionAlign({ kind: 'none' }, blocks)).toBeNull();
    expect(selectionAlign({ kind: 'blocks', ids: ['p1', 'h1'] }, [blocks[0]!, blocks[2]!])).toBe(
      'center',
    );
  });
});
