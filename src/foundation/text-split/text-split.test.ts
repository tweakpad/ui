import { describe, expect, it } from 'vitest';
import { groupLines } from './lines.js';
import { isJoinedScript, strongDirection } from './scripts.js';
import { graphemes, splitChunk, tokenize } from './segment.js';

describe('text segmentation', () => {
  it('keeps whitespace as separate tokens', () => {
    expect(tokenize('Quiet  spaces,\nopen')).toEqual([
      { text: 'Quiet', space: false },
      { text: '  ', space: true },
      { text: 'spaces,', space: false },
      { text: '\n', space: true },
      { text: 'open', space: false },
    ]);
  });

  it('keeps punctuation with its word and breaks only where lines already may', () => {
    expect(splitChunk('world!')).toEqual(['world!']);
    expect(splitChunk('“quoted”')).toEqual(['“quoted”']);
    expect(splitChunk('well-known')).toEqual(['well-', 'known']);
    expect(splitChunk('this—that')).toEqual(['this—', 'that']);
    expect(splitChunk('-5')).toEqual(['-5']);
  });

  it('splits scripts written without spaces at word boundaries', () => {
    const words = splitChunk('静かな空間。', 'ja');
    expect(words.join('')).toBe('静かな空間。');
    expect(words.length).toBeGreaterThan(1);
    expect(words.at(-1)!.endsWith('。')).toBe(true);
  });

  it('never divides grapheme clusters', () => {
    expect(graphemes('éa')).toEqual(['é', 'a']);
    expect(graphemes('👩‍👩‍👧 🇯🇵')).toEqual(['👩‍👩‍👧', ' ', '🇯🇵']);
  });
});

describe('scripts', () => {
  it('recognises scripts that join or reorder when shaped', () => {
    expect(isJoinedScript('مرحبا')).toBe(true);
    expect(isJoinedScript('नमस्ते')).toBe(true);
    expect(isJoinedScript('Hello')).toBe(false);
    expect(isJoinedScript('שלום')).toBe(false);
  });

  it('reads the first strong direction', () => {
    expect(strongDirection('שלום')).toBe('rtl');
    expect(strongDirection('123 abc')).toBe('ltr');
    expect(strongDirection('— 42 —')).toBeNull();
  });
});

describe('line grouping', () => {
  it('groups boxes by block position in document order', () => {
    const box = (top: number, height = 20) => ({ top, bottom: top + height });
    expect(groupLines([box(0), box(0), box(24), box(24), box(48)])).toEqual([0, 0, 1, 1, 2]);
  });

  it('keeps taller or raised pieces on the line they share', () => {
    expect(
      groupLines([
        { top: 10, bottom: 30 },
        { top: 0, bottom: 34 },
        { top: 6, bottom: 20 },
        { top: 40, bottom: 60 },
      ]),
    ).toEqual([0, 0, 0, 1]);
  });

  it('groups right-to-left lines the same way', () => {
    // Inline position is irrelevant: only the block position decides.
    const boxes = [
      { top: 0, bottom: 20 },
      { top: 0, bottom: 20 },
      { top: 22, bottom: 42 },
    ];
    expect(groupLines(boxes)).toEqual([0, 0, 1]);
  });
});
