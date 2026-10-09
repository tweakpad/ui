import { Emitter } from '../store.js';
import type { DragDropManager } from './manager.js';
import type { DragEvent, DragEventName, DragListener } from './types.js';

export class DragDropMonitor {
  readonly #events = new Emitter<Record<DragEventName, [DragEvent, DragDropManager]>>();
  constructor(readonly manager: DragDropManager) {}
  addEventListener(name: DragEventName, handler: DragListener): () => void {
    return this.#events.on(name, handler);
  }
  removeEventListener(name: DragEventName, handler: DragListener): void {
    this.#events.off(name, handler);
  }
  dispatch(name: DragEventName, event: DragEvent): void {
    this.#events.emit(name, event, this.manager);
  }
  clear(): void {
    this.#events.clear();
  }
}
