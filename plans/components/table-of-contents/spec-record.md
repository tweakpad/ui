# Table of contents: spec record

Project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`. Authored through the Spec Blocks MCP tools,
per the user's choice "Author it directly".

| Commit | Version | Content |
|---|---|---|
| `8be73e11abe5138d50e2a8b0437f29a6ff4f6f9c` | v0.6.1 | Base (adds §18.14 Color scheme preference; not this work) |
| `3867326e0fb00012e9304e63a4e686a02534eeca` | v0.6.2 | Scroll spy contract, Table of contents, change reason `scroll`, B.8 rows, coverage row |
| `bbdb4dc7375e968ecf21bf34797720f42d599aa9` | v0.7.0 | Minor version bump |
| `80079139bae44feafdad8282dd068f9c96376b83` | **v0.7.1** | `navigation` fragment/scroll (`tocp7`; `ssf-navigation-3` amended) after the hash-routed workspace exposed URL changes |
| `f415e20c75d62f01f8b2befd2d925b73bf97abdc` | v0.7.2 | Navigation scrolls only the root with `scroll-behavior` (`tocp8`), records the fragment in history; `ssf-anchors` (content links, history, initial fragment); TOC may sit inside its scroll root |
| `225a75d36a4822cb6e2424befaa81f28e8ae20f2` | **v0.7.3** | `env-shared-observation` in §12.3, `ssf-updates` measure-on-layout, `tocp9` scroll-throttle / scroll-debounce |
| `1cecdbd31350caee8a0c1aa429e43f7359b4caa2` | **v0.7.4** | `ssf-active`: both edges always have a current target (current head) |

## Foundation (`doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1`)

- `sec-1815-scroll-spy`: §18.15 Scroll spy, slug `scroll-spy`. Review dependencies on
  `sec-53-changeeventt-and-changereason`, `sec-184-scrollarea`, `audit-sec-126-reduced-motion-policy`.
  - `ssf-purpose`: geometry only; never infers targets, extent or nesting from tags, levels,
    nesting or document order.
  - `ssf-targets`: explicit targets (element reference or fragment resolved in the item's tree
    scope, then the document); unresolved → diagnostic; no layout box → excluded silently.
  - `ssf-root`: explicit root, else nearest composed-tree scroll container holding every target,
    else the document scrolling element; re-resolved on change.
  - `ssf-regions`, `ssf-geometry-note`: start = border-box start minus scroll margin; region to
    max(own end, next start); last to the content end.
  - `ssf-line`: reading line = scroll-padding-block-start + 1px, or an explicit offset (px / %).
  - `ssf-end`: end reachability over the final scroll distance; non-scrolling root → end edge.
  - `ssf-active`: active set = regions containing the line; current = latest start.
  - `ssf-navigation`: native fragment navigation when the document resolves the id, else
    programmatic scroll (instant under reduced motion); hold until scrolling after settle; no focus move.
  - `ssf-updates`: once per frame; scroll, resize, id/hidden mutations, target list, fragment.
  - `ssf-value`: controllable lane, reasons `scroll` and `link-press`; controlled value never rewritten.
  - `ssf-collect`: optional collector with caller-supplied root and selector; no defaults.
  - `ssf-edges`: edge table.
- `scroll-spy-reason` in `sec-53-changeeventt-and-changereason`: registered reason `scroll`.
- `ss-b81-scroll` (B.8.1 row) and `ss-b83-scroll-spy` (B.8.3 row: scroll, link-press, programmatic).

## Component Library (`doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`)

- `ucl20-table-of-contents`: Table of contents in §20 Command and navigation, slug
  `component-table-of-contents`. Review dependencies on `sec-1815-scroll-spy` and
  `audit-sec-126-reduced-motion-policy`.
  - `toc-purpose`, `toc-basis` (Scroll spy; Breadcrumb current-location relationship).
  - `toc-anatomy`, `toc-props`.
  - `toc-a11y`, `toc-indicator`, `toc-own-scroll`, `toc-presentation`.
  - `toc-public-definition`, `toc-definition-summary` (compound-reexport), `toc-presentation-keys`.
  - `toc-decisions`.
- `audit-cov-table-of-contents`: §25 coverage row.

## Validation

No errors. Review warnings from the new dependencies and from the change-reason addition
(`carousel-foundation-dependency-1`, `media-player-foundation-dependency-0`, `sec-1812-map-dep-0`,
`sec-1919-drag-drop-dependency-1`, `rel-changeevent-to-b8`, `rel-complete-audit-to-b`) were
approved with `spec_approve_review`: a new reason does not change those components' reason sets.
`canCommit` was true with zero diagnostics before each commit.
