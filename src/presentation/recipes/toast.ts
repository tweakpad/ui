import { motionDuration, motionTransition } from '../motion.js';
import type { PresentationDictionary } from '../resolver.js';

/** Shadcn base Toast and Nova paint; shared surface contribution supplies popover colors. */
export const toastAppearance: PresentationDictionary = {
  'toast-toast': [
    {
      selector: '&',
      declarations: {
        padding: '0',
        'border-radius': 'var(--tp-radius-2xl)',
        outline: 'none',
        'block-size': 'var(--tp-toast-frontmost-height, var(--tp-toast-height))',
        transform:
          'translateX(var(--tp-toast-swipe-movement-x)) translateY(calc(var(--tp-toast-swipe-movement-y) + var(--tp-toast-stack-sign) * var(--tp-toast-index) * var(--tp-space-3))) scale(max(0, calc(1 - var(--tp-toast-index) * 0.1)))',
        transition: motionTransition(['transform', 'opacity', 'block-size']),
      },
    },
    {
      selector: '&[data-expanded]',
      declarations: {
        'block-size': 'var(--tp-toast-height)',
        transform:
          'translateX(var(--tp-toast-swipe-movement-x)) translateY(calc(var(--tp-toast-stack-sign) * (var(--tp-toast-offset-y) + var(--tp-toast-index) * var(--tp-space-3)) + var(--tp-toast-swipe-movement-y)))',
      },
    },
    { selector: '&[data-limited]', declarations: { opacity: '0', visibility: 'hidden' } },
    {
      selector:
        '&[data-starting-style]:not([data-tp-motion-driven]), &[data-ending-style]:not([data-tp-motion-driven])',
      declarations: {
        opacity: '0',
        transform: 'translateY(calc(var(--tp-toast-stack-sign) * -150%))',
      },
    },
    {
      selector: '&[data-ending-style][data-swipe-direction="left"]:not([data-tp-motion-driven])',
      declarations: { transform: 'translateX(-150%)' },
    },
    {
      selector: '&[data-ending-style][data-swipe-direction="right"]:not([data-tp-motion-driven])',
      declarations: { transform: 'translateX(150%)' },
    },
    {
      selector: '&[data-ending-style][data-swipe-direction="up"]:not([data-tp-motion-driven])',
      declarations: { transform: 'translateY(-150%)' },
    },
    {
      selector: '&[data-ending-style][data-swipe-direction="down"]:not([data-tp-motion-driven])',
      declarations: { transform: 'translateY(150%)' },
    },
    {
      selector: '&[data-ending-style][data-swipe-direction]',
      declarations: {
        'transition-duration': motionDuration(
          'normal',
          'max(.1, calc(1 - var(--tp-swipe-strength, 0)))',
        ),
      },
    },
    { selector: '&[data-tp-motion-driven]', declarations: { transition: 'none' } },
    {
      selector: '&:focus-visible',
      declarations: {
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'outline-offset': 'var(--tp-ring-offset)',
      },
    },
  ],
  'toast-content': [
    {
      selector: '&',
      declarations: {
        padding: 'var(--tp-space-4)',
        gap: 'var(--tp-space-3)',
        'border-radius': 'inherit',
        opacity: '1',
        transition: motionTransition(['opacity'], 'fast'),
      },
    },
    { selector: '&[data-behind]:not([data-expanded])', declarations: { opacity: '0' } },
  ],
  'toast-title': [
    {
      selector: '&',
      declarations: {
        'font-size': 'var(--tp-text-sm)',
        'font-weight': 'var(--tp-font-medium)',
        'line-height': 'var(--tp-leading-tight)',
      },
    },
  ],
  'toast-description': [
    {
      selector: '&',
      declarations: {
        'font-size': 'var(--tp-text-sm)',
        color: 'var(--tp-muted-foreground)',
        'line-height': 'var(--tp-leading-normal)',
      },
    },
  ],
  'toast-close': [
    {
      selector: '&',
      declarations: {
        padding: '0',
        border: '0',
        background: 'transparent',
        color: 'var(--tp-muted-foreground)',
        'box-shadow': 'none',
      },
    },
  ],
  'toast-icon': [
    {
      selector: '&',
      declarations: {
        'inline-size': 'var(--tp-icon-size-md)',
        'block-size': 'var(--tp-icon-size-md)',
      },
    },
  ],
};
