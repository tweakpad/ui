import { describe, expect, it } from 'vitest';
import { compositeControl } from '../../foundation/composite-control.js';
import type { ToolbarController, ToolbarItemOptions } from '../../foundation/toolbar.js';
import { roots } from '../../foundation/toolbar-membership.js';
import { TpToggle } from '../toggle/toggle.js';
import { TpToggleGroup } from './toggle-group.js';

// The text editor's toolbars render exclusive tool pairs as one Toggle group, and every control of
// those toolbars stays focusable while disabled, also while read-only (`uwg-te-req-tools-1`,
// `uwg-te-req-a11y-2`, `uwg-te-req-prop-3`). Inside a Toolbar the group registers its Toggles as
// items that stay disabled but focusable stops (`node-010070`, `uwg-te-toggle-group-req-toolbar`).

type Recorded = {
  options: Partial<ToolbarItemOptions> & { disabled?: boolean };
  updates: Partial<ToolbarItemOptions>[];
  disposed: boolean;
};

/** A toolbar that records what the group registers, found through the membership lookup. */
function recordingToolbar() {
  const items = new Map<unknown, Recorded>();
  const groups = new Map<unknown, Recorded>();
  const record = (into: Map<unknown, Recorded>, element: unknown, options: Recorded['options']) => {
    const entry: Recorded = { options: { ...options }, updates: [], disposed: false };
    into.set(element, entry);
    return {
      update: (next: Partial<ToolbarItemOptions>) => void entry.updates.push({ ...next }),
      dispose: () => void (entry.disposed = true),
    };
  };
  const toolbar = {
    registerItem: (element: unknown, options: ToolbarItemOptions) =>
      record(items, element, options),
    registerGroup: (element: unknown, options: { disabled?: boolean }) =>
      record(groups, element, options),
  } as unknown as ToolbarController;
  return { toolbar, items, groups };
}

/** Unit-only group: Node renders nothing, so the update cycle stays idle; membership sync runs. */
class GroupProbe extends TpToggleGroup {
  protected override scheduleUpdate(): void {}
}

function member(value: string, disabled = false): TpToggle {
  const element = new TpToggle();
  element.value = value;
  element.disabled = disabled;
  return element;
}

const settle = () => new Promise((resolve) => setTimeout(resolve));

/** Connects a group holding `members` inside a toolbar root, with its `toggle-group` part. */
async function inToolbar(members: TpToggle[], options: { disabled?: boolean } = {}) {
  const { toolbar, items, groups } = recordingToolbar();
  const bar = { nodeType: 1, localName: 'div', hasAttribute: () => false, parentNode: null };
  roots.set(bar as unknown as HTMLElement, toolbar);
  const group = new GroupProbe();
  group.disabled = options.disabled ?? false;
  for (const item of members) Object.defineProperty(item, 'closest', { value: () => group });
  Object.defineProperties(group, {
    isConnected: { value: true },
    parentNode: { value: bar },
    renderRoot: { value: {}, writable: true },
    ownerDocument: {
      value: {
        defaultView: {
          MutationObserver: class {
            observe() {}
            disconnect() {}
          },
        },
      },
    },
    querySelectorAll: { value: () => members },
  });
  group.connectedCallback();
  // The group part reaches the group through its element reference, as a render binds it.
  group.partContracts = { 'toggle-group': { renderDelegate: (context) => context } };
  const rendered = (group as unknown as { render(): { bind: { values: unknown[][] } } }).render();
  const part = { localName: 'div' };
  (rendered.bind.values[1]![0] as (element: unknown) => void)(part);
  await settle();
  const registered = (element: TpToggle) => items.get(element);
  const resync = async () => {
    group.memberChanged();
    await settle();
  };
  return { group, part, items, groups, registered, resync };
}

const stop = { kind: 'button', focusableWhenDisabled: true };

describe('Toggle group members inside a Toolbar', () => {
  it('keeps a disabled Toggle a focusable Toolbar stop, also one disabled later (`uwg-te-req-a11y-2`, `uwg-te-req-tools-1`, `node-010070`)', async () => {
    const [blockquote, code, later] = [member('blockquote'), member('code', true), member('later')];
    const { group, registered, resync } = await inToolbar([blockquote, code, later]);
    for (const item of [blockquote, code, later]) expect(registered(item)?.options).toEqual(stop);
    expect([blockquote, code, later].map((item) => compositeControl(item)?.readDisabled())).toEqual(
      [false, true, false],
    );
    later.disabled = true;
    await resync();
    expect(compositeControl(later)?.readDisabled()).toBe(true);
    for (const item of [blockquote, code, later]) {
      expect(registered(item)?.options).toEqual(stop);
      expect(registered(item)?.updates).toEqual([]);
    }
    group.disconnectedCallback();
    expect([blockquote, code, later].map((item) => registered(item)?.disposed)).toEqual([
      true,
      true,
      true,
    ]);
  });

  it('keeps every Toggle of a disabled group a focusable Toolbar stop (`uwg-te-req-prop-3`, `uwg-te-req-a11y-2`, `node-010070`)', async () => {
    const pair = [member('superscript'), member('subscript')];
    const { group, part, groups, registered, resync } = await inToolbar(pair, { disabled: true });
    expect(groups.get(part)?.options).toEqual({ disabled: true });
    for (const item of pair) {
      expect(registered(item)?.options).toEqual(stop);
      expect(compositeControl(item)?.readDisabled()).toBe(true);
    }
    group.disabled = false;
    await resync();
    group.disabled = true;
    await resync();
    expect(groups.get(part)?.updates).toEqual([{ disabled: false }, { disabled: true }]);
    for (const item of pair) expect(registered(item)?.updates).toEqual([]);
    group.disconnectedCallback();
  });

  it('skips a Toggle excluded for a duplicate value (`uwg-te-toggle-group-req-toolbar`, `node-010070`)', async () => {
    const [first, duplicate] = [member('align'), member('align')];
    const { group, registered } = await inToolbar([first, duplicate]);
    expect(registered(first)?.options).toEqual(stop);
    expect(registered(duplicate)?.options).toEqual({
      kind: 'button',
      focusableWhenDisabled: false,
    });
    group.disconnectedCallback();
  });
});
