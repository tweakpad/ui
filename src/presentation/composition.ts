import type { PresentationDeclarations } from './resolver.js';

/** The same logical seam geometry for ButtonGroup and zero-spacing ToggleGroup. */
export function joinedControlPresentation(
  index: number,
  count: number,
  orientation: 'horizontal' | 'vertical',
  radius: string | null = 'var(--tp-radius-sm)',
): PresentationDeclarations {
  const first = index === 0;
  const last = index === count - 1;
  const vertical = orientation === 'vertical';
  const corners = {
    'border-start-start-radius': first ? radius : '0',
    'border-start-end-radius': (vertical ? first : last) ? radius : '0',
    'border-end-start-radius': (vertical ? last : first) ? radius : '0',
    'border-end-end-radius': last ? radius : '0',
  };
  return {
    ...Object.fromEntries(Object.entries(corners).filter(([, value]) => value !== null)),
    ...(first
      ? {}
      : { [vertical ? 'border-block-start-width' : 'border-inline-start-width']: '0' }),
    // Vertical members stretch to the widest member without losing their own extent
    // (a fixed `inline-size: 100%` collapses square icon controls in a fit-content group).
    ...(vertical ? { 'min-inline-size': '100%' } : {}),
  };
}
