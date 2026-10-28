import { describe, expect, it, vi } from 'vitest';
import type {
  TextEditorRequestOutcome,
  TextEditorRequestProposal,
} from '../../../foundation/text-editor/controller.js';
import type {
  TextEditorBlock,
  TextEditorBlockTree,
  TextEditorSelection,
} from '../../../foundation/text-editor/model.js';
import { textEditorStrings } from '../../../foundation/text-editor/strings.js';
import type { OverlayMeasureContext } from '../geometry.js';
import {
  blockKeyResult,
  blockRange,
  blockRangeOf,
  editCaret,
  cellRangeKeyTarget,
  printableKey,
  replaceWithTextActions,
  selectionPaintRect,
  selectionRuns,
  TextEditorBlockSelection,
  topmostBlocks,
  touchedBlocks,
  type TextEditorBlockSelectionHost,
} from './block-selection.js';

const ATOMS = new Set(['divider', 'image', 'embed', 'table']);

/**
 * A block tree from rows in document order: `[id, kind, depth]`, a row's parent being the nearest
 * earlier row one level up; a block is empty when its id ends with `-empty`.
 */
export function blockTree(
  rows: readonly (readonly [string, string, number?])[],
  attrs: Readonly<Record<string, Record<string, number>>> = {},
): TextEditorBlockTree {
  const blocks: TextEditorBlock[] = [];
  const stack: TextEditorBlock[] = [];
  const children = new Map<string | null, string[]>();
  for (const [id, kind, depth = 0] of rows) {
    stack.length = depth;
    const parent = depth > 0 ? (stack[depth - 1] ?? null) : null;
    const siblings = children.get(parent?.id ?? null) ?? [];
    children.set(parent?.id ?? null, siblings);
    const block: TextEditorBlock = {
      id,
      kind,
      attrs: attrs[id] ?? {},
      parentId: parent?.id ?? null,
      depth,
      index: siblings.length,
      children: [],
      empty: id.endsWith('-empty'),
      textblock: !ATOMS.has(kind),
    };
    siblings.push(id);
    blocks.push(block);
    stack[depth] = block;
  }
  const withChildren = blocks.map((block) => ({
    ...block,
    children: children.get(block.id) ?? [],
  }));
  const byId = new Map(withChildren.map((block) => [block.id, block]));
  return {
    version: 1,
    roots: children.get(null) ?? [],
    get: (id) => byId.get(id),
    ordered: () => withChildren,
  };
}

const doc = blockTree([
  ['p1', 'paragraph'],
  ['l1', 'list-bullet'],
  ['l1a', 'list-bullet', 1],
  ['l1b', 'list-bullet', 1],
  ['l2', 'list-bullet'],
  ['img', 'image'],
  ['hr', 'divider'],
  ['p2', 'paragraph'],
]);

const text = (anchor: string, head: string): TextEditorSelection => ({
  kind: 'text',
  anchor: { block: anchor, offset: 0 },
  head: { block: head, offset: 1 },
  empty: false,
});

