import type { PresentationDictionary } from '../resolver.js';
export const drawerAppearance: PresentationDictionary = {
  'drawer-surface': [
    {
      declarations: {
        'border-radius': '0',
        border: '0',
        transition:
          'transform calc(var(--tp-duration-normal) * var(--tp-motion-scale)) var(--tp-easing-standard)',
      },
    },
    ...(['down', 'up', 'left', 'right'] as const).flatMap((direction) => {
      const edge = ({ down: 'top', up: 'bottom', left: 'right', right: 'left' } as const)[
        direction
      ];
      const corners = (
        {
          down: ['top-left', 'top-right'],
          up: ['bottom-left', 'bottom-right'],
          left: ['top-right', 'bottom-right'],
          right: ['top-left', 'bottom-left'],
        } as const
      )[direction];
      return [
        {
          selector: `&[data-swipe-direction="${direction}"]`,
          declarations: {
            [`border-${edge}`]: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
            ...Object.fromEntries(
              corners.map((corner) => [`border-${corner}-radius`, 'var(--tp-radius-xl)']),
            ),
          },
        },
        {
          selector: `&[data-swipe-direction="${direction}"]:is([data-starting-style]:not([data-opening-swipe]),[data-ending-style])`,
          declarations: {
            transform:
              direction === 'down'
                ? 'translateY(100%)'
                : direction === 'up'
                  ? 'translateY(-100%)'
                  : direction === 'left'
                    ? 'translateX(-100%)'
                    : 'translateX(100%)',
          },
        },
      ];
    }),
    ...(['down', 'up', 'left', 'right'] as const).map((direction) => {
      const sign = direction === 'down' || direction === 'right' ? '-' : '+';
      const translate = `calc(var(--drawer-snap-point-offset, 0px) + var(--drawer-swipe-movement-${direction === 'down' || direction === 'up' ? 'y' : 'x'}, 0px) ${sign} (var(--nested-drawers) - var(--drawer-swipe-progress)) * var(--tp-space-4))`;
      return {
        selector: `&[data-swipe-direction="${direction}"][data-nested-drawer-open]:not([data-ending-style])`,
        declarations: {
          transform: `translate${direction === 'down' || direction === 'up' ? 'Y' : 'X'}(${translate}) scale(max(0,calc(1 - var(--nested-drawers) * .05 + var(--drawer-swipe-progress) * .05)))`,
        },
      };
    }),
    { selector: '&[data-swiping], &[data-tp-motion-driven]', declarations: { transition: 'none' } },
  ],
  'drawer-content': [
    {
      declarations: {
        transition:
          'opacity calc(var(--tp-duration-normal) * var(--tp-motion-scale)) var(--tp-easing-standard)',
      },
    },
    { selector: '[data-nested-drawer-open] > &', declarations: { opacity: '0' } },
    {
      selector: '[data-nested-drawer-swiping] > &',
      declarations: { opacity: 'var(--drawer-swipe-progress)' },
    },
  ],
  'drawer-swipe-handle': [
    {
      selector: '&::after',
      declarations: { background: 'var(--tp-muted)', 'border-radius': 'var(--tp-radius-full)' },
    },
    {
      selector: '[data-swipe-axis="y"] > &::after',
      declarations: { height: 'var(--tp-space-1)', width: 'calc(var(--tp-spacing) * 24)' },
    },
    {
      selector: '[data-swipe-axis="x"] > &::after',
      declarations: { width: 'var(--tp-space-1)', height: 'calc(var(--tp-spacing) * 24)' },
    },
    {
      selector: '&:focus-visible',
      declarations: {
        outline: 'var(--tp-ring-width) solid var(--tp-ring)',
        'outline-offset': 'calc(var(--tp-ring-offset) * -1)',
      },
    },
  ],
};
