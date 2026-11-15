import type { FileExplorerMessages } from './types.js';

export const DEFAULT_FILE_EXPLORER_MESSAGES: FileExplorerMessages = {
  label: 'Files',
  folders: 'Folders',
  path: (label) => (label ? `${label} path` : 'Path'),
  root: 'Home',
  search: 'Search files',
  searching: 'Searching',
  searchPartial: 'Showing the first matches',
  searchEmpty: (query) => `Nothing matches “${query}”.`,
  views: 'View',
  view: {
    details: 'Details',
    compact: 'Compact list',
    icons: 'Icons',
    gallery: 'Gallery',
    columns: 'Columns',
  },
  name: 'Name',
  size: 'Size',
  modified: 'Modified',
  kind: 'Kind',
  location: 'Location',
  folder: 'Folder',
  file: 'File',
  emptyFolder: 'This folder is empty',
  emptyFolderDescription: 'Files and folders you add here appear in this list.',
  loadError: 'The folder could not be loaded',
  items: (count) => `${count} ${count === 1 ? 'item' : 'items'}`,
  status: (folders, files, size) =>
    [
      folders ? `${folders} ${folders === 1 ? 'folder' : 'folders'}` : '',
      files ? `${files} ${files === 1 ? 'file' : 'files'}` : '',
      files ? size : '',
    ]
      .filter(Boolean)
      .join(' · ') || 'Empty',
  selected: (count, size) => `${count} selected${size ? ` · ${size}` : ''}`,
  noSelection: 'Select a file to see its details',
  details: 'Details',
  rename: 'Rename',
  newFolder: 'New folder',
  dropHere: 'Drop to move here',
  uploading: (count) => `Uploading ${count} ${count === 1 ? 'file' : 'files'}`,
  locked: 'Read only',
  errors: {
    conflict: 'An item with that name already exists here.',
    'invalid-name': 'That name cannot be used.',
    'not-found': 'The item no longer exists.',
    forbidden: 'You do not have permission to do that.',
    unsupported: 'This location does not support that.',
    failed: 'Something went wrong. Try again.',
  },
};

export function resolveFileExplorerMessages(
  messages: Partial<FileExplorerMessages> | undefined,
): FileExplorerMessages {
  return messages
    ? { ...DEFAULT_FILE_EXPLORER_MESSAGES, ...messages }
    : DEFAULT_FILE_EXPLORER_MESSAGES;
}
