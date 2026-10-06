import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { presentationFamilies } from '../families/index.js';
import { CONTROL_STEPS, controlSizePresentation, controlStepOf } from './shared/variant.js';

const tokens = new Set(
  [
    ...readFileSync(new URL('../../styles.css', import.meta.url), 'utf8').matchAll(
      /(--tp-[\w-]+):/g,
    ),
  ].map((match) => match[1]!),
);

/** Every declaration of every family appearance, labelled by family, key and property. */
function* declarations(): Generator<[string, string]> {
  for (const family of presentationFamilies)
    for (const [key, rules] of Object.entries(family.appearance))
      for (const rule of rules)
        for (const [property, value] of Object.entries(rule.declarations))
          yield [`${family.definition.name} ${key} ${property}`, String(value)];
}

describe('size and spacing normalization (CL §5.3)', () => {
  // Popup and media widths (Nova w-64, max-w-xs, min-w-36) are layout extents, not spacing.
  const spacingProperty = /\s(padding|margin|gap|row-gap|column-gap|inset)[\w-]*$/;

  it('derives spacing from the named space-* roles, never from the raw seed', () => {
    const offenders = [...declarations()]
      .filter(
        ([where, value]) => spacingProperty.test(where) && value.includes('var(--tp-spacing)'),
      )
      .map(([where, value]) => `${where}: ${value}`);
    expect(offenders).toEqual([]);
  });

  it('references only defined foundation roles', () => {
    const offenders = [...declarations()].flatMap(([where, value]) =>
      // Runtime geometry outputs (--tp-anchor-width, --tp-toast-*) are not foundation roles.
      [
        ...value.matchAll(
          /var\((--tp-(?:space|text|font|leading|tracking|control-height|icon-size-|radius|shadow|opacity|border|ring)[\w-]*)/g,
        ),
      ]
        .map((match) => match[1]!)
        .filter((name) => !tokens.has(name))
        .map((name) => `${where}: ${name}`),
    );
    expect(offenders).toEqual([]);
  });

  it('gives every control step one extent, type and icon size', () => {
    for (const size of ['xs', 'sm', 'default', 'lg', 'icon-xs', 'icon-sm', 'icon', 'icon-lg']) {
      const step = CONTROL_STEPS[controlStepOf(size)];
      const base = controlSizePresentation(size)[0]!.declarations;
      expect(base['block-size']).toBe(step.height);
      expect(base['font-size']).toBe(step.fontSize);
      expect(base['--_tp-icon-extent']).toBe(step.icon);
      if (size.startsWith('icon')) expect(base['inline-size']).toBe(step.height);
    }
    expect(Object.values(CONTROL_STEPS).map((step) => step.fontSize)).toEqual([
      'var(--tp-text-xs)',
      'var(--tp-text-sm)',
      'var(--tp-text-sm)',
      'var(--tp-text-sm)',
    ]);
  });
});
