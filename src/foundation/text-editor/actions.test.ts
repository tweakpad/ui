import { describe, expect, it } from 'vitest';
import {
  ACTION_CAPABILITIES,
  actionCapabilities,
  actionKey,
  assertTextEditorFormat,
  combinesHistory,
  isMutatingAction,
  isSelectionOnly,
  isValidTextEditorAction,
  storedAlign,
  TOGGLE_MARKS,
  unknownFormatError,
  type TextEditorAction,
  type TextEditorActionOf,
  type TextEditorActionType,
  type TextEditorBlockKindLookup,
} from './actions.js';
import type { TextEditorCapability } from './capabilities.js';
import type { TextEditorBlockKind, TextEditorToggleMark } from './model.js';

/** The action types of `uwg-te-tab-actions`, row by row. */
const SPEC_TYPES = [
  // r1 marks and links
  'mark.toggle',
  'mark.color',
  'mark.clear',
  'link.set',
  'link.unset',
  // r2 block attributes
  'block.set-type',
  'block.set-attrs',
  'block.align',
  'block.indent',
  'block.outdent',
  // r3 blocks
  'blocks.insert',
  'blocks.move',
  'blocks.duplicate',
  'blocks.delete',
  // r4 text and inline
  'text.insert',
  'text.delete',
  'inline.insert',
  // r5 content
  'content.insert',
  'content.set',
  // r6 selection and history
  'selection.set',
  'history.undo',
  'history.redo',
  // r7 tables
  'table.insert-row',
  'table.insert-column',
  'table.delete-rows',
  'table.delete-columns',
  'table.move-row',
  'table.move-column',
  'table.duplicate-row',
  'table.duplicate-column',
  'table.merge-cells',
  'table.split-cell',
  'table.set-header',
  'table.align',
  'table.background',
  'table.column-widths',
  'table.clear-cells',
];

const point = { block: 'p1', offset: 2 };
const range = { block: 'p1', from: 0, to: 4 };
const cells = { anchor: { row: 0, column: 0 }, head: { row: 1, column: 1 } };

