/**
 * A panel size in a Resizable panel group: pixels as a number, or a length as a string, where a
 * unitless one is a percentage.
 */
export type PanelExtent = number | string;
/** The layout of a Resizable panel group: each panel's size as a percentage, keyed by panel id. */
export type PanelLayout = Readonly<Record<string, number>>;
/** A resizable panel's size, in pixels and as a percentage of its group. */
export interface PanelSize {
  inPixels: number;
  asPercentage: number;
}
/**
 * Your storage for a Resizable panel group's layout, loaded before the first commit and saved after
 * each settled resize.
 */
export interface PanelPersistenceAdapter {
  load(key: string): unknown | Promise<unknown>;
  save(key: string, layout: PanelLayout): void | Promise<void>;
}
export interface PanelBounds {
  min: number;
  max: number;
  collapsed: number;
  collapsible: boolean;
  disabled: boolean;
}
