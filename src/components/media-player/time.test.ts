import { describe, expect, it, vi } from 'vitest';
import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { MediaPreviewController } from './preview.js';
import { MEDIA_PREVIEW_CHANGE_EVENT, mediaPreviewSourceBrand } from './time-slider.js';
import { mediaPointerTime } from './time.js';

/** A preview source stand-in: an event target that is the composed parent of the host. */
function previewSource(previewTime: number | null) {
  return Object.assign(new EventTarget(), {
    [mediaPreviewSourceBrand]: true as const,
    nodeType: 1,
    parentNode: null,
    previewTime,
    previewRatio: null,
    previewing: true,
    keyboardInteraction: false,
    sliderValue: 0,
    timeSlider: null,
  });
}

function pointerHost(parent: object | null) {
  const controllers: ReactiveController[] = [];
  const host = {
    nodeType: 1,
    parentNode: parent,
    requestUpdate: vi.fn(),
    addController(controller: ReactiveController) {
      controllers.push(controller);
    },
    removeController() {},
    updateComplete: Promise.resolve(true),
  };
  return { host: host as unknown as ReactiveControllerHost & HTMLElement, controllers };
}

describe('tp-media-time type="pointer" (Library mp-l-time, mp-l-preview)', () => {
  it('prefers its own value, then the preview time, else unknown', () => {
    expect(mediaPointerTime(12, 40)).toBe(12);
    expect(mediaPointerTime(null, 40)).toBe(40);
    expect(mediaPointerTime(Number.NaN, 40)).toBe(40);
    expect(mediaPointerTime(null, null)).toBeNull();
    expect(mediaPointerTime(undefined, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('reads the nearest preview source and re-renders on preview changes', () => {
    const source = previewSource(30);
    const { host } = pointerHost(source);
    const preview = new MediaPreviewController(host);
    preview.hostConnected();
    expect(preview.source).toBe(source);
    expect(mediaPointerTime(null, preview.time)).toBe(30);
    const updates = vi.mocked(host.requestUpdate).mock.calls.length;
    source.previewTime = 45;
    source.dispatchEvent(new CustomEvent(MEDIA_PREVIEW_CHANGE_EVENT));
    expect(vi.mocked(host.requestUpdate).mock.calls.length).toBe(updates + 1);
    expect(mediaPointerTime(null, preview.time)).toBe(45);
    preview.hostDisconnected();
    source.dispatchEvent(new CustomEvent(MEDIA_PREVIEW_CHANGE_EVENT));
    expect(vi.mocked(host.requestUpdate).mock.calls.length).toBe(updates + 1);
    expect(preview.time).toBeNull();
  });

  it('is unknown without a preview source', () => {
    const { host } = pointerHost(null);
    const preview = new MediaPreviewController(host);
    preview.hostConnected();
    expect(preview.source).toBeNull();
    expect(mediaPointerTime(null, preview.time)).toBeNull();
  });
});
