import type { PresentationDeclarations } from './resolver.js';

/** The same logical seam geometry for ButtonGroup and zero-spacing ToggleGroup. */
export function joinedControlPresentation(
  index: number,
  count: number,
  orientation: 'horizontal' | 'vertical',
): PresentationDeclarations {
  const first = index === 0;
  const last = index === count - 1;
  const vertical = orientation === 'vertical';
  const radius = 'var(--tp-radius-sm)';
  return {
    'border-start-start-radius': first ? radius : '0',
    'border-start-end-radius': (vertical ? first : last) ? radius : '0',
    'border-end-start-radius': (vertical ? last : first) ? radius : '0',
    'border-end-end-radius': last ? radius : '0',
    ...(first
      ? {}
      : { [vertical ? 'border-block-start-width' : 'border-inline-start-width']: '0' }),
    ...(vertical ? { 'inline-size': '100%' } : {}),
  };
}
