import { collator } from '../intl.js';
import { TextIndex } from '../search/text-index.js';
import { throwIfAborted } from './pipeline.js';
import type {
  FileEntry,
  FileLayer,
  FileListRequest,
  FileListResult,
  FileMetadataResult,
  FileSearchHit,
} from './types.js';

// ---- sort -----------------------------------------------------------------------------------

export interface FileSortLayerOptions {
  /** Folders before files in both directions; default true. */
  readonly foldersFirst?: boolean;
  /** Locale of the name collation. */
  readonly locale?: string;
}

/**
 * Orders listings on the client: folders first, then by the request's `sort` (its `compare`, else
 * the name with numbers in order), reversed for `descending`. A source that sorts on its server
 * leaves this layer out.
 */
export function fileSortLayer(options: FileSortLayerOptions = {}): FileLayer {
  const foldersFirst = options.foldersFirst ?? true;
  return {
    name: 'sort',
    async list(request, next) {
      const result = await next();
      const sort = request.sort;
      const names = collator(options.locale, { numeric: true, sensitivity: 'base' });
      const byName = (a: FileEntry, b: FileEntry) => names.compare(a.name, b.name);
      const compare = sort?.compare ?? byName;
      const direction = sort?.direction === 'descending' ? -1 : 1;
      const entries = [...result.entries].sort((a, b) => {
        if (foldersFirst && a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
        return direction * (compare(a, b) || byName(a, b));
      });
      return { ...result, entries };
    },
  };
}

// ---- cache ----------------------------------------------------------------------------------

export interface FileCacheLayerOptions {
  /** Folders kept, least recently used dropped first; default 64. */
  readonly folders?: number;
}

/**
 * Keeps folder listings and shares a listing in flight, so the tree, the views and searches ask the
 * source once per folder. A mutation forgets the folders it touched; `refresh` asks again.
 */
export function fileCacheLayer(options: FileCacheLayerOptions = {}): FileLayer & {
  /** Forgets one folder's listing, or every listing. */
  invalidate(folder?: string | null): void;
} {
  const limit = Math.max(1, options.folders ?? 64);
  const listings = new Map<string, FileListResult>();
  const pending = new Map<string, Promise<FileListResult>>();
  const parents = new Map<string, string | null>();
  const keyOf = (folder: string | null) => folder ?? '\u0000root';
  const remember = (key: string, result: FileListResult) => {
    listings.delete(key);
    listings.set(key, result);
    for (const entry of result.entries) parents.set(entry.id, entry.parentId);
    while (listings.size > limit) listings.delete(listings.keys().next().value!);
  };
  const forget = (folder: string | null | undefined) => {
    if (folder === undefined) {
      listings.clear();
      return;
    }
    listings.delete(keyOf(folder));
  };
  const forgetParentsOf = (ids: readonly string[]) => {
    for (const id of ids) {
      if (parents.has(id)) forget(parents.get(id) ?? null);
      forget(id);
    }
  };
  return {
    name: 'cache',
    invalidate: (folder) => forget(folder),
    async list(request, next) {
      const key = keyOf(request.folder);
      if (!request.refresh) {
        const kept = listings.get(key);
        if (kept) {
          remember(key, kept);
          return kept;
        }
        const shared = pending.get(key);
        if (shared) return shared;
      }
      // The shared listing outlives one caller's abort: it is cached for the next.
      const controller = new AbortController();
      const promise = next({ ...request, signal: controller.signal })
        .then((result) => {
          remember(key, result);
          return result;
        })
        .finally(() => {
          if (pending.get(key) === promise) pending.delete(key);
        });
      pending.set(key, promise);
      return promise;
    },
    async rename(request, next) {
      const result = await next();
      forgetParentsOf([request.id]);
      return result;
    },
    async move(request, next) {
      const result = await next();
      forgetParentsOf(request.ids);
      forget(request.to);
      return result;
    },
    async createFolder(request, next) {
      const result = await next();
      forget(request.parent);
      return result;
    },
    async remove(request, next) {
      const result = await next();
      forgetParentsOf(request.ids);
      return result;
    },
    async upload(request, next) {
      const result = await next();
      forget(request.folder);
      return result;
    },
  };
}

// ---- metadata -------------------------------------------------------------------------------

export interface FileMetadataLayerOptions {
  /**
   * `lazy` asks for the fields of the entries the explorer shows, as it shows them; `eager` asks
   * for `fields` of every entry with each listing. Default `lazy`.
   */
  readonly mode?: 'lazy' | 'eager';
  /** The fields an eager listing asks for. */
  readonly fields?: readonly string[];
  /** Entries per request; default 50. */
  readonly batch?: number;
  /** Requests at once; default 2. */
  readonly concurrency?: number;
}

/**
 * Loads heavy metadata apart from the listing: lazy requests made in the same task are batched,
 * asked for at most `concurrency` at a time, kept per entry and field, and shared while in flight.
 * Eager mode merges the fields into each listing.
 */
export function fileMetadataLayer(options: FileMetadataLayerOptions = {}): FileLayer {
  const batch = Math.max(1, options.batch ?? 50);
  const concurrency = Math.max(1, options.concurrency ?? 2);
  /** Values by `id\u0000field`. */
  const known = new Map<string, unknown>();
  const inflight = new Map<string, Promise<void>>();
  let running = 0;
  const waiting: (() => void)[] = [];
  const slot = async () => {
    if (running >= concurrency) await new Promise<void>((resolve) => waiting.push(resolve));
    running++;
  };
  const release = () => {
    running--;
    waiting.shift()?.();
  };
  const key = (id: string, field: string) => `${id}\u0000${field}`;
  const collect = (ids: readonly string[], fields: readonly string[]): FileMetadataResult => {
    const result: Record<string, Record<string, unknown>> = {};
    for (const id of ids) {
      const values: Record<string, unknown> = {};
      for (const field of fields)
        if (known.has(key(id, field))) values[field] = known.get(key(id, field));
      result[id] = values;
    }
    return result;
  };
  type Fetch = (ids: readonly string[], fields: readonly string[]) => Promise<FileMetadataResult>;
  /** Asks for the missing values in batches, sharing values already requested. */
  const load = async (
    ids: readonly string[],
    fields: readonly string[],
    fetch: Fetch,
  ): Promise<void> => {
    const waits: Promise<void>[] = [];
    const missing = ids.filter((id) =>
      fields.some((field) => {
        const shared = inflight.get(key(id, field));
        if (shared) waits.push(shared);
        return !known.has(key(id, field)) && !shared;
      }),
    );
    for (let start = 0; start < missing.length; start += batch) {
      const chunk = missing.slice(start, start + batch);
      const request = (async () => {
        await slot();
        try {
          const values = await fetch(chunk, fields);
          for (const id of chunk)
            for (const field of fields) known.set(key(id, field), values[id]?.[field]);
        } finally {
          release();
          for (const id of chunk) for (const field of fields) inflight.delete(key(id, field));
        }
      })();
      for (const id of chunk) for (const field of fields) inflight.set(key(id, field), request);
      waits.push(request);
    }
    await Promise.all(waits);
  };
  return {
    name: 'metadata',
    async metadata(request, next, context) {
      if (!context.hasNext) return collect(request.ids, request.fields);
      await load(request.ids, request.fields, (ids, fields) => next({ ...request, ids, fields }));
      return collect(request.ids, request.fields);
    },
    async list(request, next, context) {
      const result = await next();
      const fields = options.fields ?? [];
      if (options.mode !== 'eager' || !fields.length || !result.entries.length) return result;
      const values = await context.run('metadata', {
        ids: result.entries.map((entry) => entry.id),
        fields,
        signal: request.signal,
      });
      return mergeMetadata(result, values);
    },
  };
}

/** Merges metadata values into a listing's entries. */
export function mergeMetadata(result: FileListResult, values: FileMetadataResult): FileListResult {
  return {
    ...result,
    entries: result.entries.map((entry) =>
      values[entry.id] ? { ...entry, metadata: { ...entry.metadata, ...values[entry.id] } } : entry,
    ),
  };
}

// ---- search ---------------------------------------------------------------------------------

export interface FileSearchLayerOptions {
  /**
   * `fallback` searches on the client only when no inner layer or source searches; `always`
   * searches on the client in every case. Default `fallback`.
   */
  readonly when?: 'fallback' | 'always';
  /** Entries a subtree or global search reads at most; default 20000. */
  readonly walkLimit?: number;
  /** Locale for folding and word segmentation. */
  readonly locale?: string;
}

/**
 * Fuzzy search on the client over entry names: it reads the open folder, or walks the subtree or
 * the whole source through the pipeline (so cached listings are reused), indexes the names, and
 * returns ranked hits with the matched ranges. Results are partial when the walk limit stops it.
 */
export function fileSearchLayer(options: FileSearchLayerOptions = {}): FileLayer {
  const walkLimit = Math.max(1, options.walkLimit ?? 20_000);
  return {
    name: 'search',
    async search(request, next, context) {
      if ((options.when ?? 'fallback') === 'fallback' && context.hasNext) return next();
      const entries: FileEntry[] = [];
      const queue: (string | null)[] = [request.scope === 'all' ? null : request.folder];
      const seen = new Set<string | null>();
      let partial = false;
      while (queue.length) {
        throwIfAborted(request.signal);
        const folder = queue.shift()!;
        if (seen.has(folder)) continue;
        seen.add(folder);
        const listing: FileListRequest = { folder, signal: request.signal };
        const { entries: found } = await context.list(listing);
        for (const entry of found) {
          if (entries.length >= walkLimit) {
            partial = true;
            break;
          }
          entries.push(entry);
          if (entry.kind === 'folder' && request.scope !== 'folder') queue.push(entry.id);
        }
        if (partial) break;
      }
      const index = new TextIndex<FileEntry>({
        fields: ['name'],
        extract: (entry) => entry.name,
        getId: (entry) => entry.id,
        locale: options.locale,
      });
      index.addAll(entries);
      const hits: FileSearchHit[] = index
        .search(request.query, { prefix: true, infix: true, fuzzy: 0.2, limit: request.limit })
        .map((hit) => {
          const ranges = hit.matches?.find((match) => match.field === 'name')?.ranges;
          return ranges ? { entry: hit.item, ranges } : { entry: hit.item };
        });
      return partial ? { hits, partial } : { hits };
    },
  };
}

/** The layers an explorer uses unless given others: sort, cache, metadata and search. */
export function defaultFileLayers(): FileLayer[] {
  return [fileSortLayer(), fileCacheLayer(), fileMetadataLayer(), fileSearchLayer()];
}
