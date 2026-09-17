import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DefinitionRegistry } from './definition.js';
import { mergePresentation, presentationStyle } from './dictionary.js';
import {
  assertCompatibleTokenModes,
  assertCompleteStylingCoverage,
  assertCompleteTokenSet,
  REQUIRED_TOKEN_ROLES,
  STYLING_CATEGORIES,
} from './tokens.js';

describe('presentation dictionary', () => {
  it('applies layers in order and replaces conflict groups atomically', () => {
    const result = mergePresentation([
      {
        tokens: { background: 'var(--tp-background)' },
        parts: { root: { padding: 'var(--tp-space-1)', compact: true } },
      },
      {
        tokens: { background: 'var(--tp-card)' },
        parts: { root: { spacious: true } },
        conflicts: { density: ['compact', 'spacious'] },
      },
    ]);
    expect(result).toEqual({
      tokens: { background: 'var(--tp-card)' },
      parts: { root: { padding: 'var(--tp-space-1)', spacious: true } },
    });
    expect(presentationStyle(result.tokens)).toBe('--tp-background:var(--tp-card)');
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

  it('validates closed motion-role inventories against public parts', () => {
    const registry = new DefinitionRegistry();
    registry.register({
      name: 'Panel',
      tagName: 'tp-panel',
      kind: 'compound-reexport',
      parts: [{ name: 'content' }],
      motionRoles: [
        {
          name: 'surface',
          target: 'content',
          kind: 'presence',
          phases: ['enter', 'exit'],
          completion: 'blocking',
        },
      ],
    });
    expect(registry.get('Panel')?.motionRoles?.[0]?.name).toBe('surface');
    expect(() =>
      registry.register({
        name: 'Broken panel',
        tagName: 'tp-broken-panel',
        kind: 'compound-reexport',
        parts: [{ name: 'content' }],
        motionRoles: [
          {
            name: 'surface',
            target: 'private-node',
            kind: 'presence',
            phases: ['enter'],
            completion: 'blocking',
          },
        ],
      }),
    ).toThrow(/Unknown motion target/);
  });
});

describe('foundational styling tokens', () => {
  const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const complete = Object.fromEntries(REQUIRED_TOKEN_ROLES.map((role) => [role, role]));

  it('defines every required role in the shipped default token set', () => {
    for (const role of REQUIRED_TOKEN_ROLES) {
      expect(styles, role).toMatch(new RegExp(`--tp-${role.replaceAll('-', '\\-')}\\s*:`));
    }
  });

  it('keeps bezier definitions out of component transition declarations', () => {
    const componentDirectory = new URL('../components/', import.meta.url);
    for (const file of readdirSync(componentDirectory).filter((name) => name.endsWith('.ts'))) {
      const source = readFileSync(new URL(file, componentDirectory), 'utf8');
      expect(source, file).not.toContain('cubic-bezier(');
    }
    expect(styles).toMatch(/--tp-easing-standard:\s*cubic-bezier\(/u);
  });

  it('rejects incomplete and mode-incompatible token sets', () => {
    expect(() => assertCompleteTokenSet({ background: 'white' })).toThrow(/missing:/);
    expect(() =>
      assertCompatibleTokenModes({
        light: complete,
        dark: { ...complete, extension: 'value' },
      }),
    ).toThrow(/does not match/);
    expect(() =>
      assertCompatibleTokenModes({ light: complete, dark: { ...complete } }),
    ).not.toThrow();
  });

  it('requires every styling category to be classified', () => {
    expect(() => assertCompleteStylingCoverage({ color: 'token-bound' })).toThrow(/missing:/);
    expect(() =>
      assertCompleteStylingCoverage(
        Object.fromEntries(STYLING_CATEGORIES.map((category) => [category, 'token-bound'])),
      ),
    ).not.toThrow();
  });
});
