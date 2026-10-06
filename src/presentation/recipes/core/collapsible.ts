import type { PresentationDictionary } from '../../resolver.js';
import { rule } from '../shared/variant.js';

export const collapsibleCoreAppearance: PresentationDictionary = {
  collapsible: [],
  'collapsible-heading': [],
  'collapsible-trigger': [
    rule({
      padding: 'var(--tp-space-3) var(--tp-space-4)',
      border: '0',
      background: 'transparent',
      color: 'inherit',
      font: 'inherit',
    }),
  ],
  'collapsible-leading': [rule({ color: 'var(--tp-muted-foreground)' })],
  'collapsible-trailing': [rule({ color: 'var(--tp-muted-foreground)' })],
  'collapsible-label': [rule({ 'font-weight': 'var(--tp-font-semibold)' })],
  'collapsible-content': [],
  'collapsible-content-body': [
    rule({ padding: '0 var(--tp-space-4) var(--tp-space-4)' }),
    rule({ 'padding-inline-start': '0' }, ':host([data-content-alignment="label"]) &'),
  ],
};
