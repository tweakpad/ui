/**
 * Actions on Lexical (Widgets `uwg-te-req-engine-5`, `uwg-te-tab-actions`, `uwg-te-tab-engine` r4):
 * one discrete update tagged `tp-action` per list, all or none.
 */
import { describe, expect, it } from 'vitest';
import { deepFreeze } from '../../../freeze.js';
import type { TextEditorAction } from '../../actions.js';
import type { TextEditorExecuteOptions } from '../../engine.js';
import { TEXT_EDITOR_COLORS } from '../../palette.js';
import { corpusNodes } from '../../content/corpus.test.js';
import {
  headlessLexical,
  reducedLexicalModules,
  type HeadlessOptions,
  type Headless,
} from './lexical-stubs.test.js';

const OPTIONS: TextEditorExecuteOptions = { reason: 'imperative-action' };

function setup(source: string, options: HeadlessOptions = {}) {
  const lexical = headlessLexical({ html: source, ...options });
  const { instance, editor, recording } = lexical;
  const updates: string[][] = [];
  editor.registerUpdateListener(({ tags }) => updates.push([...tags]));
  const run = (
    actions: TextEditorAction | readonly TextEditorAction[],
    options: Partial<TextEditorExecuteOptions> = {},
  ) =>
    instance.execute(Array.isArray(actions) ? actions : [actions as TextEditorAction], {
      ...OPTIONS,
      ...options,
    });
  const select = (block: string, from: number, to = from) =>
    run({
      type: 'selection.set',
      selection: { kind: 'text', anchor: { block, offset: from }, head: { block, offset: to } },
    });
  const html = () => instance.getContent('html') as string;
  const json = () => JSON.stringify(instance.getContent('json'));
  /** Clears the records and the update log. */
  const reset = () => {
    recording.clear();
    updates.splice(0);
  };
  return { ...lexical, updates, run, select, html, json, reset };
}

const actionUpdates = (updates: string[][]) => updates.filter((tags) => tags.includes('tp-action'));

describe('uwg-te-tab-actions r1: marks and links', () => {
  it('V-039: each toggle mark runs as one update tagged tp-action, on then off', () => {
    const marks = [
      ['bold', 'strong'],
      ['italic', 'em'],
      ['underline', 'u'],
      ['strike', 's'],
      ['code', 'code'],
      ['superscript', 'sup'],
      ['subscript', 'sub'],
    ] as const;
    for (const [mark, tag] of marks) {
      const { run, select, html, updates, reset, recording } = setup(
        '<p data-id="p1">calm sea</p>',
      );
      select('p1', 0, 4);
      reset();
      expect(run({ type: 'mark.toggle', mark })).toBe(true);
      expect(actionUpdates(updates)).toEqual([['history-push', 'tp-action']]);
      expect(recording.of('content').map(({ change }) => change)).toEqual([
        {
          cause: 'action',
          reason: 'imperative-action',
          sourceEvent: undefined,
          action: 'mark.toggle',
        },
      ]);
      expect(html()).toBe(`<p data-id="p1"><${tag}>calm</${tag}> sea</p>`);
      expect(run({ type: 'mark.toggle', mark })).toBe(true);
      expect(html()).toBe('<p data-id="p1">calm sea</p>');
    }
  });

  it('V-039: a mark turns on across a partly marked selection and off when it covers it all', () => {
    const { run, select, html } = setup('<p data-id="p1"><strong>calm</strong> sea</p>');
    select('p1', 0, 8);
    run({ type: 'mark.toggle', mark: 'bold' });
    expect(html()).toBe('<p data-id="p1"><strong>calm sea</strong></p>');
    run({ type: 'mark.toggle', mark: 'bold' });
    expect(html()).toBe('<p data-id="p1">calm sea</p>');
  });

  it('V-039: superscript and subscript exclude each other; code drops other marks and colors', () => {
    const { run, select, html, json } = setup('<p data-id="p1"><strong>calm</strong> sea</p>');
    select('p1', 0, 4);
    run({ type: 'mark.toggle', mark: 'superscript' });
    run({ type: 'mark.toggle', mark: 'subscript' });
    expect(html()).toBe('<p data-id="p1"><strong><sub>calm</sub></strong> sea</p>');
    run({ type: 'mark.color', mark: 'text-color', color: 'red' });
    run({ type: 'mark.toggle', mark: 'code' });
    expect(html()).toBe('<p data-id="p1"><code>calm</code> sea</p>');
    expect(json()).not.toContain('tp-color');
  });

  it('V-039: colors are NodeState names on both channels; null clears them', () => {
    for (const color of TEXT_EDITOR_COLORS) {
      const { run, select, html, instance } = setup('<p data-id="p1">calm sea</p>');
      select('p1', 0, 4);
      expect(run({ type: 'mark.color', mark: 'text-color', color })).toBe(true);
      expect(run({ type: 'mark.color', mark: 'highlight', color })).toBe(true);
      const native = JSON.stringify(instance.getContent('json'));
      expect(native).toContain(`"tp-color":"${color}"`);
      expect(native).toContain(`"tp-highlight":"${color}"`);
      expect(native).not.toMatch(/"style":"[^"]/);
      expect(html()).toBe(
        `<p data-id="p1"><span data-color="${color}"><mark data-color="${color}">calm</mark></span> sea</p>`,
      );
      run({ type: 'mark.color', mark: 'text-color', color: null });
      run({ type: 'mark.color', mark: 'highlight', color: null });
      expect(html()).toBe('<p data-id="p1">calm sea</p>');
    }
  });

  it('V-039: a non-palette color or an unknown mark makes can answer false', () => {
    const { instance, select } = setup('<p data-id="p1">calm</p>');
    select('p1', 0, 4);
    expect(instance.can({ type: 'mark.color', mark: 'text-color', color: 'teal' } as never)).toBe(
      false,
    );
    expect(instance.can({ type: 'mark.color', mark: 'border', color: 'red' } as never)).toBe(false);
    expect(instance.can({ type: 'mark.toggle', mark: 'blink' } as never)).toBe(false);
    expect(instance.can({ type: 'mark.color', mark: 'highlight', color: 'red' })).toBe(true);
  });

  it('V-039: marks at a caret apply to the text typed next', () => {
    const { run, select, html } = setup('<p data-id="p1">calm</p>');
    select('p1', 4);
    run({ type: 'mark.toggle', mark: 'bold' });
    run({ type: 'mark.color', mark: 'text-color', color: 'blue' });
    run({ type: 'text.insert', text: ' sea' });
    expect(html()).toBe(
      '<p data-id="p1">calm<span data-color="blue"><strong> sea</strong></span></p>',
    );
  });

  it('V-039: mark.clear removes every mark but links', () => {
    const { run, select, html, json } = setup(
      '<p data-id="p1"><a href="https://x.example/"><strong><em>calm</em></strong></a> sea</p>',
    );
    select('p1', 0, 8);
    run({ type: 'mark.color', mark: 'highlight', color: 'pink' });
    expect(run({ type: 'mark.clear' })).toBe(true);
    expect(html()).toBe('<p data-id="p1"><a href="https://x.example/">calm</a> sea</p>');
    expect(json()).not.toContain('tp-highlight');
  });

  it('V-039: link.set over a selection, over a range, inserting text, and on the whole link', () => {
    const { run, select, html, json, instance } = setup('<p data-id="p1">calm sea and sky</p>');
    select('p1', 0, 4);
    expect(run({ type: 'link.set', href: 'https://a.example/' })).toBe(true);
    expect(html()).toBe('<p data-id="p1"><a href="https://a.example/">calm</a> sea and sky</p>');
    expect(
      run({ type: 'link.set', href: 'https://b.example/', range: { block: 'p1', from: 5, to: 8 } }),
    ).toBe(true);
    expect(html()).toBe(
      '<p data-id="p1"><a href="https://a.example/">calm</a> <a href="https://b.example/">sea</a> and sky</p>',
    );
    select('p1', 1);
    expect(run({ type: 'link.set', href: 'https://c.example/' })).toBe(true);
    expect(html()).toContain('<a href="https://c.example/">calm</a>');
    select('p1', 16);
    expect(run({ type: 'link.set', href: 'mailto:ana@x.example', text: '!' })).toBe(true);
    expect(html()).toBe(
      '<p data-id="p1"><a href="https://c.example/">calm</a> <a href="https://b.example/">sea</a> and sky<a href="mailto:ana@x.example">!</a></p>',
    );
    expect(json()).not.toMatch(/"(target|rel|title)":"/);
    expect(instance.can({ type: 'link.set', href: 'javascript:alert(1)' })).toBe(false);
    select('p1', 9, 12);
    expect(
      instance.can({
        type: 'link.set',
        href: 'https://d.example/',
        range: { block: 'p1', from: 9, to: 99 },
      }),
    ).toBe(false);
  });

  it('V-039: link.unset removes the link at the caret or over a range', () => {
    const { run, select, html, instance } = setup(
      '<p data-id="p1"><a href="https://a.example/">calm</a> sea <a href="https://b.example/">sky</a></p>',
    );
    select('p1', 2);
    expect(run({ type: 'link.unset' })).toBe(true);
    expect(html()).toBe('<p data-id="p1">calm sea <a href="https://b.example/">sky</a></p>');
    expect(run({ type: 'link.unset', range: { block: 'p1', from: 9, to: 12 } })).toBe(true);
    expect(html()).toBe('<p data-id="p1">calm sea sky</p>');
    select('p1', 2);
    expect(instance.can({ type: 'link.unset' })).toBe(false);
  });
});

