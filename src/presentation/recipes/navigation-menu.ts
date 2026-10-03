import type { PresentationDictionary, PresentationRule } from '../resolver.js';
import {
  anchoredPresenceAppearance,
  popupSpacingAppearance,
  popupItemSpacingAppearance,
} from './command-surface.js';

const focus: readonly PresentationRule[] = [
  {
    selector: '&:focus-visible',
    declarations: {
      outline:
        'var(--tp-ring-width) var(--tp-border-style) color-mix(in oklab, var(--tp-ring) 50%, transparent)',
      'outline-offset': '0',
    },
  },
];
const popup: readonly PresentationRule[] = [
  {
    declarations: {
      background: 'var(--tp-popover)',
      color: 'var(--tp-popover-foreground)',
      'border-radius': 'var(--tp-radius-lg)',
      border:
        'var(--tp-border-width) var(--tp-border-style) color-mix(in oklab, var(--tp-foreground) 10%, transparent)',
      'box-shadow': 'var(--tp-shadow-sm)',
    },
  },
  ...anchoredPresenceAppearance,
];
const parts = [
  'navigation-menu',
  'navigation-menu-list',
  'navigation-menu-item',
  'navigation-menu-trigger',
  'navigation-menu-content',
  'navigation-menu-link',
  'navigation-menu-indicator',
  'navigation-menu-viewport',
  'navigation-menu-positioner',
];
const axes: Record<string, readonly PresentationRule[]> = {};
for (const part of parts)
  for (const axis of ['horizontal', 'vertical']) axes[`${part}-orientation-${axis}`] = [];
axes['navigation-menu-trigger-orientation-vertical'] = [
  { declarations: { 'justify-content': 'start' } },
];
/** Native anchors do not receive Button's shadow reset when projected into a portal. */
export const navigationMenuStructure: PresentationDictionary = {
  'navigation-menu-link': [
    { declarations: { 'box-sizing': 'border-box', 'min-inline-size': '0' } },
  ],
};
/** Base navigation composition plus its optional new-york viewport; native link roles are retained. */
export const navigationMenuAppearance: PresentationDictionary = {
  ...axes,
  'navigation-menu': [],
  'navigation-menu-list': [{ declarations: { gap: '0' } }],
  'navigation-menu-item': [],
  'navigation-menu-trigger': [
    {
      declarations: {
        background: 'transparent',
        color: 'var(--tp-foreground)',
        border: '0',
        'border-radius': 'var(--tp-radius-lg)',
        'padding-inline': 'calc(var(--tp-spacing) * 2.5)',
        'padding-block': 'calc(var(--tp-spacing) * 1.5)',
        'min-block-size': 'max(var(--tp-control-height-md), var(--tp-target-size-min))',
        'font-size': 'var(--tp-text-sm)',
        'font-weight': 'var(--tp-font-medium)',
        transition:
          'background-color calc(var(--tp-duration-normal) * var(--tp-motion-scale)) var(--tp-easing-standard)',
      },
    },
    {
      selector: '&:is([data-open],[data-popup-open])',
      declarations: { background: 'color-mix(in oklab, var(--tp-muted) 50%, transparent)' },
    },
    { selector: '&:is(:hover,:focus)', declarations: { background: 'var(--tp-muted)' } },
    ...focus,
  ],
  'navigation-menu-content': [
    ...popupSpacingAppearance,
    {
      declarations: {
        transition:
          'opacity calc(var(--tp-duration-normal) * var(--tp-motion-scale)) var(--tp-easing-standard), transform calc(var(--tp-duration-normal) * var(--tp-motion-scale)) var(--tp-easing-standard), translate calc(var(--tp-duration-normal) * var(--tp-motion-scale)) var(--tp-easing-standard)',
      },
    },
    { selector: '&:is([data-starting-style],[data-ending-style])', declarations: { opacity: '0' } },
    {
      selector:
        '&[data-starting-style][data-activation-direction="left"], &[data-ending-style][data-activation-direction="right"]',
      declarations: { translate: '-50% 0' },
    },
    {
      selector:
        '&[data-starting-style][data-activation-direction="right"], &[data-ending-style][data-activation-direction="left"]',
      declarations: { translate: '50% 0' },
    },
    {
      selector:
        '&[data-starting-style][data-activation-direction="up"], &[data-ending-style][data-activation-direction="down"]',
      declarations: { translate: '0 -50%' },
    },
    {
      selector:
        '&[data-starting-style][data-activation-direction="down"], &[data-ending-style][data-activation-direction="up"]',
      declarations: { translate: '0 50%' },
    },
    ...popup.map((rule) => ({
      ...rule,
      selector: `&[data-viewport="false"]${rule.selector?.replace('&', '') ?? ''}`,
    })),
  ],
  'navigation-menu-link': [
    ...popupItemSpacingAppearance,
    {
      declarations: {
        display: 'flex',
        'align-items': 'center',
        'border-radius': 'var(--tp-radius-lg)',
        'min-block-size': 'max(var(--tp-control-height-md), var(--tp-target-size-min))',
        'font-size': 'var(--tp-text-sm)',
        'text-decoration': 'none',
        color: 'var(--tp-foreground)',
        outline: 'none',
      },
    },
    {
      selector: '&[aria-current="page"]',
      declarations: { background: 'color-mix(in oklab, var(--tp-muted) 50%, transparent)' },
    },
    { selector: '&:is(:hover,:focus)', declarations: { background: 'var(--tp-muted)' } },
    ...focus,
  ],
  'navigation-menu-indicator': [
    {
      declarations: {
        'margin-inline-start': 'var(--tp-space-1)',
        transform: 'translateY(var(--tp-border-width))',
        transition:
          'rotate calc(var(--tp-duration-normal) * var(--tp-motion-scale)) var(--tp-easing-standard)',
      },
    },
    { selector: '&[data-open]', declarations: { rotate: '180deg' } },
  ],
  'navigation-menu-viewport': [
    ...popup,
    {
      declarations: {
        transition:
          'inline-size calc(var(--tp-duration-normal) * var(--tp-motion-scale)) var(--tp-easing-standard), block-size calc(var(--tp-duration-normal) * var(--tp-motion-scale)) var(--tp-easing-standard), opacity calc(var(--tp-duration-normal) * var(--tp-motion-scale)) var(--tp-easing-standard), transform calc(var(--tp-duration-normal) * var(--tp-motion-scale)) var(--tp-easing-standard)',
      },
    },
  ],
  'navigation-menu-positioner': [
    {
      declarations: {
        transition:
          'left calc(var(--tp-duration-normal) * var(--tp-motion-scale)) var(--tp-easing-standard), top calc(var(--tp-duration-normal) * var(--tp-motion-scale)) var(--tp-easing-standard)',
      },
    },
  ],
};
