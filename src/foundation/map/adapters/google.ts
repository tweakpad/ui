/**
 * Map engine adapter for the Google Maps JavaScript API.
 *
 * The library does not load Google Maps: pass an `importLibrary` function from the inline
 * bootstrap loader (`google.maps.importLibrary`) or from `@googlemaps/js-api-loader`.
 *
 * ```ts
 * import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
 * setOptions({ key: 'YOUR_KEY' });
 * map.engine = createGoogleMapsEngine(importLibrary);
 * ```
 *
 * Google renders Google basemaps only; vector tile styles such as OpenFreeMap need a vector-style
 * engine. Placed pins use one `OverlayView`, so both JSON styles (without a map ID) and cloud
 * styles (with a map ID) work. Google has no animated fly; the map's shared tween animates it.
 * A color-scheme change re-creates the native map when a map ID is used, preserving the camera.
 */
import type {
  MapEngine,
  MapEngineContext,
  MapEngineInstance,
  MapOverlayHandle,
  MapScheme,
} from '../engine.js';
import {
  type MapBounds,
  type MapCamera,
  type MapPoint,
  type MapPosition,
  normalizePosition,
  wrapBearing,
} from '../geo.js';
import type { ResolvedMapTheme } from '../theme.js';

/* The structural subset of the Google Maps API the adapter uses. */
interface LatLng {
  lat(): number;
  lng(): number;
}
interface LatLngBounds {
  getNorthEast(): LatLng;
  getSouthWest(): LatLng;
}
interface MapsEventListener {
  remove(): void;
}
interface GoogleMapMouseEvent {
  latLng?: LatLng | null;
  domEvent?: Event;
}
interface GoogleProjection {
  fromLatLngToDivPixel(latLng: { lat: number; lng: number }): { x: number; y: number } | null;
  fromLatLngToContainerPixel(latLng: { lat: number; lng: number }): { x: number; y: number } | null;
  fromContainerPixelToLatLng(point: { x: number; y: number }): LatLng | null;
}
export interface GoogleMap {
  addListener(type: string, handler: (event?: GoogleMapMouseEvent) => void): MapsEventListener;
  getCenter(): LatLng | undefined;
  getZoom(): number | undefined;
  getHeading(): number | undefined;
  getTilt(): number | undefined;
  getBounds(): LatLngBounds | undefined;
  moveCamera(camera: Record<string, unknown>): void;
  setOptions(options: Record<string, unknown>): void;
}
interface GoogleOverlayView {
  setMap(map: GoogleMap | null): void;
  getPanes(): { overlayMouseTarget: HTMLElement } | null;
  getProjection(): GoogleProjection | null;
  onAdd?(): void;
  draw?(): void;
  onRemove?(): void;
}
interface GoogleMapsLibrary {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMap;
  OverlayView: (new () => GoogleOverlayView) & {
    preventMapHitsAndGesturesFrom?(element: HTMLElement): void;
  };
}
export type GoogleImportLibrary = (name: 'maps') => Promise<unknown>;

export type GoogleMapStyles = readonly Record<string, unknown>[];

export interface GoogleMapsEngineOptions {
  /** Cloud map ID. With a map ID, JSON styles and theme roles do not apply (Google restriction). */
  readonly mapId?: string;
  /** JSON styles per scheme (without a map ID). They take precedence over theme roles. */
  readonly styles?: { readonly light?: GoogleMapStyles; readonly dark?: GoogleMapStyles };
  /** Extra `google.maps.MapOptions`; the map's camera, zoom range and interaction take precedence. */
  readonly mapOptions?: Record<string, unknown>;
}

/** Converts resolved theme roles to Google JSON styles. */
export function googleStylesFromTheme(theme: ResolvedMapTheme | null): GoogleMapStyles {
  if (!theme) return [];
  const rule = (featureType: string | undefined, elementType: string, color: string | undefined) =>
    color ? [{ ...(featureType ? { featureType } : {}), elementType, stylers: [{ color }] }] : [];
  return [
    ...rule(undefined, 'geometry', theme.land ?? theme.background),
    ...rule('landscape.man_made', 'geometry', theme.building),
    ...rule('poi', 'geometry', theme.land ?? theme.background),
    ...rule('poi.park', 'geometry', theme.park),
    ...rule('water', 'geometry', theme.water),
    ...rule('road', 'geometry', theme.road),
    ...rule('road.highway', 'geometry', theme.roadMajor),
    ...rule('road.arterial', 'geometry', theme.roadMajor),
    ...rule('administrative', 'geometry.stroke', theme.boundary),
    ...rule(undefined, 'labels.text.fill', theme.label),
    ...rule(undefined, 'labels.text.stroke', theme.labelHalo),
  ];
}

