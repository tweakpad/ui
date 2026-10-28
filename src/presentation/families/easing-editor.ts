import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { easingEditorAppearance, easingEditorStructure } from '../recipes/easing-editor.js';

/** UI Widgets Specification 6.2 Easing editor: one family, axes size and layout. */
const definition: ComponentDefinition = {
  name: 'Easing editor',
  tagName: 'tp-easing-editor',
  kind: 'flattening-compound',
  axes: [
    { name: 'size', values: ['sm', 'default', 'lg'], default: 'default' },
    { name: 'layout', values: ['extended', 'compact'], default: 'extended' },
  ],
  parts: [
    {
      name: 'easing-editor',
      axes: ['size', 'layout'],
      description:
        'The root group named by the label, holding the header, the graph, the controls and the export row.',
    },
    {
      name: 'easing-editor-label',
      axes: ['size'],
      description: 'The visible label above the editor.',
    },
    {
      name: 'easing-editor-header',
      axes: ['size'],
      description:
        'The top row: the category Tabs, the play and preview mode Buttons and, in the compact layout, the presets Toggle.',
    },
    {
      name: 'easing-editor-tabs',
      axes: ['size'],
      description: 'The Tabs that switch between easing and spring curves.',
    },
    { name: 'easing-editor-tab', axes: ['size'], description: 'One category tab.' },
    {
      name: 'easing-editor-badge',
      axes: ['size'],
      description: 'The Badge over the graph that names the matching preset or reads Custom.',
    },
    {
      name: 'easing-editor-play',
      axes: ['size'],
      description: 'The Button that replays the preview.',
    },
    {
      name: 'easing-editor-preview-mode',
      axes: ['size'],
      description: 'The Button that cycles through the preview modes.',
    },
    {
      name: 'easing-editor-presets-toggle',
      axes: ['size'],
      description: 'The Toggle that shows the presets over the graph in the compact layout.',
    },
    {
      name: 'easing-editor-presets',
      axes: ['size', 'layout'],
      description:
        'The preset picker: a column beside the graph, or an overlay in the compact layout.',
    },
    {
      name: 'easing-editor-preset-group',
      axes: ['size'],
      description: 'One named group of presets.',
    },
    {
      name: 'easing-editor-preset-grid',
      axes: ['size'],
      description: 'The Toggle group that lays out the tiles of a group.',
    },
    { name: 'easing-editor-preset-item', axes: ['size'], description: 'One preset tile.' },
    {
      name: 'easing-editor-preset-thumb',
      axes: ['size'],
      description: 'The thumbnail of a preset curve.',
    },
    {
      name: 'easing-editor-graph',
      axes: ['size'],
      description: 'The plot of the curve with its handles or points.',
    },
    {
      name: 'easing-editor-graph-grid',
      axes: ['size'],
      description: 'The dotted grid marking the unit box.',
    },
    { name: 'easing-editor-graph-curve', axes: ['size'], description: 'The plotted curve.' },
    { name: 'easing-editor-graph-handle', axes: ['size'], description: 'A Bézier control handle.' },
    {
      name: 'easing-editor-graph-handle-line',
      axes: ['size'],
      description: 'The line from a Bézier handle to its end of the curve.',
    },
    {
      name: 'easing-editor-graph-point',
      axes: ['size'],
      description: 'A point of a custom curve.',
    },
    {
      name: 'easing-editor-graph-preview',
      axes: ['size'],
      description: 'The shape behind the graph that replays the motion.',
    },
    {
      name: 'easing-editor-controls',
      axes: ['size'],
      description: "The rows under the graph that edit the curve's parameters or points.",
    },
    {
      name: 'easing-editor-parameter',
      axes: ['size'],
      description: 'One parameter row: a Label, a Slider and a value field.',
    },
    { name: 'easing-editor-slider', axes: ['size'], description: 'A parameter Slider.' },
    {
      name: 'easing-editor-slider-track',
      axes: ['size'],
      description: "A parameter Slider's track.",
    },
    {
      name: 'easing-editor-slider-range',
      axes: ['size'],
      description: "A parameter Slider's filled range.",
    },
    {
      name: 'easing-editor-slider-thumb',
      axes: ['size'],
      description: "A parameter Slider's thumb.",
    },
    {
      name: 'easing-editor-field',
      axes: ['size'],
      description: 'A numeric value field beside a Slider.',
    },
    {
      name: 'easing-editor-add-point',
      axes: ['size'],
      description: 'The Button that adds a point to a custom curve.',
    },
    {
      name: 'easing-editor-remove-point',
      axes: ['size'],
      description: 'The Button that removes the focused point of a custom curve.',
    },
    {
      name: 'easing-editor-duration',
      axes: ['size'],
      description: 'The duration row: a Slider and a field in seconds.',
    },
    {
      name: 'easing-editor-frames',
      axes: ['size'],
      description: 'The bar under the graph whose ticks mark where the frames fall.',
    },
    { name: 'easing-editor-frames-tick', axes: ['size'], description: 'One frame tick.' },
    {
      name: 'easing-editor-adapter',
      axes: ['size'],
      description: 'The Select of export adapters.',
    },
    {
      name: 'easing-editor-output-group',
      axes: ['size'],
      description: 'The export row: the adapter name, the editable expression and the Copy button.',
    },
    {
      name: 'easing-editor-output',
      axes: ['size'],
      description: "The editable expression of the curve in the active adapter's notation.",
    },
    {
      name: 'easing-editor-output-token',
      axes: ['size'],
      description: 'A highlighted number in the expression.',
    },
    {
      name: 'easing-editor-copy',
      axes: ['size'],
      description: 'The Copy button for the exported text.',
    },
    {
      name: 'easing-editor-footer',
      axes: ['size'],
      slot: 'footer',
      description: 'The wrapper of the footer slot at the bottom of the editor.',
    },
  ],
};

