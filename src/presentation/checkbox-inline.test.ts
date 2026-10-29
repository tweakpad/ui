import { describe, expect, it } from 'vitest';
import { checkboxPresentation } from './families/checkbox.js';
import { resolveComponentPresentation } from './resolver.js';
import { inlineControlSurface } from './recipes/shared/inline-control.js';

const resolve = (variant: string) =>
  resolveComponentPresentation(
    checkboxPresentation.definition,
    { variant },
    checkboxPresentation.appearance,
  );

describe('Checkbox inline variant', () => {
  it('resolves every variant key from the dictionary', () => {
    for (const variant of ['default', 'inline'])
      expect(resolve(variant).missingKeys.filter((key) => key.includes('-variant-'))).toEqual([]);
  });

  it('paints the control as the shared inline row, ringing the row on keyboard focus', () => {
    const inline = resolve('inline').parts.checkbox!.slice(
      resolve('default').parts.checkbox!.length,
    );
    expect(inline[0]!.declarations).toMatchObject({
      background: inlineControlSurface.background,
      'min-block-size': 'var(--tp-control-height-md)',
    });
    expect(inline.some((rule) => rule.selector === '&:focus-visible')).toBe(true);
  });
});
