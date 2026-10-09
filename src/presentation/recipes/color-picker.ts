import { motionTransition } from '../motion.js';
import type {
  PresentationDeclarations,
  PresentationDictionary,
  PresentationRule,
} from '../resolver.js';
import { popupBorder } from './shared/surface.js';

// Widgets Specification 6.1 Presentation: value-domain paint arrives from the widget as the
// inline custom properties `--_tp-color-picker-paint` (an <image> list) and
// `--_tp-color-picker-thumb-paint` (a <color>); every rule below resolves through tokens.
// Reference: tweakpane lib/sass/view/_color-picker.scss (12px ring markers, 4px tracks,
// checkerboard mixin) adapted to the library tokens and the Slider thumb recipe.

const hairline = 'color-mix(in oklab, var(--tp-foreground) 10%, transparent)';
const ringMix = 'color-mix(in oklab, var(--tp-foreground) 30%, transparent)';

/** Checkerboard from the background and muted roles under the widget's paint layer. */
const checker: PresentationDeclarations = {
  'background-color': 'var(--tp-background)',
  'background-image':
    'var(--_tp-color-picker-paint, none), ' +
    'linear-gradient(45deg, var(--tp-muted) 25%, transparent 25% 75%, var(--tp-muted) 75%), ' +
    'linear-gradient(45deg, var(--tp-muted) 25%, transparent 25% 75%, var(--tp-muted) 75%)',
  'background-size':
    'auto, var(--_tp-color-picker-checker) var(--_tp-color-picker-checker), var(--_tp-color-picker-checker) var(--_tp-color-picker-checker)',
  'background-position':
    '0 0, 0 0, calc(var(--_tp-color-picker-checker) / 2) calc(var(--_tp-color-picker-checker) / 2)',
};

const thumbRing: PresentationDeclarations = {
  'border-radius': 'var(--tp-radius-full)',
  border: 'var(--tp-border-width-strong) var(--tp-border-style) var(--tp-background)',
  'box-shadow': `0 0 0 var(--tp-border-width) ${ringMix}, var(--tp-shadow-sm)`,
  background: 'var(--_tp-color-picker-thumb-paint, var(--tp-background))',
  transition: motionTransition(['box-shadow', 'outline-color'], 'fast'),
};
const focusRing: PresentationDeclarations = {
  outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
  'outline-offset': 'var(--tp-ring-offset)',
};
const activeRing: PresentationDeclarations = {
  'box-shadow': `0 0 0 var(--tp-border-width) ${ringMix}, 0 0 0 calc(var(--tp-ring-width) * 1.5) color-mix(in oklab, var(--tp-ring) 50%, transparent)`,
};

const thumb = (size: string): readonly PresentationRule[] => [
  { declarations: { 'inline-size': size, 'block-size': size, ...thumbRing } },
  { selector: '&:has(input:focus-visible)', declarations: focusRing },
  { selector: '&[data-dragging]', declarations: activeRing },
];

const surfaceFrame: PresentationDeclarations = {
  'border-radius': 'var(--tp-radius-lg)',
  'box-shadow': `inset 0 0 0 var(--tp-border-width) ${hairline}`,
  'background-image': 'var(--_tp-color-picker-paint)',
};

