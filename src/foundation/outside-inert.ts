import { composedContains } from './focus.js';

interface InertLease {
  inside: () => readonly HTMLElement[];
}
interface InertState {
  leases: InertLease[];
  applied: Map<HTMLElement, string | null>;
  observer: MutationObserver;
  update: () => void;
}
const documents = new WeakMap<Document, InertState>();

/** One owner-document stack. Only the innermost live modal defines the active branch. */
export function acquireOutsideInert(
  document: Document,
  inside: () => readonly HTMLElement[],
): () => void {
  const view = document.defaultView;
  if (!view || !document.body) return () => {};
  let state = documents.get(document);
  if (!state) {
    const created: InertState = {
      leases: [],
      applied: new Map(),
      observer: new view.MutationObserver(() => created.update()),
      update: () => {
        created.observer.disconnect();
        for (const [element, previous] of created.applied) {
          if (element.getAttribute('inert') !== '') continue;
          if (previous === null) element.removeAttribute('inert');
          else element.setAttribute('inert', previous);
        }
        created.applied.clear();
        const observedRoots = new Set<ParentNode>([document.body]);
        const allowed =
          created.leases
            .at(-1)
            ?.inside()
            .filter((element) => element.isConnected) ?? [];
        const visit = (parent: ParentNode): void => {
          for (const element of parent.children) {
            if (!(element instanceof view.HTMLElement)) continue;
            if (allowed.some((root) => root === element || composedContains(root, element)))
              continue;
            if (allowed.some((root) => composedContains(element, root))) {
              visit(element);
              if (element.shadowRoot) {
                observedRoots.add(element.shadowRoot);
                visit(element.shadowRoot);
              }
            } else if (!element.inert) {
              created.applied.set(element, element.getAttribute('inert'));
              element.inert = true;
            }
          }
        };
        if (allowed.length) visit(document.body);
        if (created.leases.length)
          for (const root of observedRoots)
            created.observer.observe(root, {
              childList: true,
              subtree: true,
              attributes: true,
              attributeFilter: ['inert'],
            });
      },
    };
    state = created;
    documents.set(document, state);
  }
  const lease = { inside };
  state.leases.push(lease);
  state.update();
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
