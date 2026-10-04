import type { PresentationDictionary } from '../resolver.js';
/** Dialog supplies the palette and section rhythm; this preset attaches an edge. */
export const sidePanelAppearance: PresentationDictionary = {
  'side-panel-content': [
    {
      declarations: {
        border: '0',
        'border-radius': '0',
        transition:
          'translate calc(var(--tp-duration-normal) * var(--tp-motion-scale)) var(--tp-easing-standard), opacity calc(var(--tp-duration-normal) * var(--tp-motion-scale)) var(--tp-easing-standard)',
      },
    },
    ...(['left', 'right', 'top', 'bottom'] as const).flatMap((side) => [
      {
        selector: `&[data-side="${side}"]`,
        declarations: {
          [`border-${({ left: 'right', right: 'left', top: 'bottom', bottom: 'top' } as const)[side]}`]:
            'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
        },
      },
      {
        selector: `&[data-side="${side}"]:is([data-starting-style],[data-ending-style])`,
        declarations: {
          opacity: '0',
          translate:
            side === 'left'
              ? 'calc(var(--tp-space-8) * -1) 0'
              : side === 'right'
                ? 'var(--tp-space-8) 0'
                : side === 'top'
                  ? '0 calc(var(--tp-space-8) * -1)'
                  : '0 var(--tp-space-8)',
        },
      },
    ]),
    { selector: '&[data-tp-motion-driven]', declarations: { transition: 'none' } },
  ],
};
