import type { PresentationRule } from '../../resolver.js';

// shadcn base + style-nova: .cn-checkbox, .cn-radio-group-item and their indicators.
// The label is consumer content; only the control box receives selection paint.
export const selectionControl: readonly PresentationRule[] = [
  {
    declarations: {
      gap: 'var(--tp-space-2)',
      color: 'var(--tp-foreground)',
      background: 'transparent',
      border: '0',
      padding: '0',
      font: 'inherit',
      'font-size': 'var(--tp-text-sm)',
      'text-align': 'start',
    },
  },
  {
    selector: '& > .box',
    declarations: {
      border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-input)',
      background: 'light-dark(transparent, color-mix(in oklab, var(--tp-input) 30%, transparent))',
      'box-shadow': 'var(--tp-shadow-sm)',
    },
  },
  { selector: '&:focus-visible', declarations: { outline: 'none' } },
  {
    selector: '&:focus-visible > .box',
    declarations: {
      'border-color': 'var(--tp-ring)',
      outline:
        'var(--tp-ring-width) var(--tp-border-style) color-mix(in oklab, var(--tp-ring) 50%, transparent)',
      'outline-offset': '0',
    },
  },
  { selector: '&[data-invalid] > .box', declarations: { 'border-color': 'var(--tp-destructive)' } },
  {
    selector: '&[data-invalid]:focus-visible > .box',
    declarations: {
      'outline-color': 'color-mix(in oklab, var(--tp-destructive) 20%, transparent)',
    },
  },
  { selector: '&[data-disabled]', declarations: { opacity: '.5', cursor: 'not-allowed' } },
];

export const checkboxRules: readonly PresentationRule[] = [
  ...selectionControl,
  { selector: '& > .box', declarations: { 'border-radius': 'calc(var(--tp-radius-sm) * .75)' } },
  {
    selector: '&[data-checked] > .box, &[data-indeterminate] > .box',
    declarations: {
      background: 'var(--tp-primary)',
      color: 'var(--tp-primary-foreground)',
      'border-color': 'var(--tp-primary)',
    },
  },
];

export const radioItemRules: readonly PresentationRule[] = [
  ...selectionControl,
  { selector: '& > .box', declarations: { 'border-radius': 'var(--tp-radius-full)' } },
  {
    selector: '&[data-checked] > .box',
    declarations: { 'border-color': 'var(--tp-primary)', color: 'var(--tp-primary)' },
  },
];

/** Required native ChoiceInput anatomy consumes the same indicator paint. */
export function nativeChoiceAppearance(type: 'radio' | 'checkbox'): readonly PresentationRule[] {
  return (type === 'radio' ? radioItemRules : checkboxRules)
    .filter(
      (rule) =>
        rule.selector &&
        (rule.selector.includes('.box') || rule.selector.includes('data-disabled')),
    )
    .map((rule) => ({
      ...rule,
      selector: rule
        .selector!.replaceAll('&', `&[data-type="${type}"]`)
        .replaceAll(':focus-visible', ':has(> input:focus-visible)'),
    }));
}