export const easingEditorPresentation = definePresentation({
  definition,
  bindings: {
    'tp-easing-editor': {
      '[part~="easing-editor"]': 'easing-editor',
      '[part~="easing-editor-label"]': 'easing-editor-label',
      '[part~="easing-editor-header"]': 'easing-editor-header',
      'tp-tabs.kinds': 'easing-editor-tabs',
      'button[slot="tab"]': 'easing-editor-tab',
      'tp-badge.badge': 'easing-editor-badge',
      'tp-button.play': 'easing-editor-play',
      'tp-button.preview-mode': 'easing-editor-preview-mode',
      'tp-toggle.presets-toggle': 'easing-editor-presets-toggle',
      '[part~="easing-editor-presets"]': 'easing-editor-presets',
      '[part~="easing-editor-preset-group"]': 'easing-editor-preset-group',
      '.thumb': 'easing-editor-preset-thumb',
      '[part~="easing-editor-controls"]': 'easing-editor-controls',
      '[part~="easing-editor-parameter"]': 'easing-editor-parameter',
      'tp-slider.parameter-slider': 'easing-editor-slider',
      '[part~="easing-editor-field"]': 'easing-editor-field',
      'tp-button.add-point': 'easing-editor-add-point',
      'tp-button.remove-point': 'easing-editor-remove-point',
      '[part~="easing-editor-duration"]': 'easing-editor-duration',
      'tp-select.adapter': 'easing-editor-adapter',
      'tp-input-group.output-group': 'easing-editor-output-group',
      'tp-copy-button.copy': 'easing-editor-copy',
      '[part~="easing-editor-footer"]': 'easing-editor-footer',
    },
    'tp-easing-editor-graph': {
      '[part~="easing-editor-graph"]': 'easing-editor-graph',
      '[part~="easing-editor-graph-grid"]': 'easing-editor-graph-grid',
      '[part~="easing-editor-graph-curve"]': 'easing-editor-graph-curve',
      '[part~="easing-editor-graph-handle"]': 'easing-editor-graph-handle',
      '[part~="easing-editor-graph-handle-line"]': 'easing-editor-graph-handle-line',
      '[part~="easing-editor-graph-point"]': 'easing-editor-graph-point',
      '[part~="easing-editor-graph-preview"]': 'easing-editor-graph-preview',
    },
    'tp-easing-editor-frames': {
      '[part~="easing-editor-frames"]': 'easing-editor-frames',
      '[part~="easing-editor-frames-tick"]': 'easing-editor-frames-tick',
    },
    'tp-easing-editor-expression': {
      '[part~="easing-editor-output"]': 'easing-editor-output',
      '[part~="easing-editor-output-token"]': 'easing-editor-output-token',
    },
  },
  structure: easingEditorStructure,
  sources: [easingEditorAppearance],
});
