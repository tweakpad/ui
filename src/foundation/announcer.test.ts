import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ANNOUNCEMENT_CLEAR_DELAY,
  ANNOUNCEMENT_REGION_SETTLE_DELAY,
  LiveAnnouncer,
  type LiveAnnouncerOptions,
} from './announcer.js';

afterEach(() => vi.useRealTimers());

class FakeElement {
  readonly nodeType = 1;
  readonly attributes = new Map<string, string>();
  readonly style = new Map<string, string>() as Map<string, string> & {
    setProperty(property: string, value: string): void;
  };
  readonly children: FakeElement[] = [];
  parentNode: FakeElement | null = null;
  textContent = '';
  constructor(
    readonly tagName: string,
    readonly ownerDocument: FakeDocument,
  ) {
    this.style.setProperty = (property, value) => void this.style.set(property, value);
  }
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }
  append(child: FakeElement): void {
    child.remove();
    child.parentNode = this;
    this.children.push(child);
  }
  remove(): void {
    const siblings = this.parentNode?.children;
    if (siblings) siblings.splice(siblings.indexOf(this), 1);
    this.parentNode = null;
  }
}

class FakeDocument {
  readonly nodeType = 9;
  readonly body: FakeElement;
  readonly defaultView = {
    setTimeout: (callback: () => void, delay: number) => globalThis.setTimeout(callback, delay),
    clearTimeout: (id: number) => globalThis.clearTimeout(id),
  };
  constructor() {
    this.body = new FakeElement('body', this);
  }
  createElement(tag: string): FakeElement {
    return new FakeElement(tag, this);
  }
}

function fixture(options: Omit<LiveAnnouncerOptions, 'document'> = {}) {
  vi.useFakeTimers();
  const document = new FakeDocument();
  const announcer = new LiveAnnouncer({
    document: () => document as unknown as Document,
    ...options,
  });
  const text = (politeness: 'polite' | 'assertive' = 'polite') =>
    announcer.region(politeness)?.textContent ?? null;
  const settle = () => vi.advanceTimersByTime(ANNOUNCEMENT_REGION_SETTLE_DELAY);
  return { announcer, document, text, settle };
}

