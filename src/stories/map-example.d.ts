import type { MapEngine } from '../foundation/map/engine.js';
import type { MapLibreEngineOptions } from '../foundation/map/adapters/maplibre.js';
import type { GoogleMapsEngineOptions } from '../foundation/map/adapters/google.js';

export interface LisbonPlace {
  value: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  color: string;
}
export const lisbonPlaces: readonly LisbonPlace[];
export const lisbonBounds: string;
export function openFreeMapEngine(options?: MapLibreEngineOptions): MapEngine;
export function googleMapsEngine(key: string, options?: GoogleMapsEngineOptions): MapEngine;
export function setupMapExample(root: HTMLElement, engine?: MapEngine): () => void;