describe('block selection model', () => {
  it('holds the blocks from anchor to head with the nested items of the later one', () => {
    expect(blockRange(doc, 'p1', 'l1')).toEqual(['p1', 'l1', 'l1a', 'l1b']);
    expect(blockRange(doc, 'l2', 'p1')).toEqual(['p1', 'l1', 'l1a', 'l1b', 'l2']);
    expect(blockRange(doc, 'img', 'img')).toEqual(['img']);
    expect(blockRange(doc, 'nope', 'img')).toEqual([]);
  });

  it('selects the blocks a selection touches, the table of a cell range, none without one', () => {
    expect(touchedBlocks(doc, text('p1', 'p1'))).toEqual(['p1']);
    expect(touchedBlocks(doc, text('l1a', 'l2'))).toEqual(['l1a', 'l1b', 'l2']);
    const tables = blockTree([['t', 'table']]);
    expect(
      touchedBlocks(tables, {
        kind: 'cells',
        table: 't',
        range: { anchor: { row: 0, column: 0 }, head: { row: 1, column: 1 } },
      }),
    ).toEqual(['t']);
    // A caret in a cell names the table as its block.
    expect(touchedBlocks(tables, text('t', 't'))).toEqual(['t']);
    expect(touchedBlocks(doc, { kind: 'none' })).toEqual([]);
  });

  it('keeps the topmost blocks and groups runs of adjacent blocks', () => {
    expect(topmostBlocks(doc, ['l1', 'l1a', 'l2'])).toEqual(['l1', 'l2']);
    expect(selectionRuns(doc, ['p1', 'l1', 'img', 'hr', 'p2'])).toEqual([
      ['p1', 'l1'],
      ['img', 'hr', 'p2'],
    ]);
  });

  it('Up and Down select the block before the first or after the last selected block', () => {
    const range = blockRangeOf(doc, 'l1', 'l1');
    expect(blockKeyResult(doc, range, 'up', false)).toEqual({
      kind: 'select',
      range: { anchor: 'p1', head: 'p1', ids: ['p1'] },
    });
    // After the last block together with its nested items.
    expect(blockKeyResult(doc, range, 'down', false)).toMatchObject({
      kind: 'select',
      range: { ids: ['l2'] },
    });
    expect(blockKeyResult(doc, blockRangeOf(doc, 'p1', 'p1'), 'up', false)).toEqual({
      kind: 'none',
    });
  });

  it('Shift+Up and Shift+Down extend from the anchor', () => {
    const range = blockRangeOf(doc, 'l2', 'l2');
    expect(blockKeyResult(doc, range, 'up', true)).toMatchObject({
      kind: 'select',
      range: { anchor: 'l2', head: 'l1b', ids: ['l1b', 'l2'] },
    });
    expect(blockKeyResult(doc, range, 'down', true)).toMatchObject({
      range: { anchor: 'l2', head: 'img', ids: ['l2', 'img'] },
    });
  });

  it('from one atom selects an adjacent atom, else places the caret in the nearest textblock', () => {
    expect(blockKeyResult(doc, blockRangeOf(doc, 'img', 'img'), 'down', false)).toMatchObject({
      kind: 'select',
      range: { ids: ['hr'] },
    });
    expect(blockKeyResult(doc, blockRangeOf(doc, 'img', 'img'), 'up', false)).toEqual({
      kind: 'caret',
      selection: { kind: 'caret', block: 'l2', position: 'end' },
    });
    expect(blockKeyResult(doc, blockRangeOf(doc, 'hr', 'hr'), 'down', false)).toEqual({
      kind: 'caret',
      selection: { kind: 'caret', block: 'p2', position: 'start' },
    });
  });

  it('the inline-start and inline-end arrows act before the first or after the last block', () => {
    const range = blockRangeOf(doc, 'l2', 'img');
    expect(blockKeyResult(doc, range, 'start', false)).toEqual({
      kind: 'caret',
      selection: { kind: 'caret', block: 'l1b', position: 'end' },
    });
    expect(blockKeyResult(doc, range, 'end', false)).toMatchObject({
      kind: 'select',
      range: { ids: ['hr'] },
    });
  });

  it('places the caret of a table in its last or first cell', () => {
    const tables = blockTree(
      [
        ['t', 'table'],
        ['hr', 'divider'],
        ['u', 'table'],
      ],
      { t: { rows: 2, columns: 3 } },
    );
    expect(blockKeyResult(tables, blockRangeOf(tables, 'hr', 'hr'), 'up', false)).toEqual({
      kind: 'caret',
      selection: { kind: 'caret', block: 't', cell: { row: 1, column: 2 }, position: 'end' },
    });
    expect(blockKeyResult(tables, blockRangeOf(tables, 'hr', 'hr'), 'down', false)).toEqual({
      kind: 'caret',
      selection: { kind: 'caret', block: 'u', cell: { row: 0, column: 0 }, position: 'start' },
    });
  });

  it('Enter edits the first selected block in document order, or the nearest textblock after an atom (uwg-te-tab-keymap-host r5)', () => {
    expect(editCaret(doc, blockRangeOf(doc, 'p1', 'l1'))).toEqual({
      kind: 'caret',
      block: 'p1',
      position: 'end',
    });
    // Extended upwards: the head is the first block.
    expect(editCaret(doc, blockRangeOf(doc, 'l2', 'l1'))).toEqual({
      kind: 'caret',
      block: 'l1',
      position: 'end',
    });
    expect(editCaret(doc, blockRangeOf(doc, 'img', 'p2'))).toEqual({
      kind: 'caret',
      block: 'p2',
      position: 'start',
    });
    expect(editCaret(doc, blockRangeOf(doc, 'img', 'img'))).toEqual({
      kind: 'caret',
      block: 'p2',
      position: 'start',
    });
  });

  it('a printable key replaces the blocks with an empty paragraph holding the key', () => {
    expect(replaceWithTextActions(doc, ['l1', 'l1a', 'l1b', 'l2'], 'x')).toEqual([
      { type: 'blocks.insert', kind: 'paragraph', at: { replace: 'l1' }, select: 'start' },
      { type: 'blocks.delete', ids: ['l2'] },
      { type: 'text.insert', text: 'x' },
    ]);
    expect(replaceWithTextActions(doc, ['img'], 'a')).toEqual([
      { type: 'blocks.insert', kind: 'paragraph', at: { replace: 'img' }, select: 'start' },
      { type: 'text.insert', text: 'a' },
    ]);
    expect(replaceWithTextActions(doc, [], 'a')).toBeNull();
    expect(printableKey({ key: 'a', ctrlKey: false, metaKey: false })).toBe(true);
    expect(printableKey({ key: 'é', ctrlKey: false, metaKey: false })).toBe(true);
    expect(printableKey({ key: 'a', ctrlKey: true, metaKey: false })).toBe(false);
    expect(printableKey({ key: 'Enter', ctrlKey: false, metaKey: false })).toBe(false);
  });
});

