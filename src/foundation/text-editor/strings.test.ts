import { describe, expect, it } from 'vitest';
import { fillTemplate } from '../template.js';
import { textEditorTools } from './builtin-tools/index.js';
import { defaultTextEditorLayout } from './layout.js';
import { TEXT_EDITOR_COLORS } from './palette.js';
import { resolveTextEditorStrings, textEditorStrings, type TextEditorStrings } from './strings.js';
import type { TextEditorTool, TextEditorToolContext } from './tools.js';

const STATE: TextEditorToolContext['state'] = {
  version: 0,
  contentVersion: 0,
  editable: true,
  focused: false,
  composing: false,
  empty: true,
  selection: { kind: 'none' },
  marks: {
    bold: 'off',
    italic: 'off',
    underline: 'off',
    strike: 'off',
    code: 'off',
    superscript: 'off',
    subscript: 'off',
    textColor: null,
    highlight: null,
  },
  block: null,
  blockKinds: [],
  align: null,
  link: null,
  table: null,
  caret: null,
  emptyBlock: null,
  history: { undo: false, redo: false },
};

/** Strings that record each key read and fail on a key they do not have. */
function recordingStrings(read: Set<string>): TextEditorStrings {
  return new Proxy(textEditorStrings, {
    get(target, key, receiver) {
      if (typeof key === 'string') {
        read.add(key);
        if (!Object.hasOwn(target, key)) throw new Error(`no string ${key}`);
      }
      return Reflect.get(target, key, receiver) as unknown;
    },
  });
}

const contextual = (member: TextEditorTool['label'] | undefined, context: TextEditorToolContext) =>
  typeof member === 'function' ? member(context) : member;

