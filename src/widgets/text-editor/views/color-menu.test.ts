import { describe, expect, it } from 'vitest';
import type { TemplateResult } from 'lit';
import { textEditorTools } from '../../../foundation/text-editor/builtin-tools.js';
import { defaultTextEditorLayout } from '../../../foundation/text-editor/layout.js';
import type {
  TextEditorEngineState,
  TextEditorTableModel,
} from '../../../foundation/text-editor/model.js';
import { MARKS_OFF, preReadyState } from '../../../foundation/text-editor/state.js';
import { textEditorStrings } from '../../../foundation/text-editor/strings.js';
import type { TextEditorToolContext } from '../../../foundation/text-editor/tools.js';
import {
  colorGroups,
  colorLabel,
  colorToolValue,
  renderColorMenuContent,
  renderSwatch,
} from './color-menu.js';

function context(
  state: Partial<TextEditorEngineState> = {},
  extra: Partial<TextEditorToolContext> = {},
): TextEditorToolContext {
  return {
    state: { ...preReadyState({ editable: true, empty: false }), ...state },
    strings: textEditorStrings,
    surface: 'selection-toolbar',
    target: { kind: 'selection' },
    direction: 'ltr',
    layout: defaultTextEditorLayout,
    table: null,
    ...extra,
  };
}

function markup(value: unknown): string {
  if (Array.isArray(value)) return value.map(markup).join('');
  const template = value as TemplateResult | null;
  if (!template || typeof template !== 'object' || !('strings' in template))
    return String(value ?? '');
  return template.strings.join('§') + template.values.map(markup).join('');
}

describe('text editor color menus (uwg-te-req-surfaces-5)', () => {
  const tools = textEditorTools;

  it('offers one group per channel, each with Default and the nine hues', () => {
    const groups = colorGroups(tools['color']!, context());
    expect(groups.map((group) => [group.channel, group.label])).toEqual([
      ['text', 'Text color'],
      ['highlight', 'Highlight'],
    ]);
    for (const group of groups)
      expect(group.items.map((item) => item.color)).toEqual([
        'default',
        'gray',
        'brown',
        'orange',
        'yellow',
        'green',
        'blue',
        'purple',
        'pink',
        'red',
      ]);
    expect(colorGroups(tools['highlight']!, context()).map((group) => group.channel)).toEqual([
      'highlight',
    ]);
    expect(colorGroups(tools['bold']!, context())).toEqual([]);
    expect(colorLabel(textEditorStrings, 'default')).toBe('Default');
    expect(colorLabel(textEditorStrings, 'purple')).toBe('Purple');
  });

  it('checks the current value: the hue, Default for none and nothing when mixed', () => {
    const value = (textColor: unknown, highlight: unknown) =>
      colorGroups(
        tools['color']!,
        context({
          marks: { ...MARKS_OFF, textColor, highlight } as TextEditorEngineState['marks'],
        }),
      ).map((group) => group.value);
    expect(value('red', null)).toEqual(['red', 'default']);
    expect(value('mixed', 'yellow')).toEqual([null, 'yellow']);
  });

  it('reads the background of the targeted cells', () => {
    const table: TextEditorTableModel = {
      id: 't',
      rows: 2,
      columns: 2,
      cells: [
        {
          row: 0,
          column: 0,
          rowSpan: 1,
          colSpan: 1,
          header: false,
          background: 'blue',
          align: null,
          empty: true,
        },
        {
          row: 0,
          column: 1,
          rowSpan: 1,
          colSpan: 1,
          header: false,
          background: 'blue',
          align: null,
          empty: true,
        },
        {
          row: 1,
          column: 0,
          rowSpan: 1,
          colSpan: 1,
          header: false,
          background: null,
          align: null,
          empty: true,
        },
        {
          row: 1,
          column: 1,
          rowSpan: 1,
          colSpan: 1,
          header: false,
          background: 'red',
          align: null,
          empty: true,
        },
      ],
      grid: [
        [0, 1],
        [2, 3],
      ],
      headerRow: false,
      headerColumn: false,
      widths: null,
      merged: false,
    };
    const tool = tools['cell-background']!;
    const at = (target: TextEditorToolContext['target']) =>
      colorGroups(tool, context({}, { table, target, surface: 'table-row' }))[0]!.value;
    expect(at({ kind: 'table', table: 't', axis: 'row', index: 0 })).toBe('blue');
    expect(at({ kind: 'table', table: 't', axis: 'column', index: 0 })).toBeNull();
    expect(at({ kind: 'table', table: 't', axis: 'row', index: 1 })).toBeNull();
    const cell = colorGroups(
      tool,
      context(
        {
          table: {
            id: 't',
            cell: { row: 1, column: 0 },
            range: null,
            rows: 2,
            columns: 2,
            headerRow: false,
            headerColumn: false,
            merged: false,
            cellMerged: false,
          },
        },
        { table },
      ),
    )[0]!;
    expect([cell.channel, cell.label, cell.value]).toEqual(['background', 'Background', 'default']);
  });

  it('activates a tool with one channel by the choice, one with several by channel and choice', () => {
    const single = colorGroups(tools['highlight']!, context());
    const multi = colorGroups(tools['color']!, context());
    expect(colorToolValue(single, 'highlight', 'yellow')).toBe('yellow');
    expect(colorToolValue(multi, 'text', 'default')).toEqual({ channel: 'text', color: 'default' });
  });

  it('renders named radio groups whose items close the menu, with swatches', () => {
    const groups = colorGroups(tools['color']!, context());
    const content = markup(renderColorMenuContent(groups, { choose: () => undefined }));
    expect(content).toContain('<tp-menu-radio-group');
    expect(content).toContain('data-menu-label');
    expect(content).toContain('.closeOnClick=');
    expect(content).toContain('<tp-separator>');
    const letter = markup(renderSwatch('text', 'red'));
    expect(letter).toContain('part="text-editor-swatch"');
    expect(letter).toContain('aria-hidden="true"');
    expect(renderSwatch('text', 'red').values).toEqual(['letter', 'red', 'A']);
    expect(renderSwatch('highlight', 'red').values.slice(0, 2)).toEqual(['fill', 'red']);
  });
});
