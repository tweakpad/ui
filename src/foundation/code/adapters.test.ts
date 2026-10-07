import { describe, expect, it, vi } from 'vitest';
import { createShikiHighlighter, type ShikiHighlighterLike } from './adapters/shiki.js';
import { copyText } from './clipboard.js';
import { parseLineRanges } from './ranges.js';
import { tokenize } from './tokenizer.js';
import type { CodeHighlighter } from './types.js';

const signal = new AbortController().signal;

describe('line ranges', () => {
  it('parses lists and ranges and ignores invalid parts', () => {
    expect([...parseLineRanges('1, 3-5,8')]).toEqual([1, 3, 4, 5, 8]);
    expect([...parseLineRanges('0,5-3,x,2-,7')]).toEqual([7]);
    expect(parseLineRanges(null).size).toBe(0);
    expect(parseLineRanges('').size).toBe(0);
  });
});

describe('Shiki adapter', () => {
  const themes = { light: 'github-light', dark: 'github-dark' };
  const stub = (tokens: ReturnType<ShikiHighlighterLike['codeToTokens']>['tokens']) => {
    const codeToTokens = vi.fn(() => ({ tokens }));
    return {
      codeToTokens,
      getLoadedLanguages: () => ['typescript', 'ts'],
    } satisfies ShikiHighlighterLike;
  };

  it('maps codeToTokens htmlStyle colors (Shiki default output) to light and dark', () => {
    const shiki = stub([
      [
        { content: 'const', htmlStyle: { color: '#D73A49', '--shiki-dark': '#F97583' } },
        { content: ' a', htmlStyle: { color: '#24292E', '--shiki-dark': '#E1E4E8' } },
        { content: '// x', htmlStyle: { color: '#6A737D', 'font-style': 'italic' } },
      ],
      [],
    ]);
    const result = createShikiHighlighter(shiki, { themes }).highlight('const a// x\n', 'TS', {
      signal,
    });
    expect(shiki.codeToTokens).toHaveBeenCalledWith('const a// x\n', { lang: 'ts', themes });
    expect(result).toEqual({
      language: 'ts',
      lines: [
        [
          { text: 'const', light: '#D73A49', dark: '#F97583' },
          { text: ' a', light: '#24292E', dark: '#E1E4E8' },
          { text: '// x', light: '#6A737D', dark: '#6A737D', fontStyle: 'italic' },
        ],
      ],
    });
  });

  it('maps codeToTokensWithThemes variants and FontStyle flags', () => {
    const shiki = stub([
      [
        {
          content: 'x',
          variants: { light: { color: '#111', fontStyle: 2 }, dark: { color: '#eee' } },
        },
        { content: 'y', color: '#222', fontStyle: 4 },
        { content: '' },
      ],
    ]);
    const result = createShikiHighlighter(shiki, { themes }).highlight('xy', 'ts', { signal });
    expect(result).toEqual({
      language: 'ts',
      lines: [
        [
          { text: 'x', light: '#111', dark: '#eee', fontStyle: 'bold' },
          { text: 'y', light: '#222', dark: '#222', fontStyle: 'underline' },
        ],
      ],
    });
  });

  it('falls back for languages Shiki has not loaded or cannot tokenize, and keeps plain text', () => {
    const shiki = stub([]);
    const fallback: CodeHighlighter = { highlight: vi.fn((code) => tokenize(code, 'css')) };
    const adapter = createShikiHighlighter(shiki, { themes, fallback });
    expect(adapter.languages).toEqual(['typescript', 'ts']);
    adapter.highlight('a{}', 'css', { signal });
    expect(fallback.highlight).toHaveBeenCalledWith('a{}', 'css', { signal });
    expect(shiki.codeToTokens).not.toHaveBeenCalled();
    shiki.codeToTokens.mockImplementationOnce(() => {
      throw new Error('grammar');
    });
    adapter.highlight('x', 'ts', { signal });
    expect(fallback.highlight).toHaveBeenCalledTimes(2);
    expect(adapter.highlight('a\n', 'text', { signal })).toEqual({
      language: 'text',
      lines: [[{ text: 'a' }]],
    });
    const defaulted = createShikiHighlighter({ codeToTokens: () => ({ tokens: [] }) }, { themes });
    expect(defaulted.languages).toBeUndefined();
  });
});

describe('copyText', () => {
  function documentStub(clipboard?: { writeText: (text: string) => Promise<void> }) {
    const appended: unknown[] = [];
    const area = {
      value: '',
      style: {} as Record<string, string>,
      setAttribute: vi.fn(),
      focus: vi.fn(),
      select: vi.fn(),
      remove: vi.fn(),
    };
    const document = {
      defaultView: { navigator: { clipboard } },
      activeElement: null,
      body: { append: (node: unknown) => appended.push(node) },
      createElement: vi.fn(() => area),
      execCommand: vi.fn(() => true),
    };
    return { document: document as unknown as Document, area, appended };
  }

  it('uses the Clipboard API when it is available', async () => {
    const writeText = vi.fn(async () => {});
    const { document } = documentStub({ writeText });
    await expect(copyText(document, 'npm i')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('npm i');
    expect(document.createElement).not.toHaveBeenCalled();
  });

  it('falls back to a hidden text area when the Clipboard API rejects or is missing', async () => {
    const rejected = documentStub({
      writeText: vi.fn(async () => Promise.reject(new Error('denied'))),
    });
    await expect(copyText(rejected.document, 'x')).resolves.toBe(true);
    expect(rejected.area.value).toBe('x');
    expect(rejected.area.select).toHaveBeenCalled();
    expect(rejected.area.remove).toHaveBeenCalled();
    const missing = documentStub();
    (missing.document.execCommand as ReturnType<typeof vi.fn>).mockReturnValue(false);
    await expect(copyText(missing.document, 'y')).resolves.toBe(false);
  });

  it('never throws', async () => {
    const broken = {
      defaultView: null,
      createElement: () => {
        throw new Error('no dom');
      },
    };
    await expect(copyText(broken as unknown as Document, 'z')).resolves.toBe(false);
  });
});
