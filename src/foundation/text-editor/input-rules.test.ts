import { describe, expect, it } from 'vitest';
import { imageProtocols, linkProtocols } from '../markdown/url.js';
import type { TextEditorUrlPolicy } from './engine.js';
import {
  INLINE_RULE_TRIGGERS,
  matchAutolink,
  matchBlockRule,
  matchInlineRule,
  matchUrl,
  type TextEditorBlockRule,
  type TextEditorBlockRuleScope,
  type TextEditorInlineRuleScope,
} from './input-rules.js';

const URLS: TextEditorUrlPolicy = { links: linkProtocols(null), images: imageProtocols(null) };
const HTTPS_ONLY: TextEditorUrlPolicy = { links: ['https:'], images: ['https:'] };

const PARAGRAPH: TextEditorBlockRuleScope = { topLevelParagraph: true, inCode: false, atEnd: true };
const TEXT: TextEditorInlineRuleScope = { inCode: false, inLink: false };
const NODE = '￼';

describe('block input rules (uwg-te-tab-input-rules r1–r7, uwg-te-req-key-7)', () => {
  it('completes every block rule of the table on the character that ends its pattern', () => {
    const cases: readonly (readonly [string, TextEditorBlockRule])[] = [
      ['# ', { kind: 'heading', level: 1 }],
      ['## ', { kind: 'heading', level: 2 }],
      ['### ', { kind: 'heading', level: 3 }],
      ['#### ', { kind: 'heading', level: 4 }],
      ['##### ', { kind: 'heading', level: 5 }],
      ['###### ', { kind: 'heading', level: 6 }],
      ['- ', { kind: 'list-bullet' }],
      ['* ', { kind: 'list-bullet' }],
      ['+ ', { kind: 'list-bullet' }],
      ['3. ', { kind: 'list-ordered', start: 3 }],
      ['1. ', { kind: 'list-ordered', start: 1 }],
      ['[ ] ', { kind: 'list-task', checked: false }],
      ['[x] ', { kind: 'list-task', checked: true }],
      ['> ', { kind: 'quote' }],
      ['``` ', { kind: 'code', language: null }],
      ['```js ', { kind: 'code', language: 'js' }],
      ['---', { kind: 'divider' }],
    ];
    for (const [text, rule] of cases) {
      const match = matchBlockRule(text, PARAGRAPH);
      expect(match, text).toEqual({ rule, length: text.length });
      expect(Object.isFrozen(match) && Object.isFrozen(match?.rule)).toBe(true);
    }
  });

  it('keeps the text after the caret for every rule but the divider, which needs an empty paragraph', () => {
    const before: TextEditorBlockRuleScope = { ...PARAGRAPH, atEnd: false };
    expect(matchBlockRule('## ', before)?.rule).toEqual({ kind: 'heading', level: 2 });
    expect(matchBlockRule('> ', before)?.rule).toEqual({ kind: 'quote' });
    expect(matchBlockRule('---', before)).toBeNull();
  });

  it('never converts a pattern outside the table, nor one in a place the rules exclude', () => {
    for (const text of [
      'a # ',
      '#x',
      '####### ',
      '[] ',
      '[X] ',
      '~~~ ',
      '```Python ',
      '````js ',
      '```js-x ',
      '*** ',
      '___ ',
      '--- ',
      '----',
      '1) ',
      '-  ',
      '1234567890. ',
      '>  ',
      '#',
    ])
      expect(matchBlockRule(text, PARAGRAPH), JSON.stringify(text)).toBeNull();
  });

  it('applies only at the start of a top-level paragraph, never in a list item, quote, heading, code or cell', () => {
    const nested: TextEditorBlockRuleScope = { ...PARAGRAPH, topLevelParagraph: false };
    const inCode: TextEditorBlockRuleScope = { ...PARAGRAPH, inCode: true };
    for (const text of ['# ', '- ', '1. ', '[ ] ', '> ', '```js ', '---']) {
      expect(matchBlockRule(text, nested), text).toBeNull();
      expect(matchBlockRule(text, inCode), text).toBeNull();
    }
  });
});

