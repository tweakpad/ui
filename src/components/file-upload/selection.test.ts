import { describe, expect, it, vi } from 'vitest';
import { normalizeAccept } from './accept.js';
import {
  normalizeValidation,
  selectFiles,
  type FileCandidate,
  type SelectionLimits,
} from './selection.js';

const make = (name: string, size = 10, type = '', lastModified = 1) =>
  new File([new Uint8Array(size)], name, { type, lastModified });
const candidate = (file: File, relativePath = ''): FileCandidate => ({
  file,
  relativePath,
  directory: false,
});
const folder = (name: string): FileCandidate => ({
  file: new File([], name),
  relativePath: name,
  directory: true,
});
const limits = (overrides: Partial<SelectionLimits> = {}): SelectionLimits => ({
  accept: normalizeAccept(''),
  multiple: true,
  maxFiles: Number.POSITIVE_INFINITY,
  maxFileSize: null,
  minFileSize: null,
  maxTotalSize: null,
  allowDuplicates: false,
  directory: false,
  ...overrides,
});
const options = (validator?: Parameters<typeof selectFiles>[3]['validator']) => ({
  validator,
  signal: new AbortController().signal,
  errorText: (code: string) => code,
});
const codes = (result: Awaited<ReturnType<typeof selectFiles>>) =>
  result.decisions.map((decision) =>
    decision.accepted ? 'ok' : decision.errors.map((e) => e.code).join('+'),
  );

