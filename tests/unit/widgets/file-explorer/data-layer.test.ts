import { describe, expect, it, vi } from 'vitest';
import {
  createFilePipeline,
  createMemorySource,
  defaultFileLayers,
  fileCacheLayer,
  fileMetadataLayer,
  fileSearchLayer,
  fileSortLayer,
  FileOperationError,
  type FileEntry,
  type FileLayer,
  type FileSource,
} from '../../../../src/foundation/file-explorer/index.js';

const signal = new AbortController().signal;
const entries: FileEntry[] = [
  { id: 'plates', name: 'Plate scans', kind: 'folder', parentId: null },
  { id: 'logs', name: 'Night logs', kind: 'folder', parentId: null },
  { id: 'readme', name: 'Readme.txt', kind: 'file', parentId: null, size: 120 },
  { id: 'p10', name: 'plate-10.tif', kind: 'file', parentId: 'plates', size: 300 },
  { id: 'p2', name: 'plate-2.tif', kind: 'file', parentId: 'plates', size: 200 },
  { id: 'deep', name: 'Calibration', kind: 'folder', parentId: 'plates' },
  { id: 'c1', name: 'dark-frame.fits', kind: 'file', parentId: 'deep', metadata: { exposure: 30 } },
  { id: 'l1', name: 'log-2026-11-14.txt', kind: 'file', parentId: 'logs' },
];

describe('createFilePipeline', () => {
  it('runs layers outermost first and lets a layer pass a changed request', async () => {
    const order: string[] = [];
    const source: FileSource = {
      list: ({ folder }) => (order.push(`source:${folder}`), { entries: [] }),
    };
    const outer: FileLayer = {
      list: (request, next) => (order.push('outer'), next({ ...request, folder: 'changed' })),
    };
    const inner: FileLayer = { list: (_, next) => (order.push('inner'), next()) };
    await createFilePipeline(source, [outer, inner]).run('list', { folder: null, signal });
    expect(order).toEqual(['outer', 'inner', 'source:changed']);
  });

  it('reports what it supports and rejects the rest', async () => {
    const pipeline = createFilePipeline({ list: () => ({ entries: [] }) }, [fileSearchLayer()]);
    expect(pipeline.supports('search')).toBe(true);
    expect(pipeline.supports('rename')).toBe(false);
    await expect(pipeline.run('rename', { id: 'x', name: 'y', signal })).rejects.toBeInstanceOf(
      FileOperationError,
    );
  });
});

describe('fileSortLayer', () => {
  it('puts folders first and orders names with numbers in order, both directions', async () => {
    const pipeline = createFilePipeline(createMemorySource(entries), [fileSortLayer()]);
    const ascending = await pipeline.run('list', { folder: 'plates', signal });
    expect(ascending.entries.map((entry) => entry.id)).toEqual(['deep', 'p2', 'p10']);
    const descending = await pipeline.run('list', {
      folder: 'plates',
      signal,
      sort: { column: 'name', direction: 'descending' },
    });
    expect(descending.entries.map((entry) => entry.id)).toEqual(['deep', 'p10', 'p2']);
  });
});

describe('fileCacheLayer', () => {
  it('asks the source once per folder, shares a listing in flight and forgets after a change', async () => {
    const memory = createMemorySource(entries);
    const list = vi.fn(memory.list);
    const pipeline = createFilePipeline({ ...memory, list }, [fileCacheLayer()]);
    await Promise.all([
      pipeline.run('list', { folder: null, signal }),
      pipeline.run('list', { folder: null, signal }),
    ]);
    await pipeline.run('list', { folder: null, signal });
    expect(list).toHaveBeenCalledTimes(1);
    await pipeline.run('rename', { id: 'readme', name: 'About.txt', signal });
    const after = await pipeline.run('list', { folder: null, signal });
    expect(list).toHaveBeenCalledTimes(2);
    expect(after.entries.find((entry) => entry.id === 'readme')?.name).toBe('About.txt');
    await pipeline.run('list', { folder: null, signal, refresh: true });
    expect(list).toHaveBeenCalledTimes(3);
  });
});

describe('fileMetadataLayer', () => {
  it('batches lazy requests, caps concurrency and keeps values', async () => {
    let active = 0;
    let peak = 0;
    const calls: string[][] = [];
    const source: FileSource = {
      list: () => ({ entries: [] }),
      metadata: async ({ ids, fields }) => {
        calls.push([...ids]);
        active++;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active--;
        return Object.fromEntries(
          ids.map((id) => [id, Object.fromEntries(fields.map((f) => [f, `${id}:${f}`]))]),
        );
      },
    };
    const pipeline = createFilePipeline(source, [fileMetadataLayer({ batch: 2, concurrency: 1 })]);
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const result = await pipeline.run('metadata', { ids, fields: ['owner'], signal });
    expect(result['e']).toEqual({ owner: 'e:owner' });
    expect(calls).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
    expect(peak).toBe(1);
    await pipeline.run('metadata', { ids: ['a', 'e'], fields: ['owner'], signal });
    expect(calls).toHaveLength(3);
  });

  it('merges eager fields into listings', async () => {
    const pipeline = createFilePipeline(createMemorySource(entries), [
      fileMetadataLayer({ mode: 'eager', fields: ['exposure'] }),
    ]);
    const { entries: listed } = await pipeline.run('list', { folder: 'deep', signal });
    expect(listed[0]?.metadata).toEqual({ exposure: 30 });
  });
});

