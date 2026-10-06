import type { PresentationDictionary } from '../resolver.js';
import { fieldGroupRules } from './shared/field-group.js';

export const formAppearance: PresentationDictionary = {
  form: fieldGroupRules,
  'form-actions': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'form-error-summary': [
    { declarations: { color: 'var(--tp-destructive)', 'font-size': 'var(--tp-text-sm)' } },
  ],
};
