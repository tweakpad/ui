export type ScrollbarVisibility = 'automatic' | 'always' | 'while-scrolling' | 'on-hover';
export interface ScrollbarOptions {
  orientation: 'horizontal' | 'vertical';
  keepMounted?: boolean;
  visibility?: ScrollbarVisibility;
}
export type OverflowEdge = 'xStart' | 'xEnd' | 'yStart' | 'yEnd';
export type OverflowEdgeThreshold = number | Partial<Record<OverflowEdge, number>>;
export interface ScrollAreaState {
  x: boolean;
  y: boolean;
  xStart: boolean;
  xEnd: boolean;
  yStart: boolean;
  yEnd: boolean;
  scrollingX: boolean;
  scrollingY: boolean;
}
export const initialScrollAreaState: ScrollAreaState = {
  x: false,
  y: false,
  xStart: false,
  xEnd: false,
  yStart: false,
  yEnd: false,
  scrollingX: false,
  scrollingY: false,
};
