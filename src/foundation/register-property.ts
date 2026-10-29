/**
 * Registers a custom property in the document the module runs in, so a component owns the
 * registrations of its private properties without depending on the consumer's stylesheet
 * (`@property` rules in a shadow root's styles are not honored). A component registers a value
 * it writes every frame as non-inherited: an inherited write restyles every descendant, slotted
 * content included, whether or not anything reads it.
 *
 * Engines without `CSS.registerProperty` (and server rendering) skip it, and the property inherits
 * as an unregistered one. A name that is already registered keeps its first registration: another
 * copy of the library, a module re-run by hot reload, or the page's own `@property`.
 */
export function registerProperty(definition: PropertyDefinition): void {
  if (typeof CSS === 'undefined' || typeof CSS.registerProperty !== 'function') return;
  try {
    CSS.registerProperty(definition);
  } catch {
    // Already registered: the first registration stands.
  }
}
