# Markdown: spec record

Project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`. Authored through the Spec Blocks MCP tools.

| Commit | Version | Content |
|---|---|---|
| `804b8c7112ed0610b71bdfff3e97d9e86d21633d` | v0.7.8 | Markdown parsing contract, Markdown control, coverage row |
| `496e202865d2b125f4c7b9cd3e7a656bbba7f048` | v0.8.0 | Minor version bump |
| `274351f15f4aa51907df71e6e3e1efa232640ee7` | **v0.8.1** (current head) | `mdl-composition`: tables are named by the table message and their column headers (axe `landmark-unique` found duplicate region names) |

The base was `da3f18ba` (v0.7.7). As with Code block, the content went in as a revision and the minor bump followed as its own commit.

## Foundation (`doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1`)

- `sec-1816-markdown`: §18.16 Markdown, slug `markdown`. Review dependencies on `sec-1813-code-highlighting` and `sec-1815-scroll-spy`.
  - Children: `mdf-purpose`, `mdf-dialect`, `mdf-model`, `mdf-contract-intro`, `mdf-contract` (parser contract table), `mdf-adapters`, `mdf-resolve`, `mdf-elements`, `mdf-default-policy`, `mdf-urls`, `mdf-identifiers`, `mdf-fragments`, `mdf-renderers`, `mdf-renderer-failure`, `mdf-streaming`, `mdf-edges`.

## Component Library (`doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`)

- `ucl21-markdown`: Markdown, in §21 `sec-cl-21-display-feedback` (§21.15), slug `component-markdown`. Review dependencies on `sec-1816-markdown`, `ucl21-code-block`, `ucl22-table`, `ucl21-separator`, `ucl16-checkbox`, `ucl22-alert`, `ucl22-key-hint` and `ucl22-card`.
  - Overview: `mdl-purpose`, `mdl-basis`.
  - Tables: `mdl-anatomy`, `mdl-props`.
  - Requirements: `mdl-api`, `mdl-a11y`, `mdl-composition`, `mdl-extension`, `mdl-typography`, `mdl-presentation`.
  - Definition: `mdl-public-definition`, `mdl-definition-summary` (preset-composition, size axis), `mdl-presentation-keys`.
  - Note: `mdl-decisions`.
- `audit-cov-markdown`: §25 coverage row in `audit-complete-coverage-map`. It links to `ucl21-markdown` and `sec-1816-markdown`.

## Validation

- There were no errors.
- Ten `REVIEW_REQUIRED` warnings came from the new review dependencies. Each was approved with `spec_approve_review`:
  - `sec-1816-markdown-dep-0`, `sec-1816-markdown-dep-1`
  - `ucl21-markdown-dep-0` through `ucl21-markdown-dep-7`
- After the approvals, `canCommit` was true with zero diagnostics.
