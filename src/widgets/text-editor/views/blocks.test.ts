import { describe, expect, it } from 'vitest';
import { textEditorStrings } from '../../../foundation/text-editor/strings.js';
import {
  blockDragText,
  blocksDeletedText,
  blocksDuplicatedText,
  blocksMovedText,
  blocksSelectedText,
  linkCopiedText,
} from '../announcer.js';
import { blockTree } from './block-selection.test.js';
import { blockLabel, blockLink, fragmentBlock } from './blocks.js';

describe('block links and fragments', () => {
  it('links the document URL without its fragment to a block', () => {
    expect(blockLink('https://example.com/notes?a=1#old', 'b-1')).toBe(
      'https://example.com/notes?a=1#b-1',
    );
    expect(blockLink('https://example.com/notes', 'b_2')).toBe('https://example.com/notes#b_2');
  });

  it('names a block from a fragment only when the document holds it', () => {
    const tree = blockTree([
      ['b-1', 'paragraph'],
      ['b 2', 'paragraph'],
    ]);
    expect(fragmentBlock('#b-1', tree)).toBe('b-1');
    expect(fragmentBlock('#b%202', tree)).toBe('b 2');
    expect(fragmentBlock('#missing', tree)).toBeNull();
    expect(fragmentBlock('#%E0%A4%A', tree)).toBeNull();
    expect(fragmentBlock('', tree)).toBeNull();
    expect(fragmentBlock('#b-1', null)).toBeNull();
  });
});

describe('block announcements', () => {
  const strings = textEditorStrings;

  it('names a block by its first line of text, else by its kind', () => {
    expect(blockLabel('\n  Tide pools  \nmore', 'paragraph', strings)).toBe('Tide pools');
    expect(blockLabel('x'.repeat(60), 'paragraph', strings)).toHaveLength(40);
    expect(blockLabel('', 'image', strings)).toBe(strings.image);
    expect(blockLabel('', 'callout', strings)).toBe('callout');
  });

  it('fills the block texts from the strings', () => {
    expect(blocksSelectedText(strings, 3)).toBe('Selected blocks: 3');
    expect(blocksDeletedText(strings, 2)).toBe('Deleted blocks: 2');
    expect(blocksDuplicatedText(strings, 1)).toBe('Duplicated blocks: 1');
    expect(blocksMovedText(strings, ['Tide pools'])).toBe('Moved Tide pools');
    expect(blocksMovedText(strings, ['a', 'b'])).toBe('Moved blocks: 2');
    expect(linkCopiedText(strings, true)).toBe('Link copied');
    expect(linkCopiedText(strings, false)).toBe('The link could not be copied');
  });

  it('names the block, its level and its parent at each drag stage', () => {
    const top = { label: 'Notes', level: 1, parent: null };
    const nested = { label: 'Count', level: 2, parent: 'Survey' };
    expect(blockDragText(strings, 'picked-up', top)).toBe(
      'Picked up Notes, level 1, at the top level.',
    );
    expect(blockDragText(strings, 'over', nested)).toBe('Count at level 2, in Survey.');
    expect(blockDragText(strings, 'dropped', nested)).toBe('Dropped Count at level 2, in Survey.');
    expect(blockDragText(strings, 'cancelled', top)).toBe(
      'Move cancelled. Notes is back at level 1, at the top level.',
    );
  });
});