describe('inline input rules (uwg-te-tab-input-rules r8–r13, uwg-te-req-key-7)', () => {
  it('completes every formatting rule of the table on its closing delimiter', () => {
    const cases = [
      ['**x**', { mark: 'bold' }, 2],
      ['__x__', { mark: 'bold' }, 2],
      ['*x*', { mark: 'italic' }, 1],
      ['_x_', { mark: 'italic' }, 1],
      ['`x`', { mark: 'code' }, 1],
      ['~~x~~', { mark: 'strike' }, 2],
      ['==x==', { mark: 'highlight', color: 'yellow' }, 2],
    ] as const;
    for (const [pattern, rule, size] of cases) {
      const text = `say ${pattern}`;
      const match = matchInlineRule(text, TEXT, URLS);
      expect(match, text).toEqual({
        rule,
        from: 4,
        textFrom: 4 + size,
        textTo: 5 + size,
        to: text.length,
      });
      expect(Object.isFrozen(match) && Object.isFrozen(match?.rule)).toBe(true);
    }
  });

  it('needs the opening delimiter at the start, after whitespace or after a hard break', () => {
    expect(matchInlineRule('**bold**', TEXT, URLS)?.from).toBe(0);
    expect(matchInlineRule('one\n**two**', TEXT, URLS)?.from).toBe(4);
    expect(matchInlineRule('one\t*two*', TEXT, URLS)?.from).toBe(4);
    for (const text of ['a**b**', 'snake_case_', 'x~~y~~', 'x==y==', `${NODE}**b**`, '(*b*'])
      expect(matchInlineRule(text, TEXT, URLS), JSON.stringify(text)).toBeNull();
  });

  it('lets inline code open after any character but a backtick', () => {
    expect(matchInlineRule('call`fn`', TEXT, URLS)).toMatchObject({
      rule: { mark: 'code' },
      from: 4,
      textFrom: 5,
      textTo: 7,
    });
    expect(matchInlineRule('``fn`', TEXT, URLS)).toBeNull();
    expect(matchInlineRule('``fn``', TEXT, URLS)).toBeNull();
  });

  it('refuses text that starts or ends with whitespace, holds a delimiter, a hard break or a node', () => {
    for (const text of [
      '** x**',
      '**x **',
      '* x*',
      '` x`',
      '== x==',
      '****',
      '**',
      '***x***',
      '***x**',
      '**a*b**',
      '==a=b==',
      '**a\nb**',
      `**a${NODE}b**`,
      '~x~',
      '=x=',
    ])
      expect(matchInlineRule(text, TEXT, URLS), JSON.stringify(text)).toBeNull();
  });

  it('links [t](url) when url passes the link policy', () => {
    const text = 'see [docs](https://example.com/a)';
    expect(matchInlineRule(text, TEXT, URLS)).toEqual({
      rule: { mark: 'link', href: 'https://example.com/a' },
      from: 4,
      textFrom: 5,
      textTo: 9,
      to: text.length,
    });
    expect(matchInlineRule('[top](#intro)', TEXT, URLS)?.rule).toEqual({
      mark: 'link',
      href: '#intro',
    });
    expect(matchInlineRule('[mail](mailto:me@example.com)', TEXT, URLS)?.rule).toEqual({
      mark: 'link',
      href: 'mailto:me@example.com',
    });
    expect(matchInlineRule('word[t](/a)', TEXT, URLS)?.from).toBe(4);
    for (const text of [
      '[t](javascript:void)',
      '[t](a b)',
      '[](https://a.com)',
      '[t]()',
      '[t](a)x',
    ])
      expect(matchInlineRule(text, TEXT, URLS), text).toBeNull();
    expect(matchInlineRule('[t](http://example.com)', TEXT, HTTPS_ONLY)).toBeNull();
  });

  it('applies no inline rule in code, and applies them in a link', () => {
    const code: TextEditorInlineRuleScope = { inCode: true, inLink: false };
    for (const text of ['**x**', '*x*', '`x`', '==x==', '[t](https://a.com)'])
      expect(matchInlineRule(text, code, URLS), text).toBeNull();
    expect(matchInlineRule('**x**', { inCode: false, inLink: true }, URLS)?.rule).toEqual({
      mark: 'bold',
    });
  });
});

