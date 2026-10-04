import { composedParent } from '../focus.js';
const roots = new WeakSet<Node>();
export function markFeedbackRoot(root: Node): () => void {
  roots.add(root);
  return () => {
    roots.delete(root);
  };
}
export function isFeedbackElement(element: Element | null): boolean {
  for (let node: Node | null = element; node; node = composedParent(node))
    if (roots.has(node)) return true;
  return false;
}