export const colorPickerAppearance: PresentationDictionary = {
  'color-picker': [
    {
      declarations: {
        '--_tp-color-picker-space': 'var(--tp-space-3)',
        '--_tp-color-picker-area-base': 'calc(var(--tp-spacing) * 40)',
        '--_tp-color-picker-area': 'var(--_tp-color-picker-area-base)',
        '--_tp-color-picker-track': 'var(--tp-space-3)',
        '--_tp-color-picker-thumb': 'var(--tp-space-4)',
        '--_tp-color-picker-swatch': 'var(--tp-control-height-sm)',
        '--_tp-color-picker-checker': 'var(--tp-space-2)',
        '--_tp-color-picker-ring': 'var(--tp-space-5)',
        '--_tp-color-picker-popup': 'calc(var(--tp-spacing) * 88)',
        color: 'var(--tp-foreground)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
    { selector: '&:dir(rtl)', declarations: { '--_tp-color-picker-axis': 'to left' } },
  ],
  'color-picker-size-sm': [
    {
      declarations: {
        '--_tp-color-picker-space': 'var(--tp-space-2)',
        '--_tp-color-picker-area-base': 'calc(var(--tp-spacing) * 32)',
        '--_tp-color-picker-track': 'var(--tp-space-2-5)',
        '--_tp-color-picker-thumb': 'var(--tp-space-3)',
        '--_tp-color-picker-swatch': 'var(--tp-control-height-xs)',
        '--_tp-color-picker-ring': 'var(--tp-space-4)',
        '--_tp-color-picker-popup': 'calc(var(--tp-spacing) * 78)',
      },
    },
  ],
  'color-picker-size-lg': [
    {
      declarations: {
        '--_tp-color-picker-space': 'var(--tp-space-4)',
        '--_tp-color-picker-area-base': 'calc(var(--tp-spacing) * 50)',
        '--_tp-color-picker-track': 'var(--tp-space-4)',
        '--_tp-color-picker-thumb': 'var(--tp-space-5)',
        '--_tp-color-picker-swatch': 'var(--tp-control-height-md)',
        '--_tp-color-picker-ring': 'var(--tp-space-6)',
        '--_tp-color-picker-popup': 'calc(var(--tp-spacing) * 98)',
      },
    },
  ],
  'color-picker-label': [
    { declarations: { 'font-size': 'var(--tp-text-sm)', 'font-weight': 'var(--tp-font-medium)' } },
  ],
  'color-picker-area': [
    { declarations: { ...surfaceFrame, cursor: 'crosshair' } },
    { selector: '&[data-disabled]', declarations: { cursor: 'not-allowed' } },
  ],
  'color-picker-area-thumb': thumb('var(--_tp-color-picker-thumb)'),
  // Registered inside each composed Slider: the muted track becomes the widget's paint.
  'color-picker-slider-track': [
    {
      selector: '&[part~="slider-track"]',
      declarations: {
        height: 'var(--_tp-color-picker-track)',
        'border-radius': 'var(--tp-radius-full)',
        'background-color': 'var(--tp-background)',
        'background-image': 'var(--_tp-color-picker-paint)',
        'box-shadow': `inset 0 0 0 var(--tp-border-width) ${hairline}`,
      },
    },
  ],
  'color-picker-alpha-track': [
    {
      selector: '&[part~="slider-track"]',
      declarations: {
        height: 'var(--_tp-color-picker-track)',
        'border-radius': 'var(--tp-radius-full)',
        ...checker,
        'box-shadow': `inset 0 0 0 var(--tp-border-width) ${hairline}`,
      },
    },
  ],
  'color-picker-slider-range': [
    { selector: '&[part~="slider-range"]', declarations: { display: 'none' } },
  ],
  'color-picker-slider-thumb': [
    {
      selector: '&[part~="slider-thumb"]',
      declarations: {
        width: 'var(--_tp-color-picker-thumb)',
        height: 'var(--_tp-color-picker-thumb)',
        ...thumbRing,
      },
    },
    { selector: '&[part~="slider-thumb"]:has(input:focus-visible)', declarations: focusRing },
    {
      selector:
        '&[part~="slider-thumb"]:is(:hover, [data-active], [data-dragging]):not([data-disabled])',
      declarations: activeRing,
    },
  ],
  'color-picker-preview': [
    {
      declarations: {
        'inline-size': 'var(--tp-control-height-md)',
        'block-size': 'var(--tp-control-height-md)',
        'border-radius': 'var(--tp-radius-md)',
        border: popupBorder,
        ...checker,
      },
    },
  ],
  'color-picker-preview-shape-round': [
    { declarations: { 'border-radius': 'var(--tp-radius-full)' } },
  ],
  // The fill covers the Toggle, which clips it to its own radius (rounded square, round, or
  // the joined strip geometry); the fill itself stays square.
  'color-picker-swatch': [{ declarations: { ...checker } }],
  'color-picker-swatch-shape-round': [],
  'color-picker-swatch-shape-square': [],
  'color-picker-swatch-item': [
    {
      selector: '&[part~="toggle"]',
      declarations: {
        position: 'relative',
        overflow: 'hidden',
        padding: '0',
        'inline-size': 'var(--_tp-color-picker-swatch)',
        'block-size': 'var(--_tp-color-picker-swatch)',
        'min-inline-size': '0',
        'min-block-size': '0',
        'border-radius': 'var(--tp-radius-md)',
      },
    },
    {
      // The fill is slotted content; the Toggle's content box steps aside so the fill
      // positions against the Toggle root.
      selector: '&[part~="toggle"] > [part~="toggle-content"]',
      declarations: { position: 'static' },
    },
    {
      // The pressed ring sits on the fill (the Toggle's own box is covered by it).
      selector: '&[part~="toggle"][data-pressed] slot::slotted(.swatch)',
      declarations: {
        'box-shadow':
          'inset 0 0 0 var(--tp-border-width-strong) var(--tp-background), inset 0 0 0 calc(var(--tp-border-width-strong) * 2) var(--tp-ring)',
      },
    },
  ],
  // Strip members: borderless, joined through the Toggle Group seam geometry, equal widths.
  'color-picker-scheme-item': [
    {
      selector: '&[part~="toggle"]',
      declarations: {
        position: 'relative',
        overflow: 'hidden',
        padding: '0',
        border: '0',
        'inline-size': '100%',
        'block-size': 'var(--_tp-color-picker-swatch)',
        'min-inline-size': '0',
        'min-block-size': '0',
      },
    },
    {
      selector: '&[part~="toggle"] > [part~="toggle-content"]',
      declarations: { position: 'static' },
    },
    {
      // The pressed ring sits on the fill (the Toggle's own box is covered by it).
      selector: '&[part~="toggle"][data-pressed] slot::slotted(.swatch)',
      declarations: {
        'box-shadow':
          'inset 0 0 0 var(--tp-border-width-strong) var(--tp-background), inset 0 0 0 calc(var(--tp-border-width-strong) * 2) var(--tp-ring)',
      },
    },
  ],
  'color-picker-swatch-item-shape-round': [
    { selector: '&[part~="toggle"]', declarations: { 'border-radius': 'var(--tp-radius-full)' } },
  ],
  'color-picker-wheel': [
    {
      declarations: {
        'border-radius': 'var(--tp-radius-full)',
        'background-image': 'var(--_tp-color-picker-paint)',
        'box-shadow': `inset 0 0 0 var(--tp-border-width) ${hairline}`,
      },
    },
    {
      // The brightness dim sits on ::after; ::before stays reserved for the fill layer.
      selector: '&::after',
      declarations: {
        content: '""',
        position: 'absolute',
        inset: '0',
        'border-radius': 'inherit',
        background: 'var(--_tp-color-picker-dim, transparent)',
        'pointer-events': 'none',
      },
    },
  ],
  'color-picker-wheel-handle': [
    ...thumb('var(--_tp-color-picker-thumb)'),
    {
      selector: '&[data-primary]',
      declarations: {
        'inline-size': 'calc(var(--_tp-color-picker-thumb) * 1.25)',
        'block-size': 'calc(var(--_tp-color-picker-thumb) * 1.25)',
      },
    },
    {
      selector: '&[data-selected]',
      declarations: {
        'box-shadow': `0 0 0 var(--tp-border-width) ${ringMix}, 0 0 0 calc(var(--tp-ring-width) * 2) var(--tp-background), 0 0 0 calc(var(--tp-ring-width) * 3) var(--tp-ring)`,
      },
    },
    { selector: '&:not([data-editable])', declarations: { cursor: 'default' } },
  ],
  'color-picker-wheel-line': [
    {
      declarations: {
        stroke: 'color-mix(in oklab, var(--tp-foreground) 60%, transparent)',
        'stroke-width': 'var(--tp-border-width-strong)',
        fill: 'none',
        'stroke-linecap': 'round',
      },
    },
  ],
  'color-picker-ring': [
    {
      declarations: {
        'border-radius': 'var(--tp-radius-full)',
        'background-image': 'var(--_tp-color-picker-paint)',
        'box-shadow': `inset 0 0 0 var(--tp-border-width) ${hairline}`,
      },
    },
  ],
  'color-picker-ring-thumb': thumb('var(--_tp-color-picker-thumb)'),
  'color-picker-triangle': [{ declarations: { 'border-radius': 'var(--tp-radius-sm)' } }],
  'color-picker-triangle-thumb': thumb('var(--_tp-color-picker-thumb)'),
};

/** Layout that is not replaceable appearance. */
export const colorPickerStructure: PresentationDictionary = {
  'color-picker': [
    { declarations: { gap: 'var(--_tp-color-picker-space)', 'container-type': 'inline-size' } },
  ],
  'color-picker-popup': [
    {
      declarations: {
        gap: 'var(--_tp-color-picker-space)',
        'inline-size': 'var(--_tp-color-picker-popup)',
        'max-inline-size': '100%',
        // Thumbs sit centered on the plane edges and carry a hit-target halo; the inset keeps
        // that overhang inside the Popover's scroll container.
        padding: 'calc(var(--_tp-color-picker-thumb) / 2 + var(--tp-space-2))',
        // The plane gives way before the Popover has to scroll: it shrinks with the available
        // height (controls, a wrapped fields row, gaps and paddings take up to 58 spacing units)
        // down to 20 units.
        '--_tp-color-picker-area':
          'max(calc(var(--tp-spacing) * 20), min(var(--_tp-color-picker-area-base), calc(var(--tp-available-height, 100dvh) - calc(var(--tp-spacing) * 58))))',
      },
    },
  ],
  'color-picker-area': [
    { declarations: { 'block-size': 'var(--_tp-color-picker-area)', overflow: 'visible' } },
  ],
  'color-picker-controls': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'color-picker-toolbar': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'color-picker-channel': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'color-picker-fields': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  // The channel editors are a Field group; its members keep the Input group recipe.
  'color-picker-field-group': [],
  'color-picker-field': [{ declarations: { 'min-inline-size': 'calc(var(--tp-spacing) * 14)' } }],
  'color-picker-swatch-grid': [
    {
      selector: '&[part~="toggle-group"]',
      declarations: {
        display: 'grid',
        'grid-template-columns': 'repeat(auto-fill, var(--_tp-color-picker-swatch))',
        gap: 'var(--tp-space-1)',
        'justify-content': 'start',
      },
    },
  ],
  'color-picker-swatch': [{ declarations: { display: 'block' } }],
  'color-picker-swatches': [{ declarations: { gap: 'var(--tp-space-3)' } }],
  'color-picker-schemes': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  // Registered inside each strip Toggle Group: the strip spans the row.
  'color-picker-scheme': [
    { selector: '&[part~="toggle-group"]', declarations: { 'inline-size': '100%' } },
  ],
  'color-picker-wheel': [
    {
      declarations: {
        position: 'relative',
        'aspect-ratio': '1',
        'inline-size': 'min(100%, var(--_tp-color-picker-area))',
        'margin-inline': 'auto',
      },
    },
  ],
  'color-picker-ring': [{ declarations: { position: 'absolute', inset: '0' } }],
  'color-picker-triangle': [
    { declarations: { position: 'absolute', inset: 'var(--_tp-color-picker-ring)' } },
  ],
  'color-picker-footer': [
    { declarations: { display: 'flex', 'justify-content': 'flex-end', gap: 'var(--tp-space-2)' } },
  ],
};
