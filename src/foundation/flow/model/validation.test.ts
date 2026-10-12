import { describe, expect, it } from 'vitest';
import type { FlowDocument, FlowSchema } from '../types.js';
import { FlowModel } from './model.js';
import { validateConnection, validateDocument } from './validation.js';

const schema: FlowSchema = {
  nodes: [
    {
      type: 'proc',
      label: 'Process',
      ports: [
        { id: 'in', direction: 'input', dataType: 'number' },
        { id: 'in2', direction: 'input', dataType: 'any' },
        { id: 'hidden', direction: 'input', hidden: true },
        { id: 'out', direction: 'output', dataType: 'number' },
        { id: 'single', direction: 'output', multiple: false, dataType: 'text' },
        { id: 'text-in', direction: 'input', dataType: 'text', required: true },
      ],
    },
    { type: 'plain', label: 'Plain', ports: [] },
  ],
  dataTypes: [{ id: 'number' }, { id: 'text', accepts: ['number'] }],
};

function doc(): FlowDocument {
  return {
    version: 1,
    nodes: [
      { id: 'a', type: 'proc', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', type: 'proc', position: { x: 300, y: 0 }, data: {} },
      { id: 'c', type: 'proc', position: { x: 600, y: 0 }, data: {} },
      { id: 'locked', type: 'proc', position: { x: 0, y: 300 }, data: {}, connectable: false },
      { id: 'p', type: 'plain', position: { x: 0, y: 600 }, data: {} },
    ],
    edges: [
      { id: 'ab', source: 'a', sourcePort: 'out', target: 'b', targetPort: 'in' },
      { id: 'bc', source: 'b', sourcePort: 'single', target: 'c', targetPort: 'text-in' },
    ],
  };
}

function model(rules: FlowSchema['rules'] = {}, document = doc()): FlowModel {
  return new FlowModel({ document, schema: { ...schema, rules } });
}

describe('validateConnection', () => {
  it('rejects missing nodes', () => {
    const m = model();
    expect(validateConnection({ source: 'x', target: 'y' }, m).reasons).toEqual([
      'missing-source',
      'missing-target',
    ]);
    expect(validateConnection({ source: 'a', target: 'y' }, m).reasons).toEqual(['missing-target']);
  });

  it('rejects non-connectable nodes', () => {
    expect(
      validateConnection(
        { source: 'locked', sourcePort: 'out', target: 'c', targetPort: 'in' },
        model(),
      ).reasons,
    ).toContain('node-not-connectable');
  });

  it('rejects unknown and hidden ports', () => {
    const m = model();
    expect(
      validateConnection({ source: 'a', sourcePort: 'nope', target: 'c', targetPort: 'in' }, m)
        .reasons,
    ).toEqual(['port-not-found']);
    expect(
      validateConnection({ source: 'a', sourcePort: 'out', target: 'c', targetPort: 'hidden' }, m)
        .reasons,
    ).toEqual(['port-hidden']);
  });

  it('rejects same-direction pairs in strict mode and reorients input → output', () => {
    const m = model();
    expect(
      validateConnection({ source: 'a', sourcePort: 'out', target: 'c', targetPort: 'out' }, m)
        .reasons,
    ).toEqual(['same-direction']);
    const flipped = validateConnection(
      { source: 'c', sourcePort: 'in', target: 'a', targetPort: 'out' },
      m,
    );
    expect(flipped.valid).toBe(true);
    expect(flipped.reoriented).toBe(true);
    expect(flipped.connection).toEqual({
      source: 'a',
      sourcePort: 'out',
      target: 'c',
      targetPort: 'in',
    });
  });

  it('allows any pair but the same port in loose mode', () => {
    const m = model({ connectionMode: 'loose', selfLoops: true });
    expect(
      validateConnection({ source: 'a', sourcePort: 'out', target: 'c', targetPort: 'out' }, m)
        .valid,
    ).toBe(true);
    expect(
      validateConnection({ source: 'a', sourcePort: 'out', target: 'a', targetPort: 'out' }, m)
        .reasons,
    ).toEqual(['self-connection']);
    expect(
      validateConnection({ source: 'a', sourcePort: 'out', target: 'a', targetPort: 'in2' }, m)
        .valid,
    ).toBe(true);
  });

  it('rejects self loops unless allowed', () => {
    expect(
      validateConnection(
        { source: 'a', sourcePort: 'out', target: 'a', targetPort: 'in2' },
        model(),
      ).reasons,
    ).toEqual(['self-connection']);
    expect(
      validateConnection(
        { source: 'a', sourcePort: 'out', target: 'a', targetPort: 'in2' },
        model({ selfLoops: true }),
      ).valid,
    ).toBe(true);
  });

  it('rejects duplicates unless allowed, ignoring the reconnected edge', () => {
    const m = model();
    const result = validateConnection(
      { source: 'a', sourcePort: 'out', target: 'b', targetPort: 'in' },
      m,
    );
    expect(result.reasons).toEqual(['duplicate', 'input-occupied']);
    expect(
      validateConnection({ source: 'a', sourcePort: 'out', target: 'b', targetPort: 'in' }, m, {
        ignoreEdge: 'ab',
      }).valid,
    ).toBe(true);
    expect(
      validateConnection(
        { source: 'a', sourcePort: 'out', target: 'b', targetPort: 'in' },
        model({ duplicateEdges: true }),
      ).reasons,
    ).toEqual(['input-occupied']);
  });

  it('rejects occupied single-connection ports', () => {
    const m = model();
    expect(
      validateConnection({ source: 'c', sourcePort: 'out', target: 'b', targetPort: 'in' }, m)
        .reasons,
    ).toEqual(['input-occupied']);
    expect(
      validateConnection(
        { source: 'b', sourcePort: 'single', target: 'a', targetPort: 'text-in' },
        m,
      ).reasons,
    ).toEqual(['output-occupied']);
    expect(
      validateConnection({ source: 'b', sourcePort: 'out', target: 'c', targetPort: 'in' }, m)
        .valid,
    ).toBe(true);
  });

  it('checks data types through accepts, any, undefined and a compatibility override', () => {
    const m = model();
    expect(
      validateConnection({ source: 'a', sourcePort: 'single', target: 'c', targetPort: 'in' }, m)
        .reasons,
    ).toEqual(['type-mismatch']);
    expect(
      validateConnection({ source: 'a', sourcePort: 'out', target: 'b', targetPort: 'text-in' }, m)
        .valid,
    ).toBe(true);
    expect(
      validateConnection({ source: 'a', sourcePort: 'out', target: 'c', targetPort: 'in2' }, m)
        .valid,
    ).toBe(true);
    const custom = model({ typeCompatibility: (from, to) => from === 'text' && to === 'number' });
    expect(
      validateConnection(
        { source: 'a', sourcePort: 'single', target: 'c', targetPort: 'in' },
        custom,
      ).valid,
    ).toBe(true);
    expect(
      validateConnection({ source: 'a', sourcePort: 'out', target: 'c', targetPort: 'in' }, custom)
        .reasons,
    ).toEqual(['type-mismatch']);
  });

  it('rejects cycles when forbidden', () => {
    expect(
      validateConnection(
        { source: 'c', sourcePort: 'out', target: 'a', targetPort: 'in' },
        model({ cycles: 'forbid' }),
      ).reasons,
    ).toEqual(['cycle']);
    expect(
      validateConnection({ source: 'c', sourcePort: 'out', target: 'a', targetPort: 'in' }, model())
        .valid,
    ).toBe(true);
  });

  it('consults the predicate last with boolean, code or message verdicts', () => {
    const m = model();
    const connection = { source: 'a', sourcePort: 'out', target: 'c', targetPort: 'in' };
    expect(validateConnection(connection, m, { isValidConnection: () => false }).reasons).toEqual([
      'predicate',
    ]);
    expect(validateConnection(connection, m, { isValidConnection: () => 'cycle' }).reasons).toEqual(
      ['cycle'],
    );
    const withMessage = validateConnection(connection, m, { isValidConnection: () => 'Not today' });
    expect(withMessage.reasons).toEqual(['predicate']);
    expect(withMessage.message).toBe('Not today');
    expect(validateConnection(connection, m, { isValidConnection: () => true }).valid).toBe(true);
    const seen: unknown[] = [];
    validateConnection(connection, m, {
      ignoreEdge: 'ab',
      isValidConnection: (oriented, context) => {
        seen.push(oriented, context.edgeId);
      },
    });
    expect(seen).toEqual([connection, 'ab']);
  });

  it('stops at the first rejection with fast', () => {
    const m = model();
    expect(
      validateConnection({ source: 'a', sourcePort: 'out', target: 'b', targetPort: 'in' }, m, {
        fast: true,
      }).reasons,
    ).toEqual(['duplicate']);
  });

  it('uses default ports when none are given', () => {
    const m = model();
    const result = validateConnection({ source: 'c', target: 'a' }, m);
    expect(result.valid).toBe(true);
    expect(result.connection).toEqual({
      source: 'c',
      sourcePort: 'out',
      target: 'a',
      targetPort: 'in',
    });
    expect(validateConnection({ source: 'p', target: 'c' }, m).valid).toBe(true);
  });
});

describe('validateDocument', () => {
  it('reports structural and schema issues', () => {
    const broken: FlowDocument = {
      version: 1,
      nodes: [
        { id: 'a', type: 'proc', position: { x: 0, y: 0 }, data: {} },
        { id: 'a', type: 'proc', position: { x: 0, y: 0 }, data: {} },
        { id: 'u', type: 'unknown', position: { x: 0, y: 0 }, data: {}, parentId: 'ghost' },
        { id: 'x', type: 'plain', position: { x: 0, y: 0 }, data: {}, parentId: 'y' },
        { id: 'y', type: 'plain', position: { x: 0, y: 0 }, data: {}, parentId: 'x' },
      ],
      edges: [
        { id: 'e', source: 'a', target: 'missing' },
        { id: 'e', source: 'a', target: 'a' },
        { id: 'f', source: 'a', sourcePort: 'nope', target: 'u' },
        { id: 'g', source: 'u', target: 'a' },
        { id: 'h', source: 'a', target: 'u' },
      ],
    };
    const m = new FlowModel({
      document: broken,
      schema: { ...schema, rules: { cycles: 'forbid' } },
    });
    const issues = validateDocument(broken, m.schema, m);
    const codes = issues.map((issue) => issue.code);
    expect(codes).toContain('duplicate-node-id');
    expect(codes).toContain('unknown-node-type');
    expect(codes).toContain('missing-parent');
    expect(codes).toContain('parent-cycle');
    expect(codes).toContain('missing-endpoint');
    expect(codes).toContain('duplicate-edge-id');
    expect(codes).toContain('unknown-port');
    expect(codes).toContain('required-port');
    expect(codes).toContain('cycle');
    expect(issues.find((issue) => issue.code === 'unknown-port')).toMatchObject({
      edgeId: 'f',
      nodeId: 'a',
      portId: 'nope',
    });
  });

  it('runs definition validators and passes clean documents', () => {
    const withValidator: FlowSchema = {
      nodes: [
        {
          type: 'plain',
          label: 'Plain',
          ports: [],
          validate: (node) =>
            node.data.bad ? [{ code: 'bad', severity: 'warning', message: 'bad' }] : undefined,
        },
      ],
    };
    const document: FlowDocument = {
      version: 1,
      nodes: [
        { id: 'ok', type: 'plain', position: { x: 0, y: 0 }, data: {} },
        { id: 'bad', type: 'plain', position: { x: 0, y: 0 }, data: { bad: true } },
      ],
      edges: [{ id: 'e', source: 'ok', target: 'bad' }],
    };
    const m = new FlowModel({ document, schema: withValidator });
    expect(m.validate()).toEqual([
      { nodeId: 'bad', code: 'bad', severity: 'warning', message: 'bad' },
    ]);
    expect(
      validateDocument({ ...document, nodes: [document.nodes[0]!], edges: [] }, withValidator, m),
    ).toEqual([]);
  });
});
