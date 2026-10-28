import { iconGraphicAttributes, iconPathAttributes } from '../../../foundation/icon-graphic.js';
import { checkIcon } from '../../../icons/check.js';
import { minusIcon } from '../../../icons/minus.js';
import type { IconDefinition } from '../../../icons/types.js';
import type { PresentationRule } from '../../resolver.js';

// Checkbox and Radio controls and their indicators.
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
      // A labelled row is the pointer target; keep it at the WCAG 2.2 minimum (24px).
      'min-block-size': 'var(--tp-control-height-xs)',
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
  {
    selector: '& > .box',
    declarations: { 'border-radius': 'min(var(--tp-radius-sm), var(--tp-space-1))' },
  },
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

/** Where a native choice paints its indicator: a `.box` beside the input, or the input itself. */
type NativeChoiceAnatomy = 'box' | 'input';

/** A native checkbox that is its own box, inside the element the rules bind. */
const nativeCheckbox = '& > input[type="checkbox"]';

/** Each Checkbox state marker as the native input's own state (`dcp-semantics`). */
const nativeCheckboxStates: Readonly<Record<string, string>> = {
  '[data-checked]': ':checked',
  '[data-indeterminate]': ':indeterminate',
  '[data-disabled]': ':disabled',
  '[data-invalid]': '[aria-invalid="true"]',
  ':focus-visible': ':focus-visible',
};

/** A checkbox rule's selector for the `input` anatomy; throws on a compound it cannot map. */
function inputSelector(selector: string): string {
  return selector
    .split(', ')
    .map((compound) => {
      const match = /^&((?:\[data-[a-z]+\]|:focus-visible)*)( > \.box)?$/u.exec(compound);
      if (!match) throw new Error(`No native checkbox selector for "${compound}".`);
      const states = (match[1] ?? '').replace(/\[data-[a-z]+\]|:focus-visible/gu, (state) => {
        const native = nativeCheckboxStates[state];
        if (native === undefined) throw new Error(`No native checkbox state for "${state}".`);
        return native;
      });
      return match[2] ? `${nativeCheckbox}${states}` : `&:has(> input[type="checkbox"]${states})`;
    })
    .join(', ');
}

/** SVG attributes as markup, leaving out those without a value. */
function svgAttributes(attributes: Readonly<Record<string, string | number | undefined>>): string {
  return Object.entries(attributes)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => `${name}="${value}"`)
    .join(' ');
}

/** An icon as a CSS mask image, drawn with the attributes that tp-icon renders. */
function iconMask(icon: IconDefinition): string {
  const paths = icon.paths.map((path) => `<path ${svgAttributes(iconPathAttributes(path))}/>`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" ${svgAttributes(iconGraphicAttributes(icon))}>${paths.join('')}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * Required native ChoiceInput anatomy consumes the same indicator paint (`dcp-roles-table-r5`).
 * `box` (default): the bound element holds the input and a `.box`, whose mark is an element.
 * `input`: the bound element holds a native checkbox that is itself the box; the check mark needs
 * no element: a mask of the check icon in the mark color on the input's `::after`, read from the
 * input's own checked state (`dcp-semantics`).
 */
export function nativeChoiceAppearance(
  type: 'radio' | 'checkbox',
  anatomy?: 'box',
): readonly PresentationRule[];
export function nativeChoiceAppearance(
  type: 'checkbox',
  anatomy: 'input',
): readonly PresentationRule[];
export function nativeChoiceAppearance(
  type: 'radio' | 'checkbox',
  anatomy: NativeChoiceAnatomy = 'box',
): readonly PresentationRule[] {
  const painted = (type === 'radio' ? radioItemRules : checkboxRules).filter(
    (rule) =>
      rule.selector && (rule.selector.includes('.box') || rule.selector.includes('data-disabled')),
  );
  if (anatomy === 'input')
    return [
      // The box paint replaces the native one; without it the native checkbox shows.
      { selector: nativeCheckbox, declarations: { appearance: 'none' } },
      ...painted.map((rule) => ({ ...rule, selector: inputSelector(rule.selector!) })),
      {
        selector: `${nativeCheckbox}:is(:checked, :indeterminate)::after`,
        declarations: {
          content: "''",
          display: 'block',
          'inline-size': '100%',
          'block-size': '100%',
          'background-color': 'currentColor',
          'mask-image': iconMask(checkIcon),
          'mask-position': 'center',
          'mask-size': 'contain',
          'mask-repeat': 'no-repeat',
          // Forced colors keep the mark in the forced text color instead of the canvas color.
          'forced-color-adjust': 'none',
        },
      },
      {
        selector: `${nativeCheckbox}:indeterminate::after`,
        declarations: { 'mask-image': iconMask(minusIcon) },
      },
    ];
  return painted.map((rule) => ({
    ...rule,
    selector: rule
      .selector!.replaceAll('&', `&[data-type="${type}"]`)
      .replaceAll(':focus-visible', ':has(> input:focus-visible)'),
  }));
}