describe('uwg-te-req-tables-5: keys over a cell range', () => {
  const cells: TextEditorSelection = {
    kind: 'cells',
    table: 't1',
    range: { anchor: { row: 1, column: 1 }, head: { row: 0, column: 0 } },
  };
  const press = (key: string, init: Partial<KeyboardEvent> = {}) => ({
    key,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...init,
  });

  it('V-834: a printable key or Enter over a cell range is one content.insert over it', () => {
    const at = { kind: 'cells', table: 't1', range: cells.kind === 'cells' ? cells.range : null };
    expect(cellRangeKeyTarget(cells, press('x'))).toEqual([
      {
        type: 'content.insert',
        content: {
          kind: 'range',
          blocks: [{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }],
        },
        at,
      },
    ]);
    expect(cellRangeKeyTarget(cells, press('Enter'))).toEqual([
      {
        type: 'content.insert',
        content: {
          kind: 'range',
          blocks: [
            { type: 'paragraph', content: [] },
            { type: 'paragraph', content: [] },
          ],
        },
        at,
      },
    ]);
    for (const other of [
      press('Enter', { shiftKey: true }),
      press('b', { metaKey: true }),
      press('ArrowDown'),
      press('Tab'),
    ])
      expect(cellRangeKeyTarget(cells, other)).toBeNull();
    expect(cellRangeKeyTarget(text('p1', 'p1'), press('x'))).toBeNull();
  });
});

// Controller ---------------------------------------------------------------------------------

interface Harness {
  readonly selection: TextEditorBlockSelection;
  readonly requests: TextEditorRequestProposal[];
  readonly announcements: string[];
  readonly state: { selection: TextEditorSelection; version: number; dragging: boolean };
  readonly calls: string[];
}

