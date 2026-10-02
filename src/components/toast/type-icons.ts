import type { IconDefinition } from '../../icons/types.js';

/** Icon data rendered by the shared TpIcon component, never a second SVG renderer. */
export const toastTypeIcons: Readonly<Record<string, IconDefinition>> = {
  success: {
    viewBox: '0 0 24 24',
    paths: [{ d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3', strokeWidth: 2 }],
  },
  info: {
    viewBox: '0 0 24 24',
    paths: [{ d: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M12 16v-4M12 8h.01', strokeWidth: 2 }],
  },
  warning: {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M10.3 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0M12 9v4M12 17h.01',
        strokeWidth: 2,
      },
    ],
  },
  error: {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2M9 9l6 6M15 9l-6 6',
        strokeWidth: 2,
      },
    ],
  },
};
