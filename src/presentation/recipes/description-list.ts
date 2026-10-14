import type { PresentationDictionary } from '../resolver.js';

/**
 * In a vertical list, pair spacing is a block margin on every pair after the first, not a grid
 * gap, so the clipped extent of the visible pairs ends at the last visible value. The list
 * publishes the spacing of each layout to its pairs through a private custom property; a
 * horizontal row spaces its pairs with gaps.
 */
export const descriptionListAppearance: PresentationDictionary = {
  'description-list': [
    {
      declarations: {
        'font-size': 'var(--tp-text-sm)',
        'column-gap': 'var(--tp-space-4)',
        '--_tp-description-list-item-gap': 'var(--tp-space-3)',
      },
    },
  ],
  'description-list-orientation-horizontal': [{ declarations: { 'row-gap': 'var(--tp-space-3)' } }],
  'description-list-layout-stacked': [
    { declarations: { '--_tp-description-list-item-gap': 'var(--tp-space-4)' } },
  ],
  'description-list-item': [
    { selector: '&[data-layout="stacked"]', declarations: { 'row-gap': 'var(--tp-space-1)' } },
    {
      selector: ':host(:not([orientation="horizontal"])) &:not(:first-child)',
      declarations: {
        'margin-block-start': 'var(--_tp-description-list-item-gap, var(--tp-space-3))',
      },
    },
    {
      selector: ':host([orientation="horizontal"]) &[data-layout="inline"]',
      declarations: { 'column-gap': 'var(--tp-space-1-5)' },
    },
  ],
  'description-list-label': [{ declarations: { color: 'var(--tp-muted-foreground)' } }],
  'description-list-value': [{ declarations: { color: 'var(--tp-foreground)' } }],
  // The link Button's text sits on the content edge, in line with the Labels, in the muted
  // foreground like secondary text.
  'description-list-trigger': [
    { declarations: { 'margin-block-start': 'var(--tp-space-2)' } },
    {
      selector: '&::part(button)',
      declarations: {
        'padding-inline': '0',
        'border-inline-width': '0',
        gap: 'var(--tp-space-1)',
        color: 'var(--tp-muted-foreground)',
      },
    },
  ],
};
