export type PanelExtent = number | string;
export type PanelLayout = Readonly<Record<string, number>>;
export interface PanelSize {
  inPixels: number;
  asPercentage: number;
}
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
