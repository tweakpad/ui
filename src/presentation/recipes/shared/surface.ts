import { motionTransition } from '../../motion.js';
import type { PresentationRule } from '../../resolver.js';
import { rule } from './variant.js';

/** Floating surface paint shared by popups, dialogs, toasts and attachments. */
export const surfaceAppearance: readonly PresentationRule[] = [
  rule({
    padding: 'var(--tp-space-3)',
    border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
    'border-radius': 'var(--tp-radius-lg)',
    color: 'var(--tp-popover-foreground)',
    background: 'var(--tp-popover)',
    'box-shadow': 'var(--tp-shadow-lg)',
  }),
];

// Surface and backdrop begin and finish together; no static popup during backdrop exit.
export const surfaceFadeAppearance: readonly PresentationRule[] = [
  rule({ opacity: '1', transition: motionTransition(['opacity'], 'fast') }),
  rule({ opacity: '0' }, '&:is([data-starting-style], [data-ending-style])'),
  rule({ transition: 'none' }, '&[data-tp-motion-driven]'),
];

// Card and dialog-family footers share section paint; each owner supplies layout.
export const sectionFooterAppearance: readonly PresentationRule[] = [
  rule({
    background: 'var(--tp-muted)',
    'border-block-start': 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
  }),
];
// One section rhythm for every Dialog-family surface, including Drawer's content wrapper.
// CL §13: one root-scoped spacing variable, initialized from a space role, read by every section.
// Consumers set the documented `--tp-dialog-spacing` (Nova `DialogContent className="p-0"` is 0).
export function dialogSectionAppearance(wrapper = '') {
  const section = `& > ${wrapper}`;
  const spacing = 'var(--_tp-dialog-spacing)';
  return [
    // Nova cn-dialog-content gap-4 p-4.
    rule({ '--_tp-dialog-spacing': 'var(--tp-dialog-spacing, var(--tp-space-4))' }),
    rule({ padding: spacing }, `${section}:is(.header,.body,.footer)`),
    rule({ 'padding-block-start': '0' }, `${section}.body`),
    rule({ 'padding-block-start': spacing }, `&[data-header-hidden] > ${wrapper}.body`),
    // A visible corner Close without a header keeps its own row: its inset, extent and inset.
    rule(
      {
        'padding-block-start': `max(${spacing}, calc(var(--tp-control-height-sm) + var(--tp-space-4)))`,
      },
      `&[data-header-hidden]:has(.corner-close) > ${wrapper}.body`,
    ),
    rule({ gap: 'var(--tp-space-2)' }, `${section}:is(.header,.footer)`),
    rule(
      { 'padding-inline-end': `calc(${spacing} + var(--tp-space-8))` },
      `${section}.header:has(~ .corner-close)`,
    ),
  ];
}

/** The hairline of floating popups: a 10% foreground mix (shadcn popover, menu and command surfaces). */
export const popupBorderColor = 'color-mix(in oklab, var(--tp-foreground) 10%, transparent)';
export const popupBorder = `var(--tp-border-width) var(--tp-border-style) ${popupBorderColor}`;
