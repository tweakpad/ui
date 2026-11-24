import { describe, expect, it } from 'vitest';
import { FlowScopeView } from '../../../../../src/foundation/flow/groups/view.js';
import type { FlowConnection } from '../../../../../src/foundation/flow/types.js';
import { ConnectionSession } from '../../../../../src/widgets/flow/interaction/connect.js';
import type { FlowInteractionHost } from '../../../../../src/widgets/flow/interaction/host.js';
import { DEFAULT_STRINGS } from '../../../../../src/widgets/flow/strings.js';
import { model } from '../../../foundation/flow/groups/fixture.js';

function fakeHost(path: readonly string[] = [], mode: 'strict' | 'loose' = 'strict') {
  const view = new FlowScopeView(model(), { path });
  const connected: FlowConnection[] = [];
  const host = {
    model: view,
    editable: true,
    zoom: 1,
    connectionRadius: 20,
    connectionMode: mode,
    strings: DEFAULT_STRINGS,
    portEndpoint: () => ({ point: { x: 0, y: 0 }, side: 'right' }),
    setPortState: () => {},
    clearPortStates: () => {},
    setConnectionLine: () => {},
    autoPan: () => {},
    announce: () => {},
    nodeLabel: (id: string) => id,
    portLabel: (_node: string, port: string | undefined) => port ?? '',
    onViewportTick: () => () => {},
    validateConnection: () => ({ valid: true, reasons: [] }),
    connect: (connection: FlowConnection) => {
      connected.push(connection);
      return 'new';
    },
    reconnect: () => true,
    edgeKind: () => 'smoothstep',
    screenToFlow: (point: { x: number; y: number }) => point,
    paneOffset: () => ({ x: 0, y: 0 }),
  } as unknown as FlowInteractionHost;
  return { host, connected };
}

function connect(
  host: FlowInteractionHost,
  from: { nodeId: string; portId: string; direction: 'input' | 'output' },
  to: { nodeId: string; portId: string },
): boolean {
  const session = new ConnectionSession(host, from);
  expect(session.begin('click')).toBe(true);
  return session.completeWith(to.nodeId, to.portId, null);
}

describe('role-aware connection acceptance', () => {
  it('pairs a group input with a member input as an inner edge', () => {
    const { host, connected } = fakeHost();
    expect(
      connect(
        host,
        { nodeId: 'G', portId: 'gin', direction: 'input' },
        { nodeId: 'a', portId: 'in' },
      ),
    ).toBe(true);
    expect(connected).toEqual([{ source: 'G', sourcePort: 'gin', target: 'a', targetPort: 'in' }]);
  });

  it('pairs a member output with its group output', () => {
    const { host, connected } = fakeHost();
    expect(
      connect(
        host,
        { nodeId: 'a', portId: 'out', direction: 'output' },
        { nodeId: 'G', portId: 'gout' },
      ),
    ).toBe(true);
    expect(connected).toEqual([
      { source: 'a', sourcePort: 'out', target: 'G', targetPort: 'gout' },
    ]);
  });

  it('pairs a group input with its own output as a pass-through', () => {
    const { host, connected } = fakeHost();
    expect(
      connect(
        host,
        { nodeId: 'G', portId: 'gin', direction: 'input' },
        { nodeId: 'G', portId: 'gout' },
      ),
    ).toBe(true);
    expect(connected).toEqual([
      { source: 'G', sourcePort: 'gin', target: 'G', targetPort: 'gout' },
    ]);
  });

  it('still refuses two outputs between siblings in strict mode', () => {
    const { host, connected } = fakeHost();
    expect(
      connect(
        host,
        { nodeId: 'x', portId: 'out', direction: 'output' },
        { nodeId: 'y', portId: 'out' },
      ),
    ).toBe(false);
    expect(connected).toEqual([]);
  });

  it('connects a terminal port to a member inside the group', () => {
    const { host, connected } = fakeHost(['G']);
    // The Inputs terminal lists the group inputs facing inward (as outputs).
    expect(
      connect(
        host,
        { nodeId: 'G#inputs', portId: 'gin', direction: 'output' },
        { nodeId: 'a', portId: 'in' },
      ),
    ).toBe(true);
    expect(connected).toEqual([
      { source: 'G#inputs', sourcePort: 'gin', target: 'a', targetPort: 'in' },
    ]);
    expect((host.model as FlowScopeView).resolve(connected[0]!)).toMatchObject({ source: 'G' });
  });

  it('orients a loose connection from the group input inward', () => {
    const { host, connected } = fakeHost([], 'loose');
    expect(
      connect(
        host,
        { nodeId: 'a', portId: 'in', direction: 'input' },
        { nodeId: 'G', portId: 'gin' },
      ),
    ).toBe(true);
    expect(connected).toEqual([{ source: 'G', sourcePort: 'gin', target: 'a', targetPort: 'in' }]);
  });
});
