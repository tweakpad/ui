import { describe, expect, it, vi } from 'vitest';
import {
  SearchRun,
  SearchableMap,
  TextIndex,
  createIndexSource,
  foldText,
  matchText,
  splitByRanges,
  termRanges,
  tokenize,
  type SearchHit,
  type SearchSource,
} from './index.js';

/** Optimal string alignment distance: Levenshtein plus adjacent swaps. */
function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i]![j] = Math.min(
        d[i - 1]![j]! + 1,
        d[i]![j - 1]! + 1,
        d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1);
    }
  return d[a.length]![b.length]!;
}

const fruits = [
  'Apple',
  'Apricot',
  'Banana',
  'Blackberry',
  'Blueberry',
  'Cherry',
  'Raspberry',
  'Strawberry',
  'Pineapple',
  'Passion fruit',
];

describe('folding and tokens', () => {
  it('folds case and accents and keeps original offsets', () => {
    expect(foldText('Crème Brûlée')).toBe('creme brulee');
    const tokens = tokenize('Crème  brûlée, café');
    expect(tokens.map((token) => token.term)).toEqual(['creme', 'brulee', 'cafe']);
    expect(tokens.map((token) => [token.start, token.end])).toEqual([
      [0, 5],
      [7, 13],
      [15, 19],
    ]);
  });

  it('lowercases for the locale before removing marks', () => {
    expect(foldText('İzmir', 'tr')).toBe('izmir');
    expect(foldText('Isparta', 'tr')).toBe('ısparta');
  });

  it('segments scripts written without spaces into words', () => {
    expect(tokenize('東京都の天気', 'ja').length).toBeGreaterThan(1);
  });
});

describe('SearchableMap', () => {
  it('sets, gets, deletes and enumerates prefixes', () => {
    const map = new SearchableMap<number>();
    ['romane', 'romanus', 'romulus', 'rubens', 'ruber', 'rubicon', 'rubicundus', 'rom'].forEach(
      (key, index) => map.set(key, index),
    );
    expect(map.size).toBe(8);
    expect(map.get('romulus')).toBe(2);
    expect(map.get('roma')).toBeUndefined();
    expect([...map.atPrefix('rub')].map(([key]) => key).sort()).toEqual([
      'rubens',
      'ruber',
      'rubicon',
      'rubicundus',
    ]);
    expect([...map.atPrefix('rubic')].map(([key]) => key).sort()).toEqual([
      'rubicon',
      'rubicundus',
    ]);
    expect([...map.atPrefix('x')]).toEqual([]);
    expect(map.delete('rom')).toBe(true);
    expect(map.delete('rom')).toBe(false);
    expect(map.get('romane')).toBe(0);
    for (const key of ['romane', 'romanus', 'romulus', 'rubens', 'ruber', 'rubicon', 'rubicundus'])
      map.delete(key);
    expect(map.size).toBe(0);
    expect([...map.entries()]).toEqual([]);
  });

  it('finds exactly the keys within the edit distance', () => {
    const words = [
      'apple',
      'apply',
      'ample',
      'maple',
      'appeal',
      'raspberry',
      'rasberry',
      'strawberry',
      'banana',
      'bandana',
      'cherry',
      'sherry',
      'berry',
      'a',
      'ab',
      'abc',
      'open',
      'opne',
      'paris',
      'aprsi',
    ];
    const map = new SearchableMap<string>();
    for (const word of words) map.set(word, word);
    for (const query of ['apple', 'rasberry', 'banan', 'chery', 'a', 'xyz', 'opne', 'pairs', 'ba'])
      for (const distance of [0, 1, 2, 3]) {
        const found = map.fuzzyGet(query, distance);
        const expected = words.filter((word) => editDistance(query, word) <= distance);
        expect([...found.keys()].sort()).toEqual(expected.sort());
        for (const [word, [, edits]] of found) expect(edits).toBe(editDistance(query, word));
      }
  });
});

