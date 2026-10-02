import type { PresentationDictionary } from './resolver.js';

// Existing appearance values moved without changing layout, behavior, or token choices.
export const componentAppearance: PresentationDictionary = {
  checkbox: [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'checkbox-indicator': [
    {
      selector: '&',
      declarations: {
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
        'border-radius': 'var(--tp-radius-sm)',
      },
    },
    {
      selector: '.root[data-checked] &',
      declarations: {
        color: 'var(--tp-accent-foreground)',
        background: 'var(--tp-accent)',
        'border-color': 'var(--tp-accent)',
      },
    },
    {
      selector: '.root[data-indeterminate] &',
      declarations: {
        color: 'var(--tp-accent-foreground)',
        background: 'var(--tp-accent)',
        'border-color': 'var(--tp-accent)',
      },
    },
    {
      selector: ':host([invalid]) &',
      declarations: {
        'border-color': 'var(--tp-destructive)',
      },
    },
    {
      selector: '.root input:focus-visible + &',
      declarations: {
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'outline-offset': 'var(--tp-ring-offset)',
      },
    },
    {
      selector: ':host([invalid]) input:focus-visible + &',
      declarations: {
        'outline-color': 'var(--tp-destructive)',
      },
    },
  ],
  button: [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'button-leading-mark': [
    {
      selector: '&',
      declarations: {
        'font-size': 'var(--tp-icon-size-md)',
      },
    },
    {
      selector: ":host([size='xs']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: ":host([size='icon-xs']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: ":host([size='sm']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: ":host([size='icon-sm']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: ":host([size='lg']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-lg)',
      },
    },
    {
      selector: ":host([size='icon-lg']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-lg)',
      },
    },
  ],
  'button-trailing-mark': [
    {
      selector: '&',
      declarations: {
        'font-size': 'var(--tp-icon-size-md)',
      },
    },
    {
      selector: ":host([size='xs']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: ":host([size='icon-xs']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: ":host([size='sm']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: ":host([size='icon-sm']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: ":host([size='lg']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-lg)',
      },
    },
    {
      selector: ":host([size='icon-lg']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-lg)',
      },
    },
  ],
  tabs: [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'tabs-list': [
    {
      selector: ":host([variant='enclosed']) &",
      declarations: {
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
        'border-radius': 'var(--tp-radius-sm)',
        background: 'var(--tp-muted)',
      },
    },
  ],
  'tabs-trigger': [
    {
      selector: '&',
      declarations: {
        border: '0',
        background: 'transparent',
        color: 'var(--tp-foreground)',
        font: 'inherit',
        padding: 'var(--tp-space-2) var(--tp-space-3)',
      },
    },
    {
      selector: ":host([variant='underline']) &",
      declarations: {
        'border-block-end': 'var(--tp-border-width-strong) solid transparent',
      },
    },
    {
      selector: ":host([variant='underline'][orientation='vertical']) &",
      declarations: {
        'border-block-end': '0',
        'border-inline-end': 'var(--tp-border-width-strong) solid transparent',
      },
    },
  ],
  alert: [
    {
      selector: '&',
      declarations: {
        'column-gap': 'var(--tp-space-2)',
        padding: 'var(--tp-space-2) var(--tp-space-3)',
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
        'border-radius': 'var(--tp-radius-lg)',
        background: 'var(--tp-card)',
        color: 'var(--tp-card-foreground)',
        'font-size': 'var(--tp-text-sm)',
        'box-shadow': 'var(--tp-shadow-none)',
      },
    },
    {
      selector: '& > .body',
      declarations: { gap: 'calc(var(--tp-space-1) / 2)' },
    },
    ...(['success', 'warning', 'danger'] as const).map((severity) => ({
      selector: `:host([severity='${severity}']) &`,
      declarations: {
        color: `color-mix(in oklab, var(--tp-${severity === 'danger' ? 'destructive' : severity}) 85%, var(--tp-card-foreground))`,
      },
    })),
  ],
  'alert-title': [
    {
      selector: '&',
      declarations: {
        'font-weight': 'var(--tp-font-medium)',
      },
    },
  ],
  'alert-description': [
    { selector: '&', declarations: { color: 'var(--tp-muted-foreground)' } },
    {
      selector: ":host(:is([severity='success'], [severity='warning'], [severity='danger'])) &",
      declarations: { color: 'inherit' },
    },
    { selector: '& ::slotted(p)', declarations: { margin: '0' } },
  ],
  'alert-mark': [
    { selector: '&', declarations: { 'padding-block-start': 'calc(var(--tp-space-1) / 2)' } },
  ],
  'alert-action': [{ selector: '&', declarations: { gap: 'var(--tp-space-2)' } }],
  'attachment-root': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-3)',
      },
    },
    {
      selector: ":host([size='xs']) &",
      declarations: {
        padding: 'var(--tp-space-1) var(--tp-space-2)',
        gap: 'var(--tp-space-1)',
      },
    },
    {
      selector: ":host([size='sm']) &",
      declarations: {
        padding: 'var(--tp-space-2) var(--tp-space-3)',
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'attachment-description': [
    {
      selector: '&',
      declarations: {
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
  ],
  badge: [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-1)',
        padding: 'var(--tp-space-1) var(--tp-space-2)',
        'border-radius': 'var(--tp-radius-full)',
        'font-size': 'var(--tp-text-xs)',
        'font-weight': 'var(--tp-font-semibold)',
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
      },
    },
  ],
  'bubble-root': [
    {
      selector: '&',
      declarations: {
        'border-radius': 'var(--tp-radius-md)',
        padding: 'var(--tp-space-3)',
        border: 'var(--tp-border-width) var(--tp-border-style) transparent',
      },
    },
  ],
  'button-group': [
    {
      selector: ':host(:not([joined])) &',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'card-header': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-1)',
      },
    },
  ],
  'card-content': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-5)',
      },
    },
  ],
  'card-footer': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'empty-state': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-3)',
        padding: 'var(--tp-space-8)',
      },
    },
  ],
  'empty-state-description': [
    {
      selector: '&',
      declarations: {
        color: 'var(--tp-muted-foreground)',
      },
    },
  ],
  'key-hint': [
    {
      selector: '&',
      declarations: {
        padding: '0 var(--tp-space-1)',
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
        'border-bottom-width': 'var(--tp-border-width-strong)',
        'border-radius': 'var(--tp-radius-sm)',
        background: 'var(--tp-card)',
        font: 'inherit',
        'font-family': 'var(--tp-font-mono)',
        'font-size': 'var(--tp-text-xs)',
      },
    },
  ],
  'label-optional-indicator': [
    {
      selector: '&',
      declarations: {
        'font-weight': 'var(--tp-font-normal)',
        color: 'var(--tp-muted-foreground)',
      },
    },
  ],
  'list-item-root': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-3)',
        padding: 'var(--tp-space-2) var(--tp-space-3)',
        'border-radius': 'var(--tp-radius-sm)',
        border: 'var(--tp-border-width) var(--tp-border-style) transparent',
      },
    },
    {
      selector: ":host([size='xs']) &",
      declarations: {
        padding: 'var(--tp-space-1) var(--tp-space-2)',
        gap: 'var(--tp-space-1)',
      },
    },
    {
      selector: ":host([size='sm']) &",
      declarations: {
        padding: 'var(--tp-space-2)',
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'list-item-description': [
    {
      selector: '&',
      declarations: {
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
  ],
  'message-root': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-3)',
      },
    },
  ],
  'message-header': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'native-select-control': [
    {
      selector: '&',
      declarations: {
        'padding-inline-end': 'var(--tp-space-8)',
      },
    },
    {
      selector: ":host([size='sm']) &",
      declarations: {
        'padding-block': 'var(--tp-space-1)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
  ],
  slider: [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'slider-track': [
    {
      selector: '&',
      declarations: {
        'border-radius': 'var(--tp-radius-full)',
      },
    },
    {
      selector: '&',
      declarations: {
        background: 'var(--tp-card)',
      },
    },
  ],
  'slider-range': [
    {
      selector: '&',
      declarations: {
        'border-radius': 'var(--tp-radius-full)',
      },
    },
    {
      selector: '&',
      declarations: {
        background: 'var(--tp-accent)',
      },
    },
  ],
  'slider-thumb': [
    {
      selector: '&',
      declarations: {
        padding: '0',
        color: 'inherit',
        background: 'transparent',
      },
    },
    {
      selector: '&::-webkit-slider-runnable-track',
      declarations: {
        background: 'transparent',
      },
    },
    {
      selector: '&::-moz-range-track',
      declarations: {
        background: 'transparent',
      },
    },
    {
      selector: '&::-webkit-slider-thumb',
      declarations: {
        border: 'var(--tp-border-width-strong) var(--tp-border-style) var(--tp-accent)',
        'border-radius': 'var(--tp-radius-full)',
        background: 'var(--tp-background)',
      },
    },
    {
      selector: '&::-moz-range-thumb',
      declarations: {
        border: 'var(--tp-border-width-strong) var(--tp-border-style) var(--tp-accent)',
        'border-radius': 'var(--tp-radius-full)',
        background: 'var(--tp-background)',
      },
    },
    {
      selector: '&:focus-visible',
      declarations: {
        outline: 'none',
      },
    },
    {
      selector: '&:focus-visible::-webkit-slider-thumb',
      declarations: {
        'box-shadow': '0 0 0 var(--tp-ring-width) var(--tp-ring)',
      },
    },
    {
      selector: '&:focus-visible::-moz-range-thumb',
      declarations: {
        'box-shadow': '0 0 0 var(--tp-ring-width) var(--tp-ring)',
      },
    },
  ],
  field: [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-1)',
        padding: '0',
        border: '0',
      },
    },
  ],
  'field-label': [
    {
      selector: '&',
      declarations: {
        'font-weight': 'var(--tp-font-semibold)',
      },
    },
  ],
  'field-description': [
    {
      selector: '&',
      declarations: {
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
  ],
  'field-error': [
    {
      selector: '&',
      declarations: {
        color: 'var(--tp-destructive)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
  ],
  'input-group': [
    {
      selector: '&',
      declarations: {
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
        'border-radius': 'var(--tp-radius-sm)',
      },
    },
    {
      selector: '&:focus-within',
      declarations: {
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'outline-offset': 'var(--tp-ring-offset)',
      },
    },
    {
      selector: ':host([invalid]) &',
      declarations: {
        'border-color': 'var(--tp-destructive)',
        'outline-color': 'var(--tp-destructive)',
      },
    },
    {
      selector: ':host(:has([invalid])) &',
      declarations: {
        'border-color': 'var(--tp-destructive)',
        'outline-color': 'var(--tp-destructive)',
      },
    },
  ],
  'input-group-addon': [
    {
      selector: '&',
      declarations: {
        'padding-inline': 'var(--tp-space-3)',
        background: 'var(--tp-card)',
      },
    },
  ],
  calendar: [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-3)',
      },
    },
  ],
  'calendar-header': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'calendar-month-grid': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-4)',
      },
    },
  ],
  'calendar-day': [
    {
      selector: '&',
      declarations: {
        padding: 'var(--tp-space-1)',
        border: '0',
        'border-radius': 'var(--tp-radius-sm)',
        color: 'inherit',
        background: 'transparent',
      },
    },
    {
      selector: '&[data-outside]',
      declarations: {
        color: 'var(--tp-muted-foreground)',
      },
    },
    {
      selector: '&[data-range-middle]',
      declarations: {
        'border-radius': '0',
        background: 'var(--tp-accent)',
      },
    },
    {
      selector: '&[data-selected]',
      declarations: {
        color: 'var(--tp-accent-foreground)',
        background: 'var(--tp-accent)',
      },
    },
    {
      selector: '&[data-today]',
      declarations: {
        'box-shadow': 'inset 0 0 0 var(--tp-border-width) currentcolor',
      },
    },
    {
      selector: '&:focus-visible',
      declarations: {
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'outline-offset': 'var(--tp-ring-offset)',
      },
    },
  ],
  questionnaire: [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-4)',
      },
    },
  ],
  'questionnaire-progress': [
    {
      selector: '&',
      declarations: {
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
  ],
  'questionnaire-question': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-3)',
        padding: '0',
        border: '0',
      },
    },
  ],
  'questionnaire-title': [
    {
      selector: '&',
      declarations: {
        padding: '0',
        'font-weight': 'var(--tp-font-semibold)',
      },
    },
  ],
  'questionnaire-description': [
    {
      selector: '&',
      declarations: {
        color: 'var(--tp-muted-foreground)',
      },
    },
  ],
  'questionnaire-choices': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'questionnaire-choice': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
        padding: 'var(--tp-space-2) var(--tp-space-3)',
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
        'border-radius': 'var(--tp-radius-sm)',
      },
    },
    {
      selector: '&:has(input:checked)',
      declarations: {
        'border-color': 'var(--tp-accent)',
      },
    },
  ],
  'questionnaire-error': [
    {
      selector: '&',
      declarations: {
        color: 'var(--tp-destructive)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
  ],
  'questionnaire-actions': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'progress-track': [
    {
      selector: '&',
      declarations: {
        'border-radius': 'var(--tp-radius-full)',
        background: 'var(--tp-card)',
      },
    },
  ],
  'progress-indicator': [
    {
      selector: '&',
      declarations: {
        background: 'var(--tp-accent)',
      },
    },
  ],
  'resizable-panel-group-separator': [
    {
      selector: '&',
      declarations: {
        background: 'var(--tp-border)',
      },
    },
    {
      selector: '&:focus-visible',
      declarations: {
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'outline-offset': 'var(--tp-ring-offset)',
      },
    },
  ],
  'scroll-area-viewport': [
    {
      selector: '&',
      declarations: {
        'scrollbar-color': 'var(--tp-muted-foreground) transparent',
      },
    },
  ],
  'toast-toast': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-3)',
      },
    },
  ],
  'breadcrumb-ordered-list': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  pagination: [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-1)',
      },
    },
  ],
  'navigation-panel': [
    {
      selector: '&',
      declarations: {
        'border-inline-end': 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
        background: 'var(--tp-background)',
      },
    },
  ],
  avatar: [
    {
      selector: '&',
      declarations: {
        width: 'var(--tp-control-height-lg)',
        height: 'var(--tp-control-height-lg)',
        'border-radius': 'var(--tp-radius-full)',
        background: 'var(--tp-card)',
      },
    },
    {
      selector: "&[size='sm']",
      declarations: {
        width: 'var(--tp-control-height-md)',
        height: 'var(--tp-control-height-md)',
      },
    },
    {
      selector: "&[size='lg']",
      declarations: {
        width: 'var(--tp-space-16)',
        height: 'var(--tp-space-16)',
      },
    },
  ],
  'avatar-image': [
    {
      selector: '&',
      declarations: {
        'font-weight': 'var(--tp-font-semibold)',
      },
    },
  ],
  'avatar-fallback': [
    {
      selector: '&',
      declarations: {
        'font-weight': 'var(--tp-font-semibold)',
      },
    },
  ],
  separator: [
    {
      selector: '&',
      declarations: {
        background: 'var(--tp-border)',
      },
    },
  ],
  spinner: [
    {
      selector: '&',
      declarations: {
        color: 'inherit',
        width: 'var(--tp-icon-size-md)',
        height: 'var(--tp-icon-size-md)',
        border: 'var(--tp-border-width-strong) var(--tp-border-style) currentcolor',
        'border-right-color': 'transparent',
        'border-radius': 'var(--tp-radius-full)',
      },
    },
    {
      selector: "&[size='sm']",
      declarations: {
        width: 'var(--tp-icon-size-sm)',
        height: 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: "&[size='lg']",
      declarations: {
        width: 'var(--tp-icon-size-lg)',
        height: 'var(--tp-icon-size-lg)',
      },
    },
  ],
  marker: [
    {
      selector: '&',
      declarations: {
        width: 'var(--tp-space-3)',
        height: 'var(--tp-space-3)',
        'border-radius': 'var(--tp-radius-full)',
        background: 'var(--tp-marker-color, var(--tp-muted-foreground))',
      },
    },
  ],
  skeleton: [
    {
      selector: '&',
      declarations: {
        'border-radius': 'var(--tp-radius-sm)',
        background: 'var(--tp-card)',
      },
    },
    {
      selector: '&[animated]::after',
      declarations: {
        background: 'linear-gradient(90deg, transparent, var(--tp-muted-foreground), transparent)',
      },
    },
  ],
  icon: [
    {
      selector: '&',
      declarations: {
        'inline-size': 'var(--tp-icon-size, var(--tp-icon-size-md))',
        'block-size': 'var(--tp-icon-size, var(--tp-icon-size-md))',
        color: 'inherit',
      },
    },
  ],
  switch: [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'switch-thumb': [
    {
      selector: '&',
      declarations: {
        'border-radius': 'var(--tp-radius-full)',
        background: 'var(--tp-background)',
        'box-shadow': 'var(--tp-shadow-sm)',
      },
    },
  ],
  'collapsible-heading': [
    {
      selector: '&',
      declarations: {
        font: 'inherit',
      },
    },
  ],
  'collapsible-trigger': [
    {
      selector: '&:focus-visible',
      declarations: {
        'outline-offset': 'calc(-1 * var(--tp-ring-width))',
      },
    },
  ],
  'collapsible-leading': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'collapsible-trailing': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'one-time-code-field-group': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'one-time-code-field-slot': [
    {
      selector: '&',
      declarations: {
        padding: 'var(--tp-space-2)',
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-input)',
        'border-radius': 'var(--tp-radius-sm)',
        background: 'var(--tp-background)',
      },
    },
    {
      selector: '&[data-active]',
      declarations: {
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'outline-offset': 'var(--tp-ring-offset)',
      },
    },
  ],
};
