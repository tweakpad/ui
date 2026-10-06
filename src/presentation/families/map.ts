import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { mapAppearance } from '../recipes/map.js';

const definition: ComponentDefinition = {
  name: 'Map',
  tagName: 'tp-map',
  kind: 'compound-reexport',
  sourceNode: 'ucl21-map',
  states: ['status', 'moving', 'scheme', 'selected', 'disabled', 'focus-visible', 'anchor'],
  parts: [
    {
      name: 'map',
      publicName: 'Root',
      presentationKeys: ['map'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'map-viewport',
      publicName: 'Viewport',
      presentationKeys: ['map-viewport'],
      cardinality: 'exactly one descendant of Root',
    },
    {
      name: 'map-pin',
      publicName: 'Pin',
      presentationKeys: ['map-pin'],
      cardinality: 'zero or more children of Root',
    },
    {
      name: 'map-pin-visual',
      publicName: 'Pin visual',
      presentationKeys: ['map-pin-visual'],
      cardinality: 'exactly one per Pin; replaced by authored content',
    },
    {
      name: 'map-overlay',
      publicName: 'Overlay',
      presentationKeys: ['map-overlay'],
      cardinality: 'zero or one child of each Pin',
    },
    {
      name: 'map-control',
      publicName: 'Control',
      presentationKeys: ['map-control'],
      cardinality: 'zero or more, inside Root or bound by map identifier',
    },
    {
      name: 'map-status',
      publicName: 'Status',
      presentationKeys: ['map-status'],
      cardinality: 'zero or one descendant of Viewport, present unless ready',
    },
  ],
  motionRoles: [
    {
      name: 'pin-select',
      target: 'map-pin',
      kind: 'state',
      phases: ['change'],
      completion: 'non-blocking',
    },
  ],
};

export const mapPresentation = definePresentation({
  definition,
  bindings: {
    'tp-map': {
      ':host': 'map',
      "[part~='viewport']": 'map-viewport',
      "[part~='status']": 'map-status',
    },
    'tp-map-pin': {
      "[part~='pin']": 'map-pin',
      "[part~='pin-visual']": 'map-pin-visual',
    },
    'tp-map-overlay': {
      ':host': 'map-overlay',
    },
    'tp-map-control': {
      ':host': 'map-control',
    },
  },
  sources: [mapAppearance],
});
