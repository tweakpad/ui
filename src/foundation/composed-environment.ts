import { composedParent } from './focus.js';
import { themeTokens } from './generated-style.js';
import { POSITIONING_PROPERTIES } from './positioning-properties.js';
import { resolveLocale } from './services.js';

/**
 * Inline declarations that can change what the environment signature reads: the inherited
 * direction, writing mode and color scheme, and `all`; theme tokens are custom properties.
 */
const ENVIRONMENT_PROPERTIES: ReadonlySet<string> = new Set([
  'direction',
  'writing-mode',
  'color-scheme',
  'all',
]);

/** The declarations of a `style` attribute value, by property name. */
function declarations(text: string | null): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of (text ?? '').split(';')) {
    const colon = part.indexOf(':');
    if (colon < 0) continue;
    const raw = part.slice(0, colon).trim();
    // Custom property names are case-sensitive; the others are not.
    if (raw) map.set(raw.startsWith('--') ? raw : raw.toLowerCase(), part.slice(colon + 1).trim());
  }
  return map;
}

/** The property names whose declared value differs between two `style` attribute values. */
export function changedStyleProperties(previous: string | null, next: string | null): Set<string> {
  const before = declarations(previous);
  const after = declarations(next);
  const changed = new Set<string>();
  for (const [name, value] of before) if (after.get(name) !== value) changed.add(name);
  for (const name of after.keys()) if (!before.has(name)) changed.add(name);
  return changed;
}

/**
 * Whether an attribute mutation on the composed chain can change the environment: every observed
 * attribute can, except an inline `style` change that touches none of the environment's properties
 * (a drag that leases `user-select` and `cursor` on the root element, or a positioned surface
 * that moves: its placement and the geometry custom properties of `positionSurface`), which would
 * otherwise make every observer inside read computed styles at once.
 */
export function affectsEnvironment(
  record: Pick<MutationRecord, 'attributeName' | 'oldValue' | 'target'>,
): boolean {
  if (record.attributeName !== 'style') return true;
  const next = (record.target as Element).getAttribute?.('style') ?? null;
  for (const name of changedStyleProperties(record.oldValue, next))
    if (
      ENVIRONMENT_PROPERTIES.has(name) ||
      (name.startsWith('--') && !POSITIONING_PROPERTIES.has(name))
    )
      return true;
  return false;
}

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
    this.#observer = new view.MutationObserver((records) => {
      if (records.some(affectsEnvironment)) this.#check();
    });
    for (let node: Node | null = this.owner; node; node = composedParent(node)) {
      if (node.nodeType !== 1) continue;
      this.#observer.observe(node, {
        attributes: true,
        attributeOldValue: true,
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
    // A surface's geometry, which its descendants inherit, is not part of their environment.
    for (const name of POSITIONING_PROPERTIES) tokens.delete(name);
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
