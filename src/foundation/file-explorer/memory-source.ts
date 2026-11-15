import { FileOperationError, throwIfAborted } from './pipeline.js';
import type { FileEntry, FileSource } from './types.js';

export interface MemorySourceOptions {
  /** Milliseconds every operation waits, to stand in for a network; default 0. */
  readonly latency?: number;
  /** Creates the id of a new entry; default a counter. */
  readonly createId?: () => string;
  /** The time new and changed entries take as modified; default now. */
  readonly now?: () => Date;
}

/** An in-memory source that also reports its entries. */
export interface MemoryFileSource extends FileSource {
  /** Every entry, in insertion order. */
  entries(): readonly FileEntry[];
}

const invalidName = (name: string) =>
  !name.trim() || /[/\\]/.test(name) || name === '.' || name === '..';

/**
 * A file system held in memory: every operation, with names unique per folder, moves that never
 * place a folder inside itself, recursive removal, and uploads that read each File's name, size,
 * type and modification time. Samples, tests and applications whose files live in the page use it.
 */
export function createMemorySource(
  initial: readonly FileEntry[],
  options: MemorySourceOptions = {},
): MemoryFileSource {
  const byId = new Map<string, FileEntry>();
  for (const entry of initial) byId.set(entry.id, entry);
  let counter = 0;
  const createId =
    options.createId ??
    (() => {
      let id: string;
      do id = `entry-${++counter}`;
      while (byId.has(id));
      return id;
    });
  const now = options.now ?? (() => new Date());
  const wait = async (signal: AbortSignal) => {
    throwIfAborted(signal);
    if (options.latency)
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, options.latency);
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
          },
          { once: true },
        );
      });
  };
  const childrenOf = (folder: string | null) =>
    [...byId.values()].filter((entry) => entry.parentId === folder);
  const get = (id: string) => {
    const entry = byId.get(id);
    if (!entry) throw new FileOperationError('not-found', `No entry "${id}".`);
    return entry;
  };
  const checkFolder = (folder: string | null) => {
    if (folder !== null && get(folder).kind !== 'folder')
      throw new FileOperationError('invalid-name', `"${folder}" is not a folder.`);
  };
  const checkName = (folder: string | null, name: string, except?: string) => {
    if (invalidName(name))
      throw new FileOperationError('invalid-name', `"${name}" is not a valid name.`);
    const taken = childrenOf(folder).some(
      (entry) => entry.id !== except && entry.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    );
    if (taken) throw new FileOperationError('conflict', `"${name}" already exists here.`);
  };
  const isInside = (id: string, folder: string | null) => {
    for (let at = folder; at !== null; at = byId.get(at)?.parentId ?? null)
      if (at === id) return true;
    return false;
  };
  const counts = (folder: string) => childrenOf(folder);
  const withCounts = (entry: FileEntry): FileEntry => {
    if (entry.kind !== 'folder') return entry;
    const children = counts(entry.id);
    return {
      ...entry,
      childCount: children.length,
      hasChildren: children.some((child) => child.kind === 'folder'),
    };
  };

  return {
    entries: () => [...byId.values()],
    async list({ folder, signal }) {
      await wait(signal);
      checkFolder(folder);
      return { entries: childrenOf(folder).map(withCounts) };
    },
    async path({ id, signal }) {
      await wait(signal);
      const path: FileEntry[] = [];
      for (let at: string | null = id; at !== null; at = get(at).parentId)
        path.unshift(withCounts(get(at)));
      return path;
    },
    async metadata({ ids, fields, signal }) {
      await wait(signal);
      const result: Record<string, Record<string, unknown>> = {};
      for (const id of ids) {
        const metadata = byId.get(id)?.metadata ?? {};
        result[id] = Object.fromEntries(fields.map((field) => [field, metadata[field]]));
      }
      return result;
    },
    async rename({ id, name, signal }) {
      await wait(signal);
      const entry = get(id);
      checkName(entry.parentId, name, id);
      const renamed = { ...entry, name: name.trim(), modified: now() };
      byId.set(id, renamed);
      return withCounts(renamed);
    },
    async move({ ids, to, signal }) {
      await wait(signal);
      checkFolder(to);
      for (const id of ids) {
        const entry = get(id);
        if (entry.kind === 'folder' && isInside(id, to))
          throw new FileOperationError(
            'invalid-name',
            `"${entry.name}" cannot move inside itself.`,
          );
        if (entry.parentId !== to) checkName(to, entry.name, id);
      }
      for (const id of ids) byId.set(id, { ...get(id), parentId: to });
    },
    async createFolder({ parent, name, signal }) {
      await wait(signal);
      checkFolder(parent);
      checkName(parent, name);
      const folder: FileEntry = {
        id: createId(),
        name: name.trim(),
        kind: 'folder',
        parentId: parent,
        modified: now(),
      };
      byId.set(folder.id, folder);
      return withCounts(folder);
    },
    async remove({ ids, signal }) {
      await wait(signal);
      const doomed = new Set<string>();
      const collect = (id: string) => {
        doomed.add(id);
        for (const child of childrenOf(id)) collect(child.id);
      };
      for (const id of ids) collect(get(id).id);
      for (const id of doomed) byId.delete(id);
    },
    async upload({ folder, files, progress, signal }) {
      await wait(signal);
      checkFolder(folder);
      const added: FileEntry[] = [];
      files.forEach((file, index) => {
        checkName(folder, file.name);
        const entry: FileEntry = {
          id: createId(),
          name: file.name,
          kind: 'file',
          parentId: folder,
          size: file.size,
          ...(file.type ? { type: file.type } : {}),
          modified: new Date(file.lastModified || now().getTime()),
        };
        byId.set(entry.id, entry);
        added.push(entry);
        progress(index, file.size, file.size);
      });
      return added;
    },
    async thumbnail({ entry, signal }) {
      await wait(signal);
      return byId.get(entry.id)?.thumbnail ?? entry.thumbnail ?? null;
    },
  };
}
