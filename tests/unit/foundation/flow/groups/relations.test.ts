import { describe, expect, it } from 'vitest';
import {
  FLOW_GROUP_DEFINITION,
  FLOW_GROUP_TYPE,
  FLOW_TERMINAL_TYPES,
  flowEdgeLevel,
  flowEdgeRelation,
  flowPortFacing,
  flowTerminalId,
  isFlowGroup,
  isFlowSegmentValid,
  parseFlowTerminalId,
} from '../../../../../src/foundation/flow/groups/relations.js';
import { edge, model, nested } from './fixture.js';

describe('group relations', () => {
  it('classifies every edge of the nested fixture', () => {
    const target = model();
    const relation = (id: string): string => flowEdgeRelation(target, target.getEdge(id)!);
    expect(relation('x-g')).toBe('sibling');
    expect(relation('g-a')).toBe('inner-input');
    expect(relation('a-h')).toBe('sibling');
    expect(relation('h-b')).toBe('inner-input');
    expect(relation('b-h')).toBe('inner-output');
    expect(relation('h-g')).toBe('inner-output');
    expect(relation('g-y')).toBe('sibling');
    expect(flowEdgeRelation(target, edge('c', 'x', 'out', 'a', 'in'))).toBe('crossing');
    expect(flowEdgeRelation(target, edge('c', 'x', 'out', 'b', 'in'))).toBe('crossing');
    // A group output used from inside or an input used toward a child in the wrong role crosses.
    expect(flowEdgeRelation(target, edge('c', 'G', 'gout', 'a', 'in'))).toBe('crossing');
    expect(flowEdgeRelation(target, edge('c', 'G', 'gin', 'G', 'gout'))).toBe('through');
    expect(flowEdgeRelation(target, edge('c', 'G', 'gout', 'G', 'gin'))).toBe('sibling');
    expect(flowEdgeRelation(target, edge('c', 'x', 'out', 'missing', 'in'))).toBe('crossing');
    expect(target.edgeRelation(edge('c', 'G', 'gin', 'G', 'gout'))).toBe('through');
  });

  it('names the level of an edge', () => {
    const target = model();
    expect(flowEdgeLevel(target, target.getEdge('x-g')!)).toBeUndefined();
    expect(flowEdgeLevel(target, target.getEdge('g-a')!)).toBe('G');
    expect(flowEdgeLevel(target, target.getEdge('a-h')!)).toBe('G');
    expect(flowEdgeLevel(target, target.getEdge('b-h')!)).toBe('H');
    expect(flowEdgeLevel(target, edge('c', 'G', 'gin', 'G', 'gout'))).toBe('G');
    expect(flowEdgeLevel(target, edge('c', 'x', 'out', 'a', 'in'))).toBeNull();
  });

  it('flips the direction at the group end of inner edges and both ends of a pass-through', () => {
    const target = model();
    expect(flowPortFacing(target, 'G', 'input', 'a')).toBe('output');
    expect(flowPortFacing(target, 'G', 'input', 'x')).toBe('input');
    expect(flowPortFacing(target, 'G', 'output', 'G')).toBe('input');
    expect(flowPortFacing(target, 'G', 'input')).toBe('input');
    expect(flowPortFacing(target, 'a', 'input', 'G')).toBe('input');
    // b is not a direct child of G.
    expect(flowPortFacing(target, 'G', 'input', 'b')).toBe('input');
  });

  it('tells legal segments from crossing or misused ones', () => {
    const target = model();
    for (const item of target.edges) expect(isFlowSegmentValid(target, item)).toBe(true);
    expect(isFlowSegmentValid(target, edge('c', 'x', 'out', 'G', 'gout'))).toBe(false);
    expect(isFlowSegmentValid(target, edge('c', 'G', 'gin', 'y', 'in'))).toBe(false);
    expect(isFlowSegmentValid(target, edge('c', 'x', 'out', 'a', 'in'))).toBe(false);
  });

  it('recognizes groups by shape, with the built-in definition for an undeclared group type', () => {
    const target = model();
    expect(isFlowGroup(target, 'G')).toBe(true);
    expect(isFlowGroup(target, 'a')).toBe(false);
    expect(isFlowGroup(target, 'missing')).toBe(false);
    expect(target.definitionOf('G')).toBe(FLOW_GROUP_DEFINITION);
    expect(FLOW_GROUP_DEFINITION).toMatchObject({
      type: FLOW_GROUP_TYPE,
      shape: 'group',
      ports: [],
    });
    const reader = {
      getNode: (id: string) => nested().nodes.find((node) => node.id === id),
      definitionOf: () => undefined,
    };
    expect(isFlowGroup(reader, 'G')).toBe(true);
  });

  it('builds and parses terminal ids', () => {
    expect(FLOW_TERMINAL_TYPES).toEqual({ inputs: '@inputs', outputs: '@outputs' });
    expect(flowTerminalId('G', 'inputs')).toBe('G#inputs');
    expect(parseFlowTerminalId('G#outputs')).toEqual({ groupId: 'G', kind: 'outputs' });
    expect(parseFlowTerminalId('a#b#inputs')).toEqual({ groupId: 'a#b', kind: 'inputs' });
    expect(parseFlowTerminalId('G#other')).toBeUndefined();
    expect(parseFlowTerminalId('#inputs')).toBeUndefined();
    expect(parseFlowTerminalId('G')).toBeUndefined();
  });
});
