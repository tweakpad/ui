import type { SearchRange } from '../search/types.js';

/** Whether an entry holds other entries. */
export type FileKind = 'folder' | 'file';

/**
 * What the user may do with an entry. A missing flag allows the action; the explorer only reflects
 * these in its controls, and the source still decides.
 */
export interface FilePermissions {
  readonly read?: boolean;
  readonly write?: boolean;
  readonly rename?: boolean;
  readonly move?: boolean;
  readonly delete?: boolean;
}

/** A file or folder as a source describes it. */
export interface FileEntry {
  /** Stable identity, unique in the source. */
  readonly id: string;
  readonly name: string;
  readonly kind: FileKind;
  /** The folder holding it, or `null` at the root. */
  readonly parentId: string | null;
  /** Bytes; for a folder, the size of its contents when the source knows it. */
  readonly size?: number;
  readonly modified?: Date | number | string;
  /** A media type such as `image/png`, or an application type. */
  readonly type?: string;
  /** Shown only while the explorer shows hidden entries. */
  readonly hidden?: boolean;
  /** For a folder, how many entries it holds, when known without listing it. */
  readonly childCount?: number;
  /** For a folder, whether it holds folders, so a tree can offer to expand it before listing. */
  readonly hasChildren?: boolean;
  /** A preview image URL. */
  readonly thumbnail?: string;
  readonly permissions?: FilePermissions;
  /** Application attributes for columns, possibly filled later through `metadata`. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** Every request carries the signal that aborts it when the explorer no longer needs the answer. */
export interface FileRequest {
  readonly signal: AbortSignal;
}

/** The order a listing asks for; `compare` orders two entries ascending for client-side sorting. */
export interface FileSort {
  readonly column: string;
  readonly direction: 'ascending' | 'descending';
  compare?(a: FileEntry, b: FileEntry): number;
}

/** A request for the entries of one folder. */
export interface FileListRequest extends FileRequest {
  /** The folder to list, or `null` for the root. */
  readonly folder: string | null;
  readonly sort?: FileSort | null;
  /** Skip caches and ask the source again. */
  readonly refresh?: boolean;
}

/** A folder's entries. */
export interface FileListResult {
  readonly entries: readonly FileEntry[];
  /** How many entries the folder holds when `entries` is a first page. */
  readonly total?: number;
}

/** A request for the folders from the root down to an entry. */
export interface FilePathRequest extends FileRequest {
  readonly id: string;
}

/** A request for metadata fields of some entries, such as heavy attributes loaded apart from listings. */
export interface FileMetadataRequest extends FileRequest {
  readonly ids: readonly string[];
  readonly fields: readonly string[];
}

/** Metadata by entry id, then by field. */
export type FileMetadataResult = Readonly<Record<string, Readonly<Record<string, unknown>>>>;

/** Where a search looks: the open folder, the folder and everything under it, or everywhere. */
export type FileSearchScope = 'folder' | 'subtree' | 'all';

/** A request for the entries matching a query. */
export interface FileSearchRequest extends FileRequest {
  readonly query: string;
  readonly folder: string | null;
  readonly scope: FileSearchScope;
  readonly limit: number;
}

/** A search result: the entry and where its name matched. */
export interface FileSearchHit {
  readonly entry: FileEntry;
  /** The matched ranges of the entry's name, for highlighting. */
  readonly ranges?: readonly SearchRange[];
}

/** The results of a search. */
export interface FileSearchResult {
  readonly hits: readonly FileSearchHit[];
  /** The search stopped before looking everywhere, such as at a walk limit. */
  readonly partial?: boolean;
}

/** A request to give an entry a new name. */
export interface FileRenameRequest extends FileRequest {
  readonly id: string;
  readonly name: string;
}

/** A request to move entries into a folder. */
export interface FileMoveRequest extends FileRequest {
  readonly ids: readonly string[];
  /** The destination folder, or `null` for the root. */
  readonly to: string | null;
}

/** A request for a new folder. */
export interface FileCreateFolderRequest extends FileRequest {
  readonly parent: string | null;
  readonly name: string;
}

/** A request to delete entries, folders with their contents. */
export interface FileRemoveRequest extends FileRequest {
  readonly ids: readonly string[];
}

/** A request to add files to a folder. */
export interface FileUploadRequest extends FileRequest {
  readonly folder: string | null;
  readonly files: readonly File[];
  /** Reports the bytes sent of the file at `index`. */
  progress(index: number, loaded: number, total: number): void;
}

/** A request for an entry's preview image. */
export interface FileThumbnailRequest extends FileRequest {
  readonly entry: FileEntry;
  /** The CSS pixel size the preview shows at. */
  readonly size: number;
}

/** A value, or a promise of it. */
export type Awaitable<T> = T | Promise<T>;

/** The operations a source can implement, each with its request and result. */
export interface FileOperationMap {
  list: [FileListRequest, FileListResult];
  path: [FilePathRequest, readonly FileEntry[]];
  metadata: [FileMetadataRequest, FileMetadataResult];
  search: [FileSearchRequest, FileSearchResult];
  rename: [FileRenameRequest, FileEntry];
  move: [FileMoveRequest, void];
  createFolder: [FileCreateFolderRequest, FileEntry];
  remove: [FileRemoveRequest, void];
  upload: [FileUploadRequest, readonly FileEntry[]];
  thumbnail: [FileThumbnailRequest, string | null];
}

/** The name of an operation. */
export type FileOperation = keyof FileOperationMap;
/** An operation's request. */
export type FileOperationRequest<K extends FileOperation> = FileOperationMap[K][0];
/** An operation's result. */
export type FileOperationResult<K extends FileOperation> = FileOperationMap[K][1];

/**
 * Where entries come from: an object implementing `list` and any of the other operations. The
 * explorer offers only what a source, or a layer in front of it, implements.
 */
export type FileSource = {
  list(request: FileListRequest): Awaitable<FileListResult>;
} & {
  [K in Exclude<FileOperation, 'list'>]?: (
    request: FileOperationRequest<K>,
  ) => Awaitable<FileOperationResult<K>>;
};

/** Calls the inner layers and the source; a layer may pass a changed request. */
export type FileNext<K extends FileOperation> = (
  request?: FileOperationRequest<K>,
) => Promise<FileOperationResult<K>>;

/** What a layer can reach besides the next step. */
export interface FileLayerContext {
  /** Lists a folder through the whole pipeline, as for walking folders in a search. */
  list(request: FileListRequest): Promise<FileListResult>;
  /** Runs any operation through the whole pipeline. */
  run<K extends FileOperation>(
    operation: K,
    request: FileOperationRequest<K>,
  ): Promise<FileOperationResult<K>>;
  /** Whether an inner layer or the source implements this operation. */
  readonly hasNext: boolean;
}

/**
 * A step in front of the source: each hook receives the request, `next` and the context, and
 * returns the result, its own or what `next` returned, possibly changed.
 */
export type FileLayer = { readonly name?: string } & {
  [K in FileOperation]?: (
    request: FileOperationRequest<K>,
    next: FileNext<K>,
    context: FileLayerContext,
  ) => Awaitable<FileOperationResult<K>>;
};

/** Why an operation failed, for the explorer's messages. */
export type FileErrorCode =
  'conflict' | 'invalid-name' | 'not-found' | 'forbidden' | 'unsupported' | 'failed';
