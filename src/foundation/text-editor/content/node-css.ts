/**
 * The styles of custom node definitions (Widgets `uwg-te-req-pres-8`, `uwg-te-tab-vocabulary`
 * r15).
 *
 * A custom block renders with the class `tp-te-block-<name>` and a custom inline node with
 * `tp-te-inline-<name>`, on both engines and in the preview, each with `data-type` and its
 * attributes. The `css` of a definition styles them: the widget adopts it into its shadow root
 * nested under the content part, so its rules reach the document and nothing else. Its selectors
 * are relative to the content part, as nested rules are; declarations outside a rule apply to the
 * content part itself. At-rules that a style rule cannot hold, such as `@keyframes`,
 * `@font-face` and `@import`, have no effect.
 */
import type { TextEditorNodeDefinition } from '../nodes.js';

/**
 * Whether CSS text keeps to one block: its braces balance outside comments and strings, never
 * closing more than they opened, and every comment and string ends. Text that fails could close
 * the rule it is nested in and reach outside it.
 */
export function isContainedCss(css: string): boolean {
  let depth = 0;
  let index = 0;
  while (index < css.length) {
    const char = css[index]!;
    if (char === '/' && css[index + 1] === '*') {
      const end = css.indexOf('*/', index + 2);
      if (end < 0) return false;
      index = end + 2;
      continue;
    }
    if (char === '"' || char === "'") {
      index += 1;
      while (index < css.length && css[index] !== char) {
        if (css[index] === '\n') return false;
        index += css[index] === '\\' ? 2 : 1;
      }
      if (index >= css.length) return false;
    } else if (char === '\\') index += 1;
    else if (char === '{') depth += 1;
    else if (char === '}' && --depth < 0) return false;
    index += 1;
  }
  return depth === 0;
}

/**
 * The CSS text of the definitions' styles, each nested in one rule of `scope`, in definition
 * order; definitions without `css`, with only whitespace or with CSS that is not contained
 * (`isContainedCss`) add nothing. Empty when none adds a rule.
 */
export function nodeCssText(nodes: readonly TextEditorNodeDefinition[], scope: string): string {
  return nodes
    .flatMap((node) => {
      const css = typeof node.css === 'string' ? node.css.trim() : '';
      return css && isContainedCss(css) ? [`${scope} {\n${css}\n}`] : [];
    })
    .join('\n');
}
