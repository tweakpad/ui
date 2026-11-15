// Every line the library draws comes from this module: one kind per job, each bound to exactly
// one role, so an appearance mode that redefines the roles reaches every component. Recipes import
// a kind and never name a line role or mix a line color themselves (a guard test holds them to it).

/** An edge kind: its color, the full border, and the same line as an inset ring. */
export interface EdgeKind {
  readonly color: string;
  readonly border: string;
  readonly ring: string;
}

const kind = (color: string): EdgeKind => ({
  color,
  border: `var(--tp-border-width) var(--tp-border-style) ${color}`,
  ring: `inset 0 0 0 var(--tp-border-width) ${color}`,
});

/** The outer edge of a component or panel: cards, panels, tables, code and callout surfaces. */
export const surfaceEdge = kind('var(--tp-edge)');

/** The line between rows of a table surface: the surface edge at half strength. */
export const rowEdge = kind('color-mix(in oklab, var(--tp-edge) 50%, transparent)');

/**
 * The fine edge of a floating surface (menus, popovers, lists, floating toolbars) and of a value
 * surface (the color picker's area, tracks and wheel); a floating surface also keeps its shadow.
 */
export const floatEdge = kind('var(--tp-hairline)');

/** The edge of a field or an outline control. */
export const fieldEdge = kind('var(--tp-input)');

/** The boundary of a checkbox, a radio or a switch track. */
export const markEdge = kind('var(--tp-control-border)');

/** A divider: separators, table rows, header and footer lines, guides. */
export const divider = kind('var(--tp-border)');

/** The edge of a pressed Toggle, which carries its pressed state. */
export const pressedEdge = kind('var(--tp-pressed-border)');

/** The edge of a status role's tinted fill: status variants and alerts. */
export const statusEdge = (role: 'primary' | 'destructive' | 'success' | 'warning'): EdgeKind =>
  kind(`var(--tp-${role}-border)`);

/** The fill of a field or an outline control, and its stronger fill for hover and disabled. */
export const controlFill = 'var(--tp-control)';
export const controlFillStrong = 'var(--tp-control-strong)';

/**
 * The custom property through which a swatch publishes its color, opaque, for its edge. A swatch
 * without a color (an empty value) leaves it unset and takes an edge from the foreground.
 */
export const swatchColorProperty = '--_tp-swatch-color';
const swatchColor = `var(${swatchColorProperty}, var(--tp-foreground))`;

/**
 * The edge of a color swatch: its own color moved toward black or white, whichever contrasts with
 * it (`contrast-color()`), so a light color takes a darker edge and a dark color a lighter one, and
 * the edge stays visible on any color in either scheme. It is value paint, so it keeps its value in
 * every appearance.
 */
export const swatchEdge = kind(
  `color-mix(in oklab, ${swatchColor} 60%, contrast-color(${swatchColor}))`,
);

/**
 * The custom property through which a variant names its visible edge for a joined group's seam.
 * Variants without a visible edge (the solid fills) leave it unset, so their seam is a cut.
 */
export const variantEdgeProperty = '--_tp-variant-edge';
/** The color of a joined member's seam: its variant's edge, or a cut through the fills. */
export const seamColor = `var(${variantEdgeProperty}, transparent)`;
