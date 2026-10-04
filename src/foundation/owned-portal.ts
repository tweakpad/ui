import { render, nothing } from 'lit';
import type { CSSResultGroup } from 'lit';
import { getCompatibleStyle } from '@lit/reactive-element/css-tag.js';
import { setLogicalPortalOwner } from './portal-ownership.js';
import { GeneratedStyleResource } from './generated-style.js';
export { logicalPortalOwner } from './portal-ownership.js';

export type OwnedPortalContainer =
  | HTMLElement
  | ShadowRoot
  | { current: HTMLElement | ShadowRoot | null }
  | (() => HTMLElement | ShadowRoot | null)
  | null;
export interface OwnedPortalOptions {
  projectedNodes?: readonly Node[];
  identifier?: string;
  /** Explicit Foundation projection from another parent, with an owned return marker. */
  externalProjection?: boolean;
  /** Connected same-origin document targets; the default remains the owner document. */
  allowSameOriginDocument?: boolean;
}
const namedContainers = new WeakMap<HTMLElement, number>();
/** An owned Lit root preserves actual part bindings when a consumer selects a portal. */
export class OwnedPortal {
  #host: HTMLElement | null = null;
  #styleResource: GeneratedStyleResource | undefined;
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
  #project(nodes: readonly Node[], external = false): void {
    this.#pruneProjection();
    const wanted = new Set(nodes);
    for (const node of this.#projected.keys()) if (!wanted.has(node)) this.#restoreNode(node);
    for (const node of nodes) {
      if (
        this.#projected.has(node) ||
        !node.parentNode ||
        (!external && node.parentNode !== this.owner)
      )
        continue;
      const marker = this.owner.ownerDocument.createComment('tp-portal-projection');
      node.parentNode.replaceChild(marker, node);
      this.#projected.set(node, marker);
      this.#host!.append(node);
    }
  }
  /** Relocate an externally projected node's owned return marker after layout movement. */
  relocateProjection(node: Node, before: Node): void {
    const marker = this.#projected.get(node);
    if (marker && before.parentNode && node.parentNode === this.#host)
      before.parentNode.insertBefore(marker, before);
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
    let compatibleDocument = target?.ownerDocument === this.owner.ownerDocument;
    if (target && options.allowSameOriginDocument && !compatibleDocument) {
      try {
        const targetView = target.ownerDocument.defaultView,
          ownerView = this.owner.ownerDocument.defaultView;
        const accessibleRoot = (view: Window | null): Window | null => {
          try {
            while (view?.parent && view.parent !== view) {
              void view.parent.document;
              view = view.parent;
            }
          } catch {
            /* Protected boundary. */
          }
          return view;
        };
        compatibleDocument =
          !!target.isConnected &&
          !!ownerView &&
          !!targetView &&
          (accessibleRoot(ownerView) === accessibleRoot(targetView) ||
            (ownerView.location.origin !== 'null' &&
              targetView.location.origin === ownerView.location.origin));
      } catch {
        compatibleDocument = false;
      }
    }
    if (!target || !compatibleDocument) {
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
      this.#host = target.ownerDocument.createElement('div');
      this.#host.setAttribute(`data-${this.owner.localName.replace(/^tp-/, '')}-portal`, '');
      setLogicalPortalOwner(this.#host, this.owner);
      const root = this.#host.attachShadow({ mode: 'open' });
      const cssText = (result: CSSResultGroup): string => {
        if (Array.isArray(result)) return result.map(cssText).join('\n');
        const compatible = getCompatibleStyle(result);
        return 'cssText' in compatible
          ? compatible.cssText
          : [...compatible.cssRules].map((rule) => rule.cssText).join('\n');
      };
      this.#styleResource = new GeneratedStyleResource(this.owner, root);
      this.#styleResource.setText(cssText(this.styles));
      target.append(this.#host);
    }
    if (options.projectedNodes) this.#project(options.projectedNodes, options.externalProjection);
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
    if (this.#host) setLogicalPortalOwner(this.#host, null);
    this.#styleResource?.dispose();
    this.#styleResource = undefined;
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