const latLng = (position: MapPosition) => ({ lat: position.latitude, lng: position.longitude });

/** Creates a Google Maps engine. `importLibrary` loads the `maps` library. */
export function createGoogleMapsEngine(
  importLibrary: GoogleImportLibrary,
  options: GoogleMapsEngineOptions = {},
): MapEngine {
  return {
    name: 'google-maps',
    async mount(viewport: HTMLElement, context: MapEngineContext): Promise<MapEngineInstance> {
      const library = (await importLibrary('maps')) as GoogleMapsLibrary;
      if (context.signal.aborted) throw new DOMException('The map was destroyed.', 'AbortError');
      const document = viewport.ownerDocument;
      const container = document.createElement('div');
      container.style.cssText = 'position:absolute;inset:0';
      viewport.append(container);

      let scheme: MapScheme = context.scheme;
      let theme = context.theme;
      let interactive = context.interactive;
      let cooperative = context.cooperativeGestures;
      let zoomRange = { minZoom: context.minZoom, maxZoom: context.maxZoom };
      const overlays = new Map<HTMLElement, MapPosition>();
      const listeners: MapsEventListener[] = [];
      let readyReported = false;
      let projectionReady = false;
      let idleOnce = false;

      const stylesFor = (next: MapScheme): GoogleMapStyles | undefined => {
        if (options.mapId) return undefined;
        return (
          options.styles?.[next] ??
          options.styles?.[next === 'dark' ? 'light' : 'dark'] ??
          googleStylesFromTheme(theme)
        );
      };
      const gestureHandling = () =>
        !interactive ? 'none' : cooperative ? 'cooperative' : 'greedy';

      // A single overlay layer positions every placed element (map-f-placement).
      const layer = new (class extends library.OverlayView {
        readonly pane = document.createElement('div');
        override onAdd() {
          this.pane.style.cssText = 'position:absolute;left:0;top:0';
          this.getPanes()?.overlayMouseTarget.append(this.pane);
          projectionReady = true;
          maybeReady();
        }
        override draw() {
          const projection = this.getProjection();
          if (!projection) return;
          for (const [element, position] of overlays) {
            const point = projection.fromLatLngToDivPixel(latLng(position));
            if (point) element.style.transform = `translate(${point.x}px, ${point.y}px)`;
          }
        }
        override onRemove() {
          this.pane.remove();
          projectionReady = false;
        }
      })();

      const maybeReady = () => {
        if (readyReported || !projectionReady || !idleOnce) return;
        readyReported = true;
        context.ready();
      };

      let animating = false;
      let map!: GoogleMap;
      const createMap = (camera: MapCamera) => {
        for (const listener of listeners.splice(0)) listener.remove();
        layer.setMap(null);
        container.replaceChildren();
        const host = document.createElement('div');
        host.style.cssText = 'position:absolute;inset:0';
        container.append(host);
        idleOnce = false;
        map = new library.Map(host, {
          disableDefaultUI: true,
          clickableIcons: false,
          isFractionalZoomEnabled: true,
          ...options.mapOptions,
          center: latLng(camera.center),
          zoom: camera.zoom,
          heading: camera.bearing,
          tilt: camera.pitch,
          ...zoomRange,
          ...(options.mapId ? { mapId: options.mapId } : {}),
          ...(stylesFor(scheme) ? { styles: stylesFor(scheme) } : {}),
          ...(theme?.background ? { backgroundColor: theme.background } : {}),
          colorScheme: scheme === 'dark' ? 'DARK' : 'LIGHT',
          gestureHandling: gestureHandling(),
          keyboardShortcuts: interactive,
        });
        const changed = () => context.camera(animating ? undefined : 'engine', undefined);
        listeners.push(
          map.addListener('center_changed', changed),
          map.addListener('zoom_changed', changed),
          map.addListener('heading_changed', changed),
          map.addListener('tilt_changed', changed),
          // A gesture during a request animation cancels it (synthetic originating event).
          map.addListener('dragstart', () => context.camera('engine', new Event('tp-map-gesture'))),
          map.addListener('idle', () => {
            idleOnce = true;
            maybeReady();
            context.cameraEnd(animating ? undefined : 'engine', undefined);
          }),
          map.addListener('click', (event) => {
            if (!event?.latLng) return;
            const position = normalizePosition({
              latitude: event.latLng.lat(),
              longitude: event.latLng.lng(),
            });
            const point = layer.getProjection()?.fromLatLngToContainerPixel(latLng(position));
            context.press(position, point ?? { x: 0, y: 0 }, event.domEvent);
          }),
        );
        layer.setMap(map);
      };

      // Wheel input during a tween counts as a gesture.
      const wheel = (event: WheelEvent) => {
        if (animating) context.camera('engine', event);
      };
      container.addEventListener('wheel', wheel, { capture: true, passive: true });

      const getCamera = (): MapCamera => {
        const center = map.getCenter();
        return Object.freeze({
          center: normalizePosition({
            latitude: center?.lat() ?? context.initialCamera.center.latitude,
            longitude: center?.lng() ?? context.initialCamera.center.longitude,
          }),
          zoom: map.getZoom() ?? context.initialCamera.zoom,
          bearing: wrapBearing(map.getHeading() ?? 0),
          pitch: map.getTilt() ?? 0,
        });
      };

      createMap(context.initialCamera);

      const instance: MapEngineInstance = {
        get native() {
          return map;
        },
        getCamera,
        getBounds(): MapBounds | null {
          const bounds = map.getBounds();
          if (!bounds) return null;
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          return Object.freeze({
            south: sw.lat(),
            west: sw.lng(),
            north: ne.lat(),
            east: ne.lng(),
          });
        },
        jumpTo(camera) {
          animating = true;
          try {
            map.moveCamera({
              center: latLng(camera.center),
              zoom: camera.zoom,
              heading: camera.bearing,
              tilt: camera.pitch,
            });
          } finally {
            animating = false;
          }
        },
        project(position: MapPosition): MapPoint {
          const point = layer.getProjection()?.fromLatLngToContainerPixel(latLng(position));
          return point ? { x: point.x, y: point.y } : { x: Number.NaN, y: Number.NaN };
        },
        unproject(point: MapPoint): MapPosition {
          const result = layer.getProjection()?.fromContainerPixelToLatLng(point);
          return result
            ? normalizePosition({ latitude: result.lat(), longitude: result.lng() })
            : getCamera().center;
        },
        attachOverlay(element: HTMLElement, position: MapPosition): MapOverlayHandle {
          overlays.set(element, normalizePosition(position));
          element.style.position = 'absolute';
          element.style.left = '0';
          element.style.top = '0';
          library.OverlayView.preventMapHitsAndGesturesFrom?.(element);
          layer.pane.append(element);
          layer.draw?.();
          let removed = false;
          return {
            setPosition(next) {
              if (removed) return;
              overlays.set(element, normalizePosition(next));
              layer.draw?.();
            },
            remove() {
              if (removed) return;
              removed = true;
              overlays.delete(element);
              element.remove();
            },
          };
        },
        setZoomRange(minimum, maximum) {
          zoomRange = { minZoom: minimum, maxZoom: maximum };
          map.setOptions(zoomRange);
        },
        setInteractive(enabled) {
          interactive = enabled;
          map.setOptions({ gestureHandling: gestureHandling(), keyboardShortcuts: enabled });
        },
        setCooperativeGestures(enabled) {
          cooperative = enabled;
          map.setOptions({ gestureHandling: gestureHandling() });
        },
        setAppearance(nextScheme, nextTheme) {
          const schemeChanged = nextScheme !== scheme;
          scheme = nextScheme;
          theme = nextTheme;
          if (options.mapId) {
            // colorScheme is fixed at construction: re-create the map, keeping camera and overlays.
            if (schemeChanged) {
              const camera = getCamera();
              const elements = [...overlays.keys()];
              createMap(camera);
              for (const element of elements) layer.pane.append(element);
            }
            return;
          }
          map.setOptions({
            styles: stylesFor(nextScheme),
            ...(nextTheme?.background ? { backgroundColor: nextTheme.background } : {}),
          });
        },
        destroy() {
          container.removeEventListener('wheel', wheel, { capture: true });
          for (const listener of listeners.splice(0)) listener.remove();
          for (const element of overlays.keys()) element.remove();
          overlays.clear();
          layer.setMap(null);
          container.remove();
        },
      };
      return instance;
    },
  };
}