describe('LiveAnnouncer', () => {
  it('creates visually hidden regions lazily in the owner document', async () => {
    const f = fixture();
    expect(f.document.body.children).toHaveLength(0);
    expect(f.announcer.region()).toBeUndefined();
    f.announcer.announce('Playing');
    const region = f.announcer.region() as unknown as FakeElement;
    expect(f.document.body.children).toEqual([region]);
    expect(Object.fromEntries(region.attributes)).toEqual({
      'data-tp-live-region': 'polite',
      role: 'status',
      'aria-live': 'polite',
      'aria-atomic': 'true',
    });
    expect(region.style.get('clip-path')).toBe('inset(50%)');
    expect(region.style.get('position')).toBe('absolute');
    // A new region is given time to be observed before it receives text.
    await Promise.resolve();
    expect(f.text()).toBe('');
    f.settle();
    expect(f.text()).toBe('Playing');
    expect(f.announcer.region('assertive')).toBeUndefined();
  });

  it('uses an assertive region without the status role', () => {
    const f = fixture();
    f.announcer.prepare('assertive');
    const region = f.announcer.region('assertive') as unknown as FakeElement;
    expect(region.getAttribute('aria-live')).toBe('assertive');
    expect(region.getAttribute('role')).toBeNull();
    f.announcer.announce('Connection lost', { politeness: 'assertive' });
    return Promise.resolve().then(() => {
      expect(f.text('assertive')).toBe('Connection lost');
      expect(f.text('polite')).toBeNull();
    });
  });

  it('joins simultaneous messages and clears after the default delay', async () => {
    const f = fixture();
    f.announcer.prepare();
    f.announcer.announce('Playing');
    f.announcer.announce('Captions on');
    await Promise.resolve();
    expect(f.text()).toBe('Playing. Captions on');
    vi.advanceTimersByTime(ANNOUNCEMENT_CLEAR_DELAY - 1);
    expect(f.text()).toBe('Playing. Captions on');
    vi.advanceTimersByTime(1);
    expect(f.text()).toBe('');
  });

  it('honors configurable clear delay and separator', async () => {
    const f = fixture({ clearDelay: 50, separator: ' | ' });
    f.announcer.prepare();
    f.announcer.announce('A');
    f.announcer.announce('B');
    await Promise.resolve();
    expect(f.text()).toBe('A | B');
    vi.advanceTimersByTime(50);
    expect(f.text()).toBe('');
    f.announcer.clearDelay = -1;
    expect(f.announcer.clearDelay).toBe(ANNOUNCEMENT_CLEAR_DELAY);
  });

  it('debounces keyed messages so only the last one is spoken', async () => {
    const f = fixture();
    f.announcer.prepare();
    f.announcer.announce('Volume 40%', { debounce: 200, key: 'volume' });
    vi.advanceTimersByTime(150);
    f.announcer.announce('Volume 60%', { debounce: 200, key: 'volume' });
    vi.advanceTimersByTime(199);
    await Promise.resolve();
    expect(f.text()).toBe('');
    vi.advanceTimersByTime(1);
    await Promise.resolve();
    expect(f.text()).toBe('Volume 60%');
  });

  it('replaces a batched message with a newer one of the same key', async () => {
    const f = fixture();
    f.announcer.prepare();
    f.announcer.announce('Paused', { key: 'paused' });
    f.announcer.announce('Muted');
    f.announcer.announce('Playing', { key: 'paused' });
    await Promise.resolve();
    expect(f.text()).toBe('Muted. Playing');
  });

  it('re-announces identical consecutive text', async () => {
    const f = fixture();
    f.announcer.prepare();
    f.announcer.announce('Playing');
    await Promise.resolve();
    const first = f.text();
    f.announcer.announce('Playing');
    await Promise.resolve();
    expect(f.text()).not.toBe(first);
    expect(f.text()?.trim()).toBe('Playing');
  });

  it('evaluates the suppression predicate on request and when debounced text is due', async () => {
    let sliderFocused = false;
    const suppress = vi.fn(
      (_message: string, context: { debounced: boolean }) => context.debounced && sliderFocused,
    );
    const f = fixture({ suppress });
    f.announcer.prepare();
    f.announcer.announce('Seeked to 1:00', { debounce: 200, key: 'seek' });
    sliderFocused = true;
    vi.advanceTimersByTime(200);
    await Promise.resolve();
    expect(f.text()).toBe('');
    f.announcer.announce('Seeked to 2:00', { debounce: 200, key: 'seek' });
    f.announcer.announce('Paused');
    await Promise.resolve();
    expect(f.text()).toBe('Paused');
    expect(suppress).toHaveBeenCalledWith('Paused', {
      politeness: 'polite',
      key: 'Paused',
      debounced: false,
    });
  });

  it('cancels pending messages by key and ignores empty text', async () => {
    const f = fixture();
    f.announcer.prepare();
    f.announcer.announce('   ');
    f.announcer.announce('Volume 10%', { debounce: 200, key: 'volume' });
    f.announcer.announce('Muted', { key: 'mute' });
    f.announcer.announce('Captions off');
    f.announcer.cancel('volume');
    f.announcer.cancel('mute');
    vi.advanceTimersByTime(200);
    await Promise.resolve();
    expect(f.text()).toBe('Captions off');
  });

  it('places regions in a provided root and follows root changes', async () => {
    vi.useFakeTimers();
    const document = new FakeDocument();
    const first = document.createElement('div');
    const second = document.createElement('div');
    let root = first;
    const announcer = new LiveAnnouncer({ root: () => root as unknown as Element });
    announcer.announce('One');
    vi.advanceTimersByTime(ANNOUNCEMENT_REGION_SETTLE_DELAY);
    const region = announcer.region() as unknown as FakeElement;
    expect(region.parentNode).toBe(first);
    expect(region.textContent).toBe('One');
    root = second;
    announcer.announce('Two');
    expect(region.parentNode).toBe(second);
    vi.advanceTimersByTime(ANNOUNCEMENT_REGION_SETTLE_DELAY);
    expect(region.textContent).toBe('Two');
    announcer.dispose();
  });

  it('removes regions and stops pending work on dispose', async () => {
    const f = fixture();
    f.announcer.prepare();
    f.announcer.announce('Volume 10%', { debounce: 200 });
    f.announcer.announce('Playing');
    f.announcer.dispose();
    expect(f.document.body.children).toHaveLength(0);
    vi.advanceTimersByTime(1000);
    await Promise.resolve();
    f.announcer.announce('Late');
    f.announcer.prepare();
    expect(f.document.body.children).toHaveLength(0);
    expect(f.announcer.region()).toBeUndefined();
  });

  it('clear() empties regions immediately', async () => {
    const f = fixture();
    f.announcer.prepare();
    f.announcer.announce('Playing');
    await Promise.resolve();
    f.announcer.clear();
    expect(f.text()).toBe('');
  });
});
