import type { PresentationRule } from '../../resolver.js';
import { rule } from '../shared/variant.js';

const accordion: Record<string, readonly PresentationRule[]> = {};
accordion.accordion = [
  rule({
    gap: '0',
    overflow: 'visible',
    border: '0 var(--tp-border-style) var(--tp-border)',
    'border-radius': '0',
    background: 'transparent',
  }),
];
accordion['accordion-item'] = [
  rule({
    overflow: 'visible',
    border: '0 var(--tp-border-style) var(--tp-border)',
    'border-radius': '0',
    background: 'transparent',
  }),
];
accordion['accordion-variant-outline'] = [
  rule({
    background: 'var(--tp-background)',
    'border-width': 'var(--tp-border-width)',
    'border-radius': 'var(--tp-radius-lg)',
    overflow: 'clip',
  }),
];
for (const variant of ['outline', 'line'])
  accordion[`accordion-item-variant-${variant}`] = [
    rule({ 'border-block-start-width': 'var(--tp-border-width)' }, '&:not([data-index="0"])'),
  ];
accordion['accordion-variant-separated'] = [rule({ gap: 'var(--tp-space-2)' })];
accordion['accordion-item-variant-separated'] = [
  rule({
    background: 'var(--tp-background)',
    'border-width': 'var(--tp-border-width)',
    'border-radius': 'var(--tp-radius-lg)',
    overflow: 'clip',
  }),
];

/** Accordion paint; the family gives every other key an empty entry. */
export const accordionCoreAppearance = accordion;
