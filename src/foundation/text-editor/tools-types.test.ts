/**
 * Typed tool definitions, checked by the type check (`npm run typecheck`; Widgets
 * `uwg-te-par-tools-1`).
 *
 * One tool of each kind, written as an application writes it against the public entry, with
 * function-valued members wherever the type takes a function: valid definitions type-check, and
 * an unknown kind or surface identity is a type error. Vitest does not type-check, so the runtime
 * cases only show that the definitions come back unchanged and resolve in a registry.
 */
import { describe, expect, it } from 'vitest';
import { textEditorTools } from './builtin-tools.js';
import {
  defineTextEditorTool,
  textEditorStrings,
  type TextEditorAction,
  type TextEditorColorToolValue,
  type TextEditorImageToolValue,
  type TextEditorLinkToolValue,
  type TextEditorSurface,
  type TextEditorTableSizeToolValue,
  type TextEditorTool,
  type TextEditorToolContext,
  type TextEditorToolKind,
} from './index.js';
import { BASE_CAPABILITIES, OPTIONAL_CAPABILITIES } from './capabilities.js';
import { resolveTextEditorTools } from './tools.js';

const stamp = { viewBox: '0 0 24 24', paths: [{ d: 'M4 4h16v16H4z' }] } as const;
const label = ({ strings }: TextEditorToolContext) => `${strings.taskCheckbox} stamp`;
const inParagraph = ({ state }: TextEditorToolContext) => state.block?.kind === 'paragraph';

/** One tool of each kind; `satisfies` makes a missing or an extra kind a type error. */
const TOOLS = {
  button: defineTextEditorTool({
    id: 'stamp-date',
    kind: 'button',
    label,
    shortLabel: () => 'Date',
    description: ({ direction }) => (direction === 'rtl' ? 'Stamp, right to left' : 'Stamp'),
    icon: ({ surface }) => (surface === 'slash' ? stamp : undefined),
    tone: 'default',
    display: 'icon-label',
    surfaces: ['toolbar', 'slash', 'block-menu'],
    group: 'insert',
    keywords: ['today', 'date'],
    shortcut: ['Mod+Shift+d', 'Alt+d'],
    requires: ['block.paragraph'],
    action: ({ value }): TextEditorAction => ({ type: 'text.insert', text: String(value ?? '') }),
    isEnabled: inParagraph,
    isVisible: ({ layout }) => layout.toolbar.length > 0,
  }),
  toggle: defineTextEditorTool({
    id: 'stamp-bold',
    kind: 'toggle',
    label: 'Bold stamp',
    action: { type: 'mark.toggle', mark: 'bold' },
    isActive: ({ state }) => state.marks.bold === 'on',
    surfaces: ['selection-toolbar'],
  }),
  menu: defineTextEditorTool({
    id: 'stamp-menu',
    kind: 'menu',
    label: 'Stamps',
    trigger: 'label',
    items: ({ table }) => (table ? ['stamp-date'] : [['stamp-date', 'stamp-bold'], 'stamp-link']),
    surfaces: ['toolbar', 'table-cell'],
  }),
  'radio-menu': defineTextEditorTool({
    id: 'stamp-level',
    kind: 'radio-menu',
    label: 'Stamp level',
    display: 'inline',
    trigger: 'active-label',
    items: ['stamp-date', 'stamp-bold'],
    surfaces: ['turn-into'],
  }),
  color: defineTextEditorTool({
    id: 'stamp-color',
    kind: 'color',
    label: 'Stamp color',
    channel: ['text', 'highlight'],
    action: ({ value }): readonly TextEditorAction[] => {
      const { channel, color } = value as TextEditorColorToolValue;
      const mark = channel === 'text' ? 'text-color' : 'highlight';
      return channel === 'background'
        ? []
        : [{ type: 'mark.color', mark, color: color === 'default' ? null : color }];
    },
    surfaces: ['selection-toolbar'],
  }),
  link: defineTextEditorTool({
    id: 'stamp-link',
    kind: 'link',
    label: 'Stamp link',
    action: ({ value }) => ({
      type: 'link.set',
      href: (value as TextEditorLinkToolValue).href,
    }),
    isActive: ({ state }) => state.link !== null,
  }),
  image: defineTextEditorTool({
    id: 'stamp-image',
    kind: 'image',
    label: 'Stamp image',
    action: ({ value }) => {
      const { src, alt } = value as TextEditorImageToolValue;
      return { type: 'blocks.insert', kind: 'image', attrs: { src, alt } };
    },
  }),
  'table-size': defineTextEditorTool({
    id: 'stamp-table',
    kind: 'table-size',
    label: 'Stamp table',
    requires: ['block.table'],
    action: ({ value }) => {
      const { rows, columns } = value as TextEditorTableSizeToolValue;
      return { type: 'blocks.insert', kind: 'table', attrs: { rows, columns } };
    },
    surfaces: ['slash'],
  }),
  suggestion: defineTextEditorTool({
    id: 'stamp-suggest',
    kind: 'suggestion',
    label: 'Stamps',
    suggest: {
      trigger: '!',
      label: (item) => String(item),
      description: (item) => `Stamp ${String(item)}`,
    },
    source: ({ query, signal }) =>
      signal.aborted
        ? []
        : Promise.resolve(['date', 'time'].filter((item) => item.startsWith(query))),
    action: ({ value }) =>
      value === undefined ? null : { type: 'text.insert', text: String(value) },
  }),
  custom: defineTextEditorTool({
    id: 'stamp-custom',
    kind: 'custom',
    label: 'Custom stamp',
    tone: 'destructive',
    render: ({ state }) => (state.editable ? 'editable' : 'read-only'),
    action: () => undefined,
  }),
} satisfies Record<TextEditorToolKind, TextEditorTool>;

