import { describe, expect, it } from 'vitest';
import { builtinHighlighter } from './builtin.js';
import { BUILTIN_LANGUAGES, tokenize } from './tokenizer.js';
import { splitLines, type CodeScope, type CodeTokens } from './types.js';

const FIXTURES: Record<string, string> = {
  typescript: `import { html, LitElement } from 'lit';
/**
 * A multi-line
 * comment.
 */
@customElement('x-greeting')
export class Greeting extends LitElement {
  static styles = css\`:host { display: block; color: var(--tp-foreground); }\`;
  name: string | null = null;
  count = 0x1f + 1_000n;
  render() {
    const label = \`Hello \${this.name ?? 'world'}
spanning \${{ nested: { a: 1 } }.nested.a} lines\`;
    return html\`<p class="greeting" ?hidden=\${!this.name}>\${label}</p>\`;
  }
}
`,
  tsx: `export function Card({ title }: { title: string }) {
  return <div className="card" data-x={1 < 2}><Title>{title}</Title></div>;
}
const generic = Array<number>(3);`,
  html: `<!DOCTYPE html>
<!-- a comment
spanning lines -->
<main id=app class="layout" hidden>
  <tp-button variant='outline'>Save &amp; close</tp-button>
  <style>.layout { gap: 1rem; color: #fff }</style>
  <script type="module">const a = 1; console.log(a);</script>
  <img src="x.png" />
</main>`,
  css: `@media (width >= 40rem) {
  .card > a:hover, #main [data-open] {
    --gap: 4px;
    margin: 0 auto !important;
    color: rgb(0 0 0 / 50%);
    background: #ffcc00 url("x.svg");
  }
}
/* trailing
comment */`,
  json: `{
  "name": "@tweakpad/ui",
  "version": 1.5e3,
  "private": true,
  "files": ["dist", null],
  // jsonc comment
  "nested": { "a": -1 }
}
`,
  bash: `#!/usr/bin/env bash
# install
$ npm install --save-dev shiki && echo "done $HOME"
if [ -f "$FILE" ]; then
  export PATH="\${PATH}:/opt/bin" # path
fi
for f in *.ts; do cat "$f" | grep -n 'x'; done`,
  diff: `diff --git a/a.ts b/a.ts
index 1..2 100644
--- a/a.ts
+++ b/a.ts
@@ -1,3 +1,3 @@
 const a = 1;
-const b = 2;
+const b = 3;
`,
};

const text = (tokens: CodeTokens) => tokens.lines.map((line) => line.map((t) => t.text).join(''));
const scopeOf = (tokens: CodeTokens, value: string): CodeScope | undefined =>
  tokens.lines.flat().find((token) => token.text === value)?.scope;
const scopes = (tokens: CodeTokens, scope: CodeScope) =>
  tokens.lines
    .flat()
    .filter((token) => token.scope === scope)
    .map((token) => token.text);

