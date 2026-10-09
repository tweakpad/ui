import { keyEvent } from '../fakes.test.js';
import { describe, expect, it, vi } from 'vitest';
import { TreeModel, VisibleRows, type TreeAccessors } from './model.js';
import {
  checkedStates,
  constrainSelection,
  inheritSelection,
  normalizeIds,
  propagateSelection,
  rangeIds,
} from './selection.js';
import {
  collapsedAncestors,
  expandableIds,
  expandableSiblings,
  withExpanded,
} from './expansion.js';
import { treeKeyAction, type TreeKeyInput } from './keyboard.js';
import { TreeLoader } from './lazy.js';
import { applyMove, dragDepth, projectDepth, resolveMove, validMove } from './projection.js';

interface Item {
  id: string;
  label?: string;
  children?: Item[];
  disabled?: boolean;
  hasChildren?: boolean;
}

const accessors: TreeAccessors<Item> = {
  id: (item) => item.id,
  label: (item) => item.label ?? item.id,
  children: (item) => item.children,
  disabled: (item) => Boolean(item.disabled),
  hasChildren: (item) => Boolean(item.hasChildren),
};

const items: Item[] = [
  {
    id: 'src',
    children: [
      { id: 'app', children: [{ id: 'main.ts' }, { id: 'routes.ts', disabled: true }] },
      { id: 'lib', hasChildren: true },
      { id: 'index.ts' },
    ],
  },
  { id: 'docs', children: [{ id: 'readme.md' }] },
  { id: 'package.json' },
];

const build = (list: Item[] = items, loaded?: Map<string, Item[]>) =>
  new TreeModel({ items: list, accessors, ...(loaded ? { loaded } : {}) });

describe('tree model', () => {
  it('records parents, depths, sibling positions and expandability', () => {
    const model = build();
    expect(model.roots).toEqual(['src', 'docs', 'package.json']);
    expect(model.get('main.ts')).toMatchObject({ parentId: 'app', depth: 2, index: 0 });
    expect(model.level('routes.ts')).toBe(3);
    expect(model.setSize('app')).toBe(3);
    expect(model.posInSet('index.ts')).toBe(3);
    expect(model.get('lib')).toMatchObject({ expandable: true, loaded: false });
    expect(model.get('index.ts')).toMatchObject({ expandable: false, loaded: false });
    expect(model.ancestors('main.ts')).toEqual(['app', 'src']);
    expect([...model.descendants('src')]).toEqual([
      'app',
      'main.ts',
      'routes.ts',
      'lib',
      'index.ts',
    ]);
    expect(model.isDescendant('main.ts', 'src')).toBe(true);
  });

  it('keeps the first owner of a duplicate identifier and reports it once', () => {
    const model = build([
      { id: 'a' },
      { id: 'a', children: [{ id: 'b' }] },
      { id: 'a' },
      { id: '' },
    ]);
    expect(model.roots).toEqual(['a']);
    expect(model.has('b')).toBe(false);
    expect(model.duplicates).toEqual(['a']);
    expect(model.invalid).toBe(1);
  });

  it('uses loaded children without mutating the records and keeps an empty load expandable', () => {
    const model = build(items, new Map([['lib', []]]));
    expect(model.get('lib')).toMatchObject({ expandable: true, loaded: true, children: [] });
    const loaded = build(items, new Map([['lib', [{ id: 'util.ts' }]]]));
    expect(loaded.get('util.ts')).toMatchObject({ parentId: 'lib', depth: 2 });
    expect(items[0]!.children![1]!.children).toBeUndefined();
  });

  it('handles very deep trees without recursion', () => {
    let root: Item = { id: 'n0' };
    const top = root;
    for (let depth = 1; depth < 20_000; depth++) {
      const child: Item = { id: `n${depth}` };
      root.children = [child];
      root = child;
    }
    const model = build([top]);
    expect(model.get('n19999')?.depth).toBe(19_999);
  });
});

