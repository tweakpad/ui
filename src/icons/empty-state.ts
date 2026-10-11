import type { IconDefinition } from './types.js';
import { uploadCloudIcon } from './upload-cloud.js';
const outline = (...paths: string[]): IconDefinition => ({
  viewBox: '0 0 24 24',
  paths: paths.map((d) => ({ d, strokeWidth: 2 })),
});
export const emptyStateIcons = {
  inbox: outline('M4 4h16l2 10v6H2v-6z', 'M2 14h6l2 3h4l2-3h6'),
  star: outline(
    'm12 3 2.78 5.63L21 9.54l-4.5 4.38L17.56 20 12 17.08 6.44 20l1.06-6.08L3 9.54l6.22-.91z',
  ),
  heart: outline(
    'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z',
  ),
  bookmark: outline('M6 3h12v18l-6-4-6 4z'),
  cloud: uploadCloudIcon,
};
