import { describe, expect, it } from 'vitest';
import { DefinitionRegistry } from './definition.js';
import { mergePresentation, presentationStyle } from './dictionary.js';

describe('presentation dictionary', () => {
  it('applies layers in order and replaces conflict groups atomically', () => {
    const result = mergePresentation([
      { tokens: { color: 'red' }, parts: { root: { padding: 4, compact: true } } },
      {
        tokens: { color: 'blue' },
        parts: { root: { spacious: true } },
        conflicts: { density: ['compact', 'spacious'] },
      },
    ]);
    expect(result).toEqual({
      tokens: { color: 'blue' },
      parts: { root: { padding: 4, spacious: true } },
    });
    expect(presentationStyle(result.tokens)).toBe('--tp-color:blue');
  });
});

describe('definition registry', () => {
  it('rejects duplicate identities and preserves immutable definitions', () => {
    const registry = new DefinitionRegistry();
    registry.register({
      name: 'Button',
      tagName: 'tp-button',
      kind: 'compound-reexport',
      parts: [{ name: 'control' }],
    });
    expect(() =>
      registry.register({
        name: 'Button',
        tagName: 'tp-other-button',
        kind: 'thin-wrapper',
        parts: [],
      }),
    ).toThrow(/Duplicate/);
    expect(Object.isFrozen(registry.get('Button'))).toBe(true);
  });
});
