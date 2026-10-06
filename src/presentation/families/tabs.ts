import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { tabsAppearance } from '../recipes/tabs.js';

const definition: ComponentDefinition = {
  name: 'Tabs',
  tagName: 'tp-tabs',
  kind: 'compound-reexport',
  sourceNode: 'ucl16-tabs',
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
      publicName: 'Root',
      presentationKeys: [
        'tabs',
        'tabs-orientation-horizontal',
        'tabs-orientation-vertical',
        'tabs-variant-enclosed',
        'tabs-variant-underline',
      ],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'tabs-list',
      publicName: 'List',
      presentationKeys: [
        'tabs-list',
        'tabs-list-orientation-horizontal',
        'tabs-list-orientation-vertical',
        'tabs-list-variant-enclosed',
        'tabs-list-variant-underline',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'tabs-trigger',
      publicName: 'Trigger',
      presentationKeys: [
        'tabs-trigger',
        'tabs-trigger-orientation-horizontal',
        'tabs-trigger-orientation-vertical',
        'tabs-trigger-variant-enclosed',
        'tabs-trigger-variant-underline',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'tabs-indicator',
      publicName: 'Indicator',
      presentationKeys: [
        'tabs-indicator',
        'tabs-indicator-orientation-horizontal',
        'tabs-indicator-orientation-vertical',
        'tabs-indicator-variant-enclosed',
        'tabs-indicator-variant-underline',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'tabs-content',
      publicName: 'Content',
      presentationKeys: [
        'tabs-content',
        'tabs-content-orientation-horizontal',
        'tabs-content-orientation-vertical',
        'tabs-content-variant-enclosed',
        'tabs-content-variant-underline',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
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
