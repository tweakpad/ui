import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROPERTY_PLACEMENT_BY_SHAPE,
  inspectorProperties,
  propertyPlacement,
} from './defaults.js';
import type { FlowNodeDefinition } from './types.js';

const definition = (shape?: FlowNodeDefinition['shape']): FlowNodeDefinition => ({
  type: 'step',
  label: 'Step',
  ...(shape ? { shape } : {}),
  ports: [],
  properties: [
    { key: 'name', label: 'Name', control: 'text' },
    { key: 'retries', label: 'Retries', control: 'number', placement: 'inspector' },
    { key: 'note', label: 'Note', control: 'textarea', placement: 'node' },
  ],
});

describe('property placement', () => {
  it('defaults per shape: bodies with rows hold their properties, the others use the inspector', () => {
    expect(DEFAULT_PROPERTY_PLACEMENT_BY_SHAPE).toEqual({
      card: 'node',
      panel: 'node',
      compact: 'inspector',
      group: 'inspector',
    });
    const [name] = definition().properties!;
    expect(propertyPlacement(definition(), name!)).toBe('node');
    expect(propertyPlacement(definition('panel'), name!)).toBe('node');
    expect(propertyPlacement(definition('compact'), name!)).toBe('inspector');
    expect(propertyPlacement(undefined, name!)).toBe('node');
  });

  it('lets each property name its surface and lists the inspector ones in schema order', () => {
    expect(inspectorProperties(definition()).map((property) => property.key)).toEqual(['retries']);
    expect(inspectorProperties(definition('compact')).map((property) => property.key)).toEqual([
      'name',
      'retries',
    ]);
    expect(inspectorProperties({ ...definition(), properties: [] })).toEqual([]);
    expect(inspectorProperties(undefined)).toEqual([]);
  });
});
