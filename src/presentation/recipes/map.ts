import { motionTransition } from '../motion.js';
import type { PresentationDictionary } from '../resolver.js';

/** Default Map appearance (`ucl21-map` map-l-presentation): existing token roles only. */
export const mapAppearance: PresentationDictionary = {
  map: [
    {
      declarations: {
        'border-radius': 'var(--tp-radius-lg)',
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
        background: 'var(--tp-muted)',
        color: 'var(--tp-foreground)',
      },
    },
  ],
  'map-viewport': [
    {
      selector: '&:focus-visible',
      declarations: {
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'outline-offset': 'calc(var(--tp-ring-width) * -1)',
      },
    },
  ],
  'map-status': [
    {
      declarations: {
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-sm)',
        background: 'var(--tp-muted)',
        gap: 'var(--tp-space-2)',
        padding: 'var(--tp-space-4)',
      },
    },
    {
      selector: ':host([data-status="error"]) &',
      declarations: { color: 'var(--tp-destructive)' },
    },
  ],
  'map-pin': [
    {
      declarations: {
        cursor: 'pointer',
        'border-radius': 'var(--tp-radius-sm)',
        transition: motionTransition(['scale', 'filter'], 'fast'),
      },
    },
    {
      selector: ':host([data-selected]) &',
      declarations: { scale: '1.2', filter: 'drop-shadow(0 0 0.25rem var(--tp-ring))' },
    },
    {
      selector: '&:focus-visible',
      declarations: {
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'outline-offset': 'var(--tp-ring-offset)',
        'box-shadow':
          '0 0 0 calc(var(--tp-ring-width) + var(--tp-ring-offset)) var(--tp-background)',
      },
    },
    {
      selector: ':host([data-disabled]) &',
      declarations: { cursor: 'not-allowed', opacity: 'var(--tp-opacity-disabled)' },
    },
  ],
  'map-pin-visual': [
    {
      declarations: {
        background: 'var(--tp-primary)',
        border: 'calc(var(--tp-border-width) * 2) var(--tp-border-style) var(--tp-background)',
        'box-shadow': 'var(--tp-shadow-md)',
      },
    },
    { selector: '&::after', declarations: { background: 'var(--tp-primary-foreground)' } },
  ],
  'map-overlay': [],
  'map-control': [],
};
