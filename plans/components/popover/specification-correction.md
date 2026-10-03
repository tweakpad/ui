# Popover specification correction for review

Fresh direct MCP reads: UI Library 0.3.15; Foundation HEAD
`8440bff24a97dbbc5c762ebf4bd6baa958b305e1`; candidate
`07b68b0c8a1512b44d72d2a300784ea7b1b19e0b8e59e3d850c29eb5237885d3`.

Foundation `sec-165-popover` permits modal/non-modal presentation and optional
hover opening. Library `cl-sec-13-evidence-and-conflict-policy` explicitly requires
Foundation behavior to prevail and conflicting Library prose to be corrected.
Library `sec-cl-86-fixed-properties` forbids fixing dismissal or semantics.

The proposed two-node correction changes only these Library paragraphs:

| Node | Current | Proposed |
| --- | --- | --- |
| `ucl19-popover-purpose` | A non-modal anchored surface opened by explicit activation for controls, forms, or supporting content. | An anchored surface for controls, forms, or supporting content; non-modal and explicitly activated by default, with optional modality and hover opening governed by the Foundation contract. |
| `ucl19-popover-definition-summary-r0c3-p` | modality=non-modal | none |

The existing `modal` property row remains false by default. No new modal preset,
runtime dependency, or default hover opening is introduced. Implementation follows
the existing Foundation behavior and the documented modal property instead of the
contradictory fixed-property cell. No specification write or commit has occurred.
