import { describe, expect, it } from 'vitest';
import { defineTextEditorBlock, defineTextEditorInline } from '../nodes.js';
import { isContainedCss, nodeCssText } from './node-css.js';

const SCOPE = '[part~="text-editor-content"]';

const callout = defineTextEditorBlock({
  name: 'callout',
  content: 'inline',
  element: 'aside',
  css: '.tp-te-block-callout { padding: var(--tp-space-3); }',
  tool: { label: 'Callout' },
});
const embed = defineTextEditorBlock({
  name: 'embed',
  content: 'none',
  element: 'figure',
  tool: { label: 'Embed' },
});
const mention = defineTextEditorInline({
  name: 'mention',
  element: 'span',
  text: () => '@someone',
  css: '  .tp-te-inline-mention { font-weight: 600; }\n',
});

describe('custom node styles (uwg-te-req-pres-8)', () => {
  it('nests each definition’s css under the scope, in definition order', () => {
    expect(nodeCssText([callout, embed, mention], SCOPE)).toBe(
      [
        `${SCOPE} {\n.tp-te-block-callout { padding: var(--tp-space-3); }\n}`,
        `${SCOPE} {\n.tp-te-inline-mention { font-weight: 600; }\n}`,
      ].join('\n'),
    );
    expect(nodeCssText([embed], SCOPE)).toBe('');
    expect(nodeCssText([], SCOPE)).toBe('');
  });

  it('keeps braces inside comments and strings, and rejects css that could leave its block', () => {
    for (const css of [
      '.a { color: red; }',
      '.a { content: "}"; } /* } */',
      ".a::before { content: '\\'{'; }",
      '@media (width > 40rem) { .a { margin: 0; } }',
      '.a { b: c; } .d .e { f: g; }',
      'margin: 0;',
    ])
      expect(isContainedCss(css), css).toBe(true);
    for (const css of [
      '} body { color: red; } .a {',
      '.a { color: red; }}',
      '.a { color: red;',
      '.a { content: "}; }',
      '/* never closed',
      '.a { content: "line\nbreak"; }',
    ])
      expect(isContainedCss(css), css).toBe(false);
  });

  it('a plain definition with css that is not contained adds no rule', () => {
    const escaping = { ...mention, css: '} :host { display: none; } x {' };
    expect(nodeCssText([escaping, callout], SCOPE)).toBe(
      `${SCOPE} {\n.tp-te-block-callout { padding: var(--tp-space-3); }\n}`,
    );
  });

  it('a definition rejects css that is not contained', () => {
    expect(() =>
      defineTextEditorBlock({
        name: 'note',
        content: 'inline',
        element: 'aside',
        css: '} :host { display: none; }',
        tool: { label: 'Note' },
      }),
    ).toThrow(TypeError);
    expect(() =>
      defineTextEditorInline({
        name: 'tag',
        element: 'span',
        text: () => '#',
        css: '.tp-te-inline-tag {',
      }),
    ).toThrow(TypeError);
  });
});
