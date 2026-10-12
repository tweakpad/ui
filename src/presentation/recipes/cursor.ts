import { motionTransition } from '../motion.js';
import type { PresentationDictionary } from '../resolver.js';

const size = 'var(--tp-cursor-size, var(--tp-space-6))';

/**
 * Cursor appearance (CL Cursor `ccl-q1`…`ccl-q3`): the surface carries opacity, blend and
 * color and hides while not following, outside, native or disabled; the content scales while
 * pressed, paints the default ring only while nothing else is shown and morphs to a zone's
 * bounds while stuck.
 * Fills are never transitioned.
 */
export const cursorAppearance: PresentationDictionary = {
  cursor: [],
  'cursor-surface': [
    {
      selector: '&',
      declarations: {
        opacity: 'var(--tp-cursor-opacity, 1)',
        'mix-blend-mode': 'var(--tp-cursor-blend, normal)',
        color: 'var(--tp-cursor-color, var(--tp-foreground))',
        transition: motionTransition(['opacity'], 'fast'),
      },
    },
    {
      selector:
        ':host(:not([data-following])) &, :host([data-outside]) &, :host([data-native]) &, :host([data-disabled]) &',
      declarations: { opacity: '0' },
    },
  ],
  'cursor-content': [
    /* Pressed scales the content around its own center. The surface is positioned by its
       transform, and the individual scale property composes outside it, so scaling the surface
       would also scale its translation and move the cursor toward the page origin. */
    {
      selector: '&',
      declarations: { transition: motionTransition(['scale'], 'fast') },
    },
    {
      selector: ':host([data-pressed]) &',
      declarations: { scale: '0.85' },
    },
    {
      selector: '&[data-tp-mark]',
      declarations: {
        'inline-size': size,
        'block-size': size,
        border: 'var(--tp-border-width-strong) var(--tp-border-style) currentcolor',
        'border-radius': 'var(--tp-cursor-radius, var(--tp-radius-full))',
        transition: motionTransition(
          ['inline-size', 'block-size', 'border-radius', 'border-color', 'scale'],
          'fast',
        ),
      },
    },
    {
      selector: ':host([data-stuck]) &[data-tp-mark]',
      declarations: {
        'inline-size': 'var(--tp-cursor-stuck-width)',
        'block-size': 'var(--tp-cursor-stuck-height)',
        'border-radius': 'var(--tp-radius-md)',
      },
    },
  ],
  'cursor-zone': [],
};
