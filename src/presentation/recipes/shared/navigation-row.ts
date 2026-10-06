import type { PresentationRule } from '../../resolver.js';
import { fillColor, fillShown } from './fill.js';
import { packedExtent } from './target.js';

/** Accent row highlight: content color plus the accent fill layer, which fades. */
export function rowHighlight(selector: string): PresentationRule[] {
  return [
    { selector, declarations: { color: 'var(--tp-accent-foreground)' } },
    fillShown(selector),
  ];
}

const rowStates =
  '&:is(:hover, [data-popup-open]):not([data-disabled], :disabled, [aria-disabled="true"]), &[data-active]';

/** SidebarMenuButton paint shared by actions, destinations and composed disclosures. */
export const navigationRow: readonly PresentationRule[] = [
  {
    declarations: {
      gap: 'var(--tp-space-2)',
      padding: 'var(--tp-space-2)',
      'border-radius': 'var(--tp-radius-md)',
      background: 'transparent',
      color: 'var(--tp-foreground)',
      'font-size': 'var(--tp-text-sm)',
      'font-weight': 'var(--tp-font-normal)',
      'text-align': 'start',
      // Nova h-8; replaces Button's size extent.
      'block-size': packedExtent('var(--tp-control-height-sm)'),
      'min-block-size': packedExtent('var(--tp-control-height-sm)'),
    },
  },
  fillColor('var(--tp-accent)'),
  ...rowHighlight(rowStates),
];
/** The same row paint for a control without a fill layer (a composed Collapsible trigger). */
export const solidNavigationRow: readonly PresentationRule[] = [
  navigationRow[0]!,
  {
    selector: rowStates,
    declarations: { background: 'var(--tp-accent)', color: 'var(--tp-accent-foreground)' },
  },
];
// Root-projected rules target the native Button, rather than the Panel host.
export const iconAction =
  '&:is([part~="button-size-icon-xs"], [part~="button-size-icon-sm"], [part~="button-size-icon"], [part~="button-size-icon-lg"])';
export const collapsedRow = '&[data-collapsed]:not([data-compact])[data-collapse-mode="compact"]';
export const largeAction =
  '&[part~="button-size-lg"]:not([data-collapsed]:not([data-compact])[data-collapse-mode="compact"])';
export const disclosureContext = ':host-context(tp-navigation-panel-item) ';
export const collapsedContext =
  ':host-context(tp-navigation-panel-item[data-collapsed]:not([data-compact])[data-collapse-mode="compact"]) ';
