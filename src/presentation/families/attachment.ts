import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { attachmentCoreAppearance } from '../recipes/core/surfaces.js';
import { attachmentAppearance } from '../recipes/attachment.js';

const definition: ComponentDefinition = {
  name: 'Attachment',
  tagName: 'tp-attachment',
  kind: 'preset-composition',
  sourceNode: 'ucl22-attachment',
  axes: [
    {
      name: 'size',
      values: ['xs', 'sm', 'default'],
      default: 'default',
    },
    {
      name: 'orientation',
      values: ['horizontal', 'vertical'],
      default: 'horizontal',
    },
  ],
  parts: [
    {
      name: 'attachment',
      publicName: 'Group',
      presentationKeys: [
        'attachment',
        'attachment-size-xs',
        'attachment-size-sm',
        'attachment-size-default',
        'attachment-orientation-horizontal',
        'attachment-orientation-vertical',
      ],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'attachment-root',
      publicName: 'Root',
      presentationKeys: [
        'attachment-root',
        'attachment-root-size-xs',
        'attachment-root-size-sm',
        'attachment-root-size-default',
        'attachment-root-orientation-horizontal',
        'attachment-root-orientation-vertical',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
    },
    {
      name: 'attachment-media',
      publicName: 'Media',
      presentationKeys: [
        'attachment-media',
        'attachment-media-size-xs',
        'attachment-media-size-sm',
        'attachment-media-size-default',
        'attachment-media-orientation-horizontal',
        'attachment-media-orientation-vertical',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
    },
    {
      name: 'attachment-content',
      publicName: 'Content',
      presentationKeys: [
        'attachment-content',
        'attachment-content-size-xs',
        'attachment-content-size-sm',
        'attachment-content-size-default',
        'attachment-content-orientation-horizontal',
        'attachment-content-orientation-vertical',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
    },
    {
      name: 'attachment-title',
      publicName: 'Title',
      presentationKeys: [
        'attachment-title',
        'attachment-title-size-xs',
        'attachment-title-size-sm',
        'attachment-title-size-default',
        'attachment-title-orientation-horizontal',
        'attachment-title-orientation-vertical',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
    },
    {
      name: 'attachment-description',
      publicName: 'Description',
      presentationKeys: [
        'attachment-description',
        'attachment-description-size-xs',
        'attachment-description-size-sm',
        'attachment-description-size-default',
        'attachment-description-orientation-horizontal',
        'attachment-description-orientation-vertical',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
    },
    {
      name: 'attachment-actions',
      publicName: 'Actions',
      presentationKeys: [
        'attachment-actions',
        'attachment-actions-size-xs',
        'attachment-actions-size-sm',
        'attachment-actions-size-default',
        'attachment-actions-orientation-horizontal',
        'attachment-actions-orientation-vertical',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
    },
    {
      name: 'attachment-action',
      publicName: 'Action',
      presentationKeys: [
        'attachment-action',
        'attachment-action-size-xs',
        'attachment-action-size-sm',
        'attachment-action-size-default',
        'attachment-action-orientation-horizontal',
        'attachment-action-orientation-vertical',
      ],
      cardinality: 'zero or more descendants of Group; cited behavior sets any stronger minimum',
    },
    {
      name: 'attachment-trigger',
      publicName: 'Trigger',
      presentationKeys: [
        'attachment-trigger',
        'attachment-trigger-size-xs',
        'attachment-trigger-size-sm',
        'attachment-trigger-size-default',
        'attachment-trigger-orientation-horizontal',
        'attachment-trigger-orientation-vertical',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
    },
  ],
};

export const attachmentPresentation = definePresentation({
  definition,
  sources: [attachmentCoreAppearance, attachmentAppearance],
});