function harness(overrides: Partial<TextEditorBlockSelectionHost> = {}): Harness {
  const requests: TextEditorRequestProposal[] = [];
  const announcements: string[] = [];
  const calls: string[] = [];
  const state = {
    selection: text('p1', 'p1') as TextEditorSelection,
    version: 1,
    dragging: false,
  };
  const host: TextEditorBlockSelectionHost = {
    tree: () => doc,
    selection: () => state.selection,
    request: (proposal): Promise<TextEditorRequestOutcome> => {
      requests.push(proposal);
      const target = proposal.target;
      // A selection-only request applies at once, as the controller does.
      if (typeof target === 'object' && !Array.isArray(target)) {
        const action = target as { type: string; selection?: TextEditorSelection };
        if (action.type === 'selection.set' && action.selection) {
          const input = action.selection as unknown as { kind: string; ids?: string[] };
          state.selection =
            input.kind === 'blocks'
              ? { kind: 'blocks', ids: input.ids ?? [] }
              : input.kind === 'none'
                ? { kind: 'none' }
                : text('p1', 'p1');
          state.version++;
        }
      }
      return Promise.resolve('applied');
    },
    direction: () => 'ltr',
    strings: () => textEditorStrings,
    announce: (message) => announcements.push(message),
    editable: () => true,
    openMenu: () => {
      calls.push('menu');
      return true;
    },
    dragging: () => state.dragging,
    cancelDrag: () => calls.push('cancel-drag'),
    underlay: () => null,
    overlay: () => null,
    invalidate: () => calls.push('invalidate'),
    ...overrides,
  };
  return { selection: new TextEditorBlockSelection(host), requests, announcements, state, calls };
}

const key = (init: Partial<KeyboardEvent> & { key: string }): KeyboardEvent =>
  ({
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    isComposing: false,
    ...init,
  }) as KeyboardEvent;

