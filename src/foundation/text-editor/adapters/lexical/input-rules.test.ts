/**
 * Input rules on Lexical (Widgets `uwg-te-req-key-7`, `uwg-te-tab-input-rules`,
 * `uwg-te-lis-up-i2`, `uwg-te-req-engine-5`).
 */
import * as lexical from 'lexical';
import { describe, expect, it } from 'vitest';
import { fakeContainer } from '../shared/test-helpers.test.js';
import { INLINE_RULE_TRIGGERS } from '../../input-rules.js';
import { createLexicalEngine } from './index.js';
import {
  headlessLexical,
  htmlOf,
  recordingContext,
  selectText,
  stubLexicalModules,
  typeText,
  type Headless,
} from './lexical-stubs.test.js';

/** A headless editor with the caret at the end of block `id`. */
function at(source: string, id: string, offset?: number): Headless {
  const headless = headlessLexical({ html: source });
  headless.instance.execute(
    [
      {
        type: 'selection.set',
        selection:
          offset === undefined
            ? { kind: 'caret', block: id, position: 'end' }
            : { kind: 'text', anchor: { block: id, offset } },
      },
    ],
    { reason: 'imperative-action' },
  );
  return headless;
}

const undo = (headless: Headless) =>
  headless.instance.execute([{ type: 'history.undo' }], { reason: 'imperative-action' });

describe('uwg-te-tab-input-rules: the configured rules', () => {
  it('V-279: the Markdown shortcuts get only the adapter’s transformers built from the shared table', () => {
    const { modules, record } = stubLexicalModules();
    createLexicalEngine(modules).mount(
      fakeContainer() as unknown as HTMLElement,
      recordingContext().context,
    );
    expect(record.markdown).toHaveLength(1);
    const transformers = record.markdown[0] as readonly {
      type: string;
      trigger?: string;
      dependencies: unknown[];
    }[];
    // One element transformer for the block rules, the original `---` rule and one text-match
    // transformer per closing character of the inline rules and autolinks; no text-format
    // transformer, so no engine delimiter logic (Lexical formats inside words) applies.
    expect(transformers.map(({ type }) => type)).toEqual([
      'element',
      'text-match',
      ...INLINE_RULE_TRIGGERS.map(() => 'text-match'),
      'text-match',
    ]);
    expect(
      transformers.filter(({ type }) => type === 'text-match').map(({ trigger }) => trigger),
    ).toEqual(['-', ...INLINE_RULE_TRIGGERS, ' ']);
    expect(transformers.every(({ dependencies }) => dependencies.length === 0)).toBe(true);
  });
});

describe('uwg-te-tab-input-rules r1–r7: block rules at the start of a top-level paragraph', () => {
  it.each([
    ['# ', '<h1 data-id="p1">Tides</h1>'],
    ['###### ', '<h6 data-id="p1">Tides</h6>'],
    ['- ', '<ul><li data-id="p1"><p>Tides</p></li></ul>'],
    ['+ ', '<ul><li data-id="p1"><p>Tides</p></li></ul>'],
    ['5. ', '<ol start="5"><li data-id="p1"><p>Tides</p></li></ol>'],
    ['[x] ', '<ul data-type="task"><li data-id="p1" data-checked="true"><p>Tides</p></li></ul>'],
    ['> ', '<blockquote data-id="p1"><p>Tides</p></blockquote>'],
    ['```js ', '<pre data-id="p1"><code class="language-js">Tides</code></pre>'],
  ])('%j turns the paragraph into its kind, keeping its identifier', (typed, expected) => {
    const headless = at('<p data-id="p1">Tides</p>', 'p1', 0);
    typeText(headless, typed);
    expect(htmlOf(headless)).toBe(expected);
    expect(headless.instance.getState().selection).toMatchObject({
      kind: 'text',
      head: { block: 'p1', offset: 0 },
    });
  });

  it('`---` completes on the third hyphen in an empty paragraph; the caret moves past the divider', () => {
    const headless = at('<p data-id="p1"></p><p data-id="p2">next</p>', 'p1');
    typeText(headless, '---');
    expect(htmlOf(headless)).toBe('<hr data-id="p1">\n<p data-id="p2">next</p>');
    expect(headless.instance.getState().selection).toMatchObject({
      head: { block: 'p2', offset: 0 },
    });
  });

  it.each([
    ['in a heading', '<h2 data-id="b1"></h2>', '# '],
    ['in a list item', '<ul><li data-id="b1"><p></p></li></ul>', '> '],
    ['in a quote', '<blockquote data-id="b1"></blockquote>', '- '],
    ['in a code block', '<pre data-id="b1"><code></code></pre>', '# '],
    ['after other text', '<p data-id="b1">x</p>', '# '],
    ['for other patterns', '<p data-id="b1"></p>', '[] '],
    ['for other fences', '<p data-id="b1"></p>', '~~~ '],
    ['for other dividers', '<p data-id="b1"></p>', '***'],
  ])('no block rule applies %s', (_where, source, typed) => {
    const headless = at(source, 'b1');
    const kinds = headless.instance
      .getBlocks()
      .ordered()
      .map(({ kind }) => kind);
    typeText(headless, typed);
    expect(
      headless.instance
        .getBlocks()
        .ordered()
        .map(({ kind }) => kind),
    ).toEqual(kinds);
  });

  it('no block rule applies in a table cell', () => {
    const headless = headlessLexical({
      html: '<table data-id="t1"><tbody><tr><td><p></p></td></tr></tbody></table>',
    });
    selectText(headless, { block: 't1', cell: { row: 0, column: 0, paragraph: 0 }, offset: 0 });
    typeText(headless, '# ');
    expect(htmlOf(headless)).toBe(
      '<table data-id="t1"><tbody><tr><td><p>#&nbsp;</p></td></tr></tbody></table>',
    );
  });
});

