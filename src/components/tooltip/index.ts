export { TpTooltip } from './tooltip.js';
export type { TooltipDescribes } from './tooltip.js';
import { SurfaceHandle } from '../../foundation/surface-handle.js';
import type { AnchoredTriggerOptions } from '../anchored-surface.js';
export class TooltipHandle extends SurfaceHandle<AnchoredTriggerOptions> {}
export function createTooltipHandle(): TooltipHandle {
  return new TooltipHandle();
}
export { DelayGroup as TooltipProvider } from '../../foundation/delay-group.js';
export type { DelayGroupOptions as TooltipProviderOptions } from '../../foundation/delay-group.js';
export type { AnchoredTriggerOptions as TooltipTriggerOptions } from '../anchored-surface.js';
export type {
  LogicalSide as TooltipSide,
  Alignment as TooltipAlign,
  CollisionBoundary,
  CollisionPolicy,
  VirtualAnchor,
} from '../../foundation/positioning.js';
