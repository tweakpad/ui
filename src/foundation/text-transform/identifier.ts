/**
 * Identifier word splitting and joining for Text transform (Foundation §18.23 `ttf-case`).
 */
import { toLower, toUpper, upperFirst } from './case.js';

const SEPARATORS = /[\s\-_.]+/u;
// A lowercase letter or digit before an uppercase letter, and the last uppercase letter of an
// uppercase run that a lowercase letter follows (`XMLHttp` → `XML`, `Http`).
const CASE_BOUNDARY = /(?<=[\p{Ll}\p{N}])(?=\p{Lu})|(?<=\p{Lu})(?=\p{Lu}\p{Ll})/u;

/** Splits an identifier or phrase into words. */
export function identifierWords(text: string): string[] {
  return text
    .split(SEPARATORS)
    .flatMap((chunk) => chunk.split(CASE_BOUNDARY))
    .filter(Boolean);
}

export type IdentifierCase = 'camel' | 'pascal' | 'kebab' | 'snake' | 'constant' | 'humanize';

/** Joins the identifier words of `text` in `style`. */
export function identifierCase(text: string, style: IdentifierCase, locale?: string): string {
  const words = identifierWords(text).map((word) => toLower(word, locale));
  switch (style) {
    case 'camel':
      return words.map((word, index) => (index ? upperFirst(word, locale) : word)).join('');
    case 'pascal':
      return words.map((word) => upperFirst(word, locale)).join('');
    case 'kebab':
      return words.join('-');
    case 'snake':
      return words.join('_');
    case 'constant':
      return words.map((word) => toUpper(word, locale)).join('_');
    case 'humanize':
      return upperFirst(words.join(' '), locale);
  }
}
