/**
 * The options every engine factory takes (Widgets `uwg-te-par-engine-1`, `uwg-te-tab-engine` r2).
 *
 * Each factory accepts the same two options, typed with its engine's node override: `css`, a
 * sheet that replaces the adapter's base CSS or a function that receives the base CSS and returns
 * the sheet, and `nodes`, engine nodes that replace the generated nodes of custom definitions by
 * definition name. The factories read both through these helpers, so the rules are one.
 */

/** What `options.css` accepts: a sheet that replaces the base CSS, or a function that extends it. */
export type TextEditorCssOption = string | ((base: string) => string);

/** The options of an engine factory; `Override` is the engine's node override. */
export interface TextEditorAdapterOptions<Override> {
  /** A string replaces the adapter's base CSS; a function receives it and returns the CSS. */
  readonly css?: TextEditorCssOption | undefined;
  /** Engine nodes that replace the generated nodes of custom definitions, by definition name. */
  readonly nodes?: Readonly<Record<string, Override>> | undefined;
}

/** The sheet a mount adopts: `option` when it is a string, its result for the base CSS when it is a function, else the base CSS. */
export function resolveCss(option: TextEditorCssOption | undefined, base: string): string {
  if (typeof option === 'string') return option;
  if (typeof option === 'function') return option(base);
  return base;
}

const NO_OVERRIDES: Readonly<Record<string, never>> = Object.freeze({});

/** The node overrides of a factory's options, or none when `nodes` is missing or no object. */
export function nodeOverrides<Override>(
  options: TextEditorAdapterOptions<Override> | null | undefined,
): Readonly<Record<string, Override>> {
  const nodes: unknown = options?.nodes;
  return typeof nodes === 'object' && nodes !== null
    ? (nodes as Readonly<Record<string, Override>>)
    : NO_OVERRIDES;
}
