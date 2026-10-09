import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { messageAppearance } from '../recipes/message.js';

const definition: ComponentDefinition = {
  name: 'Message',
  tagName: 'tp-message',
  kind: 'presentational-primitive',
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
      axes: ['align'],
    },
    {
      name: 'message-root',
      axes: ['align'],
    },
    {
      name: 'message-avatar',
      axes: ['align'],
    },
    {
      name: 'message-content',
      axes: ['align'],
    },
    {
      name: 'message-header',
      axes: ['align'],
    },
    {
      name: 'message-footer',
      axes: ['align'],
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
