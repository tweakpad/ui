import { progressMotionRoles } from './progress/motion.js';
import { spinnerMotionRoles } from './spinner/index.js';
import { type MotionRoleDefinition } from '../foundation/motion.js';

export const displayMotionRoles = {
  carouselTrack: {
    name: 'track',
    kind: 'state',
    phases: ['change'],
    completion: 'non-blocking',
  },
  progressValue: progressMotionRoles.value,
  progressIndeterminate: progressMotionRoles.indeterminate,
  spinnerRotation: spinnerMotionRoles.rotation,
} as const satisfies Record<string, MotionRoleDefinition>;

export { TpAvatar, TpAvatarGroup } from './avatar/index.js';
export type { AvatarLoadingStatus } from './avatar/index.js';

export { TpCarousel } from './carousel/index.js';
export type * from './carousel/index.js';

export * from './data-visualization/index.js';

export * from './message-scroller/index.js';

export { TpProgress } from './progress/index.js';

export * from './resizable-panel-group/index.js';

export * from './scroll-area/index.js';

export { TpSeparator } from './separator/index.js';

export { TpSpinner } from './spinner/index.js';

export { TpToast } from './toast/index.js';
