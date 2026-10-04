import { directPortalOwner } from './portal-ownership.js';

export interface ContentSecurityOptions {
  nonce?: string | undefined;
  disableStyleElements?: boolean | undefined;
}
export type ContentSecurityScope = Document | HTMLElement | ShadowRoot;
const providers = new WeakMap<Node, ContentSecurityService[]>();
const subscribers = new WeakMap<Document, Set<() => void>>();

/** Document or composed-subtree policy; the nearest service replaces outer policy. */
export class ContentSecurityService {
  #options: ContentSecurityOptions;
  #disposed = false;
  constructor(
    readonly scope: ContentSecurityScope,
    options: ContentSecurityOptions = {},
  ) {
    this.#options = { ...options };
    const stack = providers.get(scope) ?? [];
    stack.push(this);
    providers.set(scope, stack);
    this.#notify();
  }
  get options(): Readonly<ContentSecurityOptions> {
    return { ...this.#options };
  }
  /** Replace this scope's policy. Omitted properties return to their defaults. */
  update(options: ContentSecurityOptions): void {
    if (this.#disposed) return;
    this.#options = { ...options };
    this.#notify();
  }
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    const stack = providers.get(this.scope);
    if (stack) {
      stack.splice(stack.indexOf(this), 1);
      if (!stack.length) providers.delete(this.scope);
    }
    this.#notify();
  }
  #notify(): void {
    const document =
      this.scope.nodeType === 9 ? (this.scope as Document) : this.scope.ownerDocument!;
    for (const notify of [...(subscribers.get(document) ?? [])]) notify();
  }
}

export function contentSecurityPolicy(owner: HTMLElement): Readonly<ContentSecurityOptions> {
  const visited = new Set<Node>();
  for (let node: Node | null = owner; node && !visited.has(node);) {
    visited.add(node);
    const service = providers.get(node)?.at(-1);
    if (service) return service.options;
    node =
      directPortalOwner(node) ??
      (node as Element).assignedSlot ??
      node.parentNode ??
      ('host' in node ? (node as ShadowRoot).host : null);
  }
  // A disconnected element still belongs to its document's security policy.
  const documentService = providers.get(owner.ownerDocument)?.at(-1);
  if (documentService) return documentService.options;
  return {
    nonce: (owner.ownerDocument.defaultView as (Window & { litNonce?: string }) | null)?.litNonce,
  };
}

export function subscribeContentSecurity(owner: HTMLElement, callback: () => void): () => void {
  const document = owner.ownerDocument;
  let listeners = subscribers.get(document);
  if (!listeners) subscribers.set(document, (listeners = new Set()));
  listeners.add(callback);
  return () => listeners.delete(callback);
}
