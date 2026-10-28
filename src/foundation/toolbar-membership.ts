/**
 * Toolbar membership: which controller owns a root, which controller an item is registered with,
 * and the elements waiting for a toolbar. `ToolbarController` writes it; the lookups below read it,
 * so a member such as the Toggle group finds its toolbar without loading the controller
 * (`uwg-te-toggle-group-req-toolbar`, `node-009977`). Internal; no entry re-exports it.
 */
import { composedParent } from './focus.js';
import type { ToolbarController } from './toolbar.js';

type Subscription = {
  readonly element: Element;
  readonly connect: (toolbar: ToolbarController) => (() => void) | void;
  owner: ToolbarController | undefined;
  cleanup: (() => void) | undefined;
};
/** The live controller of each root element. */
export const roots = new WeakMap<HTMLElement, ToolbarController>();
/** The controller each registered item belongs to. */
export const itemOwners = new WeakMap<HTMLElement, ToolbarController>();
const subscriptions = new Set<Subscription>();

/**
 * The nearest live controller whose root is `element` or one of its composed ancestors
 * (slots and open shadow roots included). The walk stops at a top-layer surface, an element
 * with a `popover` attribute or a `dialog`, unless that element is itself a controller's root,
 * so content of a popup or dialog anchored inside a toolbar is not part of it
 * (`uwg-te-toggle-group-req-toolbar`, `node-009977`).
 */
export function toolbarFor(element: Element): ToolbarController | undefined {
  for (let node: Node | null = element; node; node = composedParent(node)) {
    const toolbar = roots.get(node as HTMLElement);
    if (toolbar) return toolbar;
    if (
      node.nodeType === 1 &&
      ((node as Element).localName === 'dialog' || (node as Element).hasAttribute('popover'))
    )
      return undefined;
  }
  return undefined;
}

/** Runs consumer code; an error it throws surfaces in a microtask, after the caller's work. */
function isolated<T>(run: () => T): T | undefined {
  try {
    return run();
  } catch (error) {
    queueMicrotask(() => {
      throw error;
    });
    return undefined;
  }
}

function releaseSubscription(subscription: Subscription): void {
  const { cleanup } = subscription;
  subscription.owner = subscription.cleanup = undefined;
  if (cleanup) isolated(cleanup);
}

/** Moves a subscription to `toolbar` (or to none), running the previous cleanup first. */
function moveSubscription(
  subscription: Subscription,
  toolbar: ToolbarController | undefined,
): void {
  if (toolbar === subscription.owner) return;
  releaseSubscription(subscription);
  if (!toolbar) return;
  subscription.owner = toolbar;
  const cleanup = isolated(() => subscription.connect(toolbar));
  if (typeof cleanup !== 'function') return;
  // A connect that cancelled or moved its own subscription gets its cleanup back at once.
  if (subscriptions.has(subscription) && subscription.owner === toolbar)
    subscription.cleanup = cleanup;
  else isolated(cleanup);
}

/**
 * Connects `element` to the controller that `toolbarFor` reports: now, or when a controller
 * that contains it is created later, as the last step of that controller's constructor. `connect`
 * runs synchronously and may return a cleanup. The cleanup runs when that controller is
 * disposed (the element then connects to an outer controller or waits), when a nearer
 * controller is created around the element (it then connects there), or on cancel. An error
 * thrown by `connect` or a cleanup is rethrown in a microtask, so the controller and the other
 * subscriptions are unaffected. Returns the cancel, which is idempotent; call it when the element
 * disconnects (`uwg-te-toggle-group-req-toolbar`, `node-009977`, `node-010076`).
 */
export function whenToolbar(
  element: Element,
  connect: (toolbar: ToolbarController) => (() => void) | void,
): () => void {
  const subscription: Subscription = { element, connect, owner: undefined, cleanup: undefined };
  subscriptions.add(subscription);
  moveSubscription(subscription, toolbarFor(element));
  return () => {
    if (subscriptions.delete(subscription)) releaseSubscription(subscription);
  };
}

/** The controller that `element` is registered with as an item, if any. */
export function toolbarItemOwner(element: Element): ToolbarController | undefined {
  return itemOwners.get(element as HTMLElement);
}

/**
 * Connects the waiting elements whose nearest controller is now `toolbar`. The controller calls
 * it as the last step of its constructor, once every field is ready.
 */
export function connectToolbarMembers(toolbar: ToolbarController): void {
  for (const subscription of [...subscriptions])
    if (subscriptions.has(subscription) && toolbarFor(subscription.element) === toolbar)
      moveSubscription(subscription, toolbar);
}

/**
 * Releases the elements connected to a disposing `toolbar`, running their cleanups, and returns
 * the step that connects each to an outer controller or leaves it waiting. The controller runs
 * that step once its root has left `roots`.
 */
export function releaseToolbarMembers(toolbar: ToolbarController): () => void {
  const connected = [...subscriptions].filter((subscription) => subscription.owner === toolbar);
  for (const subscription of connected) releaseSubscription(subscription);
  return () => {
    for (const subscription of connected)
      if (subscriptions.has(subscription))
        moveSubscription(subscription, toolbarFor(subscription.element));
  };
}
