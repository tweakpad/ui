import { fakeHost } from './fakes.test.js';
import { describe, expect, it } from 'vitest';
import { ChoiceModel } from './choice-model.js';
describe('Select source record lifecycle', () => {
  it('retains duplicate records for diagnostics while rendering repeated identities once', () => {
    const model = new ChoiceModel(fakeHost());
    const option = { value: 'b', label: 'Beta' };
    model.update(['a', 'a', option, option], String, String);
    expect(model.records).toHaveLength(4);
    expect(model.nodes).toHaveLength(2);
    const ids = model.nodes.map((node) => node.id);
    model.update([option, 'a', option], String, String);
    expect(model.nodes.map((node) => node.id)).toEqual([ids[1], ids[0]]);
  });
  it('deduplicates nested repeated groups without discarding distinct declarations', () => {
    const model = new ChoiceModel(fakeHost());
    const group = { type: 'group' as const, label: 'Group', items: ['a', 'a'] };
    model.update([group, group, { value: 'a', label: 'Another declaration' }], String, String);
    expect(model.nodes).toHaveLength(2);
    expect('children' in model.nodes[0]! && model.nodes[0].children).toHaveLength(1);
    expect(model.records).toHaveLength(5);
  });
  it('keeps distinct signed-zero scalar identities required by Object.is equality', () => {
    const model = new ChoiceModel(fakeHost());
    model.update([-0, 0], String, String);
    expect(model.nodes).toHaveLength(2);
    expect(Object.is(model.records[0]!.value, -0)).toBe(true);
    expect(Object.is(model.records[1]!.value, 0)).toBe(true);
    const ids = model.nodes.map((node) => node.id);
    model.update([0, -0], String, String);
    expect(model.nodes.map((node) => node.id)).toEqual([ids[1], ids[0]]);
  });
  it('removes the Presence owner for source records that disappear', () => {
    const controllerHost = fakeHost();
    const model = new ChoiceModel(controllerHost);
    model.update(['a', 'b'], String, String);
    const first = model.records[0]!.presence;
    model.update(['b'], String, String);
    expect(controllerHost.removeController).toHaveBeenCalledWith(first);
    expect(controllerHost.removeController).toHaveBeenCalledTimes(1);
    model.destroy();
    expect(controllerHost.removeController).toHaveBeenCalledTimes(2);
  });
});