describe('TextIndex', () => {
  const index = new TextIndex<string>();
  index.addAll(fruits);

  it('returns every item in order for an empty query', () => {
    expect(index.search('').map((hit) => hit.item)).toEqual(fruits);
  });

  it('matches prefixes and ranks exact words first', () => {
    const items = index.search('app').map((hit) => hit.item);
    expect(items[0]).toBe('Apple');
    expect(items).toEqual(['Apple', 'Pineapple']);
    expect(index.search('apple').map((hit) => hit.item)[0]).toBe('Apple');
  });

  it('tolerates typos within the fuzzy bound', () => {
    expect(index.search('rasberry').map((hit) => hit.item)[0]).toBe('Raspberry');
    expect(index.search('bananna').map((hit) => hit.item)).toEqual(['Banana']);
    expect(index.search('rasberry', { fuzzy: false })).toEqual([]);
    // Two letters typed in the wrong order cost one edit.
    expect(index.search('chrery').map((hit) => hit.item)).toEqual(['Cherry']);
  });

  it('combines query terms with AND by default and OR on request', () => {
    expect(index.search('passion fruit').map((hit) => hit.item)).toEqual(['Passion fruit']);
    expect(index.search('passion apple')).toEqual([]);
    expect(
      index
        .search('passion apple', { combineWith: 'OR' })
        .map((hit) => hit.item)
        .sort(),
    ).toEqual(['Apple', 'Passion fruit', 'Pineapple']);
  });

  it('reports matched ranges in the original text', () => {
    const hit = index.search('bluebery')[0]!;
    expect(hit.item).toBe('Blueberry');
    expect(hit.matches).toEqual([{ field: 'text', ranges: [[0, 9]] }]);
    const prefix = index.search('straw')[0]!;
    expect(prefix.matches![0]!.ranges).toEqual([[0, 5]]);
  });

  it('keeps ranges on accented originals', () => {
    const accented = new TextIndex<string>();
    accented.addAll(['Crème brûlée', 'Café au lait']);
    const hit = accented.search('creme bru')[0]!;
    expect(hit.item).toBe('Crème brûlée');
    expect(hit.matches![0]!.ranges).toEqual([
      [0, 5],
      [6, 9],
    ]);
  });

  it('indexes several fields with boosts', () => {
    interface Command {
      name: string;
      keywords: string[];
    }
    const commands: Command[] = [
      { name: 'Open file', keywords: ['load'] },
      { name: 'Load preset', keywords: ['open'] },
    ];
    const byField = new TextIndex<Command>({
      fields: ['name', 'keywords'],
      boost: { name: 2 },
    });
    byField.addAll(commands);
    expect(byField.search('open').map((hit) => hit.item.name)).toEqual([
      'Open file',
      'Load preset',
    ]);
    expect(byField.search('load').map((hit) => hit.item.name)).toEqual([
      'Load preset',
      'Open file',
    ]);
  });

  it('removes and replaces documents consistently', () => {
    const items = new TextIndex<{ id: number; text: string }>({ getId: (item) => item.id });
    items.addAll([
      { id: 1, text: 'alpha beta' },
      { id: 2, text: 'alpha gamma' },
    ]);
    expect(items.search('alpha')).toHaveLength(2);
    items.discard(1);
    expect(items.search('beta')).toEqual([]);
    expect(items.search('alpha').map((hit) => hit.id)).toEqual([2]);
    items.replace({ id: 2, text: 'delta' });
    expect(items.search('alpha')).toEqual([]);
    expect(items.search('delta').map((hit) => hit.id)).toEqual([2]);
    expect(items.termCount).toBe(1);
  });

  it('matches inside words below prefix matches', () => {
    const hits = index.search('berry');
    expect(hits.map((hit) => hit.item).sort()).toEqual([
      'Blackberry',
      'Blueberry',
      'Raspberry',
      'Strawberry',
    ]);
    expect(hits.find((hit) => hit.item === 'Blueberry')!.matches![0]!.ranges).toEqual([[4, 9]]);
    const apple = index.search('apple').map((hit) => hit.item);
    expect(apple.indexOf('Apple')).toBeLessThan(apple.indexOf('Pineapple'));
    expect(index.search('ber', { infix: false })).toEqual([]);
  });

  it('applies filter and limit after ranking', () => {
    expect(index.search('berry', { limit: 2 })).toHaveLength(2);
    expect(
      index
        .search('berry', { filter: (item) => item.startsWith('B') })
        .every((hit) => hit.item.startsWith('B')),
    ).toBe(true);
  });
});