describe('visible rows', () => {
  it('lists expanded descendants depth-first and splices one item at a time', () => {
    const model = build();
    const rows = new VisibleRows();
    const expanded = new Set(['src']);
    rows.rebuild(model, expanded);
    expect(rows.ids).toEqual(['src', 'app', 'lib', 'index.ts', 'docs', 'package.json']);
    expanded.add('app');
    expect(rows.expand(model, expanded, 'app')).toEqual(['main.ts', 'routes.ts']);
    expect(rows.indexOf('lib')).toBe(4);
    expect(rows.collapse(model, 'src')).toEqual(['app', 'main.ts', 'routes.ts', 'lib', 'index.ts']);
    expect(rows.ids).toEqual(['src', 'docs', 'package.json']);
    // Re-expanding restores the nested expansion that was kept.
    expect(rows.expand(model, expanded, 'src')).toHaveLength(5);
  });

  it('splices a large tree without rebuilding', () => {
    const list: Item[] = Array.from({ length: 100 }, (_, a) => ({
      id: `a${a}`,
      children: Array.from({ length: 1000 }, (_, b) => ({ id: `a${a}-${b}` })),
    }));
    const model = build(list);
    const expanded = new Set(model.roots);
    const rows = new VisibleRows();
    rows.rebuild(model, expanded);
    expect(rows.length).toBe(100_100);
    // Only the changed subtree is visited, not the 100k other rows.
    const get = model.get.bind(model);
    let lookups = 0;
    model.get = (id) => {
      lookups++;
      return get(id);
    };
    rows.collapse(model, 'a50');
    rows.expand(model, expanded, 'a50');
    expect(lookups).toBeLessThan(2_100);
    expect(rows.length).toBe(100_100);
    expect(rows.indexOf('a50-999')).toBe(50 * 1001 + 1000);
  });
});

describe('selection', () => {
  it('normalizes identifier lists from arrays, JSON and whitespace', () => {
    expect(normalizeIds(['a', 'a', '', 3, 'b'])).toEqual(['a', 'b']);
    expect(normalizeIds('["x","y"]')).toEqual(['x', 'y']);
    expect(normalizeIds(' x  y ')).toEqual(['x', 'y']);
    expect(constrainSelection(['a', 'b'], 'single')).toEqual(['a']);
    expect(constrainSelection(['a'], 'none')).toEqual([]);
  });

  it('selects a range of selectable visible rows in either direction', () => {
    const rows = ['a', 'b', 'c', 'd'];
    expect(rangeIds(rows, 3, 1, (id) => id !== 'c')).toEqual(['b', 'd']);
  });

  it('propagates to enabled descendants and derives ancestors', () => {
    const model = build();
    let selected = propagateSelection(model, [], 'app', true);
    expect(selected.sort()).toEqual(['app', 'main.ts']);
    let states = checkedStates(model, new Set(selected), true);
    expect(states.get('app')).toBe(true);
    expect(states.get('src')).toBe('mixed');
    selected = propagateSelection(model, selected, 'index.ts', true);
    selected = propagateSelection(model, selected, 'lib', true);
    expect(selected).toContain('src');
    states = checkedStates(model, new Set(selected), true);
    expect(states.get('src')).toBe(true);
    // The disabled leaf keeps its state.
    expect(selected).not.toContain('routes.ts');
    selected = propagateSelection(model, selected, 'main.ts', false);
    expect(selected).not.toContain('app');
    expect(selected).not.toContain('src');
  });

  it('lets later loaded children inherit the selection of their parent', () => {
    const model = build(
      items,
      new Map([['lib', [{ id: 'util.ts' }, { id: 'old.ts', disabled: true }]]]),
    );
    expect(inheritSelection(model, ['lib'], 'lib')).toEqual(['lib', 'util.ts']);
    expect(inheritSelection(model, [], 'lib')).toEqual([]);
  });

  it('reports plain selection as checked state without propagation', () => {
    const states = checkedStates(build(), new Set(['src']), false);
    expect(states.get('src')).toBe(true);
    expect(states.get('app')).toBe(false);
  });
});

