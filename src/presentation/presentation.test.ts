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
  TOKEN_FAMILIES,
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

  it('uses semantic roles and OKLab for every percentage-derived color', () => {
    const componentDirectory = new URL('../components/', import.meta.url);
    const componentStyles = readdirSync(componentDirectory)
      .filter((name) => name.endsWith('.ts'))
      .map((name) => readFileSync(new URL(name, componentDirectory), 'utf8'));
    const sources = [styles, ...componentStyles];
    const validMix =
      /color-mix\(\s*in\s+oklab\s*,\s*var\(--tp-[a-z0-9-]+\)\s+\d+(?:\.\d+)?%\s*,\s*(?:transparent|var\(--tp-[a-z0-9-]+\)(?:\s+\d+(?:\.\d+)?%)?|light-dark\(\s*var\(--tp-[a-z0-9-]+\)\s*,\s*var\(--tp-[a-z0-9-]+\)\s*\))\s*\)/gu;
    const colorRoles: readonly string[] = TOKEN_FAMILIES.color;

    for (const source of sources) {
      const mixes = source.match(/color-mix\(/gu) ?? [];
      const validMixes = source.match(validMix) ?? [];
      expect(validMixes.length).toBe(mixes.length);
      for (const mix of validMixes) {
        for (const [, role] of mix.matchAll(/var\(--tp-([a-z0-9-]+)\)/gu)) {
          expect(colorRoles, mix).toContain(role);
        }
      }

      for (const [, token] of source.matchAll(/--tp-([a-z0-9-]+)\s*:/gu)) {
        const isStateColor = colorRoles.some(
          (role) =>
            token.startsWith(`${role}-`) &&
            /-(?:hover|pressed|selected|focused?|active|disabled)$/u.test(token),
        );
        expect(isStateColor, token).toBe(false);
      }
    }
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
