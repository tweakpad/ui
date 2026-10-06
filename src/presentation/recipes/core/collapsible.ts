import type { PresentationDictionary } from '../../resolver.js';
import { rule } from '../shared/variant.js';

export const collapsibleCoreAppearance: PresentationDictionary = {
  collapsible: [],
  'collapsible-heading': [],
  'collapsible-trigger': [
    // Nova cn-accordion-trigger: text-sm font-medium (py-2.5 in its own rows).
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
  'collapsible-content': [],
  'collapsible-content-body': [
    rule({ padding: '0 var(--tp-space-4) var(--tp-space-4)', 'font-size': 'var(--tp-text-sm)' }),
    rule({ 'padding-inline-start': '0' }, ':host([data-content-alignment="label"]) &'),
  ],
};
