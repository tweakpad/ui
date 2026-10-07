import { interactiveMarkupExample, markupExample } from './documentation-examples.js';
import { setupCodeBlockExample } from './code-block-example.js';
import setupSource from './code-block-example.js?raw';

/** Escapes source so it can be authored as the element's text content. */
const escape = (code: string) =>
  code.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const block = (attributes: string, code: string) =>
  `<tp-code-block ${attributes}>\n${escape(code)}\n</tp-code-block>`;

export const typescriptSample = `import { LitElement, html } from 'lit';

/** Counts presses and announces the total. */
export class TpCounter extends LitElement {
  static properties = { count: { type: Number } };
  count = 0;

  render() {
    return html\`<button @click=\${() => this.count++}>Pressed \${this.count} times</button>\`;
  }
}

customElements.define('tp-counter', TpCounter);`;

const htmlSample = `<tp-field label="Email">
  <tp-input type="email" placeholder="name@example.com"></tp-input>
</tp-field>
<!-- The Field labels and describes its control. -->
<tp-button type="submit">Subscribe</tp-button>`;

const cssSample = `.workspace {
  --tp-radius: 0.75rem;
  display: grid;
  gap: var(--tp-space-4);
}

@media (width <= 40rem) {
  .workspace { grid-template-columns: 1fr; }
}`;

const jsonSample = `{
  "name": "@tweakpad/ui",
  "version": "0.1.0",
  "peerDependencies": { "lit": "^3.3.0" },
  "sideEffects": ["./dist/register.js"]
}`;

const bashSample = `# Install the library and its only peer dependency
npm install @tweakpad/ui lit
npx storybook dev -p 6006 --no-open`;

const diffSample = `export function total(items) {
-  let sum = 0;
-  for (const item of items) sum += item.price;
-  return sum;
+  return items.reduce((sum, item) => sum + item.price, 0);
 }`;

const longSample = Array.from(
  { length: 24 },
  (_, index) => `const step${index + 1} = await runStep(${index + 1}); // ${'·'.repeat(index % 6)}`,
).join('\n');

export const codeBlockExamples = [
  markupExample(
    'Title and copy',
    block('language="typescript" label="counter.ts"', typescriptSample),
    'label (or the title slot) adds a header with the language; the copy action copies the original source and announces the result.',
  ),
  markupExample(
    'Line numbers and highlighted lines',
    block(
      'language="typescript" label="counter.ts" line-numbers highlight-lines="5,7-9"',
      typescriptSample,
    ),
    'line-numbers adds a sticky gutter that stays in place while the code scrolls horizontally; highlight-lines takes lines and ranges.',
  ),
  markupExample(
    'Diff',
    block(
      'language="javascript" label="total.js" line-numbers added-lines="5" removed-lines="2-4"',
      diffSample.replace(/^[-+ ]/gm, ''),
    ),
    'added-lines and removed-lines mark inserted and deleted lines with a marker, a tint and screen-reader text.',
  ),
  markupExample(
    'Collapsible',
    block('language="typescript" label="steps.ts" collapsible collapsed-lines="8"', longSample),
    'collapsible clips the block to collapsed-lines and adds an Expand control; expanded is controllable and fires tp-value-change.',
  ),
  markupExample(
    'Without header',
    block('language="bash"', bashSample),
    'Without a title the copy action floats in the top inline-end corner.',
  ),
  markupExample(
    'Languages',
    `<div style="display:grid;gap:var(--tp-space-4)">\n${[
      block('language="html" label="form.html"', htmlSample),
      block('language="css" label="workspace.css"', cssSample),
      block('language="json" label="package.json"', jsonSample),
      block('language="diff" label="total.diff"', diffSample),
    ].join('\n')}\n</div>`,
    'The built-in tokenizer covers TypeScript and JavaScript (with JSX and lit html), HTML, CSS, JSON, Bash and diffs. Other languages render as plain text.',
  ),
  markupExample(
    'Token theme',
    `<div style="--tp-syntax-keyword: light-dark(#6d28d9, #c4b5fd); --tp-syntax-string: light-dark(#047857, #6ee7b7); --tp-syntax-function: light-dark(#1d4ed8, #93c5fd); --tp-syntax-comment: var(--tp-muted-foreground)">\n${block(
      'language="typescript" label="themed.ts"',
      typescriptSample,
    )}\n</div>`,
    'Syntax colors are --tp-syntax-* token roles; set them on any ancestor to restyle the built-in highlighter.',
  ),
  interactiveMarkupExample(
    'Shiki adapter',
    `<div id="code-block-shiki">\n${block(
      'data-shiki language="typescript" label="counter.ts" line-numbers',
      typescriptSample,
    )}\n</div>`,
    setupCodeBlockExample,
    `${setupSource.replaceAll("'../foundation/code/index.js'", "'@tweakpad/ui/code'")}\nsetupCodeBlockExample(document.getElementById('code-block-shiki'));`,
    'createShikiHighlighter adapts a Shiki highlighter you create; its GitHub light and dark themes follow the page color scheme. The block shows plain text until Shiki loads.',
  ),
];

/** Copyable source of the default story. */
export const codeBlockDefaultSource = block('language="typescript"', typescriptSample);
