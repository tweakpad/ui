import type { MotionRoleDefinition } from '../../foundation/motion.js';
export const navigationPanelMotionRoles = {
  collapse: { name: 'collapse', kind: 'state', phases: ['change'], completion: 'non-blocking' },
  // Compatibility descriptor; compact execution uses the actual Drawer surface owner.
  compactSurface: {
    name: 'compact-surface',
    kind: 'state',
    phases: ['change'],
    completion: 'non-blocking',
  },
} as const satisfies Record<string, MotionRoleDefinition>;
