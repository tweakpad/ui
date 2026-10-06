import { describe, expect, it, vi } from 'vitest';
import type { MapEngineContext } from '../engine.js';
import { DEFAULT_CAMERA, mergeCamera } from '../geo.js';
import {
  OPENFREEMAP_STYLES,
  applyMapLibreTheme,
  createMapLibreEngine,
  maplibreLayerRole,
  type MapLibreMap,
  type MapLibreNamespace,
} from './maplibre.js';
import { googleStylesFromTheme } from './google.js';

class FakeElement {
  children: FakeElement[] = [];
  style = { cssText: '' };
  removed = false;
  append(child: FakeElement) {
    this.children.push(child);
  }
  remove() {
    this.removed = true;
  }
  querySelector() {
    return null;
  }
}

function stubMapLibre() {
  const listeners = new Map<string, Array<(event: Record<string, unknown>) => void>>();
  const calls: Array<[string, unknown]> = [];
  let options: Record<string, unknown> = {};
  const markers: Array<{ options: Record<string, unknown>; lngLat: unknown; removed: boolean }> =
    [];
  const state = { lng: 0, lat: 0, zoom: 0 };
  const map = {
    on: (type: string, listener: (event: Record<string, unknown>) => void) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    off: () => undefined,
    once: () => undefined,
    remove: () => calls.push(['remove', null]),
    resize: () => undefined,
    stop: () => calls.push(['stop', null]),
    getCenter: () => ({ lng: state.lng, lat: state.lat }),
    getZoom: () => state.zoom,
    getBearing: () => -10,
    getPitch: () => 0,
    getBounds: () => ({
      getSouth: () => -1,
      getWest: () => -190,
      getNorth: () => 1,
      getEast: () => 10,
    }),
    jumpTo: (value: Record<string, unknown>) => {
      calls.push(['jumpTo', value]);
      state.zoom = value['zoom'] as number;
    },
    easeTo: (value: unknown) => calls.push(['easeTo', value]),
    flyTo: (value: unknown) => calls.push(['flyTo', value]),
    cameraForBounds: () => ({ center: { lng: 1, lat: 2 }, zoom: 9, bearing: 0 }),
    project: () => ({ x: 5, y: 6 }),
    unproject: () => ({ lng: 1, lat: 2 }),
    setMinZoom: (zoom: number) => calls.push(['setMinZoom', zoom]),
    setMaxZoom: (zoom: number) => calls.push(['setMaxZoom', zoom]),
    setStyle: (style: unknown) => calls.push(['setStyle', style]),
    getStyle: () => ({
      layers: [
        { id: 'background', type: 'background' },
        { id: 'water', type: 'fill', 'source-layer': 'water' },
        { id: 'highway-motorway', type: 'line', 'source-layer': 'transportation' },
        { id: 'place-label', type: 'symbol' },
      ],
    }),
    setPaintProperty: (layer: string, property: string, value: unknown) =>
      calls.push(['paint', [layer, property, value]]),
    isStyleLoaded: () => true,
    getCanvasContainer: () => ({}) as HTMLElement,
    keyboard: { enable: vi.fn(), disable: vi.fn() },
  };
  const namespace = {
    Map: function (value: Record<string, unknown>) {
      options = value;
      return map;
    },
    Marker: function (markerOptions: Record<string, unknown>) {
      const record = { options: markerOptions, lngLat: null as unknown, removed: false };
      markers.push(record);
      const marker = {
        setLngLat(lngLat: unknown) {
          record.lngLat = lngLat;
          return marker;
        },
        addTo() {
          return marker;
        },
        remove() {
          record.removed = true;
          return marker;
        },
      };
      return marker;
    },
  } as unknown as MapLibreNamespace;
  const emit = (type: string, event: Record<string, unknown> = {}) =>
    listeners.get(type)?.forEach((listener) => listener(event));
  return {
    namespace,
    map: map as unknown as MapLibreMap,
    calls,
    markers,
    emit,
    options: () => options,
  };
}

function context(overrides: Partial<MapEngineContext> = {}) {
  const notifications = {
    ready: vi.fn(),
    camera: vi.fn(),
    cameraEnd: vi.fn(),
    press: vi.fn(),
    error: vi.fn(),
  };
  const value: MapEngineContext = {
    initialCamera: mergeCamera(DEFAULT_CAMERA, {
      center: { latitude: 38.7, longitude: -9.1 },
      zoom: 12,
    }),
    minZoom: 2,
    maxZoom: 18,
    interactive: false,
    cooperativeGestures: true,
    scheme: 'dark',
    theme: { water: '#0000ff', label: '#ffffff' },
    reducedMotion: () => false,
    adoptStyles: vi.fn(() => () => undefined),
    signal: new AbortController().signal,
    ...notifications,
    ...overrides,
  };
  return value;
}

const viewport = () => {
  const element = new FakeElement();
  return Object.assign(element, {
    ownerDocument: { createElement: () => new FakeElement() },
  }) as unknown as HTMLElement & FakeElement;
};

