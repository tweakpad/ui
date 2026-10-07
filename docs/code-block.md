# Code block

`tp-code-block` presents source code with syntax colors, an optional title, a copy
action, line numbers, highlighted and diff lines, and a collapsible height. The source
comes from `code` or, when that property is unset, from the element's text content
(dedented, with the surrounding blank lines removed). Highlighting comes from a
**highlighter**: the built-in tokenizer by default, or an adapter such as Shiki.

```html
<tp-code-block language="typescript" label="counter.ts" line-numbers highlight-lines="3">
  import { html } from 'lit'; export const view = (count: number) => html`
  <p>Pressed ${count} times</p>
  `;
</tp-code-block>
```

Author source as text: escape `<` and `&` (`&lt;`, `&amp;`) in markup, or set `code` from
script. Text content is read when the element connects and whenever it changes.

## Properties

| Property / attribute                                           | Values                                                                                                               | Default            |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `code`                                                         | source text; unset reads the text content                                                                            | `undefined`        |
| `language`                                                     | `typescript`, `javascript`, `html`, `css`, `json`, `bash`, `diff`, `plaintext` or any language the highlighter knows | `plaintext`        |
| `label`                                                        | title text; the `title` slot replaces it                                                                             | `''` (no header)   |
| `highlighter`                                                  | `CodeHighlighter` or `null` (property only)                                                                          | built-in tokenizer |
| `lineNumbers` / `line-numbers`                                 | boolean                                                                                                              | `false`            |
| `highlightLines` / `highlight-lines`                           | lines and ranges, such as `1,3-5`                                                                                    | `''`               |
| `addedLines` / `added-lines`                                   | lines and ranges                                                                                                     | `''`               |
| `removedLines` / `removed-lines`                               | lines and ranges                                                                                                     | `''`               |
| `collapsible`                                                  | boolean                                                                                                              | `false`            |
| `expanded` (property) / `defaultExpanded` / `default-expanded` | boolean; `expanded` is controlled, `undefined` uncontrolled                                                          | `false`            |
| `collapsedLines` / `collapsed-lines`                           | visible lines while collapsed                                                                                        | `12`               |
| `copyable`                                                     | boolean; `copyable="false"` removes the copy action                                                                  | `true`             |
| `wrap`                                                         | boolean; wraps long lines instead of scrolling                                                                       | `false`            |
| `messages`                                                     | `CodeBlockMessages` (property only)                                                                                  | English            |

Messages: `code` (the figure name without a title, after the language), `copy`, `copied`,
`copyFailed`, `expand`, `collapse`, `added`, `removed`.

## Methods and events

- `copy()` copies the source text and resolves to whether it succeeded. The copy action
  calls it.
- `setExpanded(value, reason?)` proposes expansion and returns whether it was accepted.
- `source` is the text the block shows and copies.

| Event             | Cancelable | Detail                                                                                       |
| ----------------- | ---------- | -------------------------------------------------------------------------------------------- |
| `tp-code-copy`    | yes        | `text`; preventing it skips the copy                                                         |
| `tp-value-change` | yes        | `expanded` proposal (`trigger-press` or `imperative-action`)                                 |
| `tp-diagnostic`   | no         | `code-block-language` for unknown languages, `code-block-highlight` for highlighter failures |

Copying uses the Clipboard API with a fallback for documents where it is unavailable,
shows a check for two seconds and announces "Copied" (or "Copy failed") politely.

## Highlighters

A highlighter implements `highlight(code, language, { signal })` and returns
`CodeTokens` (lines of `{ text, scope?, light?, dark?, fontStyle? }` tokens) or a promise
of them. The block renders plain text first and swaps in the tokens without changing the
text, so slow highlighters never shift the layout. A newer request aborts `signal`.

The built-in tokenizer (`builtinHighlighter`) covers TypeScript and JavaScript (including
JSX and lit `html` templates), HTML, CSS, JSON, Bash and diffs. Other languages render as
plain text with a diagnostic.

For full grammar coverage, adapt Shiki from `@tweakpad/ui/code`. The library never
imports Shiki; you create the highlighter with the languages and themes you need:

```js
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { createShikiHighlighter } from '@tweakpad/ui/code';

const shiki = await createHighlighterCore({
  engine: createJavaScriptRegexEngine(),
  themes: [import('@shikijs/themes/github-light'), import('@shikijs/themes/github-dark')],
  langs: [import('@shikijs/langs/typescript'), import('@shikijs/langs/html')],
});
document.querySelector('tp-code-block').highlighter = createShikiHighlighter(shiki, {
  themes: { light: 'github-light', dark: 'github-dark' },
});
```

Languages Shiki has not loaded fall back to the built-in tokenizer.

## Theming

Scoped tokens use the `--tp-syntax-*` roles: `comment`, `keyword`, `string`, `number`,
`function`, `type`, `constant`, `variable`, `property`, `tag`, `attribute`, `operator`,
`inserted` and `deleted`. Each default is a `light-dark()` pair, so the palette follows the
color scheme; set any role on an ancestor to restyle the built-in highlighter. Tokens
with explicit colors (Shiki themes) use their light or dark color for the current scheme.

Parts: `code-block`, `header`, `title`, `language`, `viewport`, `line`, `line-number`,
`line-marker`, `token` and `expand`; the presentation keys are prefixed `code-block-`.
Lines publish `data-highlighted`, `data-inserted` and `data-deleted`; tokens publish
`data-scope`. The host reflects `data-collapsed` and `data-expanded`.

## Accessibility

The block is a figure named by its title, or by the language and the `code` message.
The scroll region becomes focusable (and a labelled region) only when it overflows, so
keyboard users can scroll it. Code stays left-to-right in right-to-left pages. Line
numbers and diff markers are hidden from assistive technology; added and removed lines
carry visually hidden text. The Expand control exposes `aria-expanded` and controls the
viewport. Reduced motion removes the height transition.
