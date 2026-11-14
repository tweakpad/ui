/** The viewport edge a Drawer attaches to, in writing direction. */
export type DrawerEdge = 'block-start' | 'block-end' | 'inline-start' | 'inline-end';
/**
 * The physical direction a swipe closes a Drawer in, resolved from its edge and the writing
 * direction.
 */
export type DrawerDirection = 'up' | 'down' | 'left' | 'right';
/**
 * A size a Drawer's sheet can rest at: a fraction of the viewport from 0 to 1 or pixels as a
 * number, or a CSS length as a string.
 */
export type DrawerSnapPoint = number | string;
export interface DrawerDimensions {
  extent: number;
  viewport: number;
  font: number;
  rootFont: number;
  width: number;
  height: number;
  resolveLength?: (value: string) => number | undefined;
}
export interface ResolvedSnapPoint {
  value: DrawerSnapPoint;
  extent: number;
  offset: number;
}
export interface DrawerGestureOutput {
  movement: number;
  velocity: number;
  swiping: boolean;
  opening: boolean;
  sourceEvent?: Event;
}
export interface DrawerVisualState {
  active: boolean;
  count: number;
  progress: number;
  height: number;
  swiping: boolean;
}
export const oppositeDirection: Record<DrawerDirection, DrawerDirection> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};
export const directionSign = (direction: DrawerDirection) =>
  direction === 'up' || direction === 'left' ? -1 : 1;
export const horizontalDirection = (direction: DrawerDirection) =>
  direction === 'left' || direction === 'right';
