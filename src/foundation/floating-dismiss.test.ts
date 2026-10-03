import { describe, expect, it, vi } from 'vitest';
import { FloatingDismissController } from './floating-dismiss.js';
import type { ReactiveControllerHost } from 'lit';

class NodeStub extends EventTarget {
  nodeType = 1;
  parentNode: NodeStub | null = null;
  isConnected = true;
  constructor(readonly ownerDocument: Document) {
    super();
  }
  addController = vi.fn();
  append(child: NodeStub): void {
    child.parentNode = this;
  }
}
function setup() {
  const document = new EventTarget() as Document;
  const body = new NodeStub(document);
  const create = () => {
    const node = new NodeStub(document);
    body.append(node);
    return node;
  };
  const controls: FloatingDismissController[] = [];
  const mount = (host: NodeStub, anchor: NodeStub, popup: NodeStub) => {
    let open = true;
    const dismissed = vi.fn();
    const controller = new FloatingDismissController(
      host as unknown as HTMLElement & ReactiveControllerHost,
      {
        open: () => open,
        anchor: () => anchor as unknown as HTMLElement,
        insideElements: () => [popup as unknown as Element],
        outside: () => true,
        escape: () => true,
        topmostOnly: true,
        dismiss: dismissed,
      },
    );
    controller.hostUpdated();
    controls.push(controller);
    return {
      controller,
      dismissed,
      close: () => {
        open = false;
        controller.hostUpdated();
      },
    };
  };
  return {
    document,
    create,
    mount,
    cleanup: () => controls.forEach((controller) => controller.hostDisconnected()),
  };
}
describe('floating branch ownership', () => {
  it('shares portaled descendants with dismissal and inert without admitting unrelated layers', () => {
    const f = setup();
    try {
      const host = f.create(),
        anchor = f.create(),
        popup = f.create();
      const childHost = f.create(),
        childAnchor = f.create(),
        childPopup = f.create();
      popup.append(childAnchor);
      const grandHost = f.create(),
        grandAnchor = f.create(),
        grandPopup = f.create();
      childPopup.append(grandAnchor);
      const unrelatedHost = f.create(),
        unrelatedAnchor = f.create(),
        unrelatedPopup = f.create();
      const parent = f.mount(host, anchor, popup);
      const child = f.mount(childHost, childAnchor, childPopup);
      f.mount(grandHost, grandAnchor, grandPopup);
      f.mount(unrelatedHost, unrelatedAnchor, unrelatedPopup);
      expect(parent.controller.branchElements).toEqual(
        expect.arrayContaining([host, anchor, popup, childHost, childPopup, grandPopup]),
      );
      expect(parent.controller.branchElements).not.toContain(unrelatedPopup);
      expect(parent.controller.contains(grandPopup as unknown as Node)).toBe(true);
      expect(parent.controller.contains(unrelatedPopup as unknown as Node)).toBe(false);
      child.close();
      expect(parent.controller.branchElements).not.toContain(childPopup);
      expect(parent.controller.branchElements).not.toContain(grandPopup);
    } finally {
      f.cleanup();
    }
  });
  it('keeps a child press inside its parent and cleans the owner document listeners', () => {
    const f = setup();
    try {
      const host = f.create(),
        anchor = f.create(),
        popup = f.create();
      const childHost = f.create(),
        childAnchor = f.create(),
        childPopup = f.create();
      popup.append(childAnchor);
      const parent = f.mount(host, anchor, popup),
        child = f.mount(childHost, childAnchor, childPopup);
      const event = new Event('pointerdown');
      Object.defineProperty(event, 'composedPath', { value: () => [childPopup] });
      f.document.dispatchEvent(event);
      expect(parent.dismissed).not.toHaveBeenCalled();
      expect(child.dismissed).not.toHaveBeenCalled();
      child.close();
      const outside = new Event('pointerdown');
      Object.defineProperty(outside, 'composedPath', { value: () => [f.create()] });
      f.document.dispatchEvent(outside);
      expect(parent.dismissed).toHaveBeenCalledOnce();
      expect(child.dismissed).not.toHaveBeenCalled();
      f.cleanup();
      f.document.dispatchEvent(outside);
      expect(parent.dismissed).toHaveBeenCalledOnce();
    } finally {
      f.cleanup();
    }
  });
});
