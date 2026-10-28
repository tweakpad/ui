/**
 * Content colors of the text editor (Component Library `ccx-roles`; Widgets
 * `uwg-te-req-content-1`, `uwg-te-req-content-2`, `uwg-te-tab-content-model` r10).
 *
 * Text color, highlight and cell background store a hue name of this palette, never a literal
 * color; `default` is the choice of no color and stores nothing. Paint belongs to the content
 * color roles of the presentation recipes, so this module holds names only.
 */

/** The hue names of the palette, in palette order. */
export const TEXT_EDITOR_COLORS = Object.freeze([
  'gray',
  'brown',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'red',
] as const);

/** A hue name of the palette. */
export type TextEditorColor = (typeof TEXT_EDITOR_COLORS)[number];

/** A color choice of a color tool: a hue name, or `default` for no color. */
export type TextEditorColorChoice = TextEditorColor | 'default';

const COLOR_NAMES: ReadonlySet<string> = new Set<string>(TEXT_EDITOR_COLORS);

/** Whether a value is a hue name of the palette. */
export function isTextEditorColor(value: unknown): value is TextEditorColor {
  return typeof value === 'string' && COLOR_NAMES.has(value);
}

/** Whether a value is a color choice: a hue name or `default`. */
export function isTextEditorColorChoice(value: unknown): value is TextEditorColorChoice {
  return value === 'default' || isTextEditorColor(value);
}

/**
 * The stored form of a color choice: the hue name, or `null` for `default`, which stores nothing.
 * Throws a TypeError for a name outside the palette.
 */
export function paletteName(choice: TextEditorColorChoice): TextEditorColor | null {
  if (choice === 'default') return null;
  if (isTextEditorColor(choice)) return choice;
  throw new TypeError(`"${String(choice)}" is not a text editor color.`);
}
