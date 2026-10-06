import type { ComponentDefinition } from './definition.js';
import { presentationFamilies } from './families/index.js';

/**
 * Every component definition, in catalog order. Components never import this aggregate;
 * each element carries its own family, so only an explicit import of this list (catalogs,
 * documentation, audits) bundles the whole library's definitions.
 */
// Derived from live Component Library 0.3.14, commit 8440bff2. Not a normative snapshot.
export const componentDefinitions: readonly ComponentDefinition[] = presentationFamilies.map(
  (family) => family.definition,
);
