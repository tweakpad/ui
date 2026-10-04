import type { PresentationRule } from '../resolver.js';

/** One default inset for command, navigation and selection popup surfaces. */
export const popupSpacingAppearance: readonly PresentationRule[] = [
  {
    declarations: {
      '--_tp-popup-spacing': 'var(--tp-space-2)',
      padding: 'var(--_tp-popup-spacing)',
    },
  },
];

/** Default row rhythm shared by command, navigation and selection popup items. */
export const popupItemSpacingAppearance: readonly PresentationRule[] = [
  {
    declarations: {
      gap: 'var(--tp-space-3)',
      padding: 'var(--tp-space-2)',
    },
  },
];

/** Actual shared anchored Presence recipe; geometry remains in the surface owner. */
export const anchoredPresenceAppearance: readonly PresentationRule[] = [
  {
    declarations: {
      opacity: '1',
      transform: 'scale(1) translate(0, 0)',
      transition:
        'opacity calc(var(--tp-duration-fast) * var(--tp-motion-scale)) var(--tp-easing-standard), transform calc(var(--tp-duration-fast) * var(--tp-motion-scale)) var(--tp-easing-standard)',
    },
  },
  {
    selector: '&:is([data-starting-style], [data-ending-style])',
    declarations: {
      opacity: '0',
      transform:
        'scale(.95) translate(var(--tp-surface-enter-x, 0px), var(--tp-surface-enter-y, 0px))',
    },
  },
  {
    selector: '&[data-side="top"]',
    declarations: { '--tp-surface-enter-x': '0px', '--tp-surface-enter-y': 'var(--tp-space-2)' },
  },
  {
    selector: '&[data-side="bottom"]',
    declarations: {
      '--tp-surface-enter-x': '0px',
      '--tp-surface-enter-y': 'calc(var(--tp-space-2) * -1)',
    },
  },
  {
    selector: '&[data-side="left"]',
    declarations: { '--tp-surface-enter-x': 'var(--tp-space-2)', '--tp-surface-enter-y': '0px' },
  },
  {
    selector: '&[data-side="right"]',
    declarations: {
      '--tp-surface-enter-x': 'calc(var(--tp-space-2) * -1)',
      '--tp-surface-enter-y': '0px',
    },
  },
  {
    selector: '&:is([data-instant], [data-tp-motion-driven])',
    declarations: { transition: 'none' },
  },
];

/** Nova cn-menu-target + cn-menu-translucent, shared by Menu family and Select. */
export const commandSurfaceAppearance: readonly PresentationRule[] = [
  {
    declarations: {
      color: 'var(--tp-popover-foreground)',
      background: 'color-mix(in oklab, var(--tp-popover) 70%, transparent)',
      'backdrop-filter': 'blur(calc(var(--tp-spacing) * 10)) saturate(1.5)',
      'border-radius': 'var(--tp-radius-lg)',
      border:
        'var(--tp-border-width) var(--tp-border-style) color-mix(in oklab, var(--tp-foreground) 10%, transparent)',
      'box-shadow': 'var(--tp-shadow-md)',
      'font-size': 'var(--tp-text-sm)',
    },
  },
  ...popupSpacingAppearance,
  // The Library anchored-motion contract governs over Nova's animate-none override.
  ...anchoredPresenceAppearance,
];

export const commandItemHighlightAppearance = {
  background: 'color-mix(in oklab, var(--tp-foreground) 10%, transparent)',
  color: 'var(--tp-accent-foreground)',
  outline: 'none',
};

export const commandItemAppearance: readonly PresentationRule[] = [
  {
    declarations: {
      color: 'var(--tp-popover-foreground)',
      background: 'transparent',
      border: '0',
      'border-radius': 'var(--tp-radius-md)',
      'font-size': 'var(--tp-text-sm)',
      'font-family': 'inherit',
      'line-height': 'inherit',
      'text-decoration': 'none',
    },
  },
  ...popupItemSpacingAppearance,
  {
    selector: '&:is(:focus, [data-highlighted]):not([data-disabled], [aria-disabled="true"])',
    declarations: commandItemHighlightAppearance,
  },
  // cn-menu-translucent explicitly overrides the destructive descendant text.
  { selector: '&[variant="destructive"]', declarations: { color: 'var(--tp-accent-foreground)' } },
  {
    selector: '&[data-inset]',
    declarations: { 'padding-inline-start': 'calc(var(--tp-spacing) * 7)' },
  },
  {
    selector: '&:is([data-disabled], [aria-disabled="true"])',
    declarations: { opacity: 'var(--tp-opacity-disabled)' },
  },
];

export const commandLabelAppearance: readonly PresentationRule[] = [
  {
    declarations: {
      color: 'var(--tp-muted-foreground)',
      'font-size': 'var(--tp-text-xs)',
      'font-weight': 'var(--tp-font-medium)',
      'padding-block': 'var(--tp-space-1)',
      'padding-inline': 'var(--tp-space-2)',
    },
  },
  {
    selector: '&[data-inset]',
    declarations: { 'padding-inline-start': 'calc(var(--tp-spacing) * 7)' },
  },
];
export const commandSeparatorAppearance: readonly PresentationRule[] = [
  {
    declarations: {
      'background-color': 'var(--tp-border)',
      border: '0',
      // The separator owns its internal whitespace, using the surface inset.
      // Content-box paint keeps the line thin without sibling margins.
      'box-sizing': 'content-box',
      'block-size': 'var(--tp-border-width)',
      'padding-block': 'var(--_tp-popup-spacing, var(--tp-space-2))',
      'background-clip': 'content-box',
      margin: '0',
      flex: 'none',
    },
  },
];
export const commandShortcutAppearance: readonly PresentationRule[] = [
  {
    declarations: {
      color: 'var(--tp-muted-foreground)',
      'font-size': 'var(--tp-text-xs)',
      'letter-spacing': 'var(--tp-tracking-wide)',
    },
  },
];
