import type { MotionRoleDefinition } from '../../foundation/motion.js';

export const progressMotionRoles = {
  value: { name: 'value', kind: 'state', phases: ['change'], completion: 'non-blocking' },
  indeterminate: {
    name: 'indeterminate',
    kind: 'ambient',
    phases: ['start', 'stop'],
    completion: 'non-blocking',
  },
} as const satisfies Record<string, MotionRoleDefinition>;
