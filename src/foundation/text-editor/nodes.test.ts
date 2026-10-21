import { describe, expect, it } from 'vitest';
import { textEditorTools } from './builtin-tools.js';
import {
  defineTextEditorBlock,
  defineTextEditorInline,
  isSupportedNode,
  RESERVED_NODE_NAMES,
  type TextEditorBlockInit,
  type TextEditorInlineInit,
} from './nodes.js';

const block = (members: Partial<Record<keyof TextEditorBlockInit, unknown>> = {}) =>
  defineTextEditorBlock({
    name: 'callout',
    content: 'inline',
    element: 'aside',
    tool: { label: 'Callout' },
    ...members,
  } as TextEditorBlockInit);

const inline = (members: Partial<Record<keyof TextEditorInlineInit, unknown>> = {}) =>
  defineTextEditorInline({
    name: 'mention',
    element: 'span',
    text: () => '@crew',
    ...members,
  } as TextEditorInlineInit);

const RESERVED = [
  'doc',
  'root',
  'text',
  'hard-break',
  'paragraph',
  'heading',
  'quote',
  'code',
  'list',
  'list-item',
  'list-bullet',
  'list-ordered',
  'list-task',
  'task',
  'divider',
  'image',
  'table',
  'table-row',
  'table-cell',
  'table-header',
  'cursor',
];

