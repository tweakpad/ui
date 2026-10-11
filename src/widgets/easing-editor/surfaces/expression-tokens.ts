/**
 * Tokens of an easing expression (`700ms cubic-bezier(0.34, 1.56, 0.64, 1)`): the numbers are
 * highlighted and tunable, the units read muted, the rest is plain text.
 */
export type ExpressionTokenType = 'number' | 'unit' | 'text';

export interface ExpressionToken {
  readonly type: ExpressionTokenType;
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

const NUMBER_WITH_UNIT = /(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)(ms|s|%)?/gi;

export function tokenizeExpression(text: string): ExpressionToken[] {
  const tokens: ExpressionToken[] = [];
  let cursor = 0;
  for (const match of text.matchAll(NUMBER_WITH_UNIT)) {
    const start = match.index;
    const number = match[1]!;
    const unit = match[2];
    if (start > cursor)
      tokens.push({ type: 'text', text: text.slice(cursor, start), start: cursor, end: start });
    tokens.push({ type: 'number', text: number, start, end: start + number.length });
    cursor = start + number.length;
    if (unit) {
      tokens.push({ type: 'unit', text: unit, start: cursor, end: cursor + unit.length });
      cursor += unit.length;
    }
  }
  if (cursor < text.length)
    tokens.push({ type: 'text', text: text.slice(cursor), start: cursor, end: text.length });
  return tokens;
}

export interface TunedExpression {
  readonly text: string;
  readonly start: number;
  readonly end: number;
  /** Index among the number tokens, so the tuned number can be re-selected after a re-render. */
  readonly index: number;
}

const decimalsOf = (value: string | number): number => {
  const text = String(value);
  const dot = text.indexOf('.');
  return dot < 0 ? 0 : text.length - dot - 1;
};

/** The number token holding the caret, or the one ending at it. */
export function numberTokenAt(text: string, caret: number): ExpressionToken | null {
  const numbers = tokenizeExpression(text).filter((token) => token.type === 'number');
  return numbers.find((token) => caret >= token.start && caret <= token.end) ?? null;
}

/**
 * Steps the number at the caret by its unit's step (0.01, 10 for `ms`, 1 for `%`), ten times
 * that with the large modifier and a tenth with the small one, keeping the number's decimals.
 */
export function stepNumberAt(
  text: string,
  caret: number,
  direction: 1 | -1,
  modifiers: { large?: boolean; small?: boolean } = {},
): TunedExpression | null {
  const tokens = tokenizeExpression(text);
  const numbers = tokens.filter((token) => token.type === 'number');
  const token = numbers.find((entry) => caret >= entry.start && caret <= entry.end);
  if (!token) return null;
  const unit = tokens
    .find((entry) => entry.type === 'unit' && entry.start === token.end)
    ?.text.toLowerCase();
  const base = unit === 'ms' ? 10 : unit === '%' ? 1 : 0.01;
  const step = modifiers.large ? base * 10 : modifiers.small ? base / 10 : base;
  const value = Number(token.text);
  if (!Number.isFinite(value)) return null;
  const decimals = Math.min(3, Math.max(decimalsOf(token.text), decimalsOf(step)));
  const replacement = String(Number((value + direction * step).toFixed(decimals)));
  return {
    text: text.slice(0, token.start) + replacement + text.slice(token.end),
    start: token.start,
    end: token.start + replacement.length,
    index: numbers.indexOf(token),
  };
}

/** The `[start, end)` of the n-th number token, for re-selecting a tuned number. */
export function numberTokenRange(text: string, index: number): [number, number] | null {
  const numbers = tokenizeExpression(text).filter((token) => token.type === 'number');
  const token = numbers[index];
  return token ? [token.start, token.end] : null;
}
