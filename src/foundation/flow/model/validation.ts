import type {
  FlowConnection,
  FlowDocument,
  FlowIssue,
  FlowModelLike,
  FlowResolvedPort,
  FlowSchema,
  FlowValidationContext,
} from '../types.js';
import { buildIndices, type FlowIndices } from './indices.js';
import { hasCycle } from './queries.js';

/**
 * Connection and document validation. Connection checks run in a fixed order and collect every
 * rejection (or stop at the first with `fast`); strict mode reorients an input → output drag.
 */
export type FlowConnectionRejection =
  | 'missing-source'
  | 'missing-target'
  | 'self-connection'
  | 'same-direction'
  | 'port-not-found'
  | 'port-hidden'
  | 'node-not-connectable'
  | 'input-occupied'
  | 'output-occupied'
  | 'duplicate'
  | 'type-mismatch'
  | 'cycle'
  | 'predicate';

const REJECTIONS: ReadonlySet<string> = new Set<FlowConnectionRejection>([
  'missing-source',
  'missing-target',
  'self-connection',
  'same-direction',
  'port-not-found',
  'port-hidden',
  'node-not-connectable',
  'input-occupied',
  'output-occupied',
  'duplicate',
  'type-mismatch',
  'cycle',
  'predicate',
]);

export interface FlowConnectionResult {
  valid: boolean;
  reasons: FlowConnectionRejection[];
  message?: string;
  /** Oriented output → input with resolved port ids (as the created edge would carry). */
  connection: FlowConnection;
  /** `true` when strict mode swapped the ends. */
  reoriented: boolean;
}

/** `true`/`undefined` accepts; `false` rejects with `predicate`; a string is a rejection code or a message. */
export type FlowConnectionPredicate = (
  connection: FlowConnection,
  context: FlowValidationContext,
) => boolean | string | void;

export interface FlowConnectionValidationOptions {
  /** Stop at the first rejection. */
  fast?: boolean;
  /** Edge being reconnected; its own occupancy and duplicate are ignored. */
  ignoreEdge?: string;
  isValidConnection?: FlowConnectionPredicate;
}

function portOf(
  ports: readonly FlowResolvedPort[],
  portId: string | undefined,
  direction: 'input' | 'output',
  loose: boolean,
): FlowResolvedPort | undefined {
  if (portId !== undefined) return ports.find((port) => port.id === portId);
  return (
    ports.find((port) => port.direction === direction && !port.hidden) ??
    ports.find((port) => port.direction === direction) ??
    (loose ? ports[0] : undefined)
  );
}

function typesCompatible(
  from: string | undefined,
  to: string | undefined,
  schema: FlowSchema | undefined,
): boolean {
  if (schema?.rules?.typeCompatibility) return schema.rules.typeCompatibility(from, to, schema);
  if (from === undefined || to === undefined || from === 'any' || to === 'any' || from === to)
    return true;
  const target = schema?.dataTypes?.find((type) => type.id === to);
  return target?.accepts?.includes(from) ?? false;
}

function allowsMultiple(port: FlowResolvedPort): boolean {
  return port.multiple ?? port.direction === 'output';
}

function conn(
  source: string,
  sourcePort: string | undefined,
  target: string,
  targetPort: string | undefined,
): FlowConnection {
  const connection: FlowConnection = { source, target };
  if (sourcePort !== undefined) connection.sourcePort = sourcePort;
  if (targetPort !== undefined) connection.targetPort = targetPort;
  return connection;
}

