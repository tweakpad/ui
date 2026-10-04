export type DrawerEdge = 'block-start' | 'block-end' | 'inline-start' | 'inline-end';
export type DrawerDirection = 'up' | 'down' | 'left' | 'right';
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
