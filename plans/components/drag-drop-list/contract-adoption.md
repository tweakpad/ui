# Drag-and-drop live contract adoption

The user authorized execution of `drag-drop.md`, including P01 / section 17.
All reads and mutations used the registered direct Spec Blocks MCP tools.

- Project: `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`
- Version: `0.3.15`; HEAD: `8440bff24a97dbbc5c762ebf4bd6baa958b305e1`
- Validated candidate: `0ce91b33497d6ca9599bdb63e5b070f3fceccd9680152723182b75bee83f5fa3`
- Final `spec_validate_project`: zero diagnostics, `canCommit: true`.
- Existing unrelated candidate changes are preserved. No project commit or discard was performed.

## Adopted anchors

- Foundation: `sec-1919-drag-drop`, with `dnd-contract-4` through `dnd-contract-12` and `dnd-contract-14`.
- Component Library: `ucl21-drag-drop-list`, with `dnd-contract-13-1` through `dnd-contract-13-4`.
- Source adaptation ledger: `dnd-source-adaptations` (A01–A24).
- Shared state vocabulary, three motion roles, value reasons, marker inventory and catalog coverage were extended. Existing entries were retained.

The proposal's framework-specific implementation references were translated to abstract renderer/state contracts. The local implementation still uses Lit and existing Foundation owners. Internal cross-section dependencies use stable anchor references. Added review-on-change relationships cover state, List Item, Button, Empty State, motion, semantics, portal and environment ownership.

## Dependency review

Controlled proposals remain separate from committed values. Connected transfers validate all owner responses before publication and preserve the synchronous transaction boundary. Preview is never a value lane. Drag-specific Tab completion preserves native traversal; pointer capture still follows shared release rules. List Item/Button/Empty State retain their public behavior and appearance. Existing motion drivers retain claim/cancel/completion ownership. New state/reason inventory rows do not alter existing component lanes.

Reviewed affected legacy marker consumers (Tabs, Field, Slider, Drawer, ScrollArea, Toast), change-reason registry, complete-library audit and managed State marker dependency: additions retain their existing rows and semantics. Stale hardcoded catalog counts were replaced by the authoritative coverage-map boundary.

Spec Blocks review approvals cover the exact candidate. An additional mutation invalidates those approvals even if the referenced node is unchanged; validate and review again after any later amendment.

This is specification adoption evidence, not runtime, accessibility, visual, or component-completeness evidence.
