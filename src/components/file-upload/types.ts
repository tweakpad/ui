/** Status of one file (Foundation File upload `fup-items`). */
export type FileUploadItemStatus =
  | 'validating'
  | 'selected'
  | 'queued'
  | 'uploading'
  | 'processing'
  | 'complete'
  | 'error'
  | 'rejected';

/** Statuses an application may assign; validating and rejected belong to the pipeline. */
export type FileUploadSettableStatus = Exclude<FileUploadItemStatus, 'validating' | 'rejected'>;

/** Built-in rejection codes; applications may report their own codes. */
export type FileErrorCode =
  | 'file-invalid-type'
  | 'file-too-large'
  | 'file-too-small'
  | 'too-many-files'
  | 'total-too-large'
  | 'file-exists'
  | 'folder-not-allowed'
  | 'file-invalid'
  | 'validation-failed';

export interface FileError {
  /** A built-in code or an application code. */
  readonly code: FileErrorCode | (string & {});
  readonly message: string;
}

/** Read-only snapshot of one file in the control. */
export interface FileUploadItem {
  readonly id: string;
  readonly file: File;
  readonly status: FileUploadItemStatus;
  /** Percentage 0–100 while uploading; `null` is indeterminate or not uploading. */
  readonly progress: number | null;
  readonly errors: readonly FileError[];
  /** Metadata from the file validator or the application, such as a page count. */
  readonly meta: Readonly<Record<string, unknown>>;
  /** Description from the file validator or the application; empty uses the generated text. */
  readonly description: string;
  /** Object address of an image preview while previews are shown; empty otherwise. */
  readonly previewUrl: string;
  /** Path inside a selected or dropped folder; empty for single files. */
  readonly relativePath: string;
  readonly rejected: boolean;
  /** Value the upload adapter fulfilled with. */
  readonly response: unknown;
}

/** Host `accept` text, a token list, or a record from media type to extensions. */
export type FileAcceptInput =
  string | readonly string[] | Readonly<Record<string, readonly string[]>> | null | undefined;

export interface FileValidationContext {
  /** Accepted files before this batch (empty when one file replaces another). */
  readonly value: readonly File[];
  /** Files of this batch that passed so far, in order. */
  readonly accepted: readonly File[];
  /** Position of the file in its batch. */
  readonly index: number;
  /** Aborted when the batch is superseded, the file is removed, or the control resets. */
  readonly signal: AbortSignal;
  /** Path inside a folder, when the file came from one. */
  readonly relativePath: string;
}

export type FileValidationError = string | { readonly code?: string; readonly message: string };

/** A validator result: no errors, errors, or errors with metadata and a description. */
export type FileValidationResult =
  | void
  | null
  | undefined
  | FileValidationError
  | readonly FileValidationError[]
  | {
      readonly errors?: FileValidationError | readonly FileValidationError[] | null;
      readonly meta?: Readonly<Record<string, unknown>>;
      readonly description?: string;
    };

export type FileValidator = (
  file: File,
  context: FileValidationContext,
) => FileValidationResult | Promise<FileValidationResult>;

export interface FileUploadContext {
  readonly signal: AbortSignal;
  /** Reports transferred and total bytes, or a percentage when `total` is omitted. */
  onProgress(loaded: number, total?: number): void;
}

/** Transfers one accepted file; fulfils with the server result or rejects with an error. */
export type FileUploader = (item: FileUploadItem, context: FileUploadContext) => Promise<unknown>;

export interface FileRejection {
  readonly file: File;
  readonly errors: readonly FileError[];
  readonly relativePath: string;
}

/** Origin of a value change, carried in its metadata. */
export type FileUploadSource =
  'picker' | 'drop' | 'paste' | 'action' | 'remove' | 'clear' | 'reset';

/** Clipboard paste scope: `control` while focused or hovered, `document` also page-wide. */
export type FileUploadPaste = 'none' | 'control' | 'document';

export interface FileUploadChangeMetadata extends Record<string, unknown> {
  readonly added: readonly File[];
  readonly removed: readonly File[];
  readonly rejected: readonly FileRejection[];
  readonly source: FileUploadSource;
}

/** Application update of one accepted item. */
export interface FileUploadItemPatch {
  readonly status?: FileUploadSettableStatus;
  readonly progress?: number | null;
  /** One error message; shorthand for `errors: [{ code: 'file-invalid', message }]`. */
  readonly error?: string;
  readonly errors?: readonly FileValidationError[];
  readonly description?: string;
  readonly meta?: Readonly<Record<string, unknown>>;
}

/** An item is addressed by its identifier, its file or the item itself. */
export type FileUploadTarget = string | File | FileUploadItem;

export interface FileAddResult {
  readonly accepted: readonly File[];
  readonly rejected: readonly FileRejection[];
  /** True when the value change was cancelled or the batch was aborted. */
  readonly cancelled: boolean;
}

export type FileUploadLayout = 'stack' | 'grid';
export type FileUploadSize = 'sm' | 'default';
export type FileUploadItemSize = 'xs' | 'sm' | 'default';
export type FileUploadHintTreatment = 'text' | 'badges' | 'none';
export type FileUploadCapture = '' | 'user' | 'environment';