describe('uwg-te-tab-input-rules r8–r13: inline rules on the closing delimiter', () => {
  it.each([
    ['**calm**', '<strong>calm</strong>'],
    ['__calm__', '<strong>calm</strong>'],
    ['*calm*', '<em>calm</em>'],
    ['_calm_', '<em>calm</em>'],
    ['`calm`', '<code>calm</code>'],
    ['~~calm~~', '<s>calm</s>'],
    ['==calm==', '<mark data-color="yellow">calm</mark>'],
    ['[calm](https://harbor.example/)', '<a href="https://harbor.example/">calm</a>'],
  ])('%j applies its mark and removes its delimiters', (typed, mark) => {
    const headless = at('<p data-id="p1">sea</p>', 'p1');
    typeText(headless, ` ${typed}`);
    expect(htmlOf(headless)).toBe(`<p data-id="p1">sea ${mark}</p>`);
    // Text typed next does not take the rule's mark.
    typeText(headless, 'x');
    expect(htmlOf(headless)).toBe(`<p data-id="p1">sea ${mark}x</p>`);
  });

  it.each([
    ['inside a word', 'sea**calm**'],
    ['with whitespace inside the delimiters', '** calm**'],
    ['for a link outside the policy', '[calm](javascript:alert(1))'],
    ['for other patterns', '***calm***'],
  ])('no inline rule applies %s', (_where, typed) => {
    const headless = at('<p data-id="p1"></p>', 'p1');
    typeText(headless, typed);
    expect(htmlOf(headless)).not.toMatch(/<(strong|em|a)\b/u);
  });

  it('inline code may follow any character but a backtick; no rule applies inside code', () => {
    const headless = at('<p data-id="p1">a</p>', 'p1');
    typeText(headless, '`b`');
    expect(htmlOf(headless)).toBe('<p data-id="p1">a<code>b</code></p>');
    const code = at('<pre data-id="c1"><code></code></pre>', 'c1');
    typeText(code, '**x** ');
    expect(htmlOf(code)).toBe('<pre data-id="c1"><code>**x** </code></pre>');
  });

  it('a link rule typed inside a link links exactly its text; the rest of that link keeps its destination', () => {
    const headless = at(
      '<p data-id="p1"><a href="https://harbor.example/old">pier map</a></p>',
      'p1',
      4,
    );
    typeText(headless, ' [y](https://harbor.example/y)');
    expect(htmlOf(headless)).toBe(
      '<p data-id="p1"><a href="https://harbor.example/old">pier </a><a href="https://harbor.example/y">y</a><a href="https://harbor.example/old"> map</a></p>',
    );
  });

  it('a rule spans text of different formats and keeps the marks it does not set', () => {
    const headless = at('<p data-id="p1"><em>see</em></p>', 'p1');
    typeText(headless, ' **a**');
    expect(htmlOf(headless)).toBe('<p data-id="p1"><em>see </em><strong><em>a</em></strong></p>');
  });
});

