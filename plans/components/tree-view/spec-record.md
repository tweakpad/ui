# Tree view: spec record

Project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`. Authored through the Spec Blocks MCP tools,
per the user's choice "Author it directly" (2026-10-07).

| Commit | Version | Content |
|---|---|---|
| `1cecdbd31350caee8a0c1aa429e43f7359b4caa2` | v0.7.4 | Base (Table of contents work; not this task) |
| `fb0fc1980f0d9d6fa4547aa487b4d51840bb9e14` | **v0.7.5** | Tree, Virtual list window, tree reorder profile, Collapsible shared disclosure owner, Tree view, coverage, reason and motion-role rows |

## Foundation (`doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1`)

- `sec-178-tree`: §17.8 Tree, slug `tree`. Review dependencies on `sec-52-controlledvaluet`,
  `sec-53-changeeventt-and-changereason`, `sec-84-composite-navigation`, `sec-133-collapsible`,
  `sec-197-list-navigation-interaction`, `sec-1919-drag-drop`, `audit-sec-126-reduced-motion-policy`,
  `sec-91-formcontrolcontractt`.
  - `tree-f-purpose`, `tree-f-model`, `tree-f-sources` (records and markup modes share behavior),
    `tree-f-duplicates`, `tree-f-visible`.
  - `tree-f-lanes` (selection `value`, expansion `expanded`, records-mode `items`), `tree-f-initial`
    (defaults applied before the first rendered state, no events).
  - `tree-f-selection`, `tree-f-propagation`, `tree-f-checked`, `tree-f-expansion`, `tree-f-activation`.
  - `tree-f-keys` (APG table), `tree-f-keys-direction`, `tree-f-focus`.
  - `tree-f-lazy`, `tree-f-expand-all`, `tree-f-reveal`, `tree-f-semantics`, `tree-f-motion`,
    `tree-f-virtual`, `tree-f-reorder`, `tree-f-reasons`, `tree-f-forms`, `tree-f-cleanup`, `tree-f-edges`.
- `sec-1924-virtual-list`: §19.24 Virtual list window (`vl-purpose`, `vl-extent`, `vl-viewport`, `vl-range`,
  `vl-stability`, `vl-reveal`, `vl-cleanup`).
- `sec-1919-drag-drop`: `dnd-adopt-6` amended (tree removed from the exclusion list); new
  `dnd-tree-profile` (projection, keyboard depth, invalid drops and veto, commit, announcements).
- `sec-133-collapsible`: new `req-collapsible-shared-owner` (controls that render their own disclosure
  regions bind them to Collapsible's measured-presence and motion owner).
- `tree-b83`: B.8.3 reason-set row.

## Component Library (`doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`)

- `ucl20-tree-view`: §20.7 Tree view, slug `component-tree-view`. Review dependencies on
  `sec-178-tree`, `sec-1924-virtual-list`, `sec-1919-drag-drop`, `ucl16-collapsible`,
  `audit-sec-126-reduced-motion-policy`.
  - `tv-purpose`, `tv-basis`, `tv-anatomy`, `tv-props`, `tv-events`, `tv-methods`.
  - `tv-a11y`, `tv-motion`, `tv-presentation`.
  - `tv-public-definition`, `tv-definition-summary` (compound-reexport, `size` axis), `tv-presentation-keys`.
  - `tv-decisions`.
- `audit-cov-tree-view`: §25 coverage row.
- `tv-motion-disclosure`, `tv-motion-content`, `tv-motion-indicator`, `tv-motion-sort`: §15.8 motion-role rows.

## Validation

Zero errors. Review warnings approved with `spec_approve_review` after checking each dependent:
- the new sections' own dependencies (content written against them);
- `carousel-component-dependency-4`, `ucl21-drag-drop-list-dependency-6`, `media-player-component-dependency-11`
  (motion-role table: rows added for Tree view only);
- `ucl21-drag-drop-list-dependency-0` (Drag-and-drop: the list's contract is unchanged; only the tree
  exclusion was lifted and a tree profile added);
- `rel-changeevent-to-b8`, `rel-complete-audit-to-b` (one B.8.3 row; no new reason).

`canCommit` was true with zero diagnostics before the commit.

## Amendment v0.7.6 — commit `71e91b3abee56e1f64c7deb6e9068f330d8938fa` (base `fb0fc198`)

This amendment reconciles the contract with implementation decisions made during verification. Each item states the reason for the change.

- `tv-props` r16: added `withItemChildren`, the record rebuild used when a move changes a parent's children.
- `tv-props` r20 (new): read-only `visibleItems`.
- `tv-methods` r3: `selectItem` adds to the selection in multiple mode and replaces it in single mode.
- `tv-methods` r8 (new): `loadingStatus(id)`.
- `tv-a11y`: Control+Enter or Command+Enter on the focused Item starts a keyboard reorder. The Item exposes that shortcut through `aria-keyshortcuts` and references the instructions through `aria-describedby`. The Handle is not described as the route to reordering.
- `tv-motion` and `tv-motion-sort`: reordering animates displaced Items through `sort-displacement` only, targeting the Item. Context is `itemId, fromIndex, toIndex, x, y`. The tree uses `feedback: 'none'` because rows move in place, so there is no overlay, keyboard-feedback or drop-settlement target.
- Foundation `tree-f-edges` r1: an empty tree exposes a labelled `group` rather than a `tree`, is neither multiselectable nor required, and has no item tab stop. This follows axe `aria-required-children`.

Reviews approved:
- `ucl20-tree-view-dep-0`: the Foundation edge row is consistent with the component.
- `carousel-component-dependency-4`, `ucl21-drag-drop-list-dependency-6`, `media-player-component-dependency-11`: only the Tree view motion-role row changed.

`canCommit` was true with zero diagnostics.

## Amendment v0.7.7 (commit `da3f18ba9f4c0fc3d5f419e52040b4d4a4e0fea1`)

- `tv-presentation`: following the sidebar sub-level menu, a Row and its fill start at the Row's indentation, and Rows are separated by the sub-level gap (spacing step 1). Guides continue through the gaps. This was user feedback on 2026-10-07: highlights need separation and must follow indentation.
- No review constraints were triggered. `canCommit` was true with zero diagnostics.
