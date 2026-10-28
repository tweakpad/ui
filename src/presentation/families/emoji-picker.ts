import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { emojiPickerAppearance, emojiPickerStructure } from '../recipes/emoji-picker.js';

/** UI Widgets Specification 6.4 Emoji picker: one family, axes size and picker. */
const definition: ComponentDefinition = {
  name: 'Emoji picker',
  tagName: 'tp-emoji-picker',
  kind: 'flattening-compound',
  axes: [
    { name: 'size', values: ['sm', 'default', 'lg'], default: 'default' },
    { name: 'picker', values: ['inline', 'popup'], default: 'inline' },
  ],
  parts: [
    {
      name: 'emoji-picker',
      axes: ['size', 'picker'],
      description: 'The root: the category bar, the search field, the list and the footer.',
    },
    {
      name: 'emoji-picker-categories',
      axes: ['size'],
      description: 'The Tabs of the category bar.',
    },
    {
      name: 'emoji-picker-category',
      axes: ['size'],
      description: 'One category tab with its icon.',
    },
    { name: 'emoji-picker-search', axes: ['size'], description: "The search field's frame." },
    { name: 'emoji-picker-input', axes: ['size'], description: 'The search text input.' },
    {
      name: 'emoji-picker-clear',
      axes: ['size'],
      description: 'The Button that clears the search.',
    },
    { name: 'emoji-picker-list', axes: ['size'], description: 'The scrolling grid of emoji.' },
    { name: 'emoji-picker-group', axes: ['size'], description: 'One category in the grid.' },
    {
      name: 'emoji-picker-group-label',
      axes: ['size'],
      description: "A category's label in the grid.",
    },
    { name: 'emoji-picker-row', axes: ['size'], description: 'One row of emoji.' },
    { name: 'emoji-picker-item', axes: ['size'], description: 'One emoji cell.' },
    { name: 'emoji-picker-image', axes: ['size'], description: 'The image of a custom emoji.' },
    {
      name: 'emoji-picker-empty',
      axes: ['size'],
      description: 'The message shown when a search matches nothing.',
    },
    { name: 'emoji-picker-status', axes: ['size'], description: 'The loading and error message.' },
    {
      name: 'emoji-picker-retry',
      axes: ['size'],
      description: 'The Button that loads the dataset again after an error.',
    },
    {
      name: 'emoji-picker-footer',
      axes: ['size'],
      slot: 'footer',
      description: 'The footer row: the preview, the skin tone Button and the footer slot.',
    },
    {
      name: 'emoji-picker-preview',
      axes: ['size'],
      description: 'The preview of the highlighted emoji.',
    },
    {
      name: 'emoji-picker-preview-emoji',
      axes: ['size'],
      description: 'The previewed emoji glyph.',
    },
    {
      name: 'emoji-picker-preview-label',
      axes: ['size'],
      description: "The previewed emoji's name.",
    },
    {
      name: 'emoji-picker-skin-tone',
      axes: ['size'],
      description: 'The Button that opens the skin tone menu.',
    },
    {
      name: 'emoji-picker-trigger',
      axes: ['size'],
      slot: 'trigger',
      description: 'The Button that opens the popup picker and shows the chosen emoji.',
    },
    {
      name: 'emoji-picker-popup',
      axes: ['size'],
      description: 'The Popover holding the popup picker.',
    },
  ],
};

export const emojiPickerPresentation = definePresentation({
  definition,
  bindings: {
    'tp-emoji-picker': {
      '[part~="emoji-picker"]': 'emoji-picker',
      'tp-tabs.categories': 'emoji-picker-categories',
      'button.category': 'emoji-picker-category',
      'tp-button.retry': 'emoji-picker-retry',
      '[part~="emoji-picker-footer"]': 'emoji-picker-footer',
      '[part~="emoji-picker-preview"]': 'emoji-picker-preview',
      '[part~="emoji-picker-preview-emoji"]': 'emoji-picker-preview-emoji',
      '[part~="emoji-picker-preview-label"]': 'emoji-picker-preview-label',
      'tp-button.skin-tone': 'emoji-picker-skin-tone',
      'tp-button.trigger': 'emoji-picker-trigger',
      '[part~="emoji-picker-popup"]': 'emoji-picker-popup',
    },
    'tp-emoji-picker-list': {
      'img.image': 'emoji-picker-image',
    },
  },
  structure: emojiPickerStructure,
  sources: [emojiPickerAppearance],
});