describe('strings (uwg-te-tab-props r12)', () => {
  it('every label key the built-in tools read exists', () => {
    const read = new Set<string>();
    for (const direction of ['ltr', 'rtl'] as const) {
      const context: TextEditorToolContext = {
        state: STATE,
        imageUpload: true,
        strings: recordingStrings(read),
        surface: 'toolbar',
        target: { kind: 'selection' },
        direction,
        layout: defaultTextEditorLayout,
        table: null,
      };
      for (const tool of Object.values(textEditorTools) as TextEditorTool[]) {
        const label = contextual(tool.label, context);
        expect(typeof label, tool.id).toBe('string');
        expect(label, tool.id).toMatch(/\S/u);
        for (const member of [tool.shortLabel, tool.description]) {
          const value = contextual(member, context);
          if (value !== undefined) expect(value, tool.id).toMatch(/\S/u);
        }
      }
    }
    // Every built-in tool reads its label from the strings, some by direction.
    expect(read.size).toBeGreaterThanOrEqual(Object.keys(textEditorTools).length);
    for (const key of read) expect(Object.hasOwn(textEditorStrings, key), key).toBe(true);
  });

  it('names the sides of columns by the direction of the widget, and of alignment by that of the text', () => {
    const label = (id: string, direction: 'ltr' | 'rtl', textDirection?: 'ltr' | 'rtl') => {
      const tool = (textEditorTools as Readonly<Record<string, TextEditorTool>>)[id]!;
      return contextual(tool.label, {
        state: STATE,
        imageUpload: true,
        strings: textEditorStrings,
        surface: 'table-column',
        target: { kind: 'selection' },
        direction,
        textDirection,
        layout: defaultTextEditorLayout,
        table: null,
      });
    };
    // A left-to-right paragraph in a right-to-left editor aligns to its own sides.
    expect(label('align-start', 'rtl', 'ltr')).toBe(textEditorStrings.alignLeft);
    expect(label('align-end', 'rtl', 'ltr')).toBe(textEditorStrings.alignRight);
    expect(label('align-end', 'ltr', 'rtl')).toBe(textEditorStrings.alignLeft);
    expect(label('table-insert-column-before', 'rtl', 'ltr')).toBe(
      textEditorStrings.tableInsertColumnRight,
    );
    expect(label('table-insert-column-before', 'ltr')).toBe(
      textEditorStrings.tableInsertColumnLeft,
    );
    expect(label('table-insert-column-before', 'rtl')).toBe(
      textEditorStrings.tableInsertColumnRight,
    );
    expect(label('table-insert-column-after', 'ltr')).toBe(
      textEditorStrings.tableInsertColumnRight,
    );
    expect(label('table-move-column-after', 'rtl')).toBe(textEditorStrings.tableMoveColumnLeft);
    expect(label('align-start', 'ltr')).toBe(textEditorStrings.alignLeft);
    expect(label('align-start', 'rtl')).toBe(textEditorStrings.alignRight);
    expect(label('align-end', 'rtl')).toBe(textEditorStrings.alignLeft);
    expect(label('table-insert-row-before', 'rtl')).toBe(textEditorStrings.tableInsertRowBefore);
  });

  it('holds the current key names, none of the replaced ones, and the order of the key groups', () => {
    const keys = Object.keys(textEditorStrings);
    expect(keys.slice(0, 4)).toEqual(['label', 'instructions', 'loading', 'error']);
    for (const key of ['selectionToolbar', 'gutter', 'grip', 'emptyBlockHint', 'taskCheckbox'])
      expect(keys, key).toContain(key);
    for (const key of ['bubble', 'blockActions', 'dragHandle', 'emptyBlockPlaceholder'])
      expect(keys, key).not.toContain(key);
    // Texts that only the live announcer speaks start with `announce`.
    for (const key of [
      'moved',
      'movedMany',
      'deleted',
      'duplicated',
      'selected',
      'pickedUp',
      'dropped',
    ])
      expect(keys, key).not.toContain(key);
    expect(keys.filter((key) => key.startsWith('announce')).length).toBeGreaterThan(10);
    // The palette names, Default first, and the groups of a color menu.
    const palette = ['default', ...TEXT_EDITOR_COLORS].map(
      (name) => `color${name[0]!.toUpperCase()}${name.slice(1)}`,
    );
    expect(keys.filter((key) => /^color[A-Z]/u.test(key))).toEqual(palette);
    for (const key of ['textColor', 'highlight', 'background']) expect(keys).toContain(key);
    // The groups of the default slash menu.
    for (const key of ['groupText', 'groupLists', 'groupInsert']) expect(keys).toContain(key);
  });

  it('is frozen English text with {name} placeholders', () => {
    expect(Object.isFrozen(textEditorStrings)).toBe(true);
    for (const [key, value] of Object.entries(textEditorStrings)) {
      expect(typeof value, key).toBe('string');
      expect(value, key).toMatch(/\S/u);
      for (const [placeholder] of value.matchAll(/\{[^}]*\}/gu))
        expect(placeholder, key).toMatch(/^\{[a-z][A-Za-z]*\}$/u);
    }
    expect(textEditorStrings.tableSize).toBe('{rows} × {columns}');
  });

  it('holds original defaults for the chrome texts', () => {
    expect({
      instructions: textEditorStrings.instructions,
      grip: textEditorStrings.grip,
      emptyBlockHint: textEditorStrings.emptyBlockHint,
      moreTools: textEditorStrings.moreTools,
      copyBlockLink: textEditorStrings.copyBlockLink,
    }).toEqual({
      instructions:
        'A slash (/) opens the command list. Alt+F10 moves focus to the controls for the selection or the current block.',
      grip: 'Move block or open block options',
      emptyBlockHint: 'Start writing',
      moreTools: 'More tools, hidden groups: {count}',
      copyBlockLink: 'Copy block link',
    });
    expect(fillTemplate(textEditorStrings.moreTools, { count: '3' })).toBe(
      'More tools, hidden groups: 3',
    );
  });

  it('no default echoes the wording of other editors', () => {
    const avoided = [
      'for commands',
      'for options',
      'drag to move',
      'click to open',
      'hold for drag',
      'copy link to block',
    ];
    for (const [key, text] of Object.entries(textEditorStrings))
      for (const phrase of avoided) expect(text.toLowerCase(), key).not.toContain(phrase);
  });

  it('resolves overrides of defined string keys', () => {
    expect(resolveTextEditorStrings()).toBe(textEditorStrings);
    expect(resolveTextEditorStrings(null)).toBe(textEditorStrings);
    expect(resolveTextEditorStrings({})).toBe(textEditorStrings);
    expect(resolveTextEditorStrings({ bold: textEditorStrings.bold })).toBe(textEditorStrings);
    const resolved = resolveTextEditorStrings({
      bold: 'Fett',
      taskCheckbox: 'Erledigt',
      italic: undefined,
      label: 7 as unknown as string,
      unknownKey: 'x',
    } as unknown as Partial<TextEditorStrings>);
    expect(resolved.bold).toBe('Fett');
    expect(resolved.taskCheckbox).toBe('Erledigt');
    expect(resolved.italic).toBe(textEditorStrings.italic);
    expect(resolved.label).toBe(textEditorStrings.label);
    expect(Object.keys(resolved)).toEqual(Object.keys(textEditorStrings));
    expect(Object.isFrozen(resolved)).toBe(true);
    expect(textEditorStrings.bold).toBe('Bold');
  });
});
