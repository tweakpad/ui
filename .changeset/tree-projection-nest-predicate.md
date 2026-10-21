---
'@tweakpad/ui': minor
---

`projectDepth(rows, index, depth, canNest?)` takes an optional nest predicate that decides whether a row accepts the dragged row as a child. With one, the projected depth is lowered to the deepest depth within the clamp whose projected parent accepts the row, depth zero always being accepted; when no depth within the clamp is accepted, the projection reports `vetoed: true`. `TreeProjection` gains the `vetoed` field, which is always `false` without a predicate, and the `TreeNestPredicate` type is exported. Tree view reordering is unchanged.
