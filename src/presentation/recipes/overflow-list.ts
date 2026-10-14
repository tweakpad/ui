import type { PresentationDictionary } from '../resolver.js';

export const overflowListAppearance: PresentationDictionary = {
  // Items sit in rows separated by the chip-list rhythm; the list paints no surface.
  'overflow-list': [{ declarations: { gap: 'var(--tp-space-1)' } }],
  // The Count is a Badge; its figures keep one width so counts do not jitter.
  'overflow-list-count': [{ declarations: { 'font-variant-numeric': 'tabular-nums' } }],
};