describe('block mode controller', () => {
  it('Escape from a text selection enters block mode on the blocks it touches', async () => {
    const { selection, requests, state } = harness();
    state.selection = text('p1', 'l1');
    expect(selection.escape(key({ key: 'Escape' }))).toBe(true);
    await Promise.resolve();
    expect(requests[0]).toMatchObject({
      target: {
        type: 'selection.set',
        selection: { kind: 'blocks', ids: ['p1', 'l1', 'l1a', 'l1b'] },
      },
      surface: 'keyboard',
    });
    expect(selection.range).toMatchObject({ anchor: 'p1', head: 'l1b' });
  });

  it('V-738: Escape from the whole-document selection selects every top-level block, atoms before the first or after the last text point included', async () => {
    let whole = true;
    const { selection, requests, state } = harness({ wholeDocument: () => whole });
    // The text from the first to the last text point touches only the textblocks between them.
    state.selection = text('l1', 'p2');
    expect(selection.escape(key({ key: 'Escape' }))).toBe(true);
    await Promise.resolve();
    expect(requests[0]).toMatchObject({
      target: { type: 'selection.set', selection: { kind: 'blocks', ids: [...doc.roots] } },
    });
    whole = false;
    state.selection = text('l1', 'p2');
    selection.sync();
    expect(selection.escape(key({ key: 'Escape' }))).toBe(true);
    await Promise.resolve();
    expect(requests[1]).toMatchObject({
      target: {
        type: 'selection.set',
        selection: { kind: 'blocks', ids: ['l1', 'l1a', 'l1b', 'l2', 'img', 'hr', 'p2'] },
      },
    });
  });

  it('follows the engine selection and announces the block count once per change', () => {
    const { selection, announcements, state } = harness();
    state.selection = { kind: 'blocks', ids: ['img'] };
    selection.sync();
    selection.sync();
    expect(selection.range).toEqual({ anchor: 'img', head: 'img', ids: ['img'] });
    expect(announcements).toEqual(['Selected blocks: 1']);
    state.selection = text('p2', 'p2');
    selection.sync();
    expect(selection.active).toBe(false);
  });

  it('hides its paint as soon as block mode ends, since passes skip a layer it no longer wants', () => {
    const created: { hidden: boolean }[] = [];
    const layer = () => {
      const container = {
        ownerDocument: {
          createElement: () => {
            const element = {
              hidden: false,
              parentNode: null as unknown,
              style: {},
              dataset: {},
              setAttribute: () => undefined,
              remove: () => undefined,
            };
            created.push(element);
            return element;
          },
        },
        append: (element: { parentNode: unknown }) => {
          element.parentNode = container;
        },
      };
      return container as unknown as HTMLElement;
    };
    const underlay = layer();
    const overlay = layer();
    const { selection, state } = harness({ underlay: () => underlay, overlay: () => overlay });
    state.selection = { kind: 'blocks', ids: ['img'] };
    selection.sync();
    selection.apply([{ left: 0, top: 10, width: 200, height: 24 }]);
    expect(created.map((element) => element.hidden)).toEqual([false, false]);
    state.selection = text('p2', 'p2');
    selection.sync();
    expect(selection.wanted()).toBe(false);
    expect(created.map((element) => element.hidden)).toEqual([true, true]);
  });

  it('paints a run at least one line high, centred on a block lower than a line (uwg-te-req-blocks-4)', () => {
    const rect = (left: number, top: number, width: number, height: number) =>
      ({ left, top, width, height, right: left + width, bottom: top + height }) as DOMRectReadOnly;
    // A divider: a 1 px box whose line is 24 px high.
    const divider = { box: rect(10, 100, 300, 1), firstLine: rect(10, 100, 300, 24) };
    expect(selectionPaintRect(divider, divider)).toEqual({
      left: 10,
      top: 100.5 - 12,
      width: 300,
      height: 24,
    });
    // Blocks at least a line high keep their own extent.
    const paragraph = { box: rect(10, 20, 300, 48), firstLine: rect(10, 20, 300, 24) };
    const image = { box: rect(10, 80, 200, 120), firstLine: rect(10, 80, 200, 24) };
    expect(selectionPaintRect(paragraph, image)).toEqual({
      left: 10,
      top: 20,
      width: 300,
      height: 180,
    });
    // The fill and the outline take the same painted box.
    const created: { style: Record<string, string>; dataset: Record<string, string> }[] = [];
    const layer = () => {
      const container = {
        ownerDocument: {
          createElement: () => {
            const element = {
              hidden: false,
              parentNode: null as unknown,
              style: {} as Record<string, string>,
              dataset: {} as Record<string, string>,
              setAttribute: () => undefined,
              remove: () => undefined,
            };
            created.push(element);
            return element;
          },
        },
        append: (element: { parentNode: unknown }) => {
          element.parentNode = container;
        },
      };
      return container as unknown as HTMLElement;
    };
    const underlay = layer();
    const overlay = layer();
    const { selection, state } = harness({ underlay: () => underlay, overlay: () => overlay });
    state.selection = { kind: 'blocks', ids: ['hr'] };
    selection.sync();
    const instance = {
      getBlocks: () => doc,
      blockRects: (id: string) => (id === 'hr' ? divider : null),
    };
    const boxes = selection.measure({
      source: { kind: 'instance', instance },
      toOverlay: (box: DOMRectReadOnly) => ({
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
      }),
    } as unknown as OverlayMeasureContext);
    expect(boxes).toEqual([{ left: 10, top: 88.5, width: 300, height: 24 }]);
    selection.apply(boxes);
    expect(created.map((element) => [element.dataset['layer'], element.style['height']])).toEqual([
      ['fill', '24px'],
      ['outline', '24px'],
    ]);
    // A later pass (a scroll moving the marks) marks no element again.
    const writes: string[] = [];
    for (const element of created)
      element.dataset = new Proxy(element.dataset, {
        set(target, key, value: string) {
          writes.push(String(key));
          target[key as string] = value;
          return true;
        },
      });
    selection.apply([{ left: 10, top: 60, width: 300, height: 24 }]);
    expect(writes).toEqual([]);
  });

  it('Escape cancels a drag first, then ends block mode, then passes', async () => {
    const { selection, state, calls, requests } = harness();
    state.dragging = true;
    expect(selection.escape(key({ key: 'Escape' }))).toBe(true);
    expect(calls).toContain('cancel-drag');
    state.dragging = false;
    state.selection = text('p1', 'p1');
    selection.escape(key({ key: 'Escape' }));
    selection.sync();
    expect(selection.active).toBe(true);
    // Block mode ends with no selection, and the next Escape is not consumed.
    expect(selection.escape(key({ key: 'Escape' }))).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(selection.active).toBe(false);
    expect(requests.at(-1)).toMatchObject({
      target: { type: 'selection.set', selection: { kind: 'none' } },
      surface: 'keyboard',
    });
    expect(requests.at(-1)).not.toHaveProperty('focus', false);
    expect(state.selection).toEqual({ kind: 'none' });
    selection.sync();
    expect(selection.escape(key({ key: 'Escape' }))).toBe(false);
  });

  it('Escape closes an open suggestion through its view before any selection step', () => {
    const closed: string[] = [];
    const { selection } = harness({
      suggestionOpen: () => true,
      closeSuggestion: () => closed.push('closed'),
    });
    expect(selection.escape(key({ key: 'Escape' }))).toBe(true);
    expect(closed).toEqual(['closed']);
  });

  it('handles the block-mode keys and leaves the others', async () => {
    const { selection, state, requests, calls, announcements } = harness();
    state.selection = { kind: 'blocks', ids: ['l2'] };
    selection.sync();
    expect(selection.handleKey(key({ key: 'ArrowUp' }))).toBe(true);
    expect(requests.at(-1)).toMatchObject({
      target: { selection: { kind: 'blocks', ids: ['l1b'] } },
    });
    expect(selection.handleKey(key({ key: 'F10', shiftKey: true }))).toBe(true);
    expect(selection.handleKey(key({ key: 'ContextMenu' }))).toBe(true);
    expect(calls.filter((call) => call === 'menu')).toHaveLength(2);
    expect(selection.handleKey(key({ key: 'd', metaKey: true }))).toBe(false);
    expect(selection.handleKey(key({ key: 'Tab' }))).toBe(false);
    expect(selection.handleKey(key({ key: 'Backspace' }))).toBe(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(requests.at(-1)).toMatchObject({
      target: [{ type: 'blocks.delete', ids: ['l1b'] }],
      reason: 'keyboard',
    });
    expect(announcements.at(-1)).toBe('Deleted blocks: 1');
    expect(selection.handleKey(key({ key: 'q' }))).toBe(true);
    expect(requests.at(-1)).toMatchObject({
      target: [
        { type: 'blocks.insert', kind: 'paragraph', at: { replace: 'l1b' } },
        { type: 'text.insert', text: 'q' },
      ],
      reason: 'keyboard',
    });
  });

  it('V-588: a key outside block mode reads no block tree', () => {
    const tree = vi.fn(() => doc);
    const { selection } = harness({ tree });
    selection.sync();
    expect(selection.handleKey(key({ key: 'a' }))).toBe(false);
    expect(selection.handleKey(key({ key: 'ArrowDown' }))).toBe(false);
    expect(tree).not.toHaveBeenCalled();
  });

  it('while read-only only navigation and the menu keys act', () => {
    const { selection, state } = harness({ editable: () => false });
    state.selection = { kind: 'blocks', ids: ['l2'] };
    selection.sync();
    expect(selection.handleKey(key({ key: 'Delete' }))).toBe(false);
    expect(selection.handleKey(key({ key: 'x' }))).toBe(false);
    expect(selection.handleKey(key({ key: 'ArrowDown' }))).toBe(true);
  });

  it('a grip click keeps a block selection that holds its block; Shift extends from the anchor', async () => {
    const { selection, state, requests } = harness();
    await selection.selectBlock('l1');
    state.selection = { kind: 'blocks', ids: ['l1', 'l1a', 'l1b'] };
    selection.sync();
    const count = requests.length;
    await selection.selectBlock('l1a');
    expect(requests).toHaveLength(count);
    expect(selection.extendTo('img')).toBe(true);
    expect(requests.at(-1)).toMatchObject({
      target: { selection: { ids: ['l1', 'l1a', 'l1b', 'l2', 'img'] } },
    });
  });
});
