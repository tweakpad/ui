import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultPresentationDictionary } from './default.js';
import { presentationFamilies } from './families/index.js';
import { fillLayer } from './motion.js';
import { fillColor, fillHidden, fillShown } from './recipes/shared/fill.js';

const backgroundTransition = /\b(background(-color)?|all)\b/;

function sources(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return sources(path);
    return path.endsWith('.ts') && !path.endsWith('.test.ts') ? [path] : [];
  });
}

describe('state fill layer', () => {
  it('never transitions a background in library source', () => {
    const offenders = ['src/components', 'src/presentation'].flatMap((root) =>
      sources(root).flatMap((path) =>
        [
          ...readFileSync(path, 'utf8').matchAll(
            /(?:motionTransition|transitionCss)\(\s*\[([^\]]*)\]|transition(?:-property)?\s*:\s*([^;{}]*)/g,
          ),
        ]
          .filter((match) => backgroundTransition.test(match[1] ?? match[2] ?? ''))
          .map((match) => `${path}: ${match[0]}`),
      ),
    );
    expect(offenders).toEqual([]);
  });

  it('keeps every resolved appearance and structure rule off background transitions', () => {
    const dictionaries = [
      defaultPresentationDictionary,
      ...presentationFamilies.map((family) => family.structure),
    ];
    for (const dictionary of dictionaries)
      for (const rules of Object.values(dictionary))
        for (const rule of rules)
          expect(String(rule.declarations.transition ?? '')).not.toMatch(backgroundTransition);
  });

  it('fades the layer by opacity only', () => {
    expect(fillLayer().transition).toMatch(/^opacity /);
  });

  it('targets the layer of every top-level selector', () => {
    const states = '&:is(:hover, [data-x]):not([data-disabled], :disabled), &[data-active]';
    expect(fillShown(states).selector).toBe(
      '&:is(:hover, [data-x]):not([data-disabled], :disabled)::before, &[data-active]::before',
    );
    expect(fillHidden('&[data-checked]')).toEqual({
      selector: '&[data-checked]::before',
      declarations: { opacity: '0' },
    });
    expect(fillColor('var(--tp-accent)')).toEqual({
      selector: '&::before',
      declarations: { 'background-color': 'var(--tp-accent)' },
    });
  });
});
