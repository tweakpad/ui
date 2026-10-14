import { ambientAnimation, motionTransition, presenceMotion } from '../motion.js';
import type { PresentationDictionary, PresentationRule } from '../resolver.js';
import { activeRing, focusRing, thumb } from './shared/handle.js';
import { popupBorder, sectionFooterAppearance, surfaceAppearance } from './shared/surface.js';

// Widgets Specification 6.3 Presentation: path geometry, label anchors and port positions are
// content supplied by the engine; every color below resolves through tokens. The composed
// regions use the library Card, List item, Badge, Marker, Button group and handle recipes.

const hairline = 'color-mix(in oklab, var(--tp-foreground) 10%, transparent)';
const dots = 'color-mix(in oklab, var(--tp-foreground) 18%, transparent)';
const edgeStroke = 'color-mix(in oklab, var(--tp-foreground) 35%, transparent)';
const edgeHover = 'color-mix(in oklab, var(--tp-foreground) 55%, transparent)';
const haloStroke = 'color-mix(in oklab, var(--tp-ring) 35%, transparent)';
const selectionFill = 'color-mix(in oklab, var(--tp-primary) 8%, transparent)';
const selectionLine = 'color-mix(in oklab, var(--tp-primary) 80%, transparent)';
const minimapNode = 'color-mix(in oklab, var(--tp-foreground) 15%, transparent)';
const minimapMask = 'color-mix(in oklab, var(--tp-muted) 60%, transparent)';
const panelMotion: readonly PresentationRule[] = [
  { declarations: { transition: motionTransition(['translate']) } },
];
const statusRing =
  'color-mix(in oklab, var(--_tp-flow-status, var(--tp-primary)) 60%, transparent)';

const statusTones: readonly [status: string, tone: string][] = [
  ['pending', 'var(--tp-warning)'],
  ['waiting', 'var(--tp-warning)'],
  ['running', 'var(--tp-primary)'],
  ['active', 'var(--tp-primary)'],
  ['success', 'var(--tp-success)'],
  ['taken', 'var(--tp-success)'],
  ['failed', 'var(--tp-destructive)'],
  ['skipped', 'var(--tp-muted-foreground)'],
  ['cancelled', 'var(--tp-muted-foreground)'],
  ['not-taken', 'var(--tp-muted-foreground)'],
  ['disabled', 'var(--tp-muted-foreground)'],
];

const tones: readonly [tone: string, value: string][] = [
  ['chart-1', 'var(--tp-chart-1)'],
  ['chart-2', 'var(--tp-chart-2)'],
  ['chart-3', 'var(--tp-chart-3)'],
  ['chart-4', 'var(--tp-chart-4)'],
  ['chart-5', 'var(--tp-chart-5)'],
  ['primary', 'var(--tp-primary)'],
  ['success', 'var(--tp-success)'],
  ['warning', 'var(--tp-warning)'],
  ['destructive', 'var(--tp-destructive)'],
];

/** `--_tp-flow-tone` from a `data-tone` marker. */
const toneRules: readonly PresentationRule[] = tones.map(([tone, value]) => ({
  selector: `&[data-tone="${tone}"]`,
  declarations: { '--_tp-flow-tone': value },
}));
const sidebar = '&[data-layout="sidebar"]';

