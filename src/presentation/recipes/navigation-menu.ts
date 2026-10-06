import { motionTransition } from '../motion.js';
import { packedExtent } from './shared/target.js';
import type { PresentationDictionary, PresentationRule } from '../resolver.js';
import {
  anchoredPresenceAppearance,
  popupSpacingAppearance,
  popupItemSpacingAppearance,
  popupTriggerAppearance,
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
        // Nova cn-navigation-menu-trigger: h-9 px-2.5 py-1.5; replaces the Button's size extent.
        'padding-inline': 'var(--tp-space-2-5)',
        'padding-block': 'var(--tp-space-1-5)',
        'block-size': packedExtent('var(--tp-control-height-lg)'),
        'min-block-size': packedExtent('var(--tp-control-height-lg)'),
        'font-size': 'var(--tp-text-sm)',
        'font-weight': 'var(--tp-font-medium)',
      },
    },
    {
      selector:
        '&:is(:hover,[data-open],[data-popup-open]):not([data-disabled],:disabled,[aria-disabled="true"])',
      declarations: { background: 'var(--tp-muted)' },
    },
    ...popupTriggerAppearance,
    ...focus,
  ],
  'navigation-menu-content': [
    ...popupSpacingAppearance,
    {
      declarations: {
        transition: motionTransition(['opacity', 'transform', 'translate']),
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
        // Nova cn-navigation-menu-link: p-2 gap-2.
        gap: 'var(--tp-space-2)',
        padding: 'var(--tp-space-2)',
        display: 'flex',
        'align-items': 'center',
        'border-radius': 'var(--tp-radius-md)',
        'min-block-size': packedExtent('var(--tp-control-height-md)'),
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
    { selector: '&:is(:hover,:focus-visible)', declarations: { background: 'var(--tp-muted)' } },
    ...focus,
  ],
  'navigation-menu-indicator': [
    {
      declarations: {
        'margin-inline-start': 'var(--tp-space-1)',
        transform: 'translateY(var(--tp-border-width))',
        transition: motionTransition(['rotate']),
      },
    },
    { selector: '&[data-open]', declarations: { rotate: '180deg' } },
  ],
  'navigation-menu-viewport': [
    ...popup,
    {
      declarations: {
        transition: motionTransition(['inline-size', 'block-size', 'opacity', 'transform']),
      },
    },
  ],
  'navigation-menu-positioner': [
    {
      declarations: {
        transition: motionTransition(['left', 'top']),
      },
    },
  ],
};
