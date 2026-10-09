import type { PresentationDictionary } from '../../resolver.js';
import { rule } from '../shared/variant.js';

export const inputGroupCoreAppearance: PresentationDictionary = {
  'input-group-control': [
    rule({
      border: '0',
      'border-radius': '0',
      outline: '0',
      'min-inline-size': '0',
      flex: '1',
      font: 'inherit',
      color: 'inherit',
      background: 'transparent',
    }),
  ],
};