describe('uwg-te-tab-actions r2: block attributes', () => {
  const blocks = '<p data-id="p1">one</p><p data-id="p2">two</p>';

  it('V-040: block.set-type into every base kind keeps the identifier', () => {
    const cases: [TextEditorAction, string][] = [
      ...[1, 2, 3, 4, 5, 6].map(
        (level) =>
          [
            { type: 'block.set-type', kind: 'heading', attrs: { level }, ids: ['p1'] },
            `<h${level} data-id="p1">one</h${level}>`,
          ] as [TextEditorAction, string],
      ),
      [
        { type: 'block.set-type', kind: 'quote', ids: ['p1'] },
        '<blockquote data-id="p1"><p>one</p></blockquote>',
      ],
      [
        { type: 'block.set-type', kind: 'code', attrs: { language: 'ts' }, ids: ['p1'] },
        '<pre data-id="p1"><code class="language-ts">one</code></pre>',
      ],
      [
        { type: 'block.set-type', kind: 'list-bullet', ids: ['p1'] },
        '<ul><li data-id="p1"><p>one</p></li></ul>',
      ],
      [
        { type: 'block.set-type', kind: 'list-ordered', ids: ['p1'] },
        '<ol><li data-id="p1"><p>one</p></li></ol>',
      ],
      [
        { type: 'block.set-type', kind: 'list-task', ids: ['p1'] },
        '<ul data-type="task"><li data-id="p1" data-checked="false"><p>one</p></li></ul>',
      ],
    ];
    for (const [action, expected] of cases) {
      const { run, html, updates, reset } = setup(blocks);
      reset();
      expect(run(action), JSON.stringify(action)).toBe(true);
      expect(actionUpdates(updates)).toHaveLength(1);
      expect(html()).toBe(`${expected}\n<p data-id="p2">two</p>`);
    }
  });

  it('V-040: set-type from the selection, toggle back, and list toggles keep identifiers by order', () => {
    const { run, select, html } = setup(blocks);
    run({
      type: 'selection.set',
      selection: {
        kind: 'text',
        anchor: { block: 'p1', offset: 1 },
        head: { block: 'p2', offset: 1 },
      },
    });
    run({ type: 'block.set-type', kind: 'list-bullet' });
    expect(html()).toBe(
      '<ul><li data-id="p1"><p>one</p></li><li data-id="p2"><p>two</p></li></ul>',
    );
    run({ type: 'block.set-type', kind: 'list-bullet', toggle: true });
    expect(html()).toBe(`<p data-id="p1">one</p>\n<p data-id="p2">two</p>`);
    select('p2', 1);
    run({ type: 'block.set-type', kind: 'heading', attrs: { level: 2 }, toggle: true });
    run({ type: 'block.set-type', kind: 'heading', attrs: { level: 2 }, toggle: true });
    expect(html()).toBe(`<p data-id="p1">one</p>\n<p data-id="p2">two</p>`);
  });

  it('V-040: a nested list item turned into a paragraph splits the outermost list', () => {
    const { run, html } = setup(
      '<ul><li data-id="a"><p>a</p><ul><li data-id="b"><p>b</p></li><li data-id="c"><p>c</p></li></ul></li><li data-id="d"><p>d</p></li></ul>',
    );
    run({ type: 'block.set-type', kind: 'paragraph', ids: ['b'] });
    expect(html()).toBe(
      '<ul><li data-id="a"><p>a</p></li></ul>\n<p data-id="b">b</p>\n<ul><li data-id="c"><p>c</p></li><li data-id="d"><p>d</p></li></ul>',
    );
  });

  it('a text selection targets the textblocks whose text it meets, atoms and tables between them skipped', () => {
    const { instance, run } = setup(
      '<p data-id="p1">one</p><hr data-id="d1"><table data-id="t1"><tbody><tr><td><p>x</p></td></tr></tbody></table><p data-id="p2">two</p>',
    );
    run({
      type: 'selection.set',
      selection: {
        kind: 'text',
        anchor: { block: 'p1', offset: 1 },
        head: { block: 'p2', offset: 1 },
      },
    });
    expect(instance.can({ type: 'block.set-type', kind: 'quote' })).toBe(true);
    expect(run({ type: 'block.set-type', kind: 'quote' })).toBe(true);
    expect(run({ type: 'block.align', align: 'center' })).toBe(true);
    expect(
      instance
        .getBlocks()
        .ordered()
        .map(({ id, kind, attrs }) => [id, kind, attrs['align'] ?? null]),
    ).toEqual([
      ['p1', 'quote', 'center'],
      ['d1', 'divider', null],
      ['t1', 'table', null],
      ['p2', 'quote', 'center'],
    ]);
  });

  it('V-040: block.set-attrs for checked, language, image and heading level', () => {
    const { run, html, instance } = setup(
      '<ul data-type="task"><li data-id="t1" data-checked="false"><p>todo</p></li></ul><pre data-id="c1"><code>x</code></pre><img data-id="i1" src="https://x.example/a.png" alt="A"><h2 data-id="h1">H</h2>',
    );
    expect(run({ type: 'block.set-attrs', id: 't1', attrs: { checked: true } })).toBe(true);
    expect(run({ type: 'block.set-attrs', id: 'c1', attrs: { language: 'ts' } })).toBe(true);
    expect(
      run({
        type: 'block.set-attrs',
        id: 'i1',
        attrs: { src: 'https://x.example/b.png', alt: 'B', width: 64 },
      }),
    ).toBe(true);
    expect(run({ type: 'block.set-attrs', id: 'h1', attrs: { level: 4 } })).toBe(true);
    expect(html()).toBe(
      '<ul data-type="task"><li data-id="t1" data-checked="true"><p>todo</p></li></ul>\n<pre data-id="c1"><code class="language-ts">x</code></pre>\n<img data-id="i1" src="https://x.example/b.png" alt="B" width="64">\n<h4 data-id="h1">H</h4>',
    );
    expect(instance.can({ type: 'block.set-attrs', id: 'h1', attrs: { checked: true } })).toBe(
      false,
    );
    expect(instance.can({ type: 'block.set-attrs', id: 'nope', attrs: { level: 2 } })).toBe(false);
  });

  it('V-040: block.align with each value and null', () => {
    for (const align of ['center', 'end', 'justify'] as const) {
      const { run, html } = setup(blocks);
      run({ type: 'block.align', align, ids: ['p1', 'p2'] });
      expect(html()).toBe(
        `<p data-id="p1" style="text-align: ${align}">one</p>\n<p data-id="p2" style="text-align: ${align}">two</p>`,
      );
      run({ type: 'block.align', align: null, ids: ['p1'] });
      run({ type: 'block.align', align: 'start', ids: ['p2'] });
      expect(html()).toBe(`<p data-id="p1">one</p>\n<p data-id="p2">two</p>`);
    }
  });

  it('V-040: block.indent nests under the previous item; block.outdent unnests, a top-level item becomes a paragraph', () => {
    const { run, html, instance } = setup(
      '<ul><li data-id="a"><p>a</p></li><li data-id="b"><p>b</p></li><li data-id="c"><p>c</p></li></ul>',
    );
    expect(instance.can({ type: 'block.indent', ids: ['a'] })).toBe(false);
    expect(run({ type: 'block.indent', ids: ['b', 'c'] })).toBe(true);
    expect(html()).toBe(
      '<ul><li data-id="a"><p>a</p><ul><li data-id="b"><p>b</p></li><li data-id="c"><p>c</p></li></ul></li></ul>',
    );
    expect(run({ type: 'block.outdent', ids: ['b'] })).toBe(true);
    expect(html()).toBe(
      '<ul><li data-id="a"><p>a</p></li><li data-id="b"><p>b</p><ul><li data-id="c"><p>c</p></li></ul></li></ul>',
    );
    expect(run({ type: 'block.outdent', ids: ['a'] })).toBe(true);
    expect(html()).toBe(
      '<p data-id="a">a</p>\n<ul><li data-id="b"><p>b</p><ul><li data-id="c"><p>c</p></li></ul></li></ul>',
    );
  });
});

