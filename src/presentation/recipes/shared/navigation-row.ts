import type { PresentationRule } from '../../resolver.js';

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
      'min-block-size': 'var(--tp-target-size-min)',
    },
  },
  {
    selector:
      '&:is(:hover, [data-popup-open]):not([data-disabled], :disabled, [aria-disabled="true"]), &[data-active]',
    declarations: {
      background: 'var(--tp-accent)',
      color: 'var(--tp-accent-foreground)',
    },
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