describe('uwg-te-tab-input-rules r14: autolinks with the shared matcher', () => {
  it('a URL followed by a space links to itself, a www address with http://', () => {
    const headless = at('<p data-id="p1">see</p>', 'p1');
    typeText(headless, ' www.harbor.example ');
    expect(htmlOf(headless)).toBe(
      '<p data-id="p1">see <a href="http://www.harbor.example">www.harbor.example</a>&nbsp;</p>',
    );
  });

  it('Enter and Shift+Enter after a URL link it; a link or code gets no autolink', () => {
    const headless = at('<p data-id="p1">go https://harbor.example/pier</p>', 'p1');
    headless.editor.dispatchCommand(lexical.INSERT_PARAGRAPH_COMMAND, undefined);
    headless.editor.read(() => undefined);
    expect(htmlOf(headless)).toMatch(
      /^<p data-id="p1">go <a href="https:\/\/harbor\.example\/pier">https:\/\/harbor\.example\/pier<\/a><\/p>\n<p data-id="gen\d{4}"><\/p>$/u,
    );
    const code = at('<pre data-id="c1"><code>https://harbor.example</code></pre>', 'c1');
    typeText(code, ' ');
    expect(htmlOf(code)).not.toContain('<a ');
  });
});

describe('uwg-te-req-key-7: a rule is its own undo step, reported as input', () => {
  it('an autolink of Enter applies after the break as an undo step of its own', () => {
    const headless = at('<p data-id="p1">go https://harbor.example/pier</p>', 'p1');
    headless.recording.clear();
    headless.editor.dispatchCommand(lexical.INSERT_PARAGRAPH_COMMAND, undefined);
    headless.editor.read(() => undefined);
    expect(headless.recording.of('content')).toHaveLength(2);
    expect(htmlOf(headless)).toContain('<a href="https://harbor.example/pier">');
    expect(undo(headless)).toBe(true);
    expect(htmlOf(headless)).toMatch(
      /^<p data-id="p1">go https:\/\/harbor\.example\/pier<\/p>\n<p data-id="gen\d{4}"><\/p>$/u,
    );
    expect(undo(headless)).toBe(true);
    expect(htmlOf(headless)).toBe('<p data-id="p1">go https://harbor.example/pier</p>');
  });

  it('no rule applies in the update that ends a composition', () => {
    const headless = at('<p data-id="p1">sea</p>', 'p1');
    typeText(headless, ' **calm*');
    headless.editor.update(
      () => {
        const selection = lexical.$getSelection();
        if (lexical.$isRangeSelection(selection)) selection.insertText('*');
      },
      { discrete: true, tag: 'composition-end' },
    );
    headless.editor.read(() => undefined);
    expect(htmlOf(headless)).toBe('<p data-id="p1">sea **calm**</p>');
  });

  it('an undo right after a rule restores the text as typed', () => {
    const headless = at('<p data-id="p1">sea</p>', 'p1');
    typeText(headless, ' **calm*');
    headless.recording.clear();
    typeText(headless, '*');
    expect(htmlOf(headless)).toBe('<p data-id="p1">sea <strong>calm</strong></p>');
    expect(headless.recording.of('content').map(({ change }) => change)).toEqual([
      { cause: 'input', reason: 'input' },
      { cause: 'input', reason: 'input' },
    ]);
    expect(undo(headless)).toBe(true);
    expect(htmlOf(headless)).toBe('<p data-id="p1">sea **calm**</p>');
  });

  it('a block rule is undone back to the typed pattern', () => {
    const headless = at('<p data-id="p1"></p>', 'p1');
    typeText(headless, '#');
    typeText(headless, ' ');
    expect(htmlOf(headless)).toBe('<h1 data-id="p1"></h1>');
    expect(undo(headless)).toBe(true);
    expect(htmlOf(headless)).toBe('<p data-id="p1">#&nbsp;</p>');
  });
});