export const flowAppearance: PresentationDictionary = {
  flow: [
    {
      declarations: {
        '--_tp-flow-space': 'var(--tp-space-3)',
        '--_tp-flow-node-width': 'calc(var(--tp-spacing) * 60)',
        '--_tp-flow-port-size': 'var(--tp-space-2-5)',
        '--_tp-flow-handle': 'var(--tp-space-3)',
        '--_tp-flow-edge-width': '1.5px',
        '--_tp-flow-marker': 'var(--tp-space-3)',
        '--_tp-flow-grid': '16px',
        '--_tp-flow-dash': '6 4',
        '--_tp-flow-minimap': 'calc(var(--tp-spacing) * 50)',
        '--_tp-flow-inspector': 'calc(var(--tp-spacing) * 88)',
        '--_tp-flow-palette': 'calc(var(--tp-spacing) * 64)',
        '--_tp-flow-block-size': 'calc(var(--tp-spacing) * 120)',
        background: 'var(--tp-background)',
        color: 'var(--tp-foreground)',
        'font-size': 'var(--tp-text-sm)',
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
        'border-radius': 'var(--tp-radius-lg)',
      },
    },
    { selector: '&[data-disabled]', declarations: { opacity: 'var(--tp-opacity-disabled)' } },
  ],
  'flow-size-sm': [
    {
      declarations: {
        '--_tp-flow-space': 'var(--tp-space-2)',
        '--_tp-flow-node-width': 'calc(var(--tp-spacing) * 52)',
        '--_tp-flow-port-size': 'var(--tp-space-2)',
        '--_tp-flow-handle': 'var(--tp-space-2-5)',
        '--_tp-flow-edge-width': '1px',
        '--_tp-flow-marker': 'var(--tp-space-2-5)',
        '--_tp-flow-minimap': 'calc(var(--tp-spacing) * 40)',
        '--_tp-flow-inspector': 'calc(var(--tp-spacing) * 72)',
        '--_tp-flow-palette': 'calc(var(--tp-spacing) * 56)',
        '--_tp-flow-block-size': 'calc(var(--tp-spacing) * 90)',
      },
    },
  ],
  'flow-size-lg': [
    {
      declarations: {
        '--_tp-flow-space': 'var(--tp-space-4)',
        '--_tp-flow-node-width': 'calc(var(--tp-spacing) * 68)',
        '--_tp-flow-port-size': 'var(--tp-space-3)',
        '--_tp-flow-handle': 'var(--tp-space-4)',
        '--_tp-flow-edge-width': '2px',
        '--_tp-flow-marker': 'var(--tp-space-4)',
        '--_tp-flow-minimap': 'calc(var(--tp-spacing) * 60)',
        '--_tp-flow-inspector': 'calc(var(--tp-spacing) * 96)',
        '--_tp-flow-palette': 'calc(var(--tp-spacing) * 72)',
        '--_tp-flow-block-size': 'calc(var(--tp-spacing) * 150)',
      },
    },
  ],
  'flow-pane': [
    { declarations: { cursor: 'default' } },
    { selector: '&[data-tool="pan"], &[data-pan-active]', declarations: { cursor: 'grab' } },
    { selector: '&[data-panning]', declarations: { cursor: 'grabbing' } },
    { selector: '&[data-selecting]', declarations: { cursor: 'crosshair' } },
    // A library item armed by a click: the next press places it.
    { selector: '&[data-placing]', declarations: { cursor: 'copy' } },
  ],
  'flow-viewport': [],
  // The opt-in header: a bar on the page background over the canvas, separated by a border.
  'flow-header': [
    {
      declarations: {
        background: 'var(--tp-background)',
        'border-block-end': 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
      },
    },
  ],
  'flow-background': [],
  'flow-background-pattern': [
    { declarations: { fill: dots, stroke: hairline } },
    { selector: '&[data-pattern="dots"]', declarations: { stroke: 'none' } },
    {
      selector: '&[data-pattern="lines"], &[data-pattern="cross"]',
      declarations: { fill: 'none' },
    },
  ],
  // Node host: the card shape composes Card (its own recipe); the host adds width, rings and cursors.
  'flow-node': [
    {
      declarations: {
        'inline-size': 'var(--_tp-flow-node-width)',
        'border-radius': 'var(--tp-radius-xl)',
        cursor: 'grab',
        transition: motionTransition(['box-shadow', 'outline-color'], 'fast'),
      },
    },
    { selector: '&[data-shape="compact"]', declarations: { 'inline-size': 'auto' } },
    {
      selector: '&[data-shape="panel"]',
      declarations: { 'inline-size': 'calc(var(--_tp-flow-node-width) * 1.2)' },
    },
    {
      selector: '&[data-shape="group"]',
      declarations: { 'inline-size': 'auto', cursor: 'default' },
    },
    { selector: '&:hover', declarations: { 'box-shadow': 'var(--tp-shadow-sm)' } },
    {
      selector: '&[data-dragging]',
      declarations: { cursor: 'grabbing', 'box-shadow': 'var(--tp-shadow-md)' },
    },
    {
      selector: '&[data-selected]',
      declarations: { 'box-shadow': '0 0 0 var(--tp-ring-width) var(--tp-ring)' },
    },
    // A node with problems but no run status: a dashed outline in the problem's tone.
    {
      selector: '&[data-problem="warning"]',
      declarations: { '--_tp-flow-problem': 'var(--tp-warning)' },
    },
    {
      selector: '&[data-problem="error"]',
      declarations: { '--_tp-flow-problem': 'var(--tp-destructive)' },
    },
    {
      selector: '&[data-problem]:not([data-status])',
      declarations: {
        outline:
          'var(--tp-ring-width) dashed color-mix(in oklab, var(--_tp-flow-problem) 70%, transparent)',
        'outline-offset': 'var(--tp-ring-offset)',
      },
    },
    { selector: '&[data-focus-visible]', declarations: focusRing },
    {
      selector: '&[data-status="running"], &[data-status="waiting"], &[data-status="failed"]',
      declarations: { 'box-shadow': `0 0 0 var(--tp-ring-width) ${statusRing}` },
    },
    {
      selector: '&[data-status="skipped"], &[data-status="cancelled"]',
      declarations: { opacity: 'var(--tp-opacity-disabled)' },
    },
    {
      selector: '&[data-connecting]',
      declarations: { 'box-shadow': `0 0 0 var(--tp-ring-width) ${haloStroke}` },
    },
    ...statusTones.map(([status, tone]) => ({
      selector: `&[data-status="${status}"]`,
      declarations: { '--_tp-flow-status': tone },
    })),
    ...tones.map(([tone, value]) => ({
      selector: `&[data-tone="${tone}"]`,
      declarations: { '--_tp-flow-tone': value },
    })),
  ],
  // Composed Card registered as the node card; kept on the Card recipe, tinted by tone for panels.
  'flow-node-card': [
    {
      selector: '&[data-shape="panel"]',
      declarations: {
        '--_tp-flow-node-header-fill':
          'color-mix(in oklab, var(--_tp-flow-tone, var(--tp-muted)) 25%, var(--tp-card))',
      },
    },
  ],
  'flow-node-shell': [
    {
      declarations: {
        'background-color': 'var(--tp-card)',
        color: 'var(--tp-card-foreground)',
        border: `var(--tp-border-width) var(--tp-border-style) ${hairline}`,
        'border-radius': 'var(--tp-radius-lg)',
        'box-shadow': 'var(--tp-shadow-sm)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
    {
      selector: '&[data-shape="panel"]',
      declarations: {
        'background-color':
          'color-mix(in oklab, var(--_tp-flow-tone, var(--tp-muted)) 25%, var(--tp-card))',
      },
    },
  ],
  'flow-node-header': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'flow-node-icon': [
    {
      declarations: {
        'inline-size': 'var(--tp-icon-size-lg)',
        'block-size': 'var(--tp-icon-size-lg)',
        'border-radius': 'var(--tp-radius-md)',
        'background-color':
          'color-mix(in oklab, var(--_tp-flow-tone, var(--tp-muted-foreground)) 15%, var(--tp-background))',
        color: 'var(--_tp-flow-tone, var(--tp-foreground))',
        border: `var(--tp-border-width) var(--tp-border-style) ${hairline}`,
      },
    },
    // Beside a title and a description the tile spans both lines: the header's line (the title,
    // `1lh` at the inherited leading) plus the description's (`--tp-text-xs` at the same leading).
    {
      selector: '&[data-lines="2"]',
      declarations: {
        'inline-size': 'calc(1lh + var(--tp-text-xs) * var(--tp-leading-tight))',
        'block-size': 'calc(1lh + var(--tp-text-xs) * var(--tp-leading-tight))',
      },
    },
  ],
  'flow-node-title': [
    {
      declarations: { 'font-weight': 'var(--tp-font-medium)', color: 'var(--tp-card-foreground)' },
    },
  ],
  'flow-node-description': [
    { declarations: { 'font-size': 'var(--tp-text-xs)', color: 'var(--tp-muted-foreground)' } },
  ],
  'flow-node-body': [],
  // The problem indicator's icon takes the problem's tone.
  'flow-node-problem': [
    { selector: '&[data-severity="warning"]', declarations: { color: 'var(--tp-warning)' } },
    { selector: '&[data-severity="error"]', declarations: { color: 'var(--tp-destructive)' } },
  ],
  'flow-node-row': [{ declarations: { 'font-size': 'var(--tp-text-xs)' } }],
  'flow-node-row-label': [{ declarations: { color: 'var(--tp-muted-foreground)' } }],
  'flow-node-row-control': [],
  'flow-node-footer': [
    { declarations: { 'font-size': 'var(--tp-text-xs)', color: 'var(--tp-muted-foreground)' } },
  ],
  'flow-node-status': [
    { declarations: { color: 'var(--_tp-flow-status, var(--tp-muted-foreground))' } },
  ],
  // Group container: a dashed, tinted frame holding its children.
  'flow-node-group': [
    {
      declarations: {
        border:
          'var(--tp-border-width) dashed color-mix(in oklab, var(--_tp-flow-tone, var(--tp-foreground)) 40%, transparent)',
        'border-radius': 'var(--tp-radius-xl)',
        'background-color':
          'color-mix(in oklab, var(--_tp-flow-tone, var(--tp-muted)) 8%, transparent)',
      },
    },
  ],
  'flow-node-toolbar': [
    {
      declarations: {
        'background-color': 'var(--tp-card)',
        border: popupBorder,
        'border-radius': 'var(--tp-radius-md)',
        'box-shadow': 'var(--tp-shadow-sm)',
        padding: 'var(--tp-space-1)',
      },
    },
  ],
  'flow-node-resizer': [],
  // Four zero-extent lines: each paints the dashed border of its own edge only.
  'flow-node-resizer-line': [
    {
      declarations: {
        border: 'var(--tp-border-width) dashed var(--tp-primary)',
        'pointer-events': 'none',
      },
    },
    {
      selector: '&[data-edge="top"]',
      declarations: { 'border-width': 'var(--tp-border-width) 0 0 0' },
    },
    {
      selector: '&[data-edge="bottom"]',
      declarations: { 'border-width': '0 0 var(--tp-border-width) 0' },
    },
    {
      selector: '&[data-edge="left"]',
      declarations: { 'border-width': '0 0 0 var(--tp-border-width)' },
    },
    {
      selector: '&[data-edge="right"]',
      declarations: { 'border-width': '0 var(--tp-border-width) 0 0' },
    },
  ],
  'flow-node-resizer-handle': [
    ...thumb('var(--_tp-flow-handle)'),
    { declarations: { '--_tp-handle-paint': 'var(--tp-primary)' } },
    { selector: '&:focus-visible', declarations: focusRing },
    {
      selector: '&[data-corner="top-left"], &[data-corner="bottom-right"]',
      declarations: { cursor: 'nwse-resize' },
    },
    {
      selector: '&[data-corner="top-right"], &[data-corner="bottom-left"]',
      declarations: { cursor: 'nesw-resize' },
    },
    { selector: '&:disabled', declarations: { cursor: 'default' } },
  ],
  // Ports: the shared widget handle ring; candidates grow and ring, validity recolors.
  'flow-port': [
    ...thumb('var(--_tp-flow-port-size)'),
    {
      declarations: {
        '--_tp-handle-paint': 'var(--_tp-flow-port-tone, var(--tp-muted-foreground))',
        cursor: 'crosshair',
        transition: motionTransition(
          ['box-shadow', 'outline-color', 'inline-size', 'block-size'],
          'fast',
        ),
      },
    },
    { selector: '&:focus-visible', declarations: focusRing },
    {
      selector: '&[data-candidate]',
      declarations: {
        'inline-size': 'calc(var(--_tp-flow-port-size) * 1.5)',
        'block-size': 'calc(var(--_tp-flow-port-size) * 1.5)',
        ...activeRing,
      },
    },
    // A problem on the port (an unconnected required input): its paint and ring take the tone.
    {
      selector: '&[data-issue="warning"]',
      declarations: { '--_tp-handle-paint': 'var(--tp-warning)', ...activeRing },
    },
    {
      selector: '&[data-issue="error"]',
      declarations: { '--_tp-handle-paint': 'var(--tp-destructive)', ...activeRing },
    },
    { selector: '&[data-valid]', declarations: { '--_tp-handle-paint': 'var(--tp-success)' } },
    {
      selector: '&[data-invalid]',
      declarations: { '--_tp-handle-paint': 'var(--tp-destructive)' },
    },
    { selector: '&[data-click-connecting]', declarations: activeRing },
    {
      selector: '&[aria-disabled="true"]',
      declarations: { cursor: 'default', opacity: 'var(--tp-opacity-disabled)' },
    },
    ...tones.map(([tone, value]) => ({
      selector: `&[data-tone="${tone}"]`,
      declarations: { '--_tp-flow-port-tone': value },
    })),
  ],
  'flow-port-dot': [],
  'flow-port-label': [
    { declarations: { 'font-size': 'var(--tp-text-xs)', color: 'var(--tp-muted-foreground)' } },
  ],
  // Edges: one SVG group per visible edge painted by the renderer.
  'flow-edge': [
    ...statusTones.map(([status, tone]) => ({
      selector: `&[data-status="${status}"]`,
      declarations: { '--_tp-flow-status': tone },
    })),
    {
      selector: '&[data-status="not-taken"], &[data-status="disabled"]',
      declarations: { opacity: 'var(--tp-opacity-disabled)' },
    },
    {
      selector: '&[data-issue="warning"]',
      declarations: { '--_tp-flow-issue': 'var(--tp-warning)' },
    },
    {
      selector: '&[data-issue="error"]',
      declarations: { '--_tp-flow-issue': 'var(--tp-destructive)' },
    },
  ],
  'flow-edge-path': [
    {
      declarations: {
        fill: 'none',
        stroke: 'var(--_tp-flow-edge-stroke, var(--_tp-flow-status, ' + edgeStroke + '))',
        'stroke-width': 'var(--_tp-flow-edge-width)',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'vector-effect': 'non-scaling-stroke',
        transition: motionTransition(['stroke', 'stroke-width'], 'fast'),
      },
    },
    // An edge with a problem: dashed in the problem's tone (hover and selection still win).
    {
      selector: '[part~="flow-edge"][data-issue] > &',
      declarations: {
        stroke: 'var(--_tp-flow-issue)',
        'stroke-dasharray':
          'calc(var(--_tp-flow-edge-width) * 3) calc(var(--_tp-flow-edge-width) * 2)',
      },
    },
    { selector: '[part~="flow-edge"][data-hover] > &', declarations: { stroke: edgeHover } },
    {
      selector:
        '[part~="flow-edge"][data-selected] > &, [part~="flow-edge"][data-focus-visible] > &',
      declarations: {
        stroke: 'var(--tp-primary)',
        'stroke-width': 'calc(var(--_tp-flow-edge-width) * 1.5)',
      },
    },
    {
      selector:
        '[part~="flow-edge"][data-animated] > &, [part~="flow-edge"][data-status="active"] > &',
      declarations: {
        'stroke-dasharray': 'var(--_tp-flow-dash)',
        animation: ambientAnimation('tp-flow-dash'),
        'animation-play-state': 'var(--tp-motion-play-state, running)',
      },
    },
    {
      selector: '[part~="flow-edge"][data-direction="backward"] > &',
      declarations: { 'animation-direction': 'reverse' },
    },
  ],
  'flow-edge-halo': [
    {
      declarations: {
        fill: 'none',
        stroke: haloStroke,
        'stroke-width': 'calc(var(--_tp-flow-edge-width) + var(--tp-ring-width) * 2)',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'vector-effect': 'non-scaling-stroke',
        opacity: '0',
        'pointer-events': 'none',
        transition: motionTransition(['opacity'], 'fast'),
      },
    },
    { selector: '[part~="flow-edge"][data-focus-visible] > &', declarations: { opacity: '1' } },
  ],
  'flow-edge-hit': [
    {
      declarations: {
        fill: 'none',
        stroke: 'transparent',
        'stroke-width': '20px',
        'vector-effect': 'non-scaling-stroke',
        'pointer-events': 'stroke',
        cursor: 'pointer',
      },
    },
  ],
  'flow-edge-marker': [{ declarations: { fill: 'context-stroke', stroke: 'none' } }],
  // Labels are Badges (outline) in a positioned host; the host only places them.
  'flow-edge-label': [
    { declarations: { 'pointer-events': 'auto' } },
    {
      selector: '&[data-selected] [part~="badge"]',
      declarations: { 'border-color': 'var(--tp-primary)' },
    },
  ],
  'flow-edge-focus': [],
  // The selected handle (the one Delete and the arrows act on, by pointer or keyboard) wears the
  // handle recipe's active ring, as a dragged thumb does.
  'flow-edge-waypoint': [
    ...thumb('var(--_tp-flow-handle)'),
    { declarations: { '--_tp-handle-paint': 'var(--tp-primary)', cursor: 'move' } },
    { selector: '&[data-selected]', declarations: activeRing },
  ],
  'flow-edge-segment-handle': [
    ...thumb('var(--_tp-flow-handle)'),
    { declarations: { '--_tp-handle-paint': 'var(--tp-primary)' } },
    { selector: '&[data-selected]', declarations: activeRing },
    { selector: '&:focus-visible', declarations: focusRing },
    { selector: '&[data-axis="x"]', declarations: { cursor: 'ew-resize' } },
    { selector: '&[data-axis="y"]', declarations: { cursor: 'ns-resize' } },
  ],
  // Edge updater: an invisible grab area on the edge beside the socket (`cursor: move`);
  // keyboard focus still shows the ring.
  'flow-edge-reconnect': [
    { declarations: { background: 'transparent', border: '0', cursor: 'move' } },
    { selector: '&:focus-visible', declarations: focusRing },
  ],
  'flow-connection-line': [
    {
      declarations: {
        fill: 'none',
        stroke: 'var(--tp-primary)',
        'stroke-width': 'var(--_tp-flow-edge-width)',
        'stroke-dasharray': 'var(--_tp-flow-dash)',
        'vector-effect': 'non-scaling-stroke',
        'pointer-events': 'none',
      },
    },
    { selector: '&[data-valid]', declarations: { stroke: 'var(--tp-success)' } },
    { selector: '&[data-invalid]', declarations: { stroke: 'var(--tp-destructive)' } },
  ],
  'flow-selection': [
    {
      declarations: {
        'background-color': selectionFill,
        border: `var(--tp-border-width) dotted ${selectionLine}`,
        'pointer-events': 'none',
      },
    },
  ],
  'flow-selection-bounds': [
    {
      declarations: {
        border: `var(--tp-border-width) dotted ${selectionLine}`,
        'border-radius': 'var(--tp-radius-sm)',
        cursor: 'grab',
      },
    },
  ],
  'flow-minimap': [
    {
      declarations: {
        '--_tp-flow-minimap-node': minimapNode,
        '--_tp-flow-minimap-mask': minimapMask,
        '--_tp-flow-minimap-viewport': 'var(--tp-primary)',
        'inline-size': 'var(--_tp-flow-minimap)',
        'block-size': 'calc(var(--_tp-flow-minimap) * 0.75)',
        'background-color': 'var(--tp-card)',
        border: popupBorder,
        'border-radius': 'var(--tp-radius-md)',
        'box-shadow': 'var(--tp-shadow-sm)',
        overflow: 'clip',
      },
    },
    { selector: '&[data-pannable]', declarations: { cursor: 'grab' } },
    { selector: '&[data-panning]', declarations: { cursor: 'grabbing' } },
  ],
  // Canvas paint, not elements: the minimap reads `--_tp-flow-minimap-node`, `-mask` and
  // `-viewport` from its part and the tone tokens; the two names stay reserved for the renderer.
  'flow-minimap-node': [],
  'flow-minimap-viewport': [],
  // A toolbar of sets, as Toolbar and nested Button groups compose them: the outline members carry
  // their own surface, so the bar adds none.
  // Bars float over the canvas: every set (and every consumer item) sits on the page surface,
  // as Map control groups do, so the controls' translucent fills never show the grid through.
  'flow-controls': [
    {
      selector: '& > :not(slot), & > slot::slotted(*)',
      declarations: {
        'background-color': 'var(--tp-background)',
        'border-radius': 'var(--tp-radius-md)',
        'box-shadow': 'var(--tp-shadow-sm)',
      },
    },
  ],
  'flow-control': [],
  'flow-run-summary': [],
  // The sidebar library floats at the inline start on the inspector's surface and enters and
  // leaves like it from its own side; the menu library lives in the root's Dialog.
  'flow-palette': [
    ...surfaceAppearance.map((entry) => ({ ...entry, selector: sidebar })),
    {
      selector: sidebar,
      declarations: {
        padding: '0',
        overflow: 'clip',
        '--_tp-flow-palette-offset': 'calc(var(--tp-space-10) * -1)',
        opacity: '1',
        translate: '0 0',
      },
    },
    ...presenceMotion(['opacity', 'translate'], 'normal', `${sidebar}[data-ending-style]`).map(
      (entry) => ({ ...entry, selector: entry.selector ?? sidebar }),
    ),
    {
      selector: `${sidebar}:dir(rtl)`,
      declarations: { '--_tp-flow-palette-offset': 'var(--tp-space-10)' },
    },
    {
      selector: '&:is([data-starting-style], [data-ending-style])',
      declarations: { opacity: '0', translate: 'var(--_tp-flow-palette-offset) 0' },
    },
  ],
  'flow-palette-header': [
    {
      declarations: {
        'border-block-end': 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
      },
    },
    { selector: '& .title', declarations: { 'font-weight': 'var(--tp-font-medium)' } },
  ],
  'flow-palette-body': [],
  'flow-palette-search': [],
  'flow-palette-sections': [],
  // A category's label takes its tone, else the muted label color of the theme.
  'flow-palette-group': toneRules,
  'flow-palette-group-label': [
    ...toneRules,
    {
      declarations: {
        margin: '0',
        color: 'var(--_tp-flow-tone, var(--tp-muted-foreground))',
        'font-size': 'var(--tp-text-xs)',
        'font-weight': 'var(--tp-font-medium)',
        'line-height': 'var(--tp-leading-tight)',
      },
    },
  ],
  'flow-palette-items': [],
  // Outline Button chips, native drag sources for the canvas.
  'flow-palette-item': [
    { declarations: { cursor: 'grab' } },
    { selector: '&:active', declarations: { cursor: 'grabbing' } },
  ],
  // A panel floating over the canvas: the shared floating surface, sections
  // padded by the inspector, entering and leaving 2.5rem from the inline end with a fade.
  'flow-inspector': [
    ...surfaceAppearance,
    {
      declarations: {
        padding: '0',
        overflow: 'clip',
        '--_tp-flow-inspector-offset': 'var(--tp-space-10)',
        opacity: '1',
        translate: '0 0',
      },
    },
    ...presenceMotion(['opacity', 'translate']),
    {
      selector: '&:dir(rtl)',
      declarations: { '--_tp-flow-inspector-offset': 'calc(var(--tp-space-10) * -1)' },
    },
    {
      selector: '&:is([data-starting-style], [data-ending-style])',
      declarations: { opacity: '0', translate: 'var(--_tp-flow-inspector-offset) 0' },
    },
  ],
  'flow-inspector-header': [
    {
      declarations: {
        'border-block-end': 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
      },
    },
    { selector: '& .title', declarations: { 'font-weight': 'var(--tp-font-medium)' } },
    {
      selector: '& .subtitle',
      declarations: { 'font-size': 'var(--tp-text-xs)', color: 'var(--tp-muted-foreground)' },
    },
  ],
  'flow-inspector-tabs': [],
  'flow-inspector-body': [],
  'flow-inspector-footer': sectionFooterAppearance,
  // Panels move clear of the inspector with its motion.
  'flow-panel-top-start': panelMotion,
  'flow-panel-top-center': panelMotion,
  'flow-panel-top-end': panelMotion,
  'flow-panel-center-start': panelMotion,
  'flow-panel-center-end': panelMotion,
  'flow-panel-bottom-start': panelMotion,
  'flow-panel-bottom-center': panelMotion,
  'flow-panel-bottom-end': panelMotion,
  'flow-instructions': [],
};

/** Layout the dictionary cannot replace: spacing roles and the pattern geometry hooks. */
export const flowStructure: PresentationDictionary = {
  flow: [{ declarations: { 'min-block-size': 'var(--_tp-flow-block-size)' } }],
  'flow-node-header': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'flow-node-row': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'flow-node-footer': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'flow-node-toolbar': [{ declarations: { gap: 'var(--tp-space-1)' } }],
  // The theme gap between sets, as nested Button groups and toolbars use.
  'flow-controls': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'flow-inspector-header': [
    { declarations: { gap: 'var(--tp-space-2)', padding: 'var(--_tp-flow-space)' } },
  ],
  'flow-palette-header': [
    { declarations: { gap: 'var(--tp-space-2)', padding: 'var(--_tp-flow-space)' } },
  ],
  'flow-palette-body': [
    {
      declarations: {
        display: 'flex',
        'flex-direction': 'column',
        gap: 'var(--tp-space-3)',
        padding: 'var(--_tp-flow-space)',
      },
    },
    // In the menu the Dialog's sections pad the content. The body still scrolls, which clips
    // what paints outside it, so it keeps room for the focus rings of the search and the chips
    // at its edges and gives the room back in its margin.
    {
      selector: '[data-layout="menu"] > &',
      declarations: {
        padding: 'var(--tp-ring-width)',
        margin: 'calc(var(--tp-ring-width) * -1)',
      },
    },
  ],
  'flow-palette-group': [
    {
      declarations: {
        display: 'flex',
        'flex-direction': 'column',
        gap: 'var(--tp-space-2)',
        'min-inline-size': '0',
      },
    },
  ],
  'flow-palette-items': [{ declarations: { gap: 'var(--tp-space-1)' } }],
  // The tab list starts where the header title and the fields start.
  'flow-inspector-tabs': [{ declarations: { 'padding-inline': 'var(--_tp-flow-space)' } }],
  'flow-inspector-body': [
    { declarations: { padding: 'var(--_tp-flow-space)', gap: 'var(--tp-space-3)' } },
  ],
  'flow-inspector-footer': [
    { declarations: { gap: 'var(--tp-space-2)', padding: 'var(--_tp-flow-space)' } },
  ],
  // Start, center and end regions in a wrapping row: the sides share the free space equally, so
  // the center stays centered while everything fits, and the regions wrap when it does not.
  'flow-header': [
    {
      declarations: {
        display: 'flex',
        'flex-wrap': 'wrap',
        'align-items': 'center',
        gap: 'var(--tp-space-2)',
        padding: 'var(--_tp-flow-space)',
      },
    },
  ],
  'flow-panel-top-start': [{ declarations: { margin: 'var(--_tp-flow-space)' } }],
  'flow-panel-top-center': [{ declarations: { margin: 'var(--_tp-flow-space)' } }],
  'flow-panel-top-end': [{ declarations: { margin: 'var(--_tp-flow-space)' } }],
  'flow-panel-center-start': [{ declarations: { margin: 'var(--_tp-flow-space)' } }],
  'flow-panel-center-end': [{ declarations: { margin: 'var(--_tp-flow-space)' } }],
  'flow-panel-bottom-start': [{ declarations: { margin: 'var(--_tp-flow-space)' } }],
  'flow-panel-bottom-center': [{ declarations: { margin: 'var(--_tp-flow-space)' } }],
  'flow-panel-bottom-end': [{ declarations: { margin: 'var(--_tp-flow-space)' } }],
};

export { motionTransition };
