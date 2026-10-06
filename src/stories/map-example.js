import * as maplibregl from 'maplibre-gl';
import maplibreCss from 'maplibre-gl/dist/maplibre-gl.css?raw';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { createGoogleMapsEngine, createMapLibreEngine } from '../foundation/map/index.js';

maplibregl.setWorkerUrl(maplibreWorkerUrl);

/** Lisbon sights used by the map examples. */
export const lisbonPlaces = [
  {
    value: 'belem-tower',
    name: 'Belém Tower',
    address: 'Av. Brasília, 1400-038 Lisboa',
    latitude: 38.6916,
    longitude: -9.216,
    color: 'var(--tp-chart-1)',
  },
  {
    value: 'jeronimos',
    name: 'Jerónimos Monastery',
    address: 'Praça do Império, 1400-206 Lisboa',
    latitude: 38.6979,
    longitude: -9.2068,
    color: 'var(--tp-chart-2)',
  },
  {
    value: 'lx-factory',
    name: 'LX Factory',
    address: 'R. Rodrigues de Faria 103, 1300-501 Lisboa',
    latitude: 38.7032,
    longitude: -9.1784,
    color: 'var(--tp-chart-3)',
  },
  {
    value: 'comercio',
    name: 'Praça do Comércio',
    address: 'Praça do Comércio, 1100-148 Lisboa',
    latitude: 38.7075,
    longitude: -9.1364,
    color: 'var(--tp-chart-4)',
  },
  {
    value: 'castle',
    name: 'São Jorge Castle',
    address: 'R. de Santa Cruz do Castelo, 1100-129 Lisboa',
    latitude: 38.7139,
    longitude: -9.1335,
    color: 'var(--tp-chart-5)',
  },
  {
    value: 'oceanarium',
    name: 'Oceanário de Lisboa',
    address: 'Esplanada Dom Carlos I, 1990-005 Lisboa',
    latitude: 38.7635,
    longitude: -9.0937,
    color: 'var(--tp-chart-2)',
  },
];

/** The Lisbon region as south,west,north,east. */
export const lisbonBounds = '38.685,-9.235,38.77,-9.085';

/** A MapLibre engine on OpenFreeMap with the full MapLibre stylesheet. */
export function openFreeMapEngine(options = {}) {
  return createMapLibreEngine(maplibregl, { css: maplibreCss, ...options });
}

let googleKey;
/** A Google Maps engine; `key` is the Maps JavaScript API key. */
export function googleMapsEngine(key, options = {}) {
  if (googleKey !== key) {
    setOptions({ key, v: 'weekly' });
    googleKey = key;
  }
  return createGoogleMapsEngine((name) => importLibrary(name), options);
}

/**
 * Wires one map example: assigns the engine, keeps the location list's current row in sync with
 * the map selection, and lets each row's button select (and so reveal) its pin. Returns cleanup.
 */
export function setupMapExample(root, engine = openFreeMapEngine()) {
  const map = root.querySelector('tp-map');
  const list = root.querySelector('[data-map-list]');
  if (!map) return () => undefined;
  map.engine = engine;
  const sync = () => {
    for (const item of list?.querySelectorAll('tp-list-item') ?? [])
      item.selected = item.value === map.state.selectedPin;
  };
  const unsubscribe = map.subscribe((state) => state.selectedPin, sync);
  const show = (event) => {
    const button = event.target.closest?.('[data-show]');
    if (!button) return;
    const value = button.dataset.show;
    // Selecting reveals the pin (reveal="always"); an already selected pin is revealed directly.
    const request = map.state.selectedPin === value ? map.revealPin(value) : map.selectPin(value);
    void request.catch(() => undefined);
  };
  list?.addEventListener('click', show);
  sync();
  return () => {
    unsubscribe();
    list?.removeEventListener('click', show);
    map.engine = null;
  };
}
