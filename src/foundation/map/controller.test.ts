import { describe, expect, it } from 'vitest';
import { DEFAULT_CAMERA, mergeCamera } from './geo.js';
import { FakeEngine, createHost, flush } from './map-fakes.test.js';

async function ready(engineOptions = {}, config = {}) {
  const setup = createHost(config);
  const engine = new FakeEngine(engineOptions);
  setup.controller.connect();
  setup.controller.setEngine(engine);
  await flush();
  return { ...setup, engine, instance: engine.instances.at(-1)! };
}

describe('MapController lifecycle (map-f-mount, map-f-lifecycle, map-f-viewport)', () => {
  it('moves idle → loading → ready and reports the engine', async () => {
    const setup = createHost();
    expect(setup.controller.state.status).toBe('idle');
    setup.controller.connect();
    setup.controller.setEngine(new FakeEngine());
    expect(setup.controller.store.current.status).toBe('loading');
    await flush();
    expect(setup.controller.state.status).toBe('ready');
    expect(setup.of('ready')).toHaveLength(1);
  });

  it('defers mounting while the viewport has zero size', async () => {
    const setup = createHost();
    const engine = new FakeEngine();
    setup.host.size = { width: 0, height: 0 };
    setup.controller.connect();
    setup.controller.setEngine(engine);
    await flush();
    expect(engine.calls).toEqual([]);
    setup.host.size = { width: 400, height: 300 };
    setup.controller.refresh();
    await flush();
    expect(setup.controller.state.status).toBe('ready');
  });

  it('reports mount failures as error status', async () => {
    const setup = createHost();
    setup.controller.connect();
    setup.controller.setEngine(new FakeEngine({ failMount: new Error('style'), async: true }));
    await flush();
    expect(setup.controller.state.status).toBe('error');
    expect(setup.of('error')).toHaveLength(1);
  });

  it('defers destruction two frames and cancels it on reconnection', async () => {
    const { controller, frames, instance } = await ready();
    controller.disconnect();
    frames.tick();
    controller.connect();
    frames.run(3);
    expect(instance.destroyed).toBe(false);
    controller.disconnect();
    frames.run(2);
    expect(instance.destroyed).toBe(true);
  });

  it('replaces the engine preserving camera and placed overlays', async () => {
    const setup = await ready();
    const element = {} as HTMLElement;
    setup.controller.placeOverlay(element, { latitude: 1, longitude: 2 });
    expect(setup.instance.overlays.has(element)).toBe(true);
    setup.instance.gesture(mergeCamera(DEFAULT_CAMERA, { zoom: 7 }));
    const next = new FakeEngine();
    setup.controller.setEngine(next);
    await flush();
    expect(setup.instance.destroyed).toBe(true);
    expect(next.context!.initialCamera.zoom).toBe(7);
    expect(next.instances[0]!.overlays.has(element)).toBe(true);
  });
});

describe('MapController home view (map-f-home)', () => {
  it('prefers bounds, then center and zoom, then pins, then the world', async () => {
    const bounded = createHost({
      defaultBounds: { south: 38.6, west: -9.3, north: 38.8, east: -9 },
    });
    expect(bounded.controller.homeCamera()!.center.latitude).toBeCloseTo(38.7, 1);
    const centered = createHost({ defaultCenter: { latitude: 10, longitude: 20 }, defaultZoom: 9 });
    expect(centered.controller.homeCamera()).toMatchObject({ zoom: 9, center: { latitude: 10 } });
    const pinned = createHost();
    pinned.pins.set('a', { latitude: 1, longitude: 1 });
    pinned.pins.set('b', { latitude: 3, longitude: 3 });
    expect(pinned.controller.homeCamera()!.center.latitude).toBeCloseTo(2, 1);
    expect(createHost().controller.homeCamera()).toMatchObject({
      zoom: 1,
      center: { latitude: 0, longitude: 0 },
    });
  });
});