describe('built-in tokenizer', () => {
  it('reproduces every input line exactly for every language', () => {
    for (const language of BUILTIN_LANGUAGES)
      for (const source of [...Object.values(FIXTURES), '', '\n', 'a\r\nb\r\n', '\n\nx\n\n']) {
        const result = tokenize(source, language);
        expect(text(result), `${language}`).toEqual(splitLines(source.replace(/\r\n?/g, '\n')));
      }
  });

  it('merges adjacent tokens of one scope and never emits empty tokens', () => {
    for (const [language, source] of Object.entries(FIXTURES))
      for (const line of tokenize(source, language).lines) {
        for (const token of line) expect(token.text).not.toBe('');
        for (let index = 1; index < line.length; index++)
          expect(line[index]!.scope).not.toBe(line[index - 1]!.scope);
      }
  });

  it('scopes TypeScript, lit templates and embedded languages', () => {
    const tokens = tokenize(FIXTURES.typescript!, 'ts');
    expect(scopeOf(tokens, 'import')).toBe('keyword');
    expect(scopeOf(tokens, 'Greeting')).toBe('type');
    expect(scopeOf(tokens, 'render')).toBe('function');
    expect(scopeOf(tokens, '@customElement')).toBe('function');
    expect(scopeOf(tokens, 'null')).toBe('constant');
    expect(scopes(tokens, 'property')).toContain('name');
    expect(scopeOf(tokens, ' * comment.')).toBe('comment');
    expect(scopes(tokens, 'number')).toEqual(expect.arrayContaining(['0x1f', '1_000n']));
    // Template literal expressions are code; lit html/css bodies use those grammars.
    expect(scopeOf(tokens, '${')).toBe('punctuation');
    expect(scopeOf(tokens, "'world'")).toBe('string');
    expect(scopeOf(tokens, 'p')).toBe('tag');
    expect(scopeOf(tokens, '"greeting"')).toBe('string');
    expect(scopeOf(tokens, 'display')).toBe('property');
    expect(scopeOf(tokens, ':host')).toBe('function');
  });

  it('scopes JSX tags without treating generics as tags', () => {
    const tokens = tokenize(FIXTURES.tsx!, 'tsx');
    expect(scopeOf(tokens, 'div')).toBe('tag');
    expect(scopeOf(tokens, 'Title')).toBe('type');
    expect(scopes(tokens, 'tag')).not.toContain('number');
    expect(tokenize('a < b', 'tsx').lines[0]!.some((t) => t.scope === 'tag')).toBe(false);
  });

  it('scopes HTML tags, attributes, entities and embedded style/script', () => {
    const tokens = tokenize(FIXTURES.html!, 'html');
    expect(scopeOf(tokens, '<!DOCTYPE html>')).toBe('keyword');
    expect(scopeOf(tokens, '<!-- a comment')).toBe('comment');
    expect(scopeOf(tokens, 'tp-button')).toBe('tag');
    expect(scopeOf(tokens, 'variant')).toBe('attribute');
    expect(scopeOf(tokens, "'outline'")).toBe('string');
    expect(scopeOf(tokens, 'app')).toBe('string');
    expect(scopeOf(tokens, 'hidden')).toBe('attribute');
    expect(scopeOf(tokens, '&amp;')).toBe('constant');
    expect(scopeOf(tokens, 'gap')).toBe('property');
    expect(scopeOf(tokens, 'console')).toBeUndefined();
    expect(scopeOf(tokens, 'log')).toBe('function');
  });

  it('scopes CSS selectors, properties and values by context', () => {
    const tokens = tokenize(FIXTURES.css!, 'css');
    expect(scopeOf(tokens, '@media')).toBe('keyword');
    expect(scopeOf(tokens, '.card')).toBe('function');
    expect(scopeOf(tokens, 'a')).toBe('tag');
    expect(scopeOf(tokens, ':hover')).toBe('function');
    expect(scopeOf(tokens, '[data-open]')).toBe('attribute');
    expect(scopeOf(tokens, '--gap')).toBe('variable');
    expect(scopeOf(tokens, 'margin')).toBe('property');
    expect(scopeOf(tokens, 'auto')).toBe('constant');
    expect(scopeOf(tokens, '!important')).toBe('keyword');
    expect(scopeOf(tokens, 'rgb')).toBe('function');
    expect(scopeOf(tokens, '#ffcc00')).toBe('number');
    expect(scopeOf(tokens, '4px')).toBe('number');
    expect(scopeOf(tokens, '#main')).toBe('function');
  });

  it('scopes JSON keys, values and JSONC comments', () => {
    const tokens = tokenize(FIXTURES.json!, 'jsonc');
    expect(scopeOf(tokens, '"name"')).toBe('property');
    expect(scopeOf(tokens, '"@tweakpad/ui"')).toBe('string');
    expect(scopeOf(tokens, '1.5e3')).toBe('number');
    expect(scopeOf(tokens, 'true')).toBe('constant');
    expect(scopeOf(tokens, 'null')).toBe('constant');
    expect(scopeOf(tokens, '// jsonc comment')).toBe('comment');
  });

  it('scopes shell commands, options, variables, keywords and prompts', () => {
    const tokens = tokenize(FIXTURES.bash!, 'bash');
    expect(scopeOf(tokens, '# install')).toBe('comment');
    expect(scopeOf(tokens, '$ ')).toBe('punctuation');
    expect(scopeOf(tokens, 'npm')).toBe('function');
    expect(scopeOf(tokens, 'install')).toBeUndefined();
    expect(scopeOf(tokens, '--save-dev')).toBe('attribute');
    expect(scopeOf(tokens, 'echo')).toBe('function');
    expect(scopeOf(tokens, '"done $HOME"')).toBe('string');
    expect(scopeOf(tokens, 'if')).toBe('keyword');
    expect(scopeOf(tokens, 'export')).toBe('keyword');
    expect(scopeOf(tokens, 'grep')).toBe('function');
    expect(scopeOf(tokens, '-n')).toBe('attribute');
    expect(scopeOf(tokens, 'in')).toBe('keyword');
  });

  it('scopes diff lines by marker', () => {
    const tokens = tokenize(FIXTURES.diff!, 'diff');
    expect(tokens.lines.map((line) => line[0]?.scope)).toEqual([
      'comment',
      'comment',
      'comment',
      'comment',
      'keyword',
      undefined,
      'deleted',
      'inserted',
    ]);
  });

  it('falls back to plain text for unknown languages and keeps plain aliases', () => {
    expect(tokenize('x = 1\n', 'cobol')).toEqual({
      language: 'plaintext',
      lines: [[{ text: 'x = 1' }]],
    });
    expect(tokenize('a\n\nb', 'text')).toEqual({
      language: 'text',
      lines: [[{ text: 'a' }], [], [{ text: 'b' }]],
    });
    expect(builtinHighlighter.languages).toEqual(expect.arrayContaining(['ts', 'svg', 'console']));
    expect(
      builtinHighlighter.highlight('a', 'TS', { signal: new AbortController().signal }),
    ).toEqual(tokenize('a', 'ts'));
  });
});