describe('expansion', () => {
  it('finds expandable items, siblings and collapsed ancestors', () => {
    const model = build();
    expect(expandableIds(model)).toEqual(['src', 'app', 'lib', 'docs']);
    expect(expandableSiblings(model, 'app')).toEqual(['app', 'lib']);
    expect(collapsedAncestors(model, new Set(['src']), 'main.ts')).toEqual(['app']);
    expect(withExpanded(['x'], ['x', 'y'])).toEqual(['x', 'y']);
  });
});

describe('keyboard', () => {
  const model = build();
  const rows = new VisibleRows();
  const expanded = new Set(['src', 'app']);
  rows.rebuild(model, expanded);
  const action = (
    input: TreeKeyInput,
    focused: string,
    extra: { rtl?: boolean; multiple?: boolean } = {},
  ) =>
    treeKeyAction(input, {
      model,
      rows,
      expanded,
      focused,
      direction: extra.rtl ? 'rtl' : 'ltr',
      multiple: extra.multiple ?? false,
    });

  it('follows the APG tree map', () => {
    expect(action(keyEvent('ArrowDown'), 'src')).toEqual({
      type: 'focus',
      id: 'app',
      extend: false,
    });
    expect(action(keyEvent('ArrowUp'), 'src')).toBeNull();
    expect(action(keyEvent('ArrowRight'), 'docs')).toEqual({ type: 'expand', id: 'docs' });
    expect(action(keyEvent('ArrowRight'), 'app')).toEqual({ type: 'focus', id: 'main.ts' });
    expect(action(keyEvent('ArrowRight'), 'main.ts')).toBeNull();
    expect(action(keyEvent('ArrowLeft'), 'app')).toEqual({ type: 'collapse', id: 'app' });
    expect(action(keyEvent('ArrowLeft'), 'main.ts')).toEqual({ type: 'focus', id: 'app' });
    expect(action(keyEvent('ArrowLeft'), 'docs')).toBeNull();
    expect(action(keyEvent('Home'), 'docs')).toEqual({ type: 'focus', id: 'src' });
    expect(action(keyEvent('End'), 'src')).toEqual({ type: 'focus', id: 'package.json' });
    expect(action(keyEvent('*', { shiftKey: true }), 'app')).toEqual({
      type: 'expand-siblings',
      id: 'app',
    });
    expect(action(keyEvent('Enter'), 'app')).toEqual({ type: 'activate', id: 'app' });
    expect(action(keyEvent(' '), 'app')).toEqual({ type: 'toggle', id: 'app' });
  });

  it('mirrors horizontal keys in right-to-left direction', () => {
    expect(action(keyEvent('ArrowLeft'), 'docs', { rtl: true })).toEqual({
      type: 'expand',
      id: 'docs',
    });
    expect(action(keyEvent('ArrowRight'), 'main.ts', { rtl: true })).toEqual({
      type: 'focus',
      id: 'app',
    });
  });

  it('offers range keys only in multiple mode', () => {
    expect(action(keyEvent('ArrowDown', { shiftKey: true }), 'src', { multiple: true })).toEqual({
      type: 'focus',
      id: 'app',
      extend: true,
    });
    expect(action(keyEvent(' ', { shiftKey: true }), 'src')).toBeNull();
    expect(action(keyEvent(' ', { shiftKey: true }), 'src', { multiple: true })).toEqual({
      type: 'select-range',
      id: 'src',
    });
    expect(
      action(keyEvent('End', { shiftKey: true, ctrlKey: true }), 'src', { multiple: true }),
    ).toEqual({
      type: 'select-to-edge',
      id: 'package.json',
      edge: 'end',
    });
    expect(action(keyEvent('a', { metaKey: true }), 'src', { multiple: true })).toEqual({
      type: 'select-all',
    });
    expect(action(keyEvent('a', { metaKey: true }), 'src')).toBeNull();
  });
});

