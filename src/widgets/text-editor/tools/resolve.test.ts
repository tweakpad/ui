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
import {
  resolveSelectionToolbarView,
  resolveToolbarView,
  type TextEditorToolbarItem,
  type TextEditorFixedToolbarViewInput,
} from './resolve.js';

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
    can?: () => boolean;
    focused?: boolean;
  } = {},
  resolve: (
    input: TextEditorFixedToolbarViewInput,
  ) => ReturnType<typeof resolveToolbarView> = resolveToolbarView,
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
  return resolve({
    registry,
    layout,
    access,
    focused: options.focused ?? true,
    context,
    enabled: (tool, toolContext) =>
      toolEnabled(tool, toolContext, {
        ready: true,
        disabled: access.disabled,
        editable: !access.readOnly,
        registry,
        can: options.can ?? (() => true),
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
  it('disables every control while focus is outside the widget, keeping it focusable with its activity (uwg-te-req-tools-2)', () => {
    const focused = view();
    const unfocused = view({ focused: false });
    expect(focused!.focused).toBe(true);
    expect(find(focused, 'bold').disabled).toBe(false);
    expect(unfocused!.focused).toBe(false);
    expect(all(unfocused).every((item) => item.disabled)).toBe(true);
    expect(all(unfocused).every((item) => item.focusableWhenDisabled)).toBe(true);
    expect(all(unfocused).map((item) => [item.id, item.active, item.hidden ?? false])).toEqual(
      all(focused).map((item) => [item.id, item.active, item.hidden ?? false]),
    );
    // The widget's own disabled state still takes focusability away.
    const disabled = view({ focused: false, access: { readOnly: false, disabled: true } });
    expect(all(disabled).every((item) => !item.focusableWhenDisabled)).toBe(true);
  });

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

  it('keeps the place of block-kind tools that hide in a table, so no control moves (uwg-te-req-tools-5, uwg-te-req-pres-5, uwg-te-tab-anatomy-r2)', () => {
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
    const outside = view();
    const result = view({ state: { table } });
    // The same groups and items in the same order as outside a table: the partition of the row,
    // and so the place of every control, stays.
    const shape = (value: ReturnType<typeof view>) =>
      value!.groups.map((group) => [group.key, ids(group.items)]);
    expect(shape(result)).toEqual(shape(outside));
    const hidden = (value: ReturnType<typeof view>) =>
      value!.groups.map((group) => [
        group.key,
        group.hidden ?? false,
        group.items.filter((item) => item.hidden).map((item) => item.id),
      ]);
    expect(hidden(result)).toEqual([
      ['0', false, []],
      ['1', true, ['block-type', 'list-type', 'blockquote']],
      ['2', false, []],
      ['3', false, []],
      ['4', false, []],
      ['5', false, []],
    ]);
    // Outside a table nothing hides.
    expect(all(outside).some((item) => item.hidden)).toBe(false);
    expect(outside!.groups.some((group) => group.hidden)).toBe(false);
    // A pair hides with both members, each marked.
    const pair = result!.groups[1]!.items[2]!;
    expect([pair.pair, pair.hidden, pair.items.map((member) => member.hidden)]).toEqual([
      true,
      true,
      [true, true],
    ]);
    // A group mixing a hidden and a shown tool keeps both, only the block tool hidden.
    const mixed = view({ layout: { toolbar: [['bold', 'heading-1']] }, state: { table } });
    expect(mixed!.groups.map((group) => [group.hidden ?? false, ids(group.items)])).toEqual([
      [false, ['bold', 'heading-1']],
    ]);
    expect(mixed!.groups[0]!.items.map((item) => item.hidden ?? false)).toEqual([false, true]);
    const blocksOnly = view({
      layout: { toolbar: [['blockquote', 'code-block', 'block-type']] },
      state: { table },
    });
    expect(blocksOnly).not.toBeNull();
    expect(blocksOnly!.groups.map((group) => [group.hidden, ids(group.items)])).toEqual([
      [true, ['blockquote|code-block', 'block-type']],
    ]);
    // The selection toolbar, a floating surface, leaves an invisible tool out.
    const floating = (state: Partial<TextEditorEngineState> = {}) =>
      all(
        view({ state }, (input) => {
          const selection = resolveSelectionToolbarView(input);
          return selection && { ...selection, moreTools: '', focused: true };
        }),
      ).map((item) => [item.id, item.hidden ?? false]);
    expect(floating()).toContainEqual(['turn-into', false]);
    expect(floating({ table }).map(([id]) => id)).not.toContain('turn-into');
    expect(floating({ table }).some(([, hidden]) => hidden)).toBe(false);
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

  it("shows an active-label trigger's active item as a label, else the tool's own", () => {
    const heading = view({
      layout: { toolbar: [['turn-into']] },
      state: {
        blockKinds: ['heading:2'],
        block: { id: 'b', kind: 'heading', attrs: { level: 2 }, depth: 0 },
      },
    });
    const turnInto = find(heading, 'turn-into');
    expect([turnInto.display, turnInto.text, turnInto.label]).toEqual([
      'label',
      textEditorStrings.heading2,
      textEditorStrings.turnInto,
    ]);
    const mixed = view({
      layout: { toolbar: [['turn-into']] },
      state: { blockKinds: ['paragraph', 'heading:2'] },
    });
    expect(find(mixed, 'turn-into').text).toBe(textEditorStrings.turnInto);
    expect(find(view(), 'block-type').display).toBe('icon');
    // The active item's icon too, which a narrowed selection toolbar shows in place of the label.
    expect(turnInto.icon).toBe(textEditorTools['heading-2']!.icon);
    expect(turnInto.icon).toBeDefined();
    expect(find(mixed, 'turn-into').icon).toBeUndefined();
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

  it('disables a menu whose items are all disabled, as turn-into for a selected table (uwg-te-req-blocks-3)', () => {
    const blocked = view({ layout: { toolbar: [['turn-into']] }, can: () => false });
    const turnInto = find(blocked, 'turn-into');
    expect(turnInto.items.length).toBeGreaterThan(0);
    expect(turnInto.items.every((item) => item.disabled)).toBe(true);
    expect(turnInto.disabled).toBe(true);
    expect(find(view({ layout: { toolbar: [['turn-into']] } }), 'turn-into').disabled).toBe(false);
    const tools: TextEditorTool[] = [
      { id: 'stamps', kind: 'menu', label: 'Stamps', items: ['stamp-a', 'stamp-b'] },
      { id: 'stamp-a', kind: 'button', label: 'A', action: { type: 'text.insert', text: 'a' } },
      { id: 'stamp-b', kind: 'button', label: 'B', action: { type: 'text.insert', text: 'b' } },
      { id: 'stamp-none', kind: 'menu', label: 'None', items: [] },
    ];
    const layout = { toolbar: [['stamps', 'stamp-none']] };
    expect(find(view({ tools, layout, can: () => false }), 'stamps').disabled).toBe(true);
    expect(find(view({ tools, layout }), 'stamps').disabled).toBe(false);
    // A menu without items opens no submenu: its own enablement stands.
    expect(find(view({ tools, layout, can: () => false }), 'stamp-none').disabled).toBe(false);
  });

  it("marks the first item of each further group of a menu tool's items (uwg-te-tab-tools-r11)", () => {
    const menu: TextEditorTool = {
      id: 'fixture-more',
      kind: 'menu',
      label: 'More',
      surfaces: ['toolbar'],
      items: [['bold', 'italic'], ['missing'], ['underline'], 'strike', '*', 'code'],
    };
    const result = view({ tools: [menu], layout: { toolbar: [['fixture-more']] } });
    const items = find(result, 'fixture-more').items;
    expect(items.map((item) => `${item.separated ? '| ' : ''}${item.id}`)).toEqual([
      'bold',
      'italic',
      '| underline',
      '| strike',
      'code',
    ]);
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
