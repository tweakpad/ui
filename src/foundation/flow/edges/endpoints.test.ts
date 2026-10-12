import { describe, expect, it } from 'vitest';
import type { FlowResolvedPort } from '../types.js';
import {
  defaultPortGeometry,
  defaultSide,
  fallbackSide,
  pickPort,
  resolveEndpoint,
  resolveSide,
  sideAnchor,
} from './endpoints.js';

const rect = { x: 100, y: 100, width: 200, height: 100 };

function port(
  partial: Partial<FlowResolvedPort> & { id: string; direction: 'input' | 'output' },
): FlowResolvedPort {
  const side = partial.side ?? defaultSide(partial.direction, 'horizontal');
  return {
    nodeId: 'n',
    index: 0,
    count: 1,
    geometry: { id: partial.id, ...defaultPortGeometry(rect, side, 0, 1) },
    ...partial,
  };
}

describe('edge endpoints', () => {
  it('derives default sides from the layout direction', () => {
    expect(defaultSide('input', undefined)).toBe('left');
    expect(defaultSide('output', 'none')).toBe('right');
    expect(defaultSide('input', 'vertical')).toBe('top');
    expect(defaultSide('output', 'vertical')).toBe('bottom');
    expect(defaultSide('output', 'smart')).toBe('right');
  });

  it('distributes default port boxes along a side', () => {
    expect(defaultPortGeometry(rect, 'left', 0, 1)).toEqual({
      x: -4,
      y: 46,
      width: 8,
      height: 8,
      side: 'left',
    });
    expect(defaultPortGeometry(rect, 'right', 1, 3)).toEqual({
      x: 196,
      y: 46,
      width: 8,
      height: 8,
      side: 'right',
    });
    expect(defaultPortGeometry(rect, 'top', 0, 3)).toEqual({
      x: 46,
      y: -4,
      width: 8,
      height: 8,
      side: 'top',
    });
    expect(defaultPortGeometry(rect, 'bottom', 2, 3)).toEqual({
      x: 146,
      y: 96,
      width: 8,
      height: 8,
      side: 'bottom',
    });
    expect(sideAnchor({ x: 0, y: 0, width: 8, height: 8 }, 'right')).toEqual({ x: 8, y: 4 });
  });

  it('prefers declared over measured over default sides', () => {
    const geometry = { id: 'p', x: 0, y: 0, width: 8, height: 8, side: 'top' as const };
    expect(resolveSide({ side: 'bottom', geometry, measured: true }, 'input', 'horizontal')).toBe(
      'bottom',
    );
    expect(resolveSide({ geometry, measured: true }, 'input', 'horizontal')).toBe('top');
    expect(resolveSide({ geometry, measured: false }, 'input', 'horizontal')).toBe('left');
    expect(resolveSide({}, 'output', 'vertical')).toBe('bottom');
  });

  it('picks the port by id, then the first visible port of the direction', () => {
    const ports = [
      port({ id: 'hidden-out', direction: 'output', hidden: true }),
      port({ id: 'in', direction: 'input' }),
      port({ id: 'out', direction: 'output' }),
    ];
    expect(pickPort(ports, 'in', 'output')?.id).toBe('in');
    expect(pickPort(ports, undefined, 'output')?.id).toBe('out');
    expect(pickPort(ports, undefined, 'input')?.id).toBe('in');
    expect(pickPort(ports, 'missing', 'input')).toBeUndefined();
    expect(pickPort([port({ id: 'only', direction: 'input' })], undefined, 'output')?.id).toBe(
      'only',
    );
    expect(
      pickPort([port({ id: 'only', direction: 'input' })], undefined, 'output', false),
    ).toBeUndefined();
  });

  it('resolves a declared-side port on its measured box', () => {
    const measured = port({
      id: 'out',
      direction: 'output',
      side: 'bottom',
      measured: true,
      geometry: { id: 'out', x: 50, y: 92, width: 16, height: 16, side: 'bottom' },
    });
    const endpoint = resolveEndpoint({
      nodeId: 'n',
      rect,
      ports: [measured],
      portId: 'out',
      direction: 'output',
    });
    expect(endpoint).toEqual({
      point: { x: 158, y: 208 },
      side: 'bottom',
      nodeId: 'n',
      portId: 'out',
      rect,
    });
  });

  it('uses the layout default when nothing is declared or measured and no facing point is given', () => {
    const endpoint = resolveEndpoint({
      nodeId: 'n',
      rect,
      ports: [port({ id: 'out', direction: 'output' })],
      portId: undefined,
      direction: 'output',
      layout: 'horizontal',
    });
    expect(endpoint.side).toBe('right');
    expect(endpoint.point).toEqual({ x: 304, y: 150 });
  });

  it('faces the other endpoint for non-orthogonal kinds and keeps the default for orthogonal', () => {
    const ports = [port({ id: 'out', direction: 'output' })];
    const facing = resolveEndpoint({
      nodeId: 'n',
      rect,
      ports,
      portId: 'out',
      direction: 'output',
      kind: 'bezier',
      other: { x: 200, y: 600 },
    });
    expect(facing.side).toBe('bottom');
    expect(facing.point).toEqual({ x: 200, y: 204 });
    const routed = resolveEndpoint({
      nodeId: 'n',
      rect,
      ports,
      portId: 'out',
      direction: 'output',
      kind: 'orthogonal',
      other: { x: 200, y: 600 },
    });
    expect(routed.side).toBe('right');
    expect(fallbackSide(rect, { x: -100, y: 150 })).toBe('left');
  });

  it('anchors on the node side when the node has no ports', () => {
    const endpoint = resolveEndpoint({
      nodeId: 'n',
      rect,
      ports: [],
      portId: undefined,
      direction: 'input',
      layout: 'vertical',
    });
    expect(endpoint).toEqual({
      point: { x: 200, y: 100 },
      side: 'top',
      nodeId: 'n',
      portId: undefined,
      rect,
    });
    const facing = resolveEndpoint({
      nodeId: 'n',
      rect,
      ports: [],
      portId: undefined,
      direction: 'input',
      kind: 'straight',
      other: { x: 900, y: 150 },
    });
    expect(facing.side).toBe('right');
  });
});
