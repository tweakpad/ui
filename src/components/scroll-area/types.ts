import type { ScrollbarVisibility } from '../../foundation/scrollbar.js';
export type { ScrollbarVisibility } from '../../foundation/scrollbar.js';
/** One custom track of a Scroll area, as its `scrollbars` list configures it per axis. */
export interface ScrollbarOptions {
  orientation: 'horizontal' | 'vertical';
  keepMounted?: boolean;
  visibility?: ScrollbarVisibility;
}
/** One edge of a Scroll area's viewport, on the horizontal or vertical axis. */
export type OverflowEdge = 'xStart' | 'xEnd' | 'yStart' | 'yEnd';
/**
 * How far, in pixels, content must be hidden past an edge before a Scroll area counts that edge as
 * overflowing; one number or one per edge.
 */
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
