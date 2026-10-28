/**
 * Capabilities of a text editor engine (Widgets `uwg-te-req-engine-2`, `uwg-te-tab-engine`,
 * `uwg-te-req-tools-2`).
 *
 * An engine declares a static set before mount, so tool availability is settled before ready.
 * Every engine declares the 30 base capabilities and may declare the optional table ones; a custom
 * node has the capability `block.<name>` or `inline.<name>` exactly when the engine supports its
 * definition. Without an engine the base capabilities apply, so assigning an engine only adds
 * tools.
 */

const BASE_CAPABILITY_IDS = [
  'mark.bold',
  'mark.italic',
  'mark.underline',
  'mark.strike',
  'mark.code',
  'mark.superscript',
  'mark.subscript',
  'mark.highlight',
  'mark.text-color',
  'mark.clear',
  'link',
  'align',
  'history',
  'block.paragraph',
  'block.heading',
  'block.quote',
  'block.code',
  'block.list-bullet',
  'block.list-ordered',
  'block.list-task',
  'block.divider',
  'block.image',
  'blocks.select',
  'blocks.move',
  'blocks.nest',
  'input-rules',
  'format.html',
  'format.markdown',
  'format.text',
  'format.json',
] as const;

const OPTIONAL_CAPABILITY_IDS = ['block.table', 'table.merge', 'table.move'] as const;

/** A capability that every engine declares. */
export type TextEditorBaseCapability = (typeof BASE_CAPABILITY_IDS)[number];

/**
 * A capability that an engine may declare: tables, merging and splitting cells, and moving rows
 * and columns.
 */
export type TextEditorOptionalCapability = (typeof OPTIONAL_CAPABILITY_IDS)[number];

/**
 * A capability identifier: a base or optional capability, or the capability of a custom node,
 * `block.<name>` or `inline.<name>`.
 */
export type TextEditorCapability =
  TextEditorBaseCapability | TextEditorOptionalCapability | `block.${string}` | `inline.${string}`;

/** The 30 base capabilities, in the order `uwg-te-req-engine-2` lists them. */
export const BASE_CAPABILITIES: ReadonlySet<TextEditorCapability> = new Set<TextEditorCapability>(
  BASE_CAPABILITY_IDS,
);

/** The optional capabilities: `block.table`, `table.merge` and `table.move`. */
export const OPTIONAL_CAPABILITIES: ReadonlySet<TextEditorCapability> =
  new Set<TextEditorCapability>(OPTIONAL_CAPABILITY_IDS);

/**
 * The capabilities an engine declares, frozen (`uwg-te-req-engine-2`): the base capabilities, with
 * tables also `block.table` and `table.merge`, and `table.move` when the engine can move rows and
 * columns as well.
 */
export function engineCapabilities(support: {
  readonly tables: boolean;
  readonly move: boolean;
}): ReadonlySet<TextEditorCapability> {
  const capabilities = new Set<TextEditorCapability>(BASE_CAPABILITIES);
  if (support.tables) {
    capabilities.add('block.table');
    capabilities.add('table.merge');
    if (support.move) capabilities.add('table.move');
  }
  return Object.freeze(capabilities);
}

/** Whether every required capability is available; no requirement is always met. */
export function requirementsMet(
  requires: readonly TextEditorCapability[] | undefined,
  available: ReadonlySet<TextEditorCapability>,
): boolean {
  if (!requires) return true;
  for (const capability of requires) if (!available.has(capability)) return false;
  return true;
}

/** The capability of a custom node definition: `block.<name>` or `inline.<name>`. */
export function nodeCapability(definition: {
  readonly kind: 'block' | 'inline';
  readonly name: string;
}): TextEditorCapability {
  return `${definition.kind}.${definition.name}`;
}
