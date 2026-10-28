import { describe, expect, it } from 'vitest';
import {
  affectsEnvironment,
  changedStyleProperties,
  ComposedEnvironmentObserver,
} from './composed-environment.js';

const record = (attributeName: string, oldValue: string | null, value: string | null) => ({
  attributeName,
  oldValue,
  target: { getAttribute: () => value } as unknown as Node,
});

describe('composed environment observation', () => {
  it('lists the inline properties a style change touched', () => {
    expect([...changedStyleProperties(null, 'user-select: none; cursor: grabbing;')]).toEqual([
      'user-select',
      'cursor',
    ]);
    expect([
      ...changedStyleProperties('cursor: grabbing; --tp-x: 1', 'cursor: grabbing; --tp-x: 2'),
    ]).toEqual(['--tp-x']);
    expect([...changedStyleProperties('Direction: RTL', 'direction: RTL')]).toEqual([]);
  });

  it('reads the environment again only for changes that can alter it', () => {
    // A drag leasing user-select and cursor on the root element, and its release.
    expect(affectsEnvironment(record('style', null, 'user-select: none; cursor: grabbing;'))).toBe(
      false,
    );
    expect(affectsEnvironment(record('style', 'user-select: none; cursor: grabbing;', ''))).toBe(
      false,
    );
    expect(
      affectsEnvironment(record('style', 'cursor: grabbing;', 'cursor: grabbing; direction: rtl')),
    ).toBe(true);
    expect(affectsEnvironment(record('style', '', '--tp-background: red'))).toBe(true);
    expect(affectsEnvironment(record('style', 'color-scheme: dark', ''))).toBe(true);
    for (const name of ['dir', 'lang', 'class', 'slot', 'data-theme'])
      expect(affectsEnvironment(record(name, null, 'x'))).toBe(true);
  });

  it('does not read the environment again when a positioned surface around it moves', () => {
    // A surface that follows its anchor while the page scrolls: placement and geometry only.
    const before =
      'position: fixed; left: 0px; top: 0px; translate: 80px 152px; --tp-anchor-width: 80px; --tp-anchor-height: 40px; --tp-available-width: 784px; --tp-available-height: 432px; --tp-transform-origin: 40px -8px;';
    const after =
      'position: fixed; left: 0px; top: 0px; translate: 80px 150px; --tp-anchor-width: 80px; --tp-anchor-height: 40px; --tp-available-width: 784px; --tp-available-height: 434px; --tp-transform-origin: 40px -8px;';
    expect(affectsEnvironment(record('style', before, after))).toBe(false);
    // A theme token written inline beside them still does.
    expect(affectsEnvironment(record('style', before, `${after} --tp-radius: 2px;`))).toBe(true);
  });

  it('leaves a surface geometry inherited from an ancestor out of the environment', () => {
    let callback: ((records: unknown[]) => void) | undefined;
    class FakeMutationObserver {
      constructor(next: (records: unknown[]) => void) {
        callback = next;
      }
      observe(): void {}
      disconnect(): void {}
    }
    const values: Record<string, string> = {
      '--tp-available-height': '432px',
      '--tp-background': 'white',
    };
    const names = Object.keys(values);
    const style = {
      get length() {
        return names.length;
      },
      ...Object.fromEntries(names.map((name, index) => [index, name])),
      getPropertyValue: (name: string) => values[name] ?? '',
      direction: 'ltr',
      writingMode: 'horizontal-tb',
      colorScheme: 'normal',
    };
    const view = {
      MutationObserver: FakeMutationObserver,
      matchMedia: () => ({
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
      getComputedStyle: () => style,
    };
    const owner = {
      nodeType: 1,
      localName: 'tp-menu',
      isConnected: true,
      parentNode: null,
      assignedSlot: null,
      lang: '',
      closest: () => null,
      getAttribute: () => null,
      getRootNode: () => ({}),
      ownerDocument: { defaultView: view, documentElement: { lang: '' } },
    } as unknown as HTMLElement;
    let changed = 0;
    const observer = new ComposedEnvironmentObserver(owner, () => void (changed += 1));
    observer.connect();
    // The class of an ancestor changed while the surface around the owner moved.
    values['--tp-available-height'] = '300px';
    callback!([record('class', 'a', 'b')]);
    expect(changed).toBe(0);
    values['--tp-background'] = 'black';
    callback!([record('class', 'b', 'c')]);
    expect(changed).toBe(1);
    observer.disconnect();
  });

  it('observes old values and checks only when a record affects the environment', () => {
    let callback: ((records: unknown[]) => void) | undefined;
    const options: unknown[] = [];
    class FakeMutationObserver {
      constructor(next: (records: unknown[]) => void) {
        callback = next;
      }
      observe(_: unknown, init: unknown): void {
        options.push(init);
      }
      disconnect(): void {}
    }
    let reads = 0;
    const style = {
      length: 0,
      direction: 'ltr',
      writingMode: 'horizontal-tb',
      colorScheme: 'normal',
    };
    const view = {
      MutationObserver: FakeMutationObserver,
      matchMedia: () => ({
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
      getComputedStyle: () => {
        reads += 1;
        return style;
      },
    };
    const owner = {
      nodeType: 1,
      localName: 'tp-menu',
      isConnected: true,
      parentNode: null,
      assignedSlot: null,
      lang: '',
      closest: () => null,
      getAttribute: () => null,
      getRootNode: () => ({}),
      ownerDocument: { defaultView: view, documentElement: { lang: '' } },
    } as unknown as HTMLElement;
    let changed = 0;
    const observer = new ComposedEnvironmentObserver(owner, () => void (changed += 1));
    observer.connect();
    expect(options).toEqual([
      expect.objectContaining({ attributes: true, attributeOldValue: true }),
    ]);
    const connected = reads;
    callback!([record('style', null, 'user-select: none; cursor: grabbing;')]);
    expect(reads).toBe(connected);
    style.direction = 'rtl';
    callback!([record('style', 'cursor: grabbing;', 'cursor: grabbing; direction: rtl')]);
    expect(reads).toBe(connected + 1);
    expect(changed).toBe(1);
    observer.disconnect();
  });
});
