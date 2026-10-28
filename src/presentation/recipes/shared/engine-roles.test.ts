import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkIcon } from '../../../icons/check.js';
import { minusIcon } from '../../../icons/minus.js';
import { serializeDeclarations } from '../../resolver.js';
import type { PresentationDeclarations } from '../../resolver.js';

// Each case imports what it tests, so a missing set fails only its own case.

/** The `index`-th rule that a family golden holds under a dictionary key, as the generator wrote it. */
function goldenRule(family: string, key: string, index: number): string | undefined {
  const lines = readFileSync(
    new URL(`../__goldens__/${family}.css`, import.meta.url),
    'utf8',
  ).split('\n');
  const start = lines.indexOf(`/* ${key} */`);
  if (start < 0) return undefined;
  const end = lines.findIndex((line, at) => at > start && (line === '' || line.startsWith('/* ')));
  return lines.slice(start + 1, end < 0 ? undefined : end)[index];
}

/** A recipe source next to this folder. */
function recipeSource(name: string): string {
  return readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
}

/** A rule on the part itself, as the goldens write it. */
function partRule(declarations: PresentationDeclarations): string {
  return `&{${serializeDeclarations(declarations)}}`;
}

/** The SVG document of a `url("data:image/svg+xml,…")` mask. */
function maskDocument(value: string | number | undefined): string {
  const match = /^url\("data:image\/svg\+xml,([^"]*)"\)$/u.exec(String(value));
  return decodeURIComponent(match?.[1] ?? '');
}

