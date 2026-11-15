---
'@tweakpad/ui': minor
---

Add the Data view component (`tp-data-view`): application records as a compact, read-only grid with stable row identities, configured columns and a cell renderer, a bounded scrolling viewport with fixed-height row virtualization, keyboard navigation by cell or by row, single-column sorting (local by default through the exported `sortDataViewRows`, or `sorting="manual"`), selection of one row or many (`selection-mode`, `selection-behavior` replace or toggle, Shift and Mod ranges, select all, an array `value`) with an optional pinned checkbox column (`selection-checkboxes`), a hidden header (`header="hidden"`), a tile layout (`layout="grid"`) with a `tile` middleware hook, a row drag-and-drop hook on a shared manager (`dragAndDrop`), row activation, and loading, empty and error states. Table's look now comes from a shared table surface that both use.
