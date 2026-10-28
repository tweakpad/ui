import { describe, expect, it, vi } from 'vitest';
import type { PositioningOptions } from './positioning.js';

const positioned: PositioningOptions[] = [];
vi.mock('./positioning.js', () => ({
  positionSurface: (_anchor: unknown, _surface: unknown, options: PositioningOptions) => {
    positioned.push(options);
    return { current: null, update: vi.fn(), destroy: vi.fn() };
  },
}));
vi.mock('./toolbar.js', () => ({
  ToolbarController: class {
    dispose(): void {}
  },
}));

const { CONTEXTUAL_TOOLBAR_REANCHORED, ContextualToolbarController } =
  await import('./contextual-toolbar.js');

describe('contextual toolbar positioning writes', () => {
  it('marks a moved anchor once, not on every later pass', () => {
    const attributes = new Map<string, string>();
    const writes: string[] = [];
    const surface = Object.assign(new EventTarget(), {
      hasAttribute: (name: string) => attributes.has(name),
      setAttribute: (name: string, value: string) => {
        writes.push(name);
        attributes.set(name, value);
      },
      removeAttribute: (name: string) => void attributes.delete(name),
    }) as unknown as HTMLElement;
    const controller = new ContextualToolbarController(surface);
    controller.show({ getBoundingRectangle: () => ({}) as never });
    const [options] = positioned;
    writes.length = 0;
    // The first pass places it; every later pass follows the anchor without a transition.
    options!.onPosition!(null as never);
    options!.onPosition!(null as never);
    options!.onPosition!(null as never);
    expect(attributes.has(CONTEXTUAL_TOOLBAR_REANCHORED)).toBe(true);
    expect(writes).toEqual([CONTEXTUAL_TOOLBAR_REANCHORED]);
    controller.dispose();
  });
});
