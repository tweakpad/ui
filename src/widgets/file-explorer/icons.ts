import { folderIcon } from '../../icons/folder.js';
import { fileTextIcon } from '../../icons/file-text.js';
import {
  fileArchiveIcon,
  fileAudioIcon,
  fileCodeIcon,
  fileIcon,
  fileImageIcon,
  fileSpreadsheetIcon,
  fileVideoIcon,
} from '../../icons/files.js';
import type { IconDefinition } from '../../icons/types.js';
import type { FileEntry } from '../../foundation/file-explorer/types.js';

const byExtension: Readonly<Record<string, IconDefinition>> = {
  png: fileImageIcon,
  jpg: fileImageIcon,
  jpeg: fileImageIcon,
  gif: fileImageIcon,
  webp: fileImageIcon,
  avif: fileImageIcon,
  svg: fileImageIcon,
  tif: fileImageIcon,
  tiff: fileImageIcon,
  fits: fileImageIcon,
  mp4: fileVideoIcon,
  mov: fileVideoIcon,
  webm: fileVideoIcon,
  mkv: fileVideoIcon,
  mp3: fileAudioIcon,
  wav: fileAudioIcon,
  flac: fileAudioIcon,
  ogg: fileAudioIcon,
  m4a: fileAudioIcon,
  zip: fileArchiveIcon,
  tar: fileArchiveIcon,
  gz: fileArchiveIcon,
  '7z': fileArchiveIcon,
  rar: fileArchiveIcon,
  json: fileCodeIcon,
  js: fileCodeIcon,
  ts: fileCodeIcon,
  html: fileCodeIcon,
  css: fileCodeIcon,
  xml: fileCodeIcon,
  yaml: fileCodeIcon,
  yml: fileCodeIcon,
  py: fileCodeIcon,
  csv: fileSpreadsheetIcon,
  tsv: fileSpreadsheetIcon,
  xlsx: fileSpreadsheetIcon,
  ods: fileSpreadsheetIcon,
  txt: fileTextIcon,
  md: fileTextIcon,
  pdf: fileTextIcon,
  doc: fileTextIcon,
  docx: fileTextIcon,
  log: fileTextIcon,
  rtf: fileTextIcon,
};

/** The extension of a file name, lower case, or an empty string. */
export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/** The icon of an entry: a folder, else by media type, else by extension, else a plain sheet. */
export function fileIconOf(entry: Pick<FileEntry, 'kind' | 'name' | 'type'>): IconDefinition {
  if (entry.kind === 'folder') return folderIcon;
  const type = entry.type ?? '';
  if (type.startsWith('image/')) return fileImageIcon;
  if (type.startsWith('video/')) return fileVideoIcon;
  if (type.startsWith('audio/')) return fileAudioIcon;
  if (type.startsWith('text/') && !byExtension[extensionOf(entry.name)]) return fileTextIcon;
  return byExtension[extensionOf(entry.name)] ?? fileIcon;
}
