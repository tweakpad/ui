import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defineTextEditorBlock,
  defineTextEditorInline,
} from '../../foundation/text-editor/nodes.js';
import type { PartPresentation } from '../../presentation/resolver.js';

const compositions = vi.hoisted(
  () => [] as { host: unknown; owner: unknown; presentation: unknown }[],
);
vi.mock('../../presentation/controller.js', () => ({
  setPartComposition: (host: unknown, owner: unknown, presentation: unknown) =>
    void compositions.push({ host, owner, presentation }),
}));

const { TEXT_EDITOR_CONTENT_SCOPE, TextEditorCustomization } = await import('./customization.js');

// A structural shadow root: elements with children, part attributes and, for library hosts, a
// presentation of their own.

class Node {
  readonly children: Node[] = [];
  constructor(
    readonly localName: string,
    readonly attributes: Record<string, string> = {},
  ) {}
  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }
  add(...nodes: Node[]): this {
    this.children.push(...nodes);
    return this;
  }
}

class Host extends Node {
  readonly presentationController = {};
  partPresentation: PartPresentation = {};
}

function shadow() {
  const button = new Host('tp-button');
  const toggle = new Host('tp-toggle');
  const menu = new Host('tp-menu').add(new Host('tp-menu-item'), new Host('tp-menu-item'));
  // A library host inside the document is the application's, never composed.
  const inContent = new Host('tp-badge');
  const content = new Node('div', { part: 'text-editor-content' }).add(
    new Node('div').add(new Node('p').add(inContent)),
  );
  const root = new Node('#shadow').add(
    new Node('div', { part: 'text-editor' }).add(
      new Node('div', { part: 'text-editor-toolbar' }).add(button, toggle, menu),
      new Node('div', { part: 'text-editor-viewport' }).add(content),
      // An element named like a host without a presentation is no library host.
      new Node('tp-plain'),
    ),
  );
  return { root, button, toggle, menu, inContent };
}

const owner = {};
function customization(root: unknown, adopted: string[] = [], released: string[] = []) {
  return new TextEditorCustomization({
    owner,
    renderRoot: () => root as ShadowRoot,
    adoptStyles: (css) => {
      adopted.push(css);
      return () => void released.push(css);
    },
  });
}

beforeEach(() => {
  compositions.length = 0;
});

describe('uwg-te-req-pres-8: nested controls take the widget’s part presentation', () => {
  it('composes every library host of the chrome once, never one inside the content part', () => {
    const { root, button, toggle, menu, inContent } = shadow();
    const subject = customization(root);
    const presentation: PartPresentation = { 'button-root': { styleHook: { gap: '0' } } };
    subject.compose(presentation);
    expect(compositions.map(({ host }) => (host as Node).localName)).toEqual([
      'tp-button',
      'tp-toggle',
      'tp-menu',
      'tp-menu-item',
      'tp-menu-item',
    ]);
    expect(compositions.every((entry) => entry.owner === owner)).toBe(true);
    expect(compositions.every((entry) => entry.presentation === presentation)).toBe(true);
    expect(compositions.some(({ host }) => host === inContent)).toBe(false);
    expect([button, toggle, menu].every((host) => host.partPresentation)).toBe(true);
    // The same dictionary again composes only hosts that a render added.
    compositions.length = 0;
    subject.compose(presentation);
    expect(compositions).toEqual([]);
    const added = new Host('tp-popover');
    root.children[0]!.add(added);
    subject.compose(presentation);
    expect(compositions.map(({ host }) => host)).toEqual([added]);
  });

  it('a new dictionary replaces the previous one on every host', () => {
    const { root } = shadow();
    const subject = customization(root);
    subject.compose({});
    compositions.length = 0;
    const next: PartPresentation = { 'toggle-root': { styleHook: { color: 'inherit' } } };
    subject.compose(next);
    expect(compositions).toHaveLength(5);
    expect(compositions.every((entry) => entry.presentation === next)).toBe(true);
  });

  it('does nothing before the shadow root exists', () => {
    customization(null).compose({});
    expect(compositions).toEqual([]);
  });
});

describe('uwg-te-req-pres-8: custom node styles are adopted under the content part', () => {
  const callout = defineTextEditorBlock({
    name: 'callout',
    content: 'inline',
    element: 'aside',
    css: '.tp-te-block-callout { padding: var(--tp-space-3); }',
    tool: { label: 'Callout' },
  });
  const mention = defineTextEditorInline({
    name: 'mention',
    element: 'span',
    text: () => '@',
    css: '.tp-te-inline-mention { font-weight: 600; }',
  });

  it('adopts the nested styles once, replaces them when they change and releases them', () => {
    const adopted: string[] = [];
    const released: string[] = [];
    const subject = customization(shadow().root, adopted, released);
    subject.adoptNodeStyles([callout]);
    subject.adoptNodeStyles([callout]);
    expect(adopted).toEqual([
      `${TEXT_EDITOR_CONTENT_SCOPE} {\n.tp-te-block-callout { padding: var(--tp-space-3); }\n}`,
    ]);
    subject.adoptNodeStyles([callout, mention]);
    expect(released).toEqual([adopted[0]]);
    expect(adopted[1]).toContain('.tp-te-inline-mention');
    subject.adoptNodeStyles([]);
    expect(released).toEqual([adopted[0], adopted[1]]);
    expect(adopted).toHaveLength(2);
  });

  it('adopts the styles again after a release, as a reconnection does', () => {
    const adopted: string[] = [];
    const released: string[] = [];
    const subject = customization(shadow().root, adopted, released);
    subject.adoptNodeStyles([mention]);
    subject.release();
    subject.release();
    expect(released).toHaveLength(1);
    subject.adoptNodeStyles([mention]);
    expect(adopted).toHaveLength(2);
    expect(adopted[1]).toBe(adopted[0]);
  });

  it('scopes under the part the family binds the content to', () => {
    expect(TEXT_EDITOR_CONTENT_SCOPE).toBe('[part~="text-editor-content"]');
  });
});
