/**
 * The type cards of the documentation, read from the TypeScript compiler at build
 * (`scripts/manifest/api-types.mjs` → `@tweakpad/ui/api-types.json`): signatures as highlighted
 * tokens whose type names open cards, and the cards themselves.
 */

import { tokenize } from '../foundation/code/tokenizer.js';

/**
 * The project types the docs open as cards, read from the TypeScript compiler at build
 * (`scripts/manifest/api-types.mjs` → `api-types.json`): a click on a type name in a signature
 * opens its card, and the names inside a card open theirs.
 */
export interface ApiTypes {
  /** Per element tag, the project type names its public signatures mention, by card id. */
  elements: Record<string, Record<string, string>>;
  /** The cards, by id (`<source file>#<name>`). */
  symbols: Record<string, ApiSymbol>;
}

/** One type's card: the declaration as the compiler prints it, its doc comment and its import. */
export interface ApiSymbol {
  name: string;
  kind: 'interface' | 'type' | 'class' | 'enum';
  /** The declaration, pretty-printed without comments; a class keeps only its header. */
  declaration: string;
  /** The doc comment, as an editor's hover shows it (Markdown). */
  documentation: string;
  /** The package entry that exports it (`@tweakpad/ui/drag-drop`). */
  importFrom?: string;
  /** The project type names the declaration mentions, by card id. */
  refs: Record<string, string>;
}

/** One highlighted piece of a signature or declaration; `ref` is the card a click opens. */
export interface ApiToken {
  text: string;
  /** The syntax role, colored by `--tp-syntax-<scope>`; absent for plain text. */
  scope?: string;
  ref?: string;
}

/**
 * Code as highlighted lines of tokens, every type name in `refs` carrying the id of its card.
 * The same tokenizer as the Code block, so a signature reads like the code around it.
 */
export function typeTokens(
  code: string,
  refs: Readonly<Record<string, string>> = {},
): ApiToken[][] {
  return tokenize(code, 'ts').lines.map((line) =>
    line.map((token): ApiToken => {
      const ref = Object.hasOwn(refs, token.text) ? refs[token.text] : undefined;
      return {
        text: token.text,
        ...(token.scope && token.scope !== 'plain' ? { scope: token.scope } : {}),
        ...(ref ? { ref } : {}),
      };
    }),
  );
}

/** A signature of an element (a Properties type, a method's return, an event's detail) as tokens. */
export function signatureTokens(
  types: ApiTypes | undefined,
  tag: string,
  code: string,
): ApiToken[] {
  return typeTokens(code, types?.elements[tag]).flat();
}

/** The ids of every card the signatures of `tags` reach, directly or through other cards, sorted. */
export function reachedSymbols(types: ApiTypes | undefined, tags: readonly string[]): string[] {
  const reached = new Set<string>();
  const visit = (id: string) => {
    const symbol = types?.symbols[id];
    if (!symbol || reached.has(id)) return;
    reached.add(id);
    for (const ref of Object.values(symbol.refs)) visit(ref);
  };
  for (const tag of tags) for (const id of Object.values(types?.elements[tag] ?? {})) visit(id);
  return [...reached].sort();
}

/** A card, its declaration as token lines and the line that imports it; undefined when unknown. */
export function symbolCard(
  types: ApiTypes | undefined,
  id: string,
): (ApiSymbol & { id: string; lines: ApiToken[][]; importLine?: string }) | undefined {
  const symbol = types?.symbols[id];
  if (!symbol) return undefined;
  return {
    ...symbol,
    id,
    lines: typeTokens(symbol.declaration, symbol.refs),
    ...(symbol.importFrom
      ? {
          importLine: `import ${symbol.kind === 'class' || symbol.kind === 'enum' ? '' : 'type '}{ ${symbol.name} } from '${symbol.importFrom}';`,
        }
      : {}),
  };
}
