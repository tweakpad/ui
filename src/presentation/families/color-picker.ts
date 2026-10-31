import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { colorPickerAppearance, colorPickerStructure } from '../recipes/color-picker.js';

/** UI Widgets Specification 6.1 Color picker: one family, axes size, picker and shape. */
const definition: ComponentDefinition = {
  name: 'Color picker',
  tagName: 'tp-color-picker',
  kind: 'flattening-compound',
  axes: [
    { name: 'size', values: ['sm', 'default', 'lg'], default: 'default' },
    { name: 'picker', values: ['inline', 'popup'], default: 'inline' },
    { name: 'shape', values: ['square', 'round'], default: 'square' },
  ],
  parts: [
    {
      name: 'color-picker',
      axes: ['size', 'picker'],
      description:
        'The root group named by the label, holding the tabs, the active view and the fields.',
    },
    {
      name: 'color-picker-label',
      axes: ['size'],
      description: 'The visible label above the panel.',
    },
    {
      name: 'color-picker-tabs',
      axes: ['size'],
      description: 'The Tabs that switch between views when more than one is offered.',
    },
    {
      name: 'color-picker-tab',
      axes: ['size'],
      description: 'One view tab.',
    },
    {
      name: 'color-picker-area',
      axes: ['size'],
      description: 'The saturation and brightness plane.',
    },
    {
      name: 'color-picker-area-thumb',
      axes: ['size'],
      description: "The plane's draggable thumb.",
    },
    {
      name: 'color-picker-controls',
      axes: ['size'],
      description: 'The row under a surface: the eyedropper beside the hue and alpha Sliders.',
    },
    {
      name: 'color-picker-toolbar',
      axes: ['size'],
      description:
        'The row of choices above the wheel or the schemes: the Harmony or template Select and the generate Button.',
    },
    {
      name: 'color-picker-eyedropper',
      axes: ['size'],
      description: 'The Button that picks a color from the screen.',
    },
    {
      name: 'color-picker-generate',
      axes: ['size'],
      description: 'The Button that regenerates the scheme strips from the current color.',
    },
    {
      name: 'color-picker-template',
      axes: ['size'],
      description: 'The Select of palette templates in the schemes view.',
    },
    {
      name: 'color-picker-harmony',
      axes: ['size'],
      description: 'The Select of harmony rules in the wheel view.',
    },
    {
      name: 'color-picker-palette',
      axes: ['size'],
      description: 'The ring around the wheel with one copyable segment per harmony color.',
    },
    {
      name: 'color-picker-palette-swatch',
      axes: ['size'],
      description: 'The color fill of one palette segment.',
    },
    {
      name: 'color-picker-palette-item',
      axes: ['size'],
      description: "One palette segment's Copy button.",
    },
    {
      name: 'color-picker-slider',
      axes: ['size'],
      description: 'A channel Slider: hue, alpha, brightness or a channel of the format.',
    },
    {
      name: 'color-picker-slider-track',
      axes: ['size'],
      description: "A channel Slider's track, painted with the channel's range.",
    },
    {
      name: 'color-picker-alpha-track',
      axes: ['size'],
      description: "The alpha Slider's track over the checkerboard.",
    },
    {
      name: 'color-picker-slider-range',
      axes: ['size'],
      description: "A channel Slider's filled range.",
    },
    {
      name: 'color-picker-slider-thumb',
      axes: ['size'],
      description: "A channel Slider's thumb.",
    },
    {
      name: 'color-picker-channel',
      axes: ['size'],
      description: 'One row of the sliders view: a labeled Slider and its numeric value box.',
    },
    {
      name: 'color-picker-preview',
      axes: ['size', 'shape'],
      description: 'The swatch of the current color.',
    },
    {
      name: 'color-picker-fields',
      axes: ['size'],
      description: 'The row of numeric fields and the format Select.',
    },
    {
      name: 'color-picker-field-group',
      axes: ['size'],
      description: "The joined group of the format's channel fields.",
    },
    {
      name: 'color-picker-field',
      axes: ['size'],
      description: 'One channel field, or the hex field.',
    },
    {
      name: 'color-picker-format',
      axes: ['size'],
      description: 'The Select of the active format.',
    },
    {
      name: 'color-picker-swatches',
      axes: ['size'],
      description: 'A grid of saved or recent colors.',
    },
    {
      name: 'color-picker-swatch-grid',
      axes: ['size'],
      description: 'The Toggle group that lays out a swatch grid.',
    },
    {
      name: 'color-picker-swatch-item',
      axes: ['size', 'shape'],
      description: 'One pressable swatch in a grid.',
    },
    {
      name: 'color-picker-swatch',
      axes: ['size', 'shape'],
      description: 'The color fill inside a swatch or a comparison half.',
    },
    {
      name: 'color-picker-schemes',
      axes: ['size'],
      description: 'The schemes view: its toolbar and the scheme strips.',
    },
    {
      name: 'color-picker-scheme',
      axes: ['size'],
      description: 'One strip of related colors.',
    },
    {
      name: 'color-picker-scheme-item',
      axes: ['size'],
      description: 'One pressable color in a scheme strip.',
    },
    {
      name: 'color-picker-wheel',
      axes: ['size'],
      description: 'The hue and saturation disc.',
    },
    {
      name: 'color-picker-wheel-handle',
      axes: ['size'],
      description: 'A handle on the wheel: the base color or a harmony color.',
    },
    {
      name: 'color-picker-wheel-line',
      axes: ['size'],
      description: 'The line connecting the harmony handles.',
    },
    {
      name: 'color-picker-ring',
      axes: ['size'],
      description: 'The hue ring around the triangle.',
    },
    {
      name: 'color-picker-ring-thumb',
      axes: ['size'],
      description: "The hue ring's thumb.",
    },
    {
      name: 'color-picker-triangle',
      axes: ['size'],
      description: 'The saturation and brightness triangle inside the hue ring.',
    },
    {
      name: 'color-picker-triangle-thumb',
      axes: ['size'],
      description: "The triangle's thumb.",
    },
    {
      name: 'color-picker-trigger',
      axes: ['size'],
      slot: 'trigger',
      description: 'The swatch Color input that opens the popup picker.',
    },
    {
      name: 'color-picker-popup',
      axes: ['size'],
      description: 'The Popover holding the popup panel.',
    },
    {
      name: 'color-picker-header',
      axes: ['size'],
      description:
        "The popup's top row: the format Select, the comparison, the Copy button and the eyedropper.",
    },
    {
      name: 'color-picker-compare',
      axes: ['size'],
      description:
        'The original and current colors side by side; pressing the original restores it.',
    },
    {
      name: 'color-picker-compare-original',
      axes: ['size'],
      description: "The comparison's original color Button.",
    },
    {
      name: 'color-picker-compare-current',
      axes: ['size'],
      description: "The comparison's current color segment.",
    },
    {
      name: 'color-picker-copy',
      axes: ['size'],
      description: 'The Copy button for the serialized value.',
    },
    {
      name: 'color-picker-recent',
      axes: ['size'],
      description: 'The strip of recent colors at the bottom of the popup.',
    },
    {
      name: 'color-picker-footer',
      axes: ['size'],
      slot: 'footer',
      description: 'The wrapper of the footer slot below the panel.',
    },
  ],
};

