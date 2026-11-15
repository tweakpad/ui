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
import { isContainedCss } from '../../contained-css.js';
import type { TextEditorNodeDefinition } from '../nodes.js';

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
