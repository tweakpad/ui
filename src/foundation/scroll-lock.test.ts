import { describe, expect, it } from 'vitest';
import { acquireScrollLock } from './scroll-lock.js';

function fakeDocument(innerWidth = 820, clientWidth = 800, padding = '4px') {
  const declarations = new Map<string, { value: string; priority: string }>();
  const style = {
    getPropertyValue: (name: string) => declarations.get(name)?.value ?? '',
    getPropertyPriority: (name: string) => declarations.get(name)?.priority ?? '',
    setProperty: (name: string, value: string, priority = '') =>
      void declarations.set(name, { value, priority }),
    removeProperty: (name: string) => void declarations.delete(name),
  };
  const view = { innerWidth, getComputedStyle: () => ({ getPropertyValue: () => padding }) };
  const document = {
    documentElement: { style, clientWidth },
    defaultView: view,
  } as unknown as Document;
  return { document, style };
}

describe('scroll lock', () => {
  it('hides overflow, compensates the scrollbar gutter and restores on the last release', () => {
    const { document, style } = fakeDocument();
    style.setProperty('overflow', 'auto', 'important');
    const first = acquireScrollLock(document);
    const second = acquireScrollLock(document);
    expect([
      style.getPropertyValue('overflow'),
      style.getPropertyValue('padding-inline-end'),
    ]).toEqual(['hidden', '24px']);
    first();
    expect(style.getPropertyValue('overflow')).toBe('hidden');
    second();
    expect([
      style.getPropertyValue('overflow'),
      style.getPropertyPriority('overflow'),
      style.getPropertyValue('padding-inline-end'),
    ]).toEqual(['auto', 'important', '']);
  });

  it('leaves declarations a consumer rewrote while locked', () => {
    const { document, style } = fakeDocument(800, 800);
    const release = acquireScrollLock(document);
    style.setProperty('overflow', 'scroll');
    release();
    expect(style.getPropertyValue('overflow')).toBe('scroll');
    expect(style.getPropertyValue('padding-inline-end')).toBe('');
  });
});
