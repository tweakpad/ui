import { composedContains, composedScopeContains } from './focus.js';

/** The boundary a lease isolates: the owner document body, an element, or a shadow root. */
export type OutsideInertScope = HTMLElement | ShadowRoot;
export interface OutsideInertOptions {
  /**
   * Only descendants of this boundary become inert; content outside it stays interactive.
   * Defaults to the owner document body (document modality).
   */
  scope?: OutsideInertScope | null;
}
interface InertLease {
  inside: () => readonly HTMLElement[];
  scope: OutsideInertScope | null;
}
interface InertState {
  leases: InertLease[];
  applied: Map<HTMLElement, string | null>;
  /** Nodes inserted since the last lease acquisition or refresh; they and their subtrees stay out. */
  late: WeakSet<Node>;
  observer: MutationObserver;
  update: (snapshot?: boolean) => void;
}
const documents = new WeakMap<Document, InertState>();

/**
 * Whether an element is inert only because a modal lease isolated it: a layer above it holds
 * interaction for now. Inertness the author set before the lease is not lease inertness.
 */
export function isLeaseInert(element: HTMLElement): boolean {
  const applied = documents.get(element.ownerDocument)?.applied;
  return !!applied?.has(element) && applied.get(element) === null;
}

/** Refresh newly mounted branch portals before synchronous focus placement. */
export function refreshOutsideInert(document: Document): void {
  documents.get(document)?.update(true);
}

function scopeConnected(scope: OutsideInertScope): boolean {
  return scope.nodeType === 11 ? (scope as ShadowRoot).host.isConnected : scope.isConnected;
}

/**
 * One owner-document stack of modal leases. A lease isolates its scope: every element inside
 * the scope that is not on the path to an allowed branch becomes inert.
 *
 * A newer lease supersedes every older lease whose scope it contains (the innermost live modal
 * of one boundary defines its active branch; a document lease supersedes all older leases).
 * Older leases with a disjoint or enclosing scope stay effective, and the branches of every
 * newer lease are exempt from them, so a later modal is never made inert by an earlier one.
 * Live regions anywhere in the document remain available.
 *
 * As with Base UI `markOthers`, only outside elements present when a lease is acquired or
 * refreshed become inert. Elements inserted later by another owner stay interactive, so a
 * password manager or extension overlay appended to the body while a modal is open remains
 * usable; the observer still keeps branches, live regions and restoration current.
 */
export function acquireOutsideInert(
  document: Document,
  inside: () => readonly HTMLElement[],
  options: OutsideInertOptions = {},
): () => void {
  const view = document.defaultView;
  if (!view || !document.body) return () => {};
  let state = documents.get(document);
  if (!state) {
    const markLate = (records: readonly MutationRecord[]): void => {
      for (const record of records)
        if (record.type === 'childList')
          for (const node of record.addedNodes) created.late.add(node);
    };
    const created: InertState = {
      leases: [],
      applied: new Map(),
      late: new WeakSet(),
      observer: new view.MutationObserver((records) => {
        markLate(records);
        created.update();
      }),
      update: (snapshot = false) => {
        markLate(created.observer.takeRecords());
        created.observer.disconnect();
        if (snapshot) created.late = new WeakSet();
        const desired = new Set<HTMLElement>();
        const observedRoots = new Set<ParentNode>([document.body]);
        const live: HTMLElement[] = [];
        // Live announcements remain available while surrounding interaction is
        // inert. Observe open shadow scopes too, including currently outside
        // branches, so later inserted or reconfigured live regions are preserved.
        const collectLive = (parent: ParentNode): void => {
          for (const element of parent.children) {
            if (element.namespaceURI !== 'http://www.w3.org/1999/xhtml') continue;
            const value = element.getAttribute('aria-live');
            const implicit = ['alert', 'status', 'log'].includes(
              element.getAttribute('role') ?? '',
            );
            if ((value !== null && value !== 'off') || (value === null && implicit))
              live.push(element as HTMLElement);
            collectLive(element);
            if (element.shadowRoot) {
              observedRoots.add(element.shadowRoot);
              collectLive(element.shadowRoot);
            }
          }
        };
        if (created.leases.length) collectLive(document.body);
        const visit = (
          parent: ParentNode,
          allowed: readonly HTMLElement[],
          lateParent = false,
        ): void => {
          for (const child of parent.children) {
            if (child.namespaceURI !== 'http://www.w3.org/1999/xhtml') continue;
            const element = child as HTMLElement;
            if (allowed.some((root) => root === element || composedContains(root, element)))
              continue;
            const late = lateParent || created.late.has(element);
            if (allowed.some((root) => composedContains(element, root))) {
              visit(element, allowed, late);
              if (element.shadowRoot) {
                observedRoots.add(element.shadowRoot);
                visit(element.shadowRoot, allowed, late);
              }
            } else if (created.applied.has(element) || (!element.inert && !late))
              desired.add(element);
          }
        };
        // Newest first: decide which leases remain effective and what each must exempt.
        const effective: OutsideInertScope[] = [];
        const newer: HTMLElement[] = [];
        for (let index = created.leases.length - 1; index >= 0; index--) {
          const lease = created.leases[index]!;
          const scope = lease.scope ?? document.body;
          const own = lease.inside().filter((element) => element.isConnected);
          const superseded = effective.some(
            (boundary) => boundary === scope || composedScopeContains(boundary, scope),
          );
          if (!superseded && scopeConnected(scope)) {
            effective.push(scope);
            const allowed = [...own, ...newer, ...live];
            if (allowed.length) {
              observedRoots.add(scope);
              visit(scope, allowed);
              const shadow = scope.nodeType === 1 ? (scope as HTMLElement).shadowRoot : null;
              if (shadow && scope !== document.body) {
                observedRoots.add(shadow);
                visit(shadow, allowed);
              }
            }
          }
          newer.push(...own);
        }
        // Apply only the difference. Restoring and reapplying unchanged inert
        // attributes wakes component observers and can create a render loop.
        for (const [element, previous] of created.applied) {
          if (desired.has(element)) continue;
          if (element.getAttribute('inert') === '') {
            if (previous === null) element.removeAttribute('inert');
            else element.setAttribute('inert', previous);
          }
          created.applied.delete(element);
        }
        for (const element of desired) {
          if (created.applied.has(element)) continue;
          created.applied.set(element, element.getAttribute('inert'));
          element.inert = true;
        }
        if (created.leases.length)
          for (const root of observedRoots)
            created.observer.observe(root, {
              childList: true,
              subtree: true,
              attributes: true,
              attributeFilter: ['inert', 'aria-live', 'role'],
            });
      },
    };
    state = created;
    documents.set(document, state);
  }
  const lease: InertLease = { inside, scope: options.scope ?? null };
  state.leases.push(lease);
  state.update(true);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    state.leases.splice(state.leases.indexOf(lease), 1);
    state.update();
    if (!state.leases.length) {
      state.observer.disconnect();
      documents.delete(document);
    }
  };
}
