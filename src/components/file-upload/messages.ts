import type { FileErrorCode } from './types.js';

/** Values substituted into File upload messages. */
export interface FileUploadMessageParams {
  /** File name. */
  name?: string;
  /** A count of files. */
  count?: number;
  /** Maximum number of files. */
  max?: number;
  /** Joined accepted-type labels, or one type for `wildcardType`. */
  types?: string;
  type?: string;
  /** Formatted sizes. */
  size?: string;
  maxSize?: string;
  minSize?: string;
  maxTotalSize?: string;
  /** Error text for `invalidItem` and `rejectedOne`. */
  error?: string;
}

export type FileUploadMessage = string | ((params: FileUploadMessageParams) => string);

/** Every visible and announced File upload text. Text entries use `{param}` placeholders. */
export interface FileUploadMessages extends Record<FileErrorCode, FileUploadMessage> {
  /** Dropzone title with and without multiple selection. */
  title: FileUploadMessage;
  titleMultiple: FileUploadMessage;
  /** Grid layout Add tile title. */
  add: FileUploadMessage;
  /** Title while files are dragged over the Dropzone, and while they would be rejected. */
  dropActive: FileUploadMessage;
  dropReject: FileUploadMessage;
  /** Title while the maximum number of files is reached. */
  full: FileUploadMessage;
  /** Generated description variants. */
  hintTypesAndSize: FileUploadMessage;
  hintTypes: FileUploadMessage;
  hintSize: FileUploadMessage;
  /** Label of a media-type wildcard such as `image/*`. */
  wildcardType: FileUploadMessage;
  /** Badge row label and size limit. */
  acceptedTypes: FileUploadMessage;
  maxSize: FileUploadMessage;
  /** Trigger label. */
  browse: FileUploadMessage;
  /** Summary counts with and without a count limit. */
  count: FileUploadMessage;
  countLimited: FileUploadMessage;
  clear: FileUploadMessage;
  /** Item action names. */
  remove: FileUploadMessage;
  retry: FileUploadMessage;
  /** Item status text. */
  validating: FileUploadMessage;
  queued: FileUploadMessage;
  uploading: FileUploadMessage;
  processing: FileUploadMessage;
  complete: FileUploadMessage;
  uploadFailed: FileUploadMessage;
  /** Item progress name. */
  progress: FileUploadMessage;
  /** Announcements. */
  added: FileUploadMessage;
  rejected: FileUploadMessage;
  removed: FileUploadMessage;
  cleared: FileUploadMessage;
  /** Form validity messages. */
  valueMissing: FileUploadMessage;
  invalidItem: FileUploadMessage;
}

const plural = (count: number | undefined, one: string, other: string): string =>
  (count ?? 0) === 1 ? one : other.replace('{count}', String(count ?? 0));

const WILDCARDS: Readonly<Record<string, string>> = {
  image: 'Images',
  video: 'Videos',
  audio: 'Audio',
  text: 'Text files',
};

export const DEFAULT_FILE_UPLOAD_MESSAGES: Readonly<FileUploadMessages> = Object.freeze({
  title: 'Upload a file',
  titleMultiple: 'Upload files',
  add: 'Add',
  dropActive: 'Drop to upload',
  dropReject: 'These files are not accepted',
  full: ({ max }: FileUploadMessageParams) =>
    plural(max, 'A file has been added', 'Maximum of {count} files reached'),
  hintTypesAndSize: '{types} up to {maxSize}',
  hintTypes: '{types}',
  hintSize: 'Up to {maxSize}',
  wildcardType: ({ type = '' }: FileUploadMessageParams) =>
    WILDCARDS[type] ?? `${type.toUpperCase()} files`,
  acceptedTypes: 'Accepted:',
  maxSize: 'Max {maxSize}',
  browse: 'Browse files',
  count: ({ count }: FileUploadMessageParams) => plural(count, '1 file', '{count} files'),
  countLimited: '{count} of {max} files',
  clear: 'Clear all',
  remove: 'Remove {name}',
  retry: 'Retry {name}',
  validating: 'Checking…',
  queued: 'Waiting to upload',
  uploading: 'Uploading…',
  processing: 'Processing…',
  complete: 'Uploaded',
  uploadFailed: 'Upload failed',
  progress: 'Uploading {name}',
  added: ({ count, name }: FileUploadMessageParams) =>
    count === 1 ? `${name} added` : `${count ?? 0} files added`,
  rejected: ({ count, name, error }: FileUploadMessageParams) =>
    count === 1 ? `${name} was not added: ${error}` : `${count ?? 0} files were not added`,
  removed: '{name} removed',
  cleared: 'All files removed',
  valueMissing: 'Select a file.',
  invalidItem: '{name}: {error}',
  'file-invalid-type': 'This file type is not accepted.',
  'file-too-large': 'File is larger than {maxSize}.',
  'file-too-small': 'File is smaller than {minSize}.',
  'too-many-files': ({ max }: FileUploadMessageParams) =>
    plural(max, 'Only one file can be added.', 'Only {count} files can be added.'),
  'total-too-large': 'Files together would exceed {maxTotalSize}.',
  'file-exists': 'This file was already added.',
  'folder-not-allowed': 'Folders cannot be added.',
  'file-invalid': 'This file is not valid.',
  'validation-failed': 'This file could not be checked.',
});

/** Resolves one message: the override when present, then the English default. */
export function formatFileUploadMessage(
  messages: Partial<FileUploadMessages>,
  key: keyof FileUploadMessages,
  params: FileUploadMessageParams = {},
): string {
  const message = messages[key] ?? DEFAULT_FILE_UPLOAD_MESSAGES[key];
  if (typeof message === 'function') return message(params);
  return message.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name as keyof FileUploadMessageParams];
    return value === undefined ? match : String(value);
  });
}
