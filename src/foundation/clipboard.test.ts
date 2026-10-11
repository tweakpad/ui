import { describe, expect, it, vi } from 'vitest';
import { copyData, copyText } from './clipboard.js';

describe('copyText', () => {
  function documentStub(clipboard?: { writeText: (text: string) => Promise<void> }) {
    const appended: unknown[] = [];
    const area = {
      value: '',
      style: {} as Record<string, string>,
      setAttribute: vi.fn(),
      focus: vi.fn(),
      select: vi.fn(),
      remove: vi.fn(),
    };
    const document = {
      defaultView: { navigator: { clipboard } },
      activeElement: null,
      body: { append: (node: unknown) => appended.push(node) },
      createElement: vi.fn(() => area),
      execCommand: vi.fn(() => true),
    };
    return { document: document as unknown as Document, area, appended };
  }

  it('uses the Clipboard API when it is available', async () => {
    const writeText = vi.fn(async () => {});
    const { document } = documentStub({ writeText });
    await expect(copyText(document, 'npm i')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('npm i');
    expect(document.createElement).not.toHaveBeenCalled();
  });

  it('falls back to a hidden text area when the Clipboard API rejects or is missing', async () => {
    const rejected = documentStub({
      writeText: vi.fn(async () => Promise.reject(new Error('denied'))),
    });
    await expect(copyText(rejected.document, 'x')).resolves.toBe(true);
    expect(rejected.area.value).toBe('x');
    expect(rejected.area.select).toHaveBeenCalled();
    expect(rejected.area.remove).toHaveBeenCalled();
    const missing = documentStub();
    (missing.document.execCommand as ReturnType<typeof vi.fn>).mockReturnValue(false);
    await expect(copyText(missing.document, 'y')).resolves.toBe(false);
  });

  it('never throws', async () => {
    const broken = {
      defaultView: null,
      createElement: () => {
        throw new Error('no dom');
      },
    };
    await expect(copyText(broken as unknown as Document, 'z')).resolves.toBe(false);
  });
});

describe('copyData', () => {
  class FakeItem {
    static created: Record<string, unknown>[] = [];
    readonly items: Record<string, unknown>;
    constructor(items: Record<string, unknown>) {
      this.items = items;
      FakeItem.created.push(items);
    }
  }

  function host(options: {
    write?: (items: FakeItem[]) => Promise<void>;
    writeText?: (text: string) => Promise<void>;
    Item?: unknown;
  }) {
    FakeItem.created = [];
    const clipboard = { write: options.write, writeText: options.writeText };
    return {
      defaultView: { navigator: { clipboard }, ClipboardItem: options.Item ?? FakeItem },
      body: { append: vi.fn() },
      createElement: vi.fn(() => {
        throw new Error('no selection fallback in this stub');
      }),
    } as unknown as Document;
  }

  it('requests the write synchronously with every representation as a promised blob', async () => {
    const write = vi.fn(async () => {});
    const document = host({ write });
    const image = new Blob(['png'], { type: 'image/png' });
    const pending = copyData(document, { 'image/png': Promise.resolve(image), 'text/plain': 'hi' });
    expect(write).toHaveBeenCalledTimes(1);
    const items = FakeItem.created[0]!;
    expect(Object.keys(items)).toEqual(['image/png', 'text/plain']);
    expect(items['image/png']).toBeInstanceOf(Promise);
    await expect(items['image/png']).resolves.toBe(image);
    const text = (await items['text/plain']) as Blob;
    expect(text.type).toBe('text/plain');
    await expect(text.text()).resolves.toBe('hi');
    await expect(pending).resolves.toEqual({ copied: true, types: ['image/png', 'text/plain'] });
  });

  it('omits representations the host reports as unsupported', async () => {
    class SupportsItem extends FakeItem {
      static supports(type: string) {
        return type !== 'image/webp';
      }
    }
    const write = vi.fn(async () => {});
    const document = host({ write, Item: SupportsItem });
    const result = await copyData(document, {
      'image/webp': 'x',
      'image/png': 'y',
      'text/plain': 'z',
    });
    expect(result).toEqual({ copied: true, types: ['image/png', 'text/plain'] });
  });

  it('settles the representations and retries when promised values are not accepted', async () => {
    class StrictItem extends FakeItem {
      constructor(items: Record<string, unknown>) {
        if (Object.values(items).some((value) => value instanceof Promise)) throw new TypeError();
        super(items);
      }
    }
    const write = vi.fn(async () => {});
    const document = host({ write, Item: StrictItem });
    const result = await copyData(document, { 'image/png': Promise.resolve(new Blob(['a'])) });
    expect(result).toEqual({ copied: true, types: ['image/png'] });
    expect(FakeItem.created[0]!['image/png']).toBeInstanceOf(Blob);
  });

  it('falls back to a text write when the host rejects the item', async () => {
    const write = vi.fn(async () => Promise.reject(new Error('NotAllowedError')));
    const writeText = vi.fn(async () => {});
    const document = host({ write, writeText });
    const result = await copyData(document, {
      'image/png': new Blob(['a']),
      'text/plain': 'value',
    });
    expect(writeText).toHaveBeenCalledWith('value');
    expect(result).toEqual({ copied: true, types: ['text/plain'] });
  });

  it('writes text alone through the text write, and falls back when items are unavailable', async () => {
    const write = vi.fn(async () => {});
    const writeText = vi.fn(async () => {});
    await expect(copyData(host({ write, writeText }), { 'text/plain': 'a' })).resolves.toEqual({
      copied: true,
      types: ['text/plain'],
    });
    expect(write).not.toHaveBeenCalled();
    const withoutItems = host({ writeText });
    (withoutItems.defaultView as unknown as { ClipboardItem?: unknown }).ClipboardItem = undefined;
    await expect(
      copyData(withoutItems, { 'image/png': new Blob(['a']), 'text/plain': Promise.resolve('b') }),
    ).resolves.toEqual({ copied: true, types: ['text/plain'] });
    expect(writeText).toHaveBeenLastCalledWith('b');
  });

  it('fails without a text representation and never throws', async () => {
    const write = vi.fn(async () => Promise.reject(new Error('denied')));
    await expect(copyData(host({ write }), { 'image/png': new Blob(['a']) })).resolves.toEqual({
      copied: false,
      types: [],
    });
    const broken = {
      get defaultView(): never {
        throw new Error('no window');
      },
    };
    await expect(copyData(broken as unknown as Document, { 'text/plain': 'x' })).resolves.toEqual({
      copied: false,
      types: [],
    });
  });
});
