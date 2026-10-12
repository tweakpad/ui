import { describe, expect, it } from 'vitest';
import {
  mapToFlowCoordinates,
  portSidesFor,
  resolveDirection,
  smartDirection,
} from './direction.js';
import type { FlowLayoutNode, FlowLayoutRequest } from './types.js';

const node = (id: string, ports: FlowLayoutNode['ports'] = []): FlowLayoutNode => ({
  id,
  size: { width: 10, height: 10 },
  ports,
});

describe('direction', () => {
  it('maps main/cross to flow coordinates and derives port sides', () => {
    expect(mapToFlowCoordinates(10, 20, 'horizontal')).toEqual({ x: 10, y: 20 });
    expect(mapToFlowCoordinates(10, 20, 'vertical')).toEqual({ x: 20, y: 10 });
    expect(portSidesFor('horizontal')).toEqual({ input: 'left', output: 'right' });
    expect(portSidesFor('vertical')).toEqual({ input: 'top', output: 'bottom' });
  });

  it('lets explicit port sides decide the smart axis', () => {
    const request: FlowLayoutRequest = {
      nodes: [
        node('a', [{ id: 'o', direction: 'output', index: 0, side: 'bottom' }]),
        node('b', [
          { id: 'i', direction: 'input', index: 0, side: 'left' },
          { id: 'j', direction: 'input', index: 1, side: 'top' },
        ]),
      ],
      edges: [],
      direction: 'smart',
    };
    expect(smartDirection(request, undefined, 1.6)).toBe('vertical');
    const tie: FlowLayoutRequest = {
      ...request,
      nodes: [
        node('a', [{ id: 'o', direction: 'output', index: 0, side: 'right' }]),
        node('b', [{ id: 'i', direction: 'input', index: 0, side: 'top' }]),
      ],
    };
    expect(smartDirection(tie, undefined, 1.6)).toBe('horizontal');
  });

  it('picks the orientation closest to the viewport aspect otherwise', () => {
    const request: FlowLayoutRequest = {
      nodes: [node('a'), node('b')],
      edges: [],
      direction: 'smart',
    };
    const wide = {
      horizontal: { width: 1600, height: 1000 },
      vertical: { width: 1000, height: 1600 },
    };
    expect(smartDirection(request, wide, 1.6)).toBe('horizontal');
    expect(smartDirection(request, wide, 0.6)).toBe('vertical');
    expect(smartDirection(request, undefined, 1.6)).toBe('horizontal');
    expect(resolveDirection({ ...request, direction: 'vertical' }, wide, 1.6)).toBe('vertical');
    expect(resolveDirection(request, wide, 1.6)).toBe('horizontal');
  });
});
