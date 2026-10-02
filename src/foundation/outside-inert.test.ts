import { describe, expect, it } from 'vitest';
import { acquireOutsideInert } from './outside-inert.js';

class ElementStub {
  nodeType = 1;
  isConnected = true;
  children: ElementStub[] = [];
  parentNode: ElementStub | ShadowStub | null = null;
  shadowRoot: ShadowStub | null = null;
  #inert: string | null = null;
  append(...elements: ElementStub[]): void {
    for (const element of elements) {
      element.parentNode = this;
      this.children.push(element);
    }
  }
  get inert(): boolean {
    return this.#inert !== null;
  }
  set inert(value: boolean) {
    this.#inert = value ? '' : null;
  }
  getAttribute(): string | null {
    return this.#inert;
  }
  setAttribute(_name: string, value: string): void {
    this.#inert = value;
  }
  removeAttribute(): void {
    this.#inert = null;
  }
}
class ShadowStub {
  nodeType = 11;
  children: ElementStub[] = [];
  constructor(readonly host: ElementStub) {}
  append(element: ElementStub): void {
    element.parentNode = this;
    this.children.push(element);
  }
}
class ObserverStub {
  static current: ObserverStub | undefined;
  roots = new Set<object>();
  constructor(readonly notify: () => void) {
    ObserverStub.current = this;
  }
  observe(root: object): void {
    this.roots.add(root);
  }
  disconnect(): void {
    this.roots.clear();
  }
}
function fixture() {
  const body = new ElementStub(),
    outer = new ElementStub(),
    inner = new ElementStub(),
    other = new ElementStub(),
    authored = new ElementStub();
  body.append(outer, inner, other, authored);
  authored.inert = true;
  const document = {
    body,
    defaultView: { HTMLElement: ElementStub, MutationObserver: ObserverStub },
  } as unknown as Document;
  const inside = (element: ElementStub): HTMLElement[] => [element as unknown as HTMLElement];
  return { document, outer, inner, other, authored, inside };
}
describe('owner-document outside inert leases', () => {
  it('observes traversed shadow boundaries and inerts newly inserted outside siblings', () => {
    const f = fixture();
    const shadow = new ShadowStub(f.outer),
      active = new ElementStub();
    f.outer.shadowRoot = shadow;
    shadow.append(active);
    const release = acquireOutsideInert(f.document, () => f.inside(active));
    expect(ObserverStub.current!.roots.has(shadow)).toBe(true);
    const inserted = new ElementStub();
    shadow.append(inserted);
    ObserverStub.current!.notify();
    expect(active.inert).toBe(false);
    expect(inserted.inert).toBe(true);
    release();
    expect(inserted.inert).toBe(false);
  });
  it('restores only lease-owned flags and preserves preexisting inertness', () => {
    const f = fixture();
    const release = acquireOutsideInert(f.document, () => f.inside(f.outer));
    expect(f.outer.inert).toBe(false);
    expect(f.other.inert).toBe(true);
    release();
    release();
    expect(f.other.inert).toBe(false);
    expect(f.authored.inert).toBe(true);
  });
  it('switches to a nested modal branch then restores the outer lease', () => {
    const f = fixture();
    const outer = acquireOutsideInert(f.document, () => f.inside(f.outer));
    const inner = acquireOutsideInert(f.document, () => f.inside(f.inner));
    expect(f.outer.inert).toBe(true);
    expect(f.inner.inert).toBe(false);
    inner();
    expect(f.outer.inert).toBe(false);
    expect(f.inner.inert).toBe(true);
    expect(f.other.inert).toBe(true);
    outer();
    expect(f.inner.inert).toBe(false);
    expect(f.other.inert).toBe(false);
  });
  it('does not overwrite an authored attribute edit while releasing', () => {
    const f = fixture();
    const release = acquireOutsideInert(f.document, () => f.inside(f.outer));
    f.other.setAttribute('inert', 'consumer');
    release();
    expect(f.other.getAttribute()).toBe('consumer');
  });
  it('keeps separate owner-document stacks and supports out-of-order release', () => {
    const a = fixture(),
      b = fixture();
    const outer = acquireOutsideInert(a.document, () => a.inside(a.outer));
    const inner = acquireOutsideInert(a.document, () => a.inside(a.inner));
    const otherDocument = acquireOutsideInert(b.document, () => b.inside(b.outer));
    outer();
    expect(a.inner.inert).toBe(false);
    expect(a.outer.inert).toBe(true);
    inner();
    expect(a.outer.inert).toBe(false);
    expect(b.other.inert).toBe(true);
    otherDocument();
    expect(b.other.inert).toBe(false);
  });
});
