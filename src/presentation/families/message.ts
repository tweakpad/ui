import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { messageAppearance } from '../recipes/message.js';

const definition: ComponentDefinition = {
  name: 'Message',
  tagName: 'tp-message',
  kind: 'presentational-primitive',
  sourceNode: 'ucl22-message',
  axes: [
    {
      name: 'align',
      values: ['start', 'end'],
      default: 'start',
    },
  ],
  parts: [
    {
      name: 'message',
      publicName: 'Group',
      presentationKeys: ['message', 'message-align-start', 'message-align-end'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'message-root',
      publicName: 'Root',
      presentationKeys: ['message-root', 'message-root-align-start', 'message-root-align-end'],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
    },
    {
      name: 'message-avatar',
      publicName: 'Avatar',
      presentationKeys: [
        'message-avatar',
        'message-avatar-align-start',
        'message-avatar-align-end',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
    },
    {
      name: 'message-content',
      publicName: 'Content',
      presentationKeys: [
        'message-content',
        'message-content-align-start',
        'message-content-align-end',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
    },
    {
      name: 'message-header',
      publicName: 'Header',
      presentationKeys: [
        'message-header',
        'message-header-align-start',
        'message-header-align-end',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
    },
    {
      name: 'message-footer',
      publicName: 'Footer',
      presentationKeys: [
        'message-footer',
        'message-footer-align-start',
        'message-footer-align-end',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
    },
  ],
};

export const messagePresentation = definePresentation({
  definition,
  bindings: {
    'tp-message': {
      '.message': 'message-root',
      '.meta': 'message-header',
      '.avatar': 'message-avatar',
      '.content': 'message-content',
      '.footer': 'message-footer',
    },
  },
  sources: [messageAppearance],
});
