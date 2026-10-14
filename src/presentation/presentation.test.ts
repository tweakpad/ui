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

  describe('motion roles (CL §5.3, §5.6)', () => {
    const tokenValue = (role: string) =>
      new RegExp(`--tp-${role}:\\s*([^;]+);`, 'u').exec(styles)?.[1]?.trim() ?? '';

    it('ships strictly increasing durations, registered as times', () => {
      const durations = ['duration-fast', 'duration-normal', 'duration-slow'];
      const ms = durations.map((role) => Number.parseFloat(tokenValue(role)));
      expect(ms.every((value, index) => value > 0 && value > (ms[index - 1] ?? 0))).toBe(true);
      for (const role of durations)
        expect(styles).toMatch(
          new RegExp(`@property --tp-${role} \\{\\s*syntax: '<time>';\\s*inherits: true;`, 'u'),
        );
    });

    it('defines every easing role as a bezier and keeps the policy channels out of the roles', () => {
      for (const role of ['easing-standard', 'easing-enter', 'easing-exit'])
        expect(tokenValue(role), role).toMatch(/^cubic-bezier\(/u);
      const roles: readonly string[] = TOKEN_FAMILIES.motion;
      expect(roles).not.toContain('motion-scale');
      expect(styles).toMatch(
        /@media \(prefers-reduced-motion: reduce\) \{\s*:root \{\s*--tp-motion-scale: 0;\s*--tp-motion-play-state: paused;/u,
      );
    });

    // Default presentation motion resolves duration and easing roles; zero durations suppress
    // motion. Exempt: Text motion's stagger property default and the scroll-driven fade whose
    // nominal timing never plays. The easing editor edits curves, so their notation is its data.
    const exempt: Record<string, readonly string[]> = {
      'components/text-motion/piece-styles.ts': ['30ms'],
      'presentation/recipes/message-scroller.ts': ['1ms', 'ease-in-out'],
    };
    const sources = ['components', 'widgets', 'presentation'].flatMap((root) =>
      readdirSync(new URL(`../${root}/`, import.meta.url), { recursive: true })
        .map(String)
        .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
        .filter((file) => !(root === 'widgets' && file.startsWith('easing-editor/')))
        .map((file) => {
          const path = `${root}/${file}`;
          const text = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
            .replace(/\/\*[\s\S]*?\*\//gu, '')
            .replace(/^\s*\/\/.*$/gmu, '');
          return [path, text] as const;
        }),
    );

    it('keeps literal durations and curves out of components, widgets and recipes', () => {
      const offenders = sources.flatMap(([path, text]) =>
        [
          ...text.matchAll(/(?<![\w.#-])(?:\d*\.\d+|\d+)m?s\b/gu),
          ...text.matchAll(/\bease(?:-in-out|-in|-out)?\b(?![\w(-])/gu),
          ...text.matchAll(/cubic-bezier\(/gu),
        ]
          .map((match) => match[0])
          .filter((literal) => !/^0+(?:\.0+)?m?s$/u.test(literal))
          .filter((literal) => !exempt[path]?.includes(literal))
          .map((literal) => `${path}: ${literal}`),
      );
      expect(offenders).toEqual([]);
    });
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
