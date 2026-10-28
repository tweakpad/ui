/**
 * The options every engine factory takes (Widgets `uwg-te-par-engine-1`, `uwg-te-tab-engine` r2).
 */
import { describe, expect, it } from 'vitest';
import { nodeOverrides, resolveCss, type TextEditorAdapterOptions } from './options.js';

describe('uwg-te-tab-engine r2: the css option', () => {
  const base = '.root { color: red; }';

  it('a string replaces the base CSS, a function extends it, and without one the base applies', () => {
    expect(resolveCss('.mine {}', base)).toBe('.mine {}');
    expect(resolveCss('', base)).toBe('');
    expect(resolveCss((given) => `${given}\n.extra {}`, base)).toBe(`${base}\n.extra {}`);
    expect(resolveCss(undefined, base)).toBe(base);
  });
});

describe('uwg-te-par-engine-1: the nodes option', () => {
  it('gives the overrides by definition name, or none for a missing or malformed value', () => {
    const overrides = { callout: { name: 'mine' } };
    const options: TextEditorAdapterOptions<{ readonly name: string }> = { nodes: overrides };
    expect(nodeOverrides(options)).toBe(overrides);
    expect(nodeOverrides(undefined)).toEqual({});
    expect(nodeOverrides({})).toEqual({});
    expect(nodeOverrides({ nodes: null } as unknown as typeof options)).toEqual({});
    expect(Object.isFrozen(nodeOverrides(null))).toBe(true);
  });
});
