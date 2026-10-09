import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { mapAppearance } from '../recipes/map.js';

const definition: ComponentDefinition = {
  name: 'Map',
  tagName: 'tp-map',
  kind: 'compound-reexport',
  parts: [
    {
      name: 'map',
    },
    {
      name: 'map-viewport',
    },
    {
      name: 'map-pin',
    },
    {
      name: 'map-pin-visual',
    },
    {
      name: 'map-overlay',
    },
    {
      name: 'map-control',
    },
    {
      name: 'map-control-group',
    },
    {
      name: 'map-status',
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
      "[part~='control-group']": 'map-control-group',
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
