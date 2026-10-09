import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { tabsAppearance } from '../recipes/tabs.js';

const definition: ComponentDefinition = {
  name: 'Tabs',
  tagName: 'tp-tabs',
  kind: 'compound-reexport',
  axes: [
    {
      name: 'orientation',
      values: ['horizontal', 'vertical'],
      default: 'horizontal',
    },
    {
      name: 'variant',
      values: ['enclosed', 'underline'],
      default: 'enclosed',
    },
  ],
  parts: [
    {
      name: 'tabs',
      axes: ['orientation', 'variant'],
    },
    {
      name: 'tabs-list',
      axes: ['orientation', 'variant'],
    },
    {
      name: 'tabs-trigger',
      axes: ['orientation', 'variant'],
    },
    {
      name: 'tabs-indicator',
      axes: ['orientation', 'variant'],
    },
    {
      name: 'tabs-content',
      axes: ['orientation', 'variant'],
    },
  ],
};

export const tabsPresentation = definePresentation({
  definition,
  bindings: {
    'tp-tabs': {
      "[part='tabs']": 'tabs',
      "[part='tabs-list']": 'tabs-list',
    },
  },
  structure: {
    'tabs-trigger': [
      {
        declarations: {
          display: 'inline-flex',
          position: 'relative',
          'z-index': '1',
          'align-items': 'center',
          'justify-content': 'center',
          'white-space': 'nowrap',
          'flex-shrink': '0',
          appearance: 'none',
          cursor: 'pointer',
        },
      },
      {
        selector: '&[data-disabled]',
        declarations: {
          cursor: 'not-allowed',
        },
      },
    ],
    'tabs-content': [
      {
        declarations: {
          'min-inline-size': '0',
          'overflow-wrap': 'anywhere',
        },
      },
      {
        selector: '&[hidden]',
        declarations: {
          display: 'none',
        },
      },
    ],
  },
  sources: [tabsAppearance],
});
