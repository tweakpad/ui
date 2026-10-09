import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  assertCompatibleTokenModes,
  assertCompleteStylingCoverage,
  assertCompleteTokenSet,
  REQUIRED_TOKEN_ROLES,
  STYLING_CATEGORIES,
  TOKEN_FAMILIES,
} from './tokens.js';

describe('foundational styling tokens', () => {
  const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const complete = Object.fromEntries(REQUIRED_TOKEN_ROLES.map((role) => [role, role]));

  it('defines every required role in the shipped default token set', () => {
    for (const role of REQUIRED_TOKEN_ROLES) {
      expect(styles, role).toMatch(new RegExp(`--tp-${role.replaceAll('-', '\\-')}\\s*:`));
    }
  });

  const elementDirectories = ['../components/', '../widgets/'].map(
    (directory) => new URL(directory, import.meta.url),
  );

  it('keeps bezier definitions out of component transition declarations', () => {
    for (const directory of elementDirectories)
      for (const file of readdirSync(directory).filter((name) => name.endsWith('.ts'))) {
        const source = readFileSync(new URL(file, directory), 'utf8');
        expect(source, file).not.toContain('cubic-bezier(');
      }
    expect(styles).toMatch(/--tp-easing-standard:\s*cubic-bezier\(/u);
  });

  it('uses semantic roles and OKLab for every percentage-derived color', () => {
    const componentStyles = elementDirectories.flatMap((directory) =>
      readdirSync(directory)
        .filter((name) => name.endsWith('.ts'))
        .map((name) => readFileSync(new URL(name, directory), 'utf8')),
    );
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
        if (token === undefined) throw new Error('Missing token name in matched declaration');
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
