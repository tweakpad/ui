/**
 * Map engine adapter for MapLibre GL JS (vector styles such as OpenFreeMap).
 *
 * The library does not depend on MapLibre: pass the namespace you import yourself.
 *
 * ```ts
 * import * as maplibregl from 'maplibre-gl';
 * import maplibreCss from 'maplibre-gl/dist/maplibre-gl.css?raw';
 * map.engine = createMapLibreEngine(maplibregl, { css: maplibreCss });
 * ```
 *
 * MapLibre zoom uses 512-pixel tiles, so its zoom is one less than the map's 256-pixel zoom scale.
 */
import type {
  MapAnimationOptions,
  MapEngine,
  MapEngineContext,
  MapEngineInstance,
  MapFitOptions,
  MapOverlayHandle,
  MapScheme,
} from '../engine.js';
import {
  type MapBounds,
  type MapCamera,
  type MapPoint,
  type MapPosition,
  normalizePosition,
  resolvePadding,
  wrapBearing,
  wrapLongitude,
} from '../geo.js';
import type { ResolvedMapTheme } from '../theme.js';

/** OpenFreeMap styles (no API key; attribution is supplied by the style). */
export const OPENFREEMAP_STYLES = Object.freeze({
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
  bright: 'https://tiles.openfreemap.org/styles/bright',
  positron: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
  fiord: 'https://tiles.openfreemap.org/styles/fiord',
});

/* The structural subset of the MapLibre API the adapter uses. */
interface LngLatLike {
  lng: number;
  lat: number;
}
interface MapLibreBounds {
  getSouth(): number;
  getWest(): number;
  getNorth(): number;
  getEast(): number;
}
interface MapLibreEvent {
  originalEvent?: Event;
  lngLat?: LngLatLike;
  point?: { x: number; y: number };
  error?: unknown;
  tpAnimation?: number;
  type?: string;
}
interface MapLibreHandler {
  enable(): void;
  disable(): void;
}
interface MapLibreStyleLayer {
  id: string;
  type: string;
  'source-layer'?: string;
}
export interface MapLibreMap {
  on(type: string, listener: (event: MapLibreEvent) => void): unknown;
  off(type: string, listener: (event: MapLibreEvent) => void): unknown;
  once(type: string, listener: (event: MapLibreEvent) => void): unknown;
  remove(): void;
  resize(): void;
  stop(): void;
  getCenter(): LngLatLike;
  getZoom(): number;
  getBearing(): number;
  getPitch(): number;
  getBounds(): MapLibreBounds;
  jumpTo(options: Record<string, unknown>, eventData?: Record<string, unknown>): unknown;
  easeTo(options: Record<string, unknown>, eventData?: Record<string, unknown>): unknown;
  flyTo(options: Record<string, unknown>, eventData?: Record<string, unknown>): unknown;
  cameraForBounds(
    bounds: [[number, number], [number, number]],
    options?: Record<string, unknown>,
  ): { center?: unknown; zoom?: number; bearing?: number } | undefined;
  project(lngLat: [number, number]): { x: number; y: number };
  unproject(point: [number, number]): LngLatLike;
  setMinZoom(zoom: number): unknown;
  setMaxZoom(zoom: number): unknown;
  setStyle(style: unknown, options?: Record<string, unknown>): unknown;
  getStyle(): { layers?: MapLibreStyleLayer[] } | undefined;
  setPaintProperty(layer: string, property: string, value: unknown): unknown;
  isStyleLoaded(): boolean | void;
  getCanvasContainer(): HTMLElement;
  dragPan?: MapLibreHandler;
  scrollZoom?: MapLibreHandler;
  boxZoom?: MapLibreHandler;
  dragRotate?: MapLibreHandler;
  keyboard?: MapLibreHandler;
  doubleClickZoom?: MapLibreHandler;
  touchZoomRotate?: MapLibreHandler;
  touchPitch?: MapLibreHandler;
  cooperativeGestures?: MapLibreHandler;
}
interface MapLibreMarker {
  setLngLat(lngLat: [number, number]): MapLibreMarker;
  addTo(map: MapLibreMap): MapLibreMarker;
  remove(): MapLibreMarker;
}
export interface MapLibreNamespace {
  Map: new (options: Record<string, unknown>) => MapLibreMap;
  Marker: new (options: Record<string, unknown>) => MapLibreMarker;
}

