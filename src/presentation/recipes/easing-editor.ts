import { motionTransition } from '../motion.js';
import type { PresentationDictionary } from '../resolver.js';
import { activeRing, focusRing, thumb } from './shared/handle.js';
import { popupBorder } from './shared/surface.js';

// Widgets Specification 6.2 Presentation: the curve geometry, the thumbnails and the tick
// positions are content supplied by the widget as SVG; every color below resolves through
// tokens. Reference: tweakpane lib/sass/view/_point-2d-picker.scss (axes at 0.1 opacity,
// 4px marker filled on focus) and _graph-log.scss (polyline stroke) adapted to the library
// tokens; the handle rings are the shared widget handle recipe.

const hairline = 'color-mix(in oklab, var(--tp-foreground) 10%, transparent)';
const dots = 'color-mix(in oklab, var(--tp-foreground) 18%, transparent)';
const tickMix = 'color-mix(in oklab, var(--tp-foreground) 55%, transparent)';

export const easingEditorAppearance: PresentationDictionary = {
  'easing-editor': [
    {
      declarations: {
        '--_tp-easing-editor-space': 'var(--tp-space-3)',
        '--_tp-easing-editor-graph': 'calc(var(--tp-spacing) * 96)',
        '--_tp-easing-editor-handle': 'var(--tp-space-4)',
        '--_tp-easing-editor-point': 'var(--tp-space-3)',
        '--_tp-easing-editor-thumb': 'calc(var(--tp-spacing) * 8)',
        '--_tp-easing-editor-presets': 'calc(var(--tp-spacing) * 44)',
        '--_tp-easing-editor-frames': 'var(--tp-space-3)',
        color: 'var(--tp-foreground)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
  ],
  'easing-editor-size-sm': [
    {
      declarations: {
        '--_tp-easing-editor-space': 'var(--tp-space-2)',
        '--_tp-easing-editor-graph': 'calc(var(--tp-spacing) * 72)',
        '--_tp-easing-editor-handle': 'var(--tp-space-3)',
        '--_tp-easing-editor-point': 'var(--tp-space-2-5)',
        '--_tp-easing-editor-thumb': 'calc(var(--tp-spacing) * 7)',
        '--_tp-easing-editor-presets': 'calc(var(--tp-spacing) * 38)',
        '--_tp-easing-editor-frames': 'var(--tp-space-2-5)',
      },
    },
  ],
  'easing-editor-size-lg': [
    {
      declarations: {
        '--_tp-easing-editor-space': 'var(--tp-space-4)',
        '--_tp-easing-editor-graph': 'calc(var(--tp-spacing) * 120)',
        '--_tp-easing-editor-handle': 'var(--tp-space-5)',
        '--_tp-easing-editor-point': 'var(--tp-space-3-5)',
        '--_tp-easing-editor-thumb': 'calc(var(--tp-spacing) * 10)',
        '--_tp-easing-editor-presets': 'calc(var(--tp-spacing) * 52)',
        '--_tp-easing-editor-frames': 'var(--tp-space-3-5)',
      },
    },
  ],
  // Compact: tighter rows; the presets overlay the graph instead of taking a column.
  'easing-editor-layout-compact': [
    { declarations: { '--_tp-easing-editor-space': 'var(--tp-space-2)' } },
  ],
  'easing-editor-label': [
    { declarations: { 'font-size': 'var(--tp-text-sm)', 'font-weight': 'var(--tp-font-medium)' } },
  ],
  // The badge is a Badge (tp-badge) host floating over the graph and keeps the Badge's recipe.
  'easing-editor-badge': [],
  // The mode Button is a Button host in the header and keeps the Button's recipe.
  'easing-editor-preview-mode': [],
  // The presets overlay floats over the graph on a translucent surface.
  'easing-editor-presets': [
    {
      selector: '&[data-overlay]',
      declarations: {
        'border-radius': 'var(--tp-radius-lg)',
        border: popupBorder,
        'background-color': 'color-mix(in oklab, var(--tp-background) 94%, transparent)',
        'box-shadow': 'var(--tp-shadow-md)',
        padding: 'var(--tp-space-2)',
      },
    },
  ],
  'easing-editor-preset-group': [],
  // Registered inside each preset Toggle group: a tile grid.
  'easing-editor-preset-grid': [],
  // Registered on each preset Toggle: the thumbnail above the name on a square-ish tile.
  'easing-editor-preset-item': [
    {
      selector: '&[part~="toggle"]',
      declarations: {
        'flex-direction': 'column',
        'align-items': 'center',
        'justify-content': 'center',
        gap: 'var(--tp-space-1)',
        padding: 'var(--tp-space-1-5)',
        'inline-size': '100%',
        'block-size': 'auto',
        'min-inline-size': '0',
        'min-block-size': '0',
        'font-size': 'var(--tp-text-xs)',
        'line-height': 'var(--tp-leading-tight, 1.25)',
      },
    },
    {
      selector: '&[part~="toggle"] > [part~="toggle-content"]',
      declarations: {
        'flex-direction': 'column',
        'align-items': 'center',
        gap: 'var(--tp-space-1)',
        'min-inline-size': '0',
        'max-inline-size': '100%',
      },
    },
  ],
  'easing-editor-preset-thumb': [
    { declarations: { color: 'var(--tp-primary)' } },
    {
      selector: '& .thumb-box',
      declarations: { fill: 'none', stroke: hairline, 'stroke-width': '1px' },
    },
    {
      selector: '& .thumb-curve',
      declarations: {
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': 'var(--tp-border-width-strong)',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      },
    },
  ],
  'easing-editor-graph': [
    {
      declarations: {
        'border-radius': 'var(--tp-radius-lg)',
        'background-color': 'var(--tp-card, var(--tp-background))',
        overflow: 'visible',
      },
    },
    {
      selector: '&[data-kind="custom"]:not([data-disabled], [data-readonly])',
      declarations: { cursor: 'crosshair' },
    },
    { selector: '&[data-disabled]', declarations: { cursor: 'not-allowed' } },
  ],
  'easing-editor-graph-grid': [
    { selector: '& .grid-dot', declarations: { stroke: dots, 'stroke-width': '2px' } },
  ],
  'easing-editor-graph-curve': [
    {
      declarations: {
        fill: 'none',
        stroke: 'var(--tp-primary)',
        'stroke-width': 'calc(var(--tp-border-width-strong) * 1.25)',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      },
    },
  ],
  'easing-editor-graph-handle-line': [
    {
      declarations: {
        stroke: 'color-mix(in oklab, var(--tp-primary) 55%, transparent)',
        'stroke-width': 'var(--tp-border-width)',
      },
    },
  ],
  'easing-editor-graph-handle': [
    ...thumb('var(--_tp-easing-editor-handle)'),
    { declarations: { '--_tp-handle-paint': 'var(--tp-primary)', cursor: 'grab' } },
    { selector: '&[data-dragging]', declarations: { cursor: 'grabbing' } },
  ],
  'easing-editor-graph-point': [
    ...thumb('var(--_tp-easing-editor-point)'),
    { declarations: { '--_tp-handle-paint': 'var(--tp-primary)', cursor: 'grab' } },
    { selector: '&[data-dragging]', declarations: { cursor: 'grabbing' } },
    { selector: '&[data-end]', declarations: { '--_tp-handle-paint': 'var(--tp-background)' } },
    { selector: '&:has(input:focus-visible)', declarations: focusRing },
    { selector: '&[data-dragging]', declarations: activeRing },
  ],
  // The preview square sits behind the grid at low opacity in the accent color.
  'easing-editor-graph-preview': [
    { declarations: { color: 'var(--tp-primary)', opacity: '0.1' } },
    {
      selector: '& .shape',
      declarations: { 'border-radius': 'var(--tp-radius-sm)', 'background-color': 'currentColor' },
    },
  ],
  'easing-editor-frames': [
    {
      declarations: {
        'border-radius': 'var(--tp-radius-full)',
        'background-color': 'var(--tp-muted)',
        overflow: 'hidden',
      },
    },
  ],
  'easing-editor-frames-tick': [{ declarations: { stroke: tickMix, 'stroke-width': '1px' } }],
  // Registered inside each composed Slider: naming only, the Slider keeps its recipe.
  'easing-editor-slider-track': [],
  'easing-editor-slider-range': [],
  'easing-editor-slider-thumb': [],
  // The output group keeps the Input group's recipe; the format addon is its text.
  'easing-editor-output-group': [],
  // The expression field: mono text, numbers in the accent color, units muted; the native input
  // keeps only its caret and selection over the highlighted mirror.
  'easing-editor-output': [
    {
      declarations: {
        'font-family': 'var(--tp-font-mono)',
        'font-size': 'var(--tp-text-sm)',
        'line-height': 'var(--tp-leading-normal)',
      },
    },
    {
      selector: '& .highlight, & .source',
      declarations: { padding: 'var(--tp-space-1) var(--tp-space-2-5)' },
    },
    { selector: '& .source', declarations: { 'caret-color': 'var(--tp-foreground)' } },
    {
      selector: '& .source::selection',
      declarations: {
        'background-color': 'color-mix(in oklab, var(--tp-primary) 30%, transparent)',
        color: 'transparent',
      },
    },
    { selector: '&[data-invalid] .highlight', declarations: { color: 'var(--tp-destructive)' } },
    { selector: '&[data-disabled] .highlight', declarations: { opacity: '0.5' } },
  ],
  'easing-editor-output-token': [
    { selector: '&[data-type="number"]', declarations: { color: 'var(--tp-primary)' } },
    { selector: '&[data-type="unit"]', declarations: { color: 'var(--tp-muted-foreground)' } },
  ],
};

/** Layout that is not replaceable appearance. */
export const easingEditorStructure: PresentationDictionary = {
  'easing-editor': [
    { declarations: { gap: 'var(--_tp-easing-editor-space)', 'container-type': 'inline-size' } },
  ],
  'easing-editor-header': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'easing-editor-presets': [],
  'easing-editor-preset-group': [],
  'easing-editor-preset-grid': [
    {
      selector: '&[part~="toggle-group"]',
      declarations: {
        display: 'grid',
        // The Toggle group root is a flex item of its host: span the host, not the min-content.
        'inline-size': '100%',
        'grid-template-columns':
          'repeat(auto-fill, minmax(calc(var(--_tp-easing-editor-thumb) + var(--tp-spacing) * 10), 1fr))',
        gap: 'var(--tp-space-1)',
      },
    },
  ],
  'easing-editor-graph': [{ declarations: { 'block-size': '100%' } }],
  'easing-editor-controls': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'easing-editor-parameter': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'easing-editor-duration': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'easing-editor-field': [{ declarations: { 'min-inline-size': 'calc(var(--tp-spacing) * 14)' } }],
  'easing-editor-frames': [{ declarations: { 'block-size': '100%' } }],
  'easing-editor-footer': [
    { declarations: { display: 'flex', 'justify-content': 'flex-end', gap: 'var(--tp-space-2)' } },
  ],
  'easing-editor-graph-preview': [],
  'easing-editor-copy': [],
  'easing-editor-adapter': [],
};

export { motionTransition };
