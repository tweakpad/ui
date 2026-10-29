import { describe, expect, it } from 'vitest';
import { inputPresentation } from './families/input.js';
import { inputGroupAppearance } from './recipes/input-group.js';
import { resolveComponentPresentation } from './resolver.js';
import { inlineControlSurface } from './recipes/shared/inline-control.js';
import { joinedEditor } from './recipes/shared/text-control.js';

const resolve = (variant: string) =>
  resolveComponentPresentation(
    inputPresentation.definition,
    { variant },
    inputPresentation.appearance,
  );

describe('Input inline variant', () => {
  it('resolves every variant key from the dictionary', () => {
    for (const variant of ['default', 'inline'])
      expect(resolve(variant).missingKeys.filter((key) => key.includes('-variant-'))).toEqual([]);
  });

  it('paints the row as the shared inline row, ringing on focus within', () => {
    const row = resolve('inline').parts['input-row']!;
    expect(row[0]!.declarations).toMatchObject({ background: inlineControlSurface.background });
    expect(row.some((rule) => rule.selector === '&:focus-within')).toBe(true);
    expect(resolve('default').parts['input-row']).toEqual([]);
  });

  it('joins the editor to the row as an Input group joins its control', () => {
    const editor = resolve('inline').parts.input!;
    expect(editor.some((rule) => rule.declarations === joinedEditor)).toBe(true);
    expect(
      inputGroupAppearance['input-group-control']!.some(
        (rule) => rule.declarations === joinedEditor,
      ),
    ).toBe(true);
  });
});
