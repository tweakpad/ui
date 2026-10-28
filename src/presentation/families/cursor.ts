import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { cursorAppearance } from '../recipes/cursor.js';

const definition: ComponentDefinition = {
  name: 'Cursor',
  tagName: 'tp-cursor',
  kind: 'compound-reexport',
  axes: [],
  parts: [
    {
      name: 'cursor',
      description: 'The cursor host, which paints nothing itself.',
    },
    {
      name: 'cursor-surface',
      description:
        'The fixed, pointer-transparent box in the top layer; it carries the opacity and blend.',
    },
    {
      name: 'cursor-content',
      description:
        "The content the cursor shows: the default ring, slotted content or the active zone's template.",
    },
    {
      name: 'cursor-zone',
      description: 'The zone host, which takes no layout box.',
    },
  ],
};

/**
 * The root paints no surface; the surface carries opacity and blend, the content the default
 * ring, and a zone paints nothing (CL Cursor `ccl-presentation`).
 */
export const cursorPresentation = definePresentation({
  definition,
  bindings: {
    'tp-cursor': {
      ':host': 'cursor',
      "[part~='surface']": 'cursor-surface',
      "[part~='content']": 'cursor-content',
    },
    'tp-cursor-zone': {
      ':host': 'cursor-zone',
    },
  },
  sources: [cursorAppearance],
});
