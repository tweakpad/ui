import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { messageScrollerAppearance } from '../recipes/message-scroller.js';

const definition: ComponentDefinition = {
  name: 'Message scroller',
  tagName: 'tp-message-scroller',
  kind: 'compound-reexport',
  sourceNode: 'ucl21-message-scroller',
  nonVisualParts: ['Provider'],
  axes: [],
  parts: [
    {
      name: 'message-scroller',
      publicName: 'Root',
      presentationKeys: ['message-scroller'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'message-scroller-viewport',
      publicName: 'Viewport',
      presentationKeys: ['message-scroller-viewport'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'message-scroller-content',
      publicName: 'Content',
      presentationKeys: ['message-scroller-content'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'message-scroller-item',
      publicName: 'Item',
      presentationKeys: ['message-scroller-item'],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'message-scroller-return-control',
      publicName: 'Return control',
      presentationKeys: ['message-scroller-return-control'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
  ],
};

export const messageScrollerPresentation = definePresentation({
  definition,
  sources: [messageScrollerAppearance],
});
