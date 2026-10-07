import { motionTransition } from '../motion.js';
import type { PresentationDictionary } from '../resolver.js';

/**
 * Theme switcher paint over the composed Switch, Button and Toggle group. The switch keeps a
 * neutral track in both states (no primary checked fill) and a thumb in the page background, so
 * it reads as the current mode; icons swap with shadcn's rotate-and-scale crossfade.
 */
export const themeSwitcherAppearance: PresentationDictionary = {
  'theme-switcher': [],
  'theme-switcher-variant-switch': [],
  'theme-switcher-variant-button': [],
  'theme-switcher-variant-group': [],
  'theme-switcher-size-default': [],
  'theme-switcher-size-sm': [],
  'theme-switcher-switch': [
    // The thumb is the control height less the track inset; the icon sits inside it.
    { declarations: { '--_tp-switch-spacing': 'var(--tp-control-height-sm)' } },
    {
      selector: '&::part(switch)',
      declarations: { background: 'var(--tp-muted)', 'border-color': 'var(--tp-border)' },
    },
    { selector: '&::part(switch)::before', declarations: { opacity: '0' } },
    {
      selector: '&::part(switch-thumb)',
      declarations: {
        background: 'var(--tp-background)',
        color: 'var(--tp-foreground)',
        'box-shadow': 'var(--tp-shadow-sm)',
      },
    },
  ],
  'theme-switcher-switch-size-default': [],
  'theme-switcher-switch-size-sm': [
    { declarations: { '--_tp-switch-spacing': 'var(--tp-space-5)' } },
  ],
  'theme-switcher-button': [],
  'theme-switcher-button-size-default': [],
  'theme-switcher-button-size-sm': [],
  'theme-switcher-group': [],
  'theme-switcher-group-size-default': [],
  'theme-switcher-group-size-sm': [],
  'theme-switcher-option': [],
  'theme-switcher-option-size-default': [],
  'theme-switcher-option-size-sm': [],
  'theme-switcher-icon': [
    {
      declarations: {
        'inline-size': 'var(--tp-icon-size-md)',
        'block-size': 'var(--tp-icon-size-md)',
        transition: motionTransition(['opacity', 'transform'], 'fast'),
      },
    },
    // Outgoing icons turn away and shrink; the sun leaves counterclockwise, the others clockwise.
    {
      selector: '&:not([data-active])',
      declarations: { opacity: '0', transform: 'rotate(90deg) scale(0)' },
    },
    {
      selector: '&[data-preference="light"]:not([data-active])',
      declarations: { transform: 'rotate(-90deg) scale(0)' },
    },
  ],
  'theme-switcher-icon-size-default': [],
  'theme-switcher-icon-size-sm': [
    {
      declarations: {
        'inline-size': 'var(--tp-icon-size-sm)',
        'block-size': 'var(--tp-icon-size-sm)',
      },
    },
  ],
};
