import { CleanupScope } from '../../foundation/services.js';
import { ToastManager } from './manager.js';
import type { ToastProviderOptions } from './types.js';

/** Elementless policy/environment service; all notifications delegate to the same manager. */
export class ToastProvider {
  readonly manager: ToastManager;
  #scope: CleanupScope | null = null;
  constructor(options: ToastProviderOptions & { toastManager?: ToastManager } = {}) {
    this.manager = options.toastManager ?? new ToastManager(options);
    this.manager.configure(options);
  }
  connect(document: Document): void {
    if (this.#scope) return;
    this.manager.reconnect();
    const view = document.defaultView;
    if (!view) return;
    const scope = (this.#scope = new CleanupScope());
    this.manager.configure({
      clock: {
        now: () => Date.now(),
        setTimeout: (callback, duration) => view.setTimeout(callback, duration),
        clearTimeout: (handle) => view.clearTimeout(handle),
      },
    });
    scope.listen(view, 'blur', (event) => {
      if (event.target === view) this.manager.pause('window');
    });
    scope.listen(view, 'focus', (event) => {
      if (event.target === view) this.manager.resume('window');
    });
    if (!document.hasFocus()) this.manager.pause('window');
  }
  configure(options: ToastProviderOptions): void {
    this.manager.configure(options);
  }
  destroy(): void {
    this.#scope?.dispose();
    this.#scope = null;
    this.manager.destroy();
  }
}
