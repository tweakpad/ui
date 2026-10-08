import { GeneratedStyleResource } from '../generated-style.js';

/**
 * Light-tree styles shared by every instance in one root (the document or a shadow root):
 * pieces live in the light tree, so their structure cannot come from a shadow stylesheet. One
 * generated style resource per root and text, reference counted.
 */
const resources = new WeakMap<
  Node,
  Map<string, { resource: GeneratedStyleResource; users: number }>
>();

export function acquireRootStyles(owner: HTMLElement, css: string): () => void {
  const node = owner.getRootNode();
  const root = (node.nodeType === 11 ? node : owner.ownerDocument) as Document | ShadowRoot;
  let byText = resources.get(root);
  if (!byText) resources.set(root, (byText = new Map()));
  let entry = byText.get(css);
  if (!entry) {
    const resource = new GeneratedStyleResource(owner, root);
    resource.setText(css);
    byText.set(css, (entry = { resource, users: 0 }));
  }
  entry.users++;
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    if (--entry.users > 0) return;
    entry.resource.dispose();
    byText.delete(css);
  };
}