describe('uwg-te-tab-actions r3: blocks', () => {
  const doc = '<p data-id="p1">one</p><p data-id="p2">two</p><p data-id="p3">three</p>';

  it('V-041: blocks.insert with each at form, replacing an empty paragraph at the point', () => {
    const { run, html, instance } = setup(`${doc}<p data-id="e1"></p>`);
    run({ type: 'blocks.insert', kind: 'divider', at: { after: 'p1' } });
    run({
      type: 'blocks.insert',
      kind: 'heading',
      attrs: { level: 2 },
      at: { before: 'p1' },
      select: 'start',
    });
    run({ type: 'blocks.insert', kind: 'quote', at: { replace: 'p2' } });
    run({ type: 'blocks.insert', kind: 'code', at: { parent: null, index: 0 }, select: 'none' });
    expect(html().replace(/data-id="gen\d+"/g, 'ID')).toBe(
      '<pre ID><code></code></pre>\n<h2 ID></h2>\n<p data-id="p1">one</p>\n<hr ID>\n<blockquote ID><p></p></blockquote>\n<p data-id="p3">three</p>\n<p data-id="e1"></p>',
    );
    run({ type: 'selection.set', selection: { kind: 'caret', block: 'e1', position: 'start' } });
    expect(
      run({ type: 'blocks.insert', kind: 'image', attrs: { src: 'https://x.example/a.png' } }),
    ).toBe(true);
    expect(html()).not.toContain('data-id="e1"');
    expect(instance.getState().selection.kind).toBe('blocks');
    expect(instance.can({ type: 'blocks.insert', kind: 'image', attrs: {} } as never)).toBe(false);
  });

  it('V-041: a new table has a header row and puts the caret in its first cell', () => {
    const { run, html, instance } = setup('<p data-id="p1">one</p>');
    run({ type: 'selection.set', selection: { kind: 'caret', block: 'p1', position: 'end' } });
    run({
      type: 'blocks.insert',
      kind: 'table',
      attrs: { rows: 2, columns: 2, headerRow: true, headerColumn: false },
    });
    expect(html().replace(/data-id="gen\d+"/g, 'ID')).toBe(
      '<p data-id="p1">one</p>\n<table ID><thead><tr><th><p></p></th><th><p></p></th></tr></thead><tbody><tr><td><p></p></td><td><p></p></td></tr></tbody></table>',
    );
    const selection = instance.getState().selection;
    expect(selection).toMatchObject({
      kind: 'text',
      anchor: { cell: { row: 0, column: 0, paragraph: 0 }, offset: 0 },
    });
  });

  it('V-041: blocks.move keeps identifiers and a caret at its text points', () => {
    const { run, select, html, instance } = setup(doc);
    select('p3', 2);
    expect(run({ type: 'blocks.move', ids: ['p3'], to: { parent: null, index: 0 } })).toBe(true);
    expect(html()).toBe(
      '<p data-id="p3">three</p>\n<p data-id="p1">one</p>\n<p data-id="p2">two</p>',
    );
    expect(instance.getState().selection).toMatchObject({
      kind: 'text',
      anchor: { block: 'p3', offset: 2 },
    });
    run({ type: 'selection.set', selection: { kind: 'blocks', ids: ['p1'] } });
    run({ type: 'blocks.move', ids: ['p1'], to: { parent: null, index: 2 } });
    expect(instance.getState().selection).toEqual({ kind: 'blocks', ids: ['p1'] });
    expect(instance.can({ type: 'blocks.move', ids: ['p1'], to: { parent: 'p2', index: 0 } })).toBe(
      false,
    );
  });

  it('V-041: blocks.duplicate gives copies fresh identifiers and selects them', () => {
    const { run, html, instance } = setup(doc);
    expect(run({ type: 'blocks.duplicate', ids: ['p1', 'p2'] })).toBe(true);
    const ids = instance.getBlocks().roots;
    expect(ids.slice(0, 2)).toEqual(['p1', 'p2']);
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
    expect(instance.getState().selection).toEqual({ kind: 'blocks', ids: ids.slice(2, 4) });
    expect(html()).toContain('<p data-id="p3">three</p>');
  });

  it('V-041: blocks.delete puts the caret at the end of the nearest textblock before, else after', () => {
    const { run, html, instance } = setup(doc);
    run({ type: 'blocks.delete', ids: ['p2'] });
    expect(html()).toBe('<p data-id="p1">one</p>\n<p data-id="p3">three</p>');
    expect(instance.getState().selection).toMatchObject({
      kind: 'text',
      anchor: { block: 'p1', offset: 3 },
    });
    run({ type: 'blocks.delete', ids: ['p1'] });
    expect(instance.getState().selection).toMatchObject({
      kind: 'text',
      anchor: { block: 'p3', offset: 0 },
    });
    run({ type: 'blocks.delete', ids: ['p3'] });
    expect(html()).toMatch(/^<p data-id="gen\d+"><\/p>$/);
    expect(instance.getState().selection.kind).toBe('text');
  });
});

