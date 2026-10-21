import * as core from '@tiptap/core';
import { describe, expect, it } from 'vitest';
import {
  defineTextEditorBlock,
  defineTextEditorInline,
  isSupportedNode,
  type TextEditorNodeDefinition,
} from '../../nodes.js';
import { createTiptapEngine } from './index.js';
import { customNodeExtensions, customNodeView } from './nodes.js';
import type { NodeViewProps } from './schema.js';
import { headlessTiptap, TIPTAP_MODULES, html, htmlOf, mountTiptap } from './tiptap-stubs.test.js';

/** A minimal element for the custom node views, in Node. */
class FakeElement {
  readonly attributes = new Map<string, string>();
  children: unknown[] = [];
  className = '';
  dir = '';
  draggable = true;
  textContent = '';
  constructor(readonly tagName: string) {}
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }
  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
  getAttributeNames(): string[] {
    return [...this.attributes.keys()];
  }
  replaceChildren(...children: unknown[]): void {
    this.children = children;
    this.textContent = '';
  }
}

const fakeView = {
  dom: { ownerDocument: { createElement: (tag: string) => new FakeElement(tag) } },
};

const props = (node: unknown) =>
  ({ node, view: fakeView, HTMLAttributes: {} }) as unknown as NodeViewProps;

const chart = defineTextEditorBlock({
  name: 'chart',
  content: 'none',
  element: 'figure',
  attrs: { series: { type: 'string', default: 'tides' } },
  view: (host, attrs) => {
    host.replaceChildren(`plot of ${String(attrs.series)}` as never);
    return () => calls.push(`cleanup ${String(attrs.series)}`);
  },
  tool: { label: 'Chart' },
});
const callout = defineTextEditorBlock({
  name: 'callout',
  content: 'inline',
  element: 'aside',
  presents: 'callout',
  tool: { label: 'Callout' },
});
const chip = defineTextEditorInline({
  name: 'chip',
  element: 'span',
  attrs: { label: { type: 'string', default: 'pier' } },
  text: (attrs) => `@${String(attrs.label)}`,
});
const broken = defineTextEditorInline({
  name: 'broken',
  element: 'span',
  text: () => 'x',
  view: () => {
    throw new Error('no view');
  },
});
const calls: string[] = [];

describe('Tiptap custom nodes (uwg-te-req-blocks-6, uwg-te-req-inline-1, uwg-te-tab-engine r9)', () => {
  const { state } = headlessTiptap({ blocks: [] }, { nodes: [chart, callout, chip, broken] });
  const { schema } = state;

  it('an atom renders its view in light DOM inside a host that is neither editable nor draggable', () => {
    calls.length = 0;
    const node = schema.nodes['tp-chart']!.create({ series: 'tides' });
    const view = customNodeView(chart)(props(node));
    const host = view.dom as unknown as FakeElement;
    expect(host.tagName).toBe('figure');
    expect(host.className).toBe('tp-te-block-chart');
    expect(host.getAttribute('contenteditable')).toBe('false');
    expect(host.draggable).toBe(false);
    expect(host.dir).toBe('auto');
    expect(host.getAttribute('data-type')).toBe('chart');
    expect(host.getAttribute('data-series')).toBe('tides');
    expect(host.children).toEqual(['plot of tides']);
    expect(view.contentDOM).toBeUndefined();
    // The same values do not render again; new ones clean up and render.
    expect(view.update!(schema.nodes['tp-chart']!.create({ series: 'tides' }))).toBe(true);
    expect(calls).toEqual([]);
    expect(view.update!(schema.nodes['tp-chart']!.create({ series: 'swell' }))).toBe(true);
    expect(calls).toEqual(['cleanup tides']);
    expect(host.children).toEqual(['plot of swell']);
    expect(host.getAttribute('data-series')).toBe('swell');
    view.destroy!();
    expect(calls).toEqual(['cleanup tides', 'cleanup swell']);
    expect(view.ignoreMutation!({ type: 'childList', target: host as unknown as Node })).toBe(true);
  });

  it('an inline node without a view shows its text; a failing view leaves its host empty', () => {
    const view = customNodeView(chip)(props(schema.nodes['tp-chip']!.create({ label: 'quay' })));
    const host = view.dom as unknown as FakeElement;
    expect(host.className).toBe('tp-te-inline-chip');
    expect(host.dir).toBe('');
    expect(host.textContent).toBe('@quay');
    const failing = customNodeView(broken)(props(schema.nodes['tp-broken']!.create()));
    expect((failing.dom as unknown as FakeElement).children).toEqual([]);
  });

  it('a textblock renders its element holding its content, with no view', () => {
    const extension = customNodeExtensions(TIPTAP_MODULES, [callout], {}).extensions[0]!;
    const config = (extension as unknown as { config: Record<string, unknown> }).config;
    expect(config.addNodeView).toBeUndefined();
    expect(config.content).toBe('inline*');
    const node = schema.nodes['tp-callout']!.create({ id: 'b1' });
    expect(node.type.spec).toMatchObject({ draggable: false });
    // Its presentation role adds tp-te-callout to its own class.
    const spec = node.type.spec as { toDOM(node: unknown): unknown };
    const dom = spec.toDOM(node) as [string, Record<string, string>];
    expect(dom[0]).toBe('aside');
    expect(dom[1]).toMatchObject({
      class: 'tp-te-block-callout tp-te-callout',
      'data-type': 'callout',
    });
  });

  it('generated nodes are built once per core module and definition; overrides replace them', () => {
    const first = customNodeExtensions(TIPTAP_MODULES, [chart, chip], {});
    const second = customNodeExtensions(TIPTAP_MODULES, [chart, chip], {});
    expect(second.extensions).toEqual(first.extensions);
    expect(second.extensions[0]).toBe(first.extensions[0]);
    // Engine names live in the adapter's namespace.
    expect(first.names).toEqual({ blocks: ['tp-chart'] });
    const otherCore = { ...TIPTAP_MODULES, core: { ...TIPTAP_MODULES.core } };
    expect(customNodeExtensions(otherCore, [chart], {}).extensions[0]).not.toBe(
      first.extensions[0],
    );
    // An override is installed under the definition's engine name, once per override.
    const override = core.Node.create({ name: 'chart', group: 'block', atom: true });
    const [installed] = customNodeExtensions(TIPTAP_MODULES, [chart], {
      chart: override,
    }).extensions;
    expect(installed!.name).toBe('tp-chart');
    expect((installed as unknown as { parent: unknown }).parent).toBe(override);
    expect(customNodeExtensions(TIPTAP_MODULES, [chart], { chart: override }).extensions[0]).toBe(
      installed,
    );
    // Every valid name is supported, the engine's own names included, as each lives in the
    // adapter's namespace.
    expect(isSupportedNode({ ...chart, name: 'paste' }, {})).toBe(true);
  });

  it('atoms and images are never draggable', () => {
    expect(schema.nodes['tp-chart']!.spec).toMatchObject({ draggable: false, atom: true });
    expect(schema.nodes['tp-chip']!.spec).toMatchObject({ draggable: false, atom: true });
    expect(schema.nodes.image!.spec).toMatchObject({ draggable: false });
  });
});

