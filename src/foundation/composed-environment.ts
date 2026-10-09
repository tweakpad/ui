import { composedParent } from './focus.js';
import { themeTokens } from './generated-style.js';
import { resolveLocale } from './services.js';

/** Observe a component's composed inheritance chain, not unrelated page mutations. */
export class ComposedEnvironmentObserver {
  #observer: MutationObserver | null = null;
  #slots: HTMLSlotElement[] = [];
  #media: MediaQueryList[] = [];
  #signature = '';
  constructor(
    private owner: HTMLElement,
    private changed: () => void,
  ) {}
  connect(): void {
    this.disconnect();
    const view = this.owner.ownerDocument.defaultView;
    if (!view) return;
    this.#observer = new view.MutationObserver(this.#check);
    for (let node: Node | null = this.owner; node; node = composedParent(node)) {
      if (node.nodeType !== 1) continue;
      this.#observer.observe(node, {
        attributes: true,
        attributeFilter: ['dir', 'lang', 'class', 'style', 'slot', 'data-theme'],
      });
      if ((node as Element).localName === 'slot') {
        const slot = node as HTMLSlotElement;
        slot.addEventListener('slotchange', this.#reconnect);
        this.#slots.push(slot);
      }
    }
    for (const query of ['(prefers-color-scheme: dark)', '(prefers-reduced-motion: reduce)']) {
      const media = view.matchMedia(query);
      media.addEventListener('change', this.#check);
      this.#media.push(media);
    }
    this.#signature = this.#read();
  }
  #read(): string {
    const style = this.owner.ownerDocument.defaultView!.getComputedStyle(this.owner);
    const tokens = themeTokens(style);
    return JSON.stringify([
      style.direction,
      style.writingMode,
      style.colorScheme,
      resolveLocale(this.owner),
      ...[...tokens.keys()].sort().map((key) => `${key}:${tokens.get(key)}`),
    ]);
  }
  #check = (): void => {
    if (!this.owner.isConnected) return;
    const next = this.#read();
    if (next === this.#signature) return;
    this.#signature = next;
    this.changed();
  };
  #reconnect = (): void => {
    this.connect();
    this.changed();
  };
  disconnect(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    for (const slot of this.#slots) slot.removeEventListener('slotchange', this.#reconnect);
    this.#slots = [];
    for (const media of this.#media) media.removeEventListener('change', this.#check);
    this.#media = [];
  }
}
