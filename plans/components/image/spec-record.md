# Image: spec record

Project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`. Authored through the Spec Blocks MCP tools.

| Commit | Version | Content |
|---|---|---|
| `dd439b4a5a00b83e4e7577a6908201632c06c856` | v0.8.2 | Image behavior, shared intersection observation, Image control, `reveal` motion role, coverage row, Aspect-ratio box `scale-down` |
| `ba1d4263a86c0682c97211d6db2123fd3e12e956` | v0.8.3 | `img-parallax`: progress follows the nearest *scrolling* ancestor, so clipping ancestors that cannot scroll are excluded; a view timeline is used only when it follows that ancestor. `img-visibility` and the `img-edges` many-images row: visibility is observed while parallax is active. Review `ucl21-image-dep-0` approved (the CL text is unaffected). |
| `01a0d1bce7c87667df4c7555922d78257fc0edfa` | **v0.8.4** (current head) | `img-parallax`: parallax is a token list of one direction and/or a scroll zoom (`zoom-in`/`zoom-out` scale the picture between natural size and 1 + depth across progress, combinable with displacement and hover zoom); progress follows the scrolling ancestor's axis (inline for sideways scrollers, mirrored under RTL). `img-motion-policy`: Media and its picture rest. `img-parts`, CL `imgl-props` row 11, `imgl-api` (`data-parallax-axis`). Review `ucl21-image-dep-0` approved. |

The base was `274351f1` (v0.8.1). The amendment went in as one revision. No minor bump was taken.

## Foundation (`doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1`)

- `env-shared-intersection` is a new requirement in §12.3, `sec-123-environment-and-interaction-services`.
  - It requires one shared intersection observer per root, root margin and threshold list, released when the last subscriber leaves.
  - Visibility consumers must use it.
  - Per-element-option observers (anchor layout-shift tracking, `sec-109-automatic-tracking`) may keep their own observer if they release it.
- `sec-1817-image` is §18.17 Image, slug `image`. It has review dependencies on `sec-181-avatar`, `env-shared-intersection` and `audit-sec-126-reduced-motion-policy`.
  - Children:
    - `img-purpose`
    - `img-anatomy`
    - `img-parts`
    - `img-request-order`
    - `img-sizes`
    - `img-sources`
    - `img-loading`
    - `img-placeholder`
    - `img-a11y`
    - `img-visibility`
    - `img-parallax`
    - `img-zoom`
    - `img-reveal`
    - `img-motion-policy`
    - `img-edges`

## Component Library (`doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`)

- `ucl21-image` is Image, in §21 `sec-cl-21-display-feedback`, slug `component-image`. It has review dependencies on `sec-1817-image`, `ucl22-aspect-ratio`, `ucl22-skeleton`, `ucl21-spinner` and `ucl22-icon`.
  - Overview: `imgl-purpose`, `imgl-basis`.
  - Tables: `imgl-anatomy`, `imgl-props`.
  - Requirements: `imgl-api`, `imgl-composition`, `imgl-presentation`.
  - Definition: `imgl-public-definition`, `imgl-definition-summary` (preset-composition, no axes), `imgl-presentation-keys`.
  - Note: `imgl-decisions`.
- `ucl22-aspect-ratio-props-r1c1-t`: the Fit values are now `fill; contain; cover; none; scale-down`.
- `tbl-cl-158-image-reveal`: the motion-role inventory row `Image | reveal | Root | state: change | effect | non-blocking`.
- `audit-cov-image`: a §25 coverage row that links `ucl21-image` and `sec-1817-image`.

## Validation

- There were no errors.
- The new review dependencies raised 14 `REVIEW_REQUIRED` warnings. I reviewed each one and approved it with `spec_approve_review`.
  - `ucl21-image-dep-0` to `-4` and `sec-1817-image-dep-0` to `-2`: these are the new section's own edges.
  - `carousel-component-dependency-4`, `ucl21-drag-drop-list-dependency-6` and `media-player-component-dependency-11`: these are on §15.8. A new motion-inventory row changes none of their roles.
  - `carousel-foundation-dependency-7`, `sec-1814-color-scheme-preference-dep-1` and `sec-1919-drag-drop-dependency-9`: these are on §12.3.
    - The new intersection rule applies to Carousel's shader effect and to Message scroller. Both are migrated in this delivery.
    - Color scheme and Drag and drop use no intersection observer.
- After the approvals, `canCommit` was true with zero diagnostics.