export type MapLibreStyle = string | Record<string, unknown>;

export interface MapLibreEngineOptions {
  /** One style for both schemes. */
  readonly style?: MapLibreStyle;
  /** Per-scheme styles. Defaults to OpenFreeMap Liberty (light) and Dark. */
  readonly styles?: { readonly light?: MapLibreStyle; readonly dark?: MapLibreStyle };
  /**
   * MapLibre stylesheet text (`maplibre-gl/dist/maplibre-gl.css`), adopted into the map's shadow
   * root. Without it a minimal built-in subset styles the canvas, placed elements and attribution.
   */
  readonly css?: string;
  /** Apply the map's theme roles to matching style layers (default `true`). */
  readonly applyTheme?: boolean;
  /**
   * Attribution presentation: `collapsed` (default) shows only the info button until opened;
   * `expanded` keeps the full text; `auto` keeps MapLibre's behavior (expanded until the first
   * drag on compact maps).
   */
  readonly attribution?: 'collapsed' | 'expanded' | 'auto';
  /** Extra MapLibre `Map` options; the map's camera, zoom range and interaction take precedence. */
  readonly mapOptions?: Record<string, unknown>;
}

/** Minimal structural styles when the full MapLibre stylesheet is not supplied. */
export const MAPLIBRE_BASE_CSS = `
.maplibregl-map{position:relative;overflow:hidden;font:12px/20px system-ui,sans-serif;-webkit-tap-highlight-color:transparent}
.maplibregl-canvas{position:absolute;left:0;top:0}
.maplibregl-canvas-container.maplibregl-interactive{cursor:grab}
.maplibregl-canvas-container.maplibregl-interactive:active{cursor:grabbing}
.maplibregl-canvas:focus-visible{outline:none}
.maplibregl-marker{position:absolute;top:0;left:0;will-change:transform}
.maplibregl-ctrl-bottom-right,.maplibregl-ctrl-bottom-left,.maplibregl-ctrl-top-right,.maplibregl-ctrl-top-left{position:absolute;pointer-events:none;z-index:2}
.maplibregl-ctrl-bottom-right{right:0;bottom:0}.maplibregl-ctrl-bottom-left{left:0;bottom:0}
.maplibregl-ctrl-top-right{right:0;top:0}.maplibregl-ctrl-top-left{left:0;top:0}
.maplibregl-ctrl{clear:both;pointer-events:auto;transform:translate(0)}
.maplibregl-ctrl-bottom-right .maplibregl-ctrl{float:right;margin:0 10px 10px 0}
.maplibregl-ctrl-attrib{padding:0 5px;background:color-mix(in srgb,Canvas 65%,transparent);color:CanvasText;margin:0}
.maplibregl-ctrl-attrib a{color:inherit;text-decoration:none}.maplibregl-ctrl-attrib a:hover{text-decoration:underline}
.maplibregl-ctrl-attrib.maplibregl-compact{min-height:20px;padding:2px 24px 2px 0;margin:10px;position:relative;border-radius:12px;background:Canvas}
.maplibregl-ctrl-attrib.maplibregl-compact .maplibregl-ctrl-attrib-inner{display:none}
.maplibregl-ctrl-attrib.maplibregl-compact-show .maplibregl-ctrl-attrib-inner{display:block;padding:0 8px}
.maplibregl-ctrl-attrib-button{display:none;cursor:pointer;position:absolute;width:24px;height:24px;box-sizing:border-box;border-radius:12px;border:0;outline:none;top:0;right:0;background:Canvas;color:CanvasText;font:inherit}
.maplibregl-ctrl-attrib-button::before{content:"ⓘ";font-size:16px;line-height:24px}
.maplibregl-ctrl-attrib-button:focus-visible{outline:2px solid Highlight}
.maplibregl-compact .maplibregl-ctrl-attrib-button{display:block}
.maplibregl-cooperative-gesture-screen{align-items:center;background:rgba(0,0,0,.4);color:#fff;display:flex;font-size:1.4em;inset:0;justify-content:center;line-height:1.2;opacity:0;padding:1rem;pointer-events:none;position:absolute;transition:opacity 1s ease 1s;z-index:99999}
.maplibregl-cooperative-gesture-screen.maplibregl-show{opacity:1;transition:opacity .05s}
.maplibregl-cooperative-gesture-screen .maplibregl-mobile-message{display:none}
@media (hover:none),(pointer:coarse){.maplibregl-cooperative-gesture-screen .maplibregl-desktop-message{display:none}.maplibregl-cooperative-gesture-screen .maplibregl-mobile-message{display:block}}
.maplibregl-pseudo-fullscreen{height:100%!important;left:0!important;position:fixed!important;top:0!important;width:100%!important;z-index:99999}
`;