describe('fileSearchLayer', () => {
  it('searches the folder, the subtree or everything, with ranges in the name', async () => {
    const pipeline = createFilePipeline(createMemorySource(entries), defaultFileLayers());
    const folder = await pipeline.run('search', {
      query: 'plate',
      folder: 'plates',
      scope: 'folder',
      limit: 10,
      signal,
    });
    expect(folder.hits.map((hit) => hit.entry.id).sort()).toEqual(['p10', 'p2']);
    expect(folder.hits[0]?.ranges?.length).toBeGreaterThan(0);
    const subtree = await pipeline.run('search', {
      query: 'dark',
      folder: 'plates',
      scope: 'subtree',
      limit: 10,
      signal,
    });
    expect(subtree.hits.map((hit) => hit.entry.id)).toEqual(['c1']);
    const all = await pipeline.run('search', {
      query: 'log',
      folder: 'plates',
      scope: 'all',
      limit: 10,
      signal,
    });
    expect(all.hits.map((hit) => hit.entry.id)).toContain('l1');
  });

  it('defers to a source search unless told to search on the client', async () => {
    const source: FileSource = {
      list: () => ({ entries }),
      search: () => ({ hits: [{ entry: entries[0]! }] }),
    };
    const deferred = await createFilePipeline(source, [fileSearchLayer()]).run('search', {
      query: 'zzz',
      folder: null,
      scope: 'folder',
      limit: 5,
      signal,
    });
    expect(deferred.hits).toHaveLength(1);
    const client = await createFilePipeline(source, [fileSearchLayer({ when: 'always' })]).run(
      'search',
      { query: 'readme', folder: null, scope: 'folder', limit: 5, signal },
    );
    expect(client.hits.map((hit) => hit.entry.id)).toEqual(['readme']);
  });

  it('stops at the walk limit and says the result is partial', async () => {
    const pipeline = createFilePipeline(createMemorySource(entries), [
      fileSearchLayer({ walkLimit: 3 }),
    ]);
    const result = await pipeline.run('search', {
      query: 'log',
      folder: null,
      scope: 'all',
      limit: 10,
      signal,
    });
    expect(result.partial).toBe(true);
  });
});

describe('createMemorySource', () => {
  it('keeps names unique per folder and refuses invalid names', async () => {
    const source = createMemorySource(entries);
    await expect(source.rename!({ id: 'p2', name: 'plate-10.TIF', signal })).rejects.toMatchObject({
      code: 'conflict',
    });
    await expect(source.createFolder!({ parent: null, name: 'a/b', signal })).rejects.toMatchObject(
      { code: 'invalid-name' },
    );
    const folder = await source.createFolder!({ parent: 'logs', name: 'Archive', signal });
    expect(folder.parentId).toBe('logs');
  });

  it('never moves a folder inside itself and removes folders with their contents', async () => {
    const source = createMemorySource(entries);
    await expect(source.move!({ ids: ['plates'], to: 'deep', signal })).rejects.toMatchObject({
      code: 'invalid-name',
    });
    await source.move!({ ids: ['readme'], to: 'logs', signal });
    expect((await source.list({ folder: 'logs', signal })).entries.map((e) => e.id)).toContain(
      'readme',
    );
    await source.remove!({ ids: ['plates'], signal });
    expect(source.entries().some((entry) => ['p2', 'deep', 'c1'].includes(entry.id))).toBe(false);
  });

  it('lists with folder counts, resolves paths and uploads files', async () => {
    const source = createMemorySource(entries);
    const root = await source.list({ folder: null, signal });
    expect(root.entries.find((entry) => entry.id === 'plates')).toMatchObject({
      childCount: 3,
      hasChildren: true,
    });
    const path = await source.path!({ id: 'c1', signal });
    expect(path.map((entry) => entry.id)).toEqual(['plates', 'deep', 'c1']);
    const progress = vi.fn();
    const file = new File(['abc'], 'spectrum.csv', { type: 'text/csv' });
    const [added] = await source.upload!({ folder: 'logs', files: [file], progress, signal });
    expect(added).toMatchObject({ name: 'spectrum.csv', size: 3, type: 'text/csv' });
    expect(progress).toHaveBeenCalledWith(0, 3, 3);
  });
});