describe('uwg-te-tab-actions r4: text and inline nodes', () => {
  it('V-042: text.insert at the selection or a range, text.delete, inline.insert with a space after it', () => {
    const { run, select, html, instance } = setup('<p data-id="p1">calm sea</p>', {
      nodes: corpusNodes,
    });
    select('p1', 4);
    expect(run({ type: 'text.insert', text: ' blue' })).toBe(true);
    expect(
      run({ type: 'text.insert', text: 'deep', range: { block: 'p1', from: 10, to: 13 } }),
    ).toBe(true);
    expect(html()).toBe('<p data-id="p1">calm blue deep</p>');
    expect(run({ type: 'text.delete', range: { block: 'p1', from: 4, to: 9 } })).toBe(true);
    expect(html()).toBe('<p data-id="p1">calm deep</p>');
    expect(
      run({
        type: 'inline.insert',
        kind: 'mention',
        attrs: { person: 'ana', label: 'Ana' },
        range: { block: 'p1', from: 5, to: 5 },
      }),
    ).toBe(true);
    expect(html()).toBe(
      '<p data-id="p1">calm <span data-type="mention" data-person="ana" data-label="Ana">@Ana</span> deep</p>',
    );
    expect(instance.getState().selection).toMatchObject({
      kind: 'text',
      anchor: { block: 'p1', offset: 7 },
      empty: true,
    });
    expect(instance.can({ type: 'inline.insert', kind: 'unknown', attrs: {} })).toBe(false);
    expect(instance.can({ type: 'text.delete', range: { block: 'p1', from: 0, to: 40 } })).toBe(
      false,
    );
  });
});

