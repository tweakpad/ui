import type { TpElement } from '../../foundation/element.js';
import { composedParent } from '../../foundation/focus.js';
import { mergePartProperties } from '../../foundation/part.js';
import { attachPartReference, detachPartReference } from '../../foundation/part-reference.js';
import type { ElementReference, ComponentPartContract, PartState } from '../../foundation/part.js';
import type { NavigationPanelProvider } from './provider.js';
export const navigationPanelContext = Symbol('Navigation Panel context');
export interface NavigationPanelOwner extends TpElement {
  readonly [navigationPanelContext]: true;
  readonly provider: NavigationPanelProvider;
  registerNavigationPart(name: string, element: HTMLElement, member?: TpElement): () => void;
}
export function navigationPanelOwner(element: HTMLElement): NavigationPanelOwner | undefined {
  for (let node = composedParent(element); node; node = composedParent(node)) {
    const owner = node as NavigationPanelOwner;
    if (owner[navigationPanelContext]) return owner;
  }
}
function resolvedClass(contract: ComponentPartContract | undefined, state: PartState): string {
  return (
    (typeof contract?.classHook === 'function' ? contract.classHook(state) : contract?.classHook) ??
    ''
  );
}
function resolvedStyle(
  contract: ComponentPartContract | undefined,
  state: PartState,
): Record<string, string | number> {
  return (
    (typeof contract?.styleHook === 'function' ? contract.styleHook(state) : contract?.styleHook) ??
    {}
  );
}
/** Adapt only context; the actual constituent still owns the same binding and semantic behavior. */
const emptyContract: ComponentPartContract = {};
const delegateAdapters = new WeakMap<
  NavigationPanelOwner,
  WeakMap<
    NonNullable<ComponentPartContract['renderDelegate']>,
    NonNullable<ComponentPartContract['renderDelegate']>
  >
>();
function adaptedDelegate(
  owner: NavigationPanelOwner,
  delegate: NonNullable<ComponentPartContract['renderDelegate']>,
): NonNullable<ComponentPartContract['renderDelegate']> {
  let delegates = delegateAdapters.get(owner);
  if (!delegates) delegateAdapters.set(owner, (delegates = new WeakMap()));
  let adapted = delegates.get(delegate);
  if (!adapted) {
    adapted = (context) => delegate({ ...context, state: owner.provider.state });
    delegates.set(delegate, adapted);
  }
  return adapted;
}

const referenceAdapters = new WeakMap<
  ComponentPartContract,
  WeakMap<ComponentPartContract, ElementReference>
>();
function combinedReference(
  root: ComponentPartContract,
  local: ComponentPartContract,
): ElementReference | undefined {
  if (!root.elementReference) return local.elementReference;
  if (!local.elementReference || local.elementReference === root.elementReference)
    return root.elementReference;
  let locals = referenceAdapters.get(root);
  if (!locals) referenceAdapters.set(root, (locals = new WeakMap()));
  let callback = locals.get(local);
  if (!callback) {
    const token = {};
    callback = (element) => {
      for (const reference of [root.elementReference, local.elementReference]) {
        if (element) attachPartReference(token, reference, element);
        else detachPartReference(token, reference);
      }
    };
    locals.set(local, callback);
  }
  return callback;
}
export function navigationPartContract(
  owner: NavigationPanelOwner,
  name: string,
  local: ComponentPartContract = emptyContract,
): ComponentPartContract {
  const root = owner.partContracts[name] ?? emptyContract;
  return {
    ...root,
    ...local,
    hostProperties: mergePartProperties(root.hostProperties ?? {}, local.hostProperties),
    ...(combinedReference(root, local)
      ? { elementReference: combinedReference(root, local)! }
      : {}),
    classHook: (state) =>
      [resolvedClass(root, owner.provider.state), resolvedClass(local, state)]
        .filter(Boolean)
        .join(' '),
    styleHook: (state) => ({
      ...resolvedStyle(root, owner.provider.state),
      ...resolvedStyle(local, state),
    }),
    ...(local.renderDelegate || root.renderDelegate
      ? { renderDelegate: local.renderDelegate ?? adaptedDelegate(owner, root.renderDelegate!) }
      : {}),
    ...('content' in local || 'content' in root
      ? {
          content: (state: PartState) => {
            const contract = 'content' in local ? local : root;
            return typeof contract.content === 'function'
              ? contract.content(contract === local ? state : owner.provider.state)
              : contract.content;
          },
        }
      : {}),
  };
}
