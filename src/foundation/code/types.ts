/**
 * Code highlighting contract (Foundation §18.13). A highlighter turns source text into lines of
 * scoped tokens; `tp-code-block` renders them. Adapters never import an engine package: the
 * consumer supplies the engine (for example a Shiki highlighter) and the adapter maps its output.
 */

/** Semantic token scopes. The built-in tokenizer emits them; colors come from `--tp-syntax-*`. */
export const CODE_SCOPES = [
  'comment',
  'keyword',
  'string',
  'number',
  'function',
  'type',
  'constant',
  'variable',
  'property',
  'tag',
  'attribute',
  'operator',
  'punctuation',
  'inserted',
  'deleted',
  'plain',
] as const;
/**
 * Semantic role of a code token, such as `keyword` or `string`, which picks its `--tp-syntax-*`
 * color.
 */
export type CodeScope = (typeof CODE_SCOPES)[number];

/** One run of highlighted source text with its scope and optional explicit colors. */
export interface CodeToken {
  /** Exact source text; concatenating every token of every line reproduces the input. */
  readonly text: string;
  readonly scope?: CodeScope;
  /** Explicit theme colors from an adapter (any CSS color); they win over the scope role. */
  readonly light?: string;
  readonly dark?: string;
  readonly fontStyle?: 'italic' | 'bold' | 'underline';
}

/** One entry per source line (split on `\n`; a trailing newline does not add a line). */
export interface CodeTokens {
  readonly lines: readonly (readonly CodeToken[])[];
  /** The language actually applied, `plaintext` after a fallback. */
  readonly language: string;
}

/** Context passed to `CodeHighlighter.highlight()` for one highlighting request. */
export interface CodeHighlightContext {
  /** Aborted when a newer request supersedes this one or the element disconnects. */
  readonly signal: AbortSignal;
}

/**
 * A tokenizer that turns source text into scoped tokens for a code block; supply one to replace or
 * extend the built-in highlighting.
 */
export interface CodeHighlighter {
  readonly name?: string;
  /** Languages (and aliases) this highlighter can tokenize; absent means "try any". */
  readonly languages?: readonly string[];
  highlight(
    code: string,
    language: string,
    context: CodeHighlightContext,
  ): CodeTokens | Promise<CodeTokens>;
}

/** Splits source into lines without the trailing empty line a final newline would create. */
export function splitLines(code: string): string[] {
  const lines = code.replace(/\r\n?/g, '\n').split('\n');
  if (lines.length > 1 && lines.at(-1) === '') lines.pop();
  return lines;
}

/** Plain, unscoped tokens: the first render and every fallback. */
export function plainTokens(code: string, language = 'plaintext'): CodeTokens {
  return { language, lines: splitLines(code).map((text) => (text ? [{ text }] : [])) };
}
