/**
 * Presets, Consumer presets and the presentation pipeline of Text transform (Foundation §18.23
 * `ttf-precedence`, `ttf-consumer-presets`, `ttf-formatter`, `ttf-invalid`).
 */
import { capitalize, sentence, toLower, toUpper } from './case.js';
import { identifierCase, type IdentifierCase } from './identifier.js';
import {
  formatBytesPreset,
  formatDurationPreset,
  formatNumberPreset,
  isNumberPreset,
  parseNumericInput,
  type FormattedText,
  type TextDurationOptions,
} from './number.js';

/** Built-in preset names. */
export const TEXT_PRESETS = [
  'text',
  'uppercase',
  'lowercase',
  'capitalize',
  'sentence',
  'camel',
  'pascal',
  'kebab',
  'snake',
  'constant',
  'humanize',
  'number',
  'integer',
  'decimal',
  'percent',
  'currency',
  'compact',
  'scientific',
  'unit',
  'bytes',
  'duration',
] as const;
export type TextPreset = (typeof TEXT_PRESETS)[number];

const BUILT_IN = new Set<string>(TEXT_PRESETS);
const IDENTIFIER = new Set<string>(['camel', 'pascal', 'kebab', 'snake', 'constant', 'humanize']);

export function isBuiltInTextPreset(name: string): name is TextPreset {
  return BUILT_IN.has(name);
}

/** Options of a preset: number format options, or `{ style, guide }` for durations. */
export type TextFormatOptions = Intl.NumberFormatOptions | TextDurationOptions;

export interface TextFormatContext {
  /** The input, as supplied. */
  readonly value: unknown;
  /** The input as text. */
  readonly text: string;
  readonly locale: string | undefined;
  /** The preset name the instance names. */
  readonly preset: string;
  /** The instance's own format options. */
  readonly format: TextFormatOptions | undefined;
  /** Applies a built-in or Consumer preset to `value` (the input by default). */
  apply(preset: string, value?: unknown, format?: TextFormatOptions): string;
}

export type TextFormatterResult =
  string | { readonly text: string; readonly accessibleText?: string | undefined };
export type TextFormatter = (context: TextFormatContext) => TextFormatterResult;
/** A Consumer preset: a formatter, or a preset with options. */
export type TextPresetDefinition =
  TextFormatter | { readonly preset: string; readonly format?: TextFormatOptions | undefined };

const consumerPresets = new Map<string, TextPresetDefinition>();
const subscribers = new Set<(name: string) => void>();

function notify(name: string): void {
  for (const subscriber of [...subscribers]) subscriber(name);
}

/**
 * Defines a Consumer preset for this realm, replacing an earlier definition of the same name,
 * and returns a function that releases it. Built-in names are reserved.
 */
export function defineTextPreset(name: string, definition: TextPresetDefinition): () => void {
  if (typeof name !== 'string' || !name.trim())
    throw new TypeError('defineTextPreset needs a non-empty preset name.');
  if (isBuiltInTextPreset(name))
    throw new TypeError(`"${name}" is a built-in Text transform preset.`);
  const valid =
    typeof definition === 'function' ||
    (typeof definition === 'object' &&
      definition !== null &&
      typeof definition.preset === 'string');
  if (!valid)
    throw new TypeError(
      `Text transform preset "${name}" must be a formatter or { preset, format }.`,
    );
  consumerPresets.set(name, definition);
  notify(name);
  return () => {
    if (consumerPresets.get(name) !== definition) return;
    consumerPresets.delete(name);
    notify(name);
  };
}

