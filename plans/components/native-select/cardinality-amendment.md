# Native Select option group cardinality correction

Fresh direct authority: UI Library0.3.14, HEAD `8440bff24a97dbbc5c762ebf4bd6baa958b305e1`; document `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`, owning container `ucl17-native-select`.

Change only the text node `ucl17-native-select-public-definition-detail-r2c1-p-t`, preserving its ID, parent cells/paragraph, attrs, marks and every other node.

Current text:

> zero or one descendant of Wrapper; cited behavior sets any required-presence condition

Proposed text:

> zero or more descendants of Wrapper; cited behavior sets any required-presence condition

The same owning contract requires native Option group semantics, and native select permits multiple groups. The supplied local shadcn `bases/base/examples/native-select-example.tsx` `NativeSelectWithGroups` renders Fruits and Vegetables optgroups. This one-node correction reconciles the containment table with that required behavior without inventing a part, changing an API, or replacing the host picker.

The user approved this exact correction. Root applied it through registered direct MCP and validated the complete candidate (zero issues, canCommit true). Own fresh direct project/Foundation/Library reads confirmed the exact proposed text at UI Library0.3.15, HEAD `8440bff24a97dbbc5c762ebf4bd6baa958b305e1`, state `07b68b0c8a1512b44d72d2a300784ea7b1b19e0b8e59e3d850c29eb5237885d3`. The draft above is retained as the reviewable amendment; the cardinality block is resolved, and Native Select gates0–2 pass before production.
