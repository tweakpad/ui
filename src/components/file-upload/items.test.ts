import { describe, expect, it } from 'vitest';
import { FileItemStore } from './items.js';

function store() {
  const created: string[] = [];
  const revoked: string[] = [];
  let n = 0;
  const items = new FileItemStore({
    create: () => {
      const url = `blob:${++n}`;
      created.push(url);
      return url;
    },
    revoke: (url) => revoked.push(url),
  });
  return { items, created, revoked };
}
const png = (name: string) => new File(['x'], name, { type: 'image/png' });
const pdf = (name: string) => new File(['x'], name, { type: 'application/pdf' });

describe('FileItemStore', () => {
  it('orders accepted, validating, then rejected items, each by arrival', () => {
    const { items } = store();
    const rejected = items.add({ file: pdf('r.pdf'), status: 'rejected' });
    const validating = items.add({ file: pdf('v.pdf'), status: 'validating' });
    const a = items.add({ file: pdf('a.pdf'), status: 'selected' });
    const b = items.add({ file: pdf('b.pdf'), status: 'complete' });
    expect(items.items.map((item) => item.id)).toEqual([a.id, b.id, validating.id, rejected.id]);
    expect(items.files.map((file) => file.name)).toEqual(['a.pdf', 'b.pdf']);
    items.update(validating.id, { status: 'selected' });
    expect(items.files.map((file) => file.name)).toEqual(['v.pdf', 'a.pdf', 'b.pdf']);
    items.touch(validating.id);
    expect(items.files.map((file) => file.name)).toEqual(['a.pdf', 'b.pdf', 'v.pdf']);
  });

  it('creates previews only for images and releases them on removal and suspension', () => {
    const { items, created, revoked } = store();
    const image = items.add({ file: png('a.png'), status: 'selected' });
    items.add({ file: pdf('b.pdf'), status: 'selected' });
    expect(image.previewUrl).toBe('blob:1');
    expect(created).toEqual(['blob:1']);
    items.suspend();
    expect(revoked).toEqual(['blob:1']);
    expect(items.get(image.id)!.previewUrl).toBe('');
    items.restore();
    expect(items.get(image.id)!.previewUrl).toBe('blob:2');
    items.previews = false;
    expect(revoked).toEqual(['blob:1', 'blob:2']);
    items.previews = true;
    items.remove(image.id);
    expect(revoked).toEqual(['blob:1', 'blob:2', 'blob:3']);
  });

  it('keeps snapshots stable until an item changes', () => {
    const { items } = store();
    const item = items.add({ file: pdf('a.pdf'), status: 'selected' });
    expect(items.get(item.id)).toBe(items.get(item.id));
    const list = items.items;
    expect(items.items).toBe(list);
    items.update(item.id, { progress: 40 });
    expect(items.items).not.toBe(list);
    expect(Object.isFrozen(items.get(item.id))).toBe(true);
  });

  it('finds items by id, file or snapshot and clears by predicate', () => {
    const { items } = store();
    const file = pdf('a.pdf');
    const item = items.add({ file, status: 'selected' });
    items.add({ file: pdf('b.pdf'), status: 'rejected' });
    expect(items.find(file)?.id).toBe(item.id);
    expect(items.find(item)?.id).toBe(item.id);
    expect(items.clear((entry) => entry.rejected).length).toBe(1);
    expect(items.items.length).toBe(1);
  });
});
