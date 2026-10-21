import { describe, expect, it } from 'vitest';
import type { KeyShortcut } from '../../../foundation/key-bindings.js';
import { textEditorTools } from '../../../foundation/text-editor/builtin-tools.js';
import {
  BASE_CAPABILITIES,
  type TextEditorCapability,
} from '../../../foundation/text-editor/capabilities.js';
import type { TextEditorAccess } from '../../../foundation/text-editor/controller.js';
import {
  resolveTextEditorLayout,
  type TextEditorLayout,
} from '../../../foundation/text-editor/layout.js';
import type { TextEditorEngineState } from '../../../foundation/text-editor/model.js';
import { preReadyState } from '../../../foundation/text-editor/state.js';
import { textEditorStrings } from '../../../foundation/text-editor/strings.js';
import {
  resolveTextEditorTools,
  toolEnabled,
  type TextEditorTool,
  type TextEditorToolContext,
} from '../../../foundation/text-editor/tools.js';
import { resolveToolbarView, type TextEditorToolbarItem } from './resolve.js';

const TABLE: readonly TextEditorCapability[] = ['block.table', 'table.merge', 'table.move'];
const EDITABLE: TextEditorAccess = { readOnly: false, disabled: false };
const BOLD_SHORTCUT: KeyShortcut = { aria: 'Control+B', display: 'Ctrl+B', keys: ['Control', 'B'] };

function view(
  options: {
    layout?: Partial<TextEditorLayout>;
    capabilities?: readonly TextEditorCapability[];
    state?: Partial<TextEditorEngineState>;
    access?: TextEditorAccess;
    tools?: readonly TextEditorTool[];
    shortcut?: (id: string) => KeyShortcut | undefined;
    expanded?: (tool: TextEditorTool) => boolean;
  } = {},
) {
  const registry = resolveTextEditorTools({
    builtins: textEditorTools,
    tools: options.tools ?? null,
    capabilities: new Set([...BASE_CAPABILITIES, ...(options.capabilities ?? TABLE)]),
  });
  const { layout } = resolveTextEditorLayout(options.layout ?? null, registry);
  const access = options.access ?? EDITABLE;
  const state = {
    ...preReadyState({ editable: !access.readOnly, empty: false }),
    ...options.state,
  };
  const context = (surface: TextEditorToolContext['surface']): TextEditorToolContext => ({
    state,
    strings: textEditorStrings,
    surface,
    target: { kind: 'selection' },
    direction: 'ltr',
    layout,
    table: null,
  });
  return resolveToolbarView({
    registry,
    layout,
    access,
    context,
    enabled: (tool, toolContext) =>
      toolEnabled(tool, toolContext, {
        ready: true,
        disabled: access.disabled,
        editable: !access.readOnly,
        registry,
        can: () => true,
      }),
    shortcut: options.shortcut ?? ((id) => (id === 'bold' ? BOLD_SHORTCUT : undefined)),
    expanded: options.expanded,
  });
}

const ids = (items: readonly TextEditorToolbarItem[]) =>
  items.map((item) => (item.pair ? item.items.map((member) => member.id).join('|') : item.id));
const all = (result: ReturnType<typeof view>) =>
  result!.groups.flatMap((group) => group.items.flatMap((item) => [item, ...item.items]));
const find = (result: ReturnType<typeof view>, id: string) =>
  all(result).find((item) => item.id === id && !item.pair)!;