describe('autolinks (uwg-te-tab-input-rules r14, uwg-te-req-key-7)', () => {
  it('links the URL that ends the text before the trigger, as the Markdown dialect autolinks it', () => {
    expect(matchAutolink('visit https://example.com/a?b=1', TEXT, URLS)).toEqual({
      from: 6,
      to: 31,
      href: 'https://example.com/a?b=1',
    });
    expect(matchAutolink('www.example.com', TEXT, URLS)).toEqual({
      from: 0,
      to: 15,
      href: 'http://www.example.com',
    });
    expect(matchAutolink('mail me@example.com', TEXT, URLS)).toEqual({
      from: 5,
      to: 19,
      href: 'mailto:me@example.com',
    });
    expect(matchAutolink(`one\nhttps://a.example`, TEXT, URLS)?.from).toBe(4);
    expect(matchAutolink(`${NODE}https://a.example`, TEXT, URLS)?.from).toBe(1);
  });

  it('leaves out the punctuation that ends a sentence, as the dialect does', () => {
    expect(matchAutolink('see https://example.com.', TEXT, URLS)).toEqual({
      from: 4,
      to: 23,
      href: 'https://example.com',
    });
    expect(matchAutolink('(https://example.com)', TEXT, URLS)).toEqual({
      from: 1,
      to: 20,
      href: 'https://example.com',
    });
  });

  it('finds nothing that the dialect does not autolink, or after the trigger', () => {
    for (const text of [
      'example',
      'foo.bar',
      'http://localhost',
      'x:https://example.com',
      'https://example.com x',
      'https://example.com ',
      '[t](https://example.com)',
      '<https://example.com>',
      '',
    ])
      expect(matchAutolink(text, TEXT, URLS), JSON.stringify(text)).toBeNull();
  });

  it('applies the link policy and never runs in code or a link', () => {
    expect(matchAutolink('http://example.com', TEXT, HTTPS_ONLY)).toBeNull();
    expect(matchAutolink('me@example.com', TEXT, HTTPS_ONLY)).toBeNull();
    expect(matchAutolink('https://example.com', TEXT, HTTPS_ONLY)?.href).toBe(
      'https://example.com',
    );
    expect(matchAutolink('https://example.com', { inCode: true, inLink: false }, URLS)).toBeNull();
    expect(matchAutolink('https://example.com', { inCode: false, inLink: true }, URLS)).toBeNull();
  });
});

describe('single URL check (uwg-te-req-content-6)', () => {
  it('reads one absolute, www or email URL that passes the link policy', () => {
    expect(matchUrl(' https://example.com/a?b=1 ', URLS)).toBe('https://example.com/a?b=1');
    expect(matchUrl('www.example.com', URLS)).toBe('http://www.example.com');
    expect(matchUrl('me@example.com', URLS)).toBe('mailto:me@example.com');
    expect(matchUrl('mailto:me@example.com', URLS)).toBe('mailto:me@example.com');
    expect(matchUrl('tel:+15550100', URLS)).toBe('tel:+15550100');
  });

  it('refuses text that is not one URL or fails the policy', () => {
    for (const text of [
      '',
      'see https://example.com',
      'https://example.com b',
      '/docs/intro',
      'example',
      'javascript:alert(1)',
      '[t](https://example.com)',
    ])
      expect(matchUrl(text, URLS), text).toBeNull();
    expect(matchUrl('http://example.com', HTTPS_ONLY)).toBeNull();
  });
});

describe('uwg-te-tab-input-rules: the characters that complete an inline rule', () => {
  it('are the last characters of the formatting delimiters and the link rule, each once', () => {
    expect([...INLINE_RULE_TRIGGERS].sort()).toEqual([')', '*', '=', '_', '`', '~']);
    expect(Object.isFrozen(INLINE_RULE_TRIGGERS)).toBe(true);
    const urls = { links: ['https:'], images: ['https:'] };
    for (const text of [
      '**a**',
      '__a__',
      '~~a~~',
      '==a==',
      '*a*',
      '_a_',
      '`a`',
      '[a](https://b.example)',
    ])
      expect(INLINE_RULE_TRIGGERS).toContain(text.at(-1));
    expect(
      matchInlineRule('[a](https://b.example)', { inCode: false, inLink: false }, urls),
    ).not.toBeNull();
  });
});