/** Calls `listener` with the name of each Consumer preset that is defined, replaced or released. */
export function subscribeTextPresets(listener: (name: string) => void): () => void {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

export interface TextTransformOptions {
  preset?: string | undefined;
  format?: TextFormatOptions | undefined;
  formatter?: TextFormatter | undefined;
  currency?: string | undefined;
  unit?: string | undefined;
  decimals?: number | undefined;
  locale?: string | undefined;
}

export interface TextTransformDiagnostic {
  readonly code: string;
  readonly message: string;
}

export interface TextTransformResult {
  /** The complete presented text. */
  readonly text: string;
  /** The text for assistive technology; the long form of abbreviated text. */
  readonly accessibleText: string;
  /** The input in decimal literal form, for numeric input. */
  readonly machineValue: string | undefined;
  /** Whether the text presents a number, for tabular figures. */
  readonly numeric: boolean;
  /** Whether a numeric preset could not read the input; the fallback content presents instead. */
  readonly invalid: boolean;
  readonly diagnostics: readonly TextTransformDiagnostic[];
}

type Outcome = Omit<TextTransformResult, 'diagnostics'>;
interface Settings extends TextTransformOptions {
  presetFormat?: object | undefined;
}
type Report = (code: string, message: string) => void;

const MAX_DEPTH = 16;
const EMPTY: Outcome = {
  text: '',
  accessibleText: '',
  machineValue: undefined,
  numeric: false,
  invalid: false,
};

function textOf(input: unknown): string {
  return typeof input === 'string' ? input : String(input);
}

function isEmpty(input: unknown): boolean {
  return input === undefined || input === null || (typeof input === 'string' && !input.trim());
}

function plain(text: string, input: unknown): Outcome {
  const numeric = typeof input === 'number' || typeof input === 'bigint';
  return {
    text,
    accessibleText: text,
    machineValue: numeric ? parseNumericInput(input)?.machine : undefined,
    numeric: false,
    invalid: false,
  };
}

function presented(formatted: FormattedText, machine: string): Outcome {
  return { ...formatted, machineValue: machine, numeric: true, invalid: false };
}

function callFormatter(
  formatter: TextFormatter,
  input: unknown,
  settings: Settings,
  preset: string,
  report: Report,
  depth: number,
): FormattedText | null {
  const context: TextFormatContext = {
    value: input,
    text: textOf(input),
    locale: settings.locale,
    preset,
    format: settings.format,
    apply: (name, value = input, format) =>
      run(value, { locale: settings.locale, preset: name, format }, report, depth + 1).text,
  };
  try {
    const result = formatter(context);
    if (typeof result === 'string') return { text: result, accessibleText: result };
    if (result && typeof result === 'object' && typeof result.text === 'string')
      return {
        text: result.text,
        accessibleText:
          typeof result.accessibleText === 'string' ? result.accessibleText : result.text,
      };
    report(
      'formatter-result',
      'Text transform formatters must return text or { text, accessibleText }.',
    );
  } catch (error) {
    report('formatter-failed', `Text transform formatter failed: ${String(error)}`);
  }
  return null;
}

function builtIn(name: string, input: unknown, settings: Settings, report: Report): Outcome {
  const { locale } = settings;
  const text = textOf(input);
  switch (name) {
    case 'uppercase':
      return plain(toUpper(text, locale), input);
    case 'lowercase':
      return plain(toLower(text, locale), input);
    case 'capitalize':
      return plain(capitalize(text, locale), input);
    case 'sentence':
      return plain(sentence(text, locale), input);
  }
  if (IDENTIFIER.has(name))
    return plain(identifierCase(text, name as IdentifierCase, locale), input);
  if (name === 'text') return plain(text, input);
  const numeric = parseNumericInput(input);
  const measured = name === 'bytes' || name === 'duration';
  if (!numeric || (measured && numeric.number < 0)) {
    report(
      'invalid-number',
      `Text transform cannot present "${text}" with the ${name} preset${measured ? '; it needs a non-negative number' : ''}.`,
    );
    return { ...EMPTY, invalid: true };
  }
  if (name === 'bytes')
    return presented(formatBytesPreset(numeric.number, locale), numeric.machine);
  if (name === 'duration')
    return presented(formatDurationPreset(numeric.number, settings, report), numeric.machine);
  const preset = isNumberPreset(name) ? name : 'number';
  return presented(formatNumberPreset(preset, numeric, settings, report), numeric.machine);
}

function applyPreset(
  name: string,
  input: unknown,
  settings: Settings,
  report: Report,
  depth: number,
): Outcome {
  if (isBuiltInTextPreset(name)) return builtIn(name, input, settings, report);
  const definition = consumerPresets.get(name);
  if (!definition) {
    report(
      'unknown-preset',
      `Text transform preset "${name}" is not defined; presenting the input as text.`,
    );
    return plain(textOf(input), input);
  }
  if (depth >= MAX_DEPTH) {
    report(
      'preset-cycle',
      `Text transform preset "${name}" refers to itself; presenting the input as text.`,
    );
    return plain(textOf(input), input);
  }
  if (typeof definition === 'function') {
    const formatted = callFormatter(definition, input, settings, name, report, depth);
    return formatted ? { ...plain('', input), ...formatted } : plain(textOf(input), input);
  }
  return applyPreset(
    definition.preset,
    input,
    { ...settings, presetFormat: { ...definition.format, ...settings.presetFormat } },
    report,
    depth + 1,
  );
}

function run(input: unknown, options: Settings, report: Report, depth: number): Outcome {
  if (isEmpty(input)) return EMPTY;
  const preset = options.preset || 'text';
  if (options.formatter) {
    const formatted = callFormatter(options.formatter, input, options, preset, report, depth);
    if (formatted) return { ...plain('', input), ...formatted };
  }
  const resolved = preset === 'text' && options.format ? 'number' : preset;
  return applyPreset(resolved, input, options, report, depth);
}

function validLocale(locale: string | undefined, report: Report): string | undefined {
  if (!locale) return undefined;
  try {
    Intl.getCanonicalLocales(locale);
    return locale;
  } catch {
    report('invalid-locale', `Text transform locale "${locale}" is not a valid language tag.`);
    return undefined;
  }
}

/**
 * Presents `input`: the formatter when it succeeds, otherwise the preset (`text` by default, or
 * `number` when only `format` is given), reporting every fallback as a diagnostic.
 */
export function transformText(
  input: unknown,
  options: TextTransformOptions = {},
): TextTransformResult {
  const diagnostics: TextTransformDiagnostic[] = [];
  const report: Report = (code, message) => {
    if (!diagnostics.some((entry) => entry.message === message))
      diagnostics.push({ code, message });
  };
  const outcome = run(
    input,
    { ...options, locale: validLocale(options.locale, report) },
    report,
    0,
  );
  return { ...outcome, diagnostics };
}
