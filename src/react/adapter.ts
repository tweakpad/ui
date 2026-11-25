'use client';
import {
  createElement,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { defineElement } from '../foundation/define.js';
import { attributeValue, propertyAttributes } from '../foundation/property-attributes.js';

const subscribeNothing = () => () => {};
/**
 * Whether React renders markup without the element: on the server, and while hydrating that
 * markup (React then uses the server snapshot). Client renders read `false`.
 */
const useMarkupRender = (): boolean =>
  useSyncExternalStore(
    subscribeNothing,
    () => false,
    () => true,
  );

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
 *
 * Server markup carries each prop the element reads from an attribute under that attribute's
 * name (`defaultOpen` → `default-open`), when the value has an attribute form: text, numbers and
 * `true`. Hydration renders the same markup, so React finds no mismatch, and the element is
 * defined only once React has hydrated it, so it does not change the markup React compares.
 * React sets no properties while hydrating: the binding then assigns every prop the element has,
 * before the element's first update, so objects, `false` and `default…` values apply too.
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
    const markup = useMarkupRender();
    // Whether this element came from server markup: it is defined after hydration, not now.
    const [hydrated] = useState(markup);
    if (!markup && typeof customElements !== 'undefined') defineElement(tagName, element);
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
    const properties = rendered;
    const upgraded = useRef(!hydrated);
    useLayoutEffect(() => {
      if (upgraded.current) return;
      upgraded.current = true;
      // React has hydrated the server markup: upgrade the element now and hand it every prop
      // it has as a property, which hydration does not set.
      defineElement(tagName, element);
      const target = host.current as unknown as Record<string, unknown> | null;
      if (!target) return;
      const declared = propertyAttributes(element);
      // The element's own properties only: React keeps `style`, `className` and the rest.
      for (const [key, value] of Object.entries(properties))
        if (declared.has(key) || (key in target && !(key in HTMLElement.prototype)))
          target[key] = value;
    });
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
    return createElement(tagName, { ...(markup ? attributeForm(rendered) : rendered), ref });
  }
  /**
   * The props as markup: each property the element reads from an attribute under that
   * attribute's name, when its value has an attribute form; properties without one (objects,
   * `false`, attribute-less properties) are left to the client. Other props stay as they are.
   */
  function attributeForm(rendered: Record<string, unknown>): Record<string, unknown> {
    const attributes = propertyAttributes(element);
    const form: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rendered)) {
      const attribute = attributes.get(key);
      if (attribute === undefined) form[key] = value;
      else if (attribute !== null) {
        const text = attributeValue(value);
        // React writes `true` as an empty attribute on a custom element.
        if (text !== undefined) form[attribute] = value === true ? true : text;
      }
    }
    return form;
  }
  Binding.displayName = displayName;
  return Binding;
}
