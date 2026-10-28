/**
 * Shared readers of the module specifiers that sources name (node environment), so that the guard
 * of the widget sources and the guards of the companion entries apply one rule. A `*.test.ts`
 * module stays out of the build; the suite at the end keeps the file from counting as an empty one.
 */
import { describe, expect, it } from 'vitest';

/**
 * Every module specifier a source names: static imports and exports, type-only ones included,
 * and side-effect imports, read at line start (so a `'from'` string inside code is no specifier),
 * and `import('…')` calls, which yield `null` without a string specifier that a rule could check.
 */
export const importSpecifiers = (text: string): (string | null)[] => [
  ...[
    ...text.matchAll(
      /^(?:import|export)\s+[^'"]*?from\s*['"]([^'"]+)['"]|^import\s*['"]([^'"]+)['"]/gmu,
    ),
  ].map((match) => match[1] ?? match[2]!),
  ...[...text.matchAll(/(?<![\w$.])import\s*\(\s*(?:(['"`])([^'"`]*)\1)?/gu)].map(
    (match) => match[2] ?? null,
  ),
];

/** Relative specifiers and Lit's: `lit`, `lit/…` and `@lit/…`. */
export const allowedSpecifier = /^(?:\.\.?\/|lit(?:\/|$)|@lit\/)/u;

/** Whether a src-relative module belongs to the widgets section. */
export const widgetModule = (file: string) =>
  file.startsWith('widgets/') ||
  file === 'presentation/widgets.ts' ||
  file === 'presentation/families/widgets.ts';

describe('source import readers', () => {
  it('reads static, type-only, side-effect and dynamic specifiers, and only at line start', () => {
    const source = [
      "import { a } from './a.js';",
      "import type { B } from 'lit';",
      "export { c } from '../c.js';",
      "import './d.js';",
      'const e = await import("@lit/e");',
      'const f = await import(name);',
      "const g = value === 'from' || other === 'h';",
    ].join('\n');
    expect(importSpecifiers(source)).toEqual([
      './a.js',
      'lit',
      '../c.js',
      './d.js',
      '@lit/e',
      null,
    ]);
    expect(
      ['./a.js', 'lit', 'lit/directives/x.js', '@lit/y', 'other', '@scope/lit'].map((specifier) =>
        allowedSpecifier.test(specifier),
      ),
    ).toEqual([true, true, true, true, false, false]);
    expect(
      ['widgets/flow/flow.ts', 'presentation/widgets.ts', 'foundation/flow/model.ts'].map(
        widgetModule,
      ),
    ).toEqual([true, true, false]);
  });
});