describe('node definitions (uwg-te-req-blocks-6, uwg-te-req-inline-1, uwg-te-req-inline-2)', () => {
  it('V-413: valid definitions come back frozen', () => {
    const tone = { type: 'enum', values: ['note', 'tip', 'warning'], default: 'note' } as const;
    const serialize = ({ markdown }: { markdown: string }) => `> ${markdown}`;
    const text = ({ text: content }: { text: string }) => content;
    const keywords = ['aside', 'note'];
    const callout = defineTextEditorBlock({
      name: 'callout',
      content: 'inline',
      element: 'aside',
      attrs: { tone, title: { type: 'string', default: null } },
      markdown: { serialize },
      text,
      css: '.callout { margin: 0; }',
      tool: { label: 'Callout', description: 'A boxed note', keywords },
    });
    expect(callout).toEqual({
      kind: 'block',
      name: 'callout',
      content: 'inline',
      element: 'aside',
      attrs: { tone, title: { type: 'string', default: null } },
      markdown: { serialize },
      text,
      css: '.callout { margin: 0; }',
      tool: { label: 'Callout', description: 'A boxed note', keywords },
    });
    for (const part of [
      callout,
      callout.attrs,
      callout.attrs.tone,
      callout.attrs.tone.values,
      callout.attrs.title,
      callout.markdown,
      callout.tool,
      callout.tool.keywords,
    ])
      expect(Object.isFrozen(part)).toBe(true);
    // The definition holds copies: the inputs stay as they were.
    expect(Object.isFrozen(tone)).toBe(false);
    expect(Object.isFrozen(keywords)).toBe(false);
    expect(callout.attrs.tone).not.toBe(tone);

    const embed = defineTextEditorBlock({
      name: 'embed',
      content: 'none',
      element: 'figure',
      attrs: { url: { type: 'string', default: null }, height: { type: 'number', default: 240 } },
      view: (host) => {
        host.textContent = 'embed';
      },
      tool: { label: 'Embed' },
    });
    expect(embed.kind).toBe('block');
    expect(embed.content).toBe('none');
    expect(Object.isFrozen(embed)).toBe(true);
    // An atom may be written as a void element, and a block without attributes has none.
    expect(
      defineTextEditorBlock({
        name: 'pin',
        content: 'none',
        element: 'img',
        tool: { label: 'Pin' },
      }).attrs,
    ).toEqual({});

    interface Person {
      readonly id: string;
      readonly name: string;
    }
    const source = () => [] as Person[];
    const mention = defineTextEditorInline({
      name: 'mention',
      element: 'span',
      // An inline node may have an `id` attribute: only a block's `id` is its HTML identifier.
      attrs: { id: { type: 'string', default: null }, active: { type: 'boolean', default: false } },
      text: (attrs) => `@${attrs.id ?? ''}`,
      markdown: { serialize: (attrs) => `@${attrs.id ?? ''}` },
      suggest: {
        trigger: '@',
        source,
        label: (person: Person) => person.name,
        attrs: (person: Person) => ({ id: person.id }),
      },
    });
    expect(mention.kind).toBe('inline');
    expect(mention.suggest?.trigger).toBe('@');
    expect(mention.suggest?.source).toBe(source);
    expect(mention.tool).toBeUndefined();
    for (const part of [
      mention,
      mention.attrs,
      mention.attrs.id,
      mention.markdown,
      mention.suggest,
    ])
      expect(Object.isFrozen(part)).toBe(true);
    // A fullwidth or other single character is a trigger too.
    expect(
      inline({ suggest: { trigger: '＃', source, label: String, attrs: () => ({}) } }).suggest
        ?.trigger,
    ).toBe('＃');
  });

  it('V-413: names outside the pattern, reserved names and built-in tool identifiers throw', () => {
    for (const name of [
      'Callout',
      '1x',
      'my_node',
      '',
      '-callout',
      'call out',
      'callout!',
      7,
      undefined,
    ]) {
      expect(() => block({ name }), String(name)).toThrow(TypeError);
      expect(() => inline({ name }), String(name)).toThrow(TypeError);
    }
    expect([...RESERVED_NODE_NAMES]).toEqual(RESERVED);
    for (const name of RESERVED) {
      expect(() => block({ name }), name).toThrow(TypeError);
      expect(() => inline({ name }), name).toThrow(TypeError);
    }
    for (const name of ['bold', 'slash', 'table-merge-cells', ...Object.keys(textEditorTools)]) {
      expect(() => block({ name }), name).toThrow(TypeError);
      expect(() => inline({ name }), name).toThrow(TypeError);
    }
    // Names that only resemble a reserved name or a tool are free.
    for (const name of ['callout', 'headings', 'my-node', 'x1', 'table-of-contents'])
      expect(block({ name }).name).toBe(name);
  });

  it('V-413: invalid attribute specs and defaults outside an enum throw', () => {
    const invalid: unknown[] = [
      null,
      'string',
      {},
      { type: 'text', default: '' },
      { type: 'string' },
      { type: 'string', default: 3 },
      { type: 'number', default: '3' },
      { type: 'number', default: Number.NaN },
      { type: 'number', default: Number.POSITIVE_INFINITY },
      { type: 'boolean', default: null },
      { type: 'boolean', default: 'true' },
      { type: 'enum', values: [], default: 'a' },
      { type: 'enum', values: ['a', 'a'], default: 'a' },
      { type: 'enum', values: ['a', 1], default: 'a' },
      { type: 'enum', values: 'a', default: 'a' },
      { type: 'enum', values: ['a', 'b'], default: 'c' },
      { type: 'enum', values: ['a', 'b'] },
    ];
    for (const spec of invalid) {
      expect(() => block({ attrs: { tone: spec } }), JSON.stringify(spec)).toThrow(TypeError);
      expect(() => inline({ attrs: { tone: spec } }), JSON.stringify(spec)).toThrow(TypeError);
    }
    expect(() => block({ attrs: [] })).toThrow(TypeError);
    expect(() => block({ attrs: 'tone' })).toThrow(TypeError);
    // Attribute names survive as lowercase `data-` attributes.
    for (const name of ['Tone', 'my_tone', '1st', 'data tone', ''])
      expect(() => block({ attrs: { [name]: { type: 'string', default: null } } }), name).toThrow(
        TypeError,
      );
    // Valid specs of each type.
    const valid = block({
      attrs: {
        title: { type: 'string', default: 'Note' },
        size: { type: 'number', default: null },
        open: { type: 'boolean', default: true },
        tone: { type: 'enum', values: ['note', 'tip'], default: 'tip' },
        'data-level': { type: 'number', default: 2 },
      },
    });
    expect(Object.keys(valid.attrs)).toEqual(['title', 'size', 'open', 'tone', 'data-level']);
  });

  it('V-413: attributes named type, or id in a block, throw', () => {
    const spec = { type: 'string', default: null };
    expect(() => block({ attrs: { type: spec } })).toThrow(TypeError);
    expect(() => block({ attrs: { id: spec } })).toThrow(TypeError);
    expect(() => inline({ attrs: { type: spec } })).toThrow(TypeError);
    expect(inline({ attrs: { id: spec } }).attrs.id).toEqual(spec);
  });

  it('V-478: an inline definition comes back frozen with its defaults; invalid ones throw a TypeError', () => {
    const attrs = {
      id: { type: 'string', default: null },
      label: { type: 'string', default: 'crew' },
      count: { type: 'number', default: 2 },
      pinned: { type: 'boolean', default: false },
      tone: { type: 'enum', values: ['plain', 'loud'], default: 'loud' },
    } as const;
    const suggest = { trigger: '@', source: () => [], label: String, attrs: () => ({}) };
    const mention = defineTextEditorInline({
      name: 'mention',
      element: 'span',
      attrs,
      text: ({ label }) => `@${label ?? ''}`,
      suggest,
    });
    expect(mention.kind).toBe('inline');
    expect(Object.isFrozen(mention)).toBe(true);
    expect(Object.isFrozen(mention.attrs)).toBe(true);
    // Every default is kept, `null` included, and the input stays unfrozen.
    expect(
      Object.fromEntries(Object.entries(mention.attrs).map(([key, spec]) => [key, spec.default])),
    ).toEqual({ id: null, label: 'crew', count: 2, pinned: false, tone: 'loud' });
    expect(mention.attrs.tone.values).toEqual(['plain', 'loud']);
    expect(Object.isFrozen(attrs.tone)).toBe(false);
    // An attribute named `id` is accepted on an inline node; one named `type` throws.
    expect(mention.attrs.id).toEqual({ type: 'string', default: null });
    expect(() => inline({ attrs: { type: { type: 'string', default: null } } })).toThrow(TypeError);
    // Names outside the pattern, reserved names and built-in tool identifiers throw.
    for (const name of ['Mention', 'at_mention', '', 'doc', 'text', 'cursor', 'bold', 'slash'])
      expect(() => inline({ name }), name).toThrow(TypeError);
    // No text, or a suggestion without its trigger or source, throws.
    expect(() => inline({ text: undefined })).toThrow(TypeError);
    for (const member of ['trigger', 'source'])
      expect(() => inline({ suggest: { ...suggest, [member]: undefined } }), member).toThrow(
        TypeError,
      );
  });

  it('rejects other invalid members with a TypeError', () => {
    for (const init of [null, undefined, 'callout', [], 3])
      expect(() => defineTextEditorBlock(init as unknown as TextEditorBlockInit)).toThrow(
        TypeError,
      );
    expect(() => defineTextEditorInline(null as unknown as TextEditorInlineInit)).toThrow(
      TypeError,
    );
    // Content, element, tool and the member types of a block.
    for (const content of ['block', undefined, 'text'])
      expect(() => block({ content })).toThrow(TypeError);
    for (const element of [
      'Aside',
      'my element',
      '',
      undefined,
      'li',
      'td',
      'script',
      'style',
      'ul',
      'template',
    ])
      expect(() => block({ element }), String(element)).toThrow(TypeError);
    expect(() => block({ element: 'img' })).toThrow(TypeError);
    expect(() => block({ element: 'hr' })).toThrow(TypeError);
    expect(block({ element: 'my-callout' }).element).toBe('my-callout');
    for (const tool of [undefined, null, {}, { label: '' }, { label: ' ' }, { label: 3 }])
      expect(() => block({ tool }), JSON.stringify(tool)).toThrow(TypeError);
    expect(() => block({ tool: { label: 'Callout', description: 3 } })).toThrow(TypeError);
    expect(() => block({ tool: { label: 'Callout', keywords: 'note' } })).toThrow(TypeError);
    expect(() => block({ tool: { label: 'Callout', icon: { paths: [] } } })).toThrow(TypeError);
    expect(() => block({ markdown: {} })).toThrow(TypeError);
    expect(() => block({ markdown: { serialize: () => '', parse: 'alert' } })).toThrow(TypeError);
    expect(() => block({ text: 'callout' })).toThrow(TypeError);
    expect(() => block({ css: 7 })).toThrow(TypeError);
    // A block presents a callout or nothing.
    for (const presents of ['alert', 'Callout', 3, null])
      expect(() => block({ presents }), String(presents)).toThrow(TypeError);
    expect(block({ presents: 'callout' }).presents).toBe('callout');
    expect(block({})).not.toHaveProperty('presents');
    // Only an atom renders a view.
    expect(() => block({ view: () => undefined })).toThrow(TypeError);
    expect(() => block({ content: 'none', element: 'figure', view: 'embed' })).toThrow(TypeError);

    // An inline node needs its text and an element that keeps it inside a paragraph.
    expect(() => inline({ text: undefined })).toThrow(TypeError);
    expect(() => inline({ text: '@crew' })).toThrow(TypeError);
    for (const element of ['div', 'p', 'figure', 'h2', 'section', 'pre'])
      expect(() => inline({ element }), element).toThrow(TypeError);
    for (const element of ['span', 'abbr', 'img', 'time', 'data'])
      expect(inline({ element }).element).toBe(element);
    expect(() => inline({ markdown: { serialize: 'crew' } })).toThrow(TypeError);
    expect(() => inline({ tool: { label: '' } })).toThrow(TypeError);
    // A suggestion needs one trigger character, a source, a label and attributes.
    const suggestion = { trigger: '@', source: () => [], label: String, attrs: () => ({}) };
    expect(inline({ suggest: suggestion }).suggest?.trigger).toBe('@');
    for (const trigger of ['', '@@', ' ', 7, undefined])
      expect(() => inline({ suggest: { ...suggestion, trigger } }), String(trigger)).toThrow(
        TypeError,
      );
    for (const member of ['source', 'label', 'attrs'])
      expect(() => inline({ suggest: { ...suggestion, [member]: undefined } }), member).toThrow(
        TypeError,
      );
    expect(() => inline({ suggest: { ...suggestion, description: 'x' } })).toThrow(TypeError);
    expect(() => inline({ suggest: '@' })).toThrow(TypeError);
  });
});

