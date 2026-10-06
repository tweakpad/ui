import { describe, expect, it } from 'vitest';
import { logicalPortalOwner, nearestOwner, setLogicalPortalOwner } from './portal-ownership.js';

interface FakeNode {
  name: string;
  nodeType: number;
  parentNode: FakeNode | null;
  assignedSlot?: FakeNode | null;
  host?: FakeNode;
}
function element(name: string, parent: FakeNode | null = null): FakeNode {
  return { name, nodeType: 1, parentNode: parent, assignedSlot: null };
}
function shadowRoot(host: FakeNode): FakeNode {
  return { name: `${host.name}#shadow`, nodeType: 11, parentNode: null, host };
}
const node = (fake: FakeNode) => fake as unknown as Node;
const named = (name: string) => (candidate: Node) =>
  (candidate as unknown as FakeNode).name === name;

/**
 * document > body > [player > menu-owner] and body > portal-host (logical owner: menu-owner)
 * portal-host > shadow > panel > item > control
 */
function fixture() {
  const body = element('body');
  const player = element('player', body);
  const menuOwner = element('menu-owner', player);
  const portalHost = element('portal-host', body);
  const portalShadow = shadowRoot(portalHost);
  const panel = element('panel', portalShadow);
  const item = element('item', panel);
  const control = element('control', item);
  setLogicalPortalOwner(node(portalHost), node(menuOwner) as HTMLElement);
  return { body, player, menuOwner, portalHost, panel, item, control };
}

describe('nearestOwner (media player C-03; drawer/navigation panel V-76)', () => {
  it('walks composed parents through shadow hosts and assigned slots', () => {
    const root = element('root');
    const host = element('host', root);
    const shadow = shadowRoot(host);
    const slot = element('slot', shadow);
    const light = element('light', host);
    light.assignedSlot = slot;
    expect(nearestOwner(node(light), named('slot'))).toBe(node(slot));
    expect(nearestOwner(node(light), named('host'))).toBe(node(host));
    expect(nearestOwner(node(light), named('root'))).toBe(node(root));
    const inner = element('inner', shadow);
    expect(nearestOwner(node(inner), named('host'))).toBe(node(host));
  });

  it('considers only strict ancestors and returns null when nothing matches', () => {
    const { control } = fixture();
    expect(nearestOwner(node(control), named('control'))).toBeNull();
    expect(nearestOwner(node(control), () => false)).toBeNull();
  });

  it('continues from a portal host to its logical owner', () => {
    const { control, player, menuOwner, portalHost } = fixture();
    expect(nearestOwner(node(control), named('player'))).toBe(node(player));
    expect(nearestOwner(node(control), named('menu-owner'))).toBe(node(menuOwner));
    expect(nearestOwner(node(control), named('portal-host'))).toBe(node(portalHost));
    // The physical parent of the portal host is not on the logical path.
    expect(nearestOwner(node(control), named('body'))).toBe(
      nearestOwner(node(menuOwner), named('body')),
    );
    setLogicalPortalOwner(node(portalHost), null);
  });

  it('prefers an owner inside the relocated subtree over the portal owner chain', () => {
    const { control, panel, portalHost } = fixture();
    expect(nearestOwner(node(control), named('panel'))).toBe(node(panel));
    expect(logicalPortalOwner(node(control))).not.toBe(node(panel));
    setLogicalPortalOwner(node(portalHost), null);
  });

  it('narrows the result through a type predicate', () => {
    const { control, portalHost } = fixture();
    const owner = nearestOwner(
      node(control),
      (candidate): candidate is HTMLElement & { name: string } =>
        (candidate as unknown as FakeNode).name === 'player',
    );
    expect(owner?.name).toBe('player');
    setLogicalPortalOwner(node(portalHost), null);
  });

  it('terminates on logical ownership cycles', () => {
    const a = element('a');
    const b = element('b');
    const start = element('start', a);
    setLogicalPortalOwner(node(a), node(b) as HTMLElement);
    setLogicalPortalOwner(node(b), node(a) as HTMLElement);
    expect(nearestOwner(node(start), named('missing'))).toBeNull();
    expect(nearestOwner(node(start), named('b'))).toBe(node(b));
    setLogicalPortalOwner(node(a), null);
    setLogicalPortalOwner(node(b), null);
  });
});
