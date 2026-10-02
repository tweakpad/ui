import type { PresentationDictionary } from './resolver.js';

// Arrangement of registered parts. These are not replaceable dictionary appearance.
export const registeredPartStructure: PresentationDictionary = {
  'navigation-menu-content': [{ declarations: { position: 'fixed', 'z-index': '1000' } }],
  ...Object.fromEntries(
    ['menu', 'context-menu', 'menubar'].flatMap((prefix) =>
      ['item', 'checkbox-item', 'radio-item', 'sub-trigger'].map((suffix) => [
        `${prefix}-${suffix}`,
        [
          {
            declarations: {
              display: 'flex',
              'align-items': 'center',
              'inline-size': '100%',
              'text-align': 'start',
              cursor: 'pointer',
            },
          },
          { selector: '&[aria-disabled="true"]', declarations: { cursor: 'not-allowed' } },
        ],
      ]),
    ),
  ),
};
