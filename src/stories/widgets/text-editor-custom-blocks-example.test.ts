import { describe, expect, it } from 'vitest';
import { calloutBlock, embedBlock, embedSource } from './text-editor-custom-blocks-example.js';
import { createEngine as tiptapEngine } from './text-editor-engine.js';
import { createEngine as lexicalEngine } from './text-editor-lexical-engine.js';
import { textEditorExamples, textEditorStorySources } from './text-editor.examples.js';
import { customBlockNotes } from './text-editor-samples.js';

/** A host element whose document creates recording elements. */
function host() {
  const children: Record<string, unknown>[] = [];
  const element = {
    textContent: '',
    children,
    ownerDocument: {
      createElement: (tag: string) => {
        const created: Record<string, unknown> = {
          tag,
          attributes: {} as Record<string, string>,
          setAttribute(name: string, value: string) {
            (created['attributes'] as Record<string, string>)[name] = value;
          },
          remove() {
            children.splice(children.indexOf(created), 1);
          },
        };
        return created;
      },
    },
    append(child: Record<string, unknown>) {
      children.push(child);
    },
  };
  return element;
}

describe('custom block examples', () => {
  it('defines a callout textblock and an embed atom', () => {
    expect(calloutBlock).toMatchObject({ kind: 'block', name: 'callout', content: 'inline' });
    expect(embedBlock).toMatchObject({ kind: 'block', name: 'embed', content: 'none' });
    // The callout defines no paint of its own; it presents a callout through tp-te-callout.
    expect(calloutBlock.css).toBeUndefined();
    expect(calloutBlock.presents).toBe('callout');
    expect(customBlockNotes).toContain('data-type="callout"');
    expect(customBlockNotes).toContain('data-type="embed"');
  });

  it('both engine adapters support both blocks', () => {
    for (const engine of [tiptapEngine(), lexicalEngine()]) {
      expect(engine.supportsNode(calloutBlock)).toBe(true);
      expect(engine.supportsNode(embedBlock)).toBe(true);
    }
  });

  it('writes the callout as an alert and restores it from one', () => {
    const markdown = calloutBlock.markdown!;
    expect(markdown.serialize({ attrs: { tone: 'tip' }, markdown: 'Bring gloves.' })).toBe(
      '> [!TIP]\n> Bring gloves.',
    );
    const content = [{ type: 'text', value: 'Bring gloves.' }];
    expect(
      markdown.parse?.({
        type: 'alert',
        kind: 'tip',
        children: [{ type: 'paragraph', children: content }],
      } as never),
    ).toEqual({ attrs: { tone: 'tip' }, content });
    expect(markdown.parse?.({ type: 'alert', kind: 'caution', children: [] } as never)).toBeNull();
    expect(markdown.parse?.({ type: 'paragraph', children: [] } as never)).toBeNull();
  });

  it('loads only absolute https sources', () => {
    expect(embedSource('https://example.com/a')).toBe('https://example.com/a');
    expect(embedSource('http://example.com/')).toBeNull();
    expect(embedSource('javascript:alert(1)')).toBeNull();
    expect(embedSource('/relative')).toBeNull();
    expect(embedSource(null)).toBeNull();
    // A page of the document's own origin loads too, whatever its protocol; another origin does not.
    const page = 'http://docs.example/notes/';
    expect(embedSource('../tide-table.html', page)).toBe('http://docs.example/tide-table.html');
    expect(embedSource('http://docs.example/tide.html', page)).toBe(
      'http://docs.example/tide.html',
    );
    expect(embedSource('http://other.example/tide.html', page)).toBeNull();
    expect(embedSource('javascript:alert(1)', page)).toBeNull();
  });

  it('renders a sandboxed frame with its title, and text without a title or https source', () => {
    const element = host();
    const cleanup = embedBlock.view!(
      element as never,
      {
        src: 'https://example.com/tides',
        title: 'Tide table',
      } as never,
    );
    expect(element.children).toHaveLength(1);
    expect(element.children[0]).toMatchObject({
      tag: 'iframe',
      title: 'Tide table',
      src: 'https://example.com/tides',
      attributes: { sandbox: 'allow-scripts', referrerpolicy: 'no-referrer' },
    });
    (cleanup as () => void)();
    expect(element.children).toHaveLength(0);
    const untitled = host();
    embedBlock.view!(untitled as never, { src: 'https://example.com/', title: null } as never);
    expect(untitled.children).toHaveLength(0);
    expect(untitled.textContent).toBe('https://example.com/');
    const insecure = host();
    embedBlock.view!(insecure as never, { src: 'http://example.com/', title: 'Page' } as never);
    expect(insecure.children).toHaveLength(0);
    expect(insecure.textContent).toBe('Page');
  });
});

describe('text editor example code', () => {
  const codes = [
    ...textEditorExamples.map((example) => [example.title, example.code] as const),
    ...Object.entries(textEditorStorySources),
  ];

  it('publishes one self-contained script per example, with its own engine', () => {
    for (const [, code] of codes) {
      expect(code).not.toMatch(/from '\.{1,2}\//u);
      expect(code).not.toMatch(/^export /mu);
      expect(code.match(/^function createEngine\(/gmu) ?? []).toHaveLength(1);
      expect(code).not.toMatch(/data-(?:sample|mode|custom-blocks|form-output|submitted)/u);
    }
  });

  it('shows only the API of each use case', () => {
    const code = Object.fromEntries(codes);
    expect(Object.keys(code)).toEqual([
      'In a form',
      'Image upload',
      'Core editor',
      'Lexical engine',
      'Custom blocks',
      'Mentions',
      'Default',
      'SelectionToolbar',
      'BlockEditor',
    ]);
    expect(code['Core editor']).not.toContain('features');
    expect(code['Lexical engine']).not.toContain('features');
    expect(code['Default']).toContain(
      'editor.features = [textEditorLinks(), textEditorTables(), textEditorImages({ upload })];',
    );
    expect(code['Default']).not.toContain('layout');
    expect(code['BlockEditor']).toContain('editor.layout = { toolbar: [] };');
    expect(code['SelectionToolbar']).toContain(
      'editor.features = [textEditorSelectionToolbar(), textEditorLinks()];',
    );
    expect(code['Image upload']).toContain('onProgress(sent, total);');
    expect(code['Image upload']).not.toMatch(/textEditor(?:Blocks|Tables|Links)\(/u);
    expect(code['Custom blocks']).not.toContain('mention');
    expect(code['Mentions']).not.toContain('defineTextEditorBlock');
    // Only the Lexical example imports the Lexical engine, and no example imports both engines.
    for (const [title, text] of codes)
      expect(text.includes('@tiptap/core') !== text.includes("from 'lexical'"), title).toBe(true);
    expect(code['Lexical engine']).toContain("from 'lexical'");
  });
});
