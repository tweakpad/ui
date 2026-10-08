import type { PresentationDictionary } from '../resolver.js';

/**
 * Image paints no surface of its own (CL Image `imgl-presentation`): the placeholder and fallback
 * surfaces come from the composed Skeleton, and the failure mark takes the muted foreground.
 */
export const imageAppearance: PresentationDictionary = {
  'image-fallback': [
    {
      selector: '&',
      declarations: { color: 'var(--tp-muted-foreground)' },
    },
  ],
};