describe('uwg-te-tab-actions r5: content', () => {
  it('V-043: a text-range fragment merges its first and last paragraphs into the surrounding text', () => {
    const { run, html } = setup('<p data-id="p1">calm sea</p>');
    expect(
      run({
        type: 'content.insert',
        at: { kind: 'text', anchor: { block: 'p1', offset: 5 } },
        content: {
          kind: 'range',
          blocks: [
            { type: 'paragraph', content: [{ type: 'text', text: 'deep ' }] },
            { type: 'heading', level: 2, content: [{ type: 'text', text: 'Tides' }] },
            { type: 'paragraph', content: [{ type: 'text', text: 'blue ' }] },
          ],
        },
      }),
    ).toBe(true);
    expect(html().replace(/data-id="gen\d+"/g, 'ID')).toBe(
      '<p data-id="p1">calm deep&nbsp;</p>\n<h2 ID>Tides</h2>\n<p ID>blue sea</p>',
    );
  });

  it('V-043: a single paragraph merges inline, over a range', () => {
    const { run, html } = setup('<p data-id="p1">calm sea</p>');
    run({
      type: 'content.insert',
      at: { kind: 'text', anchor: { block: 'p1', offset: 0 }, head: { block: 'p1', offset: 4 } },
      content: {
        kind: 'range',
        blocks: [
          { type: 'paragraph', content: [{ type: 'text', text: 'rough', marks: { bold: true } }] },
        ],
      },
    });
    expect(html()).toBe('<p data-id="p1"><strong>rough</strong> sea</p>');
  });

  it('V-043: a blocks fragment inserts blocks after the block, or in place of an empty one', () => {
    const { run, html } = setup('<p data-id="p1">calm</p><p data-id="e1"></p>');
    const content = { kind: 'blocks' as const, blocks: [{ type: 'divider' as const, id: 'p1' }] };
    run({ type: 'content.insert', at: { kind: 'caret', block: 'p1', position: 'end' }, content });
    run({ type: 'content.insert', at: { kind: 'caret', block: 'e1', position: 'start' }, content });
    expect(html().replace(/data-id="gen\d+"/g, 'ID')).toBe(
      '<p data-id="p1">calm</p>\n<hr ID>\n<hr ID>',
    );
  });

  it('V-043: blocks entering a table cell become its paragraphs', () => {
    const { run, html } = setup(
      '<table data-id="t1"><tbody><tr><td><p>ab</p></td></tr></tbody></table>',
    );
    run({
      type: 'content.insert',
      at: {
        kind: 'text',
        anchor: { block: 't1', cell: { row: 0, column: 0, paragraph: 0 }, offset: 1 },
      },
      content: {
        kind: 'blocks',
        blocks: [
          { type: 'heading', level: 1, content: [{ type: 'text', text: 'X' }] },
          { type: 'code', text: 'y' },
        ],
      },
    });
    expect(html()).toBe(
      '<table data-id="t1"><tbody><tr><td><p>aX</p><p>yb</p></td></tr></tbody></table>',
    );
  });

  it('a fragment holding kinds the mount cannot represent is converted first, reported once applied', () => {
    const { run, html, recording, instance } = setup('<p data-id="p1">calm</p>', {
      modules: reducedLexicalModules,
    });
    const content = {
      kind: 'blocks' as const,
      blocks: [
        {
          type: 'table' as const,
          headerRow: false,
          headerColumn: false,
          rows: [
            { cells: [{ paragraphs: [{ content: [{ type: 'text' as const, text: 'c' }] }] }] },
          ],
        },
      ],
    };
    const action = {
      type: 'content.insert' as const,
      at: { kind: 'caret' as const, block: 'p1', position: 'end' as const },
      content,
    };
    expect(instance.can(action)).toBe(true);
    expect(recording.of('diagnostic')).toEqual([]);
    expect(run(action)).toBe(true);
    expect(html().replace(/data-id="gen\d+"/g, 'ID')).toBe('<p data-id="p1">calm</p>\n<p ID>c</p>');
    expect(recording.of('diagnostic').map(({ code }) => code)).toEqual([
      'text-editor-content-converted',
    ]);
  });

  it('a fragment at a block selection follows its last block, the caret at the end of the inserted text', () => {
    const { run, html, instance } = setup('<p data-id="p1">a</p><p data-id="p2">b</p>');
    expect(
      run({
        type: 'content.insert',
        at: { kind: 'blocks', ids: ['p1'] },
        content: {
          kind: 'blocks',
          blocks: [{ type: 'paragraph', content: [{ type: 'text', text: 'xy' }] }],
        },
      }),
    ).toBe(true);
    expect(html().replace(/data-id="gen\d+"/g, 'ID')).toBe(
      '<p data-id="p1">a</p>\n<p ID>xy</p>\n<p data-id="p2">b</p>',
    );
    const selection = instance.getState().selection;
    expect(selection).toMatchObject({ kind: 'text', empty: true, head: { offset: 2 } });
  });
});

