import { describe, expect, it } from 'vitest';
import { defineElement, type CustomElementConstructorWithTag } from './define.js';

describe('defineElement dependencies', () => {
  it('defines rendered library elements recursively, once, including inherited declarations', () => {
    const defined = new Map<string, unknown>();
    const registry = {
      get: (tag: string) => defined.get(tag),
      define: (tag: string, constructor: unknown) => {
        if (defined.has(tag)) throw new Error(`duplicate ${tag}`);
        defined.set(tag, constructor);
      },
    } as unknown as CustomElementRegistry;
    const element = (tagName: string, dependencies: () => readonly unknown[] = () => []) =>
      Object.defineProperties(function () {}, {
        tagName: { value: tagName },
        elementDependencies: { get: dependencies },
      }) as unknown as CustomElementConstructorWithTag;
    const icon = element('x-icon');
    const spinner = element('x-spinner');
    // A cycle must terminate.
    const a: CustomElementConstructorWithTag = element('x-a', () => [b]);
    const b: CustomElementConstructorWithTag = element('x-b', () => [a, icon]);
    const button = element('x-button', () => [icon, spinner]);
    const derived = Object.setPrototypeOf(
      Object.defineProperties(function () {}, {
        tagName: { value: 'x-derived' },
        elementDependencies: { get: () => [a] },
      }),
      button,
    ) as CustomElementConstructorWithTag;
    defineElement('x-derived', derived, registry);
    expect([...defined.keys()].sort()).toEqual(
      ['x-a', 'x-b', 'x-button', 'x-derived', 'x-icon', 'x-spinner'].filter(
        (tag) => tag !== 'x-button',
      ),
    );
  });
});
