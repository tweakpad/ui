import type { PresentationDictionary } from '../../resolver.js';
import {
  dialogSectionAppearance,
  sectionFooterAppearance,
  surfaceAppearance,
  surfaceFadeAppearance,
} from '../shared/surface.js';
import { rule } from '../shared/variant.js';

/** Shared Dialog, Alert dialog and Drawer surface, sections, title, description and overlay. */
export function dialogFamilyAppearance(
  prefix: 'dialog' | 'alert-dialog' | 'drawer',
): PresentationDictionary {
  return {
    [`${prefix}-${prefix === 'drawer' ? 'surface' : 'content'}`]: [
      ...surfaceAppearance,
      ...(['dialog', 'alert-dialog'].includes(prefix) ? surfaceFadeAppearance : []),
      rule({ padding: '0' }),
      ...dialogSectionAppearance(prefix === 'drawer' ? '.drawer-content > ' : ''),
    ],
    [`${prefix}-title`]: [
      rule({
        'font-size': 'var(--tp-text-lg)',
        'font-weight': 'var(--tp-font-semibold)',
        'line-height': 'var(--tp-leading-tight)',
      }),
    ],
    [`${prefix}-description`]: [
      rule({
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-sm)',
      }),
    ],
    [`${prefix}-${prefix === 'alert-dialog' ? 'actions' : 'footer'}`]: sectionFooterAppearance,
    [`${prefix}-overlay`]: [
      rule({
        background:
          'color-mix(in srgb, light-dark(var(--tp-foreground), var(--tp-background)) calc(var(--tp-opacity-backdrop) * 100%), transparent)',
      }),
      ...surfaceFadeAppearance,
    ],
  };
}
