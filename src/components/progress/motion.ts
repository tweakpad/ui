import type { MotionRoleDefinition } from '../../foundation/motion.js';
import { ambientRole, stateRole } from '../../foundation/motion.js';

export const progressMotionRoles = {
  value: stateRole('value'),
  indeterminate: ambientRole('indeterminate'),
} as const satisfies Record<string, MotionRoleDefinition>;
