import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { messageScrollerAppearance } from '../recipes/message-scroller.js';

const definition: ComponentDefinition = {
  name: 'Message scroller',
  tagName: 'tp-message-scroller',
  kind: 'compound-reexport',
  axes: [],
  parts: [
    {
      name: 'message-scroller',
    },
    {
      name: 'message-scroller-viewport',
    },
    {
      name: 'message-scroller-content',
    },
    {
      name: 'message-scroller-item',
    },
    {
      name: 'message-scroller-return-control',
    },
  ],
};

export const messageScrollerPresentation = definePresentation({
  definition,
  sources: [messageScrollerAppearance],
});
