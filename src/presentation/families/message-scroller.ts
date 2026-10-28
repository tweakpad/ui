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
      description: 'The root region that positions the return control over the viewport.',
    },
    {
      name: 'message-scroller-viewport',
      description: 'The native scrolling region.',
    },
    {
      name: 'message-scroller-content',
      description: 'The transcript log.',
    },
    {
      name: 'message-scroller-item',
      description: 'A message row.',
    },
    {
      name: 'message-scroller-return-control',
      description: 'The return Button.',
    },
  ],
};

export const messageScrollerPresentation = definePresentation({
  definition,
  sources: [messageScrollerAppearance],
});