describe('uwg-te-tab-actions r6: selection and history', () => {
  it('V-044: selection.set gives the engine-native kinds, adds no undo step and notifies state only', () => {
    const { run, instance, editor, rt, recording, updates, reset } = setup(
      '<p data-id="p1">calm</p><table data-id="t1"><tbody><tr><td><p>a</p></td><td><p>b</p></td></tr></tbody></table>',
    );
    reset();
    run({
      type: 'selection.set',
      selection: {
        kind: 'text',
        anchor: { block: 'p1', offset: 1 },
        head: { block: 'p1', offset: 3 },
      },
    });
    expect(instance.getState().selection).toEqual({
      kind: 'text',
      anchor: { block: 'p1', offset: 1 },
      head: { block: 'p1', offset: 3 },
      empty: false,
    });
    run({ type: 'selection.set', selection: { kind: 'blocks', ids: ['p1', 't1'] } });
    expect(editor.read(() => rt.lexical.$isNodeSelection(rt.lexical.$getSelection()))).toBe(true);
    expect(instance.getState().selection).toEqual({ kind: 'blocks', ids: ['p1', 't1'] });
    run({
      type: 'selection.set',
      selection: {
        kind: 'cells',
        table: 't1',
        range: { anchor: { row: 0, column: 0 }, head: { row: 0, column: 1 } },
      },
    });
    expect(editor.read(() => rt.modules.table!.$isTableSelection(rt.lexical.$getSelection()))).toBe(
      true,
    );
    expect(instance.getState().selection).toEqual({
      kind: 'cells',
      table: 't1',
      range: { anchor: { row: 0, column: 0 }, head: { row: 0, column: 1 } },
    });
    run({
      type: 'selection.set',
      selection: { kind: 'caret', block: 't1', cell: { row: 0, column: 1 }, position: 'end' },
    });
    expect(instance.getState().selection).toMatchObject({
      anchor: { block: 't1', cell: { row: 0, column: 1, paragraph: 0 }, offset: 1 },
    });
    expect(recording.of('content')).toEqual([]);
    expect(recording.of('state')).toHaveLength(4);
    expect(instance.getState().history.undo).toBe(false);
    expect(updates.every((tags) => tags.includes('tp-action'))).toBe(true);
  });

  it('V-044: history.undo and history.redo step once each, with one content notification', () => {
    const { run, select, html, recording, reset, instance } = setup('<p data-id="p1">calm</p>');
    select('p1', 4);
    run({ type: 'text.insert', text: ' sea' });
    run({ type: 'text.insert', text: ' sky' });
    reset();
    expect(run({ type: 'history.undo' }, { reason: 'hotkey' })).toBe(true);
    expect(html()).toBe('<p data-id="p1">calm sea</p>');
    expect(recording.of('content').map(({ change }) => change)).toEqual([
      { cause: 'action', reason: 'hotkey', sourceEvent: undefined, action: 'history.undo' },
    ]);
    expect(instance.getState().history).toEqual({ undo: true, redo: true });
    expect(run({ type: 'history.redo' })).toBe(true);
    expect(html()).toBe('<p data-id="p1">calm sea sky</p>');
    expect(run([{ type: 'history.undo' }, { type: 'text.insert', text: 'x' }])).toBe(false);
    expect(run({ type: 'history.redo' })).toBe(false);
  });
});

describe('uwg-te-req-engine-5: all or none', () => {
  it('V-014 b: a list whose second action cannot apply leaves document, selection and history unchanged', () => {
    const { run, select, html, instance, recording, reset, json } = setup(
      '<p data-id="p1">calm</p>',
    );
    select('p1', 0, 4);
    run({ type: 'mark.toggle', mark: 'italic' });
    const before = { html: html(), json: json(), state: instance.getState() };
    reset();
    expect(
      run([
        { type: 'mark.toggle', mark: 'bold' },
        {
          type: 'table.merge-cells',
          table: 'p1',
          range: { anchor: { row: 0, column: 0 }, head: { row: 0, column: 1 } },
        },
      ]),
    ).toBe(false);
    expect(html()).toBe(before.html);
    expect(json()).toBe(before.json);
    const after = instance.getState();
    expect([after.selection, after.history, after.contentVersion]).toEqual([
      before.state.selection,
      before.state.history,
      before.state.contentVersion,
    ]);
    expect(recording.records).toEqual([]);
    // The undo stack holds the italic step only.
    expect(run({ type: 'history.undo' })).toBe(true);
    expect(html()).toBe('<p data-id="p1">calm</p>');
    expect(instance.getState().history.undo).toBe(false);
  });

  it('V-014 b: an action that throws discards the update, rethrows and is no engine error', () => {
    const { run, select, html, rt, recording, reset } = setup('<p data-id="p1">calm</p>');
    select('p1', 0, 4);
    reset();
    const original = rt.lexical.$getRoot;
    let calls = 0;
    (rt as { lexical: unknown }).lexical = {
      ...rt.lexical,
      $getRoot: () => {
        calls += 1;
        if (calls > 2) throw new Error('boom');
        return original();
      },
    };
    expect(() =>
      run([
        { type: 'mark.toggle', mark: 'bold' },
        { type: 'block.set-type', kind: 'heading', attrs: { level: 1 }, ids: ['p1'] },
      ]),
    ).toThrow('boom');
    (rt as { lexical: unknown }).lexical = { ...rt.lexical, $getRoot: original };
    expect(html()).toBe('<p data-id="p1">calm</p>');
    expect(recording.of('error')).toEqual([]);
    expect(recording.of('content')).toEqual([]);
  });

  it('V-014 a: two actions are one update, one content notification and one undo step', () => {
    const { run, select, html, recording, reset, updates } = setup('<p data-id="p1">calm</p>');
    select('p1', 0, 4);
    reset();
    run([
      { type: 'mark.toggle', mark: 'bold' },
      { type: 'block.set-type', kind: 'heading', attrs: { level: 2 } },
    ]);
    expect(html()).toBe('<h2 data-id="p1"><strong>calm</strong></h2>');
    expect(actionUpdates(updates)).toHaveLength(1);
    expect(recording.of('content')).toHaveLength(1);
    run({ type: 'history.undo' });
    expect(html()).toBe('<p data-id="p1">calm</p>');
  });

  it('typed text after an action never merges into its undo step', () => {
    const { run, select, html, editor, rt } = setup('<p data-id="p1">calm</p>');
    select('p1', 4);
    run({ type: 'text.insert', text: 'x' });
    // The engine's own typing at the caret, as a keystroke updates it.
    editor.update(
      () => {
        const selection = rt.lexical.$getSelection();
        if (rt.lexical.$isRangeSelection(selection)) selection.insertText('y');
      },
      { discrete: true },
    );
    expect(html()).toBe('<p data-id="p1">calmxy</p>');
    run({ type: 'history.undo' });
    expect(html()).toBe('<p data-id="p1">calmx</p>');
  });

  it('a read-only editor refuses mutating actions but still sets the selection', () => {
    const { run, select, instance } = setup('<p data-id="p1">calm</p>', { editable: false });
    expect(select('p1', 1)).toBe(true);
    expect(instance.can({ type: 'mark.toggle', mark: 'bold' })).toBe(false);
    expect(run({ type: 'text.insert', text: 'x' })).toBe(false);
  });
});

