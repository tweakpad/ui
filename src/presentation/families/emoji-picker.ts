import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { emojiPickerAppearance, emojiPickerStructure } from '../recipes/emoji-picker.js';

const sized = (name: string, slot?: string) => ({
  name,
  axes: ['size'],
  ...(slot ? { slot } : {}),
});

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
    { name: 'emoji-picker', axes: ['size', 'picker'] },
    sized('emoji-picker-categories'),
    sized('emoji-picker-category'),
    sized('emoji-picker-search'),
    sized('emoji-picker-input'),
    sized('emoji-picker-clear'),
    sized('emoji-picker-list'),
    sized('emoji-picker-group'),
    sized('emoji-picker-group-label'),
    sized('emoji-picker-row'),
    sized('emoji-picker-item'),
    sized('emoji-picker-image'),
    sized('emoji-picker-empty'),
    sized('emoji-picker-status'),
    sized('emoji-picker-retry'),
    sized('emoji-picker-footer', 'footer'),
    sized('emoji-picker-preview'),
    sized('emoji-picker-preview-emoji'),
    sized('emoji-picker-preview-label'),
    sized('emoji-picker-skin-tone'),
    sized('emoji-picker-trigger', 'trigger'),
    sized('emoji-picker-popup'),
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
