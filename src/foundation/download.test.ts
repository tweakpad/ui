import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob } from './download.js';

describe('downloadBlob', () => {
  afterEach(() => vi.useRealTimers());

  it('clicks a detached download anchor once and revokes the URL later', () => {
    vi.useFakeTimers();
    const anchor = {
      href: '',
      download: '',
      rel: '',
      hidden: false,
      click: vi.fn(),
      remove: vi.fn(),
    };
    const URLs = { createObjectURL: vi.fn(() => 'blob:qr'), revokeObjectURL: vi.fn() };
    const append = vi.fn();
    const document = {
      defaultView: { URL: URLs, setTimeout: globalThis.setTimeout.bind(globalThis) },
      createElement: vi.fn(() => anchor),
      body: { append },
    } as unknown as Document;
    const blob = new Blob(['x'], { type: 'image/png' });
    downloadBlob(document, blob, 'qr-code.png');
    expect(URLs.createObjectURL).toHaveBeenCalledWith(blob);
    expect(anchor).toMatchObject({ href: 'blob:qr', download: 'qr-code.png', hidden: true });
    expect(append).toHaveBeenCalledWith(anchor);
    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(anchor.remove).toHaveBeenCalled();
    expect(URLs.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(30_000);
    expect(URLs.revokeObjectURL).toHaveBeenCalledWith('blob:qr');
  });
});
