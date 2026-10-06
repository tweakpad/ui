import type { PresentationDictionary } from '../resolver.js';
import { scrollbarRules, scrollbarThumbRules } from './shared/scrollbar.js';

/** shadcn Base/Vega anatomy with actual Button/Progress and one configured structural gap. */
export const carouselAppearance: PresentationDictionary = {
  carousel: [],
  'carousel-viewport': [],
  'carousel-track': [],
  'carousel-item': [],
  'carousel-previous': [{ declarations: { 'border-radius': 'var(--tp-radius-full)' } }],
  'carousel-next': [{ declarations: { 'border-radius': 'var(--tp-radius-full)' } }],
  'carousel-controls': [{ declarations: { gap: 'var(--tp-space-3)' } }],
  'carousel-controls-placement-footer': [
    { declarations: { 'margin-block-start': 'var(--tp-space-3)' } },
  ],
  'carousel-controls-placement-outside': [
    {
      selector: '& > :is(.indicators, slot[name="indicators"])',
      declarations: { 'margin-block-start': 'var(--tp-space-3)' },
    },
    {
      selector: '&[data-orientation="vertical"] > :is(.indicators, slot[name="indicators"])',
      declarations: { 'margin-block-start': '0', 'margin-inline-start': 'var(--tp-space-3)' },
    },
  ],
  'carousel-controls-placement-inside': [{ declarations: { padding: 'var(--tp-space-3)' } }],
  'carousel-status': [
    {
      declarations: {
        'font-size': 'var(--tp-text-sm)',
        color: 'var(--tp-muted-foreground)',
        'font-variant-numeric': 'tabular-nums',
      },
    },
  ],
  'carousel-indicator': [
    { declarations: { gap: 'var(--tp-space-2)' } },
    {
      selector: '& .bullet',
      declarations: {
        display: 'inline-block',
        width: 'var(--tp-space-2)',
        height: 'var(--tp-space-2)',
        'border-radius': 'var(--tp-radius-full)',
        background: 'var(--tp-muted-foreground)',
        opacity: '0.4',
      },
    },
    {
      selector:
        '& .bullet[data-current="true"], & [data-current="true"] .bullet, &[data-current="true"] .bullet',
      declarations: { opacity: '1', background: 'var(--tp-primary)' },
    },
  ],
  'carousel-scrollbar': scrollbarRules,
  'carousel-thumb': scrollbarThumbRules,
  'carousel-autoplay-control': [{ declarations: { 'margin-block-end': 'var(--tp-space-2)' } }],
  'carousel-announcements': [],
};
