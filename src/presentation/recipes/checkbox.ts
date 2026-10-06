import type { PresentationDictionary } from '../resolver.js';
import { checkboxRules } from './shared/selection-control.js';

export const checkboxAppearance: PresentationDictionary = {
  checkbox: checkboxRules,
  'checkbox-indicator': [{ declarations: { color: 'inherit' } }],
};
