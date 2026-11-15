import type {
  DataViewColumn,
  DataViewMiddleware,
  DataViewSort,
} from '../../components/data-view/types.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import type { FileEntry } from '../../foundation/file-explorer/types.js';

/** Receives a lane's proposal before it commits; `preventDefault()` rejects it. */
export type FileExplorerChangeCallback<T> = (event: TpValueChangeEvent<T>) => void;

/** How the explorer shows the open folder. */
export type FileExplorerView = 'details' | 'compact' | 'icons' | 'gallery' | 'columns';

/** The changes the explorer can propose; each needs the source to implement it. */
export type FileExplorerOperation = 'rename' | 'move' | 'create' | 'delete' | 'upload';

/**
 * A column of the details view: a Data view column over entries, plus the metadata fields it reads
 * when they load lazily.
 */
export interface FileExplorerColumn extends DataViewColumn<FileEntry> {
  /** Metadata fields the cells need; the explorer asks for them as rows show. */
  readonly fields?: readonly string[];
}

/** The sort of the open folder. */
export type FileExplorerSort = DataViewSort;

/** Rendering layers for the explorer's Data views. */
export type FileExplorerMiddleware = DataViewMiddleware<FileEntry>;

/** Detail of `tp-open`: a file the user opened. */
export interface FileExplorerOpenDetail {
  readonly entry: FileEntry;
  readonly sourceEvent: Event | null;
}

/** Detail of the cancelable operation proposals. */
export interface FileExplorerOperationDetail {
  readonly operation: FileExplorerOperation;
  readonly entries: readonly FileEntry[];
  /** The new name, the destination folder or the files, by operation. */
  readonly name?: string;
  readonly to?: string | null;
  readonly files?: readonly File[];
}

/** Detail of `tp-operation-error`. */
export interface FileExplorerErrorDetail {
  readonly operation: string;
  readonly error: unknown;
  readonly message: string;
}

/** User-facing text. */
export interface FileExplorerMessages {
  readonly label: string;
  readonly folders: string;
  /** The name of the path to the open folder, from the explorer's label. */
  readonly path: (label: string) => string;
  readonly root: string;
  readonly search: string;
  readonly searching: string;
  readonly searchPartial: string;
  readonly searchEmpty: (query: string) => string;
  readonly views: string;
  readonly view: Readonly<Record<FileExplorerView, string>>;
  readonly name: string;
  readonly size: string;
  readonly modified: string;
  readonly kind: string;
  readonly location: string;
  readonly folder: string;
  readonly file: string;
  readonly emptyFolder: string;
  readonly emptyFolderDescription: string;
  readonly loadError: string;
  readonly items: (count: number) => string;
  readonly status: (folders: number, files: number, size: string) => string;
  readonly selected: (count: number, size: string) => string;
  readonly noSelection: string;
  readonly details: string;
  readonly rename: string;
  readonly newFolder: string;
  readonly dropHere: string;
  readonly uploading: (count: number) => string;
  readonly locked: string;
  readonly errors: Readonly<Record<string, string>>;
}
