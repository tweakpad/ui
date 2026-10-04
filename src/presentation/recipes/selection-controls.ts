import type {
  PresentationDictionary,
  PresentationRule,
  PresentationDeclarations,
} from '../resolver.js';
import { joinedControlPresentation } from '../composition.js';

// shadcn base + style-nova: .cn-checkbox, .cn-radio-group-item and their indicators.
// The label is consumer content; only the control box receives selection paint.
const selectionControl: readonly PresentationRule[] = [
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
const toggleIconEdges = (units: number): PresentationRule[] => [
  {
    selector: ':host([data-icon-inline-start]) &',
    declarations: { 'padding-inline-start': `calc(var(--tp-spacing) * ${units})` },
  },
  {
    selector: ':host([data-icon-inline-end]) &',
    declarations: { 'padding-inline-end': `calc(var(--tp-spacing) * ${units})` },
  },
];
export const selectionControlAppearance: PresentationDictionary = {
  toggle: [
    { declarations: { 'min-inline-size': 'var(--tp-control-height-md)' } },
    ...toggleIconEdges(2),
    // Keep pressed paint distinct when a consumer moves the pointer onto it.
    {
      selector:
        '&[aria-pressed="true"]:not(:disabled, [aria-disabled="true"]):is(:hover, :focus-visible)',
      declarations: { background: 'var(--tp-muted)', color: 'var(--tp-foreground)' },
    },
    {
      selector:
        '&[aria-pressed="true"]:not(:disabled, [aria-disabled="true"]):is(:hover, :focus-visible)::before',
      declarations: { opacity: '0' },
    },
  ],
  'toggle-content': [
    { declarations: { gap: 'var(--tp-space-1)', '--tp-icon-size-md': 'var(--tp-icon-size-sm)' } },
  ],
  'toggle-size-sm': [
    { declarations: { 'min-inline-size': 'var(--tp-control-height-sm)' } },
    ...toggleIconEdges(1.5),
  ],
  'toggle-size-lg': [{ declarations: { 'min-inline-size': 'var(--tp-control-height-lg)' } }],
  // TpIcon's default md extent inherits through the slot; explicit Icon.size wins.
  'toggle-content-size-sm': [
    { declarations: { '--tp-icon-size-md': 'calc(var(--tp-icon-size-sm) * 0.875)' } },
  ],
  // Radio orientation changes geometry in the element; indicator paint is invariant.
  ...Object.fromEntries(
    ['radio-group', 'radio-group-item', 'radio-group-indicator'].flatMap((part) =>
      ['horizontal', 'vertical'].map((orientation) => [part + '-orientation-' + orientation, []]),
    ),
  ),
  // ToggleGroup composes actual TpToggle instances: their existing variant/size recipe
  // owns every item paint rule. Group keys add no second copy of that appearance.
  ...Object.fromEntries(
    ['toggle-group', 'toggle-group-item'].flatMap((part) => [
      [part, []],
      ...['horizontal', 'vertical'].map((value) => [part + '-orientation-' + value, []]),
      ...['ghost', 'outline'].map((value) => [part + '-variant-' + value, []]),
      ...['sm', 'default', 'lg'].map((value) => [part + '-size-' + value, []]),
    ]),
  ),
  checkbox: [
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
  ],
  'checkbox-indicator': [{ declarations: { color: 'inherit' } }],
  'radio-group': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'radio-group-item': [
    ...selectionControl,
    { selector: '& > .box', declarations: { 'border-radius': 'var(--tp-radius-full)' } },
    {
      selector: '&[data-checked] > .box',
      declarations: { 'border-color': 'var(--tp-primary)', color: 'var(--tp-primary)' },
    },
  ],
  'radio-group-indicator': [
    { declarations: { background: 'currentColor', 'border-radius': 'var(--tp-radius-full)' } },
  ],
};

/** Nova adds Toggle-only joined padding over the common ButtonGroup seam geometry. */
export function toggleGroupJoinedPresentation(
  index: number,
  count: number,
  orientation: 'horizontal' | 'vertical',
  leadingIcon: boolean,
  trailingIcon: boolean,
): PresentationDeclarations {
  return {
    ...joinedControlPresentation(index, count, orientation),
    'padding-inline-start': `calc(var(--tp-spacing) * ${leadingIcon ? 1.5 : 2})`,
    'padding-inline-end': `calc(var(--tp-spacing) * ${trailingIcon ? 1.5 : 2})`,
  };
}

/** Required native ChoiceInput anatomy consumes the same indicator paint. */
export function nativeChoiceAppearance(type: 'radio' | 'checkbox'): readonly PresentationRule[] {
  const key = type === 'radio' ? 'radio-group-item' : 'checkbox';
  return (selectionControlAppearance[key] ?? [])
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