describe('MapController requests (map-f-request, map-f-motion, map-f-pre-ready)', () => {
  it('zooms by steps, clamps to the range and publishes zoom limits', async () => {
    const { controller, of, host } = await ready(
      {},
      { maxZoom: 2, defaultCenter: { latitude: 0, longitude: 0 }, defaultZoom: 1 },
    );
    host.reduced = true;
    await expect(
      controller.request('zoom-in', undefined, { reason: 'trigger-press' }),
    ).resolves.toBe('completed');
    await expect(controller.request('zoom-in', undefined)).resolves.toBe('completed');
    await flush();
    expect(controller.state.camera.zoom).toBe(2);
    expect(controller.state.canZoomIn).toBe(false);
    expect(controller.state.canZoomOut).toBe(true);
    expect(of('request')[0]!.detail).toMatchObject({ action: 'zoom-in', reason: 'trigger-press' });
    expect(of('camera-commit').length).toBeGreaterThan(0);
  });

  it('stops when the request event is cancelled', async () => {
    const { controller, host, instance } = await ready();
    host.cancel = true;
    await expect(controller.request('zoom-in', undefined)).resolves.toBe('cancelled');
    expect(instance.camera.zoom).toBe(1);
  });

  it('rejects while disabled and for unknown pins', async () => {
    const { controller, config, of } = await ready();
    await expect(controller.request('select-pin', 'missing')).rejects.toMatchObject({
      name: 'NotFoundError',
    });
    config.disabled = true;
    await expect(controller.request('zoom-in', undefined)).rejects.toMatchObject({
      name: 'NotSupportedError',
    });
    expect(of('request-failed')).toHaveLength(2);
  });

  it('applies camera requests made before ready at mount', async () => {
    const setup = createHost();
    const engine = new FakeEngine({ autoReady: false });
    setup.controller.connect();
    setup.controller.setEngine(engine);
    const pending = setup.controller.request('fly-to', { zoom: 6 });
    let settled = false;
    void pending.then(() => (settled = true));
    await flush();
    expect(settled).toBe(false);
    engine.context!.ready();
    await expect(pending).resolves.toBe('completed');
    expect(engine.instances[0]!.camera.zoom).toBe(6);
  });

  it('jumps under reduced motion and animates otherwise', async () => {
    const setup = await ready({ animate: true });
    setup.host.reduced = true;
    await setup.controller.request('zoom-in', undefined);
    expect(setup.instance.easeCalls).toHaveLength(0);
    setup.host.reduced = false;
    const animated = setup.controller.request('zoom-in', undefined);
    await flush();
    expect(setup.instance.easeCalls[0]!.options.duration).toBe(250);
    setup.instance.finishEase();
    await expect(animated).resolves.toBe('completed');
  });

  it('cancels an in-flight animation on a new request or an engine gesture', async () => {
    const setup = await ready({ animate: true });
    const first = setup.controller.request('fly-to', { zoom: 10 });
    await flush();
    const second = setup.controller.request('fly-to', { zoom: 4 });
    await expect(first).resolves.toBe('cancelled');
    await flush();
    setup.instance.gesture(mergeCamera(DEFAULT_CAMERA, { zoom: 3 }));
    await expect(second).resolves.toBe('cancelled');
    expect(setup.engine.calls).toContain('stop');
  });

  it('tweens with jumpTo when the engine cannot animate', async () => {
    const setup = await ready();
    const moving = setup.controller.request('fly-to', {
      center: { latitude: 10, longitude: 10 },
      zoom: 5,
    });
    await flush();
    setup.frames.run(120, 16);
    await expect(moving).resolves.toBe('completed');
    expect(setup.instance.camera.zoom).toBe(5);
    expect(setup.engine.calls.filter((call) => call.startsWith('jumpTo')).length).toBeGreaterThan(
      10,
    );
  });

  it('reveals a pin at the reveal zoom', async () => {
    const setup = await ready({}, { revealZoom: 15 });
    setup.pins.set('castle', { latitude: 38.7139, longitude: -9.1335 });
    await setup.controller.request('reveal-pin', { value: 'castle' }, { duration: 0 });
    expect(setup.instance.camera).toMatchObject({ zoom: 15, center: { latitude: 38.7139 } });
  });

  it('fits pins and does nothing without pins', async () => {
    const setup = await ready();
    await expect(setup.controller.request('fit-pins', undefined)).resolves.toBe('completed');
    expect(setup.instance.camera).toEqual(setup.instance.context.initialCamera);
    setup.pins.set('a', { latitude: 1, longitude: 1 });
    setup.pins.set('b', { latitude: 2, longitude: 2 });
    await setup.controller.request('fit-pins', undefined, { duration: 0 });
    expect(setup.instance.camera.center.latitude).toBeCloseTo(1.5, 1);
  });
});

describe('MapController notifications (map-f-store, map-f-appearance)', () => {
  it('coalesces engine camera notifications to one change per frame', async () => {
    const setup = await ready();
    setup.instance.gesture(mergeCamera(DEFAULT_CAMERA, { zoom: 2 }));
    setup.instance.gesture(mergeCamera(DEFAULT_CAMERA, { zoom: 3 }));
    setup.frames.tick();
    expect(setup.of('camera-change')).toHaveLength(1);
    expect(setup.of('camera-change')[0]!.detail).toMatchObject({
      reason: 'engine',
      camera: { zoom: 3 },
    });
    setup.instance.context.cameraEnd('engine');
    expect(setup.of('camera-commit')).toHaveLength(1);
    setup.instance.context.cameraEnd('engine');
    expect(setup.of('camera-commit')).toHaveLength(1);
  });

  it('pushes appearance changes once per change', async () => {
    const setup = await ready();
    setup.host.appearance = { scheme: 'dark', theme: { water: '#000000' } };
    setup.controller.updateAppearance();
    setup.controller.updateAppearance();
    expect(setup.instance.appearance).toEqual([['dark', { water: '#000000' }]]);
    await flush();
    expect(setup.controller.state.scheme).toBe('dark');
  });

  it('forwards basemap presses while ready', async () => {
    const setup = await ready();
    setup.instance.context.press({ latitude: 1, longitude: 200 }, { x: 1, y: 2 });
    expect(setup.of('press')[0]!.detail).toMatchObject({ position: { longitude: -160 } });
  });
});
