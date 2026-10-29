import { describe, expect, it } from 'vitest';
import { selectPresentation } from './families/select.js';
import { resolveComponentPresentation } from './resolver.js';
import { inlineControlSurface } from './recipes/shared/inline-control.js';

const resolve = (variant: string) =>
  resolveComponentPresentation(
    selectPresentation.definition,
    { variant },
    selectPresentation.appearance,
  );

describe('Select inline variant', () => {
  it('resolves every variant key from the dictionary', () => {
    for (const variant of ['default', 'inline'])
      expect(resolve(variant).missingKeys.filter((key) => key.includes('-variant-'))).toEqual([]);
  });

  it('paints the plain trigger with the shared inline row surface', () => {
    const inline = resolve('inline').parts['select-trigger']!.slice(
      resolve('default').parts['select-trigger']!.length,
    );
    expect(inline[0]!.declarations).toMatchObject({
      background: inlineControlSurface.background,
    });
    expect(inline.every((rule) => rule.selector?.includes('&:not([data-searchable])'))).toBe(true);
  });

  it('adds the trigger label and value paint only for inline', () => {
    expect(resolve('default').parts['select-trigger-label']).toEqual([]);
    expect(resolve('inline').parts['select-trigger-label']!.length).toBeGreaterThan(0);
    expect(
      resolve('inline').parts['select-value']!.some((rule) => rule.selector?.includes(':hover')),
    ).toBe(true);
  });
});
