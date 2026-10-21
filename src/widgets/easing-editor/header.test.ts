import { describe, expect, it } from 'vitest';
import { togglePresentation } from '../../presentation/families/toggle.js';
import { easingEditorAppearance } from '../../presentation/recipes/easing-editor.js';
import { templateMarkup } from '../../template-markup.test.js';
import { TpEasingEditor } from './easing-editor.js';

describe('easing editor header', () => {
  it('shows the compact presets Toggle at the small icon size (`uwg-ee-tab-anatomy-r7-c1-p`, `req-cl-145-size`)', () => {
    const editor = new TpEasingEditor();
    editor.layout = 'compact';
    const text = templateMarkup((editor as unknown as { render(): unknown }).render());
    const toggle = /<tp-toggle class="presets-toggle"[^>]*>/.exec(text)?.[0];
    expect(toggle).toBeDefined();
    expect(toggle).toContain(' size="icon-sm"');
  });

  it('keeps no square box of its own for the presets Toggle (`req-cl-145-size`)', () => {
    expect(easingEditorAppearance['easing-editor-presets-toggle']).toEqual([]);
    // The Toggle's own icon size is the square box at the small step.
    expect(togglePresentation.appearance['toggle-size-icon-sm']?.[0]?.declarations).toMatchObject({
      'padding-inline': '0',
      'block-size': 'var(--tp-control-height-sm)',
      'inline-size': 'var(--tp-control-height-sm)',
      'min-inline-size': 'var(--tp-control-height-sm)',
    });
  });
});
