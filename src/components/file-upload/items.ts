import { createId } from '../../foundation/id.js';
import type { FileError, FileUploadItem, FileUploadItemStatus } from './types.js';

/** Object-address service, injected so tests and other realms supply their own. */
export interface PreviewUrls {
  create(file: File): string;
  revoke(url: string): void;
}

interface ItemRecord {
  readonly id: string;
  readonly file: File;
  readonly relativePath: string;
  status: FileUploadItemStatus;
  progress: number | null;
  errors: readonly FileError[];
  meta: Readonly<Record<string, unknown>>;
  description: string;
  previewUrl: string;
  response: unknown;
  /** Position in arrival order; accepted items keep value order by this sequence. */
  sequence: number;
  snapshot: FileUploadItem | null;
}

export interface NewItem {
  readonly file: File;
  readonly relativePath?: string;
  readonly status: FileUploadItemStatus;
  readonly errors?: readonly FileError[];
  readonly meta?: Readonly<Record<string, unknown>>;
  readonly description?: string;
}

export type ItemChange = Partial<
  Pick<ItemRecord, 'status' | 'progress' | 'errors' | 'meta' | 'description' | 'response'>
>;

const GROUP: Record<FileUploadItemStatus, number> = {
  selected: 0,
  queued: 0,
  uploading: 0,
  processing: 0,
  complete: 0,
  error: 0,
  validating: 1,
  rejected: 2,
};

/** Whether a status belongs to a file in the value. */
export function isAcceptedStatus(status: FileUploadItemStatus): boolean {
  return GROUP[status] === 0;
}

/** Whether a file can show an image preview. */
export function previewable(file: File): boolean {
  return file.type.toLowerCase().startsWith('image/');
}

/**
 * Ordered File upload items (Foundation `fup-items`): accepted items in value order, then
 * validating items, then rejected items, each group in arrival order. Owns preview addresses.
 */
export class FileItemStore {
  readonly #urls: PreviewUrls;
  #records: ItemRecord[] = [];
  #sequence = 0;
  #previews = true;
  #list: readonly FileUploadItem[] | null = null;

  constructor(urls: PreviewUrls) {
    this.#urls = urls;
  }

  get items(): readonly FileUploadItem[] {
    if (!this.#list) {
      const ordered = [...this.#records].sort(
        (a, b) => GROUP[a.status] - GROUP[b.status] || a.sequence - b.sequence,
      );
      this.#list = Object.freeze(ordered.map((record) => this.#snapshot(record)));
    }
    return this.#list;
  }

  /** Files of accepted items in value order. */
  get files(): File[] {
    return this.items.filter((item) => isAcceptedStatus(item.status)).map((item) => item.file);
  }

  get rejected(): readonly FileUploadItem[] {
    return this.items.filter((item) => item.status === 'rejected');
  }

  get(id: string): FileUploadItem | undefined {
    const record = this.#records.find((candidate) => candidate.id === id);
    return record ? this.#snapshot(record) : undefined;
  }

  /** Finds an item by identifier, file or snapshot. */
  find(target: string | File | FileUploadItem): FileUploadItem | undefined {
    const id =
      typeof target === 'string'
        ? target
        : target instanceof File
          ? this.#records.find((record) => record.file === target)?.id
          : target.id;
    return id ? this.get(id) : undefined;
  }

  add(item: NewItem): FileUploadItem {
    const record: ItemRecord = {
      id: createId('tp-file'),
      file: item.file,
      relativePath: item.relativePath ?? '',
      status: item.status,
      progress: null,
      errors: Object.freeze([...(item.errors ?? [])]),
      meta: Object.freeze({ ...(item.meta ?? {}) }),
      description: item.description ?? '',
      previewUrl: '',
      response: undefined,
      sequence: this.#sequence++,
      snapshot: null,
    };
    this.#records.push(record);
    this.#preview(record);
    this.#changed(record);
    return this.#snapshot(record);
  }

  update(id: string, change: ItemChange): FileUploadItem | undefined {
    const record = this.#records.find((candidate) => candidate.id === id);
    if (!record) return undefined;
    if (change.errors) change = { ...change, errors: Object.freeze([...change.errors]) };
    if (change.meta) change = { ...change, meta: Object.freeze({ ...change.meta }) };
    Object.assign(record, change);
    this.#changed(record);
    return this.#snapshot(record);
  }

  /** Moves an item to the end of its group, as a newly arrived file. */
  touch(id: string): void {
    const record = this.#records.find((candidate) => candidate.id === id);
    if (!record) return;
    record.sequence = this.#sequence++;
    this.#changed(record);
  }

  remove(id: string): FileUploadItem | undefined {
    const index = this.#records.findIndex((record) => record.id === id);
    if (index < 0) return undefined;
    const [record] = this.#records.splice(index, 1);
    const snapshot = this.#snapshot(record!);
    this.#release(record!);
    this.#list = null;
    return snapshot;
  }

  /** Removes every item that matches, or every item. */
  clear(predicate: (item: FileUploadItem) => boolean = () => true): FileUploadItem[] {
    const removed = this.items.filter(predicate);
    for (const item of removed) this.remove(item.id);
    return removed;
  }

  /** Enables or disables previews, creating or releasing addresses. */
  set previews(enabled: boolean) {
    if (this.#previews === enabled) return;
    this.#previews = enabled;
    for (const record of this.#records) {
      if (enabled) this.#preview(record);
      else this.#release(record);
      this.#changed(record);
    }
  }

  get previews(): boolean {
    return this.#previews;
  }

  /** Releases every preview address (disconnection); `restore` recreates them. */
  suspend(): void {
    for (const record of this.#records) {
      this.#release(record);
      this.#changed(record);
    }
  }

  restore(): void {
    for (const record of this.#records) {
      this.#preview(record);
      this.#changed(record);
    }
  }

  #preview(record: ItemRecord): void {
    if (!this.#previews || record.previewUrl || !previewable(record.file)) return;
    try {
      record.previewUrl = this.#urls.create(record.file);
    } catch {
      record.previewUrl = '';
    }
  }

  #release(record: ItemRecord): void {
    if (!record.previewUrl) return;
    this.#urls.revoke(record.previewUrl);
    record.previewUrl = '';
  }

  #changed(record: ItemRecord): void {
    record.snapshot = null;
    this.#list = null;
  }

  #snapshot(record: ItemRecord): FileUploadItem {
    record.snapshot ??= Object.freeze({
      id: record.id,
      file: record.file,
      status: record.status,
      progress: record.progress,
      errors: record.errors,
      meta: record.meta,
      description: record.description,
      previewUrl: record.previewUrl,
      relativePath: record.relativePath,
      rejected: record.status === 'rejected',
      response: record.response,
    });
    return record.snapshot;
  }
}
