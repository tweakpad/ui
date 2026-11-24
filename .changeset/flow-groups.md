---
'@tweakpad/ui': minor
---

Flow groups encapsulate part of a graph. A group declares its own input and output ports, edges reach its members only through those ports, and drawing a connection across a border adds the ports it needs. A group shows as a frame around its members or, with `collapsed`, as a single node. A double click enters it: the new `path` lane (`defaultPath`, `onPathChange`, `tp-path-change`) scopes the canvas to the group, the header shows a breadcrumb back to the root, and Inputs and Outputs cards stand for the group's ports. `groupSelection()`, `ungroup()`, `moveToGroup()`, `toggleCollapsed()` and the group port methods each take one undo step. Dropping a node on a group moves it in, and dragging a member against the border grows the frame. Edges that still cross a border are reported as `boundary-crossing` issues. Run requests list member nodes only, and `flattenFlowGroups` from `@tweakpad/ui/flow` resolves a grouped document to direct edges for a backend.
