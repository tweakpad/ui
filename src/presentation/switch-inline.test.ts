import { describe, expect, it } from 'vitest';
import { switchPresentation } from './families/switch.js';
import { resolveComponentPresentation } from './resolver.js';
import { inlineControlSurface } from './recipes/shared/inline-control.js';

const resolve = (variant: string) =>
  resolveComponentPresentation(
    switchPresentation.definition,
    { size: 'default', variant },
    switchPresentation.appearance,
  );

describe('Switch inline variant', () => {
  it('resolves every variant key from the dictionary', () => {
    for (const variant of ['default', 'inline'])
      expect(resolve(variant).missingKeys.filter((key) => key.includes('-variant-'))).toEqual([]);
  });

  it('paints the row as the shared inline row, ringing it while the track has keyboard focus', () => {
    const row = resolve('inline').parts['switch-row']!;
    expect(row[0]!.declarations).toMatchObject({ background: inlineControlSurface.background });
    expect(row.some((rule) => rule.selector?.includes(':focus-visible'))).toBe(true);
    expect(resolve('default').parts['switch-row']).toEqual([]);
  });

  it('leaves the rings to the row', () => {
    const track = resolve('inline').parts.switch!.at(-1)!;
    expect(track.declarations).toMatchObject({ outline: 'none', 'box-shadow': 'none' });
  });
});