describe('exact matching modes', () => {
  it('contains, prefix and exact return ranges', () => {
    expect(matchText('Pineapple', 'apple', 'contains')).toEqual([[4, 9]]);
    expect(matchText('Pineapple', 'apple', 'prefix')).toBeNull();
    expect(matchText('New York', 'yo ne', 'prefix')).toEqual([
      [0, 2],
      [4, 6],
    ]);
    expect(matchText('Apple', 'apple', 'exact')).toEqual([[0, 5]]);
    expect(matchText('Apple pie', 'apple', 'exact')).toBeNull();
    expect(matchText('Café', 'cafe', 'contains')).toEqual([[0, 4]]);
    expect(matchText('anything', '', 'exact')).toEqual([]);
  });

  it('derives ranges from matched terms', () => {
    expect(termRanges('Blue berry pie', ['berry', 'pi'])).toEqual([
      [5, 10],
      [11, 13],
    ]);
  });

  it('splits text into matched runs', () => {
    expect(splitByRanges('Raspberry', [[0, 3]])).toEqual([
      { text: 'Ras', match: true },
      { text: 'pberry', match: false },
    ]);
  });
});

describe('SearchRun', () => {
  const run = <T>() => {
    const results: Array<{ query: string; hits: SearchHit<T>[] }> = [];
    const statuses: string[] = [];
    const search = new SearchRun<T>({
      results: (hits, query) => results.push({ query, hits }),
      status: (status) => statuses.push(status),
    });
    return { search, results, statuses };
  };

  it('settles synchronous sources immediately', () => {
    const { search, results, statuses } = run<string>();
    search.request(createIndexSource(fruits), 'cher');
    expect(results.map((entry) => entry.hits.map((hit) => hit.item))).toEqual([['Cherry']]);
    expect(statuses).toEqual(['loaded']);
  });

  it('commits only the latest query and aborts superseded ones', async () => {
    const { search, results, statuses } = run<string>();
    const signals: AbortSignal[] = [];
    const source: SearchSource<string> = {
      search: (query, context) => {
        signals.push(context.signal);
        return new Promise((resolve) =>
          setTimeout(() => resolve([`${query}!`]), query === 'a' ? 30 : 5),
        );
      },
    };
    search.request(source, 'a');
    search.request(source, 'ab');
    expect(signals[0]!.aborted).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(results.map((entry) => entry.query)).toEqual(['ab']);
    expect(statuses).toEqual(['loading', 'loading', 'loaded']);
  });

  it('waits for the delay and reports errors', async () => {
    vi.useFakeTimers();
    try {
      const { search, statuses } = run<string>();
      const calls: string[] = [];
      const source: SearchSource<string> = {
        search: (query) => {
          calls.push(query);
          return Promise.reject(new Error('down'));
        },
      };
      search.request(source, 'a', { delay: 200 });
      search.request(source, 'ab', { delay: 200 });
      vi.advanceTimersByTime(199);
      expect(calls).toEqual([]);
      vi.advanceTimersByTime(1);
      expect(calls).toEqual(['ab']);
      await vi.runAllTimersAsync();
      expect(statuses.at(-1)).toBe('error');
      expect((search.error as Error).message).toBe('down');
    } finally {
      vi.useRealTimers();
    }
  });
});
