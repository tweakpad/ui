import type {
  FlowDocument,
  FlowEdge,
  FlowNode,
  FlowSchema,
} from '../../../../../src/foundation/flow/types.js';
import { FlowModel } from '../../../../../src/foundation/flow/model/model.js';

/** A step type with typed ports; groups use the built-in `group` definition. */
export const schema: FlowSchema = {
  nodes: [
    {
      type: 'step',
      label: 'Step',
      size: { width: 100, height: 50 },
      ports: [
        { id: 'in', label: 'Input', direction: 'input', dataType: 'number' },
        { id: 'out', label: 'Output', direction: 'output', dataType: 'number' },
      ],
    },
  ],
};

export function step(id: string, x: number, y: number, extra: Partial<FlowNode> = {}): FlowNode {
  return { id, type: 'step', position: { x, y }, data: {}, ...extra };
}

export function group(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  extra: Partial<FlowNode> = {},
): FlowNode {
  return { id, type: 'group', position: { x, y }, size: { width, height }, data: {}, ...extra };
}

export function edge(
  id: string,
  source: string,
  sourcePort: string,
  target: string,
  targetPort: string,
  extra: Partial<FlowEdge> = {},
): FlowEdge {
  return { id, source, sourcePort, target, targetPort, ...extra };
}

/**
 * Two levels: `x → G → y` at the root; inside G, `a → H`; inside H, `b`. Group ports relay
 * `x → a`, `a → b` and `b → y`.
 */
export function nested(): FlowDocument {
  return {
    version: 1,
    nodes: [
      step('x', 0, 200),
      group('G', 200, 100, 700, 400, {
        ports: [
          { id: 'gin', direction: 'input' },
          { id: 'gout', direction: 'output' },
        ],
      }),
      step('a', 40, 150, { parentId: 'G' }),
      group('H', 300, 60, 300, 250, {
        parentId: 'G',
        ports: [
          { id: 'hin', direction: 'input' },
          { id: 'hout', direction: 'output' },
        ],
      }),
      step('b', 100, 100, { parentId: 'H' }),
      step('y', 1100, 200),
    ],
    edges: [
      edge('x-g', 'x', 'out', 'G', 'gin'),
      edge('g-a', 'G', 'gin', 'a', 'in'),
      edge('a-h', 'a', 'out', 'H', 'hin'),
      edge('h-b', 'H', 'hin', 'b', 'in'),
      edge('b-h', 'b', 'out', 'H', 'hout'),
      edge('h-g', 'H', 'hout', 'G', 'gout'),
      edge('g-y', 'G', 'gout', 'y', 'in'),
    ],
  };
}

export function model(
  document: FlowDocument = nested(),
  rules: FlowSchema['rules'] = {},
): FlowModel {
  return new FlowModel({ document, schema: { ...schema, rules } });
}

/** An id factory counting per kind: `node-1`, `edge-1`, … */
export function ids(): (kind: 'node' | 'edge') => string {
  const counters = { node: 0, edge: 0 };
  return (kind) => `${kind}-${(counters[kind] += 1)}`;
}
