import { acceptsMediaType, type NormalizedAccept } from './accept.js';
import type { FileCandidate } from './selection.js';

/** Minimal File and Directory Entries shapes used by native transfers. */
interface EntryLike {
  readonly isFile: boolean;
  readonly isDirectory: boolean;
  readonly name: string;
  readonly fullPath: string;
}
interface FileEntryLike extends EntryLike {
  file(success: (file: File) => void, failure?: (error: unknown) => void): void;
}
interface DirectoryEntryLike extends EntryLike {
  createReader(): {
    readEntries(success: (entries: EntryLike[]) => void, failure?: (error: unknown) => void): void;
  };
}
type ItemWithEntry = DataTransferItem & { webkitGetAsEntry?: () => EntryLike | null };

/** Whether a transfer carries files (as opposed to text or links). */
export function transferHasFiles(transfer: DataTransfer | null | undefined): boolean {
  return !!transfer && Array.from(transfer.types ?? []).includes('Files');
}

/**
 * Advisory pre-check during a drag (Foundation `fup-transfer`): rejects when every file item is
 * known not to match, or when more items arrive than slots remain. Items whose acceptance
 * depends on a file extension are unknown until the drop.
 */
export function transferRejected(
  transfer: DataTransfer | null | undefined,
  accept: NormalizedAccept,
  remaining: number,
): boolean {
  if (!transfer) return false;
  const items = Array.from(transfer.items ?? []).filter((item) => item.kind === 'file');
  if (!items.length) return false;
  if (items.length > remaining) return true;
  if (accept.any || accept.extensions.length) return false;
  return items.every((item) => item.type !== '' && !acceptsMediaType(accept, item.type));
}

/** One synchronous snapshot of a drop: entries must be read before the event returns. */
export interface TransferSnapshot {
  readonly entries: readonly (EntryLike | File)[];
}

/** Captures the files and entries of a drop synchronously. */
export function snapshotTransfer(transfer: DataTransfer): TransferSnapshot {
  const items = Array.from(transfer.items ?? []).filter((item) => item.kind === 'file');
  if (!items.length) return { entries: Array.from(transfer.files ?? []) };
  const entries: (EntryLike | File)[] = [];
  for (const item of items as ItemWithEntry[]) {
    const entry = item.webkitGetAsEntry?.() ?? null;
    if (entry?.isDirectory) entries.push(entry);
    else {
      const file = item.getAsFile();
      if (file) entries.push(file);
      else if (entry) entries.push(entry);
    }
  }
  return { entries };
}

function readFile(entry: FileEntryLike): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

async function readDirectory(entry: DirectoryEntryLike): Promise<EntryLike[]> {
  const reader = entry.createReader();
  const entries: EntryLike[] = [];
  // readEntries returns batches until it yields an empty one.
  for (;;) {
    const batch = await new Promise<EntryLike[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    );
    if (!batch.length) return entries;
    entries.push(...batch);
  }
}

function relative(entry: EntryLike): string {
  return entry.fullPath.replace(/^\/+/, '') || entry.name;
}

/**
 * Expands a drop snapshot into candidates. With directory selection, folders are traversed
 * recursively and files keep their relative path; otherwise each folder is one rejected
 * candidate (`folder-not-allowed`).
 */
export async function collectTransfer(
  snapshot: TransferSnapshot,
  options: { readonly directory: boolean; readonly signal?: AbortSignal },
): Promise<FileCandidate[]> {
  const candidates: FileCandidate[] = [];
  const visit = async (entry: EntryLike | File): Promise<void> => {
    if (options.signal?.aborted) return;
    if (entry instanceof File) {
      candidates.push({ file: entry, relativePath: '', directory: false });
      return;
    }
    if (entry.isFile) {
      try {
        const file = await readFile(entry as FileEntryLike);
        candidates.push({
          file,
          relativePath: entry.fullPath.split('/').length > 2 ? relative(entry) : '',
          directory: false,
        });
      } catch {
        // An unreadable entry is skipped; the host offers no file to validate.
      }
      return;
    }
    if (!entry.isDirectory) return;
    if (!options.directory) {
      candidates.push({
        file: new File([], entry.name),
        relativePath: relative(entry),
        directory: true,
      });
      return;
    }
    let children: EntryLike[];
    try {
      children = await readDirectory(entry as DirectoryEntryLike);
    } catch {
      return;
    }
    for (const child of children) await visit(child);
  };
  for (const entry of snapshot.entries) await visit(entry);
  return candidates;
}

/** Candidates from a picker selection; `webkitRelativePath` is kept for folder picks. */
export function pickerCandidates(files: FileList | readonly File[] | null): FileCandidate[] {
  return Array.from(files ?? []).map((file) => ({
    file,
    relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? '',
    directory: false,
  }));
}

interface GuardRecord {
  count: number;
  release: () => void;
}
const guards = new WeakMap<Document, GuardRecord>();

/**
 * Registers a document drop guard (Foundation `fup-document-guard`): while registered, files
 * dropped outside every Dropzone do not navigate the document. Shared per document and counted;
 * the returned function releases one registration.
 */
export function registerDocumentDropGuard(document: Document): () => void {
  let record = guards.get(document);
  if (!record) {
    const over = (event: DragEvent) => {
      if (event.defaultPrevented || !transferHasFiles(event.dataTransfer)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'none';
    };
    const drop = (event: DragEvent) => {
      if (!event.defaultPrevented && transferHasFiles(event.dataTransfer)) event.preventDefault();
    };
    document.addEventListener('dragover', over);
    document.addEventListener('drop', drop);
    record = {
      count: 0,
      release: () => {
        document.removeEventListener('dragover', over);
        document.removeEventListener('drop', drop);
      },
    };
    guards.set(document, record);
  }
  record.count += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const current = guards.get(document);
    if (!current) return;
    current.count -= 1;
    if (current.count <= 0) {
      current.release();
      guards.delete(document);
    }
  };
}

/** Registration count of a document guard, for diagnostics and tests. */
export function documentDropGuardCount(document: Document): number {
  return guards.get(document)?.count ?? 0;
}
