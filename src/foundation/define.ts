export type CustomElementConstructorWithTag = CustomElementConstructor & {
  readonly tagName?: string;
  /** Library elements this element renders; defining it defines them too. */
  readonly elementDependencies?: readonly CustomElementConstructorWithTag[];
};

/**
 * Define an element and, recursively, the library elements it renders. Registering one
 * component therefore registers exactly what it needs, and nothing else.
 */
export function defineElement(
  tagName: string,
  constructor: CustomElementConstructor,
  registry: CustomElementRegistry = customElements,
  visited: Set<CustomElementConstructor> = new Set(),
): void {
  if (visited.has(constructor)) return;
  visited.add(constructor);
  if (!registry.get(tagName)) registry.define(tagName, constructor);
  // Each class in the chain declares what its own templates render.
  // No DOM globals are referenced, so this also runs during server rendering setup.
  for (let level: unknown = constructor; level; level = Object.getPrototypeOf(level)) {
    const getter = Object.getOwnPropertyDescriptor(level as object, 'elementDependencies');
    const dependencies = (getter?.get?.call(constructor) ??
      getter?.value ??
      []) as readonly CustomElementConstructorWithTag[];
    for (const dependency of dependencies)
      if (dependency.tagName) defineElement(dependency.tagName, dependency, registry, visited);
  }
}
