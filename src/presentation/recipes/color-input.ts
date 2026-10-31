import type { PresentationDictionary } from '../resolver.js';
import { motionTransition } from '../motion.js';
import { outlineFieldPaint } from './core/button.js';
import { fillHidden } from './shared/fill.js';
import { focusRing, insetFocusRing } from './shared/focus.js';
import {
  inlineControlLabel,
  inlineControlRings,
  inlineControlSurface,
  inlineControlValue,
} from './shared/inline-control.js';
import { popupBorder } from './shared/surface.js';
import { swatchCorner, swatchFill } from './shared/swatch.js';
import {
  disabledBackground,
  joinedEditor,
  joinedEditorMinHeight,
  joinedEditorSelector,
} from './shared/text-control.js';
import { controlSizePresentation, rule, variantPresentation } from './shared/variant.js';

const control = '[part~="color-input-control"]';
// The chip insets from the swatch like the Color picker's trigger preview.
const chipInset = 'calc(var(--tp-spacing) * 3)';

export const colorInputAppearance: PresentationDictionary = {
  'color-input': [],
  // A focused swatch of an invalid input rings in the destructive color, in both variants.
  'color-input-swatch': [
    rule(
      { 'outline-color': 'var(--tp-destructive)' },
      `&[data-invalid]:has(> ${control}:focus-visible)`,
    ),
  ],
  // Default: the swatch is an outline icon Button around the chip.
  'color-input-swatch-variant-default': [
    rule({
      border: 'var(--tp-border-width) var(--tp-border-style) transparent',
      'border-radius': 'var(--tp-radius-lg)',
    }),
    ...variantPresentation('outline', true),
    outlineFieldPaint,
    // The native control under the paint is invisible, so the swatch shows its focus ring.
    rule(focusRing, `&:has(> ${control}:focus-visible)`),
    rule({ 'border-color': 'var(--tp-destructive)' }, '&[data-invalid]'),
    fillHidden('&[data-disabled]'),
  ],
  'color-input-swatch-size-default': controlSizePresentation('icon'),
  'color-input-swatch-size-sm': controlSizePresentation('icon-sm'),
  'color-input-chip': [
    rule({
      'inline-size': `calc(100% - ${chipInset})`,
      'block-size': `calc(100% - ${chipInset})`,
      'border-radius': swatchCorner,
      border: popupBorder,
      'box-sizing': 'border-box',
      '--_tp-color-input-checker': 'var(--tp-space-2)',
      ...swatchFill('var(--_tp-color-input-paint, none)', 'var(--_tp-color-input-checker)'),
    }),
  ],
  // Inline: the row is the shared inline control row and owns the boundary, rings and fill; the
  // value text joins it as in an Input group, and the chip sits at the row's end.
  'color-input-row-variant-inline': [
    rule({
      ...inlineControlSurface,
      'min-block-size': 'var(--tp-control-height-md)',
      'padding-inline-start': 'var(--tp-space-2-5)',
      gap: 'var(--tp-space-2)',
    }),
    // The row rings while its value text is edited; the swatch rings on its own.
    ...inlineControlRings('&', ':has([part~="color-input-value"] :focus-visible)'),
    rule({ background: disabledBackground }, '&[data-disabled]'),
  ],
  'color-input-row-size-sm': [rule({ 'min-block-size': 'var(--tp-control-height-sm)' })],
  'color-input-label-variant-inline': [rule(inlineControlLabel)],
  'color-input-swatch-variant-inline': [
    rule({
      'block-size': joinedEditorMinHeight,
      'inline-size': joinedEditorMinHeight,
      'border-radius': 'var(--tp-radius-lg)',
    }),
    rule(insetFocusRing, `&:has(> ${control}:focus-visible)`),
  ],
  // The value reads like the other inline values: muted at rest, the foreground while in use.
  'color-input-value': [
    { selector: joinedEditorSelector, declarations: joinedEditor },
    // The editor is an Input with its own paint; the row's value paint wins in any sheet order.
    rule(
      {
        'min-height': joinedEditorMinHeight,
        'text-align': 'end',
        'padding-inline': '0',
        color: inlineControlValue.color!,
        transition: motionTransition(['color'], 'fast'),
      },
      '&[data-tp-presentation-part]',
    ),
    rule({ color: 'var(--tp-foreground)' }, '&[data-tp-presentation-part]:is(:hover, :focus)'),
  ],
};
