import { describe, expect, it } from 'vitest';
import { TEXT_MECHANICS_INHERITED, textMechanicsCss } from './mechanics.js';

/** Each rule of a sheet as its selector and its declarations. */
function rules(css: string): Map<string, Record<string, string>> {
  const found = new Map<string, Record<string, string>>();
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
    const declarations: Record<string, string> = {};
    for (const declaration of body!.split(';')) {
      const [name, ...value] = declaration.split(':');
      if (name?.trim() && value.length > 0) declarations[name.trim()] = value.join(':').trim();
    }
    found.set(selector!.trim(), { ...found.get(selector!.trim()), ...declarations });
  }
  return found;
}

describe('uwg-te-req-pres-2: the editing mechanics every engine and the preview share', () => {
  it('is the pinned text, scoped to the given root', () => {
    expect(textMechanicsCss('R')).toBe(`R {
  white-space: pre-wrap;
  overflow-wrap: break-word;
  font-variant-ligatures: none;
}
R .tp-te-code-block {
  white-space: pre-wrap;
  tab-size: 2;
}
R [contenteditable="false"] {
  white-space: normal;
  user-select: none;
}
R:dir(ltr) {
  --tp-te-direction: ltr;
}
R:dir(rtl) {
  --tp-te-direction: rtl;
}
R .tp-te-list .tp-te-list {
  direction: var(--tp-te-direction);
}
`);
  });

  it('writes the root’s own rule from the inherited mechanics, which the widget also writes while generated styles are suppressed', () => {
    expect(TEXT_MECHANICS_INHERITED).toEqual({
      'white-space': 'pre-wrap',
      'overflow-wrap': 'break-word',
      'font-variant-ligatures': 'none',
    });
    expect(rules(textMechanicsCss('R')).get('R')).toEqual(TEXT_MECHANICS_INHERITED);
  });

  it('scopes every rule to the root and names no color', () => {
    const css = textMechanicsCss('[data-root]');
    for (const selector of rules(css).keys()) expect(selector.startsWith('[data-root]')).toBe(true);
    expect(css).not.toMatch(/color|background|#[0-9a-f]{3}/iu);
  });
});

describe('uwg-te-req-pres-2: list containers are laid out in the widget’s direction', () => {
  it('the root records the direction it inherits, which every list inside a list takes', () => {
    const found = rules(textMechanicsCss('.root'));
    expect(found.get('.root:dir(ltr)')).toEqual({ '--tp-te-direction': 'ltr' });
    expect(found.get('.root:dir(rtl)')).toEqual({ '--tp-te-direction': 'rtl' });
    expect(found.get('.root .tp-te-list .tp-te-list')).toEqual({
      direction: 'var(--tp-te-direction)',
    });
  });

  it('sets no direction on the root, on items or on the blocks in them', () => {
    for (const [selector, declarations] of rules(textMechanicsCss('.root')))
      if (!selector.endsWith('.tp-te-list .tp-te-list'))
        expect(Object.hasOwn(declarations, 'direction'), selector).toBe(false);
  });
});
