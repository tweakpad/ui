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
      description: 'The map host.',
    },
    {
      name: 'map-viewport',
      description: 'The labelled region that holds the engine surface and the pins.',
    },
    {
      name: 'map-pin',
      description: "The focusable button placed at a pin's position.",
    },
    {
      name: 'map-pin-visual',
      description: 'The default marker graphic of a pin.',
    },
    {
      name: 'map-overlay',
      description: 'The panel of the selected pin.',
    },
    {
      name: 'map-control',
      description: 'A map control.',
    },
    {
      name: 'map-control-group',
      description: 'The Button group of the built-in controls.',
    },
    {
      name: 'map-status',
      description: 'The empty, loading or error status.',
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
