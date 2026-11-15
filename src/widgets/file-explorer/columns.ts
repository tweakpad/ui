import { html } from 'lit';
import { formatBytes } from '../../foundation/format-bytes.js';
import type { FileEntry } from '../../foundation/file-explorer/types.js';
import { extensionOf } from './icons.js';
import type { FileExplorerColumn, FileExplorerMessages } from './types.js';

/** The ids of the built-in columns, in their default order. */
export const BUILT_IN_COLUMNS = ['name', 'size', 'modified', 'kind'] as const;

const time = (value: FileEntry['modified']) =>
  value === undefined ? undefined : value instanceof Date ? value : new Date(value);

/** A file's kind as text: the folder word, else its extension in capitals, else the file word. */
export function kindText(entry: FileEntry, messages: FileExplorerMessages): string {
  if (entry.kind === 'folder') return messages.folder;
  const extension = extensionOf(entry.name);
  return extension ? extension.toUpperCase() : messages.file;
}

/**
 * The built-in columns other than the name: size (bytes, or a folder's item count), modified (a
 * relative time), kind, and location for search results.
 */
export function builtInColumns(
  messages: FileExplorerMessages,
  locale: string | undefined,
  locationOf: (entry: FileEntry) => string,
): Record<'size' | 'modified' | 'kind' | 'location', FileExplorerColumn> {
  return {
    size: {
      id: 'size',
      header: messages.size,
      sortable: true,
      align: 'end',
      width: '7rem',
      value: (entry) =>
        entry.kind === 'folder' ? (entry.childCount ?? null) : (entry.size ?? null),
      format: (value, entry) =>
        value === null || value === undefined
          ? ''
          : entry.kind === 'folder'
            ? messages.items(value as number)
            : formatBytes(value as number, locale),
    },
    modified: {
      id: 'modified',
      header: messages.modified,
      sortable: true,
      width: '9rem',
      value: (entry) => time(entry.modified),
      render: (entry) => {
        const value = time(entry.modified);
        return value ? html`<tp-time mode="relative" .datetime=${value}></tp-time>` : '';
      },
    },
    kind: {
      id: 'kind',
      header: messages.kind,
      sortable: true,
      width: '7rem',
      value: (entry) => kindText(entry, messages),
    },
    location: {
      id: 'location',
      header: messages.location,
      width: 'minmax(8rem, 1fr)',
      value: (entry) => locationOf(entry),
    },
  };
}