describe('engine-role presentation sets', () => {
  it("the code surface and code typography are the Code block figure's, composed by its recipe (`dcp-roles-table-r8`)", async () => {
    const {
      codeFocusRing,
      codeInsetBlock,
      codeInsetInline,
      codeSurface,
      codeSurfaceFill,
      codeTypography,
    } = await import('./code-surface.js');
    const { codeBlockAppearance } = await import('../code-block.js');
    const figure = { ...codeSurface, overflow: 'clip', ...codeTypography };

    expect(partRule(figure)).toBe(goldenRule('code-block', 'code-block', 0));
    expect(Object.entries(codeBlockAppearance['code-block']?.[0]?.declarations ?? {})).toEqual(
      Object.entries(figure),
    );
    expect(codeSurface.background).toBe(codeSurfaceFill);

    const viewport = codeBlockAppearance['code-block-viewport'] ?? [];
    expect(Object.entries(viewport[0]?.declarations ?? {})[0]).toEqual([
      'padding-block',
      codeInsetBlock,
    ]);
    expect(
      viewport.find((rule) => rule.selector === ':host([data-collapsed]) &')?.declarations[
        'max-block-size'
      ],
    ).toBe(`calc(var(--_tp-code-collapsed-lines) * 1lh + ${codeInsetBlock})`);
    expect(viewport.find((rule) => rule.selector === '&:focus-visible')?.declarations).toBe(
      codeFocusRing,
    );
    expect(codeBlockAppearance['code-block-line']?.[0]?.declarations['padding-inline']).toBe(
      codeInsetInline,
    );
    expect(codeBlockAppearance['code-block-line-number']?.[0]?.declarations.background).toBe(
      codeSurfaceFill,
    );

    const source = recipeSource('code-block.ts');
    for (const restated of [
      'var(--tp-card) 50%',
      'var(--tp-radius-xl)',
      'var(--tp-font-mono)',
      '"liga" 0',
      'var(--tp-space-3)',
      '* -1)',
    ])
      expect(source, restated).not.toContain(restated);
  });

  it("the divider line is the Separator's, composed by its recipe (`dcp-roles-table-r12`)", async () => {
    const { dividerLine } = await import('./divider.js');
    const { separatorAppearance } = await import('../separator.js');

    expect(partRule(dividerLine)).toBe(goldenRule('separator', 'separator', 0));
    expect(separatorAppearance.separator?.[0]?.declarations).toBe(dividerLine);
    expect(recipeSource('separator.ts')).not.toContain('var(--tp-border)');
  });

  it('the callout surface is the Alert surface, composed by its recipe (`uwg-te-tab-vocabulary-r17`)', async () => {
    const { calloutSurface } = await import('./callout-surface.js');
    const { alertAppearance } = await import('../alert.js');

    expect(partRule(calloutSurface)).toBe(goldenRule('alert', 'alert', 0));
    expect(alertAppearance.alert?.[0]?.declarations).toBe(calloutSurface);
    const source = recipeSource('alert.ts');
    expect(source).not.toContain("'border-radius'");
    expect(source).not.toContain('background:');
  });

  it('native choices keep their box anatomy (`dcp-roles-table-r5`)', async () => {
    const { nativeChoiceAppearance } = await import('./selection-control.js');

    for (const type of ['checkbox', 'radio'] as const) {
      const rules = nativeChoiceAppearance(type);
      expect(nativeChoiceAppearance(type, 'box')).toEqual(rules);
      for (const { selector = '', declarations } of rules) {
        expect(selector).not.toMatch(/input\[|::after|::before/u);
        expect(Object.keys(declarations).join(' ')).not.toContain('mask');
      }
    }
    // @ts-expect-error a native radio has no anatomy in which the input is its own box
    const radioInput = () => nativeChoiceAppearance('radio', 'input');
    expect(radioInput).toBeTypeOf('function');
  });

  it('a native checkbox that is its own box gets the Checkbox paint and a check mark without an element (`dcp-roles-table-r5`, `dcp-semantics`)', async () => {
    const { checkboxRules, nativeChoiceAppearance } = await import('./selection-control.js');
    const input = '& > input[type="checkbox"]';
    const rules = nativeChoiceAppearance('checkbox', 'input');

    expect(rules.map((rule) => rule.selector)).toEqual([
      input,
      input,
      `${input}:focus-visible`,
      `${input}[aria-invalid="true"]`,
      `${input}[aria-invalid="true"]:focus-visible`,
      '&:has(> input[type="checkbox"]:disabled)',
      input,
      `${input}:checked, ${input}:indeterminate`,
      `${input}:is(:checked, :indeterminate)::after`,
      `${input}:indeterminate::after`,
    ]);
    for (const { selector = '' } of rules) expect(selector).not.toMatch(/\.box|\[data-/u);
    expect(rules[0]?.declarations).toEqual({ appearance: 'none' });

    // The box takes the Checkbox paint itself: the same declarations, in source order.
    const painted = checkboxRules.filter(
      ({ selector = '' }) => selector.includes('.box') || selector.includes('data-disabled'),
    );
    expect(painted).toHaveLength(7);
    painted.forEach((rule, index) =>
      expect(rules[index + 1]?.declarations).toBe(rule.declarations),
    );

    // The mark is a pseudo-element in the mark color, masked by the check icon.
    const mark = rules[8]?.declarations ?? {};
    expect(mark).toEqual({
      content: "''",
      display: 'block',
      'inline-size': '100%',
      'block-size': '100%',
      'background-color': 'currentColor',
      'mask-image': expect.stringMatching(/^url\("data:image\/svg\+xml,[^"]+"\)$/u),
      'mask-position': 'center',
      'mask-size': 'contain',
      'mask-repeat': 'no-repeat',
      'forced-color-adjust': 'none',
    });
    const check = maskDocument(mark['mask-image']);
    const [checkPath] = checkIcon.paths;
    expect(check).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" /u);
    expect(check).toContain(`viewBox="${checkIcon.viewBox}"`);
    expect(check).toContain('fill="none"');
    expect(check).toContain('stroke-linecap="round"');
    expect(check).toContain('stroke-linejoin="round"');
    expect(check).toContain(`d="${checkPath?.d}"`);
    expect(check).toContain(`stroke-width="${checkPath?.strokeWidth}"`);

    // An indeterminate box shows the minus mark instead.
    expect(Object.keys(rules[9]?.declarations ?? {})).toEqual(['mask-image']);
    expect(maskDocument(rules[9]?.declarations['mask-image'])).toContain(
      `d="${minusIcon.paths[0]?.d}"`,
    );
  });

  it('the block cursor shows a caret of one line that takes no space (`uwg-te-tab-vocabulary-r16`, `uwg-te-req-engine-9`)', async () => {
    const recipe = await import('../text-editor.js');

    expect(Object.keys(recipe)).toEqual([
      'textEditorAppearance',
      'textEditorBlockCursorRules',
      'textEditorStructure',
    ]);
    const [caret, ...rest] = recipe.textEditorBlockCursorRules;
    expect(rest).toEqual([]);
    expect(caret?.selector).toBe('& .tp-te-block-cursor');
    expect(caret?.declarations).toEqual({
      position: 'absolute',
      'block-size': '1lh',
      'border-inline-start': 'var(--tp-border-width) var(--tp-border-style) currentColor',
      'pointer-events': 'none',
    });
  });
});
