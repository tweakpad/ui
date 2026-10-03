import type { PresentationDictionary, PresentationRule } from '../resolver.js';

/** SidebarMenuButton paint shared by actions, destinations and composed disclosures. */
const navigationRow: readonly PresentationRule[] = [
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
    selector: '&:hover:not([data-disabled], :disabled), &[data-active]',
    declarations: {
      background: 'var(--tp-accent)',
      color: 'var(--tp-accent-foreground)',
    },
  },
];
// Root-projected rules target the native Button, rather than the Panel host.
const iconAction =
  '&:is([part~="button-size-icon-xs"], [part~="button-size-icon-sm"], [part~="button-size-icon"], [part~="button-size-icon-lg"])';
const collapsedRow = '&[data-collapsed]:not([data-compact])[data-collapse-mode="compact"]';
const largeAction =
  '&[part~="button-size-lg"]:not([data-collapsed]:not([data-compact])[data-collapse-mode="compact"])';
const disclosureContext = ':host-context(tp-navigation-panel-item) ';
const collapsedContext =
  ':host-context(tp-navigation-panel-item[data-collapsed]:not([data-compact])[data-collapse-mode="compact"]) ';
/** Composes the real Collapsible with SidebarMenuButton paint; no second disclosure owner. */
export const navigationPanelDisclosureAppearance: PresentationDictionary = {
  'collapsible-trigger': [
    ...navigationRow.map((rule) => ({
      ...rule,
      selector: disclosureContext + (rule.selector ?? '&'),
    })),
    { selector: collapsedContext + '&', declarations: { padding: '0' } },
  ],
  'collapsible-label': [
    { selector: disclosureContext + '&', declarations: { 'font-weight': 'inherit' } },
  ],
  'collapsible-leading': [
    {
      selector: disclosureContext + '&',
      declarations: { color: 'inherit', 'margin-inline-end': 'var(--tp-space-2)' },
    },
  ],
  'collapsible-trailing': [
    {
      selector: disclosureContext + '&',
      declarations: { color: 'inherit', 'margin-inline-start': 'var(--tp-space-2)' },
    },
  ],
  'collapsible-content-body': [
    { selector: disclosureContext + '&', declarations: { padding: '0' } },
  ],
};
export const navigationPanelDisclosureStructure: PresentationDictionary = {
  'collapsible-trigger': [
    {
      selector: disclosureContext + '&',
      declarations: { 'box-sizing': 'border-box', 'min-inline-size': '0' },
    },
    {
      selector: collapsedContext + '&',
      declarations: { display: 'flex', 'justify-content': 'center' },
    },
  ],
  'collapsible-label': [
    {
      selector: disclosureContext + '&',
      declarations: { overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' },
    },
    {
      selector: collapsedContext + '&',
      declarations: {
        position: 'absolute',
        'inline-size': '1px',
        'block-size': '1px',
        padding: '0',
        overflow: 'hidden',
        'clip-path': 'inset(50%)',
        'white-space': 'nowrap',
      },
    },
  ],
  'collapsible-content': [{ selector: collapsedContext + '&', declarations: { display: 'none' } }],
  'collapsible-trailing': [{ selector: collapsedContext + '&', declarations: { display: 'none' } }],
  'collapsible-leading': [
    { selector: collapsedContext + '&', declarations: { 'margin-inline': '0' } },
  ],
};
const parts = [
  'navigation-panel',
  'navigation-panel-trigger',
  'navigation-panel-resize-rail',
  'navigation-panel-inset',
  'navigation-panel-header',
  'navigation-panel-content',
  'navigation-panel-footer',
  'navigation-panel-group',
  'navigation-panel-group-label',
  'navigation-panel-group-action',
  'navigation-panel-group-content',
  'navigation-panel-menu',
  'navigation-panel-item',
  'navigation-panel-link',
  'navigation-panel-action',
  'navigation-panel-badge',
  'navigation-panel-loading-placeholder',
  'navigation-panel-submenu',
  'navigation-panel-subitem',
  'navigation-panel-sublink',
  'navigation-panel-input',
  'navigation-panel-separator',
];
/** shadcn Base sidebar.tsx → style-nova.css1110–1221; existing semantic role adaptations. */
export const navigationPanelAppearance: PresentationDictionary = {
  ...Object.fromEntries(
    parts.flatMap((part) =>
      ['integrated', 'floating', 'inset'].map((variant) => [`${part}-variant-${variant}`, []]),
    ),
  ),
  'navigation-panel': [
    { declarations: { background: 'var(--tp-muted)', color: 'var(--tp-foreground)' } },
    {
      selector: '&[data-side="inline-start"]',
      declarations: {
        'border-inline-end': 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
      },
    },
    {
      selector: '&[data-side="inline-end"]',
      declarations: {
        'border-inline-start': 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
      },
    },
  ],
  'navigation-panel-variant-floating': [
    {
      declarations: {
        'border-radius': 'var(--tp-radius-lg)',
        'box-shadow': 'var(--tp-shadow-sm)',
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
      },
    },
  ],
  'navigation-panel-variant-inset': [],
  'navigation-panel-trigger': [
    {
      declarations: {
        'min-inline-size': 'var(--tp-target-size-min)',
        'min-block-size': 'var(--tp-target-size-min)',
      },
    },
  ],
  'navigation-panel-resize-rail': [
    {
      declarations: {
        'border-radius': '0',
        padding: '0',
        'min-inline-size': 'var(--tp-target-size-min)',
        background: 'transparent',
        'block-size': '100%',
        cursor: 'ew-resize',
      },
    },
  ],
  'navigation-panel-inset': [
    { declarations: { background: 'var(--tp-background)', padding: 'var(--tp-space-4)' } },
  ],
  'navigation-panel-inset-variant-inset': [
    {
      declarations: {
        margin: 'var(--tp-space-2)',
        'border-radius': 'var(--tp-radius-xl)',
        'box-shadow': 'var(--tp-shadow-sm)',
      },
    },
  ],
  'navigation-panel-header': [
    { declarations: { gap: 'var(--tp-space-2)', padding: 'var(--tp-space-2)' } },
  ],
  'navigation-panel-content': [{ declarations: { gap: '0' } }],
  'navigation-panel-footer': [
    { declarations: { gap: 'var(--tp-space-2)', padding: 'var(--tp-space-2)' } },
  ],
  'navigation-panel-group': [{ declarations: { padding: 'var(--tp-space-2)' } }],
  'navigation-panel-group-label': [
    {
      declarations: {
        height: 'max(calc(var(--tp-spacing) * 8), var(--tp-target-size-min))',
        padding: '0 var(--tp-space-2)',
        'font-size': 'var(--tp-text-xs)',
        'font-weight': 'var(--tp-font-medium)',
        color: 'color-mix(in oklab, var(--tp-foreground) 70%, transparent)',
      },
    },
    {
      selector: '&[data-collapsed]:not([data-compact])[data-collapse-mode="compact"]',
      declarations: { opacity: '0' },
    },
  ],
  'navigation-panel-group-action': [
    {
      declarations: {
        'min-inline-size': 'var(--tp-target-size-min)',
        'min-block-size': 'var(--tp-target-size-min)',
        background: 'transparent',
        color: 'var(--tp-foreground)',
      },
    },
    {
      selector: '&[data-collapsed]:not([data-compact])[data-collapse-mode="compact"]',
      declarations: { display: 'none' },
    },
  ],
  'navigation-panel-group-content': [{ declarations: { 'font-size': 'var(--tp-text-sm)' } }],
  'navigation-panel-menu': [{ declarations: { gap: '0' } }],
  'navigation-panel-item': [],
  'navigation-panel-link': [
    ...navigationRow,
    {
      declarations: {
        'padding-inline-end': 'var(--navigation-panel-trailing-space, var(--tp-space-2))',
      },
    },
    {
      selector: '&:hover:not([data-disabled]), &:active:not([data-disabled]), &[data-active]',
      declarations: { background: 'var(--tp-accent)', color: 'var(--tp-accent-foreground)' },
    },
    { selector: '&[data-active]', declarations: { 'font-weight': 'var(--tp-font-medium)' } },
    { selector: collapsedRow, declarations: { padding: '0' } },
  ],
  'navigation-panel-action': [
    ...navigationRow,
    {
      declarations: {
        'padding-inline-end': 'var(--navigation-panel-trailing-space, var(--tp-space-2))',
      },
    },
    {
      selector: '&:hover:not([data-disabled]), &[data-active]',
      declarations: { background: 'var(--tp-accent)', color: 'var(--tp-accent-foreground)' },
    },
    {
      selector: iconAction,
      declarations: { padding: '0' },
    },
    { selector: largeAction, declarations: { 'padding-block': 'var(--tp-space-3)' } },
    { selector: collapsedRow, declarations: { padding: '0' } },
  ],
  'navigation-panel-badge': [
    {
      declarations: {
        padding: '0 var(--tp-space-1)',
        'border-radius': '0',
        'font-size': 'var(--tp-text-xs)',
        'font-weight': 'var(--tp-font-medium)',
        'font-variant-numeric': 'tabular-nums',
        background: 'transparent',
        border: '0',
        color: 'var(--tp-foreground)',
      },
    },
    {
      selector: '&[data-collapsed]:not([data-compact])[data-collapse-mode="compact"]',
      declarations: { display: 'none' },
    },
  ],
  'navigation-panel-loading-placeholder': [
    {
      declarations: {
        gap: 'var(--tp-space-2)',
        padding: '0 var(--tp-space-2)',
        height: 'calc(var(--tp-spacing) * 8)',
      },
    },
  ],
  'navigation-panel-submenu': [
    {
      declarations: {
        'margin-block': '0',
        'margin-inline-start':
          'calc(var(--tp-space-2) + var(--tp-icon-size-md) / 2 - var(--tp-border-width) / 2)',
        'margin-inline-end': 'var(--tp-space-3)',
        padding: 'var(--tp-space-1) var(--tp-space-2)',
        'border-inline-start': 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
      },
    },
    {
      selector: '&[data-collapsed]:not([data-compact])[data-collapse-mode="compact"]',
      declarations: { display: 'none' },
    },
  ],
  'navigation-panel-subitem': [],
  'navigation-panel-sublink': [
    {
      declarations: {
        background: 'transparent',
        color: 'var(--tp-foreground)',
        padding: '0 var(--tp-space-2)',
        'border-radius': 'var(--tp-radius-md)',
        'min-block-size': 'var(--tp-target-size-min)',
      },
    },
    {
      selector: '&:hover:not([data-disabled]), &[data-active]',
      declarations: { background: 'var(--tp-accent)', color: 'var(--tp-accent-foreground)' },
    },
  ],
  'navigation-panel-input': [{ declarations: { background: 'var(--tp-background)' } }],
  'navigation-panel-separator': [
    { declarations: { margin: 'var(--tp-space-2) 0', background: 'var(--tp-border)' } },
  ],
};
export const navigationPanelStructure: PresentationDictionary = {
  'navigation-panel': [
    {
      declarations: {
        display: 'flex',
        'flex-direction': 'column',
        'min-inline-size': '0',
        'min-block-size': '0',
      },
    },
  ],
  'navigation-panel-inset': [
    {
      declarations: {
        display: 'flex',
        'flex-direction': 'column',
        'min-inline-size': '0',
        'min-block-size': '0',
      },
    },
  ],
  'navigation-panel-header': [{ declarations: { display: 'flex', 'flex-direction': 'column' } }],
  'navigation-panel-content': [
    {
      declarations: {
        display: 'flex',
        'flex-direction': 'column',
        flex: '1',
        'min-block-size': '0',
        overflow: 'auto',
      },
    },
  ],
  'navigation-panel-footer': [{ declarations: { display: 'flex', 'flex-direction': 'column' } }],
  'navigation-panel-group': [
    { declarations: { position: 'relative', display: 'flex', 'flex-direction': 'column' } },
  ],
  'navigation-panel-group-label': [
    {
      declarations: {
        display: 'flex',
        'align-items': 'center',
        'white-space': 'nowrap',
        overflow: 'hidden',
      },
    },
  ],
  'navigation-panel-menu': [
    {
      declarations: {
        display: 'flex',
        'flex-direction': 'column',
        'list-style': 'none',
        margin: '0',
        padding: '0',
      },
    },
  ],
  'navigation-panel-item': [{ declarations: { position: 'relative', 'list-style': 'none' } }],
  'navigation-panel-link': [
    {
      declarations: {
        'inline-size': '100%',
        'justify-content': 'start',
        'white-space': 'nowrap',
        overflow: 'hidden',
        'text-overflow': 'ellipsis',
      },
    },
    { selector: collapsedRow, declarations: { 'justify-content': 'center' } },
    {
      selector: collapsedRow + ' > [part~="button-label"]',
      declarations: { position: 'absolute' },
    },
  ],
  'navigation-panel-action': [
    { declarations: { 'inline-size': '100%', 'justify-content': 'start' } },
    { selector: largeAction, declarations: { 'block-size': 'auto' } },
    {
      selector: iconAction,
      declarations: { 'justify-content': 'center' },
    },
    { selector: collapsedRow, declarations: { 'justify-content': 'center' } },
    {
      selector: collapsedRow + ' > [part~="button-label"]',
      declarations: { position: 'absolute' },
    },
  ],
  'navigation-panel-loading-placeholder': [
    { declarations: { display: 'flex', 'align-items': 'center' } },
  ],
  'navigation-panel-submenu': [
    { declarations: { display: 'flex', 'flex-direction': 'column', 'list-style': 'none' } },
  ],
  'navigation-panel-subitem': [{ declarations: { 'list-style': 'none' } }],
  'navigation-panel-sublink': [
    { declarations: { 'inline-size': '100%', 'justify-content': 'start' } },
  ],
  'navigation-panel-separator': [
    { declarations: { 'block-size': 'var(--tp-border-width)', 'inline-size': '100%' } },
  ],
};
