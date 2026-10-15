import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  hideVisually,
  visuallyHiddenDeclarations,
  visuallyHiddenRule,
  visuallyHiddenText,
} from './visually-hidden.js';

const declarationsOf = (block: string) =>
  Object.fromEntries(
    block
      .split(';')
      .map((declaration) => declaration.trim())
      .filter(Boolean)
      .map((declaration) => {
        const [property, ...value] = declaration.split(':');
        return [property!.trim(), value.join(':').trim()];
      }),
  );

describe('visually hidden declarations', () => {
  it('clip a 1px box that takes no layout space', () => {
    expect(visuallyHiddenDeclarations).toEqual({
      display: 'block',
      position: 'absolute',
      'inline-size': '1px',
      'block-size': '1px',
      'margin-block': '-1px 0',
      'margin-inline': '0',
      padding: '0',
      border: '0',
      overflow: 'hidden',
      'clip-path': 'inset(50%)',
      'white-space': 'nowrap',
    });
    expect(Object.isFrozen(visuallyHiddenDeclarations)).toBe(true);
  });

  it('serialize as text and rules, optionally important', () => {
    expect(declarationsOf(visuallyHiddenText())).toEqual(visuallyHiddenDeclarations);
    const important = declarationsOf(visuallyHiddenText({ important: true }));
    for (const [property, value] of Object.entries(visuallyHiddenDeclarations))
      expect(important[property]).toBe(`${value} !important`);
    expect(visuallyHiddenRule('.visually-hidden')).toBe(
      `.visually-hidden:not(:where([hidden])) { ${visuallyHiddenText()} }`,
    );
  });

  it('hide an element through inline declarations', () => {
    const style = new Map<string, string>();
    hideVisually({
      style: { setProperty: (property: string, value: string) => style.set(property, value) },
    } as unknown as HTMLElement);
    expect(Object.fromEntries(style)).toEqual(visuallyHiddenDeclarations);
  });

  it('are the declarations the library stylesheet applies to tp-visually-hidden', () => {
    const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
    const block = /^tp-visually-hidden:not\(:where\(\[hidden\]\)\) \{([^}]*)\}/m.exec(styles)?.[1];
    expect(block).toBeDefined();
    expect(declarationsOf(block!)).toEqual(visuallyHiddenDeclarations);
  });
});