// An unknown kind or surface identity is a type error.
defineTextEditorTool({
  id: 'stamp-unknown-kind',
  // @ts-expect-error `slider` is no tool kind.
  kind: 'slider',
  label: 'Slider',
});
defineTextEditorTool({
  id: 'stamp-unknown-surface',
  kind: 'button',
  label: 'Sidebar',
  // @ts-expect-error `sidebar` is no surface.
  surfaces: ['toolbar', 'sidebar'],
});
// @ts-expect-error `gutter` reports a request but places no tools.
const placed: TextEditorSurface = 'gutter';
// A function-valued member must take the context and return the member's type.
defineTextEditorTool({
  id: 'stamp-wrong-label',
  kind: 'button',
  // @ts-expect-error a label function returns a string.
  label: () => 3,
});
defineTextEditorTool({
  id: 'stamp-wrong-action',
  kind: 'button',
  label: 'Wrong action',
  // @ts-expect-error an action function returns actions.
  action: () => ({ type: 'mark.blink' }),
});

describe('typed tool definitions (uwg-te-par-tools-1)', () => {
  it('V-156: defines one tool of each kind, returned unchanged', () => {
    expect(Object.keys(TOOLS)).toHaveLength(10);
    for (const [kind, tool] of Object.entries(TOOLS)) expect(tool.kind).toBe(kind);
    expect(placed).toBe('gutter');
  });

  it('resolves the definitions in a registry beside the built-in tools', () => {
    const registry = resolveTextEditorTools({
      builtins: textEditorTools,
      tools: Object.values(TOOLS),
      capabilities: new Set([...BASE_CAPABILITIES, ...OPTIONAL_CAPABILITIES]),
    });
    expect(registry.diagnostics).toEqual([]);
    for (const tool of Object.values(TOOLS)) {
      expect(registry.tools.get(tool.id)).toBe(tool);
      expect(registry.isAvailable(tool.id)).toBe(true);
    }
    expect(typeof TOOLS.button.label === 'function' && textEditorStrings.taskCheckbox).toBeTruthy();
  });
});
