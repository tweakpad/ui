import { describe, expect, it } from 'vitest';
import { editorTrees } from './input-group.js';

describe('Input group editor observation', () => {
  it('observes the editor itself, where a text control renders its native editor, and its shadow root', () => {
    const shadowRoot = {};
    const control = { shadowRoot } as unknown as HTMLElement;
    // Input and Text area render the native editor into their light DOM: the group reads its
    // `aria-invalid` and `disabled` there, so the editor's own tree must be observed too.
    expect(editorTrees(control)).toEqual([control, shadowRoot]);
    expect(editorTrees(control)[0]).toBe(control);
  });

  it('observes a native editor without a shadow root as itself', () => {
    const control = { shadowRoot: null } as unknown as HTMLElement;
    expect(editorTrees(control)).toEqual([control]);
  });
});
