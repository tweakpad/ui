/**
 * The editing keys of a code block (Widgets `uwg-te-req-parity-1`, `uwg-te-req-key-3`).
 */
import { describe, expect, it } from 'vitest';
import {
  codeExitText,
  codeLineBreak,
  codeLineIndent,
  indentCode,
  touchedLineStarts,
} from './code-keys.js';

describe('uwg-te-req-parity-1: Tab and Shift+Tab in a code block', () => {
  it('Tab inserts two spaces at a caret, never a tab character', () => {
    expect(indentCode('ab', 1, 1, false)).toEqual({ text: 'a  b', anchor: 3, head: 3 });
  });

  it('Tab indents each line a selection touches; a last line reached at its start is not touched', () => {
    const text = 'one\ntwo\nthree';
    expect(touchedLineStarts(text, 1, 5)).toEqual([0, 4]);
    expect(touchedLineStarts(text, 1, 8)).toEqual([0, 4]);
    expect(indentCode(text, 1, 9, false)).toEqual({
      text: '  one\n  two\n  three',
      anchor: 3,
      head: 15,
    });
    // A selection from a line start keeps the inserted spaces before its start.
    expect(indentCode(text, 4, 6, false)).toEqual({
      text: 'one\n  two\nthree',
      anchor: 6,
      head: 8,
    });
  });

  it('Shift+Tab removes up to two leading spaces from the caret line or each touched line', () => {
    expect(indentCode('   x', 4, 4, true)).toEqual({ text: ' x', anchor: 2, head: 2 });
    expect(indentCode(' x\n    y\nz', 1, 7, true)).toEqual({
      text: 'x\n  y\nz',
      anchor: 0,
      head: 4,
    });
    // A point inside removed spaces goes to where they started; tabs are kept.
    expect(indentCode('  \tq', 1, 1, true)).toEqual({ text: '\tq', anchor: 0, head: 0 });
    expect(indentCode('x\n\ty', 3, 3, true)).toBeNull();
  });
});

describe('uwg-te-req-parity-1: Enter, Shift+Enter and the exit of a code block', () => {
  it('keeps the leading spaces and tabs of the caret line', () => {
    expect(codeLineIndent('a\n \t b', 4)).toBe(' \t ');
    expect(codeLineBreak('if\n  x', 6, 6)).toEqual({ text: 'if\n  x\n  ', anchor: 9, head: 9 });
    expect(codeLineBreak('  ab', 3, 4)).toEqual({ text: '  a\n  ', anchor: 6, head: 6 });
  });

  it('Enter at the end of a text ending with two line breaks leaves the block without them', () => {
    expect(codeExitText('x\n\n', 3)).toBe('x');
    expect(codeExitText('x\n\n', 2)).toBeNull();
    expect(codeExitText('x\n', 2)).toBeNull();
  });
});

describe('uwg-te-req-parity-1: code keys at offset 0 of a text starting with a line break', () => {
  it('offset 0 lies on the empty first line, and line starts are distinct', () => {
    // Line 0 is empty and line 1 is "  foo": the caret at offset 0 is on line 0.
    expect(codeLineIndent('\n  foo', 0)).toBe('');
    expect(codeLineBreak('\n  foo', 0, 0)).toEqual({ text: '\n\n  foo', anchor: 1, head: 1 });
    expect(touchedLineStarts('\nfoo', 0, 4)).toEqual([0, 1]);
    expect(indentCode('\n  foo', 0, 0, true)).toBeNull();
    expect(indentCode('\nfoo', 0, 4, false)).toEqual({ text: '  \n  foo', anchor: 2, head: 8 });
  });
});