describe('uwg-te-req-engine-5: can', () => {
  it('V-019: can never updates, never throws and answers false for malformed actions', () => {
    const { instance, select, updates, reset } = setup(
      '<p data-id="p1">calm</p><table data-id="t1"><tbody><tr><td><p>a</p></td></tr></tbody></table>',
    );
    select('p1', 0, 2);
    reset();
    const malformed = [
      null,
      'mark.toggle',
      { type: 'mark.blink' },
      { type: 'blocks.delete', ids: [] },
      { type: 'text.delete', range: { block: 'p1', from: 3, to: 1 } },
      { type: 'content.set', content: 'x', format: 'rtf', history: 'push' },
    ] as unknown as TextEditorAction[];
    for (const action of malformed) expect(instance.can(action)).toBe(false);
    const valid: TextEditorAction[] = [
      { type: 'mark.toggle', mark: 'bold' },
      { type: 'block.set-type', kind: 'quote' },
      { type: 'blocks.delete', ids: ['p1'] },
      { type: 'blocks.delete', ids: ['missing'] },
      { type: 'table.insert-row', table: 't1', index: 1 },
      { type: 'table.insert-row', table: 'p1', index: 1 },
      { type: 'history.undo' },
      { type: 'content.set', content: 'x', format: 'text', history: 'push' },
    ];
    expect(valid.map((action) => instance.can(action))).toEqual([
      true,
      true,
      true,
      false,
      true,
      false,
      false,
      true,
    ]);
    expect(updates).toEqual([]);
  });

  it('V-045: without the table module every table action answers false', () => {
    const { instance } = setup('<p data-id="p1">calm</p>', { modules: reducedLexicalModules });
    expect(instance.can({ type: 'table.insert-row', table: 'p1', index: 0 })).toBe(false);
    expect(
      instance.can({ type: 'blocks.insert', kind: 'table', attrs: { rows: 1, columns: 1 } }),
    ).toBe(false);
  });
});

describe('uwg-te-tab-engine r4: focus option of execute', () => {
  it('focus false skips the selection focus and, with an unfocused root, the DOM selection', () => {
    const { run, updates, reset } = setup('<p data-id="p1">calm</p>');
    reset();
    run(
      { type: 'selection.set', selection: { kind: 'caret', block: 'p1', position: 'end' } },
      { focus: false },
    );
    run({ type: 'mark.toggle', mark: 'bold' }, { focus: false });
    run({ type: 'text.insert', text: 'x' }, { focus: false });
    // A caret mark changes no document: its update merges into the history.
    for (const tags of actionUpdates(updates)) {
      expect(['history-push', 'history-merge']).toContain(tags[0]);
      expect(tags.slice(1)).toEqual(['tp-action', 'skip-selection-focus', 'skip-dom-selection']);
    }
    expect(actionUpdates(updates).at(-1)?.[0]).toBe('history-push');
    reset();
    run({ type: 'text.insert', text: 'y' });
    expect(actionUpdates(updates)).toEqual([['history-push', 'tp-action']]);
  });
});

describe('uwg-te-tab-actions: an action leaves its inputs as they were', () => {
  it('frozen native JSON and frozen action payloads are read, never written', () => {
    const { instance } = headlessLexical({ html: '<p data-id="p1">calm</p>' });
    const native = deepFreeze(structuredClone(instance.getContent('json')));
    instance.setContent(native, 'json', { history: 'push' });
    const actions = deepFreeze([
      { type: 'selection.set', selection: { kind: 'caret', block: 'p1', position: 'end' } },
      {
        type: 'content.insert',
        at: { kind: 'caret', block: 'p1', position: 'end' },
        content: {
          kind: 'blocks',
          blocks: [{ type: 'paragraph', id: 'p1', content: [{ type: 'text', text: 'x' }] }],
        },
      },
      { type: 'blocks.insert', kind: 'heading', attrs: { level: 2 } },
      { type: 'block.set-type', kind: 'list-task', attrs: { checked: true }, ids: ['p1'] },
    ] as TextEditorAction[]);
    expect(instance.execute(actions, OPTIONS)).toBe(true);
    expect(instance.getBlocks().roots).toHaveLength(3);
  });
});

describe('uwg-te-req-blocks-1: marks in code', () => {
  it('in a code block no mark, color, clear or link action can apply', () => {
    const { instance, select } = setup('<pre data-id="c1"><code>let x</code></pre>');
    select('c1', 1);
    select('c1', 0, 3);
    for (const action of [
      { type: 'mark.toggle', mark: 'bold' },
      { type: 'mark.toggle', mark: 'code' },
      { type: 'mark.color', mark: 'highlight', color: 'yellow' },
      { type: 'mark.clear' },
      { type: 'link.set', href: 'https://harbor.example/' },
      { type: 'link.set', href: 'https://harbor.example/', range: { block: 'c1', from: 0, to: 3 } },
    ] as const satisfies readonly TextEditorAction[])
      expect(instance.can(action)).toBe(false);
  });

  it('in inline code only the code mark, clearing and links can apply; a caret takes code after it, not before', () => {
    const { instance, select } = setup('<p data-id="p1">a <code>knot</code> b</p>');
    select('p1', 2, 6);
    expect(instance.can({ type: 'mark.toggle', mark: 'bold' })).toBe(false);
    expect(instance.can({ type: 'mark.color', mark: 'text-color', color: 'blue' })).toBe(false);
    expect(instance.can({ type: 'mark.toggle', mark: 'code' })).toBe(true);
    expect(instance.can({ type: 'mark.clear' })).toBe(true);
    expect(instance.can({ type: 'link.set', href: 'https://harbor.example/' })).toBe(true);
    select('p1', 1, 6);
    expect(instance.can({ type: 'mark.toggle', mark: 'bold' })).toBe(true);
    // The caret continues the text before it; at a textblock start before inline code it takes
    // none of it (`uwg-te-lis-up-i2`: marks are exclusive at their start).
    select('p1', 2);
    expect(instance.getState().caret?.inCode).toBe(false);
    select('p1', 6);
    expect(instance.getState().caret?.inCode).toBe(true);
    expect(instance.can({ type: 'mark.toggle', mark: 'italic' })).toBe(false);
    const start = setup('<p data-id="p2"><code>knot</code> b</p>');
    start.select('p2', 0);
    expect(start.instance.getState().caret?.inCode).toBe(false);
    expect(start.instance.can({ type: 'mark.toggle', mark: 'italic' })).toBe(true);
  });
});

