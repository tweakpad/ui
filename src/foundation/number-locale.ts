/** Locale numeric primitives shared by formatting services and editable numeric controls. */
export type NumericText =
  { kind: 'number'; value: number } | { kind: 'empty' | 'incomplete' | 'invalid'; value: null };

const formatters = new Map<string, Intl.NumberFormat>();
export function numberFormatter(
  locale?: string | string[],
  options?: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = JSON.stringify([locale, options]);
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    if (formatters.size >= 64) formatters.delete(formatters.keys().next().value!);
    formatters.set(key, formatter);
  }
  return formatter;
}

const minus = /[-−－‒–—﹣]/gu;
const plus = /[+＋﹢]/gu;
const controls = /\p{Cf}/gu;
const percent = /[%٪％﹪]/u;
const permille = /[‰؉]/u;
const han = '零〇一二三四五六七八九';

/** Decimal shifting avoids binary noise from multiplying percent values by 0.01. */
export function shiftDecimal(value: number, places: number): number {
  const [coefficient, exponent = '0'] = String(value).split('e');
  return Number(`${coefficient}e${Number(exponent) + places}`);
}

export class NumberLocale {
  readonly formatter: Intl.NumberFormat;
  readonly decimal: string;
  readonly #digits = new Map<string, string>();
  readonly #groups = new Set<string>();
  readonly #decorations = new Set<string>();
  readonly #exponents = new Set<string>();
  readonly #allowed = new Set<string>(['.', ',', '．', '，', '٫', '٬', '+', '＋', '﹢']);

  constructor(
    readonly locale?: string | string[],
    readonly options?: Intl.NumberFormatOptions,
  ) {
    this.formatter = numberFormatter(locale, options);
    const digits = numberFormatter(locale, {
      useGrouping: false,
      numberingSystem: options?.numberingSystem,
    });
    for (let n = 0; n < 10; n++)
      this.#digits.set(digits.format(n).replace(controls, ''), String(n));
    this.decimal =
      numberFormatter(locale, { numberingSystem: options?.numberingSystem })
        .formatToParts(0.1)
        .find((part) => part.type === 'decimal')?.value ?? '.';
    this.#allowed.add(this.decimal);
    for (const sample of [0, 1, 2, 3, 11, 100, 11111.1, -11111.1]) {
      for (const part of this.formatter.formatToParts(sample)) {
        if (part.type === 'group') this.#groups.add(part.value);
        if (part.type === 'exponentSeparator') this.#exponents.add(part.value);
        if (['currency', 'unit', 'literal'].includes(part.type) && part.value.trim())
          this.#decorations.add(part.value.replace(controls, ''));
        if (!['integer', 'fraction', 'exponentInteger', 'compact'].includes(part.type))
          for (const char of part.value) this.#allowed.add(char);
      }
    }
    if (options?.style === 'percent' || (options?.style === 'unit' && options.unit === 'percent'))
      for (const char of '%٪％﹪‰؉') this.#allowed.add(char);
    if (options?.notation === 'scientific' || options?.notation === 'engineering') {
      this.#allowed.add('e');
      this.#allowed.add('E');
    }
  }

  allowsCharacter(char: string, allowNegative = true): boolean {
    if (/^[-−－‒–—﹣]$/u.test(char)) return allowNegative;
    return (
      this.#allowed.has(char) ||
      this.#digits.has(char) ||
      /^[0-9٠-٩۰-۹０-９零〇一二三四五六七八九]$/u.test(char) ||
      /^\p{Cf}$/u.test(char) ||
      (allowNegative && /^[-−－‒–—﹣]$/u.test(char)) ||
      (/^\p{Zs}$/u.test(char) && [...this.#groups].some((group) => /\p{Zs}/u.test(group)))
    );
  }

  parse(text: string, committed = false): NumericText {
    let input = text.replace(controls, '').trim();
    if (!input) return { kind: 'empty', value: null };
    if (/Infinity|∞/iu.test(input)) return { kind: 'invalid', value: null };
    const scale = permille.test(input)
      ? -3
      : this.options?.style !== 'unit' && (percent.test(input) || this.options?.style === 'percent')
        ? -2
        : 0;
    let accounting = false;
    if (
      this.options?.currencySign === 'accounting' &&
      input.startsWith('(') &&
      input.endsWith(')')
    ) {
      accounting = true;
      input = input.slice(1, -1);
    }
    // Remove only formatter-provided labels; arbitrary suffixes must not parse as a number.
    for (const decoration of [...this.#decorations].sort((a, b) => b.length - a.length))
      input = input.split(decoration).join('');
    input = input.replace(minus, '-').replace(plus, '+');
    for (const group of this.#groups) {
      if (/\p{Zs}/u.test(group)) input = input.replace(/\p{Zs}/gu, '');
      else if (group === "'" || group === '’') input = input.replace(/['’]/g, '');
      else input = input.split(group).join('');
    }
    input = input.split(this.decimal).join('.').replace(/[．٫]/g, '.').replace(/[，٬]/g, '');
    for (const exponent of this.#exponents) input = input.split(exponent).join('e');
    for (const [digit, value] of this.#digits) input = input.split(digit).join(value);
    input = input
      .replace(/[٠-٩۰-۹０-９]/g, (char) => String(char.charCodeAt(0) % 16))
      .replace(/[零〇一二三四五六七八九]/g, (char) => String(Math.max(han.indexOf(char) - 1, 0)))
      .replace(/[%٪％﹪‰؉]/gu, '')
      .trim();
    if (/^[0-9.]+[+-]$/.test(input)) input = input.at(-1)! + input.slice(0, -1);
    const incomplete =
      /^[+-]?$/.test(input) ||
      /^[+-]?\.$/.test(input) ||
      /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)[eE][+-]?$/.test(input);
    if (incomplete) return { kind: committed ? 'invalid' : 'incomplete', value: null };
    if (!committed && /^[+-]?\d+\.$/.test(input)) return { kind: 'incomplete', value: null };
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(input))
      return { kind: 'invalid', value: null };
    const value = shiftDecimal(Number(input) * (accounting ? -1 : 1), scale);
    return Number.isFinite(value) ? { kind: 'number', value } : { kind: 'invalid', value: null };
  }
}