/** One valid action of each type. */
const SAMPLES: { readonly [T in TextEditorActionType]: TextEditorActionOf<T> } = {
  'mark.toggle': { type: 'mark.toggle', mark: 'bold' },
  'mark.color': { type: 'mark.color', mark: 'highlight', color: 'yellow' },
  'mark.clear': { type: 'mark.clear' },
  'link.set': { type: 'link.set', href: 'https://example.org/notes', text: 'notes', range },
  'link.unset': { type: 'link.unset' },
  'block.set-type': { type: 'block.set-type', kind: 'heading', attrs: { level: 2 }, toggle: true },
  'block.set-attrs': { type: 'block.set-attrs', id: 'task1', attrs: { checked: true } },
  'block.align': { type: 'block.align', align: 'center', ids: ['p1'] },
  'block.indent': { type: 'block.indent' },
  'block.outdent': { type: 'block.outdent', ids: ['task1'] },
  'blocks.insert': {
    type: 'blocks.insert',
    kind: 'table',
    attrs: { rows: 3, columns: 3, headerRow: true, headerColumn: false },
    at: { after: 'p1' },
    select: 'start',
  },
  'blocks.move': { type: 'blocks.move', ids: ['p1', 'p2'], to: { parent: null, index: 3 } },
  'blocks.duplicate': { type: 'blocks.duplicate', ids: ['p1'] },
  'blocks.delete': { type: 'blocks.delete', ids: ['p1'] },
  'text.insert': { type: 'text.insert', text: 'Harbor' },
  'text.delete': { type: 'text.delete', range },
  'inline.insert': {
    type: 'inline.insert',
    kind: 'mention',
    attrs: { id: 'u7', label: 'Ines' },
    range,
  },
  'content.insert': {
    type: 'content.insert',
    content: {
      kind: 'range',
      blocks: [{ type: 'paragraph', content: [{ type: 'text', text: 'Tide table' }] }],
    },
    at: { kind: 'text', anchor: point },
  },
  'content.set': {
    type: 'content.set',
    content: '# Ferry log',
    format: 'markdown',
    history: 'push',
  },
  'selection.set': { type: 'selection.set', selection: { kind: 'blocks', ids: ['p1'] } },
  'history.undo': { type: 'history.undo' },
  'history.redo': { type: 'history.redo' },
  'table.insert-row': { type: 'table.insert-row', table: 't1', index: 2, select: true },
  'table.insert-column': { type: 'table.insert-column', table: 't1', index: 0 },
  'table.delete-rows': { type: 'table.delete-rows', table: 't1', from: 1, to: 2 },
  'table.delete-columns': { type: 'table.delete-columns', table: 't1', from: 0, to: 0 },
  'table.move-row': { type: 'table.move-row', table: 't1', from: 2, to: 0 },
  'table.move-column': { type: 'table.move-column', table: 't1', from: 0, to: 1 },
  'table.duplicate-row': { type: 'table.duplicate-row', table: 't1', index: 1 },
  'table.duplicate-column': { type: 'table.duplicate-column', table: 't1', index: 1 },
  'table.merge-cells': { type: 'table.merge-cells', table: 't1', range: cells },
  'table.split-cell': { type: 'table.split-cell', table: 't1', cell: { row: 0, column: 0 } },
  'table.set-header': { type: 'table.set-header', table: 't1', row: true, column: false },
  'table.align': { type: 'table.align', table: 't1', target: { column: 1 }, align: 'end' },
  'table.background': {
    type: 'table.background',
    table: 't1',
    target: { range: cells },
    color: 'blue',
  },
  'table.column-widths': { type: 'table.column-widths', table: 't1', widths: [120, 96, 48] },
  'table.clear-cells': { type: 'table.clear-cells', table: 't1', range: cells },
};

/** The capabilities of the samples, as the Capability column of `uwg-te-tab-actions` gives them. */
const EXPECTED: { readonly [T in TextEditorActionType]: readonly TextEditorCapability[] } = {
  'mark.toggle': ['mark.bold'],
  'mark.color': ['mark.highlight'],
  'mark.clear': ['mark.clear'],
  'link.set': ['link'],
  'link.unset': ['link'],
  'block.set-type': ['block.heading'],
  'block.set-attrs': ['block.list-task'],
  'block.align': ['align'],
  'block.indent': ['blocks.nest'],
  'block.outdent': ['blocks.nest'],
  'blocks.insert': ['block.table'],
  'blocks.move': ['blocks.move'],
  'blocks.duplicate': ['blocks.move'],
  'blocks.delete': ['blocks.select'],
  'text.insert': [],
  'text.delete': [],
  'inline.insert': ['inline.mention'],
  'content.insert': [],
  'content.set': ['format.markdown'],
  'selection.set': ['blocks.select'],
  'history.undo': ['history'],
  'history.redo': ['history'],
  'table.insert-row': ['block.table'],
  'table.insert-column': ['block.table'],
  'table.delete-rows': ['block.table'],
  'table.delete-columns': ['block.table'],
  'table.move-row': ['block.table', 'table.move'],
  'table.move-column': ['block.table', 'table.move'],
  'table.duplicate-row': ['block.table'],
  'table.duplicate-column': ['block.table'],
  'table.merge-cells': ['block.table', 'table.merge'],
  'table.split-cell': ['block.table', 'table.merge'],
  'table.set-header': ['block.table'],
  'table.align': ['block.table'],
  'table.background': ['block.table'],
  'table.column-widths': ['block.table'],
  'table.clear-cells': ['block.table'],
};

const KINDS: Readonly<Record<string, TextEditorBlockKind>> = {
  p1: 'paragraph',
  task1: 'list-task',
  photo: 'image',
  aside1: 'callout',
  t1: 'table',
};
const kindOf: TextEditorBlockKindLookup = (id) => KINDS[id] ?? null;
const samples = Object.values(SAMPLES) as TextEditorAction[];

