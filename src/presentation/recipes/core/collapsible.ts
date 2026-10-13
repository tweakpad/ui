import type { PresentationDictionary } from '../../resolver.js';
import { rule } from '../shared/variant.js';

export const collapsibleCoreAppearance: PresentationDictionary = {
  collapsible: [],
  'collapsible-trigger': [
    rule({
      padding: 'var(--tp-space-2-5) var(--tp-space-4)',
      border: '0',
      background: 'transparent',
      color: 'inherit',
      font: 'inherit',
      'font-size': 'var(--tp-text-sm)',
    }),
  ],
  'collapsible-leading': [rule({ color: 'var(--tp-muted-foreground)' })],
  'collapsible-trailing': [rule({ color: 'var(--tp-muted-foreground)' })],
  'collapsible-label': [rule({ 'font-weight': 'var(--tp-font-medium)' })],
  'collapsible-content-body': [
    rule({ padding: '0 var(--tp-space-4) var(--tp-space-4)', 'font-size': 'var(--tp-text-sm)' }),
    rule({ 'padding-inline-start': '0' }, ':host([data-content-alignment="label"]) &'),
  ],
};
