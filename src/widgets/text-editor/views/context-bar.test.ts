import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactiveControllerHost } from 'lit';
import { nothing } from 'lit';
import { fakeHost } from '../../../foundation/fakes.test.js';
import type { TpMotionRequestEvent } from '../../../foundation/motion.js';
import { CONTEXT_BAR_MOTION, TextEditorContextBarPresence } from './context-bar.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The widget as the presence controller and motion request fakes read it. */
function setup(editor: 'image-alt' | 'link' = 'link') {
  const frames = new Map<number, FrameRequestCallback>();
  let id = 0;
  const view = {
    AbortController,
    setTimeout,
    clearTimeout,
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      frames.set(++id, callback);
      return id;
    },
    cancelAnimationFrame: (key: number) => frames.delete(key),
  };
  const ownerDocument = { defaultView: view };
  const attributes = new Map<string, string>();
  const surface = {
    nodeType: 1,
    isConnected: true,
    ownerDocument,
    parentNode: null,
    getAttribute: () => null,
    getRootNode: () => element,
    getAnimations: () => [],
    querySelectorAll: () => [],
    shadowRoot: null,
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    removeAttribute: (name: string) => attributes.delete(name),
    hasAttribute: (name: string) => attributes.has(name),
  } as unknown as HTMLElement;
  const element = fakeHost({
    nodeType: 1,
    parentNode: null,
    isConnected: true,
    ownerDocument,
    getAttribute: () => 'normal',
    setAttribute: () => undefined,
    removeAttribute: () => undefined,
    getRootNode: () => element,
  }) as unknown as HTMLElement &
    ReactiveControllerHost & { controllers: { hostUpdated?(): void }[] };
  const requests: TpMotionRequestEvent[] = [];
  element.addEventListener('tp-motion-request', (event) =>
    requests.push(event as TpMotionRequestEvent),
  );
  const presence = new TextEditorContextBarPresence({ element, surface: () => surface }, editor);
  const frame = async () => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(0));
    await Promise.resolve();
    await Promise.resolve();
  };
  /** A render of the widget: the presence reads the visibility, the host then updates. */
  const render = async (visible: boolean) => {
    presence.set(visible);
    for (const controller of element.controllers) controller.hostUpdated?.();
    presence.updated();
    await frame();
  };
  return { presence, element, surface, requests, render, frame, attributes };
}

describe('context bar presence (uwg-te-req-pres-9)', () => {
  it('declares the context-bar presence role', () => {
    expect(CONTEXT_BAR_MOTION).toEqual({
      name: 'context-bar',
      kind: 'presence',
      phases: ['enter', 'exit'],
      completion: 'blocking',
    });
  });

  it('enters through the starting style and settles open after the rendered transition', async () => {
    const { presence, render, frame } = setup();
    expect(presence.mounted).toBe(false);
    expect(presence.starting).toBe(nothing);
    presence.set(true);
    expect(presence.state).toBe('starting');
    expect(presence.mounted).toBe(true);
    expect(presence.starting).toBe('');
    await render(true);
    expect(presence.state).toBe('open');
    expect(presence.starting).toBe(nothing);
    await render(true);
    await frame();
    expect(presence.state).toBe('open');
  });

  it('stays mounted through the ending style and leaves once the exit settled', async () => {
    const { presence, render, frame } = setup();
    await render(true);
    await render(true);
    presence.set(false);
    expect(presence.state).toBe('ending');
    expect(presence.mounted).toBe(true);
    expect(presence.ending).toBe('');
    await render(false);
    await frame();
    expect(presence.state).toBe('absent');
    expect(presence.mounted).toBe(false);
    expect(presence.ending).toBe(nothing);
  });

  it('requests the enter and exit phases of the role with the editor as public context', async () => {
    const { requests, render } = setup('image-alt');
    await render(true);
    await render(true);
    expect(requests.map((event) => event.request.phase)).toEqual(['enter']);
    expect(requests[0]!.request.role).toBe('context-bar');
    expect(requests[0]!.request.context).toEqual({ editor: 'image-alt' });
    await render(false);
    expect(requests.map((event) => event.request.phase)).toEqual(['enter', 'exit']);
  });

  it('holds the exit until a claimed playback settles, then leaves', async () => {
    const { presence, element, render, frame } = setup();
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => {
      finish = resolve;
    });
    element.addEventListener('tp-motion-request', (event) => {
      const request = event as TpMotionRequestEvent;
      if (request.request.phase === 'exit')
        request.respondWith({ play: () => ({ finished, cancel: finish }) });
    });
    await render(true);
    await render(true);
    await render(false);
    await frame();
    expect(presence.state).toBe('ending');
    finish();
    await finished;
    await Promise.resolve();
    await Promise.resolve();
    expect(presence.state).toBe('absent');
  });

  it('leaves the widget on dispose', () => {
    const { presence, element } = setup();
    expect(element.controllers).toHaveLength(1);
    presence.dispose();
    expect(element.controllers).toHaveLength(0);
  });
});