describe('actions (uwg-te-tab-actions, uwg-te-par-engine-2)', () => {
  it('V-038: maps each of the 37 action types to its capability', () => {
    expect(SPEC_TYPES).toHaveLength(37);
    expect(Object.keys(ACTION_CAPABILITIES)).toEqual(SPEC_TYPES);
    expect(Object.keys(SAMPLES)).toEqual(SPEC_TYPES);
    for (const type of SPEC_TYPES as TextEditorActionType[])
      expect(actionCapabilities(SAMPLES[type], kindOf), type).toEqual(EXPECTED[type]);
  });

  it('V-038: maps marks, kinds, formats and selections to their own capabilities', () => {
    const toggles: TextEditorToggleMark[] = [
      'bold',
      'italic',
      'underline',
      'strike',
      'code',
      'superscript',
      'subscript',
    ];
    for (const mark of toggles)
      expect(actionCapabilities({ type: 'mark.toggle', mark }, kindOf)).toEqual([`mark.${mark}`]);
    expect(
      actionCapabilities({ type: 'mark.color', mark: 'text-color', color: null }, kindOf),
    ).toEqual(['mark.text-color']);

    for (const kind of ['paragraph', 'quote', 'code', 'list-bullet', 'list-ordered', 'list-task'])
      expect(actionCapabilities({ type: 'block.set-type', kind }, kindOf)).toEqual([
        `block.${kind}`,
      ]);
    expect(actionCapabilities({ type: 'block.set-type', kind: 'callout' }, kindOf)).toEqual([
      'block.callout',
    ]);
    expect(actionCapabilities({ type: 'blocks.insert', kind: 'divider' }, kindOf)).toEqual([
      'block.divider',
    ]);
    expect(actionCapabilities({ type: 'blocks.insert', kind: 'embed' }, kindOf)).toEqual([
      'block.embed',
    ]);

    // block.set-attrs takes the capability of the kind of the block it changes.
    const setAttrs = (id: string): TextEditorAction => ({ type: 'block.set-attrs', id, attrs: {} });
    expect(actionCapabilities(setAttrs('photo'), kindOf)).toEqual(['block.image']);
    expect(actionCapabilities(setAttrs('aside1'), kindOf)).toEqual(['block.callout']);
    expect(actionCapabilities(setAttrs('t1'), kindOf)).toEqual(['block.table']);
    expect(actionCapabilities(setAttrs('missing'), kindOf)).toEqual([]);

    for (const format of ['html', 'markdown', 'text', 'json'] as const)
      expect(
        actionCapabilities({ type: 'content.set', content: '', format, history: 'reset' }, kindOf),
      ).toEqual([`format.${format}`]);

    // selection.set takes the capability of its kind of selection.
    const select = (selection: TextEditorActionOf<'selection.set'>['selection']) =>
      actionCapabilities({ type: 'selection.set', selection }, kindOf);
    expect(select({ kind: 'text', anchor: point, head: { block: 'p1', offset: 4 } })).toEqual([]);
    expect(select({ kind: 'caret', block: 'p1', position: 'end' })).toEqual([]);
    expect(select({ kind: 'blocks', ids: ['p1'] })).toEqual(['blocks.select']);
    expect(select({ kind: 'cells', table: 't1', range: cells })).toEqual(['block.table']);
    // Clearing the selection takes none and is a valid selection-only action.
    expect(select({ kind: 'none' })).toEqual([]);
    const clear = { type: 'selection.set', selection: { kind: 'none' } } as const;
    expect(isValidTextEditorAction(clear)).toBe(true);
    expect(isSelectionOnly([clear])).toBe(true);
  });

  it('V-038: isMutatingAction is false only for selection.set', () => {
    const preserving = samples.filter((action) => !isMutatingAction(action)).map((a) => a.type);
    expect(preserving).toEqual(['selection.set']);
    expect(
      isMutatingAction({
        type: 'selection.set',
        selection: { kind: 'caret', block: 'p1', position: 'start' },
      }),
    ).toBe(false);
  });

  it('classifies selection-only lists and lists that combine history', () => {
    const select = SAMPLES['selection.set'];
    const bold = SAMPLES['mark.toggle'];
    expect(isSelectionOnly([])).toBe(false);
    expect(isSelectionOnly([select])).toBe(true);
    expect(isSelectionOnly([select, select])).toBe(true);
    expect(isSelectionOnly([select, bold])).toBe(false);

    expect(combinesHistory([SAMPLES['history.undo']])).toBe(false);
    expect(combinesHistory([SAMPLES['history.redo']])).toBe(false);
    expect(combinesHistory([SAMPLES['history.undo'], bold])).toBe(true);
    expect(combinesHistory([bold, SAMPLES['history.redo']])).toBe(true);
    expect(combinesHistory([SAMPLES['history.undo'], SAMPLES['history.undo']])).toBe(true);
    expect(combinesHistory([bold, select])).toBe(false);
    expect(combinesHistory([])).toBe(false);
  });

  it('V-038: accepts every well-formed action', () => {
    for (const action of samples) expect(isValidTextEditorAction(action), action.type).toBe(true);
    const valid: unknown[] = [
      { type: 'mark.color', mark: 'text-color', color: null },
      { type: 'mark.clear', note: 'a member it does not know' },
      { type: 'link.set', href: '/docs' },
      {
        type: 'link.unset',
        range: { block: 't1', cell: { row: 1, column: 0, paragraph: 0 }, from: 2, to: 2 },
      },
      {
        type: 'block.set-type',
        kind: 'list-task',
        attrs: { checked: false, align: null },
        ids: ['p1'],
      },
      { type: 'block.set-type', kind: 'code', attrs: { language: 'sql' } },
      { type: 'block.set-type', kind: 'callout', attrs: { tone: 'tip', open: true, count: 2 } },
      { type: 'block.align', align: null },
      { type: 'block.align', align: 'start' },
      { type: 'block.set-attrs', id: 'photo', attrs: { src: 'boat.png', alt: '', width: null } },
      {
        type: 'blocks.insert',
        kind: 'image',
        attrs: { src: 'boat.png', alt: 'A ferry', width: 320 },
      },
      {
        type: 'blocks.insert',
        kind: 'list-ordered',
        attrs: { start: 4 },
        at: { parent: 'item1', index: 0 },
      },
      { type: 'blocks.insert', kind: 'paragraph', at: { replace: 'p2' }, select: 'none' },
      { type: 'blocks.insert', kind: 'divider', at: { before: 'p1' }, select: 'block' },
      { type: 'blocks.move', ids: ['item3'], to: { parent: 'item1', index: 0 } },
      { type: 'text.insert', text: '', range },
      { type: 'inline.insert', kind: 'mention', attrs: {} },
      {
        type: 'content.insert',
        content: { kind: 'blocks', blocks: [] },
        at: { kind: 'cells', table: 't1', range: cells },
      },
      {
        type: 'content.insert',
        content: { kind: 'blocks', blocks: [{ type: 'divider' }] },
        at: { kind: 'caret', block: 'p1', position: 'end' },
      },
      {
        type: 'content.set',
        content: { type: 'doc', content: [] },
        format: 'json',
        history: 'reset',
      },
      { type: 'content.set', content: '{"root":{}}', format: 'json', history: 'reset' },
      { type: 'content.set', content: '', format: 'text', history: 'push' },
      {
        type: 'selection.set',
        selection: { kind: 'text', anchor: point, head: { block: 'p2', offset: 0 } },
      },
      {
        type: 'selection.set',
        selection: { kind: 'caret', block: 't1', cell: { row: 1, column: 2 }, position: 'start' },
      },
      { type: 'selection.set', selection: { kind: 'cells', table: 't1', range: cells } },
      { type: 'table.set-header', table: 't1' },
      { type: 'table.align', table: 't1', target: { all: true }, align: null },
      { type: 'table.align', table: 't1', target: { row: 0 }, align: 'justify' },
      { type: 'table.background', table: 't1', target: { column: 2 }, color: null },
      { type: 'table.column-widths', table: 't1', widths: null },
      Object.freeze({ type: 'history.undo' }),
    ];
    for (const action of valid)
      expect(isValidTextEditorAction(action), JSON.stringify(action)).toBe(true);
  });

  it('V-038: rejects unknown types and malformed payloads', () => {
    const malformed: readonly (readonly [string, unknown])[] = [
      ['an unknown type', { type: 'mark.blink' }],
      [
        'an action the spec does not define',
        { type: 'table.sticky-header', table: 't1', sticky: true },
      ],
      ['no type', { mark: 'bold' }],
      ['a type that is no string', { type: 7 }],
      ['a type inherited from the prototype', { type: 'toString' }],
      ['an unknown mark', { type: 'mark.toggle', mark: 'blink' }],
      ['a color mark toggled', { type: 'mark.toggle', mark: 'highlight' }],
      ['a color outside the palette', { type: 'mark.color', mark: 'text-color', color: 'teal' }],
      [
        'the default choice as a color',
        { type: 'mark.color', mark: 'highlight', color: 'default' },
      ],
      ['a channel that is no color mark', { type: 'mark.color', mark: 'background', color: 'red' }],
      ['a link without href', { type: 'link.set', text: 'Harbor' }],
      ['an empty href', { type: 'link.set', href: '' }],
      ['a backward range', { type: 'link.unset', range: { block: 'p1', from: 4, to: 1 } }],
      ['a negative offset', { type: 'text.delete', range: { block: 'p1', from: -1, to: 1 } }],
      ['a fractional offset', { type: 'text.delete', range: { block: 'p1', from: 0.5, to: 1 } }],
      ['a range without block', { type: 'text.delete', range: { from: 0, to: 1 } }],
      ['no range to delete', { type: 'text.delete' }],
      [
        'a cell point without paragraph',
        {
          type: 'text.delete',
          range: { block: 't1', cell: { row: 0, column: 0 }, from: 0, to: 1 },
        },
      ],
      ['a heading without level', { type: 'block.set-type', kind: 'heading' }],
      [
        'a heading level out of range',
        { type: 'blocks.insert', kind: 'heading', attrs: { level: 7 } },
      ],
      ['text turned into a table', { type: 'block.set-type', kind: 'table' }],
      [
        'text turned into an image',
        { type: 'block.set-type', kind: 'image', attrs: { src: 'a.png' } },
      ],
      ['text turned into a divider', { type: 'block.set-type', kind: 'divider' }],
      ['an empty kind', { type: 'blocks.insert', kind: '' }],
      ['an image without source', { type: 'blocks.insert', kind: 'image', attrs: { alt: 'Map' } }],
      [
        'an image of no width',
        { type: 'blocks.insert', kind: 'image', attrs: { src: 'a.png', width: 0 } },
      ],
      ['a table without columns', { type: 'blocks.insert', kind: 'table', attrs: { rows: 2 } }],
      [
        'a table of no rows',
        { type: 'blocks.insert', kind: 'table', attrs: { rows: 0, columns: 2 } },
      ],
      ['a physical alignment', { type: 'block.align', align: 'left' }],
      [
        'an alignment attribute out of its domain',
        { type: 'block.set-type', kind: 'paragraph', attrs: { align: 'right' } },
      ],
      [
        'a task state that is no boolean',
        { type: 'block.set-type', kind: 'list-task', attrs: { checked: 'yes' } },
      ],
      [
        'an attribute that is no value',
        { type: 'block.set-attrs', id: 'p1', attrs: { checked: {} } },
      ],
      [
        'an attribute that is not finite',
        { type: 'block.set-attrs', id: 'p1', attrs: { width: Infinity } },
      ],
      ['attributes that are no record', { type: 'block.set-attrs', id: 'p1', attrs: ['checked'] }],
      ['no block to change', { type: 'block.set-attrs', attrs: {} }],
      ['an empty list of blocks', { type: 'blocks.delete', ids: [] }],
      ['an empty block identifier', { type: 'blocks.duplicate', ids: [''] }],
      ['an empty list of blocks to align', { type: 'block.align', align: 'end', ids: [] }],
      [
        'two insertion points',
        { type: 'blocks.insert', kind: 'divider', at: { after: 'p1', before: 'p2' } },
      ],
      [
        'an insertion point of no block',
        { type: 'blocks.insert', kind: 'divider', at: { after: '' } },
      ],
      ['a slot without index', { type: 'blocks.move', ids: ['p1'], to: { parent: null } }],
      ['a slot without parent', { type: 'blocks.move', ids: ['p1'], to: { index: 0 } }],
      [
        'an unknown selection after insertion',
        { type: 'blocks.insert', kind: 'divider', select: 'all' },
      ],
      ['text that is no string', { type: 'text.insert', text: 3 }],
      ['an inline node without attributes', { type: 'inline.insert', kind: 'mention' }],
      ['an inline node of no name', { type: 'inline.insert', kind: '', attrs: {} }],
      [
        'a fragment of an unknown kind',
        {
          type: 'content.insert',
          content: { kind: 'html', blocks: [] },
          at: { kind: 'text', anchor: point },
        },
      ],
      [
        'a fragment block without type',
        {
          type: 'content.insert',
          content: { kind: 'blocks', blocks: [{}] },
          at: { kind: 'text', anchor: point },
        },
      ],
      [
        'content inserted nowhere',
        { type: 'content.insert', content: { kind: 'blocks', blocks: [] } },
      ],
      ['an unknown format', { type: 'content.set', content: '', format: 'xml', history: 'reset' }],
      [
        'an unknown history mode',
        { type: 'content.set', content: '', format: 'html', history: 'keep' },
      ],
      ['no history mode', { type: 'content.set', content: '', format: 'html' }],
      [
        'portable content that is no string',
        { type: 'content.set', content: { type: 'doc' }, format: 'html', history: 'reset' },
      ],
      [
        'native content that is no object',
        { type: 'content.set', content: 42, format: 'json', history: 'reset' },
      ],
      ['no selection', { type: 'selection.set' }],
      ['a selection of an unknown kind', { type: 'selection.set', selection: { kind: 'all' } }],
      ['a selection of no kind', { type: 'selection.set', selection: {} }],
      [
        'a caret without position',
        { type: 'selection.set', selection: { kind: 'caret', block: 'p1' } },
      ],
      [
        'a text selection without anchor',
        { type: 'selection.set', selection: { kind: 'text', head: point } },
      ],
      [
        'a cell selection without range',
        { type: 'selection.set', selection: { kind: 'cells', table: 't1' } },
      ],
      ['a table action without table', { type: 'table.insert-row', index: 0 }],
      ['a negative row index', { type: 'table.duplicate-row', table: 't1', index: -1 }],
      ['a reversed row range', { type: 'table.delete-rows', table: 't1', from: 2, to: 1 }],
      ['a move without destination', { type: 'table.move-column', table: 't1', from: 0 }],
      ['a header flag that is no boolean', { type: 'table.set-header', table: 't1', row: 'yes' }],
      [
        'two targets',
        { type: 'table.align', table: 't1', target: { row: 0, column: 0 }, align: 'center' },
      ],
      [
        'a target of no cells',
        { type: 'table.background', table: 't1', target: { all: false }, color: 'red' },
      ],
      [
        'a merge of no range',
        { type: 'table.merge-cells', table: 't1', range: { anchor: { row: 0 } } },
      ],
      ['a split without cell', { type: 'table.split-cell', table: 't1' }],
      ['a width of zero', { type: 'table.column-widths', table: 't1', widths: [120, 0] }],
      ['no widths', { type: 'table.column-widths', table: 't1', widths: [] }],
    ];
    for (const [label, value] of malformed)
      expect(isValidTextEditorAction(value), label).toBe(false);

    for (const value of [null, undefined, 'mark.clear', 42, [], [{ type: 'mark.clear' }]])
      expect(isValidTextEditorAction(value)).toBe(false);
    const hostile = new Proxy(
      {},
      {
        get() {
          throw new Error('unreadable');
        },
      },
    );
    expect(isValidTextEditorAction(hostile)).toBe(false);
  });

  it('keys an action by its payload for the can() memo', () => {
    const keys = samples.map(actionKey);
    expect(new Set(keys).size).toBe(samples.length);
    expect(actionKey({ type: 'link.set', href: '/a', text: 'A' })).toBe(
      actionKey({ text: 'A', href: '/a', type: 'link.set' } as TextEditorAction),
    );
    expect(actionKey({ type: 'link.unset', range: undefined })).toBe(
      actionKey({ type: 'link.unset' }),
    );
    expect(actionKey({ type: 'mark.toggle', mark: 'bold' })).not.toBe(
      actionKey({ type: 'mark.toggle', mark: 'italic' }),
    );
    expect(actionKey({ type: 'blocks.delete', ids: ['a', 'b'] })).not.toBe(
      actionKey({ type: 'blocks.delete', ids: ['b', 'a'] }),
    );
    expect(actionKey({ type: 'text.insert', text: '1' })).not.toBe(
      actionKey({ type: 'text.insert', text: 1 } as unknown as TextEditorAction),
    );
    expect(actionKey(SAMPLES['content.insert'])).toBe(
      actionKey(JSON.parse(JSON.stringify(SAMPLES['content.insert'])) as TextEditorAction),
    );
  });

  it('never throws while it keys an action', () => {
    const cyclic: Record<string, unknown> = { type: 'mark.clear' };
    cyclic.self = cyclic;
    expect(typeof actionKey(cyclic as unknown as TextEditorAction)).toBe('string');
    const hostile = new Proxy(
      { type: 'mark.clear' },
      {
        get() {
          throw new Error('unreadable');
        },
      },
    ) as unknown as TextEditorAction;
    const first = actionKey(hostile);
    expect(typeof first).toBe('string');
    expect(actionKey(hostile)).not.toBe(first);
  });
});