const HANDLERS = [
  'dragPan',
  'scrollZoom',
  'boxZoom',
  'dragRotate',
  'keyboard',
  'doubleClickZoom',
  'touchZoomRotate',
  'touchPitch',
] as const;

const toEngineZoom = (zoom: number) => zoom - 1;
const fromEngineZoom = (zoom: number) => zoom + 1;
const toLngLat = (position: MapPosition): [number, number] => [
  position.longitude,
  position.latitude,
];

/** Which theme role a style layer takes, or `null` to leave it alone. */
export function maplibreLayerRole(
  layer: MapLibreStyleLayer,
): { role: keyof ResolvedMapTheme; property: string; halo?: boolean }[] | null {
  const source = layer['source-layer'] ?? '';
  const id = layer.id.toLowerCase();
  switch (layer.type) {
    case 'background':
      return [{ role: 'background', property: 'background-color' }];
    case 'fill':
      if (source === 'water' || /water|ocean|lake|river/.test(id))
        return [{ role: 'water', property: 'fill-color' }];
      if (source === 'park' || /park|wood|forest|grass|green/.test(id))
        return [{ role: 'park', property: 'fill-color' }];
      if (source === 'building' || id.includes('building'))
        return [{ role: 'building', property: 'fill-color' }];
      if (source === 'landcover' || source === 'landuse' || /land|residential|sand/.test(id))
        return [{ role: 'land', property: 'fill-color' }];
      return null;
    case 'fill-extrusion':
      return source === 'building' || id.includes('building')
        ? [{ role: 'building', property: 'fill-extrusion-color' }]
        : null;
    case 'line':
      if (source === 'waterway' || /waterway|river|stream|canal/.test(id))
        return [{ role: 'water', property: 'line-color' }];
      if (source === 'boundary' || id.includes('boundary') || id.includes('admin'))
        return [{ role: 'boundary', property: 'line-color' }];
      if (source === 'transportation' || /road|street|highway|motorway|bridge|tunnel/.test(id)) {
        const major = /motorway|trunk|primary|major/.test(id);
        return [{ role: major ? 'roadMajor' : 'road', property: 'line-color' }];
      }
      return null;
    case 'symbol':
      return [
        { role: 'label', property: 'text-color' },
        { role: 'labelHalo', property: 'text-halo-color', halo: true },
      ];
    default:
      return null;
  }
}

/** Applies resolved theme roles to every matching layer of the loaded style. */
export function applyMapLibreTheme(map: MapLibreMap, theme: ResolvedMapTheme | null): void {
  if (!theme) return;
  for (const layer of map.getStyle()?.layers ?? []) {
    for (const { role, property } of maplibreLayerRole(layer) ?? []) {
      const color = theme[role];
      if (!color) continue;
      try {
        map.setPaintProperty(layer.id, property, color);
      } catch {
        /* a layer without the property keeps its style */
      }
    }
  }
}

