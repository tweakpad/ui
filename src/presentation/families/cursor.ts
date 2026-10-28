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
    },
    {
      name: 'cursor-surface',
    },
    {
      name: 'cursor-content',
    },
    {
      name: 'cursor-zone',
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