export const colorPickerPresentation = definePresentation({
  definition,
  bindings: {
    'tp-color-picker': {
      '[part~="color-picker"]': 'color-picker',
      '[part~="color-picker-label"]': 'color-picker-label',
      'tp-tabs.views': 'color-picker-tabs',
      'button[slot="tab"]': 'color-picker-tab',
      '[part~="color-picker-controls"]': 'color-picker-controls',
      '[part~="color-picker-toolbar"]': 'color-picker-toolbar',
      'tp-button.eyedropper': 'color-picker-eyedropper',
      'tp-button.generate': 'color-picker-generate',
      'tp-select.template': 'color-picker-template',
      'tp-select.harmony': 'color-picker-harmony',
      '[part~="color-picker-palette"]': 'color-picker-palette',
      'tp-slider.channel': 'color-picker-slider',
      '[part~="color-picker-channel"]': 'color-picker-channel',
      '[part~="color-picker-preview"]': 'color-picker-preview',
      '[part~="color-picker-fields"]': 'color-picker-fields',
      'tp-field-group.channels': 'color-picker-field-group',
      '[part~="color-picker-field"]': 'color-picker-field',
      'tp-select.format': 'color-picker-format',
      'tp-toggle-group.swatches': 'color-picker-swatches',
      '.swatch': 'color-picker-swatch',
      '[part~="color-picker-schemes"]': 'color-picker-schemes',
      '[part~="color-picker-trigger"]': 'color-picker-trigger',
      '[part~="color-picker-popup"]': 'color-picker-popup',
      '[part~="color-picker-header"]': 'color-picker-header',
      'tp-button-group.compare': 'color-picker-compare',
      'tp-copy-button.copy': 'color-picker-copy',
      '[part~="color-picker-recent"]': 'color-picker-recent',
      '[part~="color-picker-footer"]': 'color-picker-footer',
    },
    'tp-color-picker-area': {
      '[part~="color-picker-area"]': 'color-picker-area',
      '[part~="color-picker-area-thumb"]': 'color-picker-area-thumb',
    },
    'tp-color-picker-wheel': {
      '[part~="color-picker-wheel"]': 'color-picker-wheel',
      '[part~="color-picker-wheel-handle"]': 'color-picker-wheel-handle',
      '[part~="color-picker-wheel-line"]': 'color-picker-wheel-line',
    },
    'tp-color-picker-triangle': {
      '[part~="color-picker-ring"]': 'color-picker-ring',
      '[part~="color-picker-ring-thumb"]': 'color-picker-ring-thumb',
      '[part~="color-picker-triangle"]': 'color-picker-triangle',
      '[part~="color-picker-triangle-thumb"]': 'color-picker-triangle-thumb',
    },
  },
  structure: colorPickerStructure,
  sources: [colorPickerAppearance],
});
