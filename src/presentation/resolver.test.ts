import { describe, expect, it } from 'vitest';
import { catalogEntries } from '../catalog.js';
import { componentDefinitions } from './components.js';
import { defaultPresentationDictionary, variantPresentation } from './default.js';
import { resolveComponentPresentation, serializeDeclarations } from './resolver.js';

describe('cataloged component presentation', () => {
  it('covers every catalog identity with source-linked public parts', () => {
    expect(componentDefinitions).toHaveLength(catalogEntries.length);
    expect(new Set(componentDefinitions.map((d) => d.tagName))).toEqual(
      new Set(catalogEntries.map((d) => d.tagName)),
    );
    for (const definition of componentDefinitions) {
      expect(definition.sourceNode).toBeTruthy();
      expect(new Set(definition.parts.map((p) => p.name)).size).toBe(definition.parts.length);
    }
  });
  it('resolves Button base, variant, then size without mutating definitions', () => {
    const definition = componentDefinitions.find((d) => d.name === 'Button')!;
    const before = JSON.stringify(definition);
    const result = resolveComponentPresentation(
      definition,
      { variant: 'outline', size: 'sm' },
      defaultPresentationDictionary,
    );
    expect(result.missingKeys).toEqual([]);
    expect(
      result.parts.button?.some(
        (r) =>
          r.declarations['block-size'] === 'var(--tp-control-height-sm)' &&
          r.declarations['padding-inline'] === 'var(--tp-space-2-5)',
      ),
    ).toBe(true);
    expect(JSON.stringify(definition)).toBe(before);
  });
  it('does not use the default dictionary for missing keys', () => {
    const definition = componentDefinitions.find((d) => d.name === 'Card')!;
    const result = resolveComponentPresentation(definition, {}, {});
    expect(result.missingKeys).toContain('card');
    expect(result.parts.card).toEqual([]);
  });
  it('preserves ordered shorthand and subproperty declarations', () => {
    expect(serializeDeclarations({ padding: '12px', 'padding-left': '20px' })).toBe(
      'padding:12px;padding-left:20px',
    );
  });
  it('keeps passive variants noninteractive and resolves shared subdued and tinted roles', () => {
    expect(variantPresentation('default').some((r) => r.selector?.includes('hover'))).toBe(false);
    for (const variant of ['subdued', 'tinted']) {
      const rules = variantPresentation(variant);
      expect(rules.some((rule) => rule.declarations.background)).toBe(true);
      expect(rules.some((rule) => rule.selector?.includes('hover'))).toBe(false);
    }
    expect(variantPresentation('unresolved')).toEqual([]);
  });
});
