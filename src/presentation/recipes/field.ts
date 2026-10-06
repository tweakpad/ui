import type { PresentationDictionary } from '../resolver.js';
import { fieldGroupRules } from './shared/field-group.js';

export const fieldAppearance: PresentationDictionary = {
  field: [{ declarations: { padding: '0', border: '0', gap: 'var(--tp-space-4)' } }],
  'field-legend': [
    {
      declarations: {
        'margin-block-end': 'var(--tp-space-1-5)',
        'font-weight': 'var(--tp-font-medium)',
        'font-size': 'var(--tp-text-base)',
      },
    },
    { selector: '&[data-scale="field"]', declarations: { 'font-size': 'var(--tp-text-sm)' } },
  ],
  'field-field-group': fieldGroupRules,
  'field-field': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'field-control-region': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'field-label': [
    {
      declarations: {
        'font-size': 'var(--tp-text-sm)',
        'font-weight': 'var(--tp-font-medium)',
        'line-height': 'var(--tp-leading-tight)',
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'field-title': [
    {
      declarations: {
        'font-size': 'var(--tp-text-sm)',
        'font-weight': 'var(--tp-font-medium)',
        'line-height': 'var(--tp-leading-tight)',
      },
    },
  ],
  'field-description': [
    {
      declarations: {
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-sm)',
        'line-height': 'var(--tp-leading-normal)',
        'overflow-wrap': 'anywhere',
      },
    },
  ],
  'field-error': [
    {
      declarations: {
        color: 'var(--tp-destructive)',
        'font-size': 'var(--tp-text-sm)',
        'font-weight': 'var(--tp-font-normal)',
        'overflow-wrap': 'anywhere',
      },
    },
    {
      selector: '& ul',
      declarations: { margin: '0', 'padding-inline-start': 'var(--tp-space-4)' },
    },
  ],
  'field-separator': [
    {
      declarations: {
        'margin-block': 'calc(var(--tp-space-2) * -1)',
        height: 'var(--tp-space-5)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
    {
      selector: '& .separator-content',
      declarations: {
        'padding-inline': 'var(--tp-space-2)',
        background: 'var(--tp-background)',
        color: 'var(--tp-muted-foreground)',
      },
    },
  ],
  ...Object.fromEntries(
    [
      'field',
      'field-legend',
      'field-field-group',
      'field-field',
      'field-label',
      'field-title',
      'field-control-region',
      'field-description',
      'field-error',
      'field-separator',
    ].flatMap((part) =>
      ['vertical', 'horizontal', 'responsive'].map((orientation) => [
        `${part}-orientation-${orientation}`,
        [],
      ]),
    ),
  ),
};
