import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { composedContains } from './focus.js';

type Host = HTMLElement & ReactiveControllerHost;
interface DismissOptions {
  open: () => boolean;
  anchor?: () => HTMLElement | null;
  outside: () => boolean;
  escape: () => boolean;
  topmostOnly?: boolean;
  dismiss: (event: Event) => void;
}
const stacks = new WeakMap<Document, FloatingDismissController[]>();

/** Shared open-lifetime ownership, including property-driven opens and nested hosts. */
export class FloatingDismissController implements ReactiveController {
  #document: Document | undefined;
  constructor(
    private host: Host,
    private options: DismissOptions,
  ) {
    host.addController(this);
  }
  hostUpdated(): void {
    if (!this.options.open() || !this.host.isConnected) {
      this.hostDisconnected();
      return;
    }
    if (this.#document === this.host.ownerDocument) return;
    this.hostDisconnected();
    this.#document = this.host.ownerDocument;
    const stack = stacks.get(this.#document) ?? [];
    stack.push(this);
    stacks.set(this.#document, stack);
    this.#document.addEventListener('pointerdown', this.#pointer, true);
    this.#document.addEventListener('keydown', this.#key);
  }
  hostDisconnected(): void {
    if (!this.#document) return;
    const stack = stacks.get(this.#document);
    if (stack) {
      const index = stack.indexOf(this);
      if (index >= 0) stack.splice(index, 1);
    }
    this.#document.removeEventListener('pointerdown', this.#pointer, true);
    this.#document.removeEventListener('keydown', this.#key);
    this.#document = undefined;
  }
  get isTopmost(): boolean {
    return (
      (stacks.get(this.host.ownerDocument) ?? []).filter((item) => item.options.open()).at(-1) ===
      this
    );
  }
  #contains(path: EventTarget[]): boolean {
    if (path.includes(this.host) || path.includes(this.options.anchor?.() as EventTarget))
      return true;
    // A nested popup can be anchored inside this branch while rendered elsewhere.
    return (stacks.get(this.host.ownerDocument) ?? []).some(
      (child) =>
        child !== this &&
        composedContains(this.host, child.options.anchor?.() ?? child.host) &&
        (path.includes(child.host) || path.includes(child.options.anchor?.() as EventTarget)),
    );
  }
  #pointer = (event: PointerEvent): void => {
    if (
      !event.defaultPrevented &&
      this.options.open() &&
      (!this.options.topmostOnly || this.isTopmost) &&
      this.options.outside() &&
      !this.#contains(event.composedPath())
    )
      this.options.dismiss(event);
  };
  #key = (event: KeyboardEvent): void => {
    if (
      event.defaultPrevented ||
      event.key !== 'Escape' ||
      !this.options.open() ||
      !this.options.escape()
    )
      return;
    const eligible = (stacks.get(this.host.ownerDocument) ?? []).filter((item) =>
      item.options.open(),
    );
    if (eligible.at(-1) !== this) return;
    event.preventDefault();
    this.options.dismiss(event);
  };
}
