import type { DragDropManager } from './manager.js';
import type { DragEvent, DragEventName, DragListener } from './types.js';

export class DragDropMonitor {
  readonly #listeners = new Map<DragEventName, Set<DragListener>>();
  constructor(readonly manager: DragDropManager) {}
  addEventListener(name: DragEventName, handler: DragListener): () => void {
    let listeners = this.#listeners.get(name);
    if (!listeners) this.#listeners.set(name, (listeners = new Set()));
    listeners.add(handler);
    return () => this.removeEventListener(name, handler);
  }
  removeEventListener(name: DragEventName, handler: DragListener): void {
    this.#listeners.get(name)?.delete(handler);
  }
  dispatch(name: DragEventName, event: DragEvent): void {
    for (const listener of [...(this.#listeners.get(name) ?? [])]) listener(event, this.manager);
  }
  clear(): void {
    this.#listeners.clear();
  }
}