describe('uwg-te-par-engine-1, uwg-te-req-blocks-6: the custom nodes the Tiptap engine supports', () => {
  it('supportsNode needs a valid name and a textblock, atom or inline kind, else an override for a valid name', () => {
    const engine = createTiptapEngine(TIPTAP_MODULES);
    for (const definition of [chart, callout, chip, { ...chart, name: 'paste' }])
      expect(engine.supportsNode(definition), definition.name).toBe(true);
    const nested = { ...callout, content: 'blocks' } as unknown as TextEditorNodeDefinition;
    const unknownKind = { ...chip, kind: 'mark' } as unknown as TextEditorNodeDefinition;
    const badName = { ...callout, name: 'Call Out' };
    for (const definition of [nested, unknownKind, badName, null])
      expect(engine.supportsNode(definition as TextEditorNodeDefinition)).toBe(false);
    const override = core.Node.create({ name: 'callout', group: 'block', content: 'block+' });
    const overridden = createTiptapEngine(TIPTAP_MODULES, {
      nodes: { callout: override, 'Call Out': override },
    });
    expect(overridden.supportsNode(nested)).toBe(true);
    expect(overridden.supportsNode(badName)).toBe(false);
    expect(Object.isFrozen(overridden.capabilities)).toBe(true);
  });
});

describe('uwg-te-tab-engine r9: custom nodes under engine names', () => {
  it('valid node names that the engine also uses are supported and mount', () => {
    const engine = createTiptapEngine(TIPTAP_MODULES);
    const names = ['paste', 'delete', 'drop', 'keymap', 'commands', 'editable', 'tabindex'];
    for (const name of [...names, 'constructor'])
      expect(
        engine.supportsNode(defineTextEditorInline({ name, element: 'span', text: () => name })),
        name,
      ).toBe(true);
    const paste = defineTextEditorInline({ name: 'paste', element: 'span', text: () => 'pasted' });
    const block = defineTextEditorBlock({
      name: 'commands',
      content: 'inline',
      element: 'aside',
      tool: { label: 'Aside' },
    });
    const source =
      '<aside data-type="commands" data-id="b1">calm</aside><p data-id="p1">a <span data-type="paste"></span> b</p><blockquote data-id="q1">quote</blockquote>';
    const { instance } = mountTiptap({ content: html(source), nodes: [paste, block] });
    const written = htmlOf(instance);
    expect(written).toContain('data-type="commands"');
    expect(written).toContain('data-type="paste"');
    expect(written).toContain('<blockquote data-id="q1"><p>quote</p></blockquote>');
    const json = instance.getContent('json') as {
      content: { type: string; content?: { type: string }[] }[];
    };
    expect(json.content.map((node) => node.type)).toEqual([
      'tp-commands',
      'paragraph',
      'blockquote',
    ]);
    expect(json.content[1]!.content!.map((node) => node.type)).toContain('tp-paste');
    // The native JSON loads back into the same document.
    instance.setContent(instance.getContent('json'), 'json');
    expect(htmlOf(instance)).toBe(written);
  });
});