describe('MapLibre adapter', () => {
  it('converts to the 512-pixel zoom scale and applies mount options', () => {
    const stub = stubMapLibre();
    const ctx = context();
    createMapLibreEngine(stub.namespace).mount(viewport(), ctx);
    const options = stub.options();
    expect(options).toMatchObject({
      zoom: 11,
      minZoom: 1,
      maxZoom: 17,
      center: [-9.1, 38.7],
      style: OPENFREEMAP_STYLES.dark,
      cooperativeGestures: true,
    });
    expect(ctx.adoptStyles).toHaveBeenCalled();
    expect(
      (stub.map as unknown as { keyboard: { disable: ReturnType<typeof vi.fn> } }).keyboard.disable,
    ).toHaveBeenCalled();
  });

  it('reports ready, themes layers, and maps the camera and bounds back', () => {
    const stub = stubMapLibre();
    const ctx = context();
    const instance = createMapLibreEngine(stub.namespace).mount(viewport(), ctx);
    if (instance instanceof Promise) throw new Error('sync');
    stub.emit('load');
    expect(ctx.ready).toHaveBeenCalled();
    expect(stub.calls).toContainEqual(['paint', ['water', 'fill-color', '#0000ff']]);
    expect(stub.calls).toContainEqual(['paint', ['place-label', 'text-color', '#ffffff']]);
    instance.jumpTo(mergeCamera(DEFAULT_CAMERA, { zoom: 5 }));
    expect(instance.getCamera()).toMatchObject({ zoom: 5, bearing: 350 });
    expect(instance.getBounds()).toMatchObject({ west: 170, east: 10 });
    expect(instance.cameraForBounds!({ south: 0, west: 0, north: 1, east: 1 }, {})).toMatchObject({
      zoom: 10,
      center: { latitude: 2, longitude: 1 },
    });
  });

  it('places overlays as top-left markers and filters their clicks', () => {
    const stub = stubMapLibre();
    const ctx = context();
    const instance = createMapLibreEngine(stub.namespace).mount(viewport(), ctx);
    if (instance instanceof Promise) throw new Error('sync');
    const element = {} as HTMLElement;
    const handle = instance.attachOverlay(element, { latitude: 1, longitude: 2 });
    expect(stub.markers[0]).toMatchObject({
      options: { element, anchor: 'top-left' },
      lngLat: [2, 1],
    });
    stub.emit('click', {
      lngLat: { lng: 2, lat: 1 },
      point: { x: 1, y: 1 },
      originalEvent: { composedPath: () => [element] },
    });
    expect(ctx.press).not.toHaveBeenCalled();
    stub.emit('click', {
      lngLat: { lng: 3, lat: 4 },
      point: { x: 1, y: 1 },
      originalEvent: { composedPath: () => [] },
    });
    expect(ctx.press).toHaveBeenCalledWith(
      { latitude: 4, longitude: 3 },
      { x: 1, y: 1 },
      expect.anything(),
    );
    handle.remove();
    handle.remove();
    expect(stub.markers[0]!.removed).toBe(true);
  });

  it('distinguishes gestures from request animations and fails before load only', () => {
    const stub = stubMapLibre();
    const ctx = context();
    const instance = createMapLibreEngine(stub.namespace).mount(viewport(), ctx);
    if (instance instanceof Promise) throw new Error('sync');
    const original = new Event('mousemove');
    stub.emit('move', { originalEvent: original });
    stub.emit('move', {});
    expect(ctx.camera).toHaveBeenNthCalledWith(1, 'engine', original);
    expect(ctx.camera).toHaveBeenNthCalledWith(2, undefined, undefined);
    stub.emit('error', { error: new Error('style') });
    stub.emit('load');
    stub.emit('error', { error: new Error('tile') });
    expect(ctx.error).toHaveBeenCalledTimes(1);
  });

  it('switches styles on scheme changes and destroys cleanly', () => {
    const stub = stubMapLibre();
    const instance = createMapLibreEngine(stub.namespace, {
      styles: { light: 'light.json', dark: 'dark.json' },
    }).mount(viewport(), context());
    if (instance instanceof Promise) throw new Error('sync');
    instance.setAppearance!('light', null);
    expect(stub.calls).toContainEqual(['setStyle', 'light.json']);
    instance.destroy();
    expect(stub.calls).toContainEqual(['remove', null]);
  });

  it('assigns theme roles by layer type and source layer', () => {
    expect(maplibreLayerRole({ id: 'park', type: 'fill', 'source-layer': 'park' })).toEqual([
      { role: 'park', property: 'fill-color' },
    ]);
    expect(
      maplibreLayerRole({ id: 'road_minor', type: 'line', 'source-layer': 'transportation' }),
    ).toEqual([{ role: 'road', property: 'line-color' }]);
    expect(maplibreLayerRole({ id: 'hillshade', type: 'hillshade' })).toBeNull();
    const stub = stubMapLibre();
    applyMapLibreTheme(stub.map, null);
    expect(stub.calls).toEqual([]);
  });
});

describe('Google Maps adapter', () => {
  it('converts theme roles to JSON styles', () => {
    expect(googleStylesFromTheme(null)).toEqual([]);
    const styles = googleStylesFromTheme({ water: '#001122', label: '#ffffff' });
    expect(styles).toContainEqual({
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#001122' }],
    });
    expect(styles).toContainEqual({
      elementType: 'labels.text.fill',
      stylers: [{ color: '#ffffff' }],
    });
  });
});
