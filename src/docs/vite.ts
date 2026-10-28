/**
 * A Vite plugin for the renderings that compile the documentation pages with MDX.
 *
 * MDX drops up to two leading spaces from every continuation line of an expression inside a JSX
 * attribute, so a multi-line sample written as code={`…`} would lose its nesting. Before MDX
 * parses a page, this rewrites the `code` and `script` template literals into one-line string
 * literals, which keep the indentation exactly as written. The renderings' own MDX plugin must
 * run after it: both are `pre` plugins, so this one goes first in the plugin list.
 *
 * A rendering without frontmatter support strips the page's frontmatter (`frontmatter: 'strip'`);
 * it reads title, description and tags from the parsed page instead.
 */

export interface LiteralCodeOptions {
  /** `keep` (default) leaves the frontmatter for the rendering's own loader. */
  readonly frontmatter?: 'keep' | 'strip';
}

export interface LiteralCodePlugin {
  readonly name: string;
  readonly enforce: 'pre';
  transform(source: string, id: string): { code: string; map: null } | undefined;
}

const LITERAL = /\b(code|script)=\{`((?:\\[\s\S]|[^`\\])*)`\}/g;
const FRONTMATTER = /^---\n[\s\S]*?\n---\n/;

/** The text of a template literal, with the three escapes the pages use resolved. */
export function unescapeLiteral(raw: string): string {
  return raw.replace(/\\([`$\\])/g, '$1');
}

export function literalCode(options: LiteralCodeOptions = {}): LiteralCodePlugin {
  return {
    name: 'tweakpad:literal-code',
    enforce: 'pre',
    transform(source, id) {
      // A page read as text (`?raw`) is a string export, not MDX.
      if (!id.endsWith('.mdx')) return undefined;
      let code = source.replace(
        LITERAL,
        (_, name: string, raw: string) => `${name}={${JSON.stringify(unescapeLiteral(raw))}}`,
      );
      if (options.frontmatter === 'strip') code = code.replace(FRONTMATTER, '');
      return code === source ? undefined : { code, map: null };
    },
  };
}
