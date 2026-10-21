import { describe, expect, it } from 'vitest';
import type { CommandGroup, CommandItem } from '../../../components/command-palette/model.js';
import { textEditorTools } from '../../../foundation/text-editor/builtin-tools.js';
import { BASE_CAPABILITIES } from '../../../foundation/text-editor/capabilities.js';
import { defaultTextEditorLayout } from '../../../foundation/text-editor/layout.js';
import { preReadyState } from '../../../foundation/text-editor/state.js';
import { textEditorStrings } from '../../../foundation/text-editor/strings.js';
import {
  defineTextEditorTool,
  resolveTextEditorTools,
  type TextEditorToolContext,
} from '../../../foundation/text-editor/tools.js';
import {
  commandMatchFields,
  isSuggestionEntryValue,
  slashEntries,
  suggestionEntries,
  toolCommandItem,
} from './commands.js';

const registry = resolveTextEditorTools({
  builtins: textEditorTools,
  tools: [
    defineTextEditorTool({
      id: 'callout',
      kind: 'button',
      label: 'Callout',
      description: 'A highlighted note',
      keywords: ['note'],
      surfaces: ['slash'],
      action: [],
    }),
  ],
  capabilities: new Set([
    ...BASE_CAPABILITIES,
    'block.heading',
    'block.list-bullet',
    'block.image',
  ] as never[]),
});

const context = (inTable = false): TextEditorToolContext => ({
  state: {
    ...preReadyState({ editable: true, empty: false }),
    ...(inTable
      ? {
          table: {
            id: 't',
            cell: { row: 0, column: 0 },
            range: null,
            rows: 1,
            columns: 1,
            headerRow: false,
            headerColumn: false,
            merged: false,
            cellMerged: false,
          },
        }
      : {}),
  },
  strings: textEditorStrings,
  surface: 'slash',
  target: { kind: 'selection' },
  direction: 'ltr',
  layout: defaultTextEditorLayout,
  table: null,
});

describe('slash menu entries (uwg-te-req-surfaces-2)', () => {
  const input = (inTable = false) => ({
    registry,
    context: context(inTable),
    enabled: (tool: { id: string }) => tool.id !== 'heading-1',
    shortcut: (id: string) =>
      id === 'paragraph' ? { aria: 'Control+Alt+0', display: 'Ctrl+Alt+0', keys: [] } : undefined,
  });

  it('lists the available tools of the layout in groups named by their tool group', () => {
    const groups = slashEntries(
      [
        ['paragraph', 'heading-1', 'blockquote'],
        ['bullet-list', 'ordered-list'],
        ['image', 'table'],
        ['callout'],
      ],
      input(),
    ) as CommandGroup[];
    expect(groups.map((group) => group.label)).toEqual(['Text', 'Lists', 'Insert', undefined]);
    const items = groups.map((group) => (group.items as CommandItem[]).map((item) => item.value));
    // A tool without its engine capability is left out (table).
    expect(items).toEqual([
      ['paragraph', 'heading-1', 'blockquote'],
      ['bullet-list', 'ordered-list'],
      ['image'],
      ['callout'],
    ]);
    const [paragraph, heading] = groups[0]!.items as CommandItem[];
    expect(paragraph).toMatchObject({ text: 'Paragraph', shortcut: 'Ctrl+Alt+0' });
    expect(heading!.disabled).toBe(true);
    const callout = groups[3]!.items[0] as CommandItem;
    expect(callout).toMatchObject({ description: 'A highlighted note', keywords: ['note'] });
    expect(commandMatchFields(callout)).toEqual(['note', 'A highlighted note']);
  });

  it('offers only inline entries in a table cell', () => {
    const groups = slashEntries([['paragraph', 'heading-1'], ['image']], input(true));
    expect(
      groups.flatMap((group) =>
        ((group as CommandGroup).items as CommandItem[]).map((item) => item.value),
      ),
    ).toEqual(['image']);
  });

  it('projects one tool as a command item', () => {
    const item = toolCommandItem(registry.tools.get('callout')!, context(), true, undefined);
    expect(item.value).toBe('callout');
    expect(item.partContract?.hostProperties).toMatchObject({
      'aria-description': 'A highlighted note',
    });
  });
});

describe('suggestion entries (uwg-te-req-inline-2)', () => {
  it('keys each item by its position in the result and labels it through the tool', () => {
    const tool = defineTextEditorTool({
      id: 'mention',
      kind: 'suggestion',
      label: 'Mention',
      surfaces: [],
      suggest: {
        trigger: '@',
        label: (item: unknown) => (item as { name: string }).name,
        description: (item: unknown) => (item as { team: string }).team,
      },
    });
    const people = [
      { name: 'Ada', team: 'Platform' },
      { name: 'Ada', team: 'Research' },
    ];
    const entries = suggestionEntries(tool, people);
    expect(entries.map((entry) => entry.text)).toEqual(['Ada', 'Ada']);
    expect(entries.map((entry) => entry.description)).toEqual(['Platform', 'Research']);
    expect(entries[1]!.value).toEqual({ index: 1, item: people[1] });
    expect(isSuggestionEntryValue(entries[0]!.value)).toBe(true);
    expect(isSuggestionEntryValue('paragraph')).toBe(false);
    expect(commandMatchFields(null)).toEqual([]);
  });
});
