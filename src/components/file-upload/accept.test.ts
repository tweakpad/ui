import { describe, expect, it } from 'vitest';
import {
  acceptLabels,
  acceptsFile,
  acceptsMediaType,
  nativeAccept,
  normalizeAccept,
} from './accept.js';

const file = (name: string, type = '') => ({ name, type });
const wildcard = (type: string) => `${type} files`;

describe('normalizeAccept', () => {
  it('reads host text, lists and records', () => {
    expect(normalizeAccept('.PDF, image/*,application/JSON').tokens).toEqual([
      '.pdf',
      'image/*',
      'application/json',
    ]);
    expect(normalizeAccept(['.csv', 'text/csv']).tokens).toEqual(['.csv', 'text/csv']);
    expect(normalizeAccept({ 'image/png': ['.png'], 'application/pdf': [] }).tokens).toEqual([
      'image/png',
      '.png',
      'application/pdf',
    ]);
  });

  it('accepts every file for empty lists and */*', () => {
    expect(normalizeAccept('').any).toBe(true);
    expect(normalizeAccept(null).any).toBe(true);
    expect(normalizeAccept('.pdf,*/*').any).toBe(true);
  });

  it('drops invalid tokens and duplicates', () => {
    expect(normalizeAccept('pdf, ., image/, .pdf, .PDF').tokens).toEqual(['.pdf']);
  });
});

describe('acceptsFile', () => {
  const accept = normalizeAccept('.sql,.sql.gz,image/*,application/pdf');

  it('matches extensions as case-insensitive suffixes, including compound extensions', () => {
    expect(acceptsFile(accept, file('dump.sql'))).toBe(true);
    expect(acceptsFile(accept, file('BACKUP.SQL.GZ'))).toBe(true);
    expect(acceptsFile(accept, file('archive.gz'))).toBe(false);
    expect(acceptsFile(accept, file('.sql'))).toBe(false);
  });

  it('matches media types ignoring case and parameters, and wildcards by top-level type', () => {
    expect(acceptsFile(accept, file('scan', 'APPLICATION/PDF; version=1.7'))).toBe(true);
    expect(acceptsFile(accept, file('photo.heic', 'image/heic'))).toBe(true);
    expect(acceptsFile(accept, file('clip.mp4', 'video/mp4'))).toBe(false);
  });

  it('matches files without a media type only by extension', () => {
    expect(acceptsFile(accept, file('notes'))).toBe(false);
    expect(acceptsMediaType(accept, '')).toBe(false);
  });

  it('accepts everything with an empty list', () => {
    expect(acceptsFile(normalizeAccept(''), file('anything.bin'))).toBe(true);
  });
});

describe('labels and native attribute', () => {
  it('derives hint labels in token order', () => {
    const accept = normalizeAccept(
      '.sql.gz,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*,image/svg+xml,.jpg',
    );
    expect(acceptLabels(accept, wildcard)).toEqual([
      'SQL.GZ',
      'JPG',
      'PNG',
      'DOCX',
      'image files',
      'SVG',
    ]);
    expect(nativeAccept(accept)).toContain('.sql.gz,image/jpeg');
  });
});
