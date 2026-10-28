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
      description: 'The stack of a Message group.',
      axes: ['align'],
    },
    {
      name: 'message-root',
      description: 'The row: the avatar column beside the header, content and footer.',
      axes: ['align'],
    },
    {
      name: 'message-avatar',
      description: "The column that holds the sender's avatar.",
      axes: ['align'],
    },
    {
      name: 'message-content',
      description: 'The content area, which spaces the Bubbles and Attachments in it.',
      axes: ['align'],
    },
    {
      name: 'message-header',
      description: "The header with the sender's name and the time.",
      axes: ['align'],
    },
    {
      name: 'author',
      description: "The sender's name in the built-in header.",
    },
    {
      name: 'timestamp',
      description: "The Time in the built-in header; it re-exports the Time's `time-value` part.",
    },
    {
      name: 'body',
      description: 'The wrapper of the header, content and footer.',
    },
    {
      name: 'status',
      description: 'The built-in Sending or Failed to send status in the footer.',
    },
    {
      name: 'message-footer',
      description: 'The footer with the delivery status or actions.',
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
