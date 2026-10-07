import { lex, type Grammar, type LexRule, type RawToken } from '../lexer.js';

/**
 * Whether the text from `offset` is a declaration rather than a selector: a declaration ends at
 * `;` or `}` before any `{` (nested rules and rules inside `@media` blocks open a block).
 */
function declares(source: string, offset: number): boolean {
  for (let index = offset; index < source.length; index++) {
    const char = source[index];
    if (char === '{') return false;
    if (char === ';' || char === '}') return true;
  }
  return true;
}

/**
 * CSS is context dependent: the same identifier is a selector, a property or a value. One pass
 * tracks block depth and whether a declaration value is open.
 */
export const css: Grammar = (code) => {
  let depth = 0;
  let value = false;
  const context: LexRule = {
    match(source, offset): RawToken[] | null {
      const char = source[offset];
      if (char === '{') {
        depth++;
        value = false;
        return [{ text: char, scope: 'punctuation' }];
      }
      if (char === '}') {
        depth = Math.max(0, depth - 1);
        value = false;
        return [{ text: char, scope: 'punctuation' }];
      }
      if (char === ';') {
        value = false;
        return [{ text: char, scope: 'punctuation' }];
      }
      const word = /-?[A-Za-z_][\w-]*/y;
      if (depth > 0 && !value) {
        if (char === ':' && declares(source, offset)) {
          value = true;
          return [{ text: char, scope: 'punctuation' }];
        }
        word.lastIndex = offset;
        const property = word.exec(source)?.[0];
        if (
          property &&
          /^\s*:(?!:)/.test(source.slice(offset + property.length)) &&
          declares(source, offset + property.length)
        )
          return [{ text: property, scope: 'property' }];
      }
      if (value) {
        const color = /#[\da-fA-F]{3,8}\b/y;
        color.lastIndex = offset;
        const hex = color.exec(source)?.[0];
        if (hex) return [{ text: hex, scope: 'number' }];
        const number = /-?(?:\d+\.?\d*|\.\d+)(?:%|[A-Za-z]+)?/y;
        number.lastIndex = offset;
        const numeric = number.exec(source)?.[0];
        if (numeric) return [{ text: numeric, scope: 'number' }];
        word.lastIndex = offset;
        const identifier = word.exec(source)?.[0];
        if (identifier) {
          const call = source[offset + identifier.length] === '(';
          return [{ text: identifier, scope: call ? 'function' : 'constant' }];
        }
        return null;
      }
      // Selector context.
      const selector = /([.#][\w-]+)|(::?[\w-]+)|(\[[^\]]*\]?)|([A-Za-z][\w-]*)/y;
      selector.lastIndex = offset;
      const part = selector.exec(source);
      if (!part) return null;
      const scope = part[3] ? 'attribute' : part[4] ? 'tag' : 'function';
      return [{ text: part[0], scope }];
    },
  };
  const rules: LexRule[] = [
    { pattern: /\s+/y },
    { scope: 'comment', pattern: /\/\*[\s\S]*?(?:\*\/|$)/y },
    { scope: 'string', pattern: /"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?/y },
    { scope: 'keyword', pattern: /@[\w-]+|!important/y },
    { scope: 'variable', pattern: /--[\w-]+/y },
    context,
    { scope: 'punctuation', pattern: /[(),>+~*]/y },
  ];
  return lex(code, rules);
};
