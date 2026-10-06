import { motionTransition } from '../../motion.js';
import type { PresentationRule } from '../../resolver.js';
import { rule } from './variant.js';

/** Bordered text-control field paint shared by Input, Text Area and Toast close. */
export const controlFieldAppearance: readonly PresentationRule[] = [
  rule({
    'min-height': 'var(--tp-control-height-md)',
    padding: 'var(--tp-space-2) var(--tp-space-3)',
    border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-input)',
    'border-radius': 'var(--tp-radius-sm)',
    color: 'var(--tp-foreground)',
    background: 'var(--tp-background)',
    font: 'inherit',
  }),
  rule({ 'border-color': 'var(--tp-accent)' }, '&:not(:disabled, [aria-disabled="true"]):hover'),
];

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
export function dialogSectionAppearance(wrapper = '') {
  const section = `& > ${wrapper}`;
  return [
    rule({ padding: 'var(--tp-space-5)' }, `${section}:is(.header,.body,.footer)`),
    rule({ 'padding-block-start': '0' }, `${section}.body`),
    rule({ 'padding-block-start': 'var(--tp-space-5)' }, `&[data-header-hidden] > ${wrapper}.body`),
    rule(
      { 'padding-block-start': 'calc(var(--tp-control-height-sm) + var(--tp-space-4))' },
      `&[data-header-hidden]:has(.corner-close) > ${wrapper}.body`,
    ),
    rule({ gap: 'var(--tp-space-2)' }, `${section}:is(.header,.footer)`),
    rule(
      { 'padding-inline-end': 'calc(var(--tp-space-5) + var(--tp-space-8))' },
      `${section}.header:has(~ .corner-close)`,
    ),
  ];
}