/** Creates a MapLibre engine. `maplibregl` is the namespace the consumer imported. */
export function createMapLibreEngine(
  maplibregl: MapLibreNamespace,
  options: MapLibreEngineOptions = {},
): MapEngine {
  const styleFor = (scheme: MapScheme): MapLibreStyle =>
    options.style ??
    options.styles?.[scheme] ??
    options.styles?.[scheme === 'dark' ? 'light' : 'dark'] ??
    (scheme === 'dark' ? OPENFREEMAP_STYLES.dark : OPENFREEMAP_STYLES.liberty);
  const applyTheme = options.applyTheme ?? true;

  return {
    name: 'maplibre',
    mount(viewport: HTMLElement, context: MapEngineContext): MapEngineInstance {
      const releaseStyles = context.adoptStyles(options.css ?? MAPLIBRE_BASE_CSS);
      const container = viewport.ownerDocument.createElement('div');
      container.style.cssText = 'position:absolute;inset:0';
      viewport.append(container);
      let scheme = context.scheme;
      let theme = context.theme;
      const camera = context.initialCamera;
      const attribution = options.attribution ?? 'collapsed';
      const map = new maplibregl.Map({
        attributionControl: attribution === 'expanded' ? { compact: false } : { compact: true },
        ...options.mapOptions,
        container,
        style: styleFor(scheme),
        center: toLngLat(camera.center),
        zoom: toEngineZoom(camera.zoom),
        bearing: camera.bearing,
        pitch: camera.pitch,
        minZoom: toEngineZoom(context.minZoom),
        maxZoom: toEngineZoom(context.maxZoom),
        cooperativeGestures: context.cooperativeGestures,
        interactive: true,
      });
      const overlays = new Set<HTMLElement>();
      let loaded = false;
      // Start the compact attribution closed (the info button stays visible and reachable).
      // Runs once, when the attribution has content; later toggles belong to the user.
      let attributionCollapsed = attribution !== 'collapsed';
      const collapseAttribution = () => {
        if (attributionCollapsed) return;
        const control = container.querySelector<HTMLElement>('.maplibregl-ctrl-attrib');
        const inner = control?.querySelector('.maplibregl-ctrl-attrib-inner');
        if (!control || !inner?.textContent?.trim()) return;
        control.classList.add('maplibregl-compact');
        control.classList.remove('maplibregl-compact-show');
        // A closed <details> reports collapsed; MapLibre's toggle runs before the native one.
        control.removeAttribute('open');
        attributionCollapsed = true;
      };
      map.on('styledata', collapseAttribution);
      map.on('sourcedata', collapseAttribution);
      let animationId = 0;

      const setInteractive = (enabled: boolean) => {
        for (const name of HANDLERS) {
          const handler = map[name];
          if (enabled) handler?.enable();
          else handler?.disable();
        }
      };
      if (!context.interactive) setInteractive(false);

      const fromOverlay = (event: Event | undefined) =>
        Boolean(event?.composedPath?.().some((node) => overlays.has(node as HTMLElement)));
      const reason = (event: MapLibreEvent) => (event.originalEvent ? 'engine' : undefined);

      map.on('load', () => {
        loaded = true;
        collapseAttribution();
        if (applyTheme) applyMapLibreTheme(map, theme);
        context.ready();
      });
      map.on('style.load', () => {
        if (loaded && applyTheme) applyMapLibreTheme(map, theme);
      });
      map.on('error', (event) => {
        // Before the first load an error is fatal (style or authorization); tile errors later are not.
        if (!loaded) context.error(event.error ?? new Error('The map style could not be loaded.'));
      });
      // Only user gestures carry an original DOM event; request animations report no reason.
      map.on('move', (event) => context.camera(reason(event), event.originalEvent));
      map.on('moveend', (event) => context.cameraEnd(reason(event), event.originalEvent));
      map.on('click', (event) => {
        if (!event.lngLat || !event.point || fromOverlay(event.originalEvent)) return;
        context.press(
          { latitude: event.lngLat.lat, longitude: event.lngLat.lng },
          { x: event.point.x, y: event.point.y },
          event.originalEvent,
        );
      });

      const toCamera = (): MapCamera => {
        const center = map.getCenter();
        return Object.freeze({
          center: normalizePosition({ latitude: center.lat, longitude: center.lng }),
          zoom: fromEngineZoom(map.getZoom()),
          bearing: wrapBearing(map.getBearing()),
          pitch: map.getPitch(),
        });
      };
      const cameraOptions = (target: MapCamera) => ({
        center: toLngLat(target.center),
        zoom: toEngineZoom(target.zoom),
        bearing: target.bearing,
        pitch: target.pitch,
      });

      const instance: MapEngineInstance = {
        native: map,
        getCamera: toCamera,
        getBounds(): MapBounds | null {
          const bounds = map.getBounds();
          const span = bounds.getEast() - bounds.getWest();
          return Object.freeze({
            south: bounds.getSouth(),
            north: bounds.getNorth(),
            west: span >= 360 ? -180 : wrapLongitude(bounds.getWest()),
            east: span >= 360 ? 180 : wrapLongitude(bounds.getEast()),
          });
        },
        jumpTo(target) {
          map.jumpTo(cameraOptions(target));
        },
        easeTo(target: MapCamera, animation: MapAnimationOptions): Promise<void> {
          return new Promise((resolve) => {
            const id = ++animationId;
            const done = (event: MapLibreEvent) => {
              if (event.tpAnimation !== id) return;
              map.off('moveend', done);
              resolve();
            };
            map.on('moveend', done);
            animation.signal?.addEventListener(
              'abort',
              () => {
                map.off('moveend', done);
                resolve();
              },
              { once: true },
            );
            const current = toCamera();
            const travels =
              Math.abs(current.center.latitude - target.center.latitude) > 1e-9 ||
              Math.abs(current.center.longitude - target.center.longitude) > 1e-9;
            // The map already applied its reduced-motion policy; the engine must not skip again.
            const settings = {
              ...cameraOptions(target),
              duration: animation.duration,
              essential: true,
            };
            if (travels) map.flyTo(settings, { tpAnimation: id });
            else map.easeTo(settings, { tpAnimation: id });
          });
        },
        stop() {
          map.stop();
        },
        cameraForBounds(bounds: MapBounds, fit: MapFitOptions): MapCamera | null {
          const east = bounds.east < bounds.west ? bounds.east + 360 : bounds.east;
          const padding = resolvePadding(fit.padding);
          const result = map.cameraForBounds(
            [
              [bounds.west, bounds.south],
              [east, bounds.north],
            ],
            {
              padding,
              ...(fit.maxZoom === undefined ? {} : { maxZoom: toEngineZoom(fit.maxZoom) }),
            },
          );
          if (!result || result.zoom === undefined || !result.center) return null;
          const center = result.center as LngLatLike | [number, number];
          const [lng, lat] = Array.isArray(center) ? center : [center.lng, center.lat];
          return Object.freeze({
            center: normalizePosition({ latitude: lat, longitude: lng }),
            zoom: fromEngineZoom(result.zoom),
            bearing: wrapBearing(result.bearing ?? 0),
            pitch: 0,
          });
        },
        project(position: MapPosition): MapPoint {
          const point = map.project(toLngLat(position));
          return { x: point.x, y: point.y };
        },
        unproject(point: MapPoint): MapPosition {
          const lngLat = map.unproject([point.x, point.y]);
          return normalizePosition({ latitude: lngLat.lat, longitude: lngLat.lng });
        },
        attachOverlay(element: HTMLElement, position: MapPosition): MapOverlayHandle {
          overlays.add(element);
          const marker = new maplibregl.Marker({
            element,
            anchor: 'top-left',
            subpixelPositioning: true,
          })
            .setLngLat(toLngLat(position))
            .addTo(map);
          let removed = false;
          return {
            setPosition(next) {
              if (!removed) marker.setLngLat(toLngLat(next));
            },
            remove() {
              if (removed) return;
              removed = true;
              overlays.delete(element);
              marker.remove();
            },
          };
        },
        setZoomRange(minimum, maximum) {
          map.setMinZoom(toEngineZoom(minimum));
          map.setMaxZoom(toEngineZoom(maximum));
        },
        setInteractive,
        setCooperativeGestures(enabled) {
          if (enabled) map.cooperativeGestures?.enable();
          else map.cooperativeGestures?.disable();
        },
        setAppearance(nextScheme, nextTheme) {
          const styleChanged = styleFor(nextScheme) !== styleFor(scheme);
          scheme = nextScheme;
          theme = nextTheme;
          // `diff` keeps sources and placed markers; the theme is re-applied on `style.load`.
          if (styleChanged) map.setStyle(styleFor(nextScheme), { diff: true });
          else if (loaded && applyTheme) applyMapLibreTheme(map, theme);
        },
        resize() {
          map.resize();
        },
        destroy() {
          for (const element of overlays) element.remove();
          overlays.clear();
          map.remove();
          container.remove();
          releaseStyles();
        },
      };
      return instance;
    },
  };
}
