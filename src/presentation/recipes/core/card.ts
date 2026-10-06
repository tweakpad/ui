import type { PresentationDictionary } from '../../resolver.js';
import { sectionFooterAppearance } from '../shared/surface.js';
import { rule } from '../shared/variant.js';

export const cardCoreAppearance: PresentationDictionary = {
  card: [
    rule({
      border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
      'border-radius': 'var(--tp-radius-lg)',
      color: 'var(--tp-card-foreground)',
      background: 'var(--tp-card)',
      'box-shadow': 'var(--tp-shadow-none)',
    }),
    rule({ 'border-width': '0' }, ':host([borders="off"]) &'),
    rule({ 'box-shadow': 'var(--tp-shadow-md)' }, ':host([elevated]) &'),
  ],
  'card-header': [
    rule({
      background: 'var(--tp-card)',
      'border-block-end': 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
    }),
    rule({ 'border-width': '0' }, ':host([borders="off"]) &'),
  ],
  'card-content': [
    rule({
      background: 'color-mix(in oklab, var(--tp-card) 50%, var(--tp-muted))',
      'line-height': 'var(--tp-leading-normal)',
    }),
    rule({ background: 'var(--tp-card)' }, ':host([section-colors="off"]) &'),
  ],
  'card-footer': [
    ...sectionFooterAppearance,
    rule({ 'border-width': '0' }, ':host([borders="off"]) &'),
    rule({ background: 'var(--tp-card)' }, ':host([section-colors="off"]) &'),
  ],
  'card-title': [
    rule({
      margin: '0',
      'font-size': 'var(--tp-text-lg)',
      'font-weight': 'var(--tp-font-semibold)',
      'line-height': 'var(--tp-leading-normal)',
    }),
  ],
  'card-description': [
    rule({
      margin: '0',
      color: 'var(--tp-muted-foreground)',
      'font-size': 'var(--tp-text-sm)',
      'line-height': 'var(--tp-leading-normal)',
    }),
  ],
  'card-action': [rule({ gap: 'var(--tp-space-2)' })],
  ...Object.fromEntries(
    [
      'card',
      'card-header',
      'card-content',
      'card-footer',
      'card-title',
      'card-description',
      'card-action',
    ].flatMap((part) =>
      ['sm', 'default'].map((size) => [
        `${part}-size-${size}`,
        ['card-header', 'card-content', 'card-footer'].includes(part)
          ? [rule({ padding: `var(--tp-space-${size === 'sm' ? 3 : 5})` })]
          : [],
      ]),
    ),
  ),
};
