import { describe, expect, it } from 'vitest';
import type { CommandGroup, CommandItem } from '../../../components/command-palette/model.js';
import { textEditorTools } from '../../../foundation/text-editor/builtin-tools.js';
import { BASE_CAPABILITIES } from '../../../foundation/text-editor/capabilities.js';
import { defaultTextEditorLayout } from '../../../foundation/text-editor/layout.js';
import {
  defineTextEditorBlock,
  defineTextEditorInline,
} from '../../../foundation/text-editor/nodes.js';
import { preReadyState } from '../../../foundation/text-editor/state.js';
import { textEditorStrings } from '../../../foundation/text-editor/strings.js';
import {
  defineTextEditorTool,
  resolveTextEditorTools,
  type TextEditorToolContext,
} from '../../../foundation/text-editor/tools.js';
import {
  commandEntriesKey,
  commandMatchFields,
  isSuggestionEntryValue,
  slashEntries,
  suggestionEntries,
  toolCommandItem,
} from './commands.js';

const stamp = defineTextEditorBlock({
  name: 'stamp',
  content: 'none',
  element: 'figure',
  tool: { label: 'Stamp' },
});
const tag = defineTextEditorInline({
  name: 'tag',
  element: 'span',
  attrs: { label: { type: 'string', default: 'tag' } },
  text: (attrs) => `#${attrs.label ?? ''}`,
  tool: { label: 'Tag' },
});

const registry = resolveTextEditorTools({
  builtins: textEditorTools,
  nodes: [stamp, tag],
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
    'block.stamp',
    'inline.tag',
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

  it('offers only inline entries in a table cell (uwg-te-req-tools-5)', () => {
    const values = (groups: ReturnType<typeof slashEntries>) =>
      groups.flatMap((group) =>
        ((group as CommandGroup).items as CommandItem[]).map((item) => item.value),
      );
    const layout = [
      ['paragraph', 'heading-1', 'blockquote'],
      ['bullet-list'],
      ['image', 'divider'],
      ['stamp', 'tag', 'callout'],
    ];
    expect(values(slashEntries(layout, input()))).toEqual([
      'paragraph',
      'heading-1',
      'blockquote',
      'bullet-list',
      'image',
      'divider',
      'stamp',
      'tag',
      'callout',
    ]);
    // Block tools, block inserts and atoms leave; the inline node and the application's tool stay.
    expect(values(slashEntries(layout, input(true)))).toEqual(['tag', 'callout']);
    // The default layout, table included, offers nothing in a cell: the list shows its empty state.
    const defaults = resolveTextEditorTools({
      builtins: textEditorTools,
      capabilities: new Set([...BASE_CAPABILITIES, 'block.table'] as never[]),
    });
    expect(
      slashEntries(defaultTextEditorLayout.slash, { ...input(true), registry: defaults }),
    ).toEqual([]);
  });

  it('describes every built-in entry of the default layout, its description a match field', () => {
    const defaults = resolveTextEditorTools({
      builtins: textEditorTools,
      capabilities: new Set([...BASE_CAPABILITIES, 'block.table'] as never[]),
    });
    const items = slashEntries(defaultTextEditorLayout.slash, {
      ...input(),
      registry: defaults,
    }).flatMap((group) => (group as CommandGroup).items as CommandItem[]);
    expect(items.map((item) => item.value)).toEqual([
      'paragraph',
      'heading-1',
      'heading-2',
      'heading-3',
      'blockquote',
      'code-block',
      'bullet-list',
      'ordered-list',
      'task-list',
      'table',
      'image',
      'divider',
    ]);
    for (const item of items) {
      expect(item.description, String(item.value)).toMatch(/\S/u);
      expect(commandMatchFields(item), String(item.value)).toContain(item.description);
    }
    const ordered = items.find((item) => item.value === 'ordered-list')!;
    expect(ordered.description).toBe(textEditorStrings.orderedListDescription);
    expect(ordered.partContract?.hostProperties).toMatchObject({
      'aria-description': textEditorStrings.orderedListDescription,
    });
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

describe('slash entries key', () => {
  it('is equal for entries that render alike and differs when one would render otherwise', () => {
    const icon = { name: 'a', paths: [] };
    const entries = (label: string, disabled = false, ownIcon: object = icon) => [
      {
        type: 'group' as const,
        label: 'Text',
        items: [{ value: 'paragraph', label, icon: ownIcon, ...(disabled ? { disabled } : {}) }],
      },
    ];
    expect(commandEntriesKey(entries('Paragraph') as never)).toBe(
      commandEntriesKey(entries('Paragraph') as never),
    );
    expect(commandEntriesKey(entries('Paragraph') as never)).not.toBe(
      commandEntriesKey(entries('Text') as never),
    );
    expect(commandEntriesKey(entries('Paragraph') as never)).not.toBe(
      commandEntriesKey(entries('Paragraph', true) as never),
    );
    // Icons count by identity, not by their content.
    expect(commandEntriesKey(entries('Paragraph') as never)).not.toBe(
      commandEntriesKey(entries('Paragraph', false, { name: 'a', paths: [] }) as never),
    );
  });
});
