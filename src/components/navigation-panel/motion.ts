import type { MotionRoleDefinition } from '../../foundation/motion.js';
import { stateRole } from '../../foundation/motion.js';
export const navigationPanelMotionRoles = {
  collapse: stateRole('collapse'),
  // Compatibility descriptor; compact execution uses the actual Drawer surface owner.
  compactSurface: stateRole('compact-surface'),
} as const satisfies Record<string, MotionRoleDefinition>;
