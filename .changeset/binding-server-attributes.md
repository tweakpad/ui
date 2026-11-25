---
'@tweakpad/ui': patch
---

Server-rendered markup from the React and Vue bindings now carries each prop under the element's own attribute name (`defaultOpen` renders `default-open`), for text, numbers and `true`; objects, functions and `false` reach the element on the client. React bindings also hydrate correctly: the element upgrades only after React has hydrated it, so hydration raises no mismatch, and every prop is applied as a property afterwards, including `items`, `false` and `default…` values that hydration used to drop.
