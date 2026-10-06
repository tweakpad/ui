import type { PresentationDictionary } from '../resolver.js';
import { motionTransition } from '../motion.js';

export const breadcrumbAppearance: PresentationDictionary = {
  'breadcrumb-ordered-list': [
    {
      declarations: {
        margin: '0',
        padding: '0',
        'list-style': 'none',
        gap: 'calc(var(--tp-spacing) * 1.5)',
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
  ],
  'breadcrumb-item': [{ declarations: { gap: 'var(--tp-space-1)' } }],
  'breadcrumb-link': [
    {
      declarations: {
        color: 'inherit',
        'text-decoration': 'none',
        transition: motionTransition(['color'], 'fast'),
      },
    },
    { selector: '&:hover', declarations: { color: 'var(--tp-foreground)' } },
  ],
  'breadcrumb-current-page': [
    { declarations: { color: 'var(--tp-foreground)', 'font-weight': 'var(--tp-font-normal)' } },
  ],
  'breadcrumb-ellipsis': [
    {
      declarations: {
        'inline-size': 'var(--tp-space-5)',
        'block-size': 'var(--tp-space-5)',
        display: 'inline-flex',
        'align-items': 'center',
        'justify-content': 'center',
      },
    },
  ],
};
