import { render, nothing } from 'lit';
import type { CSSResultGroup } from 'lit';
import { getCompatibleStyle } from '@lit/reactive-element/css-tag.js';
import { composedParent } from './focus.js';

export type OwnedPortalContainer =
  | HTMLElement
  | ShadowRoot
  | { current: HTMLElement | ShadowRoot | null }
  | (() => HTMLElement | ShadowRoot | null)
  | null;
export interface OwnedPortalOptions {
  projectedNodes?: readonly Node[];
  identifier?: string;
}
const namedContainers = new WeakMap<HTMLElement, number>();
const owners = new WeakMap<Node, HTMLElement>();
/** The logical owner of a physically relocated composed subtree. */
export function logicalPortalOwner(node: Node | null): HTMLElement | null {
  for (let current = node; current; current = composedParent(current)) {
    const owner = owners.get(current);
    if (owner) return owner;
  }
  return null;
}

/** An owned Lit root preserves actual part bindings when a consumer selects a portal. */
export class OwnedPortal {
  #host: HTMLElement | null = null;
  #container: HTMLElement | ShadowRoot | null = null;
  #tokens = new Set<string>();
  #projected = new Map<Node, Comment>();
  #namedContainer: HTMLElement | null = null;
  constructor(
    private owner: HTMLElement,
    private styles: CSSResultGroup,
  ) {}
  get host(): HTMLElement | null {
    return this.#host;
  }
  get root(): ShadowRoot | null {
    return this.#host?.shadowRoot ?? null;
  }
  /** Original direct children, including nodes currently projected into the portal. */
  get ownedChildren(): readonly Node[] {
    this.#pruneProjection();
    const byMarker = new Map([...this.#projected].map(([node, marker]) => [marker, node]));
    return [...this.owner.childNodes].map((node) => byMarker.get(node as Comment) ?? node);
  }
  get projectedNodes(): readonly Node[] {
    this.#pruneProjection();
    return [...this.#projected.keys()];
  }
  #pruneProjection(): void {
    for (const [node, marker] of this.#projected) {
      if (node.parentNode !== this.#host) {
        marker.remove();
        this.#projected.delete(node);
      }
    }
  }
  #restoreNode(node: Node): void {
    const marker = this.#projected.get(node);
    if (!marker) return;
    if (node.parentNode === this.#host && marker.parentNode)
      marker.parentNode.replaceChild(node, marker);
    else marker.remove();
    this.#projected.delete(node);
  }
  #project(nodes: readonly Node[]): void {
    this.#pruneProjection();
    const wanted = new Set(nodes);
    for (const node of this.#projected.keys()) if (!wanted.has(node)) this.#restoreNode(node);
    for (const node of nodes) {
      if (this.#projected.has(node) || node.parentNode !== this.owner) continue;
      const marker = this.owner.ownerDocument.createComment('tp-portal-projection');
      this.owner.replaceChild(marker, node);
      this.#projected.set(node, marker);
      this.#host!.append(node);
    }
  }
  update(
    container: OwnedPortalContainer,
    content: unknown,
    options: OwnedPortalOptions = {},
  ): boolean {
    let target =
      typeof container === 'function'
        ? container()
        : container && 'current' in container
          ? container.current
          : container;
    const parent = target;
    if (options.identifier && (!target || target.ownerDocument === this.owner.ownerDocument)) {
      const existing = this.owner.ownerDocument.getElementById(options.identifier);
      if (existing) target = existing;
      else {
        const named = this.owner.ownerDocument.createElement('div');
        named.id = options.identifier;
        (parent ?? this.owner.ownerDocument.body).append(named);
        namedContainers.set(named, 0);
        target = named;
      }
    }
    if (!target || target.ownerDocument !== this.owner.ownerDocument) {
      this.clear();
      return false;
    }
    if (target !== this.#container) {
      this.clear();
      this.#container = target;
      if (target.nodeType === 1 && namedContainers.has(target as HTMLElement)) {
        this.#namedContainer = target as HTMLElement;
        namedContainers.set(this.#namedContainer, namedContainers.get(this.#namedContainer)! + 1);
      }
      this.#host = this.owner.ownerDocument.createElement('div');
      this.#host.setAttribute(`data-${this.owner.localName.replace(/^tp-/, '')}-portal`, '');
      owners.set(this.#host, this.owner);
      const root = this.#host.attachShadow({ mode: 'open' });
      const appendStyles = (result: CSSResultGroup): void => {
        if (Array.isArray(result)) {
          for (const child of result) appendStyles(child);
          return;
        }
        const style = this.owner.ownerDocument.createElement('style');
        const compatible = getCompatibleStyle(result);
        style.textContent =
          'cssText' in compatible
            ? compatible.cssText
            : [...compatible.cssRules].map((rule) => rule.cssText).join('\n');
        root.append(style);
      };
      appendStyles(this.styles);
      target.append(this.#host);
    }
    if (options.projectedNodes) this.#project(options.projectedNodes);
    const computed = this.owner.ownerDocument.defaultView!.getComputedStyle(this.owner);
    const nextTokens = new Set<string>();
    for (let index = 0; index < computed.length; index++) {
      const name = computed[index]!;
      if (name.startsWith('--tp-')) {
        nextTokens.add(name);
        this.#host!.style.setProperty(name, computed.getPropertyValue(name));
      }
    }
    for (const name of this.#tokens)
      if (!nextTokens.has(name)) this.#host!.style.removeProperty(name);
    this.#tokens = nextTokens;
    this.#host!.style.colorScheme = computed.colorScheme;
    this.#host!.dir = computed.direction;
    render(content, this.root!, { host: this.owner });
    return true;
  }
  clear(): void {
    for (const node of [...this.#projected.keys()]) this.#restoreNode(node);
    if (this.#host) owners.delete(this.#host);
    if (this.root) render(nothing, this.root);
    this.#host?.remove();
    if (this.#namedContainer) {
      const remaining = (namedContainers.get(this.#namedContainer) ?? 1) - 1;
      if (remaining === 0 && !this.#namedContainer.childNodes.length) {
        namedContainers.delete(this.#namedContainer);
        this.#namedContainer.remove();
      } else namedContainers.set(this.#namedContainer, remaining);
      this.#namedContainer = null;
    }
    this.#host = null;
    this.#container = null;
    this.#tokens.clear();
  }
}