describe('uwg-te-req-engine-5: content.set through setContent', () => {
  const run = (
    headless: Headless,
    actions: readonly TextEditorAction[],
    focus: boolean | undefined = false,
  ) => headless.instance.execute(actions, { reason: 'imperative-action', focus });
  const SET: TextEditorAction = {
    type: 'content.set',
    content: 'new',
    format: 'text',
    history: 'reset',
  };
  const BAD: TextEditorAction = {
    type: 'content.set',
    content: '{not json',
    format: 'json',
    history: 'reset',
  };

  it('content.set is allowed while read-only; can reads the content', () => {
    const headless = headlessLexical({ html: '<p data-id="p1">a</p>', editable: false });
    expect(headless.instance.can(SET)).toBe(true);
    expect(headless.instance.can(BAD)).toBe(false);
    expect(headless.instance.can({ type: 'text.insert', text: 'x' })).toBe(false);
    expect(run(headless, [SET])).toBe(true);
    expect(headless.instance.getContent('text')).toBe('new');
  });

  it('execute of a sole content.set applies it through setContent with the reason', () => {
    const headless = headlessLexical({ html: '<p data-id="p1">a</p>' });
    headless.recording.clear();
    expect(
      headless.instance.execute(
        [{ type: 'content.set', content: '<p>x</p>', format: 'html', history: 'push' }],
        { reason: 'item-press' },
      ),
    ).toBe(true);
    expect(headless.instance.getContent('text')).toBe('x');
    expect(headless.recording.of('content').map(({ change }) => change)).toEqual([
      { cause: 'content', reason: 'item-press' },
    ]);
    expect(headless.instance.getState().history.undo).toBe(true);
    // Unreadable content throws as setContent does; with another action it is refused.
    expect(() => run(headless, [BAD])).toThrow();
    expect(run(headless, [SET, { type: 'text.insert', text: 'x' }])).toBe(false);
  });
});

describe('uwg-te-tab-actions r3, r7: block insertion, deletion carets and kept table selections', () => {
  const run = (headless: Headless, ...actions: TextEditorAction[]) =>
    headless.instance.execute(actions, { reason: 'imperative-action', focus: false });
  const caret = (block: string, offset: number): TextEditorAction => ({
    type: 'selection.set',
    selection: { kind: 'text', anchor: { block, offset } },
  });
  const ids = (headless: Headless) =>
    headless.instance
      .getBlocks()
      .ordered()
      .map(({ id, depth }) => `${id}@${depth}`);

  it('a table inserted with select end gets the caret at the end of its last cell', () => {
    const headless = headlessLexical({ html: '<p data-id="p1">x</p>' });
    run(headless, caret('p1', 1), {
      type: 'blocks.insert',
      kind: 'table',
      attrs: { rows: 2, columns: 3 },
      select: 'end',
    });
    expect(headless.instance.getState().selection).toMatchObject({
      kind: 'text',
      head: { cell: { row: 1, column: 2 } },
    });
  });

  it('deleting a block after a table puts the caret at the end of its last cell in document order', () => {
    const headless = headlessLexical({
      html: '<table data-id="t1"><tbody><tr><td><p>a</p></td><td><p>b</p></td><td><p>c</p></td></tr><tr><td colspan="2"><p>d</p></td><td><p>e</p></td></tr></tbody></table><p data-id="p1">x</p><p data-id="p2">y</p>',
    });
    run(headless, { type: 'blocks.delete', ids: ['p1'] });
    expect(headless.instance.getState().selection).toMatchObject({
      head: { block: 't1', cell: { row: 1, column: 2, paragraph: 0 }, offset: 1 },
    });
  });

  it('a caret in a deleted row goes to the start of the cell of its column in the next row', () => {
    const headless = headlessLexical({
      html: '<table data-id="t1"><tbody><tr><td><p>a1</p></td><td><p>b1</p></td></tr><tr><td><p>longtext</p></td><td><p>b2</p></td></tr><tr><td><p>a3</p></td><td><p>b3</p></td></tr></tbody></table><p data-id="p1">x</p>',
    });
    run(headless, {
      type: 'selection.set',
      selection: {
        kind: 'text',
        anchor: { block: 't1', cell: { row: 1, column: 0, paragraph: 0 }, offset: 8 },
      },
    });
    run(headless, { type: 'table.delete-rows', table: 't1', from: 1, to: 1 });
    expect(headless.instance.getState().selection).toMatchObject({
      head: { block: 't1', cell: { row: 1, column: 0, paragraph: 0 }, offset: 0 },
    });
  });

  it('a list item replacing a nested item adopts its nested items', () => {
    const headless = headlessLexical({
      html: '<ul><li data-id="a"><p>one</p><ul><li data-id="b"><p></p><ul><li data-id="e"><p>five</p></li></ul></li></ul></li></ul>',
    });
    expect(
      run(headless, { type: 'blocks.insert', kind: 'list-ordered', at: { replace: 'b' } }),
    ).toBe(true);
    expect(ids(headless).filter((id) => id.startsWith('e@'))).toEqual(['e@2']);
  });
});

describe('uwg-te-tab-actions r2: block.indent and block.outdent over the touched list items', () => {
  const run = (headless: Headless, ...actions: TextEditorAction[]) =>
    headless.instance.execute(actions, { reason: 'imperative-action', focus: false });
  const range = (
    anchor: { block: string; offset: number },
    head: { block: string; offset: number },
  ): TextEditorAction => ({ type: 'selection.set', selection: { kind: 'text', anchor, head } });

  it('block.outdent over a paragraph and a list item unnests the item', () => {
    const headless = headlessLexical({
      html: '<p data-id="p2">tide</p><ul><li data-id="i1"><p>one</p></li></ul><p data-id="p3">end</p>',
    });
    run(headless, range({ block: 'p2', offset: 1 }, { block: 'i1', offset: 1 }));
    const outdent: TextEditorAction = { type: 'block.outdent' };
    expect(headless.instance.can(outdent)).toBe(true);
    expect(run(headless, outdent)).toBe(true);
    expect(
      headless.instance
        .getBlocks()
        .ordered()
        .map(({ kind }) => kind),
    ).toEqual(['paragraph', 'paragraph', 'paragraph']);
  });
});
