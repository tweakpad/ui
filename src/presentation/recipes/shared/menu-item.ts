import type { PresentationRule } from '../../resolver.js';
import { coarseTarget } from './target.js';

/** Structure of a menu row (Menu and Menubar items, choice items and sub-triggers). */
export const menuItemStructure: readonly PresentationRule[] = [
  {
    declarations: {
      'box-sizing': 'border-box',
      display: 'flex',
      'align-items': 'center',
      'inline-size': '100%',
      // Items have no fixed or minimum extent (a reused Button sub-trigger
      // included); touch keeps the accessible target.
      'block-size': 'auto',
      'min-block-size': coarseTarget,
      'text-align': 'start',
      'justify-content': 'start',
      cursor: 'pointer',
    },
  },
  {
    selector: '&[aria-disabled="true"]',
    declarations: {
      cursor: 'not-allowed',
    },
  },
];

/** Structure of a menu row's trailing shortcut hint. */
export const menuShortcutStructure: readonly PresentationRule[] = [
  {
    declarations: {
      'margin-inline-start': 'auto',
      flex: 'none',
    },
  },
];
