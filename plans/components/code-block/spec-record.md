# Code block: spec record

Project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`. Authored through the Spec Blocks MCP tools.

| Commit | Version | Content |
|---|---|---|
| `d95a9d9ad09152ed161e91c1aca2d570a96abcd8` | v0.5.1 | Code highlighting contract, Code block, syntax colors, coverage row |
| `d512b4edd1b7d675e76cf961e0f5ef5baa45f9f4` | **v0.6.0** | Minor version bump (current head) |

The base was `dcf9a948` (v0.5.0). The server rejects a minor bump until a non-zero revision is committed, so the content went in as v0.5.1 and the bump followed as its own commit.

## Foundation (`doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1`)

- `sec-1813-code-highlighting`: §18.13 Code highlighting, slug `code-highlighting`. It has a review dependency on `sec-1812-map`.
  - Children: `cbf-purpose`, `cbf-roundtrip`, `cbf-model`, `cbf-scopes`, `cbf-contract-intro`, `cbf-contract` (the highlighter contract table), `cbf-async`, `cbf-fallback`, `cbf-builtin`, `cbf-adapters`, `cbf-color`, `cbf-copy`, `cbf-edges`.

## Component Library (`doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`)

- `sec-cl-57-syntax-colors`: §5 Syntax color extension, slug `syntax-color-extension`, roles `syntax-comment` … `syntax-deleted`. It has a review dependency on `sec-cl-56-extension-law`.
  - Children: `cbs-intro`, `cbs-roles`, `cbs-defined`, `cbs-scope`.
- `ucl21-code-block`: Code block, in §21 `sec-cl-21-display-feedback`, slug `component-code-block`. It has review dependencies on `sec-1813-code-highlighting`, `ucl16-button`, `ucl22-icon` and `audit-sec-126-reduced-motion-policy`.
  - Overview: `cbl-purpose`, `cbl-basis`.
  - Tables: `cbl-anatomy`, `cbl-props`.
  - Requirements: `cbl-a11y`, `cbl-typography`, `cbl-expand`, `cbl-copy`, `cbl-presentation`.
  - Definition: `cbl-public-definition`, `cbl-definition-summary` (preset-composition), `cbl-presentation-keys`.
  - Note: `cbl-decisions`.
- `audit-cov-code-block`: §25 coverage row in `audit-complete-coverage-map`. It links to `ucl21-code-block` and `sec-1813-code-highlighting`.

## Validation

- There were no errors.
- Six `REVIEW_REQUIRED` warnings came from the new review dependencies. Each was approved with `spec_approve_review`:
  - `sec-1813-code-highlighting-dep-0`
  - `sec-cl-57-syntax-colors-dep-0`
  - `ucl21-code-block-dep-0` through `ucl21-code-block-dep-3`
- After the approvals, `canCommit` was true with zero diagnostics.
