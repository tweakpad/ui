import { edgeSurfaceAppearance } from './edge-surface.js';
import { motionTransition } from '../motion.js';
import type { PresentationDictionary } from '../resolver.js';
/** Dialog supplies the palette and section rhythm; this preset attaches an edge. */
export const sidePanelAppearance: PresentationDictionary = {
  'side-panel-content': [
    ...edgeSurfaceAppearance({
      left: '&[data-side="left"]',
      right: '&[data-side="right"]',
      top: '&[data-side="top"]',
      bottom: '&[data-side="bottom"]',
    }),
    {
      declarations: {
        transition: motionTransition(['translate']),
      },
    },
    ...(['left', 'right', 'top', 'bottom'] as const).flatMap((side) => [
      {
        selector: `&[data-side="${side}"]:is([data-starting-style],[data-ending-style])`,
        declarations: {
          translate:
            side === 'left'
              ? '-100% 0'
              : side === 'right'
                ? '100% 0'
                : side === 'top'
                  ? '0 -100%'
                  : '0 100%',
        },
      },
    ]),
    { selector: '&[data-tp-motion-driven]', declarations: { transition: 'none' } },
  ],
};
