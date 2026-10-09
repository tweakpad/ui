import { describe, expect, it } from 'vitest';
import { CheckboxGroupController, checkboxParentSelection } from './checkbox-group.js';
describe('Checkbox logical parent membership', () => {
  it('selects enabled logical children, preserves disabled checked and unmatched state', () => {
    expect(
      checkboxParentSelection(
        ['held', 'unmounted'],
        ['held', 'blocked', 'a', 'b'],
        new Set(['held', 'blocked']),
        true,
      ),
    ).toEqual(['held', 'unmounted', 'a', 'b']);
  });
  it('clears only eligible logical children without mutating source', () => {
    const current = Object.freeze(['a', 'held', 'unmounted']);
    expect(checkboxParentSelection(current, ['a', 'held'], new Set(['held']), false)).toEqual([
      'held',
      'unmounted',
    ]);
    expect(current).toEqual(['a', 'held', 'unmounted']);
  });
  it('treats whitespace and prototype names as ordinary values', () => {
    expect(checkboxParentSelection([], ['constructor', 'a b'], new Set(), true)).toEqual([
      'constructor',
      'a b',
    ]);
  });
});

/** A grouping host: attribute storage, a document with a no-op MutationObserver, no members. */
function groupHost(initial: Record<string, string> = {}) {
  const attributes = new Map(Object.entries(initial));
  const view = {
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    HTMLFormElement: class {},
  };
  const members: object[] = [];
  const host = Object.assign(new EventTarget(), {
    localName: 'div',
    ownerDocument: Object.assign(new EventTarget(), { defaultView: view }),
    getAttribute: (name: string) => attributes.get(name) ?? null,
    setAttribute: (name: string, value: string) => void attributes.set(name, value),
    removeAttribute: (name: string) => void attributes.delete(name),
    hasAttribute: (name: string) => attributes.has(name),
    querySelectorAll: () => members,
  });
  return { host: host as unknown as HTMLElement, members };
}
const refreshed = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('CheckboxGroupController host attributes', () => {
  it('restores the role and aria-disabled it still owns', async () => {
    const { host } = groupHost({ 'aria-disabled': 'true' });
    const controller = new CheckboxGroupController(host);
    await refreshed();
    expect([host.getAttribute('role'), host.getAttribute('aria-disabled')]).toEqual([
      'group',
      'false',
    ]);
    controller.disconnect();
    expect([host.getAttribute('role'), host.getAttribute('aria-disabled')]).toEqual([null, 'true']);
  });

  it('keeps consumer edits made while bound', async () => {
    const { host } = groupHost();
    const controller = new CheckboxGroupController(host);
    await refreshed();
    host.setAttribute('role', 'radiogroup');
    host.setAttribute('aria-disabled', 'true');
    controller.disconnect();
    expect([host.getAttribute('role'), host.getAttribute('aria-disabled')]).toEqual([
      'radiogroup',
      'true',
    ]);
  });

  it('reports duplicate values once, with a warning severity', async () => {
    const { host, members } = groupHost();
    const member = (value: string) => ({
      value,
      parent: false,
      parentElement: host,
      checkboxGroup: null,
      requestUpdate() {},
    });
    members.push(member('a'), member('a'));
    const seen: unknown[] = [];
    host.addEventListener('tp-diagnostic', (event) => seen.push((event as CustomEvent).detail));
    const controller = new CheckboxGroupController(host);
    await refreshed();
    controller.refresh();
    await refreshed();
    expect(seen).toEqual([
      {
        code: 'checkbox-group-duplicate:a',
        message: 'Later duplicate Checkbox values are excluded from group participation.',
        severity: 'warning',
      },
    ]);
    controller.disconnect();
  });
});