describe('node support of an engine adapter (uwg-te-par-engine-1, uwg-te-req-engine-2)', () => {
  const override = Object.freeze({});

  it('supports a textblock, an atom block and an inline node with a valid name', () => {
    expect(isSupportedNode(block(), {})).toBe(true);
    expect(isSupportedNode(block({ content: 'none' }), {})).toBe(true);
    expect(isSupportedNode(inline(), {})).toBe(true);
    // Every valid name, the names of an engine's own properties included.
    expect(isSupportedNode({ kind: 'inline', name: 'constructor' }, {})).toBe(true);
    expect(isSupportedNode({ kind: 'block', name: 'paste', content: 'inline' }, {})).toBe(true);
  });

  it('supports any other definition only through an override under its valid name', () => {
    const nested = { kind: 'block', name: 'panel', content: 'blocks' };
    expect(isSupportedNode(nested, {})).toBe(false);
    expect(isSupportedNode(nested, { panel: override })).toBe(true);
    expect(isSupportedNode(nested, { other: override })).toBe(false);
  });

  it('never supports a definition without a valid name, an override notwithstanding', () => {
    const invalid: unknown[] = [
      { kind: 'block', name: 'Bad Name', content: 'inline' },
      { kind: 'block', content: 'inline' },
      { kind: 'inline', name: 7 },
      { kind: 'inline', name: '' },
      null,
      undefined,
      'callout',
    ];
    for (const definition of invalid) {
      expect(isSupportedNode(definition, {}), JSON.stringify(definition)).toBe(false);
      expect(
        isSupportedNode(definition, { 'Bad Name': override, undefined: override, '7': override }),
        JSON.stringify(definition),
      ).toBe(false);
    }
  });

  it('reads an override only from an own property of the overrides', () => {
    const inherited = Object.create({ panel: override }) as Record<string, unknown>;
    expect(isSupportedNode({ kind: 'block', name: 'panel', content: 'blocks' }, inherited)).toBe(
      false,
    );
  });
});