describe('uwg-te-tab-content-model: stored alignments and the toggle marks', () => {
  it('stores center, end and justify; start, the default, and any other value store nothing', () => {
    expect(['center', 'end', 'justify'].map(storedAlign)).toEqual(['center', 'end', 'justify']);
    expect([undefined, null, 'start', 'left', 'right', 2].map(storedAlign)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('lists the seven toggle marks once, frozen, the ones mark.toggle accepts', () => {
    expect(TOGGLE_MARKS).toEqual([
      'bold',
      'italic',
      'underline',
      'strike',
      'code',
      'superscript',
      'subscript',
    ]);
    expect(Object.isFrozen(TOGGLE_MARKS)).toBe(true);
    for (const mark of TOGGLE_MARKS)
      expect(isValidTextEditorAction({ type: 'mark.toggle', mark })).toBe(true);
    expect(isValidTextEditorAction({ type: 'mark.toggle', mark: 'link' })).toBe(false);
  });
});

describe('uwg-te-req-content-1: content formats', () => {
  it('a value that names no format is a NotSupportedError naming it', () => {
    const error = unknownFormatError('rtf');
    expect(error).toMatchObject({
      name: 'NotSupportedError',
      message: '"rtf" is not a content format.',
    });
    expect(() => assertTextEditorFormat('rtf')).toThrow(error.message);
    expect(() => assertTextEditorFormat('markdown')).not.toThrow();
  });
});
