# Slider contract correction proposal

Status: user approved; root applied through direct Spec Blocks MCP and validated zero issues. Own fresh re-read confirms all five exact nodes. Live candidate0.3.15, same HEAD8440bff, stateVersionee8f10442a7a9799264c166276fa58139e93b68435a5c35548322876012718ef, authorized dirty candidate. This historical proposal records the approved bounded correction.

Fresh direct read: UI Library 0.3.14, HEAD `8440bff24a97dbbc5c762ebf4bd6baa958b305e1`, candidate hash `385ea09e23a09f53272d80d5634b838e9db300c6335915871bd4fe4025811fdc`, state version `d456e66dcc0d1f7ea9ec11ccd498532a20bc76fb057c8dd8c06b2701064d28f4`, project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`. Library document `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`; owning node `ucl17-slider`.

`cl-sec-13-evidence-and-conflict-policy` says Foundation behavior prevails and conflicting Library requirements must be corrected. Fresh Foundation `sec-148-slider` specifies `thumbCollisionBehavior: push | swap | none`, default `push`, including disabled-neighbor protection. Library currently specifies only crossing `prevent | swap`, default `prevent`. Local Base UI `slider/root/SliderRoot.tsx` and `slider/utils/resolveThumbCollision.ts` corroborate all three policies and default push.

The minimal correction changes four existing property-row text nodes and one requirement tail. It preserves every node ID, attribute, mark, anatomy/part/presentation inventory, orientation default, bound/step requirement and behavioral anchor. No new nodes or catalog identities are needed.

| Existing text-node ID | Current text | Proposed text |
| --- | --- | --- |
| audit-slider-crossing-rowc0-p-t | Thumb crossing | Thumb collision behavior |
| audit-slider-crossing-rowc1-p-t | prevent; swap | push; swap; none |
| audit-slider-crossing-rowc2-p-t | prevent | push |
| audit-slider-crossing-rowc3-p-t | Prevents crossing or atomically swaps thumb identities and their focus/drag ownership. | Controls Thumb collisions according to the anchored Slider contract. |
| ucl17-slider-q1-t16 | Existing requirement tail limits ranges to preventing crossing or swapping. | Retains bounds/lattice/ordering and delegates collision behavior to the existing Foundation anchor. Full exact replacement below. |

Exact complete replacement text nodes (attributes and marks remain unchanged):

```json
[
  {
    "id": "audit-slider-crossing-rowc0-p-t",
    "type": "text",
    "attrs": {
      "slug": null,
      "constraints": []
    },
    "content": [],
    "marks": [],
    "text": "Thumb collision behavior"
  },
  {
    "id": "audit-slider-crossing-rowc1-p-t",
    "type": "text",
    "attrs": {
      "slug": null,
      "constraints": []
    },
    "content": [],
    "marks": [],
    "text": "push; swap; none"
  },
  {
    "id": "audit-slider-crossing-rowc2-p-t",
    "type": "text",
    "attrs": {
      "slug": null,
      "constraints": []
    },
    "content": [],
    "marks": [],
    "text": "push"
  },
  {
    "id": "audit-slider-crossing-rowc3-p-t",
    "type": "text",
    "attrs": {
      "slug": null,
      "constraints": []
    },
    "content": [],
    "marks": [],
    "text": "Controls Thumb collisions according to the anchored Slider contract."
  },
  {
    "id": "ucl17-slider-q1-t16",
    "type": "text",
    "attrs": {
      "slug": null,
      "constraints": []
    },
    "content": [],
    "marks": [],
    "text": " remain within bounds, align to the positive finite step, and preserve declared thumb ordering. Thumb collision behavior follows the anchored Slider contract."
  }
]
```

Implementation compatibility is separate from the normative correction: preserve explicitly authored legacy `thumbCrossing="prevent"` as `none` and `thumbCrossing="swap"` as `swap`; the canonical authored policy becomes `thumbCollisionBehavior`, default `push`. Conflicting explicit policies require a diagnostic and documented canonical precedence. No implicit legacy alias may silently replace the Foundation default.

Before live mutation, refresh concurrency fields and re-read the five source nodes; apply this bounded replacement, validate the complete candidate and re-read the owning Slider and conflict-policy nodes. That bounded correction is now approved/applied/re-read; the Slider policy dependency is resolved. Implementation still requires its own gates0–2/checker before production.