describe('text editor toolbar view', () => {
  it('gives the default layout six groups in order, with merged pairs (uwg-te-tab-layout, uwg-te-req-tools-1)', () => {
    const result = view();
    expect(result).toMatchObject({
      label: textEditorStrings.toolbar,
      moreTools: textEditorStrings.moreTools,
      disabled: false,
    });
    expect(result!.groups.map((group) => [group.key, ids(group.items)])).toEqual([
      ['0', ['undo', 'redo']],
      ['1', ['block-type', 'list-type', 'blockquote|code-block']],
      ['2', ['bold', 'italic', 'strike', 'code', 'underline', 'highlight', 'link']],
      ['3', ['superscript|subscript']],
      ['4', ['align']],
      ['5', ['table', 'image']],
    ]);
    const controls = Object.fromEntries(all(result).map((item) => [item.id, item.control]));
    expect(controls).toMatchObject({
      undo: 'button',
      'block-type': 'menu',
      'list-type': 'menu',
      bold: 'toggle',
      highlight: 'menu',
      link: 'button',
      align: 'toggle-group',
      table: 'button',
      image: 'button',
    });
    const pair = result!.groups[3]!.items[0]!;
    expect([pair.control, pair.kind, pair.items.map((item) => item.control)]).toEqual([
      'toggle-group',
      'toggle',
      ['toggle', 'toggle'],
    ]);
  });

  it('merges a pair listed across two groups at its first listing and drops the emptied group (uwg-te-req-tools-1)', () => {
    const across = view({ layout: { toolbar: [['subscript', 'bold'], ['superscript']] } });
    expect(across!.groups.map((group) => ids(group.items))).toEqual([
      ['superscript|subscript', 'bold'],
    ]);
    expect(across!.groups[0]!.items[0]!.id).toBe('subscript');
    const alone = view({ layout: { toolbar: [['blockquote']] } });
    expect(alone!.groups[0]!.items.map((item) => [item.id, item.control, item.pair])).toEqual([
      ['blockquote', 'toggle', false],
    ]);
  });

  it('hides block-kind tools in a table and drops the emptied group, keeping the part (uwg-te-req-tools-5, uwg-te-tab-anatomy-r2)', () => {
    const table = {
      id: 't',
      cell: { row: 0, column: 0 },
      range: null,
      rows: 2,
      columns: 2,
      headerRow: false,
      headerColumn: false,
      merged: false,
      cellMerged: false,
    };
    const result = view({ state: { table } });
    expect(result!.groups.map((group) => group.key)).toEqual(['0', '2', '3', '4', '5']);
    const blocksOnly = view({
      layout: { toolbar: [['blockquote', 'code-block', 'block-type']] },
      state: { table },
    });
    expect(blocksOnly).not.toBeNull();
    expect(blocksOnly!.groups).toEqual([]);
  });

  it('expands `*`, skips unknown identifiers and leaves unavailable tools out (uwg-te-req-tools-1, uwg-te-req-tools-2)', () => {
    const result = view({ layout: { toolbar: [['nope', 'bold'], ['*']] } });
    expect(result!.groups[0]!.items.map((item) => item.id)).toEqual(['bold']);
    expect(result!.groups.length).toBeGreaterThan(1);
    expect(all(result).some((item) => item.id === 'slash')).toBe(false);
    const reduced = view({ capabilities: [] });
    expect(ids(reduced!.groups.at(-1)!.items)).toEqual(['image']);
    expect(reduced!.groups[2]!.items.map((item) => item.id)).toContain('bold');
  });

  it('gives no toolbar while its layout key holds no available tool (uwg-te-tab-anatomy-r2)', () => {
    expect(view({ layout: { toolbar: [] } })).toBeNull();
    expect(view({ layout: { toolbar: [['table']] }, capabilities: [] })).toBeNull();
  });

  it('keeps read-only tools present, disabled and focusable (uwg-te-req-tools-2, uwg-te-req-prop-3)', () => {
    const result = view({ access: { readOnly: true, disabled: false } });
    expect([find(result, 'bold').disabled, find(result, 'bold').focusableWhenDisabled]).toEqual([
      true,
      true,
    ]);
    expect(result!.disabled).toBe(false);
  });

  it('disables every item and member while the widget is disabled (uwg-te-req-prop-3, uwg-te-req-a11y-2)', () => {
    const result = view({ access: { readOnly: false, disabled: true } });
    expect(result!.disabled).toBe(true);
    for (const item of all(result))
      expect([item.id, item.disabled, item.focusableWhenDisabled]).toEqual([item.id, true, false]);
  });

  it('follows the state: pressed tools, radio values, active triggers and menu items (uwg-te-req-tools-2, uwg-te-tab-tools-blocks)', () => {
    const base = preReadyState({ editable: true, empty: false });
    const result = view({
      state: {
        marks: { ...base.marks, bold: 'on' },
        blockKinds: ['heading:2'],
        block: { id: 'b', kind: 'heading', attrs: { level: 2 }, depth: 0 },
        align: 'center',
      },
    });
    expect([find(result, 'bold').active, find(result, 'italic').active]).toEqual([true, false]);
    const blockType = find(result, 'block-type');
    expect(blockType.value).toBe('heading-2');
    expect(blockType.icon).toBe(find(result, 'heading-2').icon);
    expect(blockType.items.map((item) => item.id)).toEqual([
      'paragraph',
      'heading-1',
      'heading-2',
      'heading-3',
    ]);
    expect(find(result, 'list-type').icon).toBe(textEditorTools['list-type']!.icon);
    expect(find(result, 'align').value).toBe('align-center');
    expect(find(result, 'bold').label).toBe(textEditorStrings.bold);
  });

  it("shows the router's published shortcut only (uwg-te-req-key-2)", () => {
    const result = view();
    expect(find(result, 'bold').shortcut).toBe(BOLD_SHORTCUT);
    expect(find(result, 'italic').shortcut).toBeUndefined();
  });

  it('marks link, image and table controls as closed dialog openers (uwg-te-req-a11y-2)', () => {
    const result = view();
    for (const id of ['link', 'image', 'table'])
      expect([id, find(result, id).popup, find(result, id).expanded]).toEqual([
        id,
        'dialog',
        false,
      ]);
    expect(find(result, 'bold').popup).toBeNull();
  });

  it('reports the open state of the surface a link, image or table control opens', () => {
    const open = new Set(['table-size', 'link']);
    const result = view({ expanded: (tool) => open.has(tool.kind) || tool.id === 'bold' });
    expect(find(result, 'table').expanded).toBe(true);
    expect(find(result, 'link').expanded).toBe(true);
    expect(find(result, 'image').expanded).toBe(false);
    // Only a dialog opener has an open state.
    expect(find(result, 'bold').expanded).toBe(false);
  });

  it('renders a custom tool from its context (uwg-te-par-tools-1)', () => {
    const stamp: TextEditorTool = {
      id: 'stamp',
      kind: 'custom',
      label: 'Stamp',
      render: (context) => `stamp:${context.surface}`,
    };
    const result = view({ tools: [stamp], layout: { toolbar: [['stamp']] } });
    const item = find(result, 'stamp');
    expect([item.control, item.render?.()]).toEqual(['custom', 'stamp:toolbar']);
  });
});
