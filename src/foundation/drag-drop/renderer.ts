import type { Renderer } from './types.js';

export const immediateRenderer: Renderer = {
  get rendering() {
    return Promise.resolve();
  },
};

/** Reads hosts repeatedly because one Lit commit can enqueue another host/ref commit. */
export class LitDragDropRenderer implements Renderer {
  readonly #hosts = new Set<{ updateComplete: Promise<boolean> }>();
  add(host: { updateComplete: Promise<boolean> }): () => void {
    this.#hosts.add(host);
    return () => {
      this.#hosts.delete(host);
    };
  }
  get rendering(): Promise<void> {
    return this.#wait();
  }
  async #wait(): Promise<void> {
    for (let pass = 0; pass < 100; pass++) {
      const hosts = [...this.#hosts],
        promises = hosts.map((host) => host.updateComplete);
      const results = await Promise.all(promises);
      if (
        results.every(Boolean) &&
        hosts.length === this.#hosts.size &&
        hosts.every((host, i) => this.#hosts.has(host) && host.updateComplete === promises[i])
      )
        return;
    }
    throw new Error('Drag rendering did not reach a stable commit.');
  }
}