describe('loader', () => {
  it('deduplicates pending requests and reports status changes', async () => {
    const changes: string[] = [];
    const loaded = vi.fn();
    const loader = new TreeLoader<string[]>({
      onChange: (id, state) => changes.push(`${id}:${state.status}`),
      onLoad: loaded,
    });
    const run = vi.fn(async () => ['child']);
    await Promise.all([loader.load('a', run), loader.load('a', run)]);
    expect(run).toHaveBeenCalledTimes(1);
    expect(loaded).toHaveBeenCalledWith('a', ['child']);
    expect(changes).toEqual(['a:loading', 'a:loaded']);
  });

  it('reports errors, retries and aborts', async () => {
    const loader = new TreeLoader<string[]>({ onChange: () => {}, onLoad: () => {} });
    await loader.load('a', async () => {
      throw new Error('offline');
    });
    expect(loader.state('a')).toMatchObject({ status: 'error' });
    await loader.load('a', async () => []);
    expect(loader.status('a')).toBe('loaded');
    let signal: AbortSignal | undefined;
    void loader.load('b', (abort) => {
      signal = abort;
      return new Promise(() => {});
    });
    await Promise.resolve();
    loader.retain((id) => id !== 'b');
    expect(signal?.aborted).toBe(true);
    expect(loader.status('b')).toBe('idle');
  });
});

describe('projection', () => {
  const model = build();
  const rows = (ids: string[]) =>
    ids.map((id) => ({ id, depth: model.get(id)!.depth, parentId: model.get(id)!.parentId }));

  it('converts an inline offset to depth steps, mirrored for right-to-left', () => {
    expect(dragDepth(49, 24)).toBe(2);
    expect(dragDepth(49, 24, true)).toBe(-2);
  });

  it('clamps depth between the next row and one deeper than the previous row', () => {
    // index.ts dragged directly below main.ts (inside app).
    const sorted = rows(['src', 'app', 'main.ts', 'index.ts', 'docs']);
    const projection = projectDepth(sorted, 3, 5);
    expect(projection).toMatchObject({ depth: 3, maxDepth: 3, minDepth: 0, parentId: 'main.ts' });
    expect(projectDepth(sorted, 3, 2).parentId).toBe('app');
    expect(projectDepth(sorted, 3, 0).parentId).toBeNull();
  });

  it('resolves and applies a move without touching unrelated records', () => {
    const sorted = rows(['src', 'app', 'main.ts', 'routes.ts', 'index.ts', 'lib', 'docs']);
    sorted[4] = { ...sorted[4]!, depth: 2, parentId: 'app' };
    const move = resolveMove(model, sorted, 4, 'app')!;
    expect(move).toEqual({
      itemId: 'index.ts',
      fromParentId: 'src',
      fromIndex: 2,
      toParentId: 'app',
      toIndex: 2,
    });
    expect(validMove(model, move)).toBe(true);
    const next = applyMove(model, move, (item, children) => ({ ...item, children }));
    expect(next[1]).toBe(items[1]);
    expect(next[0]!.children!.map((item) => item.id)).toEqual(['app', 'lib']);
    expect(next[0]!.children![0]!.children!.map((item) => item.id)).toEqual([
      'main.ts',
      'routes.ts',
      'index.ts',
    ]);
  });

  it('appends to a collapsed parent and rejects invalid targets', () => {
    const sorted = rows(['src', 'docs', 'package.json']);
    sorted[2] = { ...sorted[2]!, depth: 1, parentId: 'docs' };
    const move = resolveMove(model, sorted, 2, 'docs')!;
    expect(move.toIndex).toBe(1);
    expect(validMove(model, { ...move, toParentId: 'lib', toIndex: 0 })).toBe(false);
    expect(validMove(model, { ...move, itemId: 'src', toParentId: 'app' })).toBe(false);
    expect(validMove(model, { ...move, toParentId: null, toIndex: 2 })).toBe(false);
  });
});
