import { describe, expect, it, vi } from 'vitest';
import {
  choosePasteOwner,
  clipboardFiles,
  pasteOwnerCount,
  registerPasteOwner,
  type PasteCandidate,
  type PasteOwner,
} from './paste.js';

const element = (localName: string, editable = false) => ({
  nodeType: 1,
  localName,
  isContentEditable: editable,
});
const candidate = (
  host: object,
  options: Partial<PasteCandidate<string>> & { owner: string },
): PasteCandidate<string> => ({
  host,
  scope: 'control',
  enabled: true,
  hovered: false,
  activity: 0,
  ...options,
});

describe('clipboardFiles', () => {
  it('reads the file list, then file items, and ignores text', () => {
    const file = new File(['x'], 'shot.png', { type: 'image/png' });
    expect(clipboardFiles({ files: [file], items: [] } as unknown as DataTransfer)).toEqual([file]);
    expect(
      clipboardFiles({
        files: [],
        items: [
          { kind: 'string', getAsFile: () => null },
          { kind: 'file', getAsFile: () => file },
        ],
      } as unknown as DataTransfer),
    ).toEqual([file]);
    expect(clipboardFiles(null)).toEqual([]);
  });
});

describe('choosePasteOwner', () => {
  const a = element('tp-file-upload');
  const b = element('tp-file-upload');
  const body = element('body');
  const input = element('input');
  const fileInput = element('input');

  it('prefers the Root in the composed path, even through its own file input', () => {
    const owners = [
      candidate(a, { owner: 'a', scope: 'control' }),
      candidate(b, { owner: 'b', scope: 'document', activity: 9 }),
    ];
    expect(choosePasteOwner([fileInput, a, body], owners)).toBe('a');
  });

  it('then the hovered control, then the most recent document-scoped control', () => {
    const owners = [
      candidate(a, { owner: 'a', scope: 'control', hovered: true }),
      candidate(b, { owner: 'b', scope: 'document', activity: 9 }),
    ];
    expect(choosePasteOwner([body], owners)).toBe('a');
    expect(choosePasteOwner([body], [owners[1]!])).toBe('b');
    expect(
      choosePasteOwner(
        [body],
        [
          candidate(a, { owner: 'a', scope: 'document', activity: 3 }),
          candidate(b, { owner: 'b', scope: 'document', activity: 2 }),
        ],
      ),
    ).toBe('a');
  });

  it('leaves editable targets outside every Root, unhovered control scope and disabled owners', () => {
    const document = candidate(b, { owner: 'b', scope: 'document' });
    expect(choosePasteOwner([input, body], [document])).toBeUndefined();
    expect(choosePasteOwner([element('div', true), body], [document])).toBeUndefined();
    expect(choosePasteOwner([body], [candidate(a, { owner: 'a' })])).toBeUndefined();
    expect(
      choosePasteOwner([a, body], [candidate(a, { owner: 'a', enabled: false })]),
    ).toBeUndefined();
    expect(
      choosePasteOwner([a, body], [candidate(a, { owner: 'a', scope: 'none' })]),
    ).toBeUndefined();
  });
});

describe('registerPasteOwner', () => {
  it('shares one listener set per document and releases with the last owner', () => {
    const document = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Document;
    const owner = (): PasteOwner => ({
      host: {} as Element,
      scope: () => 'document',
      enabled: () => true,
      receive: vi.fn(),
    });
    const first = registerPasteOwner(document, owner());
    const second = registerPasteOwner(document, owner());
    expect(document.addEventListener).toHaveBeenCalledTimes(3);
    expect(pasteOwnerCount(document)).toBe(2);
    first();
    first();
    expect(document.removeEventListener).not.toHaveBeenCalled();
    second();
    expect(document.removeEventListener).toHaveBeenCalledTimes(3);
    expect(pasteOwnerCount(document)).toBe(0);
  });

  it('routes a paste with files to the chosen owner only', () => {
    const listeners = new Map<string, (event: Event) => void>();
    const document = {
      addEventListener: (type: string, listener: (event: Event) => void) =>
        listeners.set(type, listener),
      removeEventListener: vi.fn(),
    } as unknown as Document;
    const host = { matches: () => false } as unknown as Element;
    const receivePaste = vi.fn();
    const release = registerPasteOwner(document, {
      host,
      scope: () => 'document',
      enabled: () => true,
      receive: receivePaste,
    });
    const file = new File(['x'], 'shot.png', { type: 'image/png' });
    const paste = (files: File[], defaultPrevented = false) =>
      listeners.get('paste')!({
        defaultPrevented,
        clipboardData: { files, items: [] },
        composedPath: () => [element('body')],
      } as unknown as Event);
    paste([]);
    paste([file], true);
    expect(receivePaste).not.toHaveBeenCalled();
    paste([file]);
    expect(receivePaste).toHaveBeenCalledWith(expect.anything(), [file]);
    release();
  });
});
