import { frameLoopFor, type FrameSubscription } from './frame-loop.js';

/** A pointer position in client (viewport) coordinates. */
export interface PointerPoint {
  readonly x: number;
  readonly y: number;
  /** The pointer's type (`mouse`, `pen`, `touch`) when it comes from an event. */
  readonly pointerType?: string;
}

export type PointerPositionCallback = (point: PointerPoint | null) => void;

interface Registry {
  readonly callbacks: Set<PointerPositionCallback>;
  point: PointerPoint | null;
  frame: FrameSubscription | null;
  release: (() => void) | null;
}

const registries = new WeakMap<Document, Registry>();

function install(document: Document, registry: Registry): void {
  const view = document.defaultView;
  if (!view) return;
  const frame = frameLoopFor(view).subscribe(() => {
    for (const callback of [...registry.callbacks]) callback(registry.point);
    return false;
  });
  const move = (event: PointerEvent) => {
    registry.point = { x: event.clientX, y: event.clientY, pointerType: event.pointerType };
    frame.wake();
  };
  // A touch has no position once lifted.
  const up = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') return;
    registry.point = null;
    frame.wake();
  };
  const out = (event: PointerEvent) => {
    if (event.relatedTarget !== null) return;
    registry.point = null;
    frame.wake();
  };
  // Content moved under a still pointer (or a fixed light point); subscribers measure again.
  const scroll = () => frame.wake();
  const capture = { capture: true, passive: true };
  document.addEventListener('pointermove', move, capture);
  document.addEventListener('pointerdown', move, capture);
  document.addEventListener('pointerup', up, capture);
  document.addEventListener('pointercancel', up, capture);
  document.addEventListener('pointerout', out, capture);
  document.addEventListener('scroll', scroll, capture);
  registry.frame = frame;
  registry.release = () => {
    frame.release();
    document.removeEventListener('pointermove', move, capture);
    document.removeEventListener('pointerdown', move, capture);
    document.removeEventListener('pointerup', up, capture);
    document.removeEventListener('pointercancel', up, capture);
    document.removeEventListener('pointerout', out, capture);
    document.removeEventListener('scroll', scroll, capture);
  };
}

/**
 * Observes the pointer position of a document through one set of capture listeners shared by
 * every subscriber, installed only while there are subscribers. Callbacks run at most once per
 * animation frame on the shared frame loop, with the latest point in client coordinates or `null`
 * once the pointer left the document (or before it entered), and again after any scrolling. A new
 * subscriber receives the last known point on the next frame.
 */
export function observePointerPosition(
  document: Document,
  callback: PointerPositionCallback,
): () => void {
  let registry = registries.get(document);
  if (!registry) {
    registry = { callbacks: new Set(), point: null, frame: null, release: null };
    registries.set(document, registry);
  }
  const current = registry;
  current.callbacks.add(callback);
  if (!current.release) install(document, current);
  if (current.point) current.frame?.wake();
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    current.callbacks.delete(callback);
    if (current.callbacks.size) return;
    current.release?.();
    current.release = null;
    current.frame = null;
  };
}
