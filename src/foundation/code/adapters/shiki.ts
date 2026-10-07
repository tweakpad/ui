/**
 * Shiki adapter. The library never imports Shiki: pass a highlighter you created, with the
 * themes and languages you need already loaded.
 *
 * ```ts
 * import { createHighlighter } from 'shiki';
 * import { createShikiHighlighter } from '@tweakpad/ui/code';
 * const shiki = await createHighlighter({ themes: ['github-light', 'github-dark'], langs: ['ts'] });
 * block.highlighter = createShikiHighlighter(shiki, {
 *   themes: { light: 'github-light', dark: 'github-dark' },
 * });
 * ```
 */
import { builtinHighlighter } from '../builtin.js';
import {
  plainTokens,
  splitLines,
  type CodeHighlighter,
  type CodeToken,
  type CodeTokens,
} from '../types.js';

/** The structural slice of a Shiki token this adapter reads. */
export interface ShikiTokenLike {
  content: string;
  color?: string;
  fontStyle?: number;
  /** `codeToTokens` with `themes`: `{ color | --shiki-light, --shiki-dark, font-style… }`. */
  htmlStyle?: Record<string, string>;
  /** `codeToTokensWithThemes`: styles per theme key. */
  variants?: Record<string, { color?: string; fontStyle?: number }>;
}

/** The structural slice of a Shiki highlighter this adapter calls. */
export interface ShikiHighlighterLike {
  codeToTokens(
    code: string,
    options: { lang: string; themes: { light: string; dark: string } },
  ): { tokens: ShikiTokenLike[][] };
  getLoadedLanguages?(): string[];
}

export interface ShikiHighlighterOptions {
  themes: { light: string; dark: string };
  /** Used for languages Shiki has not loaded; defaults to the built-in highlighter. */
  fallback?: CodeHighlighter;
}

const PLAIN = new Set(['plaintext', 'plain', 'text', 'txt']);

/** Shiki `FontStyle` bit flags: 1 italic, 2 bold, 4 underline. */
function fontStyleOf(token: ShikiTokenLike): CodeToken['fontStyle'] {
  const flags = token.variants?.light?.fontStyle ?? token.fontStyle;
  if (flags !== undefined && flags > 0) {
    if (flags & 1) return 'italic';
    if (flags & 2) return 'bold';
    if (flags & 4) return 'underline';
  }
  const style = token.htmlStyle ?? {};
  if (/italic/.test(style['font-style'] ?? style['--shiki-light-font-style'] ?? ''))
    return 'italic';
  if (/bold|[6-9]00/.test(style['font-weight'] ?? style['--shiki-light-font-weight'] ?? ''))
    return 'bold';
  if (/underline/.test(style['text-decoration'] ?? style['--shiki-light-text-decoration'] ?? ''))
    return 'underline';
  return undefined;
}

function tokenOf(token: ShikiTokenLike): CodeToken {
  const style = token.htmlStyle ?? {};
  const light =
    token.variants?.light?.color ?? style['--shiki-light'] ?? style.color ?? token.color;
  const dark = token.variants?.dark?.color ?? style['--shiki-dark'] ?? light;
  const fontStyle = fontStyleOf(token);
  return {
    text: token.content,
    ...(light ? { light } : {}),
    ...(dark ? { dark } : {}),
    ...(fontStyle ? { fontStyle } : {}),
  };
}

export function createShikiHighlighter(
  highlighter: ShikiHighlighterLike,
  options: ShikiHighlighterOptions,
): CodeHighlighter {
  const fallback = options.fallback ?? builtinHighlighter;
  const adapter: CodeHighlighter = {
    name: 'shiki',
    highlight(code, language, context) {
      const lang = language.trim().toLowerCase();
      if (PLAIN.has(lang)) return plainTokens(code.replace(/\r\n?/g, '\n'), lang);
      const loaded = highlighter.getLoadedLanguages?.();
      if (loaded && !loaded.includes(lang)) return fallback.highlight(code, language, context);
      let result: { tokens: ShikiTokenLike[][] };
      try {
        result = highlighter.codeToTokens(code, { lang, themes: options.themes });
      } catch {
        return fallback.highlight(code, language, context);
      }
      // Shiki reports a final empty line for a trailing newline; splitLines does not.
      const count = splitLines(code).length;
      const tokens: CodeTokens = {
        language: lang,
        lines: result.tokens
          .slice(0, count)
          .map((line) => line.filter((token) => token.content).map(tokenOf)),
      };
      return tokens;
    },
  };
  // Report languages only when Shiki can list them (aliases included); absent means "try any".
  const loadedLanguages = highlighter.getLoadedLanguages?.bind(highlighter);
  if (loadedLanguages)
    Object.defineProperty(adapter, 'languages', { enumerable: true, get: loadedLanguages });
  return adapter;
}
