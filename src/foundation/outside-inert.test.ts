import { describe, expect, it } from 'vitest';
import { acquireOutsideInert, refreshOutsideInert } from './outside-inert.js';

class ElementStub {
  nodeType = 1;
  namespaceURI = 'http://www.w3.org/1999/xhtml';
  isConnected = true;
  children: ElementStub[] = [];
  parentNode: ElementStub | ShadowStub | null = null;
  assignedSlot: ElementStub | null = null;
  shadowRoot: ShadowStub | null = null;
  #inert: string | null = null;
  inertWrites = 0;
  attributes = new Map<string, string>();
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
    this.inertWrites++;
    this.#inert = value ? '' : null;
  }
  getAttribute(name = 'inert'): string | null {
    return name === 'inert' ? this.#inert : (this.attributes.get(name) ?? null);
  }
  setAttribute(name: string, value: string): void {
    if (name === 'inert') {
      this.inertWrites++;
      this.#inert = value;
    } else this.attributes.set(name, value);
  }
  removeAttribute(): void {
    this.inertWrites++;
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
  constructor(readonly callback: (records: object[]) => void) {
    ObserverStub.current = this;
  }
  /** Deliver mutation records; `inserted` reports nodes added since the last delivery. */
  notify(...inserted: ElementStub[]): void {
    this.callback(inserted.length ? [{ type: 'childList', addedNodes: inserted }] : []);
  }
  takeRecords(): object[] {
    return [];
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
  it('does not republish unchanged inert attributes on an observer refresh', () => {
    const f = fixture();
    const release = acquireOutsideInert(f.document, () => f.inside(f.outer));
    const writes = f.other.inertWrites;
    ObserverStub.current!.notify();
    ObserverStub.current!.notify();
    expect(f.other.inertWrites).toBe(writes);
    release();
    expect(f.other.inert).toBe(false);
  });
  it('preserves explicit and implicit live regions through nested leases and shadow insertion', () => {
    const f = fixture();
    const shadow = new ShadowStub(f.other);
    f.other.shadowRoot = shadow;
    const unrelated = new ElementStub();
    shadow.append(unrelated);
    const releaseOuter = acquireOutsideInert(f.document, () => f.inside(f.outer));
    expect(f.other.inert).toBe(true);
    expect(ObserverStub.current!.roots.has(shadow)).toBe(true);
    const live = new ElementStub();
    live.setAttribute('role', 'status');
    shadow.append(live);
    ObserverStub.current!.notify();
    expect(f.other.inert).toBe(false);
    expect(live.inert).toBe(false);
    expect(unrelated.inert).toBe(true);
    const releaseInner = acquireOutsideInert(f.document, () => f.inside(f.inner));
    expect(live.inert).toBe(false);
    live.setAttribute('aria-live', 'off');
    ObserverStub.current!.notify();
    expect(f.other.inert).toBe(true);
    live.setAttribute('aria-live', 'polite');
    ObserverStub.current!.notify();
    expect(f.other.inert).toBe(false);
    releaseInner();
    expect(live.inert).toBe(false);
    releaseOuter();
    expect(unrelated.inert).toBe(false);
    expect(f.authored.inert).toBe(true);
  });
  it('observes traversed shadow boundaries and leaves later outside siblings interactive', () => {
    const f = fixture();
    const shadow = new ShadowStub(f.outer),
      active = new ElementStub();
    f.outer.shadowRoot = shadow;
    shadow.append(active);
    const release = acquireOutsideInert(f.document, () => f.inside(active));
    expect(ObserverStub.current!.roots.has(shadow)).toBe(true);
    const inserted = new ElementStub();
    shadow.append(inserted);
    ObserverStub.current!.notify(inserted);
    expect(active.inert).toBe(false);
    expect(inserted.inert).toBe(false);
    refreshOutsideInert(f.document);
    expect(inserted.inert).toBe(true);
    release();
    expect(inserted.inert).toBe(false);
  });
  it('leaves an overlay appended to the body after opening interactive', () => {
    const f = fixture();
    const release = acquireOutsideInert(f.document, () => f.inside(f.outer));
    const overlay = new ElementStub();
    (f.document.body as unknown as ElementStub).append(overlay);
    ObserverStub.current!.notify(overlay);
    expect(overlay.inert).toBe(false);
    expect(f.other.inert).toBe(true);
    const item = new ElementStub(),
      status = new ElementStub();
    status.setAttribute('role', 'status');
    overlay.append(item, status);
    ObserverStub.current!.notify();
    expect(overlay.inert).toBe(false);
    expect(item.inert).toBe(false);
    // A newer lease marks what exists when it opens, as Base UI markOthers does per popup.
    const releaseNested = acquireOutsideInert(f.document, () => f.inside(f.inner));
    expect(overlay.inert).toBe(false);
    expect(item.inert).toBe(true);
    releaseNested();
    release();
    expect(item.inert).toBe(false);
  });
  it('releases a newly admitted portal synchronously before focus', () => {
    const f = fixture();
    let active = f.outer;
    const release = acquireOutsideInert(f.document, () => f.inside(active));
    expect(f.other.inert).toBe(true);
    active = f.other;
    refreshOutsideInert(f.document);
    expect(f.other.inert).toBe(false);
    expect(f.outer.inert).toBe(true);
    release();
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

function scopedFixture() {
  const f = fixture();
  // body > [outer, inner, other, authored, player > [video, layer, error], page]
  // player shadow: [slot (assigns light children), chrome]
  const player = new ElementStub(),
    video = new ElementStub(),
    layer = new ElementStub(),
    error = new ElementStub(),
    page = new ElementStub();
  const shadow = new ShadowStub(player),
    slot = new ElementStub(),
    chrome = new ElementStub();
  player.shadowRoot = shadow;
  shadow.append(slot);
  shadow.append(chrome);
  player.append(video, layer, error);
  for (const child of player.children) child.assignedSlot = slot;
  f.document.body.append(player as unknown as HTMLElement);
  (f.document.body as unknown as ElementStub).append(page);
  const scope = player as unknown as HTMLElement;
  return { ...f, player, video, layer, error, page, shadow, slot, chrome, scope };
}
describe('scoped outside inert leases', () => {
  it('isolates only the scope and restores it on release', () => {
    const f = scopedFixture();
    const release = acquireOutsideInert(f.document, () => f.inside(f.layer), { scope: f.scope });
    expect(f.video.inert).toBe(true);
    expect(f.error.inert).toBe(true);
    expect(f.chrome.inert).toBe(true);
    expect(f.layer.inert).toBe(false);
    expect(f.slot.inert).toBe(false);
    expect(f.player.inert).toBe(false);
    expect(f.page.inert).toBe(false);
    expect(f.other.inert).toBe(false);
    expect(ObserverStub.current!.roots.has(f.scope)).toBe(true);
    expect(ObserverStub.current!.roots.has(f.shadow)).toBe(true);
    release();
    expect(f.video.inert).toBe(false);
    expect(f.chrome.inert).toBe(false);
    expect(f.authored.inert).toBe(true);
  });
  it('accepts a shadow-root scope', () => {
    const f = scopedFixture();
    const release = acquireOutsideInert(f.document, () => f.inside(f.slot), {
      scope: f.shadow as unknown as ShadowRoot,
    });
    expect(f.chrome.inert).toBe(true);
    expect(f.slot.inert).toBe(false);
    expect(f.video.inert).toBe(false);
    expect(f.other.inert).toBe(false);
    release();
    expect(f.chrome.inert).toBe(false);
  });
  it('keeps disjoint scoped leases effective together', () => {
    const f = scopedFixture();
    const second = new ElementStub(),
      secondLayer = new ElementStub(),
      secondVideo = new ElementStub();
    second.append(secondVideo, secondLayer);
    (f.document.body as unknown as ElementStub).append(second);
    const a = acquireOutsideInert(f.document, () => f.inside(f.layer), { scope: f.scope });
    const b = acquireOutsideInert(f.document, () => f.inside(secondLayer), {
      scope: second as unknown as HTMLElement,
    });
    expect(f.video.inert).toBe(true);
    expect(secondVideo.inert).toBe(true);
    expect(f.layer.inert).toBe(false);
    expect(secondLayer.inert).toBe(false);
    a();
    expect(f.video.inert).toBe(false);
    expect(secondVideo.inert).toBe(true);
    b();
    expect(secondVideo.inert).toBe(false);
  });
  it('lets a newer document lease supersede a scoped lease, then restores it', () => {
    const f = scopedFixture();
    const scoped = acquireOutsideInert(f.document, () => f.inside(f.layer), { scope: f.scope });
    const page = acquireOutsideInert(f.document, () => f.inside(f.outer));
    expect(f.player.inert).toBe(true);
    expect(f.other.inert).toBe(true);
    page();
    expect(f.player.inert).toBe(false);
    expect(f.other.inert).toBe(false);
    expect(f.video.inert).toBe(true);
    expect(f.layer.inert).toBe(false);
    scoped();
    expect(f.video.inert).toBe(false);
  });
  it('exempts a newer scoped branch from an older enclosing document lease', () => {
    const f = scopedFixture();
    // The player sits inside the document modal branch (`outer`) in this case.
    const outer = f.outer;
    const body = f.document.body as unknown as ElementStub;
    body.children.splice(body.children.indexOf(f.player), 1);
    outer.append(f.player);
    const page = acquireOutsideInert(f.document, () => f.inside(outer));
    const scoped = acquireOutsideInert(f.document, () => f.inside(f.layer), { scope: f.scope });
    expect(f.other.inert).toBe(true);
    expect(outer.inert).toBe(false);
    expect(f.layer.inert).toBe(false);
    expect(f.video.inert).toBe(true);
    scoped();
    expect(f.video.inert).toBe(false);
    expect(f.other.inert).toBe(true);
    page();
    expect(f.other.inert).toBe(false);
  });
  it('lets the newest lease of one scope define its branch', () => {
    const f = scopedFixture();
    const outer = acquireOutsideInert(f.document, () => f.inside(f.layer), { scope: f.scope });
    const inner = acquireOutsideInert(f.document, () => f.inside(f.error), { scope: f.scope });
    expect(f.layer.inert).toBe(true);
    expect(f.error.inert).toBe(false);
    inner();
    expect(f.layer.inert).toBe(false);
    expect(f.error.inert).toBe(true);
    outer();
    expect(f.error.inert).toBe(false);
  });
  it('ignores a disconnected scope', () => {
    const f = scopedFixture();
    f.player.isConnected = false;
    const release = acquireOutsideInert(f.document, () => f.inside(f.layer), { scope: f.scope });
    expect(f.video.inert).toBe(false);
    expect(f.other.inert).toBe(false);
    release();
  });
});
