import { describe, expect, it } from 'vitest';
import { matchTrigger } from './triggers.js';

const triggers = ['/', '@'];
const plain = { inCode: false, inLink: false };
const match = (textBefore: string, context = plain) => matchTrigger(textBefore, triggers, context);

describe('matchTrigger (uwg-te-req-inline-2, uwg-te-req-engine-4)', () => {
  it('V-485: matches / and @ at a textblock start and after whitespace', () => {
    expect(match('/')).toEqual({ trigger: '/', query: '', offset: 0 });
    expect(match('@')).toEqual({ trigger: '@', query: '', offset: 0 });
    expect(match('/hea')).toEqual({ trigger: '/', query: 'hea', offset: 0 });
    expect(match('Sort the harbor /tab')).toEqual({ trigger: '/', query: 'tab', offset: 16 });
    expect(match('Ask @mar')).toEqual({ trigger: '@', query: 'mar', offset: 4 });
    // A hard break reaches the matcher as a line feed; tabs and other spaces are whitespace too.
    expect(match('Tide table\n/')).toEqual({ trigger: '/', query: '', offset: 11 });
    expect(match('a\t@b')).toEqual({ trigger: '@', query: 'b', offset: 2 });
    expect(match('a /b')).toEqual({ trigger: '/', query: 'b', offset: 2 });
    expect(match('a　@b')).toEqual({ trigger: '@', query: 'b', offset: 2 });
  });

  it('V-485: never after a letter, in code, in a link or after an atom', () => {
    expect(match('a/')).toBeNull();
    expect(match('name@')).toBeNull();
    expect(match('name@harbor')).toBeNull();
    expect(match('km/h')).toBeNull();
    // Punctuation is not whitespace.
    expect(match('(/')).toBeNull();
    expect(match('"@')).toBeNull();
    // In inline code or a code block, and in a link.
    expect(match('/', { inCode: true, inLink: false })).toBeNull();
    expect(match('Tide /tab', { inCode: true, inLink: false })).toBeNull();
    expect(match('Tide /tab', { inCode: false, inLink: true })).toBeNull();
    // After an inline node (U+FFFC).
    expect(match('￼/')).toBeNull();
    expect(match('Ask ￼@mar')).toBeNull();
    // Characters that are not listed triggers.
    expect(match('#harbor')).toBeNull();
    expect(matchTrigger('/', [], plain)).toBeNull();
    expect(matchTrigger('/', [''], plain)).toBeNull();
  });

  it('V-485: matches the fullwidth forms as / and @', () => {
    expect(match('／')).toEqual({ trigger: '/', query: '', offset: 0 });
    expect(match('Memo ＠ren')).toEqual({ trigger: '@', query: 'ren', offset: 5 });
    expect(match('a／')).toBeNull();
    // Only ASCII triggers have a fullwidth form, and a trigger listed as typed wins.
    expect(matchTrigger('／x', ['/', '／'], plain)).toEqual({
      trigger: '／',
      query: 'x',
      offset: 0,
    });
    expect(matchTrigger('/x', ['／'], plain)).toBeNull();
    expect(matchTrigger('§x', ['§'], plain)).toEqual({ trigger: '§', query: 'x', offset: 0 });
  });

  it('V-485: the query is the text after the trigger and whitespace ends the match', () => {
    expect(match('/table')?.query).toBe('table');
    expect(match('/heading-2')?.query).toBe('heading-2');
    // The query may hold any other character, another trigger included.
    expect(match('//')).toEqual({ trigger: '/', query: '/', offset: 0 });
    expect(match('@ren@')).toEqual({ trigger: '@', query: 'ren@', offset: 0 });
    // Whitespace, and an inline node, end the trigger context.
    expect(match('/table ')).toBeNull();
    expect(match('/two words')).toBeNull();
    expect(match('/table\n')).toBeNull();
    expect(match('/ta￼ble')).toBeNull();
    expect(match('/table￼')).toBeNull();
    expect(match('')).toBeNull();
    expect(match(' ')).toBeNull();
  });

  it('V-485: reads only the last 64 units', () => {
    const q = (length: number) => 'q'.repeat(length);
    // Within the window: after whitespace, and at the start of a text shorter than 64 units.
    expect(match(` /${q(62)}`)).toEqual({ trigger: '/', query: q(62), offset: 1 });
    expect(match(`/${q(62)}`)).toEqual({ trigger: '/', query: q(62), offset: 0 });
    expect(match(`${'x'.repeat(100)} @${q(3)}`)).toEqual({
      trigger: '@',
      query: q(3),
      offset: 101,
    });
    // The space before the trigger is the 65th unit back, outside the window.
    expect(match(` /${q(63)}`)).toBeNull();
    // A text of 64 units may have been cut, so its first unit is not the textblock start.
    expect(match(`/${q(63)}`)).toBeNull();
    expect(match(`/${q(64)}`)).toBeNull();
  });
});
