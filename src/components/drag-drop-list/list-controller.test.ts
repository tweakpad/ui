import { describe, expect, it } from 'vitest';
import { ControllableState, orderedValuesEqual } from '../../foundation/controllable-state.js';
import { DragDropManager } from '../../foundation/drag-drop/manager.js';
import { Draggable, Droppable } from '../../foundation/drag-drop/entities.js';
import { ListController, itemParticipation } from './list-controller.js';
import type { TpDragDropList } from './drag-drop-list.js';

function list(
  manager: DragDropManager,
  group: string,
  initial: readonly { id: string; label?: string }[],
  controlled = false,
) {
  const host = Object.assign(new EventTarget(), {
    group,
    disabled: false,
    readOnly: false,
    reorderMode: 'move',
    getItemId: undefined,
    getItemLabel: undefined,
    updateComplete: Promise.resolve(true),
    addController() {},
    removeController() {},
    requestUpdate() {},
    observeDragEvent() {},
    createFeedbackPreview() {
      throw new Error('No browser rendering in lane tests.');
    },
    onValueChange: undefined as ((event: Event) => void) | undefined,
  });
  let provided = controlled ? initial : undefined;
  const commits: unknown[] = [];
  const state = new ControllableState({
    host,
    initialValue: initial,
    readControlledValue: () => provided,
    equals: orderedValuesEqual,
    onChange: (event) => host.onValueChange?.(event),
    onCommit: (value, previous, reason) => commits.push({ value, previous, reason }),
  });
  const controller = new ListController(
    host as unknown as TpDragDropList<{ id: string; label?: string }>,
    state,
  );
  Object.assign(host, { controller });
  Object.defineProperties(host, {
    value: {
      get: () => state.value,
      set: (value) => {
        provided = value;
        state.sync();
      },
    },
    controlledInput: { get: () => provided },
  });
  state.initialize();
  controller.sync();
  controller.connect(manager);
  const target = new Droppable(
    { id: `container-${group}`, accept: controller.network!.type, data: { list: controller } },
    manager,
  );
  target.register();
  Object.assign(host, { containerTarget: target });
  for (const item of initial)
    new Draggable(
      { id: item.id, type: controller.network!.type, data: { item, list: controller } },
      manager,
    ).register();
  return {
    host: host as unknown as TpDragDropList<{ id: string; label?: string }>,
    controller,
    state,
    commits,
  };
}
const manager = () =>
  new DragDropManager({ sensors: [], feedback: 'none', autoScroll: false, accessibility: false });
