import type { CodeScope, CodeToken } from './types.js';

/** A token before line splitting; `scope` absent means plain text. */
export interface RawToken {
  text: string;
  scope?: CodeScope | undefined;
}

/**
 * One lexer rule. `pattern` must be sticky (`y`): it is tried at the current offset. A `match`
 * function handles constructs a single pattern cannot (nesting, embedded languages, context);
 * it returns the tokens it consumed, or null to let the next rule try.
 */
export type LexRule =
  | { readonly scope?: CodeScope; readonly pattern: RegExp }
  | { readonly match: (code: string, offset: number) => RawToken[] | null };

/** Table-driven single pass: the first rule that consumes text wins; anything else is plain. */
export function lex(code: string, rules: readonly LexRule[]): RawToken[] {
  const tokens: RawToken[] = [];
  let offset = 0;
  while (offset < code.length) {
    let consumed = 0;
    for (const rule of rules) {
      if ('match' in rule) {
        const matched = rule.match(code, offset);
        const length = matched?.reduce((total, token) => total + token.text.length, 0) ?? 0;
        if (matched && length) {
          tokens.push(...matched);
          consumed = length;
          break;
        }
        continue;
      }
      rule.pattern.lastIndex = offset;
      const match = rule.pattern.exec(code);
      if (match?.[0]) {
        tokens.push({ text: match[0], scope: rule.scope });
        consumed = match[0].length;
        break;
      }
    }
    if (!consumed) {
      tokens.push({ text: code[offset]! });
      consumed = 1;
    }
    offset += consumed;
  }
  return tokens;
}

/** Splits lexed tokens at line breaks and merges neighbours of the same scope. */
export function toLines(tokens: readonly RawToken[]): CodeToken[][] {
  const lines: CodeToken[][] = [[]];
  for (const token of tokens) {
    const parts = token.text.split('\n');
    parts.forEach((part, index) => {
      if (index > 0) lines.push([]);
      if (!part) return;
      const line = lines.at(-1)!;
      const scope = token.scope === 'plain' ? undefined : token.scope;
      const previous = line.at(-1);
      if (previous && previous.scope === scope)
        line[line.length - 1] = scope
          ? { text: previous.text + part, scope }
          : { text: previous.text + part };
      else line.push(scope ? { text: part, scope } : { text: part });
    });
  }
  // A final newline does not start another line (same rule as splitLines).
  if (lines.length > 1 && lines.at(-1)!.length === 0) lines.pop();
  return lines;
}

/** A built-in language: source text in, plain-or-scoped tokens out (text preserved exactly). */
export type Grammar = (code: string) => RawToken[];
