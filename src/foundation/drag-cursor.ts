/**
 * The cursor of a pointer drag over the whole document, for the pointer sensor of drag and drop
 * and the resize separator. A declaration on the root element, or a rule that matches every
 * element, restyles every element of the document at both ends of a drag. Instead, one transparent
 * element in the top layer covers the viewport and carries the cursor while a drag runs: the
 * browser shows the cursor of the element under the pointer, and only that element is styled. The
 * drag keeps its pointer captured by its own element, so its events keep their target; a hit test
 * for the content under the pointer during a drag reads through it (`elementFromPointBelow`).
 */

interface CursorLayer {
  readonly element: HTMLElement;
  /** The cursor of each live lease, in lease order; the latest one shows. */
  readonly leases: Map<object, string>;
}

const layers = new WeakMap<Document, CursorLayer>();

/** Covers the viewport and takes the pointer, with no box, paint or semantics of its own. */
const DECLARATIONS: Readonly<Record<string, string>> = {
  position: 'fixed',
  inset: '0',
  width: 'auto',
  height: 'auto',
  'max-width': 'none',
  'max-height': 'none',
  margin: '0',
  padding: '0',
  border: '0',
  outline: 'none',
  background: 'transparent',
  overflow: 'hidden',
  contain: 'strict',
  'pointer-events': 'auto',
  'user-select': 'none',
  'z-index': '2147483647',
};

function createLayer(document: Document): CursorLayer {
  const element = document.createElement('div');
  element.setAttribute('aria-hidden', 'true');
  element.setAttribute('data-drag-cursor', '');
  // Written through the style object: a policy that blocks `style` attributes allows these.
  for (const [property, value] of Object.entries(DECLARATIONS))
    element.style.setProperty(property, value, 'important');
  if ('showPopover' in element) element.setAttribute('popover', 'manual');
  return { element, leases: new Map() };
}

function show(layer: CursorLayer, document: Document): void {
  const { element } = layer;
  const cursor = [...layer.leases.values()].at(-1) ?? 'auto';
  element.style.setProperty('cursor', cursor, 'important');
  if (element.isConnected) return;
  (document.body ?? document.documentElement).append(element);
  try {
    if (element.hasAttribute('popover') && !element.matches(':popover-open')) element.showPopover();
  } catch {
    // Without the top layer, the layer still covers the page from its stacking position.
  }
}

function hide(layer: CursorLayer): void {
  const { element } = layer;
  try {
    if (element.hasAttribute('popover') && element.matches(':popover-open')) element.hidePopover();
  } catch {
    // The element already left the top layer.
  }
  element.remove();
}

/**
 * Shows `cursor` over the whole document of `document` until the returned function runs; the
 * latest live lease's cursor shows.
 */
export function leaseDragCursor(document: Document, cursor: string): () => void {
  let layer = layers.get(document);
  if (!layer) layers.set(document, (layer = createLayer(document)));
  const token = {};
  layer.leases.set(token, cursor);
  show(layer, document);
  return () => {
    if (!layer.leases.delete(token)) return;
    if (layer.leases.size) show(layer, document);
    else hide(layer);
  };
}

/**
 * The element under a client point of `root` (a document or a shadow root), read through the drag
 * cursor's layer while a drag shows it.
 */
export function elementFromPointBelow(
  root: DocumentOrShadowRoot,
  x: number,
  y: number,
): Element | null {
  const document =
    (root as Partial<Document>).nodeType === 9
      ? (root as Document)
      : (root as ShadowRoot).host?.ownerDocument;
  const layer = document ? layers.get(document)?.element : undefined;
  if (!layer?.isConnected) return root.elementFromPoint(x, y);
  return root.elementsFromPoint(x, y).find((element) => element !== layer) ?? null;
}
