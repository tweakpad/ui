import type { EasingPreviewMode } from './types.js';

/**
 * Keyframes of the background preview square per mode (Widgets 6.2 Anatomy, graph preview
 * layer): the scale modes grow it from the center from 0 to 1, uniformly or along one axis;
 * rotation turns it half a revolution.
 */
export function previewKeyframes(mode: EasingPreviewMode): Keyframe[] {
  switch (mode) {
    case 'scale':
      return [{ transform: 'scale(0)' }, { transform: 'scale(1)' }];
    case 'scale-x':
      return [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }];
    case 'scale-y':
      return [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }];
    case 'rotation':
      return [{ transform: 'rotate(0deg)' }, { transform: 'rotate(180deg)' }];
    case 'none':
      return [];
  }
}
