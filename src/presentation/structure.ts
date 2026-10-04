import {
  navigationPanelStructure,
  navigationPanelDisclosureStructure,
} from './recipes/navigation-panel.js';
import { navigationMenuStructure } from './recipes/navigation-menu.js';
import type { PresentationDictionary } from './resolver.js';

// Arrangement of registered parts. These are not replaceable dictionary appearance.
export const registeredPartStructure: PresentationDictionary = {
  form: [{ declarations: { display: 'flex', 'flex-direction': 'column', 'min-inline-size': '0' } }],
  'form-actions': [
    { declarations: { display: 'flex', 'flex-wrap': 'wrap', 'align-items': 'center' } },
  ],
  ...navigationPanelStructure,
  ...navigationPanelDisclosureStructure,
  ...navigationMenuStructure,
  ...Object.fromEntries(
    ['menu', 'menubar'].flatMap((prefix) => [
      [`${prefix}-label`, [{ declarations: { display: 'block' } }]],
      [`${prefix}-shortcut`, [{ declarations: { 'margin-inline-start': 'auto', flex: 'none' } }]],
    ]),
  ),
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
    { selector: '&[data-disabled]', declarations: { cursor: 'not-allowed' } },
  ],
  'tabs-content': [
    { declarations: { 'min-inline-size': '0', 'overflow-wrap': 'anywhere' } },
    { selector: '&[hidden]', declarations: { display: 'none' } },
  ],
  ...Object.fromEntries(
    ['menu', 'menubar'].flatMap((prefix) =>
      ['item', 'checkbox-item', 'radio-item', 'sub-trigger'].map((suffix) => [
        `${prefix}-${suffix}`,
        [
          {
            declarations: {
              display: 'flex',
              'align-items': 'center',
              'inline-size': '100%',
              'min-block-size': 'max(var(--tp-control-height-md), var(--tp-target-size-min))',
              'text-align': 'start',
              'justify-content': 'start',
              cursor: 'pointer',
            },
          },
          { selector: '&[aria-disabled="true"]', declarations: { cursor: 'not-allowed' } },
        ],
      ]),
    ),
  ),
};
