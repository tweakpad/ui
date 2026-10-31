import {
  camelize,
  defineComponent,
  getCurrentInstance,
  h,
  type DefineSetupFnComponent,
  type PropType,
  type SlotsType,
  type VNodeProps,
} from 'vue';
import { defineElement } from '../foundation/define.js';

/** A library element class; its static `tagName` names the element a binding renders. */
export type BindingElementClass = CustomElementConstructor & { readonly tagName: string };

/** `tp-value-change` → `TpValueChange`, the casing Vue's event props and `@` listeners use. */
export type EventPropName<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Capitalize<Head>}${EventPropName<Tail>}`
  : Capitalize<S>;

/**
 * A Vue binding: the element's settable properties `F` (typed by the element class `E`) as
 * props, its events `V` (by event name) as `@tp-…` listeners, and a `v-model:<lane>` per lane `L`,
 * with `v-model` binding lane `M`.
 */
export type ElementBinding<
  E extends HTMLElement,
  F extends keyof E,
  V extends Record<string, Event>,
  L extends keyof E = never,
  M extends keyof E = never,
> = DefineSetupFnComponent<
  { [K in F]?: E[K] | undefined } & {
    [K in keyof V & string as `on${EventPropName<K>}`]?: ((event: V[K]) => void) | undefined;
  } & ([M] extends [never] ? unknown : { modelValue?: E[M] | undefined }),
  { [K in L & string as `update:${K}`]: (value: E[K]) => true } & ([M] extends [never]
    ? unknown
    : { 'update:modelValue': (value: E[M]) => true }),
  // Light DOM content, with `slot="…"` on the children that go to a named slot.
  SlotsType<{ default?: () => unknown }>
>;

export interface BindingOptions {
  /** The element's `on…` callback properties, which need not be reactive properties. */
  readonly callbacks?: readonly string[];
  /** Each lane property → the callback that receives its proposals. */
  readonly lanes: Readonly<Record<string, string>>;
  /** The lane `v-model` binds without an argument. */
  readonly model?: string;
}

/** Names Vue keeps for itself; a prop of that name would never reach the element. */
const reserved = new Set(['key', 'ref', 'is']);

/** Reactive property declarations of a library element class, after it finalized. */
interface ReactiveElementClass {
  finalize?(): void;
  readonly elementProperties?: ReadonlyMap<PropertyKey, { type?: unknown; state?: boolean }>;
}

/**
 * A Vue component rendering `element`. It defines the element (and what it renders) on setup, so
 * it upgrades on creation; never at import, so an unused binding costs nothing. Its props are the
 * element's reactive properties, read from the element class (booleans cast as Vue casts them,
 * so `<Checkbox disabled />` is disabled); the ones a template writes are assigned as DOM
 * properties, and an omitted one keeps the element's default. `on…` callback properties are
 * assigned too, which Vue would otherwise turn into listeners. `@tp-…` listeners, `class`,
 * `style`, `slot` and other attributes fall through to the element. Each lane's callback also
 * emits `update:<lane>` (and `update:modelValue`) with the proposed value, for `v-model`.
 */
export function createBinding(
  element: BindingElementClass,
  name: string,
  options: BindingOptions,
): unknown {
  const tagName = element.tagName;
  const lanes = Object.entries(options.lanes);
  const laneCallbacks = new Set(lanes.map(([, callback]) => callback));
  let declared:
    Record<string, { type?: PropType<unknown>; default?: undefined } | null> | undefined;
  /** Read when Vue first creates the component, from the finalized element class. */
  const props = () => {
    if (declared) return declared;
    const reactive = element as unknown as ReactiveElementClass;
    reactive.finalize?.();
    declared = {};
    for (const [key, property] of reactive.elementProperties ?? [])
      if (typeof key === 'string' && !property.state && !reserved.has(key))
        declared[key] =
          property.type === Boolean
            ? { type: Boolean as PropType<unknown>, default: undefined }
            : null;
    for (const callback of options.callbacks ?? []) declared[callback] = null;
    if (options.model) declared.modelValue = null;
    return declared;
  };
  return defineComponent({
    name,
    get props() {
      return props();
    },
    emits: [
      ...lanes.map(([lane]) => `update:${lane}`),
      ...(options.model ? ['update:modelValue'] : []),
    ],
    setup(_, { emit, slots }) {
      if (typeof customElements !== 'undefined') defineElement(tagName, element);
      const instance = getCurrentInstance()!;
      return () => {
        const values = instance.props as Record<string, unknown>;
        const written = new Set(Object.keys(instance.vnode.props ?? {}).map(camelize));
        const properties: Record<string, unknown> & VNodeProps = {};
        for (const key of Object.keys(props()))
          if (key !== 'modelValue' && !laneCallbacks.has(key) && written.has(key))
            properties[`.${key}`] = values[key];
        if (options.model && written.has('modelValue') && !written.has(options.model))
          properties[`.${options.model}`] = values.modelValue;
        for (const [lane, callback] of lanes) {
          const own = values[callback] as ((...args: unknown[]) => void) | undefined;
          properties[`.${callback}`] = (...args: unknown[]) => {
            own?.(...args);
            const [proposal] = args;
            const value =
              proposal instanceof CustomEvent
                ? (proposal.detail as { value?: unknown } | null)?.value
                : proposal;
            emit(`update:${lane}`, value);
            if (lane === options.model) emit('update:modelValue', value);
          };
        }
        return h(tagName, properties, slots.default?.());
      };
    },
  });
}

/** For `compilerOptions.isCustomElement`, when templates write the elements' own tags. */
export const isTweakpadElement = (tag: string): boolean => tag.startsWith('tp-');
