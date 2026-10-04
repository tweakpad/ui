import { expect, it } from 'vitest';
import { EntityRegistry, RegistryCoordinator, type RegistryEntity } from './registry.js';
it('keeps typed IDs, the first registrant and instance-guarded cleanup', () => {
  const registry = new EntityRegistry(new RegistryCoordinator(() => {}));
  const a = { id: 1, destroyed: false },
    b = { id: '1', destroyed: false },
    duplicate = { ...a };
  expect(registry.register(a.id, a)).toBe(true);
  expect(registry.register(b.id, b)).toBe(true);
  expect(registry.register(duplicate.id, duplicate)).toBe(false);
  registry.unregister(duplicate);
  expect([...registry]).toEqual([a, b]);
});
it('validates final permutations across both lanes without intermediate publication', () => {
  const snapshots: unknown[] = [];
  const coordinator = new RegistryCoordinator(() => snapshots.push([...drag].map((x) => x.id)));
  const drag = new EntityRegistry<RegistryEntity>(coordinator),
    drop = new EntityRegistry<RegistryEntity>(coordinator);
  const a = { id: 'a', destroyed: false },
    b = { id: 'b', destroyed: false },
    ad = { ...a },
    bd = { ...b };
  drag.register(a.id, a);
  drag.register(b.id, b);
  drop.register(ad.id, ad);
  drop.register(bd.id, bd);
  snapshots.length = 0;
  for (const [registry, first, second] of [
    [drag, a, b],
    [drop, ad, bd],
  ] as const) {
    coordinator.rekey(registry, first, 'b', () => {
      first.id = 'b';
    });
    coordinator.rekey(registry, second, 'a', () => {
      second.id = 'a';
    });
  }
  coordinator.flush();
  expect(snapshots).toEqual([['b', 'a']]);
  expect(drag.get('b')).toBe(a);
  expect(drop.get('a')).toBe(bd);
  coordinator.rekey(drag, a, 'a', () => {
    a.id = 'a';
  });
  coordinator.flush();
  expect(a.id).toBe('b');
  expect(drag.get('a')).toBe(b);
});
