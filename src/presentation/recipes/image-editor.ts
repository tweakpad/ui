import type { PresentationDictionary } from '../resolver.js';
import { floatEdge } from './shared/edges.js';
import { floatingSet } from './shared/floating-set.js';
import { insetFocusRing, focusRing } from './shared/focus.js';
import { handleSurface, thumbRing } from './shared/handle.js';
import { swatchFill } from './shared/swatch.js';

// Widgets Specification Image editor Presentation. Public `--tp-image-editor-*` hooks set on the
// host win over these defaults, which live in private properties so a part never shadows a host
// write.

/**
 * The dim outside the region: the modal backdrop's dark paint, deeper so the kept part stands out
 * over bright and dark images alike.
 */
const backdrop =
  'color-mix(in srgb, light-dark(var(--tp-foreground), var(--tp-background)) calc(var(--tp-opacity-backdrop) * 100% + 16%), transparent)';

/** A hairline that reads over any image: near-white with a dark edge. */
const regionLine = 'color-mix(in oklab, white 85%, transparent)';

export const imageEditorAppearance: PresentationDictionary = {
  'image-editor': [
    {
      declarations: {
        '--_checker-size': 'var(--tp-image-editor-checker-size, var(--tp-space-3))',
        '--_checker-color': 'var(--tp-image-editor-checker-color, var(--tp-muted))',
        '--_dim': `var(--tp-image-editor-dim, ${backdrop})`,
        'border-radius': 'var(--tp-radius-lg)',
      },
    },
  ],
  'image-editor-viewport': [
    {
      declarations: {
        'border-radius': 'inherit',
        background: 'var(--tp-background)',
      },
    },
    { selector: '&:focus-visible', declarations: insetFocusRing },
  ],
  'image-editor-background': [
    {
      declarations: swatchFill(
        'linear-gradient(transparent, transparent)',
        'var(--_checker-size)',
        'var(--_checker-color)',
      ),
    },
  ],
  'image-editor-image': [],
  'image-editor-region': [
    {
      declarations: {
        'box-shadow': `inset 0 0 0 var(--tp-border-width) ${regionLine}, 0 0 0 100vmax var(--_dim)`,
      },
    },
    { selector: '&:focus-visible', declarations: { ...focusRing, 'outline-offset': '2px' } },
  ],
  'image-editor-guides': [
    {
      declarations: {
        'background-image': [
          `linear-gradient(to right, transparent calc(100% / 3 - 0.5px), ${regionLine} calc(100% / 3 - 0.5px) calc(100% / 3 + 0.5px), transparent calc(100% / 3 + 0.5px) calc(200% / 3 - 0.5px), ${regionLine} calc(200% / 3 - 0.5px) calc(200% / 3 + 0.5px), transparent calc(200% / 3 + 0.5px))`,
          `linear-gradient(to bottom, transparent calc(100% / 3 - 0.5px), ${regionLine} calc(100% / 3 - 0.5px) calc(100% / 3 + 0.5px), transparent calc(100% / 3 + 0.5px) calc(200% / 3 - 0.5px), ${regionLine} calc(200% / 3 - 0.5px) calc(200% / 3 + 0.5px), transparent calc(200% / 3 + 0.5px))`,
        ].join(', '),
      },
    },
  ],
  'image-editor-handle': [
    {
      declarations: {
        'inline-size': '12px',
        'block-size': '12px',
        'box-sizing': 'border-box',
        ...thumbRing,
        // A light marker in either scheme, which reads over any image.
        '--_tp-handle-paint': handleSurface,
      },
    },
  ],
  'image-editor-placeholder': [{ declarations: { background: 'var(--tp-muted)' } }],
  'image-editor-error': [
    {
      declarations: {
        gap: 'var(--tp-space-2)',
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-sm)',
        background: 'var(--tp-background)',
      },
    },
  ],
  'image-editor-controls': [
    { declarations: { gap: 'var(--tp-space-2)', padding: 'var(--tp-space-3)' } },
  ],
  'image-editor-control-set': [
    {
      declarations: {
        ...floatingSet,
        border: floatEdge.border,
        padding: 'var(--tp-space-0-5)',
        gap: 'var(--tp-space-1)',
      },
    },
  ],
};
