import type { MarkdownAlertKind } from '../../../foundation/markdown/types.js';
import type { PresentationDeclarations } from '../../resolver.js';

/** The callout surface (`uwg-te-tab-vocabulary-r17`): the Alert surface with its icon column gap. */
export const calloutSurface: PresentationDeclarations = {
  'column-gap': 'var(--tp-space-2)',
  padding: 'var(--tp-space-2) var(--tp-space-2-5)',
  border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
  'border-radius': 'var(--tp-radius-lg)',
  background: 'var(--tp-card)',
  color: 'var(--tp-card-foreground)',
  'font-size': 'var(--tp-text-sm)',
  'box-shadow': 'var(--tp-shadow-none)',
};

/** The severities of a callout surface; `informational` keeps the surface's own text color. */
export type CalloutSeverity = 'informational' | 'success' | 'warning' | 'danger';

/** The severities that tint the callout surface's text, in this order. */
export const calloutTints = ['success', 'warning', 'danger'] as const;

/** The severity of each alert kind (`> [!NOTE]`), shared by Markdown alerts and callout tones. */
export const alertKindSeverity: Readonly<Record<MarkdownAlertKind, CalloutSeverity>> = {
  note: 'informational',
  important: 'informational',
  tip: 'success',
  warning: 'warning',
  caution: 'danger',
};

/** The text color of the callout surface in a tinting severity: its status role over the text. */
export function calloutTint(severity: (typeof calloutTints)[number]): PresentationDeclarations {
  return {
    color: `color-mix(in oklab, var(--tp-${severity === 'danger' ? 'destructive' : severity}) 85%, var(--tp-card-foreground))`,
  };
}