export function validateConnection(
  connection: FlowConnection,
  model: FlowModelLike,
  options: FlowConnectionValidationOptions = {},
): FlowConnectionResult {
  const schema = model.schema;
  const rules = schema?.rules;
  const strict = (rules?.connectionMode ?? 'strict') === 'strict';
  const reasons: FlowConnectionRejection[] = [];
  let message: string | undefined;
  let oriented = conn(
    connection.source,
    connection.sourcePort,
    connection.target,
    connection.targetPort,
  );
  let reoriented = false;
  const done = (): FlowConnectionResult => {
    const result: FlowConnectionResult = {
      valid: reasons.length === 0,
      reasons,
      connection: oriented,
      reoriented,
    };
    if (message !== undefined) result.message = message;
    return result;
  };
  const reject = (reason: FlowConnectionRejection): boolean => {
    reasons.push(reason);
    return Boolean(options.fast);
  };

  // 1. Existence.
  const sourceNode = model.getNode(connection.source);
  const targetNode = model.getNode(connection.target);
  if (!sourceNode) reasons.push('missing-source');
  if (!targetNode) reasons.push('missing-target');
  if (!sourceNode || !targetNode) return done();

  // 2. Connectable.
  if (sourceNode.connectable === false || targetNode.connectable === false) {
    if (reject('node-not-connectable')) return done();
  }

  // 3. Port lookup and orientation.
  const sourcePorts = model.ports(sourceNode.id);
  const targetPorts = model.ports(targetNode.id);
  let sourcePort = portOf(sourcePorts, connection.sourcePort, 'output', !strict);
  let targetPort = portOf(targetPorts, connection.targetPort, 'input', !strict);
  if (
    strict &&
    sourcePort &&
    targetPort &&
    sourcePort.direction === 'input' &&
    targetPort.direction === 'output'
  ) {
    // A drag started on an input: swap so the edge always runs output → input.
    oriented = conn(targetNode.id, targetPort.id, sourceNode.id, sourcePort.id);
    reoriented = true;
    [sourcePort, targetPort] = [targetPort, sourcePort];
  }
  const sourceId = oriented.source;
  const targetId = oriented.target;
  if (sourcePorts.length > 0 && !sourcePort) {
    if (reject('port-not-found')) return done();
  }
  if (targetPorts.length > 0 && !targetPort) {
    if (reject('port-not-found')) return done();
  }
  if (sourcePort && targetPort) {
    oriented = conn(sourceId, sourcePort.id, targetId, targetPort.id);
    if (strict && sourcePort.direction === targetPort.direction) {
      if (reject('same-direction')) return done();
    }
    if (!strict && sourceId === targetId && sourcePort.id === targetPort.id) {
      if (reject('self-connection')) return done();
    }
    if (sourcePort.hidden || targetPort.hidden) {
      if (reject('port-hidden')) return done();
    }
  }

  // 4. Self loops.
  if (sourceId === targetId && !rules?.selfLoops && !reasons.includes('self-connection')) {
    if (reject('self-connection')) return done();
  }

  // 5. Duplicates.
  if (!rules?.duplicateEdges) {
    const existing = model.portConnections(sourceId, 'output', oriented.sourcePort);
    const duplicate = existing.some((edgeId) => {
      if (edgeId === options.ignoreEdge) return false;
      const edge = model.getEdge(edgeId);
      if (!edge) return false;
      const edgeTargetPort =
        edge.targetPort ?? portOf(targetPorts, undefined, 'input', !strict)?.id;
      return edge.target === targetId && edgeTargetPort === oriented.targetPort;
    });
    if (duplicate && reject('duplicate')) return done();
  }

  // 6. Occupancy.
  if (targetPort && !allowsMultiple(targetPort)) {
    const occupied = model
      .portConnections(targetId, targetPort.direction, targetPort.id)
      .some((edgeId) => edgeId !== options.ignoreEdge);
    if (occupied && reject(targetPort.direction === 'input' ? 'input-occupied' : 'output-occupied'))
      return done();
  }
  if (sourcePort && !allowsMultiple(sourcePort)) {
    const occupied = model
      .portConnections(sourceId, sourcePort.direction, sourcePort.id)
      .some((edgeId) => edgeId !== options.ignoreEdge);
    if (
      occupied &&
      reject(sourcePort.direction === 'output' ? 'output-occupied' : 'input-occupied')
    )
      return done();
  }

  // 7. Data types.
  if (
    sourcePort &&
    targetPort &&
    !typesCompatible(sourcePort.dataType, targetPort.dataType, schema)
  ) {
    if (reject('type-mismatch')) return done();
  }

  // 8. Cycles.
  if (
    rules?.cycles === 'forbid' &&
    sourceId !== targetId &&
    model.wouldCreateCycle(sourceId, targetId)
  ) {
    if (reject('cycle')) return done();
  }

  // 9. Predicate.
  if (options.isValidConnection) {
    const context: FlowValidationContext = { model, schema };
    if (options.ignoreEdge !== undefined) context.edgeId = options.ignoreEdge;
    const verdict = options.isValidConnection(oriented, context);
    if (verdict === false) reasons.push('predicate');
    else if (typeof verdict === 'string') {
      if (REJECTIONS.has(verdict)) reasons.push(verdict as FlowConnectionRejection);
      else {
        reasons.push('predicate');
        message = verdict;
      }
    }
  }
  return done();
}

