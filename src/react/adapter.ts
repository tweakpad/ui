'use client';
import {
  createElement,
  useCallback,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { defineElement } from '../foundation/define.js';

/** A library element class; its static `tagName` names the element a binding renders. */
export type BindingElementClass = CustomElementConstructor & { readonly tagName: string };

/**
 * Props of an element binding: the element's settable properties `F`, typed by the element
 * class `E`; its events `V` as `onTp…` handlers; React's HTML attributes for anything the
 * element does not declare itself; a ref to the element; and children.
 */
export type ElementProps<
  E extends HTMLElement,
  F extends keyof E,
  V extends Record<string, Event>,
> = { [K in F]?: E[K] | undefined } & {
  [K in keyof V]?: ((event: V[K]) => void) | undefined;
} & Omit<HTMLAttributes<E>, F | keyof V> & {
    ref?: Ref<E> | undefined;
    children?: ReactNode;
  };

/**
 * A React component rendering `element`. React 19 sets each prop the element declares as a
 * property, so the binding only:
 * - defines the element (and what it renders) before React creates it, so it upgrades on
 *   creation and receives its properties before it connects; never at import, so an unused
 *   binding costs nothing;
 * - maps each `onTp…` prop in `events` to React's listener for the event's exact name;
 * - assigns the element's `on…` callback properties itself, which React would otherwise turn into
 *   listeners for events of that name.
 */
export function createBinding<P>(
  element: BindingElementClass,
  displayName: string,
  events: Readonly<Record<string, string>>,
  callbacks: readonly string[],
): (props: P) => ReactElement {
  const tagName = element.tagName;
  const eventNames = new Map(Object.entries(events));
  const callbackNames = new Set(callbacks);
  function Binding(props: P): ReactElement {
    if (typeof customElements !== 'undefined') defineElement(tagName, element);
    const host = useRef<HTMLElement | null>(null);
    const assigned = useRef<ReadonlySet<string>>(new Set());
    const rendered: Record<string, unknown> = {};
    const callbacksNow: Record<string, unknown> = {};
    let forwarded: Ref<HTMLElement> | undefined;
    for (const [key, value] of Object.entries(props as Record<string, unknown>)) {
      if (key === 'ref') forwarded = value as Ref<HTMLElement> | undefined;
      else if (eventNames.has(key)) rendered[`on${eventNames.get(key)}`] = value;
      else if (callbackNames.has(key)) callbacksNow[key] = value;
      else rendered[key] = value;
    }
    useLayoutEffect(() => {
      const target = host.current as unknown as Record<string, unknown> | null;
      if (!target) return;
      for (const key of assigned.current) if (!(key in callbacksNow)) target[key] = undefined;
      for (const [key, value] of Object.entries(callbacksNow)) target[key] = value;
      assigned.current = new Set(Object.keys(callbacksNow));
    });
    const ref = useCallback(
      (node: HTMLElement | null) => {
        host.current = node;
        if (typeof forwarded === 'function') {
          const cleanup = forwarded(node);
          return () => {
            host.current = null;
            if (typeof cleanup === 'function') cleanup();
            else forwarded(null);
          };
        }
        if (forwarded) forwarded.current = node;
        return () => {
          host.current = null;
          if (forwarded && typeof forwarded !== 'function') forwarded.current = null;
        };
      },
      [forwarded],
    );
    return createElement(tagName, { ...rendered, ref });
  }
  Binding.displayName = displayName;
  return Binding;
}