describe('connected canonical list transactions', () => {
  it('transfers immutable object identity and publishes both lanes before either commit callback', () => {
    const m = manager(),
      item = Object.freeze({ id: 'a', label: 'A' }),
      initial = Object.freeze([item, Object.freeze({ id: 'b' })]);
    const a = list(m, 'a', initial),
      b = list(m, 'b', Object.freeze([]));
    const seen: unknown[] = [];
    a.host.addEventListener('tp-value-change', () => seen.push([a.host.value, b.host.value]));
    b.host.addEventListener('tp-value-change', () => seen.push([a.host.value, b.host.value]));
    expect(a.controller.moveItem('a', { list: b.host, index: 0 })).toBe('accepted');
    expect(seen).toEqual([
      [initial, []],
      [initial, []],
    ]);
    expect(a.host.value.map((x) => x.id)).toEqual(['b']);
    expect(b.host.value[0]).toBe(item);
    expect(initial.map((x) => x.id)).toEqual(['a', 'b']);
    expect(a.commits).toHaveLength(1);
    expect(b.commits).toHaveLength(1);
    m.destroy();
  });
  it('accepts compatible controlled normalization with fresh object references', () => {
    const m = manager(),
      a = list(m, 'a', [{ id: 'a' }], true),
      b = list(m, 'b', [], true);
    for (const entry of [a, b])
      entry.host.addEventListener('tp-value-change', (event) => {
        const value = (event as CustomEvent).detail.value;
        entry.host.value = value.map((item: { id: string }) => ({ ...item, label: 'Normalized' }));
      });
    expect(a.controller.moveItem('a', { group: 'b', index: 0 })).toBe('accepted');
    expect(a.host.value).toEqual([]);
    expect(b.host.value).toEqual([{ id: 'a', label: 'Normalized' }]);
    m.destroy();
  });
  it.each(['missing', 'veto', 'wrong-order', 'duplicate'] as const)(
    'rejects every lane for %s acknowledgment',
    (mode) => {
      const m = manager(),
        source = Object.freeze([{ id: 'a' }]),
        destination = Object.freeze([{ id: 'b' }, { id: 'c' }]);
      const a = list(m, 'a', source, true),
        b = list(m, 'b', destination, true);
      a.host.addEventListener('tp-value-change', (event) => {
        a.host.value = (event as CustomEvent).detail.value;
      });
      b.host.addEventListener('tp-value-change', (event) => {
        const proposed = (event as CustomEvent).detail.value;
        if (mode === 'veto') {
          b.host.value = proposed;
          event.preventDefault();
        }
        if (mode === 'wrong-order') b.host.value = [...proposed].reverse();
        if (mode === 'duplicate') b.host.value = [proposed[0], proposed[0], proposed[0]];
      });
      expect(a.controller.moveItem('a', { group: 'b', index: 1 })).toBe('rejected');
      expect(a.host.value).toBe(source);
      expect(b.host.value).toBe(destination);
      expect(a.commits).toEqual([]);
      expect(b.commits).toEqual([]);
      a.state.hostUpdate();
      b.state.hostUpdate();
      expect(a.host.value).toBe(source);
      expect(b.host.value).toBe(destination);
      m.destroy();
    },
  );
  it('rejects direct callback failures and invalid destinations without partial changes', () => {
    const m = manager(),
      a = list(m, 'a', [{ id: 'a' }]),
      b = list(m, 'b', []);
    a.host.onValueChange = () => {
      throw new Error('Application veto by direct callback failure');
    };
    expect(a.controller.moveItem('a', { list: b.host, index: 0 })).toBe('rejected');
    expect(a.host.value).toEqual([{ id: 'a' }]);
    expect(b.host.value).toEqual([]);
    for (const index of [-1, 0.5, NaN, Infinity, 2])
      expect(a.controller.moveItem('a', { list: b.host, index })).toBe('rejected');
    b.host.readOnly = true;
    expect(a.controller.moveItem('a', { list: b.host, index: 0 })).toBe('rejected');
    m.destroy();
  });
  it('keeps no-op references and same-list swap semantics', () => {
    const m = manager(),
      original = Object.freeze([{ id: 'a' }, { id: 'b' }, { id: 'c' }]),
      a = list(m, 'a', original);
    expect(a.controller.moveItem('a', { index: 0 })).toBe('no-op');
    expect(a.host.value).toBe(original);
    expect(a.commits).toEqual([]);
    a.host.reorderMode = 'swap';
    expect(a.controller.moveItem('a', { index: 2 })).toBe('accepted');
    expect(a.host.value.map((x) => x.id)).toEqual(['c', 'b', 'a']);
    m.destroy();
  });
});

describe('item participation lanes', () => {
  const idle = { disabled: false, readOnly: false, duplicate: false };
  it('splits draggable and droppable options for drag/drop-disabled markers', () => {
    expect(itemParticipation(undefined, idle)).toEqual({
      dragDisabled: false,
      dropDisabled: false,
    });
    expect(itemParticipation(true, idle)).toEqual({ dragDisabled: true, dropDisabled: true });
    expect(itemParticipation({ draggable: true }, idle)).toEqual({
      dragDisabled: true,
      dropDisabled: false,
    });
    expect(itemParticipation({ droppable: true }, idle)).toEqual({
      dragDisabled: false,
      dropDisabled: true,
    });
  });
  it('disables both lanes for list disabled, read-only and duplicate identities', () => {
    for (const state of [
      { ...idle, disabled: true },
      { ...idle, readOnly: true },
      { ...idle, duplicate: true },
    ])
      expect(itemParticipation({ draggable: false, droppable: false }, state)).toEqual({
        dragDisabled: true,
        dropDisabled: true,
      });
  });
});
