import { describe, expect, it, vi } from 'vitest';
import { normalizeAccept } from './accept.js';
import {
  collectTransfer,
  documentDropGuardCount,
  registerDocumentDropGuard,
  transferRejected,
} from './transfer.js';

const fileEntry = (path: string, file = new File(['x'], path.split('/').pop()!)) => ({
  isFile: true,
  isDirectory: false,
  name: file.name,
  fullPath: path,
  file: (success: (file: File) => void) => success(file),
});
const directoryEntry = (path: string, children: unknown[]) => ({
  isFile: false,
  isDirectory: true,
  name: path.split('/').pop()!,
  fullPath: path,
  createReader: () => {
    let read = false;
    return {
      readEntries: (success: (entries: unknown[]) => void) => {
        success(read ? [] : children);
        read = true;
      },
    };
  },
});
const transfer = (items: { kind: string; type: string }[]) =>
  ({ types: ['Files'], items }) as unknown as DataTransfer;

describe('collectTransfer', () => {
  const tree = directoryEntry('/photos', [
    fileEntry('/photos/a.png'),
    directoryEntry('/photos/2025', [fileEntry('/photos/2025/b.png')]),
  ]);

  it('traverses folders with relative paths when directory selection is on', async () => {
    const candidates = await collectTransfer(
      { entries: [tree as never, new File(['y'], 'loose.txt')] },
      { directory: true },
    );
    expect(candidates.map((c) => [c.file.name, c.relativePath, c.directory])).toEqual([
      ['a.png', 'photos/a.png', false],
      ['b.png', 'photos/2025/b.png', false],
      ['loose.txt', '', false],
    ]);
  });

  it('keeps folders as rejected candidates otherwise', async () => {
    const candidates = await collectTransfer({ entries: [tree as never] }, { directory: false });
    expect(candidates.map((c) => [c.file.name, c.directory])).toEqual([['photos', true]]);
  });
});

describe('transferRejected', () => {
  it('rejects known media types and overflow but not extension-dependent items', () => {
    const images = normalizeAccept('image/*');
    expect(transferRejected(transfer([{ kind: 'file', type: 'application/pdf' }]), images, 5)).toBe(
      true,
    );
    expect(transferRejected(transfer([{ kind: 'file', type: 'image/png' }]), images, 5)).toBe(
      false,
    );
    expect(transferRejected(transfer([{ kind: 'file', type: '' }]), images, 5)).toBe(false);
    expect(
      transferRejected(
        transfer([{ kind: 'file', type: 'application/pdf' }]),
        normalizeAccept('.sql,image/*'),
        5,
      ),
    ).toBe(false);
    expect(
      transferRejected(
        transfer([
          { kind: 'file', type: 'image/png' },
          { kind: 'file', type: 'image/png' },
        ]),
        images,
        1,
      ),
    ).toBe(true);
    expect(transferRejected(transfer([{ kind: 'string', type: 'text/plain' }]), images, 0)).toBe(
      false,
    );
  });
});

describe('registerDocumentDropGuard', () => {
  it('shares one listener pair per document and releases with the last registration', () => {
    const document = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Document;
    const first = registerDocumentDropGuard(document);
    const second = registerDocumentDropGuard(document);
    expect(document.addEventListener).toHaveBeenCalledTimes(2);
    expect(documentDropGuardCount(document)).toBe(2);
    first();
    first();
    expect(document.removeEventListener).not.toHaveBeenCalled();
    second();
    expect(document.removeEventListener).toHaveBeenCalledTimes(2);
    expect(documentDropGuardCount(document)).toBe(0);
  });
});
