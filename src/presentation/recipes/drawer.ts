import { edgeSurfaceAppearance } from './edge-surface.js';
import { motionDuration, motionTransition } from '../motion.js';
import type { PresentationDictionary } from '../resolver.js';
export const drawerAppearance: PresentationDictionary = {
  'drawer-surface': [
    ...edgeSurfaceAppearance({
      bottom: '&[data-swipe-direction="down"]',
      top: '&[data-swipe-direction="up"]',
      left: '&[data-swipe-direction="left"]',
      right: '&[data-swipe-direction="right"]',
    }),
    {
      declarations: {
        transition: motionTransition(['transform']),
      },
    },
    ...(['down', 'up', 'left', 'right'] as const).flatMap((direction) => {
      return [
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
    {
      selector: '&[data-ending-style][data-swipe-dismiss]',
      declarations: {
        'transition-duration': motionDuration('normal', 'var(--drawer-swipe-strength, 1)'),
      },
    },
    { selector: '&[data-swiping], &[data-tp-motion-driven]', declarations: { transition: 'none' } },
  ],
  'drawer-overlay': [
    {
      selector: '&[data-backdrop="blur"]',
      declarations: { 'backdrop-filter': 'blur(var(--tp-space-1))' },
    },
    {
      selector: '&[data-ending-style][data-swipe-dismiss]',
      declarations: {
        'transition-duration': motionDuration('normal', 'var(--drawer-swipe-strength, 1)'),
      },
    },
    { selector: '&[data-swiping]', declarations: { transition: 'none' } },
  ],
  'drawer-content': [
    {
      declarations: {
        transition: motionTransition(['opacity']),
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
      declarations: { height: 'var(--tp-space-1)', width: 'calc(var(--tp-space-12) * 2)' },
    },
    {
      selector: '[data-swipe-axis="x"] > &::after',
      declarations: { width: 'var(--tp-space-1)', height: 'calc(var(--tp-space-12) * 2)' },
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