describe('selectFiles', () => {
  it('collects type and size errors together', async () => {
    const result = await selectFiles(
      [candidate(make('a.pdf', 5)), candidate(make('b.exe', 50)), candidate(make('c.pdf', 1))],
      [],
      limits({ accept: normalizeAccept('.pdf'), maxFileSize: 20, minFileSize: 2 }),
      options(),
    );
    expect(codes(result)).toEqual(['ok', 'file-invalid-type+file-too-large', 'file-too-small']);
  });

  it('rejects duplicates of the value and of earlier batch files unless allowed', async () => {
    const existing = make('a.txt');
    const batch = [candidate(make('a.txt')), candidate(make('b.txt')), candidate(make('b.txt'))];
    expect(codes(await selectFiles(batch, [existing], limits(), options()))).toEqual([
      'file-exists',
      'ok',
      'file-exists',
    ]);
    expect(
      codes(await selectFiles(batch, [existing], limits({ allowDuplicates: true }), options())),
    ).toEqual(['ok', 'ok', 'ok']);
  });

  it('fills the remaining slots and rejects the overflow in batch order', async () => {
    const result = await selectFiles(
      [candidate(make('1')), candidate(make('2.exe')), candidate(make('3')), candidate(make('4'))],
      [make('0')],
      limits({ maxFiles: 3, accept: normalizeAccept('.exe,application/octet-stream') }),
      options(),
    );
    // '1', '3' and '4' have no extension or type: rejected by type before the count applies.
    expect(codes(result)).toEqual([
      'file-invalid-type',
      'ok',
      'file-invalid-type',
      'file-invalid-type',
    ]);
    const counted = await selectFiles(
      [candidate(make('1')), candidate(make('2')), candidate(make('3'))],
      [make('0')],
      limits({ maxFiles: 3 }),
      options(),
    );
    expect(codes(counted)).toEqual(['ok', 'ok', 'too-many-files']);
  });

  it('replaces the single file and accepts only the first valid file of a batch', async () => {
    const result = await selectFiles(
      [candidate(make('bad.exe')), candidate(make('a.pdf')), candidate(make('b.pdf'))],
      [make('old.pdf')],
      limits({ multiple: false, accept: normalizeAccept('.pdf') }),
      options(),
    );
    expect(codes(result)).toEqual(['file-invalid-type', 'ok', 'too-many-files']);
    expect(result.replaces).toBe(true);
    const none = await selectFiles(
      [candidate(make('x.exe'))],
      [make('old.pdf')],
      limits({ multiple: false, accept: normalizeAccept('.pdf') }),
      options(),
    );
    expect(none.replaces).toBe(false);
  });

  it('applies the total size in batch order', async () => {
    const result = await selectFiles(
      [candidate(make('a', 40)), candidate(make('b', 40)), candidate(make('c', 10))],
      [make('z', 30)],
      limits({ maxTotalSize: 85 }),
      options(),
    );
    expect(codes(result)).toEqual(['ok', 'total-too-large', 'ok']);
  });

  it('rejects folders unless directory selection is on', async () => {
    expect(codes(await selectFiles([folder('photos')], [], limits(), options()))).toEqual([
      'folder-not-allowed',
    ]);
  });

  it('runs the validator in order with context, metadata and description', async () => {
    const validator = vi.fn(
      async (
        file: File,
        context: { accepted: readonly File[]; index: number; relativePath: string },
      ) => {
        if (file.name === 'bad.csv')
          return ['Missing header', { code: 'csv-columns', message: 'Expected 3 columns' }];
        return {
          meta: { rows: context.accepted.length + 1, path: context.relativePath },
          description: 'CSV',
        };
      },
    );
    const result = await selectFiles(
      [candidate(make('a.csv'), 'dir/a.csv'), candidate(make('bad.csv')), candidate(make('c.csv'))],
      [],
      limits(),
      options(validator),
    );
    expect(codes(result)).toEqual(['ok', 'file-invalid+csv-columns', 'ok']);
    expect(result.decisions[0]!.meta).toEqual({ rows: 1, path: 'dir/a.csv' });
    expect(result.decisions[2]!.meta).toEqual({ rows: 2, path: '' });
    expect(result.decisions[2]!.description).toBe('CSV');
    expect(validator.mock.calls.map(([, context]) => context.index)).toEqual([0, 1, 2]);
  });

  it('treats thrown, rejected and malformed results as validation-failed', async () => {
    const result = await selectFiles(
      [candidate(make('a')), candidate(make('b')), candidate(make('c'))],
      [],
      limits(),
      options(async (file) => {
        if (file.name === 'a') throw new Error('boom');
        if (file.name === 'b') return 42 as never;
        return Promise.reject(new Error('nope'));
      }),
    );
    expect(codes(result)).toEqual(['validation-failed', 'validation-failed', 'validation-failed']);
  });

  it('rejects with the abort reason and ignores late validator results', async () => {
    const controller = new AbortController();
    let release!: () => void;
    const pending = selectFiles([candidate(make('a'))], [], limits(), {
      signal: controller.signal,
      errorText: (code) => code,
      validator: () => new Promise((resolve) => (release = () => resolve('late error'))),
    });
    await Promise.resolve();
    controller.abort();
    release();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('excluded files', () => {
  it('skips excluded files in validation and limits', async () => {
    const removed = new Set<number>();
    const validator = vi.fn(async (_file: File, context: { index: number }) => {
      if (context.index === 0) removed.add(1);
      return null;
    });
    const result = await selectFiles(
      [candidate(make('a')), candidate(make('b')), candidate(make('c'))],
      [],
      limits({ maxFiles: 2 }),
      { ...options(validator), excluded: (index) => removed.has(index) },
    );
    expect(
      result.decisions.map((d) => (d.excluded ? 'excluded' : d.accepted ? 'ok' : 'rejected')),
    ).toEqual(['ok', 'excluded', 'ok']);
    expect(validator.mock.calls.map(([file]) => file.name)).toEqual(['a', 'c']);
  });
});

describe('normalizeValidation', () => {
  it('accepts every documented shape', () => {
    expect(normalizeValidation(undefined).errors).toEqual([]);
    expect(normalizeValidation('').errors).toEqual([]);
    expect(normalizeValidation('Bad').errors).toEqual([{ code: 'file-invalid', message: 'Bad' }]);
    expect(normalizeValidation({ code: 'x', message: 'Bad' }).errors).toEqual([
      { code: 'x', message: 'Bad' },
    ]);
    expect(normalizeValidation({ errors: null, meta: { pages: 24 } }).meta).toEqual({ pages: 24 });
  });

  it('throws for malformed shapes', () => {
    expect(() => normalizeValidation({} as never)).toThrow();
    expect(() => normalizeValidation([1] as never)).toThrow();
    expect(() => normalizeValidation({ meta: 'x' } as never)).toThrow();
    expect(() => normalizeValidation({ description: 3 } as never)).toThrow();
  });
});