function inParentCycle(indices: FlowIndices, id: string): boolean {
  const seen = new Set<string>([id]);
  let current = indices.nodes.get(id);
  while (current?.parentId !== undefined) {
    if (seen.has(current.parentId)) return true;
    seen.add(current.parentId);
    current = indices.nodes.get(current.parentId);
  }
  return false;
}

function issue(
  code: string,
  severity: FlowIssue['severity'],
  message: string,
  extra: Partial<FlowIssue> = {},
): FlowIssue {
  return { code, severity, message, ...extra };
}

/** Structural and schema checks over a whole document. */
export function validateDocument(
  doc: FlowDocument,
  schema: FlowSchema | undefined,
  model?: FlowModelLike,
): FlowIssue[] {
  const issues: FlowIssue[] = [];
  const indices = buildIndices(doc);
  const seenNodes = new Set<string>();
  const seenEdges = new Set<string>();
  const definitions = new Map(
    schema?.nodes.map((definition) => [definition.type, definition]) ?? [],
  );

  for (const node of doc.nodes) {
    if (seenNodes.has(node.id)) {
      issues.push(
        issue('duplicate-node-id', 'error', `Duplicate node id "${node.id}".`, { nodeId: node.id }),
      );
      continue;
    }
    seenNodes.add(node.id);
    if (schema && !definitions.has(node.type))
      issues.push(
        issue('unknown-node-type', 'error', `Node "${node.id}" has unknown type "${node.type}".`, {
          nodeId: node.id,
        }),
      );
    if (node.parentId !== undefined) {
      if (!indices.nodes.has(node.parentId))
        issues.push(
          issue(
            'missing-parent',
            'error',
            `Node "${node.id}" references missing parent "${node.parentId}".`,
            { nodeId: node.id },
          ),
        );
      else if (inParentCycle(indices, node.id))
        issues.push(
          issue('parent-cycle', 'error', `Node "${node.id}" sits in a parent cycle.`, {
            nodeId: node.id,
          }),
        );
    }
    const definition = definitions.get(node.type);
    if (definition?.validate && model) {
      const result = definition.validate(node, { model, schema });
      if (result) for (const item of result) issues.push({ nodeId: node.id, ...item });
    }
  }

  for (const edge of doc.edges) {
    if (seenEdges.has(edge.id)) {
      issues.push(
        issue('duplicate-edge-id', 'error', `Duplicate edge id "${edge.id}".`, { edgeId: edge.id }),
      );
      continue;
    }
    seenEdges.add(edge.id);
    for (const [end, nodeId, portId] of [
      ['source', edge.source, edge.sourcePort],
      ['target', edge.target, edge.targetPort],
    ] as const) {
      const node = indices.nodes.get(nodeId);
      if (!node) {
        issues.push(
          issue(
            'missing-endpoint',
            'error',
            `Edge "${edge.id}" ${end} "${nodeId}" does not exist.`,
            { edgeId: edge.id },
          ),
        );
        continue;
      }
      if (portId !== undefined && model) {
        const ports = model.ports(nodeId);
        if (ports.length && !ports.some((port) => port.id === portId))
          issues.push(
            issue(
              'unknown-port',
              'error',
              `Edge "${edge.id}" ${end} port "${portId}" is not a port of "${nodeId}".`,
              { edgeId: edge.id, nodeId, portId },
            ),
          );
      }
    }
  }

  if (model) {
    for (const node of doc.nodes) {
      for (const port of model.ports(node.id)) {
        if (!port.required || port.hidden) continue;
        if (model.portConnections(node.id, port.direction, port.id).length === 0)
          issues.push(
            issue(
              'required-port',
              'warning',
              // Named as people see it: the port and node labels, the ids as fallbacks.
              `"${port.label ?? port.id}" of "${node.label ?? model.definitionOf(node)?.label ?? node.id}" requires a connection.`,
              { nodeId: node.id, portId: port.id },
            ),
          );
      }
    }
  }

  if (schema?.rules?.cycles === 'forbid' && hasCycle(doc))
    issues.push(issue('cycle', 'error', 'The graph contains a cycle.'));

  return issues;
}
