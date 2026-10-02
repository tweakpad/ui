import { describe, expect, it } from 'vitest';
import { resolveLocale } from './services.js';
function element(lang: string | null, parentNode: Node | null = null): Element {
  return {
    nodeType: 1,
    parentNode,
    getAttribute: (name: string) => (name === 'lang' ? lang : null),
    ownerDocument: { documentElement: { lang: 'en' } },
  } as unknown as Element;
}
describe('composed locale ownership', () => {
  it('uses closest supplied language across shadow and assigned slots', () => {
    const owner = element('de-DE');
    const shadow = { nodeType: 11, host: owner, parentNode: null } as unknown as ShadowRoot;
    const slot = element(null, shadow);
    const slotted = element(null);
    Object.assign(slotted, { assignedSlot: slot });
    expect(resolveLocale(slotted)).toBe('de-DE');
    expect(resolveLocale(element('fr-FR', shadow))).toBe('fr-FR');
  });
  it('falls back to owning document and ignores empty language owners', () => {
    expect(resolveLocale(element(''))).toBe('en');
    const owner = element(null);
    Object.assign(owner, { ownerDocument: { documentElement: { lang: '' } } });
    expect(resolveLocale(owner)).toBeUndefined();
  });
});
