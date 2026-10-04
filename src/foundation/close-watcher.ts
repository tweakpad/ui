import type { ReactiveController, ReactiveControllerHost } from 'lit';
interface Watcher extends EventTarget {
  destroy(): void;
}
/** Browser back/close requests join the same cancelable surface proposal as Escape. */
export class CloseWatcherController implements ReactiveController {
  #watcher: Watcher | undefined;
  constructor(
    private host: HTMLElement & ReactiveControllerHost,
    private options: { enabled(): boolean; allowed(): boolean; close(event: Event): void },
  ) {
    host.addController(this);
  }
  hostUpdated(): void {
    if (!this.host.isConnected || !this.options.enabled()) {
      this.hostDisconnected();
      return;
    }
    if (this.#watcher) return;
    const Constructor = (
      this.host.ownerDocument.defaultView as (Window & { CloseWatcher?: new () => Watcher }) | null
    )?.CloseWatcher;
    if (!Constructor) return;
    const watcher = new Constructor();
    this.#watcher = watcher;
    watcher.addEventListener('cancel', (event) => {
      if (!this.options.allowed()) event.preventDefault();
    });
    watcher.addEventListener('close', (event) => {
      watcher.destroy();
      if (this.#watcher === watcher) this.#watcher = undefined;
      if (this.options.enabled() && this.options.allowed()) this.options.close(event);
      this.host.requestUpdate();
    });
  }
  hostDisconnected(): void {
    this.#watcher?.destroy();
    this.#watcher = undefined;
  }
}
