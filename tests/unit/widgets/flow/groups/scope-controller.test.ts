import { describe, expect, it } from 'vitest';
import { FlowScopeView } from '../../../../../src/foundation/flow/groups/view.js';
import type { FlowModel } from '../../../../../src/foundation/flow/model/model.js';
import type { TpValueChangeEvent } from '../../../../../src/foundation/events.js';
import {
  FlowScopeController,
  flowPathTo,
  parseFlowPath,
  truncateFlowPath,
  type FlowScopeHost,
} from '../../../../../src/widgets/flow/groups/scope-controller.js';
import { DEFAULT_STRINGS } from '../../../../../src/widgets/flow/strings.js';
import { model } from '../../../foundation/flow/groups/fixture.js';

class FakeElement extends EventTarget {
  addController(): void {}
  removeController(): void {}
  requestUpdate(): void {}
  get updateComplete(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

function setup(options: { controlled?: readonly string[]; defaultPath?: readonly string[] } = {}) {
  const target: FlowModel = model();
  const view = new FlowScopeView(target);
  const log = {
    diagnostics: [] as string[],
    scopes: 0,
    selections: [] as string[][],
    focused: [] as string[],
    fits: 0,
    moves: 0,
    announced: [] as string[],
    events: [] as TpValueChangeEvent<readonly string[]>[],
  };
  const element = new FakeElement();
  element.addEventListener('tp-path-change', (event) =>
    log.events.push(event as TpValueChangeEvent<readonly string[]>),
  );
  const host: FlowScopeHost = {
    host: element as unknown as FlowScopeHost['host'],
    model: target,
    view,
    strings: () => DEFAULT_STRINGS,
    nodeLabel: (id) => id,
    announce: (message) => log.announced.push(message),
    readControlledPath: () => options.controlled,
    readDefaultPath: () => options.defaultPath,
    onPathChange: () => {},
    diagnose: (message) => log.diagnostics.push(message),
    scopeChanged: () => (log.scopes += 1),
    select: (ids) => log.selections.push([...ids]),
    viewport: () => ({ x: 0, y: 0, zoom: 1 }),
    moveTo: () => (log.moves += 1),
    fitScope: () => (log.fits += 1),
    focusNode: (id) => log.focused.push(id),
    focusCanvas: () => log.focused.push('canvas'),
    rtl: () => false,
  };
  const controller = new FlowScopeController(host);
  controller.sync();
  return { controller, model: target, view, log, element };
}

describe('path truncation', () => {
  it('keeps the longest prefix of nested groups', () => {
    const target = model();
    const path = ['G', 'H'];
    expect(truncateFlowPath(target, path)).toBe(path);
    expect(truncateFlowPath(target, ['G', 'missing', 'H'])).toEqual(['G']);
    expect(truncateFlowPath(target, ['a'])).toEqual([]);
    expect(truncateFlowPath(target, ['H', 'G'])).toEqual(['H']);
    target.apply([{ type: 'node-remove', id: 'H' }]);
    expect(truncateFlowPath(target, path)).toEqual(['G']);
  });

  it('builds the path to a group and parses the attribute', () => {
    const target = model();
    expect(flowPathTo(target, 'H')).toEqual(['G', 'H']);
    expect(flowPathTo(target, 'a')).toBeUndefined();
    expect(parseFlowPath('["G","H"]')).toEqual(['G', 'H']);
    expect(parseFlowPath('nope')).toBeUndefined();
    expect(parseFlowPath(null)).toBeUndefined();
  });

  it('reconciles an uncontrolled path when its group is removed', () => {
    const { controller, model: target, log } = setup({ defaultPath: ['G', 'H'] });
    expect(controller.effective).toEqual(['G', 'H']);
    const scopes = log.scopes;
    target.apply([{ type: 'node-remove', id: 'H' }]);
    controller.documentChanged();
    expect(controller.path).toEqual(['G']);
    expect(controller.effective).toEqual(['G']);
    expect(log.scopes).toBe(scopes + 1);
    expect(log.diagnostics).toEqual([]);
    // A truncation moves neither the view nor the focus.
    controller.settle();
    expect(log.fits + log.moves + log.focused.length).toBe(0);
  });

  it('shows the cut path and reports a controlled path once', () => {
    const { controller, model: target, log } = setup({ controlled: ['G', 'H'] });
    target.apply([{ type: 'node-remove', id: 'H' }]);
    controller.documentChanged();
    controller.documentChanged();
    expect(controller.path).toEqual(['G', 'H']);
    expect(controller.effective).toEqual(['G']);
    expect(log.diagnostics).toHaveLength(1);
  });

  it('never reads the scope at the root', () => {
    const { controller, log } = setup();
    controller.documentChanged();
    expect(controller.effective).toEqual([]);
    expect(log.scopes).toBe(0);
  });
});

describe('scope transitions', () => {
  it('enters with a cancelable proposal, clears the selection, fits and focuses', () => {
    const { controller, log } = setup();
    expect(controller.enter('H', 'item-press', undefined, 'node')).toBe(true);
    expect(controller.path).toEqual(['G', 'H']);
    expect(log.events[0]?.detail.value).toEqual(['G', 'H']);
    expect(log.events[0]?.detail.metadata).toMatchObject({ surface: 'node', groupId: 'H' });
    expect(log.selections).toEqual([[]]);
    controller.settle();
    expect(log.fits).toBe(1);
    expect(log.focused).toEqual(['b']);
    expect(log.announced).toEqual(['Entered H']);
  });

  it('exits to the parent, restoring its viewport and selecting the group', () => {
    const { controller, log } = setup();
    controller.enter('G', 'item-press', undefined, 'node');
    controller.settle();
    controller.enter('H', 'hotkey', undefined, 'keyboard');
    controller.settle();
    expect(controller.exit('escape-key', undefined, 'keyboard')).toBe(true);
    expect(controller.path).toEqual(['G']);
    controller.settle();
    expect(log.moves).toBe(1);
    expect(log.selections.at(-1)).toEqual(['H']);
    expect(log.focused.at(-1)).toBe('H');
    // Entering H again restores its remembered viewport instead of fitting.
    controller.enter('H', 'hotkey', undefined, 'keyboard');
    controller.settle();
    expect(log.fits).toBe(2);
    expect(log.moves).toBe(2);
    expect(controller.exit('hotkey', undefined, 'keyboard')).toBe(true);
    expect(controller.exit('hotkey', undefined, 'keyboard')).toBe(true);
    expect(controller.exit('hotkey', undefined, 'keyboard')).toBe(false);
  });

  it('leaves the view in its scope when the proposal is cancelled', () => {
    const { controller, element } = setup();
    element.addEventListener('tp-path-change', (event) => event.preventDefault());
    expect(controller.enter('G', 'item-press', undefined, 'node')).toBe(false);
    expect(controller.path).toEqual([]);
    expect(controller.effective).toEqual([]);
  });

  it('refuses a node that is not a group', () => {
    const { controller } = setup();
    expect(controller.enter('a', 'item-press', undefined, 'node')).toBe(false);
  });
});
