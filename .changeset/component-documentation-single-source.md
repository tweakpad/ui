---
'@tweakpad/ui': minor
---

Every component and widget now ships its documentation page: `docs/components/<slug>.mdx` and `docs/widgets/<slug>.mdx`, the single source that Storybook and tweakpad.com/docs both render.

- Each page has a header (name, description and tag), the main use case and Usage.
- The API Reference is generated from the Custom Elements Manifest: attributes, properties and events, then methods, slots, CSS parts and CSS custom properties.
- Every element's JSDoc and part descriptions now fill those rows.
- The pages accept a `<Code>` element for standalone samples, and `parts` as a YAML block list.
