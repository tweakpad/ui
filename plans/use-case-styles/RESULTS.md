# Use-case styles: results ranked by property usage

Baseline commit: f5094b0362d9c2e3e164ee5c6171953fc7e7a128. Inventory of the current working-tree sources; uncommitted changes are included.
Regenerate this single report with `node scripts/audit-use-case-styles.mjs` using the existing built docs parser.

## Scope and counting

308 source files, 97 published MDX pages, 745 previews, 1534 styling sites.
1269 static inline attributes contain **2654 CSS declarations across 107 properties**.

The ranking counts authored declarations in static inline attributes, not rendered instances or defects.
Documentation and story copies count separately because each snippet needs review. Repeated declarations in one attribute count separately too.
Dynamic expressions, JavaScript writes, hooks and stylesheets are included in full below but excluded from this property ranking: their resolved values and execution counts cannot be inferred reliably from source.
Equal counts are ordered alphabetically. Property spellings are preserved: logical/physical properties and shorthands/longhands are not merged.

Scope: docs MDX Preview/Code source, supplemental Markdown guides, and all src/stories source including legacy examples, shared helpers, workspace and external demo CSS.
Excluded: component implementation CSS, generated bindings, tests/fixtures, frozen documentation snapshots and website/Storybook chrome.

A **TOTAL VIOLATION** requires evidence that ordinary use-case styling supplies the component's own presentation, anatomy or normal feature behavior.
Token references do not excuse it. Explicit customization demonstrations, native content appearance and genuinely necessary layout must be distinguished.
Flags below are review candidates, not confirmed dependency defects. Never hide the same styling in a stylesheet to reduce inline counts.

## Property priority list

| Rank | CSS property | Occurrences | Docs declarations | Story declarations | Source files | Unique values |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | [color](#property-1) | 266 | 264 | 2 | 64 | 15 |
| 2 | [inline-size](#property-2) | 237 | 222 | 15 | 48 | 44 |
| 3 | [margin](#property-3) | 217 | 209 | 8 | 39 | 7 |
| 4 | [font-size](#property-4) | 211 | 205 | 6 | 59 | 15 |
| 5 | [block-size](#property-5) | 179 | 166 | 13 | 26 | 32 |
| 6 | [border-radius](#property-6) | 163 | 157 | 6 | 23 | 6 |
| 7 | [text-align](#property-7) | 157 | 152 | 5 | 17 | 3 |
| 8 | [display](#property-8) | 137 | 129 | 8 | 45 | 4 |
| 9 | [padding](#property-9) | 124 | 111 | 13 | 20 | 12 |
| 10 | [gap](#property-10) | 96 | 89 | 7 | 39 | 15 |
| 11 | [background](#property-11) | 58 | 56 | 2 | 7 | 15 |
| 12 | [border](#property-12) | 58 | 55 | 3 | 17 | 5 |
| 13 | [margin-block](#property-13) | 57 | 54 | 3 | 6 | 6 |
| 14 | [max-inline-size](#property-14) | 57 | 53 | 4 | 25 | 15 |
| 15 | [font-weight](#property-15) | 55 | 53 | 2 | 17 | 8 |
| 16 | [grid-template-columns](#property-16) | 54 | 50 | 4 | 27 | 31 |
| 17 | [overflow](#property-17) | 38 | 38 | 0 | 8 | 3 |
| 18 | [position](#property-18) | 30 | 28 | 2 | 6 | 3 |
| 19 | [aspect-ratio](#property-19) | 29 | 27 | 2 | 6 | 5 |
| 20 | [line-height](#property-20) | 28 | 24 | 4 | 11 | 11 |
| 21 | [flex](#property-21) | 23 | 20 | 3 | 9 | 8 |
| 22 | [margin-inline](#property-22) | 23 | 23 | 0 | 10 | 1 |
| 23 | [min-block-size](#property-23) | 23 | 22 | 1 | 9 | 8 |
| 24 | [align-items](#property-24) | 20 | 17 | 3 | 15 | 2 |
| 25 | [box-sizing](#property-25) | 16 | 16 | 0 | 5 | 2 |
| 26 | [object-fit](#property-26) | 16 | 16 | 0 | 2 | 1 |
| 27 | [padding-block](#property-27) | 16 | 15 | 1 | 7 | 3 |
| 28 | [height](#property-28) | 15 | 7 | 8 | 3 | 6 |
| 29 | [min-inline-size](#property-29) | 15 | 14 | 1 | 7 | 3 |
| 30 | [place-items](#property-30) | 13 | 13 | 0 | 5 | 1 |
| 31 | [align-self](#property-31) | 11 | 11 | 0 | 8 | 4 |
| 32 | [inset-block-end](#property-32) | 11 | 11 | 0 | 1 | 2 |
| 33 | [inset-inline-start](#property-33) | 11 | 11 | 0 | 1 | 2 |
| 34 | [text-shadow](#property-34) | 11 | 11 | 0 | 1 | 1 |
| 35 | [font-family](#property-35) | 10 | 10 | 0 | 6 | 1 |
| 36 | [--tp-message-scroller-height](#property-36) | 8 | 8 | 0 | 1 | 5 |
| 37 | [letter-spacing](#property-37) | 8 | 6 | 2 | 5 | 1 |
| 38 | [align-content](#property-38) | 7 | 7 | 0 | 3 | 3 |
| 39 | [justify-items](#property-39) | 7 | 5 | 2 | 6 | 2 |
| 40 | [margin-block-start](#property-40) | 7 | 7 | 0 | 5 | 2 |
| 41 | [padding-inline](#property-41) | 7 | 7 | 0 | 4 | 1 |
| 42 | [top](#property-42) | 7 | 5 | 2 | 4 | 3 |
| 43 | [place-content](#property-43) | 6 | 6 | 0 | 1 | 1 |
| 44 | [scroll-margin-block-start](#property-44) | 6 | 0 | 6 | 2 | 2 |
| 45 | [--tp-cursor-size](#property-45) | 5 | 5 | 0 | 1 | 3 |
| 46 | [font](#property-46) | 5 | 1 | 4 | 4 | 2 |
| 47 | [justify-self](#property-47) | 5 | 5 | 0 | 5 | 3 |
| 48 | [margin-block-end](#property-48) | 5 | 5 | 0 | 2 | 2 |
| 49 | [--tp-image-reveal-delay](#property-49) | 4 | 4 | 0 | 1 | 2 |
| 50 | [--tp-mo-border-segment-color](#property-50) | 4 | 4 | 0 | 1 | 2 |
| 51 | [overflow-y](#property-51) | 4 | 4 | 0 | 1 | 1 |
| 52 | [padding-inline-start](#property-52) | 4 | 4 | 0 | 3 | 3 |
| 53 | [--tp-timeline-gap](#property-53) | 3 | 3 | 0 | 1 | 3 |
| 54 | [column-gap](#property-54) | 3 | 3 | 0 | 2 | 2 |
| 55 | [font-variant-numeric](#property-55) | 3 | 3 | 0 | 2 | 1 |
| 56 | [opacity](#property-56) | 3 | 3 | 0 | 3 | 1 |
| 57 | [white-space](#property-57) | 3 | 3 | 0 | 3 | 3 |
| 58 | [--tp-mo-glow-border-colors](#property-58) | 2 | 2 | 0 | 1 | 2 |
| 59 | [--tp-mo-glow-border-fill](#property-59) | 2 | 2 | 0 | 1 | 2 |
| 60 | [--tp-mo-glow-border-loop-delay](#property-60) | 2 | 2 | 0 | 1 | 2 |
| 61 | [flex-direction](#property-61) | 2 | 2 | 0 | 1 | 1 |
| 62 | [max-block-size](#property-62) | 2 | 1 | 1 | 2 | 2 |
| 63 | [--tp-calendar-cell-size](#property-63) | 1 | 1 | 0 | 1 | 1 |
| 64 | [--tp-cursor-blend](#property-64) | 1 | 1 | 0 | 1 | 1 |
| 65 | [--tp-cursor-color](#property-65) | 1 | 1 | 0 | 1 | 1 |
| 66 | [--tp-cursor-opacity](#property-66) | 1 | 1 | 0 | 1 | 1 |
| 67 | [--tp-image-reveal-duration](#property-67) | 1 | 1 | 0 | 1 | 1 |
| 68 | [--tp-image-reveal-easing](#property-68) | 1 | 1 | 0 | 1 | 1 |
| 69 | [--tp-mo-border-segment-width](#property-69) | 1 | 1 | 0 | 1 | 1 |
| 70 | [--tp-mo-glow-border-fade-duration](#property-70) | 1 | 1 | 0 | 1 | 1 |
| 71 | [--tp-mo-glow-border-fade-easing](#property-71) | 1 | 1 | 0 | 1 | 1 |
| 72 | [--tp-mo-glow-border-fade-out-delay](#property-72) | 1 | 1 | 0 | 1 | 1 |
| 73 | [--tp-mo-glow-border-loop-easing](#property-73) | 1 | 1 | 0 | 1 | 1 |
| 74 | [--tp-mo-segment-border-color](#property-74) | 1 | 1 | 0 | 1 | 1 |
| 75 | [--tp-mo-text-stroke-duration](#property-75) | 1 | 1 | 0 | 1 | 1 |
| 76 | [--tp-mo-text-stroke-width](#property-76) | 1 | 1 | 0 | 1 | 1 |
| 77 | [--tp-primary](#property-77) | 1 | 1 | 0 | 1 | 1 |
| 78 | [--tp-primary-foreground](#property-78) | 1 | 1 | 0 | 1 | 1 |
| 79 | [--tp-qr-code-background](#property-79) | 1 | 1 | 0 | 1 | 1 |
| 80 | [--tp-qr-code-foreground](#property-80) | 1 | 1 | 0 | 1 | 1 |
| 81 | [--tp-qr-code-size](#property-81) | 1 | 1 | 0 | 1 | 1 |
| 82 | [--tp-scroll-trigger-pin-length](#property-82) | 1 | 1 | 0 | 1 | 1 |
| 83 | [--tp-shimmer-iterations](#property-83) | 1 | 1 | 0 | 1 | 1 |
| 84 | [--tp-syntax-comment](#property-84) | 1 | 1 | 0 | 1 | 1 |
| 85 | [--tp-syntax-function](#property-85) | 1 | 1 | 0 | 1 | 1 |
| 86 | [--tp-syntax-keyword](#property-86) | 1 | 1 | 0 | 1 | 1 |
| 87 | [--tp-syntax-string](#property-87) | 1 | 1 | 0 | 1 | 1 |
| 88 | [--tp-timeline-item-min-size](#property-88) | 1 | 1 | 0 | 1 | 1 |
| 89 | [--tp-timeline-marker-offset](#property-89) | 1 | 1 | 0 | 1 | 1 |
| 90 | [border-collapse](#property-90) | 1 | 1 | 0 | 1 | 1 |
| 91 | [color-scheme](#property-91) | 1 | 0 | 1 | 1 | 1 |
| 92 | [container-type](#property-92) | 1 | 1 | 0 | 1 | 1 |
| 93 | [field-sizing](#property-93) | 1 | 1 | 0 | 1 | 1 |
| 94 | [filter](#property-94) | 1 | 1 | 0 | 1 | 1 |
| 95 | [flex-wrap](#property-95) | 1 | 1 | 0 | 1 | 1 |
| 96 | [grid-column](#property-96) | 1 | 0 | 1 | 1 | 1 |
| 97 | [isolation](#property-97) | 1 | 1 | 0 | 1 | 1 |
| 98 | [justify-content](#property-98) | 1 | 1 | 0 | 1 | 1 |
| 99 | [list-style](#property-99) | 1 | 1 | 0 | 1 | 1 |
| 100 | [margin-inline-end](#property-100) | 1 | 1 | 0 | 1 | 1 |
| 101 | [max-width](#property-101) | 1 | 0 | 1 | 1 | 1 |
| 102 | [overflow-x](#property-102) | 1 | 1 | 0 | 1 | 1 |
| 103 | [padding-block-end](#property-103) | 1 | 1 | 0 | 1 | 1 |
| 104 | [resize](#property-104) | 1 | 1 | 0 | 1 | 1 |
| 105 | [row-gap](#property-105) | 1 | 1 | 0 | 1 | 1 |
| 106 | [text-underline-offset](#property-106) | 1 | 1 | 0 | 1 | 1 |
| 107 | [width](#property-107) | 1 | 0 | 1 | 1 | 1 |

## Exact occurrences by property

Each row retains the target element, use-case label, exact value and source location. Start at the top and work down.

<a id="property-1"></a>

### 1. color — 266 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-muted-foreground) | 214 |
| transparent | 21 |
| white | 12 |
| inherit | 3 |
| var(--tp-destructive) | 3 |
| var(--tp-background) | 2 |
| var(--tp-primary) | 2 |
| var(--tp-success) | 2 |
| #fafafa | 1 |
| black | 1 |
| var(--tp-chart-1) | 1 |
| var(--tp-chart-2) | 1 |
| var(--tp-chart-3) | 1 |
| var(--tp-foreground) | 1 |
| var(--tp-warning) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/aspect-ratio | Aspect ratio | img | transparent | content appearance — review required | [docs/components/aspect-ratio.mdx:11](../../docs/components/aspect-ratio.mdx#L11) |
| components/aspect-ratio | Common ratios | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/aspect-ratio.mdx:28](../../docs/components/aspect-ratio.mdx#L28) |
| components/aspect-ratio | Common ratios | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/aspect-ratio.mdx:31](../../docs/components/aspect-ratio.mdx#L31) |
| components/aspect-ratio | Common ratios | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/aspect-ratio.mdx:34](../../docs/components/aspect-ratio.mdx#L34) |
| components/aspect-ratio | One ratio, three widths | img | transparent | content appearance — review required | [docs/components/aspect-ratio.mdx:54](../../docs/components/aspect-ratio.mdx#L54) |
| components/aspect-ratio | One ratio, three widths | figcaption | var(--tp-muted-foreground) | content appearance — review required | [docs/components/aspect-ratio.mdx:60](../../docs/components/aspect-ratio.mdx#L60) |
| components/aspect-ratio | One ratio, three widths | img | transparent | content appearance — review required | [docs/components/aspect-ratio.mdx:76](../../docs/components/aspect-ratio.mdx#L76) |
| components/aspect-ratio | One ratio, three widths | figcaption | var(--tp-muted-foreground) | content appearance — review required | [docs/components/aspect-ratio.mdx:82](../../docs/components/aspect-ratio.mdx#L82) |
| components/aspect-ratio | One ratio, three widths | img | transparent | content appearance — review required | [docs/components/aspect-ratio.mdx:98](../../docs/components/aspect-ratio.mdx#L98) |
| components/aspect-ratio | One ratio, three widths | figcaption | var(--tp-muted-foreground) | content appearance — review required | [docs/components/aspect-ratio.mdx:104](../../docs/components/aspect-ratio.mdx#L104) |
| components/aspect-ratio | Cover and contain | img | transparent | content appearance — review required | [docs/components/aspect-ratio.mdx:126](../../docs/components/aspect-ratio.mdx#L126) |
| components/aspect-ratio | Cover and contain | img | transparent | content appearance — review required | [docs/components/aspect-ratio.mdx:129](../../docs/components/aspect-ratio.mdx#L129) |
| components/autocomplete | In a form | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/autocomplete.mdx:240](../../docs/components/autocomplete.mdx#L240) |
| components/avatar | Decorative avatar | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/avatar.mdx:162](../../docs/components/avatar.mdx#L162) |
| components/bubble | Rich content | a | inherit | content appearance — review required | [docs/components/bubble.mdx:112](../../docs/components/bubble.mdx#L112) |
| components/button-group | Select and native select | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/button-group.mdx:258](../../docs/components/button-group.mdx#L258) |
| components/calendar | Week numbers | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/calendar.mdx:162](../../docs/components/calendar.mdx#L162) |
| components/calendar | Value change | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/calendar.mdx:363](../../docs/components/calendar.mdx#L363) |
| components/card | Header action | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/card.mdx:39](../../docs/components/card.mdx#L39) |
| components/card | Small | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/card.mdx:108](../../docs/components/card.mdx#L108) |
| components/carousel | Carousel | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/carousel.mdx:22](../../docs/components/carousel.mdx#L22) |
| components/carousel | Carousel | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/carousel.mdx:35](../../docs/components/carousel.mdx#L35) |
| components/carousel | Carousel | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/carousel.mdx:48](../../docs/components/carousel.mdx#L48) |
| components/carousel | Carousel | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/carousel.mdx:60](../../docs/components/carousel.mdx#L60) |
| components/carousel | Bullets inside | footer | var(--tp-muted-foreground) | content appearance — review required | [docs/components/carousel.mdx:103](../../docs/components/carousel.mdx#L103) |
| components/carousel | Bullets inside | footer | var(--tp-muted-foreground) | content appearance — review required | [docs/components/carousel.mdx:107](../../docs/components/carousel.mdx#L107) |
| components/carousel | Bullets inside | footer | var(--tp-muted-foreground) | content appearance — review required | [docs/components/carousel.mdx:111](../../docs/components/carousel.mdx#L111) |
| components/carousel | Autoplay | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/carousel.mdx:132](../../docs/components/carousel.mdx#L132) |
| components/carousel | Autoplay | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/carousel.mdx:136](../../docs/components/carousel.mdx#L136) |
| components/carousel | Autoplay | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/carousel.mdx:140](../../docs/components/carousel.mdx#L140) |
| components/carousel | Crossfade | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/carousel.mdx:194](../../docs/components/carousel.mdx#L194) |
| components/carousel | Crossfade | tp-stack | var(--tp-background) | component presentation override — review required | [docs/components/carousel.mdx:198](../../docs/components/carousel.mdx#L198) |
| components/carousel | Crossfade | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/carousel.mdx:223](../../docs/components/carousel.mdx#L223) |
| components/carousel | Layered 3D | img | transparent | content appearance — review required | [docs/components/carousel.mdx:255](../../docs/components/carousel.mdx#L255) |
| components/carousel | Layered 3D | figcaption | white | content appearance — review required | [docs/components/carousel.mdx:264](../../docs/components/carousel.mdx#L264) |
| components/carousel | Layered 3D | img | transparent | content appearance — review required | [docs/components/carousel.mdx:291](../../docs/components/carousel.mdx#L291) |
| components/carousel | Layered 3D | figcaption | white | content appearance — review required | [docs/components/carousel.mdx:300](../../docs/components/carousel.mdx#L300) |
| components/carousel | Layered 3D | img | transparent | content appearance — review required | [docs/components/carousel.mdx:327](../../docs/components/carousel.mdx#L327) |
| components/carousel | Layered 3D | figcaption | white | content appearance — review required | [docs/components/carousel.mdx:336](../../docs/components/carousel.mdx#L336) |
| components/carousel | Parallax | img | transparent | content appearance — review required | [docs/components/carousel.mdx:366](../../docs/components/carousel.mdx#L366) |
| components/carousel | Parallax | img | transparent | content appearance — review required | [docs/components/carousel.mdx:369](../../docs/components/carousel.mdx#L369) |
| components/carousel | Parallax | img | transparent | content appearance — review required | [docs/components/carousel.mdx:372](../../docs/components/carousel.mdx#L372) |
| components/carousel | Parallax | img | transparent | content appearance — review required | [docs/components/carousel.mdx:375](../../docs/components/carousel.mdx#L375) |
| components/carousel | Focus | img | transparent | content appearance — review required | [docs/components/carousel.mdx:397](../../docs/components/carousel.mdx#L397) |
| components/carousel | Focus | figcaption | white | content appearance — review required | [docs/components/carousel.mdx:398](../../docs/components/carousel.mdx#L398) |
| components/carousel | Focus | img | transparent | content appearance — review required | [docs/components/carousel.mdx:401](../../docs/components/carousel.mdx#L401) |
| components/carousel | Focus | figcaption | white | content appearance — review required | [docs/components/carousel.mdx:402](../../docs/components/carousel.mdx#L402) |
| components/carousel | Focus | img | transparent | content appearance — review required | [docs/components/carousel.mdx:405](../../docs/components/carousel.mdx#L405) |
| components/carousel | Focus | figcaption | white | content appearance — review required | [docs/components/carousel.mdx:406](../../docs/components/carousel.mdx#L406) |
| components/carousel | Focus | img | transparent | content appearance — review required | [docs/components/carousel.mdx:409](../../docs/components/carousel.mdx#L409) |
| components/carousel | Focus | figcaption | white | content appearance — review required | [docs/components/carousel.mdx:410](../../docs/components/carousel.mdx#L410) |
| components/carousel | Focus | img | transparent | content appearance — review required | [docs/components/carousel.mdx:413](../../docs/components/carousel.mdx#L413) |
| components/carousel | Focus | figcaption | white | content appearance — review required | [docs/components/carousel.mdx:414](../../docs/components/carousel.mdx#L414) |
| components/carousel | Shader transition | img | transparent | content appearance — review required | [docs/components/carousel.mdx:471](../../docs/components/carousel.mdx#L471) |
| components/carousel | Shader transition | figcaption | white | content appearance — review required | [docs/components/carousel.mdx:481](../../docs/components/carousel.mdx#L481) |
| components/carousel | Shader transition | img | transparent | content appearance — review required | [docs/components/carousel.mdx:507](../../docs/components/carousel.mdx#L507) |
| components/carousel | Shader transition | figcaption | white | content appearance — review required | [docs/components/carousel.mdx:517](../../docs/components/carousel.mdx#L517) |
| components/carousel | Shader transition | img | transparent | content appearance — review required | [docs/components/carousel.mdx:543](../../docs/components/carousel.mdx#L543) |
| components/carousel | Shader transition | figcaption | white | content appearance — review required | [docs/components/carousel.mdx:553](../../docs/components/carousel.mdx#L553) |
| components/carousel | Virtual archive with controlled selection | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/carousel.mdx:593](../../docs/components/carousel.mdx#L593) |
| components/carousel | Commit | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/carousel.mdx:664](../../docs/components/carousel.mdx#L664) |
| components/checkbox | Form values | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/checkbox.mdx:48](../../docs/components/checkbox.mdx#L48) |
| components/checkbox | CheckboxGroupController | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/checkbox.mdx:130](../../docs/components/checkbox.mdx#L130) |
| components/collapsible | Positional slots | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/collapsible.mdx:53](../../docs/components/collapsible.mdx#L53) |
| components/collapsible | Positional slots | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/collapsible.mdx:62](../../docs/components/collapsible.mdx#L62) |
| components/collapsible | Positional slots | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/collapsible.mdx:65](../../docs/components/collapsible.mdx#L65) |
| components/collapsible | Open change | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/collapsible.mdx:123](../../docs/components/collapsible.mdx#L123) |
| components/command-palette | Command palette | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/command-palette.mdx:19](../../docs/components/command-palette.mdx#L19) |
| components/copy-button | Beside a value | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/copy-button.mdx:53](../../docs/components/copy-button.mdx#L53) |
| components/copy-button | Beside a value | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/copy-button.mdx:56](../../docs/components/copy-button.mdx#L56) |
| components/copy-button | Copy events | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/copy-button.mdx:120](../../docs/components/copy-button.mdx#L120) |
| components/cursor | Cursor | span | var(--tp-background) | content appearance — review required | [docs/components/cursor.mdx:14](../../docs/components/cursor.mdx#L14) |
| components/cursor | Spring | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/cursor.mdx:47](../../docs/components/cursor.mdx#L47) |
| components/cursor | Spring | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/cursor.mdx:51](../../docs/components/cursor.mdx#L51) |
| components/cursor | Zones | span | black | content appearance — review required | [docs/components/cursor.mdx:72](../../docs/components/cursor.mdx#L72) |
| components/cursor | Zones | div | #fafafa | content appearance — review required | [docs/components/cursor.mdx:73](../../docs/components/cursor.mdx#L73) |
| components/cursor | Zones | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/cursor.mdx:82](../../docs/components/cursor.mdx#L82) |
| components/dialog | Container modality | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/dialog.mdx:92](../../docs/components/dialog.mdx#L92) |
| components/drag-drop-list | Commit events | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/drag-drop-list.mdx:44](../../docs/components/drag-drop-list.mdx#L44) |
| components/drag-drop-list | Custom rows and overlay | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/drag-drop-list.mdx:117](../../docs/components/drag-drop-list.mdx#L117) |
| components/drag-drop-list | Board lanes | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/drag-drop-list.mdx:197](../../docs/components/drag-drop-list.mdx#L197) |
| components/drag-drop-list | Controlled lanes | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/drag-drop-list.mdx:251](../../docs/components/drag-drop-list.mdx#L251) |
| components/drag-drop-list | Approve before committing | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/drag-drop-list.mdx:321](../../docs/components/drag-drop-list.mdx#L321) |
| components/empty-state | Bordered and filled | a | inherit | content appearance — review required | [docs/components/empty-state.mdx:111](../../docs/components/empty-state.mdx#L111) |
| components/field | Slots | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/field.mdx:90](../../docs/components/field.mdx#L90) |
| components/field | Slots | a | inherit | content appearance — review required | [docs/components/field.mdx:92](../../docs/components/field.mdx#L92) |
| components/file-upload | Field and form | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/file-upload.mdx:238](../../docs/components/file-upload.mdx#L238) |
| components/form | Form | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/form.mdx:29](../../docs/components/form.mdx#L29) |
| components/form | Notification settings | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/form.mdx:79](../../docs/components/form.mdx#L79) |
| components/form | Matching passwords | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/form.mdx:147](../../docs/components/form.mdx#L147) |
| components/form | Wait for async checks | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/form.mdx:170](../../docs/components/form.mdx#L170) |
| components/form | Repeated emails | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/form.mdx:211](../../docs/components/form.mdx#L211) |
| components/icon | Icon | tp-stack | var(--tp-muted-foreground) | component presentation override — review required | [docs/components/icon.mdx:9](../../docs/components/icon.mdx#L9) |
| components/icon | Decorative and labelled | tp-icon | var(--tp-success) | component presentation override — review required | [docs/components/icon.mdx:54](../../docs/components/icon.mdx#L54) |
| components/icon | Size and color | tp-icon | var(--tp-muted-foreground) | component presentation override — review required | [docs/components/icon.mdx:76](../../docs/components/icon.mdx#L76) |
| components/icon | Size and color | tp-icon | var(--tp-primary) | component presentation override — review required | [docs/components/icon.mdx:77](../../docs/components/icon.mdx#L77) |
| components/icon | Custom definition | tp-icon | var(--tp-warning) | component presentation override — review required | [docs/components/icon.mdx:95](../../docs/components/icon.mdx#L95) |
| components/image | Fallbacks | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/image.mdx:60](../../docs/components/image.mdx#L60) |
| components/image | Reveal timing and repeat | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/image.mdx:143](../../docs/components/image.mdx#L143) |
| components/image | Headline, group and caption | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/image.mdx:168](../../docs/components/image.mdx#L168) |
| components/input-group | Status addons | tp-icon | var(--tp-success) | component presentation override — review required | [docs/components/input-group.mdx:80](../../docs/components/input-group.mdx#L80) |
| components/list | Header and footer | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/list.mdx:149](../../docs/components/list.mdx#L149) |
| components/list | Header and footer | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/list.mdx:152](../../docs/components/list.mdx#L152) |
| components/list | Recordings | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/list.mdx:236](../../docs/components/list.mdx#L236) |
| components/list | Recordings | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/list.mdx:240](../../docs/components/list.mdx#L240) |
| components/list | Recordings | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/list.mdx:244](../../docs/components/list.mdx#L244) |
| components/list | Recordings | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/list.mdx:254](../../docs/components/list.mdx#L254) |
| components/list | People and invitations | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/list.mdx:350](../../docs/components/list.mdx#L350) |
| components/map | Map | tp-map-pin | var(--tp-chart-1) | component presentation override — review required | [docs/components/map.mdx:20](../../docs/components/map.mdx#L20) |
| components/map | Map | tp-map-pin | var(--tp-chart-2) | component presentation override — review required | [docs/components/map.mdx:30](../../docs/components/map.mdx#L30) |
| components/map | Map | tp-map-pin | var(--tp-chart-3) | component presentation override — review required | [docs/components/map.mdx:40](../../docs/components/map.mdx#L40) |
| components/map | Selected pin | tp-map-pin | var(--tp-primary) | component presentation override — review required | [docs/components/map.mdx:256](../../docs/components/map.mdx#L256) |
| components/map | Status slot | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/map.mdx:364](../../docs/components/map.mdx#L364) |
| components/marker | Native hosts and layout | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/marker.mdx:131](../../docs/components/marker.mdx#L131) |
| components/media-player | Custom top region | tp-stack | white | component presentation override — review required | [docs/components/media-player.mdx:118](../../docs/components/media-player.mdx#L118) |
| components/menu | Handling commands | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/menu.mdx:59](../../docs/components/menu.mdx#L59) |
| components/menu | Context invocation | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/menu.mdx:147](../../docs/components/menu.mdx#L147) |
| components/menubar | Active menu | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/menubar.mdx:111](../../docs/components/menubar.mdx#L111) |
| components/message | Retry a failed message | span | var(--tp-destructive) | content appearance — review required | [docs/components/message.mdx:194](../../docs/components/message.mdx#L194) |
| components/native-select | Form value | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/native-select.mdx:109](../../docs/components/native-select.mdx#L109) |
| components/native-select | Controlled value | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/native-select.mdx:140](../../docs/components/native-select.mdx#L140) |
| components/navigation-menu | Navigation menu | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/navigation-menu.mdx:24](../../docs/components/navigation-menu.mdx#L24) |
| components/navigation-menu | Navigation menu | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/navigation-menu.mdx:32](../../docs/components/navigation-menu.mdx#L32) |
| components/navigation-menu | Navigation menu | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/navigation-menu.mdx:40](../../docs/components/navigation-menu.mdx#L40) |
| components/navigation-menu | Navigation menu | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/navigation-menu.mdx:48](../../docs/components/navigation-menu.mdx#L48) |
| components/navigation-panel | Navigation panel | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/navigation-panel.mdx:64](../../docs/components/navigation-panel.mdx#L64) |
| components/navigation-panel | Off-canvas | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/navigation-panel.mdx:117](../../docs/components/navigation-panel.mdx#L117) |
| components/navigation-panel | Collapsible groups | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/navigation-panel.mdx:165](../../docs/components/navigation-panel.mdx#L165) |
| components/navigation-panel | Drawer mode | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/navigation-panel.mdx:202](../../docs/components/navigation-panel.mdx#L202) |
| components/navigation-panel | Floating | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/navigation-panel.mdx:232](../../docs/components/navigation-panel.mdx#L232) |
| components/navigation-panel | Team switcher and row actions | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/navigation-panel.mdx:308](../../docs/components/navigation-panel.mdx#L308) |
| components/one-time-code-field | Verify on completion | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/one-time-code-field.mdx:95](../../docs/components/one-time-code-field.mdx#L95) |
| components/one-time-code-field | Controlled value | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/one-time-code-field.mdx:129](../../docs/components/one-time-code-field.mdx#L129) |
| components/pagination | Router handling | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/pagination.mdx:33](../../docs/components/pagination.mdx#L33) |
| components/pagination | Rows per page | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/pagination.mdx:121](../../docs/components/pagination.mdx#L121) |
| components/popover | Separate anchor | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/popover.mdx:131](../../docs/components/popover.mdx#L131) |
| components/popover | Open change | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/popover.mdx:159](../../docs/components/popover.mdx#L159) |
| components/preview-card | Preview Card | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/preview-card.mdx:17](../../docs/components/preview-card.mdx#L17) |
| components/preview-card | Preview Card | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/preview-card.mdx:18](../../docs/components/preview-card.mdx#L18) |
| components/preview-card | Delays | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/preview-card.mdx:49](../../docs/components/preview-card.mdx#L49) |
| components/preview-card | Placement and arrow | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/preview-card.mdx:66](../../docs/components/preview-card.mdx#L66) |
| components/preview-card | Placement and arrow | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/preview-card.mdx:69](../../docs/components/preview-card.mdx#L69) |
| components/preview-card | Not hoverable | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/preview-card.mdx:86](../../docs/components/preview-card.mdx#L86) |
| components/questionnaire | Submit | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/questionnaire.mdx:282](../../docs/components/questionnaire.mdx#L282) |
| components/questionnaire | Checkpoint and cross-answer validation | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/questionnaire.mdx:315](../../docs/components/questionnaire.mdx#L315) |
| components/questionnaire | Clarification dialog | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/questionnaire.mdx:611](../../docs/components/questionnaire.mdx#L611) |
| components/radio-group | Value change | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/radio-group.mdx:164](../../docs/components/radio-group.mdx#L164) |
| components/resizable-panel-group | Resizable Panel Group | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/resizable-panel-group.mdx:15](../../docs/components/resizable-panel-group.mdx#L15) |
| components/resizable-panel-group | Resizable Panel Group | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/resizable-panel-group.mdx:16](../../docs/components/resizable-panel-group.mdx#L16) |
| components/resizable-panel-group | Resizable Panel Group | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/resizable-panel-group.mdx:17](../../docs/components/resizable-panel-group.mdx#L17) |
| components/resizable-panel-group | Resizable Panel Group | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/resizable-panel-group.mdx:26](../../docs/components/resizable-panel-group.mdx#L26) |
| components/resizable-panel-group | Resizable Panel Group | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/resizable-panel-group.mdx:32](../../docs/components/resizable-panel-group.mdx#L32) |
| components/resizable-panel-group | Bounds | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/resizable-panel-group.mdx:58](../../docs/components/resizable-panel-group.mdx#L58) |
| components/resizable-panel-group | Bounds | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/resizable-panel-group.mdx:62](../../docs/components/resizable-panel-group.mdx#L62) |
| components/resizable-panel-group | Vertical | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/resizable-panel-group.mdx:80](../../docs/components/resizable-panel-group.mdx#L80) |
| components/resizable-panel-group | Layout events | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/resizable-panel-group.mdx:149](../../docs/components/resizable-panel-group.mdx#L149) |
| components/resizable-panel-group | Persisted sizes | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/resizable-panel-group.mdx:238](../../docs/components/resizable-panel-group.mdx#L238) |
| components/resizable-panel-group | Disabled | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/resizable-panel-group.mdx:276](../../docs/components/resizable-panel-group.mdx#L276) |
| components/scroll-area | Both axes | tr | var(--tp-muted-foreground) | content appearance — review required | [docs/components/scroll-area.mdx:89](../../docs/components/scroll-area.mdx#L89) |
| components/scroll-trigger | Scroll Trigger | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/scroll-trigger.mdx:22](../../docs/components/scroll-trigger.mdx#L22) |
| components/scroll-trigger | Replay on entry | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/scroll-trigger.mdx:61](../../docs/components/scroll-trigger.mdx#L61) |
| components/scroll-trigger | Replay on entry | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/scroll-trigger.mdx:64](../../docs/components/scroll-trigger.mdx#L64) |
| components/scroll-trigger | Pinned scene | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/scroll-trigger.mdx:210](../../docs/components/scroll-trigger.mdx#L210) |
| components/scroll-trigger | Pinned scene | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/scroll-trigger.mdx:217](../../docs/components/scroll-trigger.mdx#L217) |
| components/scroll-trigger | Pinned scene | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/scroll-trigger.mdx:218](../../docs/components/scroll-trigger.mdx#L218) |
| components/scroll-trigger | Reveal events | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/scroll-trigger.mdx:242](../../docs/components/scroll-trigger.mdx#L242) |
| components/scroll-trigger | Reveal events | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/scroll-trigger.mdx:246](../../docs/components/scroll-trigger.mdx#L246) |
| components/select | Value change | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/select.mdx:313](../../docs/components/select.mdx#L313) |
| components/separator | Separator | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/separator.mdx:14](../../docs/components/separator.mdx#L14) |
| components/slider | Change and commit | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/slider.mdx:343](../../docs/components/slider.mdx#L343) |
| components/slider | Rejecting values | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/slider.mdx:380](../../docs/components/slider.mdx#L380) |
| components/spinner | Spinner | tp-stack | var(--tp-muted-foreground) | component presentation override — review required | [docs/components/spinner.mdx:9](../../docs/components/spinner.mdx#L9) |
| components/switch | Thumb icon | tp-icon | var(--tp-foreground) | component presentation override — review required | [docs/components/switch.mdx:167](../../docs/components/switch.mdx#L167) |
| components/tabs | Change event and setValue | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/tabs.mdx:129](../../docs/components/tabs.mdx#L129) |
| components/tabs | Controlled with a veto | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/tabs.mdx:183](../../docs/components/tabs.mdx#L183) |
| components/text-area | Character count | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/text-area.mdx:93](../../docs/components/text-area.mdx#L93) |
| components/text-transform | Text transform | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/text-transform.mdx:12](../../docs/components/text-transform.mdx#L12) |
| components/text-transform | Text transform | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/text-transform.mdx:14](../../docs/components/text-transform.mdx#L14) |
| components/text-transform | Text transform | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/text-transform.mdx:16](../../docs/components/text-transform.mdx#L16) |
| components/text-transform | Text transform | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/text-transform.mdx:18](../../docs/components/text-transform.mdx#L18) |
| components/text-transform | Text transform | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/text-transform.mdx:20](../../docs/components/text-transform.mdx#L20) |
| components/text-transform | Case and identifiers | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/text-transform.mdx:36](../../docs/components/text-transform.mdx#L36) |
| components/text-transform | Case and identifiers | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/text-transform.mdx:37](../../docs/components/text-transform.mdx#L37) |
| components/text-transform | Case and identifiers | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/text-transform.mdx:38](../../docs/components/text-transform.mdx#L38) |
| components/text-transform | Case and identifiers | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/text-transform.mdx:39](../../docs/components/text-transform.mdx#L39) |
| components/text-transform | Case and identifiers | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/text-transform.mdx:40](../../docs/components/text-transform.mdx#L40) |
| components/text-transform | Case and identifiers | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/text-transform.mdx:41](../../docs/components/text-transform.mdx#L41) |
| components/text-transform | Uploads | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/text-transform.mdx:97](../../docs/components/text-transform.mdx#L97) |
| components/text-transform | Uploads | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/text-transform.mdx:101](../../docs/components/text-transform.mdx#L101) |
| components/theme-switcher | Explicit choices only | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/theme-switcher.mdx:119](../../docs/components/theme-switcher.mdx#L119) |
| components/time | Time | tp-time | var(--tp-muted-foreground) | component presentation override — review required | [docs/components/time.mdx:17](../../docs/components/time.mdx#L17) |
| components/time | Time | tp-time | var(--tp-muted-foreground) | component presentation override — review required | [docs/components/time.mdx:23](../../docs/components/time.mdx#L23) |
| components/time | Time | tp-time | var(--tp-muted-foreground) | component presentation override — review required | [docs/components/time.mdx:29](../../docs/components/time.mdx#L29) |
| components/time | Modes | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/time.mdx:56](../../docs/components/time.mdx#L56) |
| components/time | Modes | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/time.mdx:57](../../docs/components/time.mdx#L57) |
| components/time | Modes | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/time.mdx:58](../../docs/components/time.mdx#L58) |
| components/time | Modes | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/time.mdx:59](../../docs/components/time.mdx#L59) |
| components/time | Due dates | span | var(--tp-destructive) | content appearance — review required | [docs/components/time.mdx:132](../../docs/components/time.mdx#L132) |
| components/time | Calendar | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/time.mdx:148](../../docs/components/time.mdx#L148) |
| components/time | Calendar | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/time.mdx:149](../../docs/components/time.mdx#L149) |
| components/time | Calendar | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/time.mdx:150](../../docs/components/time.mdx#L150) |
| components/time | Calendar | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/time.mdx:151](../../docs/components/time.mdx#L151) |
| components/time | Precisions | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/time.mdx:188](../../docs/components/time.mdx#L188) |
| components/time | Precisions | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/time.mdx:189](../../docs/components/time.mdx#L189) |
| components/time | Precisions | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/time.mdx:190](../../docs/components/time.mdx#L190) |
| components/time | Precisions | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/time.mdx:191](../../docs/components/time.mdx#L191) |
| components/time | Precisions | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/time.mdx:192](../../docs/components/time.mdx#L192) |
| components/time | Timers | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/time.mdx:203](../../docs/components/time.mdx#L203) |
| components/time | Timers | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/time.mdx:204](../../docs/components/time.mdx#L204) |
| components/time | Timers | dt | var(--tp-muted-foreground) | content appearance — review required | [docs/components/time.mdx:205](../../docs/components/time.mdx#L205) |
| components/timeline | Timeline | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:15](../../docs/components/timeline.mdx#L15) |
| components/timeline | Timeline | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:19](../../docs/components/timeline.mdx#L19) |
| components/timeline | Timeline | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:23](../../docs/components/timeline.mdx#L23) |
| components/timeline | Timeline | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:27](../../docs/components/timeline.mdx#L27) |
| components/timeline | Step tracker | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:49](../../docs/components/timeline.mdx#L49) |
| components/timeline | Step tracker | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:50](../../docs/components/timeline.mdx#L50) |
| components/timeline | Step tracker | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:51](../../docs/components/timeline.mdx#L51) |
| components/timeline | Step tracker | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:52](../../docs/components/timeline.mdx#L52) |
| components/timeline | Roadmap | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:64](../../docs/components/timeline.mdx#L64) |
| components/timeline | Roadmap | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:66](../../docs/components/timeline.mdx#L66) |
| components/timeline | Roadmap | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:69](../../docs/components/timeline.mdx#L69) |
| components/timeline | Roadmap | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:71](../../docs/components/timeline.mdx#L71) |
| components/timeline | Roadmap | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:74](../../docs/components/timeline.mdx#L74) |
| components/timeline | Roadmap | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:76](../../docs/components/timeline.mdx#L76) |
| components/timeline | Roadmap | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:79](../../docs/components/timeline.mdx#L79) |
| components/timeline | Roadmap | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:81](../../docs/components/timeline.mdx#L81) |
| components/timeline | Roadmap | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:84](../../docs/components/timeline.mdx#L84) |
| components/timeline | Roadmap | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:86](../../docs/components/timeline.mdx#L86) |
| components/timeline | Roadmap | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:89](../../docs/components/timeline.mdx#L89) |
| components/timeline | Roadmap | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:91](../../docs/components/timeline.mdx#L91) |
| components/timeline | Numbered steps | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:109](../../docs/components/timeline.mdx#L109) |
| components/timeline | Numbered steps | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:114](../../docs/components/timeline.mdx#L114) |
| components/timeline | Numbered steps | p | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:119](../../docs/components/timeline.mdx#L119) |
| components/timeline | Expandable phases | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:136](../../docs/components/timeline.mdx#L136) |
| components/timeline | Expandable phases | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:143](../../docs/components/timeline.mdx#L143) |
| components/timeline | Expandable phases | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:149](../../docs/components/timeline.mdx#L149) |
| components/timeline | Expandable phases | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:156](../../docs/components/timeline.mdx#L156) |
| components/timeline | Expandable phases | span | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:162](../../docs/components/timeline.mdx#L162) |
| components/timeline | Changelog | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:211](../../docs/components/timeline.mdx#L211) |
| components/timeline | Changelog | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:221](../../docs/components/timeline.mdx#L221) |
| components/timeline | Changelog | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:228](../../docs/components/timeline.mdx#L228) |
| components/timeline | Explicit status | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:244](../../docs/components/timeline.mdx#L244) |
| components/timeline | Explicit status | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:245](../../docs/components/timeline.mdx#L245) |
| components/timeline | Explicit status | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:246](../../docs/components/timeline.mdx#L246) |
| components/timeline | Explicit status | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/timeline.mdx:247](../../docs/components/timeline.mdx#L247) |
| components/toggle-group | Required choice | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/toggle-group.mdx:151](../../docs/components/toggle-group.mdx#L151) |
| components/toggle | Change events | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/toggle.mdx:137](../../docs/components/toggle.mdx#L137) |
| components/tooltip | Cursor tracking | div | var(--tp-muted-foreground) | content appearance — review required | [docs/components/tooltip.mdx:69](../../docs/components/tooltip.mdx#L69) |
| components/tree-view | Opening items | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/tree-view.mdx:99](../../docs/components/tree-view.mdx#L99) |
| components/tree-view | Rendered rows | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/tree-view.mdx:182](../../docs/components/tree-view.mdx#L182) |
| components/tree-view | Controlled lanes | output | var(--tp-muted-foreground) | content appearance — review required | [docs/components/tree-view.mdx:271](../../docs/components/tree-view.mdx#L271) |
| motion/surface/glow-border | Custom colors | span | var(--tp-muted-foreground) | content appearance — review required | [docs/motion/surface/glow-border.mdx:145](../../docs/motion/surface/glow-border.mdx#L145) |
| widgets/color-picker | Popup in a form | output | var(--tp-muted-foreground) | content appearance — review required | [docs/widgets/color-picker.mdx:66](../../docs/widgets/color-picker.mdx#L66) |
| widgets/color-picker | Commit events | output | var(--tp-muted-foreground) | content appearance — review required | [docs/widgets/color-picker.mdx:208](../../docs/widgets/color-picker.mdx#L208) |
| widgets/easing-editor | Commit and veto | output | var(--tp-muted-foreground) | content appearance — review required | [docs/widgets/easing-editor.mdx:141](../../docs/widgets/easing-editor.mdx#L141) |
| widgets/easing-editor | Controlled owner | code | var(--tp-muted-foreground) | content appearance — review required | [docs/widgets/easing-editor.mdx:165](../../docs/widgets/easing-editor.mdx#L165) |
| widgets/emoji-picker | Picks | output | var(--tp-muted-foreground) | content appearance — review required | [docs/widgets/emoji-picker.mdx:28](../../docs/widgets/emoji-picker.mdx#L28) |
| widgets/emoji-picker | Remembered tone | output | var(--tp-muted-foreground) | content appearance — review required | [docs/widgets/emoji-picker.mdx:87](../../docs/widgets/emoji-picker.mdx#L87) |
| widgets/emoji-picker | Popup in a form | output | var(--tp-muted-foreground) | content appearance — review required | [docs/widgets/emoji-picker.mdx:214](../../docs/widgets/emoji-picker.mdx#L214) |
| widgets/flow | Automatic layout | output | var(--tp-muted-foreground) | content appearance — review required | [docs/widgets/flow.mdx:333](../../docs/widgets/flow.mdx#L333) |
| widgets/flow | Commit and selection | output | var(--tp-muted-foreground) | content appearance — review required | [docs/widgets/flow.mdx:409](../../docs/widgets/flow.mdx#L409) |
| widgets/flow | Controlled owner | output | var(--tp-muted-foreground) | content appearance — review required | [docs/widgets/flow.mdx:453](../../docs/widgets/flow.mdx#L453) |
| widgets/flow | In a form | output | var(--tp-muted-foreground) | content appearance — review required | [docs/widgets/flow.mdx:712](../../docs/widgets/flow.mdx#L712) |
| widgets/text-editor | In a form | output | var(--tp-muted-foreground) | content appearance — review required | [docs/widgets/text-editor.mdx:576](../../docs/widgets/text-editor.mdx#L576) |
| compositions/message.examples | Actions | span | var(--tp-destructive) | content appearance — review required | [src/stories/message.examples.ts:136](../../src/stories/message.examples.ts#L136) |
| components/scroll-trigger | (file/setup/shared helper) | p | var(--tp-muted-foreground) | content appearance — review required | [src/stories/scroll-trigger.stories.ts:30](../../src/stories/scroll-trigger.stories.ts#L30) |

<a id="property-2"></a>

### 2. inline-size — 237 occurrences

| Value | Occurrences |
| --- | ---: |
| 100% | 109 |
| fit-content | 13 |
| 18rem | 10 |
| 15rem | 7 |
| 60% | 7 |
| 10rem | 6 |
| 90% | 6 |
| 12rem | 5 |
| 45% | 5 |
| 80% | 5 |
| 32rem | 4 |
| 36rem | 4 |
| calc(var(--tp-spacing) * 20) | 4 |
| 16rem | 3 |
| 20rem | 3 |
| calc(var(--tp-spacing) * 16) | 3 |
| calc(var(--tp-spacing) * 25) | 3 |
| calc(var(--tp-spacing) * 38) | 3 |
| var(--tp-space-10) | 3 |
| 14rem | 2 |
| 22rem | 2 |
| 24rem | 2 |
| 28rem | 2 |
| 6rem | 2 |
| calc(var(--tp-spacing) * 24) | 2 |
| min(100%, 22rem) | 2 |
| min(100%, 24rem) | 2 |
| min(100%, 26rem) | 2 |
| 4.5rem | 1 |
| 40% | 1 |
| 4rem | 1 |
| 50% | 1 |
| 5rem | 1 |
| 66% | 1 |
| 75% | 1 |
| 85% | 1 |
| 8rem | 1 |
| auto | 1 |
| calc(var(--tp-spacing) * 28) | 1 |
| calc(var(--tp-spacing) * 60) | 1 |
| max-content | 1 |
| min(100%, 20rem) | 1 |
| var(--tp-icon-size-sm) | 1 |
| var(--tp-space-2) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/aspect-ratio | Aspect ratio | tp-aspect-ratio | 100% | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:10](../../docs/components/aspect-ratio.mdx#L10) |
| components/aspect-ratio | Common ratios | div | 100% | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:28](../../docs/components/aspect-ratio.mdx#L28) |
| components/aspect-ratio | Common ratios | div | 100% | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:31](../../docs/components/aspect-ratio.mdx#L31) |
| components/aspect-ratio | Common ratios | div | 100% | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:34](../../docs/components/aspect-ratio.mdx#L34) |
| components/aspect-ratio | One ratio, three widths | figure | 10rem | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:47](../../docs/components/aspect-ratio.mdx#L47) |
| components/aspect-ratio | One ratio, three widths | figure | 15rem | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:69](../../docs/components/aspect-ratio.mdx#L69) |
| components/aspect-ratio | One ratio, three widths | figure | 20rem | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:91](../../docs/components/aspect-ratio.mdx#L91) |
| components/attachment | Image cards | div | 100% | layout/geometry — minimize | [docs/components/attachment.mdx:89](../../docs/components/attachment.mdx#L89) |
| components/attachment | Image cards | div | 100% | layout/geometry — minimize | [docs/components/attachment.mdx:92](../../docs/components/attachment.mdx#L92) |
| components/attachment | Image cards | div | 100% | layout/geometry — minimize | [docs/components/attachment.mdx:95](../../docs/components/attachment.mdx#L95) |
| components/attachment | Image cards | div | 100% | layout/geometry — minimize | [docs/components/attachment.mdx:98](../../docs/components/attachment.mdx#L98) |
| components/attachment | Scrollable groups | tp-stack | 100% | layout/geometry — minimize | [docs/components/attachment.mdx:110](../../docs/components/attachment.mdx#L110) |
| components/attachment | Scrollable groups | div | 100% | layout/geometry — minimize | [docs/components/attachment.mdx:192](../../docs/components/attachment.mdx#L192) |
| components/attachment | Scrollable groups | div | 100% | layout/geometry — minimize | [docs/components/attachment.mdx:256](../../docs/components/attachment.mdx#L256) |
| components/autocomplete | Autocomplete | tp-autocomplete | 100% | layout/geometry — minimize | [docs/components/autocomplete.mdx:12](../../docs/components/autocomplete.mdx#L12) |
| components/autocomplete | Prefix matching | tp-autocomplete | 100% | layout/geometry — minimize | [docs/components/autocomplete.mdx:39](../../docs/components/autocomplete.mdx#L39) |
| components/autocomplete | Grouped suggestions | tp-autocomplete | 100% | layout/geometry — minimize | [docs/components/autocomplete.mdx:61](../../docs/components/autocomplete.mdx#L61) |
| components/autocomplete | Inline completion | tp-autocomplete | 100% | layout/geometry — minimize | [docs/components/autocomplete.mdx:85](../../docs/components/autocomplete.mdx#L85) |
| components/autocomplete | Searching hidden fields | tp-autocomplete | 100% | layout/geometry — minimize | [docs/components/autocomplete.mdx:104](../../docs/components/autocomplete.mdx#L104) |
| components/autocomplete | Ranking over several fields | tp-autocomplete | 100% | layout/geometry — minimize | [docs/components/autocomplete.mdx:127](../../docs/components/autocomplete.mdx#L127) |
| components/autocomplete | Search source | tp-autocomplete | 100% | layout/geometry — minimize | [docs/components/autocomplete.mdx:157](../../docs/components/autocomplete.mdx#L157) |
| components/autocomplete | In a form | tp-autocomplete | 100% | layout/geometry — minimize | [docs/components/autocomplete.mdx:226](../../docs/components/autocomplete.mdx#L226) |
| components/breadcrumb | Long trail | div | 100% | layout/geometry — minimize | [docs/components/breadcrumb.mdx:177](../../docs/components/breadcrumb.mdx#L177) |
| components/button-group | Steppers, labels and counts | tp-input | 5rem | layout/geometry — minimize | [docs/components/button-group.mdx:116](../../docs/components/button-group.mdx#L116) |
| components/calendar | Calendar | tp-card | fit-content | layout/geometry — minimize | [docs/components/calendar.mdx:9](../../docs/components/calendar.mdx#L9) |
| components/calendar | Range | tp-card | fit-content | layout/geometry — minimize | [docs/components/calendar.mdx:24](../../docs/components/calendar.mdx#L24) |
| components/calendar | Multiple | tp-card | fit-content | layout/geometry — minimize | [docs/components/calendar.mdx:43](../../docs/components/calendar.mdx#L43) |
| components/calendar | Bookable dates | tp-card | fit-content | layout/geometry — minimize | [docs/components/calendar.mdx:60](../../docs/components/calendar.mdx#L60) |
| components/calendar | Nightly prices and booked dates | tp-card | fit-content | layout/geometry — minimize | [docs/components/calendar.mdx:83](../../docs/components/calendar.mdx#L83) |
| components/calendar | Dropdown caption | tp-card | fit-content | layout/geometry — minimize | [docs/components/calendar.mdx:138](../../docs/components/calendar.mdx#L138) |
| components/calendar | Week numbers | tp-card | fit-content | layout/geometry — minimize | [docs/components/calendar.mdx:153](../../docs/components/calendar.mdx#L153) |
| components/calendar | Quick picks | tp-card | fit-content | layout/geometry — minimize | [docs/components/calendar.mdx:175](../../docs/components/calendar.mdx#L175) |
| components/calendar | Date with start and end times | tp-card | fit-content | layout/geometry — minimize | [docs/components/calendar.mdx:223](../../docs/components/calendar.mdx#L223) |
| components/calendar | Date with start and end times | div | 100% | layout/geometry — minimize | [docs/components/calendar.mdx:225](../../docs/components/calendar.mdx#L225) |
| components/calendar | French and Brazilian Portuguese | tp-card | fit-content | layout/geometry — minimize | [docs/components/calendar.mdx:245](../../docs/components/calendar.mdx#L245) |
| components/calendar | French and Brazilian Portuguese | tp-card | fit-content | layout/geometry — minimize | [docs/components/calendar.mdx:254](../../docs/components/calendar.mdx#L254) |
| components/calendar | Arabic, right to left | tp-card | fit-content | layout/geometry — minimize | [docs/components/calendar.mdx:289](../../docs/components/calendar.mdx#L289) |
| components/calendar | Value change | tp-card | fit-content | layout/geometry — minimize | [docs/components/calendar.mdx:351](../../docs/components/calendar.mdx#L351) |
| components/carousel | Layered 3D | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:255](../../docs/components/carousel.mdx#L255) |
| components/carousel | Layered 3D | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:291](../../docs/components/carousel.mdx#L291) |
| components/carousel | Layered 3D | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:327](../../docs/components/carousel.mdx#L327) |
| components/carousel | Parallax | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:366](../../docs/components/carousel.mdx#L366) |
| components/carousel | Parallax | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:369](../../docs/components/carousel.mdx#L369) |
| components/carousel | Parallax | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:372](../../docs/components/carousel.mdx#L372) |
| components/carousel | Parallax | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:375](../../docs/components/carousel.mdx#L375) |
| components/carousel | Focus | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:397](../../docs/components/carousel.mdx#L397) |
| components/carousel | Focus | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:401](../../docs/components/carousel.mdx#L401) |
| components/carousel | Focus | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:405](../../docs/components/carousel.mdx#L405) |
| components/carousel | Focus | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:409](../../docs/components/carousel.mdx#L409) |
| components/carousel | Focus | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:413](../../docs/components/carousel.mdx#L413) |
| components/carousel | Shader transition | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:471](../../docs/components/carousel.mdx#L471) |
| components/carousel | Shader transition | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:507](../../docs/components/carousel.mdx#L507) |
| components/carousel | Shader transition | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:543](../../docs/components/carousel.mdx#L543) |
| components/cursor | Cursor | span | 4.5rem | layout/geometry — minimize | [docs/components/cursor.mdx:14](../../docs/components/cursor.mdx#L14) |
| components/cursor | Zones | span | 4rem | layout/geometry — minimize | [docs/components/cursor.mdx:72](../../docs/components/cursor.mdx#L72) |
| components/cursor | Dot and ring | span | var(--tp-space-2) | layout/geometry — minimize | [docs/components/cursor.mdx:136](../../docs/components/cursor.mdx#L136) |
| components/description-list | Alignment and stacking | tp-description-list | 20rem | layout/geometry — minimize | [docs/components/description-list.mdx:115](../../docs/components/description-list.mdx#L115) |
| components/description-list | Alignment and stacking | tp-description-list | 14rem | layout/geometry — minimize | [docs/components/description-list.mdx:121](../../docs/components/description-list.mdx#L121) |
| components/dialog | Container modality | section | 100% | layout/geometry — minimize | [docs/components/dialog.mdx:82](../../docs/components/dialog.mdx#L82) |
| components/empty-state | No results | tp-input-group | 100% | layout/geometry — minimize | [docs/components/empty-state.mdx:71](../../docs/components/empty-state.mdx#L71) |
| components/image | Ratio and fit | div | 100% | layout/geometry — minimize | [docs/components/image.mdx:36](../../docs/components/image.mdx#L36) |
| components/image | Fallbacks | span | 100% | layout/geometry — minimize | [docs/components/image.mdx:60](../../docs/components/image.mdx#L60) |
| components/image | Loading placeholders | img | 100% | layout/geometry — minimize | [docs/components/image.mdx:74](../../docs/components/image.mdx#L74) |
| components/image | Reveal timing and repeat | div | 100% | layout/geometry — minimize | [docs/components/image.mdx:137](../../docs/components/image.mdx#L137) |
| components/image | Parallax in a scroller | div | 100% | layout/geometry — minimize | [docs/components/image.mdx:186](../../docs/components/image.mdx#L186) |
| components/image | Horizontal strip | div | 100% | layout/geometry — minimize | [docs/components/image.mdx:259](../../docs/components/image.mdx#L259) |
| components/image | Smoothing | div | 100% | layout/geometry — minimize | [docs/components/image.mdx:272](../../docs/components/image.mdx#L272) |
| components/input-group | Button group composition | tp-button-group | 100% | layout/geometry — minimize | [docs/components/input-group.mdx:147](../../docs/components/input-group.mdx#L147) |
| components/input-group | Button group composition | tp-button-group | 100% | layout/geometry — minimize | [docs/components/input-group.mdx:157](../../docs/components/input-group.mdx#L157) |
| components/input-group | Native textarea | textarea | 100% | layout/geometry — minimize | [docs/components/input-group.mdx:252](../../docs/components/input-group.mdx#L252) |
| components/list | Card grid | tp-list | 100% | layout/geometry — minimize | [docs/components/list.mdx:161](../../docs/components/list.mdx#L161) |
| components/list | Card grid | tp-aspect-ratio | 100% | layout/geometry — minimize | [docs/components/list.mdx:163](../../docs/components/list.mdx#L163) |
| components/list | Card grid | tp-aspect-ratio | 100% | layout/geometry — minimize | [docs/components/list.mdx:167](../../docs/components/list.mdx#L167) |
| components/list | Card grid | tp-aspect-ratio | 100% | layout/geometry — minimize | [docs/components/list.mdx:171](../../docs/components/list.mdx#L171) |
| components/markdown | Streaming | tp-markdown | 100% | layout/geometry — minimize | [docs/components/markdown.mdx:137](../../docs/components/markdown.mdx#L137) |
| components/marker | Native hosts and layout | tp-icon | var(--tp-icon-size-sm) | layout/geometry — minimize | [docs/components/marker.mdx:126](../../docs/components/marker.mdx#L126) |
| components/menu | Context invocation | div | 28rem | layout/geometry — minimize | [docs/components/menu.mdx:147](../../docs/components/menu.mdx#L147) |
| components/message-scroller | Streaming | tp-stack | 100% | layout/geometry — minimize | [docs/components/message-scroller.mdx:71](../../docs/components/message-scroller.mdx#L71) |
| components/message-scroller | Join marker as anchor | tp-stack | 100% | layout/geometry — minimize | [docs/components/message-scroller.mdx:167](../../docs/components/message-scroller.mdx#L167) |
| components/message-scroller | Commands | tp-stack | 100% | layout/geometry — minimize | [docs/components/message-scroller.mdx:243](../../docs/components/message-scroller.mdx#L243) |
| components/message-scroller | Outline and edges | div | 100% | layout/geometry — minimize | [docs/components/message-scroller.mdx:316](../../docs/components/message-scroller.mdx#L316) |
| components/message-scroller | Prepend history | tp-stack | 100% | layout/geometry — minimize | [docs/components/message-scroller.mdx:423](../../docs/components/message-scroller.mdx#L423) |
| components/message-scroller | Animated send | tp-stack | 100% | layout/geometry — minimize | [docs/components/message-scroller.mdx:502](../../docs/components/message-scroller.mdx#L502) |
| components/overflow-list | Row limit | tp-resizable-panel-group | 100% | layout/geometry — minimize | [docs/components/overflow-list.mdx:50](../../docs/components/overflow-list.mdx#L50) |
| components/overflow-list | In a table | div | 100% | layout/geometry — minimize | [docs/components/overflow-list.mdx:86](../../docs/components/overflow-list.mdx#L86) |
| components/overflow-list | Custom count | div | 100% | layout/geometry — minimize | [docs/components/overflow-list.mdx:140](../../docs/components/overflow-list.mdx#L140) |
| components/progress | Import | tp-progress | 100% | layout/geometry — minimize | [docs/components/progress.mdx:74](../../docs/components/progress.mdx#L74) |
| components/qr-code | Live value | tp-field | 100% | layout/geometry — minimize | [docs/components/qr-code.mdx:73](../../docs/components/qr-code.mdx#L73) |
| components/questionnaire | Resume a draft | tp-questionnaire | 100% | layout/geometry — minimize | [docs/components/questionnaire.mdx:143](../../docs/components/questionnaire.mdx#L143) |
| components/resizable-panel-group | Collapsible sidebar | tp-resizable-panel-group | 100% | layout/geometry — minimize | [docs/components/resizable-panel-group.mdx:97](../../docs/components/resizable-panel-group.mdx#L97) |
| components/scroll-area | Scroll Area | tp-scroll-area | 16rem | layout/geometry — minimize | [docs/components/scroll-area.mdx:9](../../docs/components/scroll-area.mdx#L9) |
| components/scroll-area | Horizontal | tp-stack | max-content | layout/geometry — minimize | [docs/components/scroll-area.mdx:59](../../docs/components/scroll-area.mdx#L59) |
| components/scroll-area | Horizontal | tp-card | 10rem | layout/geometry — minimize | [docs/components/scroll-area.mdx:60](../../docs/components/scroll-area.mdx#L60) |
| components/scroll-area | Horizontal | tp-card | 10rem | layout/geometry — minimize | [docs/components/scroll-area.mdx:63](../../docs/components/scroll-area.mdx#L63) |
| components/scroll-area | Horizontal | tp-card | 10rem | layout/geometry — minimize | [docs/components/scroll-area.mdx:66](../../docs/components/scroll-area.mdx#L66) |
| components/scroll-area | Horizontal | tp-card | 10rem | layout/geometry — minimize | [docs/components/scroll-area.mdx:69](../../docs/components/scroll-area.mdx#L69) |
| components/scroll-area | Horizontal | tp-card | 10rem | layout/geometry — minimize | [docs/components/scroll-area.mdx:72](../../docs/components/scroll-area.mdx#L72) |
| components/scroll-area | Visibility | tp-scroll-area | 12rem | layout/geometry — minimize | [docs/components/scroll-area.mdx:120](../../docs/components/scroll-area.mdx#L120) |
| components/scroll-area | Visibility | tp-scroll-area | 12rem | layout/geometry — minimize | [docs/components/scroll-area.mdx:139](../../docs/components/scroll-area.mdx#L139) |
| components/scroll-area | Edge fade | tp-scroll-area | 18rem | layout/geometry — minimize | [docs/components/scroll-area.mdx:169](../../docs/components/scroll-area.mdx#L169) |
| components/scroll-trigger | Replay on entry | div | 100% | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:60](../../docs/components/scroll-trigger.mdx#L60) |
| components/scroll-trigger | Scrubbed band | div | 100% | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:78](../../docs/components/scroll-trigger.mdx#L78) |
| components/scroll-trigger | Scrubbed band | tp-skeleton | 45% | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:92](../../docs/components/scroll-trigger.mdx#L92) |
| components/scroll-trigger | Scrubbed band | tp-skeleton | 90% | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:93](../../docs/components/scroll-trigger.mdx#L93) |
| components/scroll-trigger | Scrubbed band | tp-skeleton | 80% | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:116](../../docs/components/scroll-trigger.mdx#L116) |
| components/scroll-trigger | Scrubbed band | tp-skeleton | 60% | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:118](../../docs/components/scroll-trigger.mdx#L118) |
| components/scroll-trigger | Custom scroll range | div | 100% | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:131](../../docs/components/scroll-trigger.mdx#L131) |
| components/scroll-trigger | Custom scroll range | tp-skeleton | 45% | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:145](../../docs/components/scroll-trigger.mdx#L145) |
| components/scroll-trigger | Custom scroll range | tp-skeleton | 90% | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:146](../../docs/components/scroll-trigger.mdx#L146) |
| components/scroll-trigger | Custom scroll range | tp-skeleton | 80% | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:191](../../docs/components/scroll-trigger.mdx#L191) |
| components/scroll-trigger | Custom scroll range | tp-skeleton | 60% | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:193](../../docs/components/scroll-trigger.mdx#L193) |
| components/scroll-trigger | Pinned scene | div | 100% | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:205](../../docs/components/scroll-trigger.mdx#L205) |
| components/scroll-trigger | Pinned scene | tp-skeleton | 40% | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:207](../../docs/components/scroll-trigger.mdx#L207) |
| components/scroll-trigger | Pinned scene | tp-skeleton | 90% | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:208](../../docs/components/scroll-trigger.mdx#L208) |
| components/scroll-trigger | Pinned scene | tp-skeleton | 85% | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:222](../../docs/components/scroll-trigger.mdx#L222) |
| components/scroll-trigger | Pinned scene | tp-skeleton | 60% | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:224](../../docs/components/scroll-trigger.mdx#L224) |
| components/skeleton | Skeleton | tp-skeleton | var(--tp-space-10) | layout/geometry — minimize | [docs/components/skeleton.mdx:11](../../docs/components/skeleton.mdx#L11) |
| components/skeleton | Skeleton | tp-skeleton | calc(var(--tp-spacing) * 38) | layout/geometry — minimize | [docs/components/skeleton.mdx:20](../../docs/components/skeleton.mdx#L20) |
| components/skeleton | Skeleton | tp-skeleton | calc(var(--tp-spacing) * 25) | layout/geometry — minimize | [docs/components/skeleton.mdx:23](../../docs/components/skeleton.mdx#L23) |
| components/skeleton | Card | tp-skeleton | 66% | layout/geometry — minimize | [docs/components/skeleton.mdx:56](../../docs/components/skeleton.mdx#L56) |
| components/skeleton | Card | tp-skeleton | 50% | layout/geometry — minimize | [docs/components/skeleton.mdx:57](../../docs/components/skeleton.mdx#L57) |
| components/skeleton | Card | tp-skeleton | 100% | layout/geometry — minimize | [docs/components/skeleton.mdx:60](../../docs/components/skeleton.mdx#L60) |
| components/skeleton | Video and description | tp-skeleton | 60% | layout/geometry — minimize | [docs/components/skeleton.mdx:81](../../docs/components/skeleton.mdx#L81) |
| components/skeleton | Video and description | tp-skeleton | 75% | layout/geometry — minimize | [docs/components/skeleton.mdx:85](../../docs/components/skeleton.mdx#L85) |
| components/skeleton | Settings form | tp-skeleton | calc(var(--tp-spacing) * 20) | layout/geometry — minimize | [docs/components/skeleton.mdx:104](../../docs/components/skeleton.mdx#L104) |
| components/skeleton | Settings form | tp-skeleton | calc(var(--tp-spacing) * 28) | layout/geometry — minimize | [docs/components/skeleton.mdx:109](../../docs/components/skeleton.mdx#L109) |
| components/skeleton | Settings form | tp-skeleton | calc(var(--tp-spacing) * 24) | layout/geometry — minimize | [docs/components/skeleton.mdx:113](../../docs/components/skeleton.mdx#L113) |
| components/skeleton | Table rows | tp-skeleton | calc(var(--tp-spacing) * 20) | layout/geometry — minimize | [docs/components/skeleton.mdx:130](../../docs/components/skeleton.mdx#L130) |
| components/skeleton | Table rows | tp-skeleton | calc(var(--tp-spacing) * 16) | layout/geometry — minimize | [docs/components/skeleton.mdx:132](../../docs/components/skeleton.mdx#L132) |
| components/skeleton | Table rows | tp-skeleton | calc(var(--tp-spacing) * 20) | layout/geometry — minimize | [docs/components/skeleton.mdx:137](../../docs/components/skeleton.mdx#L137) |
| components/skeleton | Table rows | tp-skeleton | calc(var(--tp-spacing) * 16) | layout/geometry — minimize | [docs/components/skeleton.mdx:139](../../docs/components/skeleton.mdx#L139) |
| components/skeleton | Table rows | tp-skeleton | calc(var(--tp-spacing) * 20) | layout/geometry — minimize | [docs/components/skeleton.mdx:144](../../docs/components/skeleton.mdx#L144) |
| components/skeleton | Table rows | tp-skeleton | calc(var(--tp-spacing) * 16) | layout/geometry — minimize | [docs/components/skeleton.mdx:146](../../docs/components/skeleton.mdx#L146) |
| components/slider | Controlled range | tp-slider | 100% | layout/geometry — minimize | [docs/components/slider.mdx:136](../../docs/components/slider.mdx#L136) |
| components/slider | Fixed start and added thumbs | tp-slider | 100% | layout/geometry — minimize | [docs/components/slider.mdx:270](../../docs/components/slider.mdx#L270) |
| components/table-of-contents | Nested items | div | 14rem | layout/geometry — minimize | [docs/components/table-of-contents.mdx:66](../../docs/components/table-of-contents.mdx#L66) |
| components/table | Inputs | tp-table-head | 8rem | layout/geometry — minimize | [docs/components/table.mdx:126](../../docs/components/table.mdx#L126) |
| components/table | Selects | tp-table-cell | 12rem | layout/geometry — minimize | [docs/components/table.mdx:166](../../docs/components/table.mdx#L166) |
| components/table | Selects | tp-table-cell | 12rem | layout/geometry — minimize | [docs/components/table.mdx:177](../../docs/components/table.mdx#L177) |
| components/table | Selects | tp-table-cell | 12rem | layout/geometry — minimize | [docs/components/table.mdx:188](../../docs/components/table.mdx#L188) |
| components/table | Prose column | tp-table-head | 6rem | layout/geometry — minimize | [docs/components/table.mdx:286](../../docs/components/table.mdx#L286) |
| components/toggle-group | Font weight | tp-field | auto | layout/geometry — minimize | [docs/components/toggle-group.mdx:103](../../docs/components/toggle-group.mdx#L103) |
| components/tooltip | Cursor tracking | div | 28rem | layout/geometry — minimize | [docs/components/tooltip.mdx:69](../../docs/components/tooltip.mdx#L69) |
| components/tree-view | Opening items | tp-tree-view | 16rem | layout/geometry — minimize | [docs/components/tree-view.mdx:88](../../docs/components/tree-view.mdx#L88) |
| components/tree-view | Expand, collapse and reveal | tp-tree-view | 16rem | layout/geometry — minimize | [docs/components/tree-view.mdx:380](../../docs/components/tree-view.mdx#L380) |
| motion/surface/glow-border | Glow border | tp-mo-glow-border | min(100%, 26rem) | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:9](../../docs/motion/surface/glow-border.mdx#L9) |
| motion/surface/glow-border | Hover | tp-mo-glow-border | min(100%, 22rem) | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:109](../../docs/motion/surface/glow-border.mdx#L109) |
| motion/surface/glow-border | Lingering light | tp-mo-glow-border | min(100%, 24rem) | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:124](../../docs/motion/surface/glow-border.mdx#L124) |
| motion/surface/glow-border | Custom colors | tp-button | 100% | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:146](../../docs/motion/surface/glow-border.mdx#L146) |
| motion/surface/glow-border | Lit by an element | div | min(100%, 24rem) | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:164](../../docs/motion/surface/glow-border.mdx#L164) |
| motion/surface/segment-border | Focus | tp-field | min(100%, 20rem) | layout/geometry — minimize | [docs/motion/surface/segment-border.mdx:155](../../docs/motion/surface/segment-border.mdx#L155) |
| motion/surface/segment-border | Scanner | tp-mo-segment-border | min(100%, 22rem) | layout/geometry — minimize | [docs/motion/surface/segment-border.mdx:169](../../docs/motion/surface/segment-border.mdx#L169) |
| motion/text/text-mirror | Text mirror | p | 32rem | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:9](../../docs/motion/text/text-mirror.mdx#L9) |
| motion/text/text-mirror | From the center line | p | 100% | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:28](../../docs/motion/text/text-mirror.mdx#L28) |
| motion/text/text-mirror | Vertical seam | p | 100% | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:41](../../docs/motion/text/text-mirror.mdx#L41) |
| motion/text/text-mirror | Hide and reveal | div | 100% | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:58](../../docs/motion/text/text-mirror.mdx#L58) |
| motion/text/text-mirror | Hide and reveal | p | 100% | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:59](../../docs/motion/text/text-mirror.mdx#L59) |
| motion/text/text-mirror | Scrubbed by the scroll | div | 100% | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:74](../../docs/motion/text/text-mirror.mdx#L74) |
| motion/text/text-mirror | Scrubbed by the scroll | tp-skeleton | 45% | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:88](../../docs/motion/text/text-mirror.mdx#L88) |
| motion/text/text-mirror | Scrubbed by the scroll | tp-skeleton | 90% | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:89](../../docs/motion/text/text-mirror.mdx#L89) |
| motion/text/text-mirror | Scrubbed by the scroll | tp-skeleton | 80% | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:104](../../docs/motion/text/text-mirror.mdx#L104) |
| motion/text/text-mirror | Scrubbed by the scroll | tp-skeleton | 60% | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:106](../../docs/motion/text/text-mirror.mdx#L106) |
| motion/text/text-split | Text split | p | 32rem | layout/geometry — minimize | [docs/motion/text/text-split.mdx:9](../../docs/motion/text/text-split.mdx#L9) |
| motion/text/text-split | Words behind a mask | p | 100% | layout/geometry — minimize | [docs/motion/text/text-split.mdx:34](../../docs/motion/text/text-split.mdx#L34) |
| motion/text/text-split | Characters from the center | p | 100% | layout/geometry — minimize | [docs/motion/text/text-split.mdx:47](../../docs/motion/text/text-split.mdx#L47) |
| motion/text/text-split | Slow stagger | p | 100% | layout/geometry — minimize | [docs/motion/text/text-split.mdx:58](../../docs/motion/text/text-split.mdx#L58) |
| motion/text/text-split | Reveal on demand | div | 100% | layout/geometry — minimize | [docs/motion/text/text-split.mdx:75](../../docs/motion/text/text-split.mdx#L75) |
| motion/text/text-split | Custom reveal | p | 100% | layout/geometry — minimize | [docs/motion/text/text-split.mdx:112](../../docs/motion/text/text-split.mdx#L112) |
| motion/text/text-split | Inline formatting | p | 32rem | layout/geometry — minimize | [docs/motion/text/text-split.mdx:127](../../docs/motion/text/text-split.mdx#L127) |
| motion/text/text-split | Scrubbed by the scroll | div | 100% | layout/geometry — minimize | [docs/motion/text/text-split.mdx:142](../../docs/motion/text/text-split.mdx#L142) |
| motion/text/text-split | Scrubbed by the scroll | tp-skeleton | 45% | layout/geometry — minimize | [docs/motion/text/text-split.mdx:156](../../docs/motion/text/text-split.mdx#L156) |
| motion/text/text-split | Scrubbed by the scroll | tp-skeleton | 90% | layout/geometry — minimize | [docs/motion/text/text-split.mdx:157](../../docs/motion/text/text-split.mdx#L157) |
| motion/text/text-split | Scrubbed by the scroll | tp-skeleton | 80% | layout/geometry — minimize | [docs/motion/text/text-split.mdx:172](../../docs/motion/text/text-split.mdx#L172) |
| motion/text/text-split | Scrubbed by the scroll | tp-skeleton | 60% | layout/geometry — minimize | [docs/motion/text/text-split.mdx:174](../../docs/motion/text/text-split.mdx#L174) |
| motion/text/text-stroke | Word by word | p | 100% | layout/geometry — minimize | [docs/motion/text/text-stroke.mdx:28](../../docs/motion/text/text-stroke.mdx#L28) |
| motion/text/text-stroke | Hide and reveal | tp-stack | 100% | layout/geometry — minimize | [docs/motion/text/text-stroke.mdx:56](../../docs/motion/text/text-stroke.mdx#L56) |
| motion/text/text-stroke | Scrubbed by the scroll | div | 100% | layout/geometry — minimize | [docs/motion/text/text-stroke.mdx:82](../../docs/motion/text/text-stroke.mdx#L82) |
| motion/text/text-stroke | Scrubbed by the scroll | tp-skeleton | 45% | layout/geometry — minimize | [docs/motion/text/text-stroke.mdx:96](../../docs/motion/text/text-stroke.mdx#L96) |
| motion/text/text-stroke | Scrubbed by the scroll | tp-skeleton | 90% | layout/geometry — minimize | [docs/motion/text/text-stroke.mdx:97](../../docs/motion/text/text-stroke.mdx#L97) |
| motion/text/text-stroke | Scrubbed by the scroll | tp-skeleton | 80% | layout/geometry — minimize | [docs/motion/text/text-stroke.mdx:121](../../docs/motion/text/text-stroke.mdx#L121) |
| motion/text/text-stroke | Scrubbed by the scroll | tp-skeleton | 60% | layout/geometry — minimize | [docs/motion/text/text-stroke.mdx:123](../../docs/motion/text/text-stroke.mdx#L123) |
| widgets/color-picker | Color picker | tp-color-picker | 18rem | layout/geometry — minimize | [docs/widgets/color-picker.mdx:9](../../docs/widgets/color-picker.mdx#L9) |
| widgets/color-picker | Limited formats, no alpha | tp-color-picker | 18rem | layout/geometry — minimize | [docs/widgets/color-picker.mdx:97](../../docs/widgets/color-picker.mdx#L97) |
| widgets/color-picker | Channel sliders | tp-color-picker | 18rem | layout/geometry — minimize | [docs/widgets/color-picker.mdx:114](../../docs/widgets/color-picker.mdx#L114) |
| widgets/color-picker | Harmony wheel and triangle | tp-color-picker | 18rem | layout/geometry — minimize | [docs/widgets/color-picker.mdx:125](../../docs/widgets/color-picker.mdx#L125) |
| widgets/color-picker | Harmony wheel and triangle | tp-color-picker | 18rem | layout/geometry — minimize | [docs/widgets/color-picker.mdx:131](../../docs/widgets/color-picker.mdx#L131) |
| widgets/color-picker | Reading the palette | tp-color-picker | 18rem | layout/geometry — minimize | [docs/widgets/color-picker.mdx:151](../../docs/widgets/color-picker.mdx#L151) |
| widgets/color-picker | Brand swatches | tp-color-picker | 18rem | layout/geometry — minimize | [docs/widgets/color-picker.mdx:179](../../docs/widgets/color-picker.mdx#L179) |
| widgets/color-picker | Commit events | tp-color-picker | 18rem | layout/geometry — minimize | [docs/widgets/color-picker.mdx:204](../../docs/widgets/color-picker.mdx#L204) |
| widgets/color-picker | Controlled owner | tp-color-picker | 18rem | layout/geometry — minimize | [docs/widgets/color-picker.mdx:236](../../docs/widgets/color-picker.mdx#L236) |
| widgets/color-picker | Surface only, and fields without a format choice | tp-color-picker | 15rem | layout/geometry — minimize | [docs/widgets/color-picker.mdx:277](../../docs/widgets/color-picker.mdx#L277) |
| widgets/color-picker | Surface only, and fields without a format choice | tp-color-picker | 15rem | layout/geometry — minimize | [docs/widgets/color-picker.mdx:286](../../docs/widgets/color-picker.mdx#L286) |
| widgets/color-picker | Small and read-only | tp-color-picker | 15rem | layout/geometry — minimize | [docs/widgets/color-picker.mdx:303](../../docs/widgets/color-picker.mdx#L303) |
| widgets/color-picker | Small and read-only | tp-color-picker | 15rem | layout/geometry — minimize | [docs/widgets/color-picker.mdx:309](../../docs/widgets/color-picker.mdx#L309) |
| widgets/color-picker | Right-to-left | tp-color-picker | 15rem | layout/geometry — minimize | [docs/widgets/color-picker.mdx:328](../../docs/widgets/color-picker.mdx#L328) |
| widgets/color-picker | Right-to-left | tp-color-picker | 15rem | layout/geometry — minimize | [docs/widgets/color-picker.mdx:335](../../docs/widgets/color-picker.mdx#L335) |
| widgets/easing-editor | Easing editor | tp-easing-editor | 36rem | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:9](../../docs/widgets/easing-editor.mdx#L9) |
| widgets/easing-editor | Spring and custom points | tp-easing-editor | 22rem | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:23](../../docs/widgets/easing-editor.mdx#L23) |
| widgets/easing-editor | Spring and custom points | tp-easing-editor | 22rem | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:24](../../docs/widgets/easing-editor.mdx#L24) |
| widgets/easing-editor | Rotation preview | tp-easing-editor | 36rem | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:71](../../docs/widgets/easing-editor.mdx#L71) |
| widgets/easing-editor | Design system presets | tp-easing-editor | 36rem | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:84](../../docs/widgets/easing-editor.mdx#L84) |
| widgets/easing-editor | Export for code | tp-easing-editor | 36rem | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:114](../../docs/widgets/easing-editor.mdx#L114) |
| widgets/easing-editor | Commit and veto | tp-easing-editor | 24rem | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:140](../../docs/widgets/easing-editor.mdx#L140) |
| widgets/easing-editor | Controlled owner | tp-easing-editor | 24rem | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:164](../../docs/widgets/easing-editor.mdx#L164) |
| widgets/easing-editor | Field, small size | tp-easing-editor | 20rem | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:197](../../docs/widgets/easing-editor.mdx#L197) |
| widgets/flow | Voice chain | tp-flow | 100% | layout/geometry — minimize | [docs/widgets/flow.mdx:14](../../docs/widgets/flow.mdx#L14) |
| widgets/flow | Kinds and animation | tp-flow | 100% | layout/geometry — minimize | [docs/widgets/flow.mdx:111](../../docs/widgets/flow.mdx#L111) |
| widgets/flow | Authored nodes | tp-flow | 100% | layout/geometry — minimize | [docs/widgets/flow.mdx:146](../../docs/widgets/flow.mdx#L146) |
| widgets/flow | Library and inspector | tp-flow | 100% | layout/geometry — minimize | [docs/widgets/flow.mdx:192](../../docs/widgets/flow.mdx#L192) |
| widgets/flow | Toolbars and panels | tp-flow | 100% | layout/geometry — minimize | [docs/widgets/flow.mdx:265](../../docs/widgets/flow.mdx#L265) |
| widgets/flow | Automatic layout | tp-stack | 100% | layout/geometry — minimize | [docs/widgets/flow.mdx:307](../../docs/widgets/flow.mdx#L307) |
| widgets/flow | Automatic layout | tp-flow | 100% | layout/geometry — minimize | [docs/widgets/flow.mdx:329](../../docs/widgets/flow.mdx#L329) |
| widgets/flow | Commit and selection | tp-stack | 100% | layout/geometry — minimize | [docs/widgets/flow.mdx:398](../../docs/widgets/flow.mdx#L398) |
| widgets/flow | Commit and selection | tp-flow | 100% | layout/geometry — minimize | [docs/widgets/flow.mdx:405](../../docs/widgets/flow.mdx#L405) |
| widgets/flow | Controlled owner | tp-stack | 100% | layout/geometry — minimize | [docs/widgets/flow.mdx:450](../../docs/widgets/flow.mdx#L450) |
| widgets/flow | A finished run in view mode | tp-flow | 100% | layout/geometry — minimize | [docs/widgets/flow.mdx:511](../../docs/widgets/flow.mdx#L511) |
| widgets/flow | Run requests | tp-flow | 100% | layout/geometry — minimize | [docs/widgets/flow.mdx:568](../../docs/widgets/flow.mdx#L568) |
| widgets/flow | Read-only dependency viewer | tp-flow | 100% | layout/geometry — minimize | [docs/widgets/flow.mdx:652](../../docs/widgets/flow.mdx#L652) |
| widgets/flow | In a form | form | 100% | layout/geometry — minimize | [docs/widgets/flow.mdx:691](../../docs/widgets/flow.mdx#L691) |
| widgets/flow | In a form | tp-flow | 100% | layout/geometry — minimize | [docs/widgets/flow.mdx:701](../../docs/widgets/flow.mdx#L701) |
| widgets/plot | Live signal | tp-plot | 100% | layout/geometry — minimize | [docs/widgets/plot.mdx:10](../../docs/widgets/plot.mdx#L10) |
| widgets/plot | Distribution | tp-plot | 100% | layout/geometry — minimize | [docs/widgets/plot.mdx:44](../../docs/widgets/plot.mdx#L44) |
| motion/surface/glow-border | Motion/Surface/Glow border | tp-mo-glow-border | min(100%, 26rem) | layout/geometry — minimize | [src/stories/glow-border.stories.ts:56](../../src/stories/glow-border.stories.ts#L56) |
| compositions/media-player.examples | headlessExample | tp-media-volume-slider | 6rem | layout/geometry — minimize | [src/stories/media-player.examples.ts:73](../../src/stories/media-player.examples.ts#L73) |
| compositions/presentation-primitives.examples | aspectRatioDefaults | div | 100% | layout/geometry — minimize | [src/stories/presentation-primitives.examples.ts:58](../../src/stories/presentation-primitives.examples.ts#L58) |
| components/scroll-area | Components/Scroll area | tp-scroll-area | calc(var(--tp-spacing) * 60) | layout/geometry — minimize | [src/stories/scroll-area.stories.ts:46](../../src/stories/scroll-area.stories.ts#L46) |
| compositions/skeleton.examples | (file/setup/shared helper) | tp-skeleton | var(--tp-space-10) | layout/geometry — minimize | [src/stories/skeleton.examples.ts:21](../../src/stories/skeleton.examples.ts#L21) |
| compositions/skeleton.examples | (file/setup/shared helper) | tp-skeleton | calc(var(--tp-spacing) * 38) | layout/geometry — minimize | [src/stories/skeleton.examples.ts:28](../../src/stories/skeleton.examples.ts#L28) |
| compositions/skeleton.examples | (file/setup/shared helper) | tp-skeleton | calc(var(--tp-spacing) * 25) | layout/geometry — minimize | [src/stories/skeleton.examples.ts:34](../../src/stories/skeleton.examples.ts#L34) |
| compositions/skeleton.examples | skeletonSource | tp-skeleton | var(--tp-space-10) | layout/geometry — minimize | [src/stories/skeleton.examples.ts:40](../../src/stories/skeleton.examples.ts#L40) |
| compositions/skeleton.examples | skeletonSource | tp-skeleton | calc(var(--tp-spacing) * 38) | layout/geometry — minimize | [src/stories/skeleton.examples.ts:42](../../src/stories/skeleton.examples.ts#L42) |
| compositions/skeleton.examples | skeletonSource | tp-skeleton | calc(var(--tp-spacing) * 25) | layout/geometry — minimize | [src/stories/skeleton.examples.ts:43](../../src/stories/skeleton.examples.ts#L43) |
| compositions/skeleton.examples | skeletonExamples | tp-skeleton | 100% | layout/geometry — minimize | [src/stories/skeleton.examples.ts:78](../../src/stories/skeleton.examples.ts#L78) |
| compositions/skeleton.examples | skeletonExamples | tp-skeleton | calc(var(--tp-spacing) * 24) | layout/geometry — minimize | [src/stories/skeleton.examples.ts:94](../../src/stories/skeleton.examples.ts#L94) |
| motion/text/text-mirror | Motion/Text/Text mirror | p | 32rem | layout/geometry — minimize | [src/stories/text-mirror.stories.ts:55](../../src/stories/text-mirror.stories.ts#L55) |
| widgets/plot | Widgets/Plot | tp-plot | 100% | layout/geometry — minimize | [src/stories/widgets/plot.stories.ts:94](../../src/stories/widgets/plot.stories.ts#L94) |
| widgets/plot | Histogram | tp-plot | 100% | layout/geometry — minimize | [src/stories/widgets/plot.stories.ts:137](../../src/stories/widgets/plot.stories.ts#L137) |

<a id="property-3"></a>

### 3. margin — 217 occurrences

| Value | Occurrences |
| --- | ---: |
| 0 | 198 |
| var(--tp-space-1) 0 0 | 10 |
| 0 0 var(--tp-space-3) | 3 |
| 0 0 var(--tp-space-4) | 2 |
| var(--tp-space-3) 0 0 | 2 |
| 0 0 var(--tp-space-2) | 1 |
| var(--tp-space-2) 0 0 | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/aspect-ratio | One ratio, three widths | figure | 0 | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:47](../../docs/components/aspect-ratio.mdx#L47) |
| components/aspect-ratio | One ratio, three widths | figure | 0 | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:69](../../docs/components/aspect-ratio.mdx#L69) |
| components/aspect-ratio | One ratio, three widths | figure | 0 | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:91](../../docs/components/aspect-ratio.mdx#L91) |
| components/attachment | Preview trigger, download and retry | p | 0 | layout/geometry — minimize | [docs/components/attachment.mdx:347](../../docs/components/attachment.mdx#L347) |
| components/bubble | Rich content | p | 0 | layout/geometry — minimize | [docs/components/bubble.mdx:111](../../docs/components/bubble.mdx#L111) |
| components/bubble | Rich content | p | 0 | layout/geometry — minimize | [docs/components/bubble.mdx:112](../../docs/components/bubble.mdx#L112) |
| components/bubble | Expandable message | p | 0 | layout/geometry — minimize | [docs/components/bubble.mdx:125](../../docs/components/bubble.mdx#L125) |
| components/bubble | Expandable message | p | 0 | layout/geometry — minimize | [docs/components/bubble.mdx:128](../../docs/components/bubble.mdx#L128) |
| components/calendar | Week numbers | p | 0 | layout/geometry — minimize | [docs/components/calendar.mdx:162](../../docs/components/calendar.mdx#L162) |
| components/card | Card | h3 | 0 | layout/geometry — minimize | [docs/components/card.mdx:12](../../docs/components/card.mdx#L12) |
| components/card | Card | p | 0 | layout/geometry — minimize | [docs/components/card.mdx:13](../../docs/components/card.mdx#L13) |
| components/card | Header action | h3 | 0 | layout/geometry — minimize | [docs/components/card.mdx:35](../../docs/components/card.mdx#L35) |
| components/card | Header action | p | 0 | layout/geometry — minimize | [docs/components/card.mdx:36](../../docs/components/card.mdx#L36) |
| components/card | Header action | p | 0 | layout/geometry — minimize | [docs/components/card.mdx:38](../../docs/components/card.mdx#L38) |
| components/card | Content only | p | 0 | layout/geometry — minimize | [docs/components/card.mdx:50](../../docs/components/card.mdx#L50) |
| components/card | Surface options | h3 | 0 | layout/geometry — minimize | [docs/components/card.mdx:63](../../docs/components/card.mdx#L63) |
| components/card | Surface options | p | 0 | layout/geometry — minimize | [docs/components/card.mdx:64](../../docs/components/card.mdx#L64) |
| components/card | Surface options | h3 | 0 | layout/geometry — minimize | [docs/components/card.mdx:68](../../docs/components/card.mdx#L68) |
| components/card | Surface options | p | 0 | layout/geometry — minimize | [docs/components/card.mdx:69](../../docs/components/card.mdx#L69) |
| components/card | Surface options | h3 | 0 | layout/geometry — minimize | [docs/components/card.mdx:73](../../docs/components/card.mdx#L73) |
| components/card | Surface options | p | 0 | layout/geometry — minimize | [docs/components/card.mdx:74](../../docs/components/card.mdx#L74) |
| components/card | Elevated | h3 | 0 | layout/geometry — minimize | [docs/components/card.mdx:89](../../docs/components/card.mdx#L89) |
| components/card | Elevated | p | 0 | layout/geometry — minimize | [docs/components/card.mdx:90](../../docs/components/card.mdx#L90) |
| components/card | Elevated | p | 0 | layout/geometry — minimize | [docs/components/card.mdx:91](../../docs/components/card.mdx#L91) |
| components/card | Small | h3 | 0 | layout/geometry — minimize | [docs/components/card.mdx:106](../../docs/components/card.mdx#L106) |
| components/card | Small | p | 0 | layout/geometry — minimize | [docs/components/card.mdx:107](../../docs/components/card.mdx#L107) |
| components/carousel | Bullets inside | blockquote | 0 | layout/geometry — minimize | [docs/components/carousel.mdx:101](../../docs/components/carousel.mdx#L101) |
| components/carousel | Bullets inside | p | 0 | layout/geometry — minimize | [docs/components/carousel.mdx:102](../../docs/components/carousel.mdx#L102) |
| components/carousel | Bullets inside | blockquote | 0 | layout/geometry — minimize | [docs/components/carousel.mdx:105](../../docs/components/carousel.mdx#L105) |
| components/carousel | Bullets inside | p | 0 | layout/geometry — minimize | [docs/components/carousel.mdx:106](../../docs/components/carousel.mdx#L106) |
| components/carousel | Bullets inside | blockquote | 0 | layout/geometry — minimize | [docs/components/carousel.mdx:109](../../docs/components/carousel.mdx#L109) |
| components/carousel | Bullets inside | p | 0 | layout/geometry — minimize | [docs/components/carousel.mdx:110](../../docs/components/carousel.mdx#L110) |
| components/carousel | Layered 3D | figure | 0 | layout/geometry — minimize | [docs/components/carousel.mdx:243](../../docs/components/carousel.mdx#L243) |
| components/carousel | Layered 3D | figure | 0 | layout/geometry — minimize | [docs/components/carousel.mdx:279](../../docs/components/carousel.mdx#L279) |
| components/carousel | Layered 3D | figure | 0 | layout/geometry — minimize | [docs/components/carousel.mdx:315](../../docs/components/carousel.mdx#L315) |
| components/carousel | Parallax | figure | 0 | layout/geometry — minimize | [docs/components/carousel.mdx:365](../../docs/components/carousel.mdx#L365) |
| components/carousel | Parallax | figure | 0 | layout/geometry — minimize | [docs/components/carousel.mdx:368](../../docs/components/carousel.mdx#L368) |
| components/carousel | Parallax | figure | 0 | layout/geometry — minimize | [docs/components/carousel.mdx:371](../../docs/components/carousel.mdx#L371) |
| components/carousel | Parallax | figure | 0 | layout/geometry — minimize | [docs/components/carousel.mdx:374](../../docs/components/carousel.mdx#L374) |
| components/carousel | Focus | figure | 0 | layout/geometry — minimize | [docs/components/carousel.mdx:396](../../docs/components/carousel.mdx#L396) |
| components/carousel | Focus | figure | 0 | layout/geometry — minimize | [docs/components/carousel.mdx:400](../../docs/components/carousel.mdx#L400) |
| components/carousel | Focus | figure | 0 | layout/geometry — minimize | [docs/components/carousel.mdx:404](../../docs/components/carousel.mdx#L404) |
| components/carousel | Focus | figure | 0 | layout/geometry — minimize | [docs/components/carousel.mdx:408](../../docs/components/carousel.mdx#L408) |
| components/carousel | Focus | figure | 0 | layout/geometry — minimize | [docs/components/carousel.mdx:412](../../docs/components/carousel.mdx#L412) |
| components/carousel | Shader transition | figure | 0 | layout/geometry — minimize | [docs/components/carousel.mdx:458](../../docs/components/carousel.mdx#L458) |
| components/carousel | Shader transition | figure | 0 | layout/geometry — minimize | [docs/components/carousel.mdx:494](../../docs/components/carousel.mdx#L494) |
| components/carousel | Shader transition | figure | 0 | layout/geometry — minimize | [docs/components/carousel.mdx:530](../../docs/components/carousel.mdx#L530) |
| components/checkbox | Select all | fieldset | 0 | layout/geometry — minimize | [docs/components/checkbox.mdx:68](../../docs/components/checkbox.mdx#L68) |
| components/checkbox | CheckboxGroupController | fieldset | 0 | layout/geometry — minimize | [docs/components/checkbox.mdx:117](../../docs/components/checkbox.mdx#L117) |
| components/citation | Citation | p | 0 | layout/geometry — minimize | [docs/components/citation.mdx:12](../../docs/components/citation.mdx#L12) |
| components/citation | Source preview | p | 0 | layout/geometry — minimize | [docs/components/citation.mdx:49](../../docs/components/citation.mdx#L49) |
| components/citation | Numbered references | p | 0 | layout/geometry — minimize | [docs/components/citation.mdx:71](../../docs/components/citation.mdx#L71) |
| components/collapsible | Collapsible | p | 0 | layout/geometry — minimize | [docs/components/collapsible.mdx:13](../../docs/components/collapsible.mdx#L13) |
| components/collapsible | Collapsible | p | 0 | layout/geometry — minimize | [docs/components/collapsible.mdx:14](../../docs/components/collapsible.mdx#L14) |
| components/collapsible | Leading indicator | p | 0 | layout/geometry — minimize | [docs/components/collapsible.mdx:34](../../docs/components/collapsible.mdx#L34) |
| components/collapsible | Positional slots | p | 0 | layout/geometry — minimize | [docs/components/collapsible.mdx:56](../../docs/components/collapsible.mdx#L56) |
| components/collapsible | Positional slots | p | 0 | layout/geometry — minimize | [docs/components/collapsible.mdx:67](../../docs/components/collapsible.mdx#L67) |
| components/collapsible | As a heading | p | 0 | layout/geometry — minimize | [docs/components/collapsible.mdx:82](../../docs/components/collapsible.mdx#L82) |
| components/collapsible | Searchable | p | 0 | layout/geometry — minimize | [docs/components/collapsible.mdx:96](../../docs/components/collapsible.mdx#L96) |
| components/collapsible | Open change | p | 0 | layout/geometry — minimize | [docs/components/collapsible.mdx:119](../../docs/components/collapsible.mdx#L119) |
| components/collapsible | Disabled | p | 0 | layout/geometry — minimize | [docs/components/collapsible.mdx:141](../../docs/components/collapsible.mdx#L141) |
| components/collapsible | Line-by-line reveal | ul | 0 | layout/geometry — minimize | [docs/components/collapsible.mdx:155](../../docs/components/collapsible.mdx#L155) |
| components/copy-button | Beside a value | dl | 0 | layout/geometry — minimize | [docs/components/copy-button.mdx:52](../../docs/components/copy-button.mdx#L52) |
| components/copy-button | Beside a value | dd | 0 | layout/geometry — minimize | [docs/components/copy-button.mdx:54](../../docs/components/copy-button.mdx#L54) |
| components/copy-button | Beside a value | dd | 0 | layout/geometry — minimize | [docs/components/copy-button.mdx:57](../../docs/components/copy-button.mdx#L57) |
| components/cursor | Cursor | figure | 0 | layout/geometry — minimize | [docs/components/cursor.mdx:16](../../docs/components/cursor.mdx#L16) |
| components/cursor | Cursor | figure | 0 | layout/geometry — minimize | [docs/components/cursor.mdx:20](../../docs/components/cursor.mdx#L20) |
| components/cursor | Cursor | figure | 0 | layout/geometry — minimize | [docs/components/cursor.mdx:24](../../docs/components/cursor.mdx#L24) |
| components/description-list | Record details | h3 | 0 | layout/geometry — minimize | [docs/components/description-list.mdx:35](../../docs/components/description-list.mdx#L35) |
| components/description-list | Record details | p | 0 | layout/geometry — minimize | [docs/components/description-list.mdx:36](../../docs/components/description-list.mdx#L36) |
| components/dialog | Non-modal | dl | 0 | layout/geometry — minimize | [docs/components/dialog.mdx:55](../../docs/components/dialog.mdx#L55) |
| components/dialog | Non-modal | dd | 0 | layout/geometry — minimize | [docs/components/dialog.mdx:56](../../docs/components/dialog.mdx#L56) |
| components/dialog | Non-modal | dd | 0 | layout/geometry — minimize | [docs/components/dialog.mdx:57](../../docs/components/dialog.mdx#L57) |
| components/dialog | Non-modal | dd | 0 | layout/geometry — minimize | [docs/components/dialog.mdx:58](../../docs/components/dialog.mdx#L58) |
| components/drawer | Edges | p | 0 | layout/geometry — minimize | [docs/components/drawer.mdx:68](../../docs/components/drawer.mdx#L68) |
| components/drawer | Snap points | p | 0 | layout/geometry — minimize | [docs/components/drawer.mdx:96](../../docs/components/drawer.mdx#L96) |
| components/drawer | Nested | p | 0 | layout/geometry — minimize | [docs/components/drawer.mdx:114](../../docs/components/drawer.mdx#L114) |
| components/drawer | Non-dismissible | p | 0 | layout/geometry — minimize | [docs/components/drawer.mdx:134](../../docs/components/drawer.mdx#L134) |
| components/empty-state | In a card | h3 | 0 | layout/geometry — minimize | [docs/components/empty-state.mdx:90](../../docs/components/empty-state.mdx#L90) |
| components/image | Card hover | h3 | 0 | layout/geometry — minimize | [docs/components/image.mdx:102](../../docs/components/image.mdx#L102) |
| components/image | Card hover | p | 0 | layout/geometry — minimize | [docs/components/image.mdx:103](../../docs/components/image.mdx#L103) |
| components/image | Reveal timing and repeat | p | 0 | layout/geometry — minimize | [docs/components/image.mdx:143](../../docs/components/image.mdx#L143) |
| components/image | Headline, group and caption | h3 | 0 | layout/geometry — minimize | [docs/components/image.mdx:162](../../docs/components/image.mdx#L162) |
| components/image | Headline, group and caption | p | 0 | layout/geometry — minimize | [docs/components/image.mdx:168](../../docs/components/image.mdx#L168) |
| components/kbd | Kbd | p | 0 | layout/geometry — minimize | [docs/components/kbd.mdx:10](../../docs/components/kbd.mdx#L10) |
| components/kbd | Icon keys | p | 0 | layout/geometry — minimize | [docs/components/kbd.mdx:110](../../docs/components/kbd.mdx#L110) |
| components/kbd | Localized and right-to-left | p | 0 | layout/geometry — minimize | [docs/components/kbd.mdx:136](../../docs/components/kbd.mdx#L136) |
| components/map | Status slot | p | 0 | layout/geometry — minimize | [docs/components/map.mdx:364](../../docs/components/map.mdx#L364) |
| components/navigation-panel | Navigation panel | h2 | 0 | layout/geometry — minimize | [docs/components/navigation-panel.mdx:63](../../docs/components/navigation-panel.mdx#L63) |
| components/navigation-panel | Off-canvas | h2 | 0 | layout/geometry — minimize | [docs/components/navigation-panel.mdx:116](../../docs/components/navigation-panel.mdx#L116) |
| components/navigation-panel | Collapsible groups | h2 | 0 | layout/geometry — minimize | [docs/components/navigation-panel.mdx:164](../../docs/components/navigation-panel.mdx#L164) |
| components/navigation-panel | Drawer mode | h2 | 0 | layout/geometry — minimize | [docs/components/navigation-panel.mdx:201](../../docs/components/navigation-panel.mdx#L201) |
| components/navigation-panel | Floating | h2 | 0 | layout/geometry — minimize | [docs/components/navigation-panel.mdx:231](../../docs/components/navigation-panel.mdx#L231) |
| components/navigation-panel | Team switcher and row actions | h2 | 0 | layout/geometry — minimize | [docs/components/navigation-panel.mdx:307](../../docs/components/navigation-panel.mdx#L307) |
| components/one-time-code-field | One-time code field | h3 | 0 | layout/geometry — minimize | [docs/components/one-time-code-field.mdx:12](../../docs/components/one-time-code-field.mdx#L12) |
| components/one-time-code-field | One-time code field | p | 0 | layout/geometry — minimize | [docs/components/one-time-code-field.mdx:13](../../docs/components/one-time-code-field.mdx#L13) |
| components/overflow-list | Custom count | ul | 0 | layout/geometry — minimize | [docs/components/overflow-list.mdx:152](../../docs/components/overflow-list.mdx#L152) |
| components/scroll-area | Scroll Area | h4 | 0 0 var(--tp-space-4) | layout/geometry — minimize | [docs/components/scroll-area.mdx:11](../../docs/components/scroll-area.mdx#L11) |
| components/scroll-area | Edge fade | p | 0 | layout/geometry — minimize | [docs/components/scroll-area.mdx:172](../../docs/components/scroll-area.mdx#L172) |
| components/scroll-area | Edge fade | p | 0 | layout/geometry — minimize | [docs/components/scroll-area.mdx:173](../../docs/components/scroll-area.mdx#L173) |
| components/scroll-area | Edge fade | p | 0 | layout/geometry — minimize | [docs/components/scroll-area.mdx:174](../../docs/components/scroll-area.mdx#L174) |
| components/scroll-area | Edge fade | p | 0 | layout/geometry — minimize | [docs/components/scroll-area.mdx:175](../../docs/components/scroll-area.mdx#L175) |
| components/scroll-trigger | Scroll Trigger | h3 | 0 0 var(--tp-space-3) | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:12](../../docs/components/scroll-trigger.mdx#L12) |
| components/scroll-trigger | Scroll Trigger | p | var(--tp-space-3) 0 0 | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:22](../../docs/components/scroll-trigger.mdx#L22) |
| components/scroll-trigger | From the center | p | 0 | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:45](../../docs/components/scroll-trigger.mdx#L45) |
| components/scroll-trigger | From the center | p | 0 | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:46](../../docs/components/scroll-trigger.mdx#L46) |
| components/scroll-trigger | From the center | p | 0 | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:47](../../docs/components/scroll-trigger.mdx#L47) |
| components/scroll-trigger | From the center | p | 0 | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:48](../../docs/components/scroll-trigger.mdx#L48) |
| components/scroll-trigger | From the center | p | 0 | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:49](../../docs/components/scroll-trigger.mdx#L49) |
| components/scroll-trigger | Replay on entry | p | 0 | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:61](../../docs/components/scroll-trigger.mdx#L61) |
| components/scroll-trigger | Replay on entry | p | 0 | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:63](../../docs/components/scroll-trigger.mdx#L63) |
| components/scroll-trigger | Replay on entry | p | var(--tp-space-2) 0 0 | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:64](../../docs/components/scroll-trigger.mdx#L64) |
| components/scroll-trigger | Scrubbed band | p | 0 | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:103](../../docs/components/scroll-trigger.mdx#L103) |
| components/scroll-trigger | Scrubbed band | p | 0 | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:104](../../docs/components/scroll-trigger.mdx#L104) |
| components/scroll-trigger | Scrubbed band | p | 0 | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:105](../../docs/components/scroll-trigger.mdx#L105) |
| components/scroll-trigger | Custom scroll range | h3 | 0 0 var(--tp-space-3) | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:151](../../docs/components/scroll-trigger.mdx#L151) |
| components/scroll-trigger | Pinned scene | p | 0 | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:210](../../docs/components/scroll-trigger.mdx#L210) |
| components/scroll-trigger | Pinned scene | h3 | 0 | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:214](../../docs/components/scroll-trigger.mdx#L214) |
| components/scroll-trigger | Pinned scene | p | 0 | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:217](../../docs/components/scroll-trigger.mdx#L217) |
| components/scroll-trigger | Pinned scene | p | 0 | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:218](../../docs/components/scroll-trigger.mdx#L218) |
| components/scroll-trigger | Reveal events | p | 0 | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:241](../../docs/components/scroll-trigger.mdx#L241) |
| components/scroll-trigger | Reveal events | p | var(--tp-space-1) 0 0 | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:242](../../docs/components/scroll-trigger.mdx#L242) |
| components/tabs | Controlled with a veto | p | 0 | layout/geometry — minimize | [docs/components/tabs.mdx:183](../../docs/components/tabs.mdx#L183) |
| components/text-transform | Text transform | dl | 0 | layout/geometry — minimize | [docs/components/text-transform.mdx:11](../../docs/components/text-transform.mdx#L11) |
| components/text-transform | Text transform | dd | 0 | layout/geometry — minimize | [docs/components/text-transform.mdx:13](../../docs/components/text-transform.mdx#L13) |
| components/text-transform | Text transform | dd | 0 | layout/geometry — minimize | [docs/components/text-transform.mdx:15](../../docs/components/text-transform.mdx#L15) |
| components/text-transform | Text transform | dd | 0 | layout/geometry — minimize | [docs/components/text-transform.mdx:17](../../docs/components/text-transform.mdx#L17) |
| components/text-transform | Text transform | dd | 0 | layout/geometry — minimize | [docs/components/text-transform.mdx:19](../../docs/components/text-transform.mdx#L19) |
| components/text-transform | Text transform | dd | 0 | layout/geometry — minimize | [docs/components/text-transform.mdx:21](../../docs/components/text-transform.mdx#L21) |
| components/text-transform | Case and identifiers | dl | 0 | layout/geometry — minimize | [docs/components/text-transform.mdx:35](../../docs/components/text-transform.mdx#L35) |
| components/text-transform | Case and identifiers | dd | 0 | layout/geometry — minimize | [docs/components/text-transform.mdx:36](../../docs/components/text-transform.mdx#L36) |
| components/text-transform | Case and identifiers | dd | 0 | layout/geometry — minimize | [docs/components/text-transform.mdx:37](../../docs/components/text-transform.mdx#L37) |
| components/text-transform | Case and identifiers | dd | 0 | layout/geometry — minimize | [docs/components/text-transform.mdx:38](../../docs/components/text-transform.mdx#L38) |
| components/text-transform | Case and identifiers | dd | 0 | layout/geometry — minimize | [docs/components/text-transform.mdx:39](../../docs/components/text-transform.mdx#L39) |
| components/text-transform | Case and identifiers | dd | 0 | layout/geometry — minimize | [docs/components/text-transform.mdx:40](../../docs/components/text-transform.mdx#L40) |
| components/text-transform | Case and identifiers | dd | 0 | layout/geometry — minimize | [docs/components/text-transform.mdx:41](../../docs/components/text-transform.mdx#L41) |
| components/text-transform | Unreadable input | p | 0 | layout/geometry — minimize | [docs/components/text-transform.mdx:224](../../docs/components/text-transform.mdx#L224) |
| components/time | Time | ul | 0 | layout/geometry — minimize | [docs/components/time.mdx:13](../../docs/components/time.mdx#L13) |
| components/time | Modes | dl | 0 | layout/geometry — minimize | [docs/components/time.mdx:55](../../docs/components/time.mdx#L55) |
| components/time | Modes | dd | 0 | layout/geometry — minimize | [docs/components/time.mdx:56](../../docs/components/time.mdx#L56) |
| components/time | Modes | dd | 0 | layout/geometry — minimize | [docs/components/time.mdx:57](../../docs/components/time.mdx#L57) |
| components/time | Modes | dd | 0 | layout/geometry — minimize | [docs/components/time.mdx:58](../../docs/components/time.mdx#L58) |
| components/time | Modes | dd | 0 | layout/geometry — minimize | [docs/components/time.mdx:59](../../docs/components/time.mdx#L59) |
| components/time | Calendar | dl | 0 | layout/geometry — minimize | [docs/components/time.mdx:147](../../docs/components/time.mdx#L147) |
| components/time | Calendar | dd | 0 | layout/geometry — minimize | [docs/components/time.mdx:148](../../docs/components/time.mdx#L148) |
| components/time | Calendar | dd | 0 | layout/geometry — minimize | [docs/components/time.mdx:149](../../docs/components/time.mdx#L149) |
| components/time | Calendar | dd | 0 | layout/geometry — minimize | [docs/components/time.mdx:150](../../docs/components/time.mdx#L150) |
| components/time | Calendar | dd | 0 | layout/geometry — minimize | [docs/components/time.mdx:151](../../docs/components/time.mdx#L151) |
| components/time | Precisions | dl | 0 | layout/geometry — minimize | [docs/components/time.mdx:187](../../docs/components/time.mdx#L187) |
| components/time | Precisions | dd | 0 | layout/geometry — minimize | [docs/components/time.mdx:188](../../docs/components/time.mdx#L188) |
| components/time | Precisions | dd | 0 | layout/geometry — minimize | [docs/components/time.mdx:189](../../docs/components/time.mdx#L189) |
| components/time | Precisions | dd | 0 | layout/geometry — minimize | [docs/components/time.mdx:190](../../docs/components/time.mdx#L190) |
| components/time | Precisions | dd | 0 | layout/geometry — minimize | [docs/components/time.mdx:191](../../docs/components/time.mdx#L191) |
| components/time | Precisions | dd | 0 | layout/geometry — minimize | [docs/components/time.mdx:192](../../docs/components/time.mdx#L192) |
| components/time | Timers | dl | 0 | layout/geometry — minimize | [docs/components/time.mdx:202](../../docs/components/time.mdx#L202) |
| components/time | Timers | dd | 0 | layout/geometry — minimize | [docs/components/time.mdx:203](../../docs/components/time.mdx#L203) |
| components/time | Timers | dd | 0 | layout/geometry — minimize | [docs/components/time.mdx:204](../../docs/components/time.mdx#L204) |
| components/time | Timers | dd | 0 | layout/geometry — minimize | [docs/components/time.mdx:205](../../docs/components/time.mdx#L205) |
| components/timeline | Roadmap | p | var(--tp-space-1) 0 0 | layout/geometry — minimize | [docs/components/timeline.mdx:66](../../docs/components/timeline.mdx#L66) |
| components/timeline | Roadmap | p | var(--tp-space-1) 0 0 | layout/geometry — minimize | [docs/components/timeline.mdx:71](../../docs/components/timeline.mdx#L71) |
| components/timeline | Roadmap | p | var(--tp-space-1) 0 0 | layout/geometry — minimize | [docs/components/timeline.mdx:76](../../docs/components/timeline.mdx#L76) |
| components/timeline | Roadmap | p | var(--tp-space-1) 0 0 | layout/geometry — minimize | [docs/components/timeline.mdx:81](../../docs/components/timeline.mdx#L81) |
| components/timeline | Roadmap | p | var(--tp-space-1) 0 0 | layout/geometry — minimize | [docs/components/timeline.mdx:86](../../docs/components/timeline.mdx#L86) |
| components/timeline | Roadmap | p | var(--tp-space-1) 0 0 | layout/geometry — minimize | [docs/components/timeline.mdx:91](../../docs/components/timeline.mdx#L91) |
| components/timeline | Numbered steps | p | var(--tp-space-1) 0 0 | layout/geometry — minimize | [docs/components/timeline.mdx:109](../../docs/components/timeline.mdx#L109) |
| components/timeline | Numbered steps | p | var(--tp-space-1) 0 0 | layout/geometry — minimize | [docs/components/timeline.mdx:114](../../docs/components/timeline.mdx#L114) |
| components/timeline | Numbered steps | p | var(--tp-space-1) 0 0 | layout/geometry — minimize | [docs/components/timeline.mdx:119](../../docs/components/timeline.mdx#L119) |
| components/timeline | Expandable phases | p | 0 | layout/geometry — minimize | [docs/components/timeline.mdx:137](../../docs/components/timeline.mdx#L137) |
| components/timeline | Expandable phases | p | 0 | layout/geometry — minimize | [docs/components/timeline.mdx:144](../../docs/components/timeline.mdx#L144) |
| components/timeline | Expandable phases | p | 0 0 var(--tp-space-2) | layout/geometry — minimize | [docs/components/timeline.mdx:150](../../docs/components/timeline.mdx#L150) |
| components/timeline | Expandable phases | p | 0 | layout/geometry — minimize | [docs/components/timeline.mdx:157](../../docs/components/timeline.mdx#L157) |
| components/timeline | Expandable phases | p | 0 | layout/geometry — minimize | [docs/components/timeline.mdx:163](../../docs/components/timeline.mdx#L163) |
| motion/surface/glow-border | Glow border | p | 0 | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:13](../../docs/motion/surface/glow-border.mdx#L13) |
| motion/surface/glow-border | Controls and fields | h3 | 0 | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:33](../../docs/motion/surface/glow-border.mdx#L33) |
| motion/surface/glow-border | Controls and fields | p | 0 | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:34](../../docs/motion/surface/glow-border.mdx#L34) |
| motion/surface/glow-border | Comets | p | 0 | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:62](../../docs/motion/surface/glow-border.mdx#L62) |
| motion/surface/glow-border | Comets | p | 0 | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:68](../../docs/motion/surface/glow-border.mdx#L68) |
| motion/surface/glow-border | Sweep, pulse and glint | p | 0 | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:85](../../docs/motion/surface/glow-border.mdx#L85) |
| motion/surface/glow-border | Sweep, pulse and glint | p | 0 | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:91](../../docs/motion/surface/glow-border.mdx#L91) |
| motion/surface/glow-border | Sweep, pulse and glint | p | 0 | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:97](../../docs/motion/surface/glow-border.mdx#L97) |
| motion/surface/glow-border | Hover | h3 | 0 | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:111](../../docs/motion/surface/glow-border.mdx#L111) |
| motion/surface/glow-border | Hover | p | 0 | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:112](../../docs/motion/surface/glow-border.mdx#L112) |
| motion/surface/glow-border | Hover | p | 0 | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:113](../../docs/motion/surface/glow-border.mdx#L113) |
| motion/surface/glow-border | Lingering light | p | 0 | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:127](../../docs/motion/surface/glow-border.mdx#L127) |
| motion/surface/glow-border | Custom colors | h3 | 0 | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:142](../../docs/motion/surface/glow-border.mdx#L142) |
| motion/surface/glow-border | Custom colors | p | 0 | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:143](../../docs/motion/surface/glow-border.mdx#L143) |
| motion/surface/glow-border | Custom colors | p | 0 | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:145](../../docs/motion/surface/glow-border.mdx#L145) |
| motion/surface/glow-border | Lit by an element | p | 0 | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:169](../../docs/motion/surface/glow-border.mdx#L169) |
| motion/surface/segment-border | Traced in | p | 0 | layout/geometry — minimize | [docs/motion/surface/segment-border.mdx:125](../../docs/motion/surface/segment-border.mdx#L125) |
| motion/surface/segment-border | Traced in | p | 0 | layout/geometry — minimize | [docs/motion/surface/segment-border.mdx:133](../../docs/motion/surface/segment-border.mdx#L133) |
| motion/surface/segment-border | Traced in | p | 0 | layout/geometry — minimize | [docs/motion/surface/segment-border.mdx:141](../../docs/motion/surface/segment-border.mdx#L141) |
| motion/text/text-mirror | Text mirror | p | 0 | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:9](../../docs/motion/text/text-mirror.mdx#L9) |
| motion/text/text-mirror | From the center line | p | 0 | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:28](../../docs/motion/text/text-mirror.mdx#L28) |
| motion/text/text-mirror | Vertical seam | p | 0 | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:41](../../docs/motion/text/text-mirror.mdx#L41) |
| motion/text/text-mirror | Hide and reveal | p | 0 | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:59](../../docs/motion/text/text-mirror.mdx#L59) |
| motion/text/text-mirror | Scrubbed by the scroll | p | 0 | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:93](../../docs/motion/text/text-mirror.mdx#L93) |
| motion/text/text-split | Text split | p | 0 | layout/geometry — minimize | [docs/motion/text/text-split.mdx:9](../../docs/motion/text/text-split.mdx#L9) |
| motion/text/text-split | Words behind a mask | p | 0 | layout/geometry — minimize | [docs/motion/text/text-split.mdx:34](../../docs/motion/text/text-split.mdx#L34) |
| motion/text/text-split | Characters from the center | p | 0 | layout/geometry — minimize | [docs/motion/text/text-split.mdx:47](../../docs/motion/text/text-split.mdx#L47) |
| motion/text/text-split | Slow stagger | p | 0 | layout/geometry — minimize | [docs/motion/text/text-split.mdx:58](../../docs/motion/text/text-split.mdx#L58) |
| motion/text/text-split | Reveal on demand | p | 0 | layout/geometry — minimize | [docs/motion/text/text-split.mdx:76](../../docs/motion/text/text-split.mdx#L76) |
| motion/text/text-split | Custom reveal | p | 0 | layout/geometry — minimize | [docs/motion/text/text-split.mdx:112](../../docs/motion/text/text-split.mdx#L112) |
| motion/text/text-split | Inline formatting | p | 0 | layout/geometry — minimize | [docs/motion/text/text-split.mdx:127](../../docs/motion/text/text-split.mdx#L127) |
| motion/text/text-split | Scrubbed by the scroll | p | 0 | layout/geometry — minimize | [docs/motion/text/text-split.mdx:161](../../docs/motion/text/text-split.mdx#L161) |
| motion/text/text-stroke | Text stroke | p | 0 | layout/geometry — minimize | [docs/motion/text/text-stroke.mdx:9](../../docs/motion/text/text-stroke.mdx#L9) |
| motion/text/text-stroke | Word by word | p | 0 | layout/geometry — minimize | [docs/motion/text/text-stroke.mdx:28](../../docs/motion/text/text-stroke.mdx#L28) |
| motion/text/text-stroke | Heavier outline | p | 0 | layout/geometry — minimize | [docs/motion/text/text-stroke.mdx:39](../../docs/motion/text/text-stroke.mdx#L39) |
| motion/text/text-stroke | Hide and reveal | p | 0 | layout/geometry — minimize | [docs/motion/text/text-stroke.mdx:58](../../docs/motion/text/text-stroke.mdx#L58) |
| motion/text/text-stroke | Scrubbed by the scroll | p | 0 | layout/geometry — minimize | [docs/motion/text/text-stroke.mdx:102](../../docs/motion/text/text-stroke.mdx#L102) |
| compositions/citation.examples | citationExamples | p | 0 | layout/geometry — minimize | [src/stories/citation.examples.ts:45](../../src/stories/citation.examples.ts#L45) |
| motion/surface/glow-border | Motion/Surface/Glow border | p | 0 | layout/geometry — minimize | [src/stories/glow-border.stories.ts:66](../../src/stories/glow-border.stories.ts#L66) |
| components/scroll-area | Components/Scroll area | h3 | 0 0 var(--tp-space-4) | layout/geometry — minimize | [src/stories/scroll-area.stories.ts:48](../../src/stories/scroll-area.stories.ts#L48) |
| components/scroll-trigger | (file/setup/shared helper) | h3 | 0 0 var(--tp-space-3) | layout/geometry — minimize | [src/stories/scroll-trigger.stories.ts:17](../../src/stories/scroll-trigger.stories.ts#L17) |
| components/scroll-trigger | (file/setup/shared helper) | p | var(--tp-space-3) 0 0 | layout/geometry — minimize | [src/stories/scroll-trigger.stories.ts:30](../../src/stories/scroll-trigger.stories.ts#L30) |
| motion/text/text-mirror | Motion/Text/Text mirror | p | 0 | layout/geometry — minimize | [src/stories/text-mirror.stories.ts:55](../../src/stories/text-mirror.stories.ts#L55) |
| motion/text/text-split | Motion/Text/Text split | h2 | 0 | layout/geometry — minimize | [src/stories/text-split.stories.ts:75](../../src/stories/text-split.stories.ts#L75) |
| motion/text/text-stroke | Motion/Text/Text stroke | p | 0 | layout/geometry — minimize | [src/stories/text-stroke.stories.ts:55](../../src/stories/text-stroke.stories.ts#L55) |

<a id="property-4"></a>

### 4. font-size — 211 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-text-sm) | 144 |
| var(--tp-text-xl) | 20 |
| var(--tp-text-2xl) | 11 |
| var(--tp-text-xs) | 11 |
| 2rem | 6 |
| var(--tp-text-lg) | 4 |
| 2.75rem | 3 |
| 2.25rem | 2 |
| 2.5rem | 2 |
| 3.5rem | 2 |
| 3rem | 2 |
| 1.25rem | 1 |
| 1.5rem | 1 |
| 1.75rem | 1 |
| 4rem | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/aspect-ratio | Common ratios | div | var(--tp-text-sm) | content appearance — review required | [docs/components/aspect-ratio.mdx:28](../../docs/components/aspect-ratio.mdx#L28) |
| components/aspect-ratio | Common ratios | div | var(--tp-text-sm) | content appearance — review required | [docs/components/aspect-ratio.mdx:31](../../docs/components/aspect-ratio.mdx#L31) |
| components/aspect-ratio | Common ratios | div | var(--tp-text-sm) | content appearance — review required | [docs/components/aspect-ratio.mdx:34](../../docs/components/aspect-ratio.mdx#L34) |
| components/aspect-ratio | One ratio, three widths | figcaption | var(--tp-text-xs) | content appearance — review required | [docs/components/aspect-ratio.mdx:60](../../docs/components/aspect-ratio.mdx#L60) |
| components/aspect-ratio | One ratio, three widths | figcaption | var(--tp-text-xs) | content appearance — review required | [docs/components/aspect-ratio.mdx:82](../../docs/components/aspect-ratio.mdx#L82) |
| components/aspect-ratio | One ratio, three widths | figcaption | var(--tp-text-xs) | content appearance — review required | [docs/components/aspect-ratio.mdx:104](../../docs/components/aspect-ratio.mdx#L104) |
| components/autocomplete | In a form | output | var(--tp-text-sm) | content appearance — review required | [docs/components/autocomplete.mdx:240](../../docs/components/autocomplete.mdx#L240) |
| components/avatar | Decorative avatar | div | var(--tp-text-sm) | content appearance — review required | [docs/components/avatar.mdx:162](../../docs/components/avatar.mdx#L162) |
| components/badge | Status in a list | tp-stack | var(--tp-text-sm) | component presentation override — review required | [docs/components/badge.mdx:65](../../docs/components/badge.mdx#L65) |
| components/button-group | Select and native select | output | var(--tp-text-sm) | content appearance — review required | [docs/components/button-group.mdx:258](../../docs/components/button-group.mdx#L258) |
| components/calendar | Nightly prices and booked dates | small | var(--tp-text-xs) | content appearance — review required | [docs/components/calendar.mdx:109](../../docs/components/calendar.mdx#L109) |
| components/calendar | Week numbers | p | var(--tp-text-sm) | content appearance — review required | [docs/components/calendar.mdx:162](../../docs/components/calendar.mdx#L162) |
| components/calendar | Value change | output | var(--tp-text-sm) | content appearance — review required | [docs/components/calendar.mdx:363](../../docs/components/calendar.mdx#L363) |
| components/card | Header action | span | var(--tp-text-sm) | content appearance — review required | [docs/components/card.mdx:39](../../docs/components/card.mdx#L39) |
| components/card | Small | p | var(--tp-text-2xl) | content appearance — review required | [docs/components/card.mdx:107](../../docs/components/card.mdx#L107) |
| components/card | Small | span | var(--tp-text-sm) | content appearance — review required | [docs/components/card.mdx:108](../../docs/components/card.mdx#L108) |
| components/carousel | Carousel | strong | var(--tp-text-xl) | content appearance — review required | [docs/components/carousel.mdx:21](../../docs/components/carousel.mdx#L21) |
| components/carousel | Carousel | strong | var(--tp-text-xl) | content appearance — review required | [docs/components/carousel.mdx:34](../../docs/components/carousel.mdx#L34) |
| components/carousel | Carousel | strong | var(--tp-text-xl) | content appearance — review required | [docs/components/carousel.mdx:47](../../docs/components/carousel.mdx#L47) |
| components/carousel | Carousel | strong | var(--tp-text-xl) | content appearance — review required | [docs/components/carousel.mdx:59](../../docs/components/carousel.mdx#L59) |
| components/carousel | Bullets inside | p | var(--tp-text-lg) | content appearance — review required | [docs/components/carousel.mdx:102](../../docs/components/carousel.mdx#L102) |
| components/carousel | Bullets inside | p | var(--tp-text-lg) | content appearance — review required | [docs/components/carousel.mdx:106](../../docs/components/carousel.mdx#L106) |
| components/carousel | Bullets inside | p | var(--tp-text-lg) | content appearance — review required | [docs/components/carousel.mdx:110](../../docs/components/carousel.mdx#L110) |
| components/carousel | Crossfade | strong | var(--tp-text-xl) | content appearance — review required | [docs/components/carousel.mdx:193](../../docs/components/carousel.mdx#L193) |
| components/carousel | Crossfade | strong | var(--tp-text-xl) | content appearance — review required | [docs/components/carousel.mdx:208](../../docs/components/carousel.mdx#L208) |
| components/carousel | Crossfade | strong | var(--tp-text-xl) | content appearance — review required | [docs/components/carousel.mdx:222](../../docs/components/carousel.mdx#L222) |
| components/carousel | Layered 3D | strong | var(--tp-text-2xl) | content appearance — review required | [docs/components/carousel.mdx:272](../../docs/components/carousel.mdx#L272) |
| components/carousel | Layered 3D | span | var(--tp-text-sm) | content appearance — review required | [docs/components/carousel.mdx:273](../../docs/components/carousel.mdx#L273) |
| components/carousel | Layered 3D | strong | var(--tp-text-2xl) | content appearance — review required | [docs/components/carousel.mdx:308](../../docs/components/carousel.mdx#L308) |
| components/carousel | Layered 3D | span | var(--tp-text-sm) | content appearance — review required | [docs/components/carousel.mdx:309](../../docs/components/carousel.mdx#L309) |
| components/carousel | Layered 3D | strong | var(--tp-text-2xl) | content appearance — review required | [docs/components/carousel.mdx:344](../../docs/components/carousel.mdx#L344) |
| components/carousel | Layered 3D | span | var(--tp-text-sm) | content appearance — review required | [docs/components/carousel.mdx:346](../../docs/components/carousel.mdx#L346) |
| components/carousel | Shader transition | figcaption | var(--tp-text-xl) | content appearance — review required | [docs/components/carousel.mdx:481](../../docs/components/carousel.mdx#L481) |
| components/carousel | Shader transition | figcaption | var(--tp-text-xl) | content appearance — review required | [docs/components/carousel.mdx:517](../../docs/components/carousel.mdx#L517) |
| components/carousel | Shader transition | figcaption | var(--tp-text-xl) | content appearance — review required | [docs/components/carousel.mdx:553](../../docs/components/carousel.mdx#L553) |
| components/carousel | Virtual archive with controlled selection | output | var(--tp-text-sm) | content appearance — review required | [docs/components/carousel.mdx:593](../../docs/components/carousel.mdx#L593) |
| components/carousel | Commit | output | var(--tp-text-sm) | content appearance — review required | [docs/components/carousel.mdx:664](../../docs/components/carousel.mdx#L664) |
| components/checkbox | Form values | output | var(--tp-text-sm) | content appearance — review required | [docs/components/checkbox.mdx:48](../../docs/components/checkbox.mdx#L48) |
| components/checkbox | CheckboxGroupController | output | var(--tp-text-sm) | content appearance — review required | [docs/components/checkbox.mdx:130](../../docs/components/checkbox.mdx#L130) |
| components/collapsible | Positional slots | span | var(--tp-text-sm) | content appearance — review required | [docs/components/collapsible.mdx:65](../../docs/components/collapsible.mdx#L65) |
| components/collapsible | Open change | output | var(--tp-text-sm) | content appearance — review required | [docs/components/collapsible.mdx:123](../../docs/components/collapsible.mdx#L123) |
| components/command-palette | Command palette | output | var(--tp-text-sm) | content appearance — review required | [docs/components/command-palette.mdx:19](../../docs/components/command-palette.mdx#L19) |
| components/copy-button | Beside a value | dl | var(--tp-text-sm) | content appearance — review required | [docs/components/copy-button.mdx:52](../../docs/components/copy-button.mdx#L52) |
| components/copy-button | Copy events | output | var(--tp-text-sm) | content appearance — review required | [docs/components/copy-button.mdx:120](../../docs/components/copy-button.mdx#L120) |
| components/cursor | Cursor | span | var(--tp-text-xs) | content appearance — review required | [docs/components/cursor.mdx:14](../../docs/components/cursor.mdx#L14) |
| components/cursor | Cursor | figcaption | var(--tp-text-sm) | content appearance — review required | [docs/components/cursor.mdx:18](../../docs/components/cursor.mdx#L18) |
| components/cursor | Cursor | figcaption | var(--tp-text-sm) | content appearance — review required | [docs/components/cursor.mdx:22](../../docs/components/cursor.mdx#L22) |
| components/cursor | Cursor | figcaption | var(--tp-text-sm) | content appearance — review required | [docs/components/cursor.mdx:26](../../docs/components/cursor.mdx#L26) |
| components/cursor | Spring | div | var(--tp-text-sm) | content appearance — review required | [docs/components/cursor.mdx:47](../../docs/components/cursor.mdx#L47) |
| components/cursor | Spring | div | var(--tp-text-sm) | content appearance — review required | [docs/components/cursor.mdx:51](../../docs/components/cursor.mdx#L51) |
| components/cursor | Zones | span | var(--tp-text-xs) | content appearance — review required | [docs/components/cursor.mdx:72](../../docs/components/cursor.mdx#L72) |
| components/cursor | Zones | span | var(--tp-text-sm) | content appearance — review required | [docs/components/cursor.mdx:75](../../docs/components/cursor.mdx#L75) |
| components/cursor | Zones | span | var(--tp-text-sm) | content appearance — review required | [docs/components/cursor.mdx:82](../../docs/components/cursor.mdx#L82) |
| components/dialog | Container modality | p | var(--tp-text-sm) | content appearance — review required | [docs/components/dialog.mdx:92](../../docs/components/dialog.mdx#L92) |
| components/drag-drop-list | Commit events | output | var(--tp-text-sm) | content appearance — review required | [docs/components/drag-drop-list.mdx:44](../../docs/components/drag-drop-list.mdx#L44) |
| components/drag-drop-list | Custom rows and overlay | output | var(--tp-text-sm) | content appearance — review required | [docs/components/drag-drop-list.mdx:117](../../docs/components/drag-drop-list.mdx#L117) |
| components/drag-drop-list | Board lanes | output | var(--tp-text-sm) | content appearance — review required | [docs/components/drag-drop-list.mdx:197](../../docs/components/drag-drop-list.mdx#L197) |
| components/drag-drop-list | Controlled lanes | output | var(--tp-text-sm) | content appearance — review required | [docs/components/drag-drop-list.mdx:251](../../docs/components/drag-drop-list.mdx#L251) |
| components/drag-drop-list | Approve before committing | output | var(--tp-text-sm) | content appearance — review required | [docs/components/drag-drop-list.mdx:321](../../docs/components/drag-drop-list.mdx#L321) |
| components/file-upload | Field and form | output | var(--tp-text-sm) | content appearance — review required | [docs/components/file-upload.mdx:238](../../docs/components/file-upload.mdx#L238) |
| components/form | Form | output | var(--tp-text-sm) | content appearance — review required | [docs/components/form.mdx:29](../../docs/components/form.mdx#L29) |
| components/form | Notification settings | output | var(--tp-text-sm) | content appearance — review required | [docs/components/form.mdx:79](../../docs/components/form.mdx#L79) |
| components/form | Wait for async checks | output | var(--tp-text-sm) | content appearance — review required | [docs/components/form.mdx:170](../../docs/components/form.mdx#L170) |
| components/form | Repeated emails | output | var(--tp-text-sm) | content appearance — review required | [docs/components/form.mdx:211](../../docs/components/form.mdx#L211) |
| components/image | Fallbacks | span | var(--tp-text-sm) | content appearance — review required | [docs/components/image.mdx:60](../../docs/components/image.mdx#L60) |
| components/list | Header and footer | span | var(--tp-text-xs) | content appearance — review required | [docs/components/list.mdx:149](../../docs/components/list.mdx#L149) |
| components/list | Header and footer | span | var(--tp-text-xs) | content appearance — review required | [docs/components/list.mdx:152](../../docs/components/list.mdx#L152) |
| components/marker | Native hosts and layout | output | var(--tp-text-sm) | content appearance — review required | [docs/components/marker.mdx:131](../../docs/components/marker.mdx#L131) |
| components/menu | Handling commands | output | var(--tp-text-sm) | content appearance — review required | [docs/components/menu.mdx:59](../../docs/components/menu.mdx#L59) |
| components/menu | Context invocation | div | var(--tp-text-sm) | content appearance — review required | [docs/components/menu.mdx:147](../../docs/components/menu.mdx#L147) |
| components/menubar | Active menu | output | var(--tp-text-sm) | content appearance — review required | [docs/components/menubar.mdx:111](../../docs/components/menubar.mdx#L111) |
| components/native-select | Form value | output | var(--tp-text-sm) | content appearance — review required | [docs/components/native-select.mdx:109](../../docs/components/native-select.mdx#L109) |
| components/native-select | Controlled value | output | var(--tp-text-sm) | content appearance — review required | [docs/components/native-select.mdx:140](../../docs/components/native-select.mdx#L140) |
| components/navigation-menu | Navigation menu | span | var(--tp-text-sm) | content appearance — review required | [docs/components/navigation-menu.mdx:24](../../docs/components/navigation-menu.mdx#L24) |
| components/navigation-menu | Navigation menu | span | var(--tp-text-sm) | content appearance — review required | [docs/components/navigation-menu.mdx:32](../../docs/components/navigation-menu.mdx#L32) |
| components/navigation-menu | Navigation menu | span | var(--tp-text-sm) | content appearance — review required | [docs/components/navigation-menu.mdx:40](../../docs/components/navigation-menu.mdx#L40) |
| components/navigation-menu | Navigation menu | span | var(--tp-text-sm) | content appearance — review required | [docs/components/navigation-menu.mdx:48](../../docs/components/navigation-menu.mdx#L48) |
| components/one-time-code-field | Verify on completion | output | var(--tp-text-sm) | content appearance — review required | [docs/components/one-time-code-field.mdx:95](../../docs/components/one-time-code-field.mdx#L95) |
| components/one-time-code-field | Controlled value | output | var(--tp-text-sm) | content appearance — review required | [docs/components/one-time-code-field.mdx:129](../../docs/components/one-time-code-field.mdx#L129) |
| components/pagination | Router handling | output | var(--tp-text-sm) | content appearance — review required | [docs/components/pagination.mdx:33](../../docs/components/pagination.mdx#L33) |
| components/pagination | Rows per page | output | var(--tp-text-sm) | content appearance — review required | [docs/components/pagination.mdx:121](../../docs/components/pagination.mdx#L121) |
| components/popover | Separate anchor | tp-stack | var(--tp-text-sm) | component presentation override — review required | [docs/components/popover.mdx:120](../../docs/components/popover.mdx#L120) |
| components/popover | Open change | output | var(--tp-text-sm) | content appearance — review required | [docs/components/popover.mdx:159](../../docs/components/popover.mdx#L159) |
| components/preview-card | Preview Card | div | var(--tp-text-sm) | content appearance — review required | [docs/components/preview-card.mdx:9](../../docs/components/preview-card.mdx#L9) |
| components/preview-card | Preview Card | span | var(--tp-text-xs) | content appearance — review required | [docs/components/preview-card.mdx:18](../../docs/components/preview-card.mdx#L18) |
| components/preview-card | Placement and arrow | span | var(--tp-text-xs) | content appearance — review required | [docs/components/preview-card.mdx:69](../../docs/components/preview-card.mdx#L69) |
| components/questionnaire | Submit | output | var(--tp-text-sm) | content appearance — review required | [docs/components/questionnaire.mdx:282](../../docs/components/questionnaire.mdx#L282) |
| components/questionnaire | Checkpoint and cross-answer validation | output | var(--tp-text-sm) | content appearance — review required | [docs/components/questionnaire.mdx:315](../../docs/components/questionnaire.mdx#L315) |
| components/questionnaire | Clarification dialog | output | var(--tp-text-sm) | content appearance — review required | [docs/components/questionnaire.mdx:611](../../docs/components/questionnaire.mdx#L611) |
| components/radio-group | Value change | output | var(--tp-text-sm) | content appearance — review required | [docs/components/radio-group.mdx:164](../../docs/components/radio-group.mdx#L164) |
| components/resizable-panel-group | Resizable Panel Group | div | var(--tp-text-sm) | content appearance — review required | [docs/components/resizable-panel-group.mdx:13](../../docs/components/resizable-panel-group.mdx#L13) |
| components/resizable-panel-group | Resizable Panel Group | div | var(--tp-text-sm) | content appearance — review required | [docs/components/resizable-panel-group.mdx:24](../../docs/components/resizable-panel-group.mdx#L24) |
| components/resizable-panel-group | Resizable Panel Group | div | var(--tp-text-sm) | content appearance — review required | [docs/components/resizable-panel-group.mdx:32](../../docs/components/resizable-panel-group.mdx#L32) |
| components/resizable-panel-group | Bounds | div | var(--tp-text-sm) | content appearance — review required | [docs/components/resizable-panel-group.mdx:58](../../docs/components/resizable-panel-group.mdx#L58) |
| components/resizable-panel-group | Bounds | div | var(--tp-text-sm) | content appearance — review required | [docs/components/resizable-panel-group.mdx:62](../../docs/components/resizable-panel-group.mdx#L62) |
| components/resizable-panel-group | Vertical | div | var(--tp-text-sm) | content appearance — review required | [docs/components/resizable-panel-group.mdx:76](../../docs/components/resizable-panel-group.mdx#L76) |
| components/resizable-panel-group | Vertical | div | var(--tp-text-sm) | content appearance — review required | [docs/components/resizable-panel-group.mdx:80](../../docs/components/resizable-panel-group.mdx#L80) |
| components/resizable-panel-group | Collapsible sidebar | div | var(--tp-text-sm) | content appearance — review required | [docs/components/resizable-panel-group.mdx:105](../../docs/components/resizable-panel-group.mdx#L105) |
| components/resizable-panel-group | Collapsible sidebar | div | var(--tp-text-sm) | content appearance — review required | [docs/components/resizable-panel-group.mdx:109](../../docs/components/resizable-panel-group.mdx#L109) |
| components/resizable-panel-group | Layout events | div | var(--tp-text-sm) | content appearance — review required | [docs/components/resizable-panel-group.mdx:140](../../docs/components/resizable-panel-group.mdx#L140) |
| components/resizable-panel-group | Layout events | div | var(--tp-text-sm) | content appearance — review required | [docs/components/resizable-panel-group.mdx:144](../../docs/components/resizable-panel-group.mdx#L144) |
| components/resizable-panel-group | Layout events | output | var(--tp-text-sm) | content appearance — review required | [docs/components/resizable-panel-group.mdx:149](../../docs/components/resizable-panel-group.mdx#L149) |
| components/resizable-panel-group | Layout presets | div | var(--tp-text-sm) | content appearance — review required | [docs/components/resizable-panel-group.mdx:188](../../docs/components/resizable-panel-group.mdx#L188) |
| components/resizable-panel-group | Layout presets | div | var(--tp-text-sm) | content appearance — review required | [docs/components/resizable-panel-group.mdx:192](../../docs/components/resizable-panel-group.mdx#L192) |
| components/resizable-panel-group | Persisted sizes | div | var(--tp-text-sm) | content appearance — review required | [docs/components/resizable-panel-group.mdx:231](../../docs/components/resizable-panel-group.mdx#L231) |
| components/resizable-panel-group | Persisted sizes | div | var(--tp-text-sm) | content appearance — review required | [docs/components/resizable-panel-group.mdx:235](../../docs/components/resizable-panel-group.mdx#L235) |
| components/resizable-panel-group | Persisted sizes | span | var(--tp-text-sm) | content appearance — review required | [docs/components/resizable-panel-group.mdx:238](../../docs/components/resizable-panel-group.mdx#L238) |
| components/resizable-panel-group | Disabled | div | var(--tp-text-sm) | content appearance — review required | [docs/components/resizable-panel-group.mdx:272](../../docs/components/resizable-panel-group.mdx#L272) |
| components/resizable-panel-group | Disabled | div | var(--tp-text-sm) | content appearance — review required | [docs/components/resizable-panel-group.mdx:276](../../docs/components/resizable-panel-group.mdx#L276) |
| components/scroll-area | Scroll Area | div | var(--tp-text-sm) | content appearance — review required | [docs/components/scroll-area.mdx:10](../../docs/components/scroll-area.mdx#L10) |
| components/scroll-area | Horizontal | tp-card | var(--tp-text-sm) | component presentation override — review required | [docs/components/scroll-area.mdx:60](../../docs/components/scroll-area.mdx#L60) |
| components/scroll-area | Horizontal | tp-card | var(--tp-text-sm) | component presentation override — review required | [docs/components/scroll-area.mdx:63](../../docs/components/scroll-area.mdx#L63) |
| components/scroll-area | Horizontal | tp-card | var(--tp-text-sm) | component presentation override — review required | [docs/components/scroll-area.mdx:66](../../docs/components/scroll-area.mdx#L66) |
| components/scroll-area | Horizontal | tp-card | var(--tp-text-sm) | component presentation override — review required | [docs/components/scroll-area.mdx:69](../../docs/components/scroll-area.mdx#L69) |
| components/scroll-area | Horizontal | tp-card | var(--tp-text-sm) | component presentation override — review required | [docs/components/scroll-area.mdx:72](../../docs/components/scroll-area.mdx#L72) |
| components/scroll-area | Both axes | table | var(--tp-text-sm) | content appearance — review required | [docs/components/scroll-area.mdx:87](../../docs/components/scroll-area.mdx#L87) |
| components/scroll-area | Visibility | tp-stack | var(--tp-text-sm) | component presentation override — review required | [docs/components/scroll-area.mdx:128](../../docs/components/scroll-area.mdx#L128) |
| components/scroll-area | Visibility | tp-stack | var(--tp-text-sm) | component presentation override — review required | [docs/components/scroll-area.mdx:147](../../docs/components/scroll-area.mdx#L147) |
| components/scroll-area | Edge fade | tp-stack | var(--tp-text-sm) | component presentation override — review required | [docs/components/scroll-area.mdx:171](../../docs/components/scroll-area.mdx#L171) |
| components/scroll-trigger | Scroll Trigger | h3 | var(--tp-text-2xl) | content appearance — review required | [docs/components/scroll-trigger.mdx:12](../../docs/components/scroll-trigger.mdx#L12) |
| components/scroll-trigger | From the center | p | var(--tp-text-xl) | content appearance — review required | [docs/components/scroll-trigger.mdx:45](../../docs/components/scroll-trigger.mdx#L45) |
| components/scroll-trigger | From the center | p | var(--tp-text-xl) | content appearance — review required | [docs/components/scroll-trigger.mdx:46](../../docs/components/scroll-trigger.mdx#L46) |
| components/scroll-trigger | From the center | p | var(--tp-text-xl) | content appearance — review required | [docs/components/scroll-trigger.mdx:47](../../docs/components/scroll-trigger.mdx#L47) |
| components/scroll-trigger | From the center | p | var(--tp-text-xl) | content appearance — review required | [docs/components/scroll-trigger.mdx:48](../../docs/components/scroll-trigger.mdx#L48) |
| components/scroll-trigger | From the center | p | var(--tp-text-xl) | content appearance — review required | [docs/components/scroll-trigger.mdx:49](../../docs/components/scroll-trigger.mdx#L49) |
| components/scroll-trigger | Replay on entry | p | var(--tp-text-xl) | content appearance — review required | [docs/components/scroll-trigger.mdx:63](../../docs/components/scroll-trigger.mdx#L63) |
| components/scroll-trigger | Scrubbed band | p | var(--tp-text-xl) | content appearance — review required | [docs/components/scroll-trigger.mdx:103](../../docs/components/scroll-trigger.mdx#L103) |
| components/scroll-trigger | Scrubbed band | p | var(--tp-text-xl) | content appearance — review required | [docs/components/scroll-trigger.mdx:104](../../docs/components/scroll-trigger.mdx#L104) |
| components/scroll-trigger | Scrubbed band | p | var(--tp-text-xl) | content appearance — review required | [docs/components/scroll-trigger.mdx:105](../../docs/components/scroll-trigger.mdx#L105) |
| components/scroll-trigger | Custom scroll range | h3 | var(--tp-text-2xl) | content appearance — review required | [docs/components/scroll-trigger.mdx:151](../../docs/components/scroll-trigger.mdx#L151) |
| components/scroll-trigger | Pinned scene | p | var(--tp-text-sm) | content appearance — review required | [docs/components/scroll-trigger.mdx:210](../../docs/components/scroll-trigger.mdx#L210) |
| components/scroll-trigger | Pinned scene | h3 | var(--tp-text-2xl) | content appearance — review required | [docs/components/scroll-trigger.mdx:214](../../docs/components/scroll-trigger.mdx#L214) |
| components/scroll-trigger | Reveal events | p | var(--tp-text-xl) | content appearance — review required | [docs/components/scroll-trigger.mdx:241](../../docs/components/scroll-trigger.mdx#L241) |
| components/scroll-trigger | Reveal events | output | var(--tp-text-sm) | content appearance — review required | [docs/components/scroll-trigger.mdx:246](../../docs/components/scroll-trigger.mdx#L246) |
| components/select | Value change | output | var(--tp-text-sm) | content appearance — review required | [docs/components/select.mdx:313](../../docs/components/select.mdx#L313) |
| components/slider | Compact readout | span | var(--tp-text-sm) | content appearance — review required | [docs/components/slider.mdx:203](../../docs/components/slider.mdx#L203) |
| components/slider | Compact readout | span | var(--tp-text-sm) | content appearance — review required | [docs/components/slider.mdx:205](../../docs/components/slider.mdx#L205) |
| components/tabs | Change event and setValue | output | var(--tp-text-sm) | content appearance — review required | [docs/components/tabs.mdx:129](../../docs/components/tabs.mdx#L129) |
| components/tabs | Controlled with a veto | p | var(--tp-text-sm) | content appearance — review required | [docs/components/tabs.mdx:183](../../docs/components/tabs.mdx#L183) |
| components/text-area | Character count | output | var(--tp-text-sm) | content appearance — review required | [docs/components/text-area.mdx:93](../../docs/components/text-area.mdx#L93) |
| components/text-transform | Text transform | dl | var(--tp-text-sm) | content appearance — review required | [docs/components/text-transform.mdx:11](../../docs/components/text-transform.mdx#L11) |
| components/text-transform | Case and identifiers | dl | var(--tp-text-sm) | content appearance — review required | [docs/components/text-transform.mdx:35](../../docs/components/text-transform.mdx#L35) |
| components/text-transform | Uploads | span | var(--tp-text-sm) | content appearance — review required | [docs/components/text-transform.mdx:97](../../docs/components/text-transform.mdx#L97) |
| components/text-transform | Uploads | span | var(--tp-text-sm) | content appearance — review required | [docs/components/text-transform.mdx:101](../../docs/components/text-transform.mdx#L101) |
| components/text-transform | Locales | tp-stack | var(--tp-text-sm) | component presentation override — review required | [docs/components/text-transform.mdx:112](../../docs/components/text-transform.mdx#L112) |
| components/text-transform | Truncation | tp-stack | var(--tp-text-sm) | component presentation override — review required | [docs/components/text-transform.mdx:135](../../docs/components/text-transform.mdx#L135) |
| components/text-transform | Length limits | tp-stack | var(--tp-text-sm) | component presentation override — review required | [docs/components/text-transform.mdx:163](../../docs/components/text-transform.mdx#L163) |
| components/text-transform | Formatter | tp-stack | var(--tp-text-sm) | component presentation override — review required | [docs/components/text-transform.mdx:184](../../docs/components/text-transform.mdx#L184) |
| components/text-transform | Named presets | tp-stack | var(--tp-text-sm) | component presentation override — review required | [docs/components/text-transform.mdx:206](../../docs/components/text-transform.mdx#L206) |
| components/text-transform | Unreadable input | p | var(--tp-text-sm) | content appearance — review required | [docs/components/text-transform.mdx:224](../../docs/components/text-transform.mdx#L224) |
| components/theme-switcher | Theme switcher | span | var(--tp-text-sm) | content appearance — review required | [docs/components/theme-switcher.mdx:15](../../docs/components/theme-switcher.mdx#L15) |
| components/theme-switcher | Small, defaulting to dark | span | var(--tp-text-sm) | content appearance — review required | [docs/components/theme-switcher.mdx:90](../../docs/components/theme-switcher.mdx#L90) |
| components/theme-switcher | Explicit choices only | output | var(--tp-text-sm) | content appearance — review required | [docs/components/theme-switcher.mdx:119](../../docs/components/theme-switcher.mdx#L119) |
| components/time | Time | ul | var(--tp-text-sm) | content appearance — review required | [docs/components/time.mdx:13](../../docs/components/time.mdx#L13) |
| components/time | Modes | dl | var(--tp-text-sm) | content appearance — review required | [docs/components/time.mdx:55](../../docs/components/time.mdx#L55) |
| components/time | Absolute formats | tp-stack | var(--tp-text-sm) | component presentation override — review required | [docs/components/time.mdx:88](../../docs/components/time.mdx#L88) |
| components/time | Dates and zones | tp-stack | var(--tp-text-sm) | component presentation override — review required | [docs/components/time.mdx:115](../../docs/components/time.mdx#L115) |
| components/time | Calendar | dl | var(--tp-text-sm) | content appearance — review required | [docs/components/time.mdx:147](../../docs/components/time.mdx#L147) |
| components/time | Short and narrow | tp-stack | var(--tp-text-sm) | component presentation override — review required | [docs/components/time.mdx:170](../../docs/components/time.mdx#L170) |
| components/time | Precisions | dl | var(--tp-text-sm) | content appearance — review required | [docs/components/time.mdx:187](../../docs/components/time.mdx#L187) |
| components/time | Timers | dl | var(--tp-text-sm) | content appearance — review required | [docs/components/time.mdx:202](../../docs/components/time.mdx#L202) |
| components/time | Description | span | var(--tp-text-sm) | content appearance — review required | [docs/components/time.mdx:222](../../docs/components/time.mdx#L222) |
| components/time | Fallback | span | var(--tp-text-sm) | content appearance — review required | [docs/components/time.mdx:242](../../docs/components/time.mdx#L242) |
| components/toggle-group | Required choice | output | var(--tp-text-sm) | content appearance — review required | [docs/components/toggle-group.mdx:151](../../docs/components/toggle-group.mdx#L151) |
| components/toggle | Change events | output | var(--tp-text-sm) | content appearance — review required | [docs/components/toggle.mdx:137](../../docs/components/toggle.mdx#L137) |
| components/tooltip | Cursor tracking | div | var(--tp-text-sm) | content appearance — review required | [docs/components/tooltip.mdx:69](../../docs/components/tooltip.mdx#L69) |
| components/tree-view | Opening items | output | var(--tp-text-sm) | content appearance — review required | [docs/components/tree-view.mdx:99](../../docs/components/tree-view.mdx#L99) |
| components/tree-view | Rendered rows | output | var(--tp-text-sm) | content appearance — review required | [docs/components/tree-view.mdx:182](../../docs/components/tree-view.mdx#L182) |
| components/tree-view | Controlled lanes | output | var(--tp-text-sm) | content appearance — review required | [docs/components/tree-view.mdx:271](../../docs/components/tree-view.mdx#L271) |
| motion/surface/glow-border | Custom colors | p | var(--tp-text-2xl) | content appearance — review required | [docs/motion/surface/glow-border.mdx:145](../../docs/motion/surface/glow-border.mdx#L145) |
| motion/surface/glow-border | Custom colors | span | var(--tp-text-sm) | content appearance — review required | [docs/motion/surface/glow-border.mdx:145](../../docs/motion/surface/glow-border.mdx#L145) |
| motion/surface/segment-border | Traced in | p | var(--tp-text-2xl) | content appearance — review required | [docs/motion/surface/segment-border.mdx:125](../../docs/motion/surface/segment-border.mdx#L125) |
| motion/surface/segment-border | Traced in | p | var(--tp-text-2xl) | content appearance — review required | [docs/motion/surface/segment-border.mdx:133](../../docs/motion/surface/segment-border.mdx#L133) |
| motion/surface/segment-border | Traced in | p | var(--tp-text-2xl) | content appearance — review required | [docs/motion/surface/segment-border.mdx:141](../../docs/motion/surface/segment-border.mdx#L141) |
| motion/text/text-mirror | Text mirror | p | 2.75rem | content appearance — review required | [docs/motion/text/text-mirror.mdx:9](../../docs/motion/text/text-mirror.mdx#L9) |
| motion/text/text-mirror | From the center line | p | 1.25rem | content appearance — review required | [docs/motion/text/text-mirror.mdx:28](../../docs/motion/text/text-mirror.mdx#L28) |
| motion/text/text-mirror | Vertical seam | p | 2.25rem | content appearance — review required | [docs/motion/text/text-mirror.mdx:41](../../docs/motion/text/text-mirror.mdx#L41) |
| motion/text/text-mirror | Hide and reveal | p | 1.5rem | content appearance — review required | [docs/motion/text/text-mirror.mdx:59](../../docs/motion/text/text-mirror.mdx#L59) |
| motion/text/text-mirror | Scrubbed by the scroll | p | 2rem | content appearance — review required | [docs/motion/text/text-mirror.mdx:93](../../docs/motion/text/text-mirror.mdx#L93) |
| motion/text/text-split | Text split | p | 2.75rem | content appearance — review required | [docs/motion/text/text-split.mdx:9](../../docs/motion/text/text-split.mdx#L9) |
| motion/text/text-split | Words behind a mask | p | 2rem | content appearance — review required | [docs/motion/text/text-split.mdx:34](../../docs/motion/text/text-split.mdx#L34) |
| motion/text/text-split | Characters from the center | p | 2.5rem | content appearance — review required | [docs/motion/text/text-split.mdx:47](../../docs/motion/text/text-split.mdx#L47) |
| motion/text/text-split | Slow stagger | p | 1.75rem | content appearance — review required | [docs/motion/text/text-split.mdx:58](../../docs/motion/text/text-split.mdx#L58) |
| motion/text/text-split | Reveal on demand | p | 2rem | content appearance — review required | [docs/motion/text/text-split.mdx:76](../../docs/motion/text/text-split.mdx#L76) |
| motion/text/text-split | Custom reveal | p | 2rem | content appearance — review required | [docs/motion/text/text-split.mdx:112](../../docs/motion/text/text-split.mdx#L112) |
| motion/text/text-split | Inline formatting | p | var(--tp-text-lg) | content appearance — review required | [docs/motion/text/text-split.mdx:127](../../docs/motion/text/text-split.mdx#L127) |
| motion/text/text-split | Scrubbed by the scroll | p | 2rem | content appearance — review required | [docs/motion/text/text-split.mdx:161](../../docs/motion/text/text-split.mdx#L161) |
| motion/text/text-stroke | Text stroke | p | 3.5rem | content appearance — review required | [docs/motion/text/text-stroke.mdx:9](../../docs/motion/text/text-stroke.mdx#L9) |
| motion/text/text-stroke | Word by word | p | 2.25rem | content appearance — review required | [docs/motion/text/text-stroke.mdx:28](../../docs/motion/text/text-stroke.mdx#L28) |
| motion/text/text-stroke | Heavier outline | p | 4rem | content appearance — review required | [docs/motion/text/text-stroke.mdx:39](../../docs/motion/text/text-stroke.mdx#L39) |
| motion/text/text-stroke | Hide and reveal | p | 3rem | content appearance — review required | [docs/motion/text/text-stroke.mdx:58](../../docs/motion/text/text-stroke.mdx#L58) |
| motion/text/text-stroke | Scrubbed by the scroll | p | 3rem | content appearance — review required | [docs/motion/text/text-stroke.mdx:102](../../docs/motion/text/text-stroke.mdx#L102) |
| widgets/color-picker | Popup in a form | output | var(--tp-text-sm) | content appearance — review required | [docs/widgets/color-picker.mdx:66](../../docs/widgets/color-picker.mdx#L66) |
| widgets/color-picker | Commit events | output | var(--tp-text-sm) | content appearance — review required | [docs/widgets/color-picker.mdx:208](../../docs/widgets/color-picker.mdx#L208) |
| widgets/easing-editor | Commit and veto | output | var(--tp-text-sm) | content appearance — review required | [docs/widgets/easing-editor.mdx:141](../../docs/widgets/easing-editor.mdx#L141) |
| widgets/easing-editor | Controlled owner | code | var(--tp-text-xs) | content appearance — review required | [docs/widgets/easing-editor.mdx:165](../../docs/widgets/easing-editor.mdx#L165) |
| widgets/emoji-picker | Picks | output | var(--tp-text-sm) | content appearance — review required | [docs/widgets/emoji-picker.mdx:28](../../docs/widgets/emoji-picker.mdx#L28) |
| widgets/emoji-picker | Remembered tone | output | var(--tp-text-sm) | content appearance — review required | [docs/widgets/emoji-picker.mdx:87](../../docs/widgets/emoji-picker.mdx#L87) |
| widgets/emoji-picker | Popup in a form | output | var(--tp-text-sm) | content appearance — review required | [docs/widgets/emoji-picker.mdx:214](../../docs/widgets/emoji-picker.mdx#L214) |
| widgets/flow | Automatic layout | output | var(--tp-text-sm) | content appearance — review required | [docs/widgets/flow.mdx:333](../../docs/widgets/flow.mdx#L333) |
| widgets/flow | Commit and selection | output | var(--tp-text-sm) | content appearance — review required | [docs/widgets/flow.mdx:409](../../docs/widgets/flow.mdx#L409) |
| widgets/flow | Controlled owner | output | var(--tp-text-sm) | content appearance — review required | [docs/widgets/flow.mdx:453](../../docs/widgets/flow.mdx#L453) |
| widgets/flow | Run requests | strong | var(--tp-text-sm) | content appearance — review required | [docs/widgets/flow.mdx:569](../../docs/widgets/flow.mdx#L569) |
| widgets/flow | In a form | output | var(--tp-text-sm) | content appearance — review required | [docs/widgets/flow.mdx:712](../../docs/widgets/flow.mdx#L712) |
| widgets/text-editor | In a form | output | var(--tp-text-sm) | content appearance — review required | [docs/widgets/text-editor.mdx:576](../../docs/widgets/text-editor.mdx#L576) |
| components/scroll-area | Components/Scroll area | h3 | var(--tp-text-sm) | content appearance — review required | [src/stories/scroll-area.stories.ts:48](../../src/stories/scroll-area.stories.ts#L48) |
| components/scroll-area | Components/Scroll area | div | var(--tp-text-sm) | content appearance — review required | [src/stories/scroll-area.stories.ts:52](../../src/stories/scroll-area.stories.ts#L52) |
| components/scroll-trigger | (file/setup/shared helper) | h3 | 2rem | content appearance — review required | [src/stories/scroll-trigger.stories.ts:17](../../src/stories/scroll-trigger.stories.ts#L17) |
| motion/text/text-mirror | Motion/Text/Text mirror | p | 2.75rem | content appearance — review required | [src/stories/text-mirror.stories.ts:55](../../src/stories/text-mirror.stories.ts#L55) |
| motion/text/text-split | Motion/Text/Text split | h2 | 2.5rem | content appearance — review required | [src/stories/text-split.stories.ts:75](../../src/stories/text-split.stories.ts#L75) |
| motion/text/text-stroke | Motion/Text/Text stroke | p | 3.5rem | content appearance — review required | [src/stories/text-stroke.stories.ts:55](../../src/stories/text-stroke.stories.ts#L55) |

<a id="property-5"></a>

### 5. block-size — 179 occurrences

| Value | Occurrences |
| --- | ---: |
| 100% | 28 |
| var(--tp-space-4) | 26 |
| 0.75rem | 24 |
| 20rem | 17 |
| 6rem | 12 |
| 12rem | 7 |
| 22rem | 7 |
| 10rem | 5 |
| 22.5rem | 5 |
| var(--tp-control-height-md) | 5 |
| 16rem | 4 |
| 24rem | 4 |
| 34rem | 4 |
| 18rem | 3 |
| 26rem | 3 |
| 30rem | 3 |
| var(--tp-space-10) | 3 |
| 14rem | 2 |
| 8rem | 2 |
| 9rem | 2 |
| var(--tp-space-5) | 2 |
| 11rem | 1 |
| 17rem | 1 |
| 4.5rem | 1 |
| 4rem | 1 |
| calc(var(--tp-space-16) * 3) | 1 |
| calc(var(--tp-space-16) * 4) | 1 |
| calc(var(--tp-space-16) * 5) | 1 |
| calc(var(--tp-spacing) * 90) | 1 |
| var(--tp-icon-size-sm) | 1 |
| var(--tp-space-2) | 1 |
| var(--tp-space-6) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/aspect-ratio | Common ratios | div | 100% | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:28](../../docs/components/aspect-ratio.mdx#L28) |
| components/aspect-ratio | Common ratios | div | 100% | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:31](../../docs/components/aspect-ratio.mdx#L31) |
| components/aspect-ratio | Common ratios | div | 100% | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:34](../../docs/components/aspect-ratio.mdx#L34) |
| components/attachment | Image cards | div | 100% | layout/geometry — minimize | [docs/components/attachment.mdx:89](../../docs/components/attachment.mdx#L89) |
| components/attachment | Image cards | div | 100% | layout/geometry — minimize | [docs/components/attachment.mdx:92](../../docs/components/attachment.mdx#L92) |
| components/attachment | Image cards | div | 100% | layout/geometry — minimize | [docs/components/attachment.mdx:95](../../docs/components/attachment.mdx#L95) |
| components/attachment | Image cards | div | 100% | layout/geometry — minimize | [docs/components/attachment.mdx:98](../../docs/components/attachment.mdx#L98) |
| components/attachment | Scrollable groups | div | 100% | layout/geometry — minimize | [docs/components/attachment.mdx:192](../../docs/components/attachment.mdx#L192) |
| components/attachment | Scrollable groups | div | 100% | layout/geometry — minimize | [docs/components/attachment.mdx:256](../../docs/components/attachment.mdx#L256) |
| components/carousel | Vertical | tp-carousel | 17rem | layout/geometry — minimize | [docs/components/carousel.mdx:155](../../docs/components/carousel.mdx#L155) |
| components/carousel | Layered 3D | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:255](../../docs/components/carousel.mdx#L255) |
| components/carousel | Layered 3D | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:291](../../docs/components/carousel.mdx#L291) |
| components/carousel | Layered 3D | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:327](../../docs/components/carousel.mdx#L327) |
| components/carousel | Parallax | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:366](../../docs/components/carousel.mdx#L366) |
| components/carousel | Parallax | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:369](../../docs/components/carousel.mdx#L369) |
| components/carousel | Parallax | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:372](../../docs/components/carousel.mdx#L372) |
| components/carousel | Parallax | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:375](../../docs/components/carousel.mdx#L375) |
| components/carousel | Focus | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:397](../../docs/components/carousel.mdx#L397) |
| components/carousel | Focus | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:401](../../docs/components/carousel.mdx#L401) |
| components/carousel | Focus | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:405](../../docs/components/carousel.mdx#L405) |
| components/carousel | Focus | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:409](../../docs/components/carousel.mdx#L409) |
| components/carousel | Focus | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:413](../../docs/components/carousel.mdx#L413) |
| components/carousel | Shader transition | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:471](../../docs/components/carousel.mdx#L471) |
| components/carousel | Shader transition | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:507](../../docs/components/carousel.mdx#L507) |
| components/carousel | Shader transition | img | 100% | layout/geometry — minimize | [docs/components/carousel.mdx:543](../../docs/components/carousel.mdx#L543) |
| components/cursor | Cursor | span | 4.5rem | layout/geometry — minimize | [docs/components/cursor.mdx:14](../../docs/components/cursor.mdx#L14) |
| components/cursor | Zones | span | 4rem | layout/geometry — minimize | [docs/components/cursor.mdx:72](../../docs/components/cursor.mdx#L72) |
| components/cursor | Dot and ring | span | var(--tp-space-2) | layout/geometry — minimize | [docs/components/cursor.mdx:136](../../docs/components/cursor.mdx#L136) |
| components/image | Fallbacks | span | 100% | layout/geometry — minimize | [docs/components/image.mdx:60](../../docs/components/image.mdx#L60) |
| components/image | Loading placeholders | img | 100% | layout/geometry — minimize | [docs/components/image.mdx:74](../../docs/components/image.mdx#L74) |
| components/image | Reveal timing and repeat | div | 20rem | layout/geometry — minimize | [docs/components/image.mdx:137](../../docs/components/image.mdx#L137) |
| components/image | Reveal timing and repeat | p | 22rem | layout/geometry — minimize | [docs/components/image.mdx:143](../../docs/components/image.mdx#L143) |
| components/image | Parallax in a scroller | div | 20rem | layout/geometry — minimize | [docs/components/image.mdx:186](../../docs/components/image.mdx#L186) |
| components/image | Scroll zoom in a vertical scroller | div | 24rem | layout/geometry — minimize | [docs/components/image.mdx:198](../../docs/components/image.mdx#L198) |
| components/image | Smoothing | div | 20rem | layout/geometry — minimize | [docs/components/image.mdx:272](../../docs/components/image.mdx#L272) |
| components/map | Selected pin | tp-map | calc(var(--tp-space-16) * 5) | layout/geometry — minimize | [docs/components/map.mdx:254](../../docs/components/map.mdx#L254) |
| components/map | External controls | tp-map | calc(var(--tp-space-16) * 4) | layout/geometry — minimize | [docs/components/map.mdx:349](../../docs/components/map.mdx#L349) |
| components/map | Status slot | tp-map | calc(var(--tp-space-16) * 3) | layout/geometry — minimize | [docs/components/map.mdx:363](../../docs/components/map.mdx#L363) |
| components/markdown | With a table of contents | tp-scroll-area | 22rem | layout/geometry — minimize | [docs/components/markdown.mdx:239](../../docs/components/markdown.mdx#L239) |
| components/marker | Native hosts and layout | tp-icon | var(--tp-icon-size-sm) | layout/geometry — minimize | [docs/components/marker.mdx:126](../../docs/components/marker.mdx#L126) |
| components/navigation-panel | Navigation panel | div | 34rem | layout/geometry — minimize | [docs/components/navigation-panel.mdx:11](../../docs/components/navigation-panel.mdx#L11) |
| components/navigation-panel | Off-canvas | div | 22rem | layout/geometry — minimize | [docs/components/navigation-panel.mdx:102](../../docs/components/navigation-panel.mdx#L102) |
| components/navigation-panel | Collapsible groups | div | 26rem | layout/geometry — minimize | [docs/components/navigation-panel.mdx:133](../../docs/components/navigation-panel.mdx#L133) |
| components/navigation-panel | Drawer mode | div | 16rem | layout/geometry — minimize | [docs/components/navigation-panel.mdx:187](../../docs/components/navigation-panel.mdx#L187) |
| components/navigation-panel | Floating | div | 20rem | layout/geometry — minimize | [docs/components/navigation-panel.mdx:217](../../docs/components/navigation-panel.mdx#L217) |
| components/navigation-panel | Team switcher and row actions | div | 30rem | layout/geometry — minimize | [docs/components/navigation-panel.mdx:250](../../docs/components/navigation-panel.mdx#L250) |
| components/overflow-list | Row limit | tp-resizable-panel-group | 8rem | layout/geometry — minimize | [docs/components/overflow-list.mdx:50](../../docs/components/overflow-list.mdx#L50) |
| components/resizable-panel-group | Resizable Panel Group | tp-resizable-panel-group | 18rem | layout/geometry — minimize | [docs/components/resizable-panel-group.mdx:11](../../docs/components/resizable-panel-group.mdx#L11) |
| components/resizable-panel-group | Bounds | tp-resizable-panel-group | 12rem | layout/geometry — minimize | [docs/components/resizable-panel-group.mdx:56](../../docs/components/resizable-panel-group.mdx#L56) |
| components/resizable-panel-group | Vertical | tp-resizable-panel-group | 16rem | layout/geometry — minimize | [docs/components/resizable-panel-group.mdx:74](../../docs/components/resizable-panel-group.mdx#L74) |
| components/resizable-panel-group | Collapsible sidebar | tp-resizable-panel-group | 12rem | layout/geometry — minimize | [docs/components/resizable-panel-group.mdx:97](../../docs/components/resizable-panel-group.mdx#L97) |
| components/resizable-panel-group | Layout events | tp-resizable-panel-group | 10rem | layout/geometry — minimize | [docs/components/resizable-panel-group.mdx:133](../../docs/components/resizable-panel-group.mdx#L133) |
| components/resizable-panel-group | Layout presets | tp-resizable-panel-group | 10rem | layout/geometry — minimize | [docs/components/resizable-panel-group.mdx:181](../../docs/components/resizable-panel-group.mdx#L181) |
| components/resizable-panel-group | Persisted sizes | tp-resizable-panel-group | 10rem | layout/geometry — minimize | [docs/components/resizable-panel-group.mdx:224](../../docs/components/resizable-panel-group.mdx#L224) |
| components/resizable-panel-group | Disabled | tp-resizable-panel-group | 8rem | layout/geometry — minimize | [docs/components/resizable-panel-group.mdx:270](../../docs/components/resizable-panel-group.mdx#L270) |
| components/scroll-area | Scroll Area | tp-scroll-area | 18rem | layout/geometry — minimize | [docs/components/scroll-area.mdx:9](../../docs/components/scroll-area.mdx#L9) |
| components/scroll-area | Both axes | tp-scroll-area | 12rem | layout/geometry — minimize | [docs/components/scroll-area.mdx:86](../../docs/components/scroll-area.mdx#L86) |
| components/scroll-area | Visibility | tp-scroll-area | 9rem | layout/geometry — minimize | [docs/components/scroll-area.mdx:120](../../docs/components/scroll-area.mdx#L120) |
| components/scroll-area | Visibility | tp-scroll-area | 9rem | layout/geometry — minimize | [docs/components/scroll-area.mdx:139](../../docs/components/scroll-area.mdx#L139) |
| components/scroll-area | Edge fade | tp-scroll-area | 10rem | layout/geometry — minimize | [docs/components/scroll-area.mdx:169](../../docs/components/scroll-area.mdx#L169) |
| components/scroll-trigger | Replay on entry | div | 14rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:60](../../docs/components/scroll-trigger.mdx#L60) |
| components/scroll-trigger | Replay on entry | p | 16rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:61](../../docs/components/scroll-trigger.mdx#L61) |
| components/scroll-trigger | Replay on entry | div | 16rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:66](../../docs/components/scroll-trigger.mdx#L66) |
| components/scroll-trigger | Scrubbed band | div | 20rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:78](../../docs/components/scroll-trigger.mdx#L78) |
| components/scroll-trigger | Scrubbed band | tp-stack | 20rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:88](../../docs/components/scroll-trigger.mdx#L88) |
| components/scroll-trigger | Scrubbed band | tp-skeleton | 0.75rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:92](../../docs/components/scroll-trigger.mdx#L92) |
| components/scroll-trigger | Scrubbed band | tp-skeleton | 0.75rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:93](../../docs/components/scroll-trigger.mdx#L93) |
| components/scroll-trigger | Scrubbed band | tp-skeleton | 6rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:94](../../docs/components/scroll-trigger.mdx#L94) |
| components/scroll-trigger | Scrubbed band | div | 20rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:108](../../docs/components/scroll-trigger.mdx#L108) |
| components/scroll-trigger | Scrubbed band | tp-skeleton | 0.75rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:116](../../docs/components/scroll-trigger.mdx#L116) |
| components/scroll-trigger | Scrubbed band | tp-skeleton | 6rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:117](../../docs/components/scroll-trigger.mdx#L117) |
| components/scroll-trigger | Scrubbed band | tp-skeleton | 0.75rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:118](../../docs/components/scroll-trigger.mdx#L118) |
| components/scroll-trigger | Custom scroll range | div | 22rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:131](../../docs/components/scroll-trigger.mdx#L131) |
| components/scroll-trigger | Custom scroll range | tp-stack | 22rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:141](../../docs/components/scroll-trigger.mdx#L141) |
| components/scroll-trigger | Custom scroll range | tp-skeleton | 0.75rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:145](../../docs/components/scroll-trigger.mdx#L145) |
| components/scroll-trigger | Custom scroll range | tp-skeleton | 0.75rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:146](../../docs/components/scroll-trigger.mdx#L146) |
| components/scroll-trigger | Custom scroll range | tp-skeleton | 6rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:147](../../docs/components/scroll-trigger.mdx#L147) |
| components/scroll-trigger | Custom scroll range | div | 22rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:183](../../docs/components/scroll-trigger.mdx#L183) |
| components/scroll-trigger | Custom scroll range | tp-skeleton | 0.75rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:191](../../docs/components/scroll-trigger.mdx#L191) |
| components/scroll-trigger | Custom scroll range | tp-skeleton | 6rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:192](../../docs/components/scroll-trigger.mdx#L192) |
| components/scroll-trigger | Custom scroll range | tp-skeleton | 0.75rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:193](../../docs/components/scroll-trigger.mdx#L193) |
| components/scroll-trigger | Pinned scene | div | 24rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:205](../../docs/components/scroll-trigger.mdx#L205) |
| components/scroll-trigger | Pinned scene | tp-skeleton | 0.75rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:207](../../docs/components/scroll-trigger.mdx#L207) |
| components/scroll-trigger | Pinned scene | tp-skeleton | 0.75rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:208](../../docs/components/scroll-trigger.mdx#L208) |
| components/scroll-trigger | Pinned scene | tp-skeleton | 6rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:209](../../docs/components/scroll-trigger.mdx#L209) |
| components/scroll-trigger | Pinned scene | div | 100% | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:213](../../docs/components/scroll-trigger.mdx#L213) |
| components/scroll-trigger | Pinned scene | tp-skeleton | 0.75rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:222](../../docs/components/scroll-trigger.mdx#L222) |
| components/scroll-trigger | Pinned scene | tp-skeleton | 6rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:223](../../docs/components/scroll-trigger.mdx#L223) |
| components/scroll-trigger | Pinned scene | tp-skeleton | 0.75rem | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:224](../../docs/components/scroll-trigger.mdx#L224) |
| components/separator | Separator | tp-stack | var(--tp-space-5) | layout/geometry — minimize | [docs/components/separator.mdx:18](../../docs/components/separator.mdx#L18) |
| components/separator | Vertical | tp-stack | var(--tp-space-6) | layout/geometry — minimize | [docs/components/separator.mdx:36](../../docs/components/separator.mdx#L36) |
| components/skeleton | Skeleton | tp-skeleton | var(--tp-space-10) | layout/geometry — minimize | [docs/components/skeleton.mdx:11](../../docs/components/skeleton.mdx#L11) |
| components/skeleton | Skeleton | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [docs/components/skeleton.mdx:20](../../docs/components/skeleton.mdx#L20) |
| components/skeleton | Skeleton | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [docs/components/skeleton.mdx:23](../../docs/components/skeleton.mdx#L23) |
| components/skeleton | Pulse, sweep and none | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [docs/components/skeleton.mdx:40](../../docs/components/skeleton.mdx#L40) |
| components/skeleton | Pulse, sweep and none | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [docs/components/skeleton.mdx:41](../../docs/components/skeleton.mdx#L41) |
| components/skeleton | Pulse, sweep and none | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [docs/components/skeleton.mdx:42](../../docs/components/skeleton.mdx#L42) |
| components/skeleton | Card | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [docs/components/skeleton.mdx:56](../../docs/components/skeleton.mdx#L56) |
| components/skeleton | Card | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [docs/components/skeleton.mdx:57](../../docs/components/skeleton.mdx#L57) |
| components/skeleton | Video and description | tp-skeleton | var(--tp-space-5) | layout/geometry — minimize | [docs/components/skeleton.mdx:81](../../docs/components/skeleton.mdx#L81) |
| components/skeleton | Video and description | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [docs/components/skeleton.mdx:83](../../docs/components/skeleton.mdx#L83) |
| components/skeleton | Video and description | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [docs/components/skeleton.mdx:84](../../docs/components/skeleton.mdx#L84) |
| components/skeleton | Video and description | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [docs/components/skeleton.mdx:85](../../docs/components/skeleton.mdx#L85) |
| components/skeleton | Settings form | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [docs/components/skeleton.mdx:104](../../docs/components/skeleton.mdx#L104) |
| components/skeleton | Settings form | tp-skeleton | var(--tp-control-height-md) | layout/geometry — minimize | [docs/components/skeleton.mdx:105](../../docs/components/skeleton.mdx#L105) |
| components/skeleton | Settings form | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [docs/components/skeleton.mdx:109](../../docs/components/skeleton.mdx#L109) |
| components/skeleton | Settings form | tp-skeleton | var(--tp-control-height-md) | layout/geometry — minimize | [docs/components/skeleton.mdx:110](../../docs/components/skeleton.mdx#L110) |
| components/skeleton | Settings form | tp-skeleton | var(--tp-control-height-md) | layout/geometry — minimize | [docs/components/skeleton.mdx:113](../../docs/components/skeleton.mdx#L113) |
| components/skeleton | Table rows | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [docs/components/skeleton.mdx:128](../../docs/components/skeleton.mdx#L128) |
| components/skeleton | Table rows | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [docs/components/skeleton.mdx:130](../../docs/components/skeleton.mdx#L130) |
| components/skeleton | Table rows | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [docs/components/skeleton.mdx:132](../../docs/components/skeleton.mdx#L132) |
| components/skeleton | Table rows | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [docs/components/skeleton.mdx:135](../../docs/components/skeleton.mdx#L135) |
| components/skeleton | Table rows | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [docs/components/skeleton.mdx:137](../../docs/components/skeleton.mdx#L137) |
| components/skeleton | Table rows | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [docs/components/skeleton.mdx:139](../../docs/components/skeleton.mdx#L139) |
| components/skeleton | Table rows | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [docs/components/skeleton.mdx:142](../../docs/components/skeleton.mdx#L142) |
| components/skeleton | Table rows | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [docs/components/skeleton.mdx:144](../../docs/components/skeleton.mdx#L144) |
| components/skeleton | Table rows | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [docs/components/skeleton.mdx:146](../../docs/components/skeleton.mdx#L146) |
| components/slider | Vertical | tp-stack | 12rem | layout/geometry — minimize | [docs/components/slider.mdx:168](../../docs/components/slider.mdx#L168) |
| components/slider | Vertical range | div | 14rem | layout/geometry — minimize | [docs/components/slider.mdx:184](../../docs/components/slider.mdx#L184) |
| components/table-of-contents | Table of contents | tp-scroll-area | 24rem | layout/geometry — minimize | [docs/components/table-of-contents.mdx:11](../../docs/components/table-of-contents.mdx#L11) |
| components/table-of-contents | Table of contents | div | 12rem | layout/geometry — minimize | [docs/components/table-of-contents.mdx:29](../../docs/components/table-of-contents.mdx#L29) |
| components/table-of-contents | Nested sections | tp-scroll-area | 22rem | layout/geometry — minimize | [docs/components/table-of-contents.mdx:86](../../docs/components/table-of-contents.mdx#L86) |
| components/table-of-contents | Nested sections | div | 12rem | layout/geometry — minimize | [docs/components/table-of-contents.mdx:118](../../docs/components/table-of-contents.mdx#L118) |
| components/table-of-contents | Collected targets | tp-scroll-area | 20rem | layout/geometry — minimize | [docs/components/table-of-contents.mdx:172](../../docs/components/table-of-contents.mdx#L172) |
| components/table-of-contents | Collected targets | div | 12rem | layout/geometry — minimize | [docs/components/table-of-contents.mdx:195](../../docs/components/table-of-contents.mdx#L195) |
| components/table-of-contents | Compact | tp-scroll-area | 18rem | layout/geometry — minimize | [docs/components/table-of-contents.mdx:237](../../docs/components/table-of-contents.mdx#L237) |
| components/table-of-contents | Compact | div | 10rem | layout/geometry — minimize | [docs/components/table-of-contents.mdx:248](../../docs/components/table-of-contents.mdx#L248) |
| components/text-transform | Truncation | tp-resizable-panel-group | 11rem | layout/geometry — minimize | [docs/components/text-transform.mdx:128](../../docs/components/text-transform.mdx#L128) |
| motion/text/text-mirror | Scrubbed by the scroll | div | 20rem | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:74](../../docs/motion/text/text-mirror.mdx#L74) |
| motion/text/text-mirror | Scrubbed by the scroll | tp-stack | 20rem | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:84](../../docs/motion/text/text-mirror.mdx#L84) |
| motion/text/text-mirror | Scrubbed by the scroll | tp-skeleton | 0.75rem | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:88](../../docs/motion/text/text-mirror.mdx#L88) |
| motion/text/text-mirror | Scrubbed by the scroll | tp-skeleton | 0.75rem | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:89](../../docs/motion/text/text-mirror.mdx#L89) |
| motion/text/text-mirror | Scrubbed by the scroll | tp-skeleton | 6rem | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:90](../../docs/motion/text/text-mirror.mdx#L90) |
| motion/text/text-mirror | Scrubbed by the scroll | div | 20rem | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:96](../../docs/motion/text/text-mirror.mdx#L96) |
| motion/text/text-mirror | Scrubbed by the scroll | tp-skeleton | 0.75rem | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:104](../../docs/motion/text/text-mirror.mdx#L104) |
| motion/text/text-mirror | Scrubbed by the scroll | tp-skeleton | 6rem | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:105](../../docs/motion/text/text-mirror.mdx#L105) |
| motion/text/text-mirror | Scrubbed by the scroll | tp-skeleton | 0.75rem | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:106](../../docs/motion/text/text-mirror.mdx#L106) |
| motion/text/text-split | Scrubbed by the scroll | div | 20rem | layout/geometry — minimize | [docs/motion/text/text-split.mdx:142](../../docs/motion/text/text-split.mdx#L142) |
| motion/text/text-split | Scrubbed by the scroll | tp-stack | 20rem | layout/geometry — minimize | [docs/motion/text/text-split.mdx:152](../../docs/motion/text/text-split.mdx#L152) |
| motion/text/text-split | Scrubbed by the scroll | tp-skeleton | 0.75rem | layout/geometry — minimize | [docs/motion/text/text-split.mdx:156](../../docs/motion/text/text-split.mdx#L156) |
| motion/text/text-split | Scrubbed by the scroll | tp-skeleton | 0.75rem | layout/geometry — minimize | [docs/motion/text/text-split.mdx:157](../../docs/motion/text/text-split.mdx#L157) |
| motion/text/text-split | Scrubbed by the scroll | tp-skeleton | 6rem | layout/geometry — minimize | [docs/motion/text/text-split.mdx:158](../../docs/motion/text/text-split.mdx#L158) |
| motion/text/text-split | Scrubbed by the scroll | div | 20rem | layout/geometry — minimize | [docs/motion/text/text-split.mdx:164](../../docs/motion/text/text-split.mdx#L164) |
| motion/text/text-split | Scrubbed by the scroll | tp-skeleton | 0.75rem | layout/geometry — minimize | [docs/motion/text/text-split.mdx:172](../../docs/motion/text/text-split.mdx#L172) |
| motion/text/text-split | Scrubbed by the scroll | tp-skeleton | 6rem | layout/geometry — minimize | [docs/motion/text/text-split.mdx:173](../../docs/motion/text/text-split.mdx#L173) |
| motion/text/text-split | Scrubbed by the scroll | tp-skeleton | 0.75rem | layout/geometry — minimize | [docs/motion/text/text-split.mdx:174](../../docs/motion/text/text-split.mdx#L174) |
| motion/text/text-stroke | Scrubbed by the scroll | div | 20rem | layout/geometry — minimize | [docs/motion/text/text-stroke.mdx:82](../../docs/motion/text/text-stroke.mdx#L82) |
| motion/text/text-stroke | Scrubbed by the scroll | tp-stack | 20rem | layout/geometry — minimize | [docs/motion/text/text-stroke.mdx:92](../../docs/motion/text/text-stroke.mdx#L92) |
| motion/text/text-stroke | Scrubbed by the scroll | tp-skeleton | 0.75rem | layout/geometry — minimize | [docs/motion/text/text-stroke.mdx:96](../../docs/motion/text/text-stroke.mdx#L96) |
| motion/text/text-stroke | Scrubbed by the scroll | tp-skeleton | 0.75rem | layout/geometry — minimize | [docs/motion/text/text-stroke.mdx:97](../../docs/motion/text/text-stroke.mdx#L97) |
| motion/text/text-stroke | Scrubbed by the scroll | tp-skeleton | 6rem | layout/geometry — minimize | [docs/motion/text/text-stroke.mdx:98](../../docs/motion/text/text-stroke.mdx#L98) |
| motion/text/text-stroke | Scrubbed by the scroll | div | 20rem | layout/geometry — minimize | [docs/motion/text/text-stroke.mdx:113](../../docs/motion/text/text-stroke.mdx#L113) |
| motion/text/text-stroke | Scrubbed by the scroll | tp-skeleton | 0.75rem | layout/geometry — minimize | [docs/motion/text/text-stroke.mdx:121](../../docs/motion/text/text-stroke.mdx#L121) |
| motion/text/text-stroke | Scrubbed by the scroll | tp-skeleton | 6rem | layout/geometry — minimize | [docs/motion/text/text-stroke.mdx:122](../../docs/motion/text/text-stroke.mdx#L122) |
| motion/text/text-stroke | Scrubbed by the scroll | tp-skeleton | 0.75rem | layout/geometry — minimize | [docs/motion/text/text-stroke.mdx:123](../../docs/motion/text/text-stroke.mdx#L123) |
| widgets/flow | Voice chain | tp-flow | 30rem | layout/geometry — minimize | [docs/widgets/flow.mdx:14](../../docs/widgets/flow.mdx#L14) |
| widgets/flow | Kinds and animation | tp-flow | 22.5rem | layout/geometry — minimize | [docs/widgets/flow.mdx:111](../../docs/widgets/flow.mdx#L111) |
| widgets/flow | Authored nodes | tp-flow | 22.5rem | layout/geometry — minimize | [docs/widgets/flow.mdx:146](../../docs/widgets/flow.mdx#L146) |
| widgets/flow | Library and inspector | tp-flow | 34rem | layout/geometry — minimize | [docs/widgets/flow.mdx:192](../../docs/widgets/flow.mdx#L192) |
| widgets/flow | Toolbars and panels | tp-flow | 30rem | layout/geometry — minimize | [docs/widgets/flow.mdx:265](../../docs/widgets/flow.mdx#L265) |
| widgets/flow | Automatic layout | tp-flow | 24rem | layout/geometry — minimize | [docs/widgets/flow.mdx:329](../../docs/widgets/flow.mdx#L329) |
| widgets/flow | Commit and selection | tp-flow | 22.5rem | layout/geometry — minimize | [docs/widgets/flow.mdx:405](../../docs/widgets/flow.mdx#L405) |
| widgets/flow | A finished run in view mode | tp-flow | 22.5rem | layout/geometry — minimize | [docs/widgets/flow.mdx:511](../../docs/widgets/flow.mdx#L511) |
| widgets/flow | Run requests | tp-flow | 26rem | layout/geometry — minimize | [docs/widgets/flow.mdx:568](../../docs/widgets/flow.mdx#L568) |
| widgets/flow | Read-only dependency viewer | tp-flow | 26rem | layout/geometry — minimize | [docs/widgets/flow.mdx:652](../../docs/widgets/flow.mdx#L652) |
| widgets/flow | In a form | tp-flow | 22.5rem | layout/geometry — minimize | [docs/widgets/flow.mdx:701](../../docs/widgets/flow.mdx#L701) |
| compositions/presentation-primitives.examples | aspectRatioDefaults | div | 100% | layout/geometry — minimize | [src/stories/presentation-primitives.examples.ts:58](../../src/stories/presentation-primitives.examples.ts#L58) |
| components/scroll-area | Components/Scroll area | tp-scroll-area | calc(var(--tp-spacing) * 90) | layout/geometry — minimize | [src/stories/scroll-area.stories.ts:46](../../src/stories/scroll-area.stories.ts#L46) |
| compositions/skeleton.examples | (file/setup/shared helper) | tp-skeleton | var(--tp-space-10) | layout/geometry — minimize | [src/stories/skeleton.examples.ts:21](../../src/stories/skeleton.examples.ts#L21) |
| compositions/skeleton.examples | (file/setup/shared helper) | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [src/stories/skeleton.examples.ts:28](../../src/stories/skeleton.examples.ts#L28) |
| compositions/skeleton.examples | (file/setup/shared helper) | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [src/stories/skeleton.examples.ts:34](../../src/stories/skeleton.examples.ts#L34) |
| compositions/skeleton.examples | skeletonSource | tp-skeleton | var(--tp-space-10) | layout/geometry — minimize | [src/stories/skeleton.examples.ts:40](../../src/stories/skeleton.examples.ts#L40) |
| compositions/skeleton.examples | skeletonSource | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [src/stories/skeleton.examples.ts:42](../../src/stories/skeleton.examples.ts#L42) |
| compositions/skeleton.examples | skeletonSource | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [src/stories/skeleton.examples.ts:43](../../src/stories/skeleton.examples.ts#L43) |
| compositions/skeleton.examples | skeletonSource | tp-skeleton | var(--tp-control-height-md) | layout/geometry — minimize | [src/stories/skeleton.examples.ts:50](../../src/stories/skeleton.examples.ts#L50) |
| compositions/skeleton.examples | skeletonSource | tp-skeleton | var(--tp-space-4) | layout/geometry — minimize | [src/stories/skeleton.examples.ts:53](../../src/stories/skeleton.examples.ts#L53) |
| compositions/skeleton.examples | skeletonExamples | tp-skeleton | var(--tp-control-height-md) | layout/geometry — minimize | [src/stories/skeleton.examples.ts:94](../../src/stories/skeleton.examples.ts#L94) |
| compositions/table-of-contents.examples | Release notes | tp-scroll-area | 34rem | layout/geometry — minimize | [src/stories/table-of-contents.examples.ts:96](../../src/stories/table-of-contents.examples.ts#L96) |
| compositions/table-of-contents.examples | Changelog | tp-scroll-area | 34rem | layout/geometry — minimize | [src/stories/table-of-contents.examples.ts:140](../../src/stories/table-of-contents.examples.ts#L140) |

<a id="property-6"></a>

### 6. border-radius — 163 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-radius-lg) | 115 |
| var(--tp-radius-xl) | 27 |
| var(--tp-radius-md) | 10 |
| var(--tp-radius-full) | 6 |
| var(--tp-radius-sm) | 3 |
| inherit | 2 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/aspect-ratio | Aspect ratio | tp-aspect-ratio | var(--tp-radius-lg) | component presentation override — review required | [docs/components/aspect-ratio.mdx:10](../../docs/components/aspect-ratio.mdx#L10) |
| components/aspect-ratio | Common ratios | tp-aspect-ratio | var(--tp-radius-lg) | component presentation override — review required | [docs/components/aspect-ratio.mdx:27](../../docs/components/aspect-ratio.mdx#L27) |
| components/aspect-ratio | Common ratios | tp-aspect-ratio | var(--tp-radius-lg) | component presentation override — review required | [docs/components/aspect-ratio.mdx:30](../../docs/components/aspect-ratio.mdx#L30) |
| components/aspect-ratio | Common ratios | tp-aspect-ratio | var(--tp-radius-lg) | component presentation override — review required | [docs/components/aspect-ratio.mdx:33](../../docs/components/aspect-ratio.mdx#L33) |
| components/aspect-ratio | One ratio, three widths | tp-aspect-ratio | var(--tp-radius-md) | component presentation override — review required | [docs/components/aspect-ratio.mdx:51](../../docs/components/aspect-ratio.mdx#L51) |
| components/aspect-ratio | One ratio, three widths | tp-aspect-ratio | var(--tp-radius-md) | component presentation override — review required | [docs/components/aspect-ratio.mdx:73](../../docs/components/aspect-ratio.mdx#L73) |
| components/aspect-ratio | One ratio, three widths | tp-aspect-ratio | var(--tp-radius-md) | component presentation override — review required | [docs/components/aspect-ratio.mdx:95](../../docs/components/aspect-ratio.mdx#L95) |
| components/aspect-ratio | Cover and contain | tp-aspect-ratio | var(--tp-radius-lg) | component presentation override — review required | [docs/components/aspect-ratio.mdx:125](../../docs/components/aspect-ratio.mdx#L125) |
| components/aspect-ratio | Cover and contain | tp-aspect-ratio | var(--tp-radius-lg) | component presentation override — review required | [docs/components/aspect-ratio.mdx:128](../../docs/components/aspect-ratio.mdx#L128) |
| components/avatar | Custom shape and grayscale | tp-avatar | var(--tp-radius-lg) | component presentation override — review required | [docs/components/avatar.mdx:116](../../docs/components/avatar.mdx#L116) |
| components/avatar | Custom shape and grayscale | tp-avatar | var(--tp-radius-lg) | component presentation override — review required | [docs/components/avatar.mdx:122](../../docs/components/avatar.mdx#L122) |
| components/carousel | Carousel | tp-stack | var(--tp-radius-lg) | component presentation override — review required | [docs/components/carousel.mdx:13](../../docs/components/carousel.mdx#L13) |
| components/carousel | Carousel | tp-stack | var(--tp-radius-lg) | component presentation override — review required | [docs/components/carousel.mdx:26](../../docs/components/carousel.mdx#L26) |
| components/carousel | Carousel | tp-stack | var(--tp-radius-lg) | component presentation override — review required | [docs/components/carousel.mdx:39](../../docs/components/carousel.mdx#L39) |
| components/carousel | Carousel | tp-stack | var(--tp-radius-lg) | component presentation override — review required | [docs/components/carousel.mdx:51](../../docs/components/carousel.mdx#L51) |
| components/carousel | Bullets inside | blockquote | var(--tp-radius-lg) | content appearance — review required | [docs/components/carousel.mdx:101](../../docs/components/carousel.mdx#L101) |
| components/carousel | Bullets inside | blockquote | var(--tp-radius-lg) | content appearance — review required | [docs/components/carousel.mdx:105](../../docs/components/carousel.mdx#L105) |
| components/carousel | Bullets inside | blockquote | var(--tp-radius-lg) | content appearance — review required | [docs/components/carousel.mdx:109](../../docs/components/carousel.mdx#L109) |
| components/carousel | Autoplay | div | var(--tp-radius-lg) | content appearance — review required | [docs/components/carousel.mdx:130](../../docs/components/carousel.mdx#L130) |
| components/carousel | Autoplay | div | var(--tp-radius-lg) | content appearance — review required | [docs/components/carousel.mdx:134](../../docs/components/carousel.mdx#L134) |
| components/carousel | Autoplay | div | var(--tp-radius-lg) | content appearance — review required | [docs/components/carousel.mdx:138](../../docs/components/carousel.mdx#L138) |
| components/carousel | Crossfade | tp-stack | var(--tp-radius-lg) | component presentation override — review required | [docs/components/carousel.mdx:184](../../docs/components/carousel.mdx#L184) |
| components/carousel | Crossfade | tp-stack | var(--tp-radius-lg) | component presentation override — review required | [docs/components/carousel.mdx:198](../../docs/components/carousel.mdx#L198) |
| components/carousel | Crossfade | tp-stack | var(--tp-radius-lg) | component presentation override — review required | [docs/components/carousel.mdx:213](../../docs/components/carousel.mdx#L213) |
| components/carousel | Layered 3D | figure | var(--tp-radius-lg) | content appearance — review required | [docs/components/carousel.mdx:243](../../docs/components/carousel.mdx#L243) |
| components/carousel | Layered 3D | figure | var(--tp-radius-lg) | content appearance — review required | [docs/components/carousel.mdx:279](../../docs/components/carousel.mdx#L279) |
| components/carousel | Layered 3D | figure | var(--tp-radius-lg) | content appearance — review required | [docs/components/carousel.mdx:315](../../docs/components/carousel.mdx#L315) |
| components/carousel | Parallax | figure | var(--tp-radius-lg) | content appearance — review required | [docs/components/carousel.mdx:365](../../docs/components/carousel.mdx#L365) |
| components/carousel | Parallax | figure | var(--tp-radius-lg) | content appearance — review required | [docs/components/carousel.mdx:368](../../docs/components/carousel.mdx#L368) |
| components/carousel | Parallax | figure | var(--tp-radius-lg) | content appearance — review required | [docs/components/carousel.mdx:371](../../docs/components/carousel.mdx#L371) |
| components/carousel | Parallax | figure | var(--tp-radius-lg) | content appearance — review required | [docs/components/carousel.mdx:374](../../docs/components/carousel.mdx#L374) |
| components/carousel | Focus | figure | var(--tp-radius-lg) | content appearance — review required | [docs/components/carousel.mdx:396](../../docs/components/carousel.mdx#L396) |
| components/carousel | Focus | figure | var(--tp-radius-lg) | content appearance — review required | [docs/components/carousel.mdx:400](../../docs/components/carousel.mdx#L400) |
| components/carousel | Focus | figure | var(--tp-radius-lg) | content appearance — review required | [docs/components/carousel.mdx:404](../../docs/components/carousel.mdx#L404) |
| components/carousel | Focus | figure | var(--tp-radius-lg) | content appearance — review required | [docs/components/carousel.mdx:408](../../docs/components/carousel.mdx#L408) |
| components/carousel | Focus | figure | var(--tp-radius-lg) | content appearance — review required | [docs/components/carousel.mdx:412](../../docs/components/carousel.mdx#L412) |
| components/carousel | Shader transition | figure | var(--tp-radius-lg) | content appearance — review required | [docs/components/carousel.mdx:458](../../docs/components/carousel.mdx#L458) |
| components/carousel | Shader transition | figure | var(--tp-radius-lg) | content appearance — review required | [docs/components/carousel.mdx:494](../../docs/components/carousel.mdx#L494) |
| components/carousel | Shader transition | figure | var(--tp-radius-lg) | content appearance — review required | [docs/components/carousel.mdx:530](../../docs/components/carousel.mdx#L530) |
| components/carousel | Commit | div | var(--tp-radius-lg) | content appearance — review required | [docs/components/carousel.mdx:632](../../docs/components/carousel.mdx#L632) |
| components/carousel | Commit | div | var(--tp-radius-lg) | content appearance — review required | [docs/components/carousel.mdx:642](../../docs/components/carousel.mdx#L642) |
| components/carousel | Commit | div | var(--tp-radius-lg) | content appearance — review required | [docs/components/carousel.mdx:652](../../docs/components/carousel.mdx#L652) |
| components/cursor | Cursor | div | var(--tp-radius-xl) | content appearance — review required | [docs/components/cursor.mdx:11](../../docs/components/cursor.mdx#L11) |
| components/cursor | Cursor | span | var(--tp-radius-full) | content appearance — review required | [docs/components/cursor.mdx:14](../../docs/components/cursor.mdx#L14) |
| components/cursor | Cursor | div | var(--tp-radius-lg) | content appearance — review required | [docs/components/cursor.mdx:17](../../docs/components/cursor.mdx#L17) |
| components/cursor | Cursor | div | var(--tp-radius-lg) | content appearance — review required | [docs/components/cursor.mdx:21](../../docs/components/cursor.mdx#L21) |
| components/cursor | Cursor | div | var(--tp-radius-lg) | content appearance — review required | [docs/components/cursor.mdx:25](../../docs/components/cursor.mdx#L25) |
| components/cursor | Spring | div | var(--tp-radius-xl) | content appearance — review required | [docs/components/cursor.mdx:47](../../docs/components/cursor.mdx#L47) |
| components/cursor | Spring | div | var(--tp-radius-xl) | content appearance — review required | [docs/components/cursor.mdx:51](../../docs/components/cursor.mdx#L51) |
| components/cursor | Zones | div | var(--tp-radius-xl) | content appearance — review required | [docs/components/cursor.mdx:69](../../docs/components/cursor.mdx#L69) |
| components/cursor | Zones | span | var(--tp-radius-full) | content appearance — review required | [docs/components/cursor.mdx:72](../../docs/components/cursor.mdx#L72) |
| components/cursor | Zones | div | var(--tp-radius-lg) | content appearance — review required | [docs/components/cursor.mdx:73](../../docs/components/cursor.mdx#L73) |
| components/cursor | Zones | div | var(--tp-radius-lg) | content appearance — review required | [docs/components/cursor.mdx:80](../../docs/components/cursor.mdx#L80) |
| components/cursor | Sticking | tp-stack | var(--tp-radius-xl) | component presentation override — review required | [docs/components/cursor.mdx:98](../../docs/components/cursor.mdx#L98) |
| components/cursor | Dot and ring | div | var(--tp-radius-xl) | content appearance — review required | [docs/components/cursor.mdx:134](../../docs/components/cursor.mdx#L134) |
| components/cursor | Dot and ring | span | var(--tp-radius-full) | content appearance — review required | [docs/components/cursor.mdx:136](../../docs/components/cursor.mdx#L136) |
| components/cursor | Native passthrough | div | var(--tp-radius-xl) | content appearance — review required | [docs/components/cursor.mdx:154](../../docs/components/cursor.mdx#L154) |
| components/cursor | Programmatic state | tp-stack | var(--tp-radius-xl) | component presentation override — review required | [docs/components/cursor.mdx:174](../../docs/components/cursor.mdx#L174) |
| components/cursor | Reduced motion | div | var(--tp-radius-xl) | content appearance — review required | [docs/components/cursor.mdx:208](../../docs/components/cursor.mdx#L208) |
| components/dialog | Container modality | section | var(--tp-radius-xl) | content appearance — review required | [docs/components/dialog.mdx:82](../../docs/components/dialog.mdx#L82) |
| components/image | Image | tp-image | var(--tp-radius-xl) | component presentation override — review required | [docs/components/image.mdx:15](../../docs/components/image.mdx#L15) |
| components/image | Ratio and fit | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:37](../../docs/components/image.mdx#L37) |
| components/image | Ratio and fit | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:38](../../docs/components/image.mdx#L38) |
| components/image | Ratio and fit | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:39](../../docs/components/image.mdx#L39) |
| components/image | Fallbacks | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:58](../../docs/components/image.mdx#L58) |
| components/image | Fallbacks | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:59](../../docs/components/image.mdx#L59) |
| components/image | Loading placeholders | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:72](../../docs/components/image.mdx#L72) |
| components/image | Loading placeholders | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:73](../../docs/components/image.mdx#L73) |
| components/image | Hover zoom | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:90](../../docs/components/image.mdx#L90) |
| components/image | Hover zoom | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:91](../../docs/components/image.mdx#L91) |
| components/image | Card hover | tp-image | var(--tp-radius-md) | component presentation override — review required | [docs/components/image.mdx:104](../../docs/components/image.mdx#L104) |
| components/image | Staggered group | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:125](../../docs/components/image.mdx#L125) |
| components/image | Staggered group | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:126](../../docs/components/image.mdx#L126) |
| components/image | Staggered group | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:127](../../docs/components/image.mdx#L127) |
| components/image | Staggered group | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:128](../../docs/components/image.mdx#L128) |
| components/image | Reveal timing and repeat | div | var(--tp-radius-xl) | content appearance — review required | [docs/components/image.mdx:137](../../docs/components/image.mdx#L137) |
| components/image | Reveal timing and repeat | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:139](../../docs/components/image.mdx#L139) |
| components/image | Reveal timing and repeat | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:140](../../docs/components/image.mdx#L140) |
| components/image | Reveal timing and repeat | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:141](../../docs/components/image.mdx#L141) |
| components/image | Reveal timing and repeat | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:145](../../docs/components/image.mdx#L145) |
| components/image | Reveal timing and repeat | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:146](../../docs/components/image.mdx#L146) |
| components/image | Reveal timing and repeat | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:147](../../docs/components/image.mdx#L147) |
| components/image | Headline, group and caption | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:164](../../docs/components/image.mdx#L164) |
| components/image | Headline, group and caption | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:165](../../docs/components/image.mdx#L165) |
| components/image | Headline, group and caption | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:166](../../docs/components/image.mdx#L166) |
| components/image | Parallax in a scroller | div | var(--tp-radius-xl) | content appearance — review required | [docs/components/image.mdx:186](../../docs/components/image.mdx#L186) |
| components/image | Parallax in a scroller | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:187](../../docs/components/image.mdx#L187) |
| components/image | Parallax in a scroller | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:188](../../docs/components/image.mdx#L188) |
| components/image | Parallax in a scroller | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:189](../../docs/components/image.mdx#L189) |
| components/image | Scroll zoom in a vertical scroller | div | var(--tp-radius-xl) | content appearance — review required | [docs/components/image.mdx:198](../../docs/components/image.mdx#L198) |
| components/image | Scroll zoom in a vertical scroller | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:204](../../docs/components/image.mdx#L204) |
| components/image | Scroll zoom in a vertical scroller | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:214](../../docs/components/image.mdx#L214) |
| components/image | Scroll zoom in a vertical scroller | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:224](../../docs/components/image.mdx#L224) |
| components/image | Scroll zoom in a vertical scroller | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:234](../../docs/components/image.mdx#L234) |
| components/image | Scroll zoom in a vertical scroller | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:244](../../docs/components/image.mdx#L244) |
| components/image | Horizontal strip | div | var(--tp-radius-xl) | content appearance — review required | [docs/components/image.mdx:259](../../docs/components/image.mdx#L259) |
| components/image | Horizontal strip | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:260](../../docs/components/image.mdx#L260) |
| components/image | Horizontal strip | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:261](../../docs/components/image.mdx#L261) |
| components/image | Horizontal strip | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:262](../../docs/components/image.mdx#L262) |
| components/image | Horizontal strip | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:263](../../docs/components/image.mdx#L263) |
| components/image | Smoothing | div | var(--tp-radius-xl) | content appearance — review required | [docs/components/image.mdx:272](../../docs/components/image.mdx#L272) |
| components/image | Smoothing | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:273](../../docs/components/image.mdx#L273) |
| components/image | Smoothing | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:274](../../docs/components/image.mdx#L274) |
| components/image | Smoothing | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:275](../../docs/components/image.mdx#L275) |
| components/image | Smoothing | tp-image | var(--tp-radius-lg) | component presentation override — review required | [docs/components/image.mdx:276](../../docs/components/image.mdx#L276) |
| components/image | Hero with a narrow-screen crop | tp-image | var(--tp-radius-xl) | component presentation override — review required | [docs/components/image.mdx:299](../../docs/components/image.mdx#L299) |
| components/list | Card grid | tp-aspect-ratio | var(--tp-radius-sm) | component presentation override — review required | [docs/components/list.mdx:163](../../docs/components/list.mdx#L163) |
| components/list | Card grid | tp-aspect-ratio | var(--tp-radius-sm) | component presentation override — review required | [docs/components/list.mdx:167](../../docs/components/list.mdx#L167) |
| components/list | Card grid | tp-aspect-ratio | var(--tp-radius-sm) | component presentation override — review required | [docs/components/list.mdx:171](../../docs/components/list.mdx#L171) |
| components/menu | Context invocation | div | var(--tp-radius-lg) | content appearance — review required | [docs/components/menu.mdx:147](../../docs/components/menu.mdx#L147) |
| components/message-scroller | Message Scroller | tp-message-scroller | var(--tp-radius-xl) | component presentation override — review required | [docs/components/message-scroller.mdx:11](../../docs/components/message-scroller.mdx#L11) |
| components/message-scroller | Streaming | tp-message-scroller | var(--tp-radius-xl) | component presentation override — review required | [docs/components/message-scroller.mdx:75](../../docs/components/message-scroller.mdx#L75) |
| components/message-scroller | Join marker as anchor | tp-message-scroller | var(--tp-radius-xl) | component presentation override — review required | [docs/components/message-scroller.mdx:172](../../docs/components/message-scroller.mdx#L172) |
| components/message-scroller | Commands | tp-message-scroller | var(--tp-radius-xl) | component presentation override — review required | [docs/components/message-scroller.mdx:252](../../docs/components/message-scroller.mdx#L252) |
| components/message-scroller | Outline and edges | tp-message-scroller | var(--tp-radius-xl) | component presentation override — review required | [docs/components/message-scroller.mdx:330](../../docs/components/message-scroller.mdx#L330) |
| components/message-scroller | Prepend history | tp-message-scroller | var(--tp-radius-xl) | component presentation override — review required | [docs/components/message-scroller.mdx:434](../../docs/components/message-scroller.mdx#L434) |
| components/message-scroller | Animated send | tp-message-scroller | var(--tp-radius-xl) | component presentation override — review required | [docs/components/message-scroller.mdx:506](../../docs/components/message-scroller.mdx#L506) |
| components/message-scroller | Open at the start | tp-message-scroller | var(--tp-radius-xl) | component presentation override — review required | [docs/components/message-scroller.mdx:560](../../docs/components/message-scroller.mdx#L560) |
| components/navigation-panel | Navigation panel | div | var(--tp-radius-lg) | content appearance — review required | [docs/components/navigation-panel.mdx:11](../../docs/components/navigation-panel.mdx#L11) |
| components/navigation-panel | Off-canvas | div | var(--tp-radius-lg) | content appearance — review required | [docs/components/navigation-panel.mdx:102](../../docs/components/navigation-panel.mdx#L102) |
| components/navigation-panel | Collapsible groups | div | var(--tp-radius-lg) | content appearance — review required | [docs/components/navigation-panel.mdx:133](../../docs/components/navigation-panel.mdx#L133) |
| components/navigation-panel | Drawer mode | div | var(--tp-radius-lg) | content appearance — review required | [docs/components/navigation-panel.mdx:187](../../docs/components/navigation-panel.mdx#L187) |
| components/navigation-panel | Floating | div | var(--tp-radius-lg) | content appearance — review required | [docs/components/navigation-panel.mdx:217](../../docs/components/navigation-panel.mdx#L217) |
| components/navigation-panel | Team switcher and row actions | div | var(--tp-radius-lg) | content appearance — review required | [docs/components/navigation-panel.mdx:250](../../docs/components/navigation-panel.mdx#L250) |
| components/popover | Separate anchor | tp-stack | var(--tp-radius-lg) | component presentation override — review required | [docs/components/popover.mdx:120](../../docs/components/popover.mdx#L120) |
| components/resizable-panel-group | Resizable Panel Group | tp-resizable-panel-group | var(--tp-radius-lg) | component presentation override — review required | [docs/components/resizable-panel-group.mdx:11](../../docs/components/resizable-panel-group.mdx#L11) |
| components/resizable-panel-group | Bounds | tp-resizable-panel-group | var(--tp-radius-lg) | component presentation override — review required | [docs/components/resizable-panel-group.mdx:56](../../docs/components/resizable-panel-group.mdx#L56) |
| components/resizable-panel-group | Vertical | tp-resizable-panel-group | var(--tp-radius-lg) | component presentation override — review required | [docs/components/resizable-panel-group.mdx:74](../../docs/components/resizable-panel-group.mdx#L74) |
| components/resizable-panel-group | Collapsible sidebar | tp-resizable-panel-group | var(--tp-radius-lg) | component presentation override — review required | [docs/components/resizable-panel-group.mdx:97](../../docs/components/resizable-panel-group.mdx#L97) |
| components/resizable-panel-group | Layout events | tp-resizable-panel-group | var(--tp-radius-lg) | component presentation override — review required | [docs/components/resizable-panel-group.mdx:133](../../docs/components/resizable-panel-group.mdx#L133) |
| components/resizable-panel-group | Layout presets | tp-resizable-panel-group | var(--tp-radius-lg) | component presentation override — review required | [docs/components/resizable-panel-group.mdx:181](../../docs/components/resizable-panel-group.mdx#L181) |
| components/resizable-panel-group | Persisted sizes | tp-resizable-panel-group | var(--tp-radius-lg) | component presentation override — review required | [docs/components/resizable-panel-group.mdx:224](../../docs/components/resizable-panel-group.mdx#L224) |
| components/resizable-panel-group | Disabled | tp-resizable-panel-group | var(--tp-radius-lg) | component presentation override — review required | [docs/components/resizable-panel-group.mdx:270](../../docs/components/resizable-panel-group.mdx#L270) |
| components/scroll-area | Scroll Area | tp-scroll-area | var(--tp-radius-lg) | component presentation override — review required | [docs/components/scroll-area.mdx:9](../../docs/components/scroll-area.mdx#L9) |
| components/scroll-area | Horizontal | tp-scroll-area | var(--tp-radius-lg) | component presentation override — review required | [docs/components/scroll-area.mdx:53](../../docs/components/scroll-area.mdx#L53) |
| components/scroll-area | Both axes | tp-scroll-area | var(--tp-radius-lg) | component presentation override — review required | [docs/components/scroll-area.mdx:86](../../docs/components/scroll-area.mdx#L86) |
| components/scroll-area | Visibility | tp-scroll-area | var(--tp-radius-lg) | component presentation override — review required | [docs/components/scroll-area.mdx:120](../../docs/components/scroll-area.mdx#L120) |
| components/scroll-area | Visibility | tp-scroll-area | var(--tp-radius-lg) | component presentation override — review required | [docs/components/scroll-area.mdx:139](../../docs/components/scroll-area.mdx#L139) |
| components/scroll-trigger | Scroll Trigger | tp-image | var(--tp-radius-md) | component presentation override — review required | [docs/components/scroll-trigger.mdx:17](../../docs/components/scroll-trigger.mdx#L17) |
| components/scroll-trigger | Scroll Trigger | tp-image | var(--tp-radius-md) | component presentation override — review required | [docs/components/scroll-trigger.mdx:18](../../docs/components/scroll-trigger.mdx#L18) |
| components/scroll-trigger | Scroll Trigger | tp-image | var(--tp-radius-md) | component presentation override — review required | [docs/components/scroll-trigger.mdx:19](../../docs/components/scroll-trigger.mdx#L19) |
| components/scroll-trigger | Replay on entry | div | var(--tp-radius-lg) | content appearance — review required | [docs/components/scroll-trigger.mdx:60](../../docs/components/scroll-trigger.mdx#L60) |
| components/scroll-trigger | Scrubbed band | div | var(--tp-radius-lg) | content appearance — review required | [docs/components/scroll-trigger.mdx:78](../../docs/components/scroll-trigger.mdx#L78) |
| components/scroll-trigger | Custom scroll range | div | var(--tp-radius-lg) | content appearance — review required | [docs/components/scroll-trigger.mdx:131](../../docs/components/scroll-trigger.mdx#L131) |
| components/scroll-trigger | Custom scroll range | tp-image | var(--tp-radius-md) | component presentation override — review required | [docs/components/scroll-trigger.mdx:165](../../docs/components/scroll-trigger.mdx#L165) |
| components/scroll-trigger | Custom scroll range | tp-image | var(--tp-radius-md) | component presentation override — review required | [docs/components/scroll-trigger.mdx:171](../../docs/components/scroll-trigger.mdx#L171) |
| components/scroll-trigger | Custom scroll range | tp-image | var(--tp-radius-md) | component presentation override — review required | [docs/components/scroll-trigger.mdx:177](../../docs/components/scroll-trigger.mdx#L177) |
| components/scroll-trigger | Pinned scene | div | var(--tp-radius-lg) | content appearance — review required | [docs/components/scroll-trigger.mdx:205](../../docs/components/scroll-trigger.mdx#L205) |
| components/skeleton | Skeleton | tp-skeleton | var(--tp-radius-full) | component presentation override — review required | [docs/components/skeleton.mdx:11](../../docs/components/skeleton.mdx#L11) |
| components/skeleton | Card | tp-skeleton | var(--tp-radius-lg) | component presentation override — review required | [docs/components/skeleton.mdx:60](../../docs/components/skeleton.mdx#L60) |
| components/skeleton | Video and description | tp-aspect-ratio | var(--tp-radius-xl) | component presentation override — review required | [docs/components/skeleton.mdx:78](../../docs/components/skeleton.mdx#L78) |
| components/skeleton | Video and description | tp-skeleton | inherit | component presentation override — review required | [docs/components/skeleton.mdx:79](../../docs/components/skeleton.mdx#L79) |
| components/text-transform | Truncation | tp-resizable-panel-group | var(--tp-radius-lg) | component presentation override — review required | [docs/components/text-transform.mdx:128](../../docs/components/text-transform.mdx#L128) |
| components/tooltip | Cursor tracking | div | var(--tp-radius-lg) | content appearance — review required | [docs/components/tooltip.mdx:69](../../docs/components/tooltip.mdx#L69) |
| motion/text/text-mirror | Scrubbed by the scroll | div | var(--tp-radius-lg) | content appearance — review required | [docs/motion/text/text-mirror.mdx:74](../../docs/motion/text/text-mirror.mdx#L74) |
| motion/text/text-split | Scrubbed by the scroll | div | var(--tp-radius-lg) | content appearance — review required | [docs/motion/text/text-split.mdx:142](../../docs/motion/text/text-split.mdx#L142) |
| motion/text/text-stroke | Scrubbed by the scroll | div | var(--tp-radius-lg) | content appearance — review required | [docs/motion/text/text-stroke.mdx:82](../../docs/motion/text/text-stroke.mdx#L82) |
| compositions/map.examples | Token theme | div | var(--tp-radius-lg) | content appearance — review required | [src/stories/map.examples.ts:246](../../src/stories/map.examples.ts#L246) |
| components/resizable-panel-group | NestedWorkspace | tp-resizable-panel-group | var(--tp-radius-lg) | component presentation override — review required | [src/stories/resizable-panel-group.stories.ts:59](../../src/stories/resizable-panel-group.stories.ts#L59) |
| compositions/skeleton.examples | (file/setup/shared helper) | tp-skeleton | var(--tp-radius-full) | component presentation override — review required | [src/stories/skeleton.examples.ts:21](../../src/stories/skeleton.examples.ts#L21) |
| compositions/skeleton.examples | skeletonSource | tp-skeleton | var(--tp-radius-full) | component presentation override — review required | [src/stories/skeleton.examples.ts:40](../../src/stories/skeleton.examples.ts#L40) |
| compositions/skeleton.examples | skeletonExamples | tp-aspect-ratio | var(--tp-radius-xl) | component presentation override — review required | [src/stories/skeleton.examples.ts:61](../../src/stories/skeleton.examples.ts#L61) |
| compositions/skeleton.examples | skeletonExamples | tp-skeleton | inherit | component presentation override — review required | [src/stories/skeleton.examples.ts:62](../../src/stories/skeleton.examples.ts#L62) |

<a id="property-7"></a>

### 7. text-align — 157 occurrences

| Value | Occurrences |
| --- | ---: |
| end | 120 |
| center | 27 |
| start | 10 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/carousel | Autoplay | div | center | manual review | [docs/components/carousel.mdx:130](../../docs/components/carousel.mdx#L130) |
| components/carousel | Autoplay | div | center | manual review | [docs/components/carousel.mdx:134](../../docs/components/carousel.mdx#L134) |
| components/carousel | Autoplay | div | center | manual review | [docs/components/carousel.mdx:138](../../docs/components/carousel.mdx#L138) |
| components/carousel | Virtual archive with controlled selection | output | center | manual review | [docs/components/carousel.mdx:593](../../docs/components/carousel.mdx#L593) |
| components/carousel | Commit | output | center | manual review | [docs/components/carousel.mdx:664](../../docs/components/carousel.mdx#L664) |
| components/dialog | Container modality | p | center | manual review | [docs/components/dialog.mdx:92](../../docs/components/dialog.mdx#L92) |
| components/marker | Accordion label and drawer | tp-drawer | start | manual review | [docs/components/marker.mdx:203](../../docs/components/marker.mdx#L203) |
| components/preview-card | Delays | tp-stack | start | manual review | [docs/components/preview-card.mdx:44](../../docs/components/preview-card.mdx#L44) |
| components/preview-card | Placement and arrow | tp-stack | start | manual review | [docs/components/preview-card.mdx:64](../../docs/components/preview-card.mdx#L64) |
| components/scroll-area | Both axes | tr | start | manual review | [docs/components/scroll-area.mdx:89](../../docs/components/scroll-area.mdx#L89) |
| components/scroll-area | Both axes | th | start | manual review | [docs/components/scroll-area.mdx:90](../../docs/components/scroll-area.mdx#L90) |
| components/scroll-area | Both axes | th | start | manual review | [docs/components/scroll-area.mdx:91](../../docs/components/scroll-area.mdx#L91) |
| components/scroll-area | Both axes | th | start | manual review | [docs/components/scroll-area.mdx:92](../../docs/components/scroll-area.mdx#L92) |
| components/scroll-area | Both axes | th | start | manual review | [docs/components/scroll-area.mdx:93](../../docs/components/scroll-area.mdx#L93) |
| components/scroll-area | Both axes | th | start | manual review | [docs/components/scroll-area.mdx:94](../../docs/components/scroll-area.mdx#L94) |
| components/scroll-area | Both axes | th | end | manual review | [docs/components/scroll-area.mdx:95](../../docs/components/scroll-area.mdx#L95) |
| components/scroll-area | Both axes | td | end | manual review | [docs/components/scroll-area.mdx:99](../../docs/components/scroll-area.mdx#L99) |
| components/scroll-area | Both axes | td | end | manual review | [docs/components/scroll-area.mdx:100](../../docs/components/scroll-area.mdx#L100) |
| components/scroll-area | Both axes | td | end | manual review | [docs/components/scroll-area.mdx:101](../../docs/components/scroll-area.mdx#L101) |
| components/scroll-area | Both axes | td | end | manual review | [docs/components/scroll-area.mdx:102](../../docs/components/scroll-area.mdx#L102) |
| components/scroll-area | Both axes | td | end | manual review | [docs/components/scroll-area.mdx:103](../../docs/components/scroll-area.mdx#L103) |
| components/scroll-area | Both axes | td | end | manual review | [docs/components/scroll-area.mdx:104](../../docs/components/scroll-area.mdx#L104) |
| components/scroll-trigger | From the center | tp-scroll-trigger | center | manual review | [docs/components/scroll-trigger.mdx:44](../../docs/components/scroll-trigger.mdx#L44) |
| components/scroll-trigger | Reveal events | tp-stack | center | manual review | [docs/components/scroll-trigger.mdx:239](../../docs/components/scroll-trigger.mdx#L239) |
| components/table | Table | tp-table-head | end | manual review | [docs/components/table.mdx:18](../../docs/components/table.mdx#L18) |
| components/table | Table | tp-table-cell | end | manual review | [docs/components/table.mdx:26](../../docs/components/table.mdx#L26) |
| components/table | Table | tp-table-cell | end | manual review | [docs/components/table.mdx:32](../../docs/components/table.mdx#L32) |
| components/table | Table | tp-table-cell | end | manual review | [docs/components/table.mdx:38](../../docs/components/table.mdx#L38) |
| components/table | Table | tp-table-cell | end | manual review | [docs/components/table.mdx:44](../../docs/components/table.mdx#L44) |
| components/table | Badges and menus | tp-table-head | end | manual review | [docs/components/table.mdx:65](../../docs/components/table.mdx#L65) |
| components/table | Badges and menus | tp-table-cell | end | manual review | [docs/components/table.mdx:73](../../docs/components/table.mdx#L73) |
| components/table | Badges and menus | tp-table-cell | end | manual review | [docs/components/table.mdx:87](../../docs/components/table.mdx#L87) |
| components/table | Badges and menus | tp-table-cell | end | manual review | [docs/components/table.mdx:101](../../docs/components/table.mdx#L101) |
| components/table | Inputs | tp-table-head | end | manual review | [docs/components/table.mdx:127](../../docs/components/table.mdx#L127) |
| components/table | Inputs | tp-table-cell | end | manual review | [docs/components/table.mdx:134](../../docs/components/table.mdx#L134) |
| components/table | Inputs | tp-table-cell | end | manual review | [docs/components/table.mdx:139](../../docs/components/table.mdx#L139) |
| components/table | Inputs | tp-table-cell | end | manual review | [docs/components/table.mdx:144](../../docs/components/table.mdx#L144) |
| components/table | Sticky edges | tp-table-head | end | manual review | [docs/components/table.mdx:245](../../docs/components/table.mdx#L245) |
| components/table | Sticky edges | tp-table-head | end | manual review | [docs/components/table.mdx:246](../../docs/components/table.mdx#L246) |
| components/table | Sticky edges | tp-table-head | end | manual review | [docs/components/table.mdx:247](../../docs/components/table.mdx#L247) |
| components/table | Sticky edges | tp-table-head | end | manual review | [docs/components/table.mdx:248](../../docs/components/table.mdx#L248) |
| components/table | Sticky edges | tp-table-head | end | manual review | [docs/components/table.mdx:249](../../docs/components/table.mdx#L249) |
| components/table | Sticky edges | tp-table-head | end | manual review | [docs/components/table.mdx:250](../../docs/components/table.mdx#L250) |
| components/table | Sticky edges | tp-table-head | end | manual review | [docs/components/table.mdx:251](../../docs/components/table.mdx#L251) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:255](../../docs/components/table.mdx#L255) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:255](../../docs/components/table.mdx#L255) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:255](../../docs/components/table.mdx#L255) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:255](../../docs/components/table.mdx#L255) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:255](../../docs/components/table.mdx#L255) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:255](../../docs/components/table.mdx#L255) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:255](../../docs/components/table.mdx#L255) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:256](../../docs/components/table.mdx#L256) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:256](../../docs/components/table.mdx#L256) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:256](../../docs/components/table.mdx#L256) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:256](../../docs/components/table.mdx#L256) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:256](../../docs/components/table.mdx#L256) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:256](../../docs/components/table.mdx#L256) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:256](../../docs/components/table.mdx#L256) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:257](../../docs/components/table.mdx#L257) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:257](../../docs/components/table.mdx#L257) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:257](../../docs/components/table.mdx#L257) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:257](../../docs/components/table.mdx#L257) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:257](../../docs/components/table.mdx#L257) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:257](../../docs/components/table.mdx#L257) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:257](../../docs/components/table.mdx#L257) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:258](../../docs/components/table.mdx#L258) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:258](../../docs/components/table.mdx#L258) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:258](../../docs/components/table.mdx#L258) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:258](../../docs/components/table.mdx#L258) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:258](../../docs/components/table.mdx#L258) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:258](../../docs/components/table.mdx#L258) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:258](../../docs/components/table.mdx#L258) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:259](../../docs/components/table.mdx#L259) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:259](../../docs/components/table.mdx#L259) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:259](../../docs/components/table.mdx#L259) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:259](../../docs/components/table.mdx#L259) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:259](../../docs/components/table.mdx#L259) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:259](../../docs/components/table.mdx#L259) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:259](../../docs/components/table.mdx#L259) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:260](../../docs/components/table.mdx#L260) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:260](../../docs/components/table.mdx#L260) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:260](../../docs/components/table.mdx#L260) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:260](../../docs/components/table.mdx#L260) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:260](../../docs/components/table.mdx#L260) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:260](../../docs/components/table.mdx#L260) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:260](../../docs/components/table.mdx#L260) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:261](../../docs/components/table.mdx#L261) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:261](../../docs/components/table.mdx#L261) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:261](../../docs/components/table.mdx#L261) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:261](../../docs/components/table.mdx#L261) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:261](../../docs/components/table.mdx#L261) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:261](../../docs/components/table.mdx#L261) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:261](../../docs/components/table.mdx#L261) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:262](../../docs/components/table.mdx#L262) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:262](../../docs/components/table.mdx#L262) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:262](../../docs/components/table.mdx#L262) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:262](../../docs/components/table.mdx#L262) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:262](../../docs/components/table.mdx#L262) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:262](../../docs/components/table.mdx#L262) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:262](../../docs/components/table.mdx#L262) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:263](../../docs/components/table.mdx#L263) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:263](../../docs/components/table.mdx#L263) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:263](../../docs/components/table.mdx#L263) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:263](../../docs/components/table.mdx#L263) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:263](../../docs/components/table.mdx#L263) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:263](../../docs/components/table.mdx#L263) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:263](../../docs/components/table.mdx#L263) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:266](../../docs/components/table.mdx#L266) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:266](../../docs/components/table.mdx#L266) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:266](../../docs/components/table.mdx#L266) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:266](../../docs/components/table.mdx#L266) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:266](../../docs/components/table.mdx#L266) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:266](../../docs/components/table.mdx#L266) |
| components/table | Sticky edges | tp-table-cell | end | manual review | [docs/components/table.mdx:266](../../docs/components/table.mdx#L266) |
| components/text-transform | Text transform | dd | end | manual review | [docs/components/text-transform.mdx:13](../../docs/components/text-transform.mdx#L13) |
| components/text-transform | Text transform | dd | end | manual review | [docs/components/text-transform.mdx:15](../../docs/components/text-transform.mdx#L15) |
| components/text-transform | Text transform | dd | end | manual review | [docs/components/text-transform.mdx:17](../../docs/components/text-transform.mdx#L17) |
| components/text-transform | Text transform | dd | end | manual review | [docs/components/text-transform.mdx:19](../../docs/components/text-transform.mdx#L19) |
| components/text-transform | Text transform | dd | end | manual review | [docs/components/text-transform.mdx:21](../../docs/components/text-transform.mdx#L21) |
| components/text-transform | Plans | tp-table-head | end | manual review | [docs/components/text-transform.mdx:59](../../docs/components/text-transform.mdx#L59) |
| components/text-transform | Plans | tp-table-head | end | manual review | [docs/components/text-transform.mdx:60](../../docs/components/text-transform.mdx#L60) |
| components/text-transform | Plans | tp-table-head | end | manual review | [docs/components/text-transform.mdx:61](../../docs/components/text-transform.mdx#L61) |
| components/text-transform | Plans | tp-table-head | end | manual review | [docs/components/text-transform.mdx:62](../../docs/components/text-transform.mdx#L62) |
| components/text-transform | Plans | tp-table-cell | end | manual review | [docs/components/text-transform.mdx:68](../../docs/components/text-transform.mdx#L68) |
| components/text-transform | Plans | tp-table-cell | end | manual review | [docs/components/text-transform.mdx:69](../../docs/components/text-transform.mdx#L69) |
| components/text-transform | Plans | tp-table-cell | end | manual review | [docs/components/text-transform.mdx:70](../../docs/components/text-transform.mdx#L70) |
| components/text-transform | Plans | tp-table-cell | end | manual review | [docs/components/text-transform.mdx:71](../../docs/components/text-transform.mdx#L71) |
| components/text-transform | Plans | tp-table-cell | end | manual review | [docs/components/text-transform.mdx:75](../../docs/components/text-transform.mdx#L75) |
| components/text-transform | Plans | tp-table-cell | end | manual review | [docs/components/text-transform.mdx:76](../../docs/components/text-transform.mdx#L76) |
| components/text-transform | Plans | tp-table-cell | end | manual review | [docs/components/text-transform.mdx:77](../../docs/components/text-transform.mdx#L77) |
| components/text-transform | Plans | tp-table-cell | end | manual review | [docs/components/text-transform.mdx:78](../../docs/components/text-transform.mdx#L78) |
| components/visually-hidden | Repeated actions | tp-table-cell | end | manual review | [docs/components/visually-hidden.mdx:106](../../docs/components/visually-hidden.mdx#L106) |
| components/visually-hidden | Repeated actions | tp-table-cell | end | manual review | [docs/components/visually-hidden.mdx:111](../../docs/components/visually-hidden.mdx#L111) |
| components/visually-hidden | Repeated actions | tp-table-cell | end | manual review | [docs/components/visually-hidden.mdx:116](../../docs/components/visually-hidden.mdx#L116) |
| motion/text/text-mirror | Text mirror | p | center | manual review | [docs/motion/text/text-mirror.mdx:9](../../docs/motion/text/text-mirror.mdx#L9) |
| motion/text/text-mirror | From the center line | p | start | manual review | [docs/motion/text/text-mirror.mdx:28](../../docs/motion/text/text-mirror.mdx#L28) |
| motion/text/text-mirror | Vertical seam | p | center | manual review | [docs/motion/text/text-mirror.mdx:41](../../docs/motion/text/text-mirror.mdx#L41) |
| motion/text/text-mirror | Hide and reveal | p | center | manual review | [docs/motion/text/text-mirror.mdx:59](../../docs/motion/text/text-mirror.mdx#L59) |
| motion/text/text-mirror | Scrubbed by the scroll | p | center | manual review | [docs/motion/text/text-mirror.mdx:93](../../docs/motion/text/text-mirror.mdx#L93) |
| motion/text/text-split | Text split | p | center | manual review | [docs/motion/text/text-split.mdx:9](../../docs/motion/text/text-split.mdx#L9) |
| motion/text/text-split | Words behind a mask | p | center | manual review | [docs/motion/text/text-split.mdx:34](../../docs/motion/text/text-split.mdx#L34) |
| motion/text/text-split | Characters from the center | p | center | manual review | [docs/motion/text/text-split.mdx:47](../../docs/motion/text/text-split.mdx#L47) |
| motion/text/text-split | Slow stagger | p | center | manual review | [docs/motion/text/text-split.mdx:58](../../docs/motion/text/text-split.mdx#L58) |
| motion/text/text-split | Reveal on demand | p | center | manual review | [docs/motion/text/text-split.mdx:76](../../docs/motion/text/text-split.mdx#L76) |
| motion/text/text-split | Custom reveal | p | center | manual review | [docs/motion/text/text-split.mdx:112](../../docs/motion/text/text-split.mdx#L112) |
| motion/text/text-stroke | Text stroke | p | center | manual review | [docs/motion/text/text-stroke.mdx:9](../../docs/motion/text/text-stroke.mdx#L9) |
| motion/text/text-stroke | Word by word | p | center | manual review | [docs/motion/text/text-stroke.mdx:28](../../docs/motion/text/text-stroke.mdx#L28) |
| motion/text/text-stroke | Heavier outline | p | center | manual review | [docs/motion/text/text-stroke.mdx:39](../../docs/motion/text/text-stroke.mdx#L39) |
| motion/text/text-stroke | Hide and reveal | p | center | manual review | [docs/motion/text/text-stroke.mdx:58](../../docs/motion/text/text-stroke.mdx#L58) |
| motion/text/text-stroke | Scrubbed by the scroll | p | center | manual review | [docs/motion/text/text-stroke.mdx:102](../../docs/motion/text/text-stroke.mdx#L102) |
| widgets/color-picker | Popup in a form | output | center | manual review | [docs/widgets/color-picker.mdx:66](../../docs/widgets/color-picker.mdx#L66) |
| widgets/emoji-picker | Popup in a form | output | center | manual review | [docs/widgets/emoji-picker.mdx:214](../../docs/widgets/emoji-picker.mdx#L214) |
| compositions/table.examples | tableDefaults | tp-table-head | end | manual review | [src/stories/table.examples.ts:161](../../src/stories/table.examples.ts#L161) |
| compositions/table.examples | tableDefaults | tp-table-cell | end | manual review | [src/stories/table.examples.ts:172](../../src/stories/table.examples.ts#L172) |
| compositions/table.examples | tableDefaults | tp-table-cell | end | manual review | [src/stories/table.examples.ts:199](../../src/stories/table.examples.ts#L199) |
| motion/text/text-mirror | Motion/Text/Text mirror | p | center | manual review | [src/stories/text-mirror.stories.ts:55](../../src/stories/text-mirror.stories.ts#L55) |
| motion/text/text-stroke | Motion/Text/Text stroke | p | center | manual review | [src/stories/text-stroke.stories.ts:55](../../src/stories/text-stroke.stories.ts#L55) |

<a id="property-8"></a>

### 8. display — 137 occurrences

| Value | Occurrences |
| --- | ---: |
| grid | 108 |
| block | 22 |
| flex | 4 |
| inline-flex | 3 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/accordion | Variants | div | grid | layout/geometry — minimize | [docs/components/accordion.mdx:37](../../docs/components/accordion.mdx#L37) |
| components/aspect-ratio | Common ratios | div | grid | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:26](../../docs/components/aspect-ratio.mdx#L26) |
| components/aspect-ratio | Common ratios | div | grid | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:28](../../docs/components/aspect-ratio.mdx#L28) |
| components/aspect-ratio | Common ratios | div | grid | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:31](../../docs/components/aspect-ratio.mdx#L31) |
| components/aspect-ratio | Common ratios | div | grid | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:34](../../docs/components/aspect-ratio.mdx#L34) |
| components/aspect-ratio | Cover and contain | div | grid | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:124](../../docs/components/aspect-ratio.mdx#L124) |
| components/calendar | Date with start and end times | div | grid | layout/geometry — minimize | [docs/components/calendar.mdx:225](../../docs/components/calendar.mdx#L225) |
| components/calendar | In a popover | tp-button | block | component structure/visibility — review required | [docs/components/calendar.mdx:310](../../docs/components/calendar.mdx#L310) |
| components/card | Surface options | div | grid | layout/geometry — minimize | [docs/components/card.mdx:61](../../docs/components/card.mdx#L61) |
| components/carousel | Bullets inside | blockquote | grid | layout/geometry — minimize | [docs/components/carousel.mdx:101](../../docs/components/carousel.mdx#L101) |
| components/carousel | Bullets inside | blockquote | grid | layout/geometry — minimize | [docs/components/carousel.mdx:105](../../docs/components/carousel.mdx#L105) |
| components/carousel | Bullets inside | blockquote | grid | layout/geometry — minimize | [docs/components/carousel.mdx:109](../../docs/components/carousel.mdx#L109) |
| components/carousel | Autoplay | div | grid | layout/geometry — minimize | [docs/components/carousel.mdx:130](../../docs/components/carousel.mdx#L130) |
| components/carousel | Autoplay | div | grid | layout/geometry — minimize | [docs/components/carousel.mdx:134](../../docs/components/carousel.mdx#L134) |
| components/carousel | Autoplay | div | grid | layout/geometry — minimize | [docs/components/carousel.mdx:138](../../docs/components/carousel.mdx#L138) |
| components/carousel | Layered 3D | img | block | layout/geometry — minimize | [docs/components/carousel.mdx:255](../../docs/components/carousel.mdx#L255) |
| components/carousel | Layered 3D | img | block | layout/geometry — minimize | [docs/components/carousel.mdx:291](../../docs/components/carousel.mdx#L291) |
| components/carousel | Layered 3D | img | block | layout/geometry — minimize | [docs/components/carousel.mdx:327](../../docs/components/carousel.mdx#L327) |
| components/carousel | Parallax | img | block | layout/geometry — minimize | [docs/components/carousel.mdx:366](../../docs/components/carousel.mdx#L366) |
| components/carousel | Parallax | img | block | layout/geometry — minimize | [docs/components/carousel.mdx:369](../../docs/components/carousel.mdx#L369) |
| components/carousel | Parallax | img | block | layout/geometry — minimize | [docs/components/carousel.mdx:372](../../docs/components/carousel.mdx#L372) |
| components/carousel | Parallax | img | block | layout/geometry — minimize | [docs/components/carousel.mdx:375](../../docs/components/carousel.mdx#L375) |
| components/carousel | Focus | img | block | layout/geometry — minimize | [docs/components/carousel.mdx:397](../../docs/components/carousel.mdx#L397) |
| components/carousel | Focus | img | block | layout/geometry — minimize | [docs/components/carousel.mdx:401](../../docs/components/carousel.mdx#L401) |
| components/carousel | Focus | img | block | layout/geometry — minimize | [docs/components/carousel.mdx:405](../../docs/components/carousel.mdx#L405) |
| components/carousel | Focus | img | block | layout/geometry — minimize | [docs/components/carousel.mdx:409](../../docs/components/carousel.mdx#L409) |
| components/carousel | Focus | img | block | layout/geometry — minimize | [docs/components/carousel.mdx:413](../../docs/components/carousel.mdx#L413) |
| components/carousel | Shader transition | img | block | layout/geometry — minimize | [docs/components/carousel.mdx:471](../../docs/components/carousel.mdx#L471) |
| components/carousel | Shader transition | img | block | layout/geometry — minimize | [docs/components/carousel.mdx:507](../../docs/components/carousel.mdx#L507) |
| components/carousel | Shader transition | img | block | layout/geometry — minimize | [docs/components/carousel.mdx:543](../../docs/components/carousel.mdx#L543) |
| components/carousel | Virtual archive with controlled selection | div | grid | layout/geometry — minimize | [docs/components/carousel.mdx:591](../../docs/components/carousel.mdx#L591) |
| components/carousel | Commit | div | grid | layout/geometry — minimize | [docs/components/carousel.mdx:632](../../docs/components/carousel.mdx#L632) |
| components/carousel | Commit | div | grid | layout/geometry — minimize | [docs/components/carousel.mdx:642](../../docs/components/carousel.mdx#L642) |
| components/carousel | Commit | div | grid | layout/geometry — minimize | [docs/components/carousel.mdx:652](../../docs/components/carousel.mdx#L652) |
| components/code-block | Title slot | span | inline-flex | layout/geometry — minimize | [docs/components/code-block.mdx:35](../../docs/components/code-block.mdx#L35) |
| components/collapsible | Line-by-line reveal | ul | grid | layout/geometry — minimize | [docs/components/collapsible.mdx:155](../../docs/components/collapsible.mdx#L155) |
| components/copy-button | Beside a value | dl | grid | layout/geometry — minimize | [docs/components/copy-button.mdx:52](../../docs/components/copy-button.mdx#L52) |
| components/cursor | Cursor | div | grid | layout/geometry — minimize | [docs/components/cursor.mdx:11](../../docs/components/cursor.mdx#L11) |
| components/cursor | Cursor | span | grid | layout/geometry — minimize | [docs/components/cursor.mdx:14](../../docs/components/cursor.mdx#L14) |
| components/cursor | Cursor | div | grid | layout/geometry — minimize | [docs/components/cursor.mdx:15](../../docs/components/cursor.mdx#L15) |
| components/cursor | Cursor | figure | grid | layout/geometry — minimize | [docs/components/cursor.mdx:16](../../docs/components/cursor.mdx#L16) |
| components/cursor | Cursor | figure | grid | layout/geometry — minimize | [docs/components/cursor.mdx:20](../../docs/components/cursor.mdx#L20) |
| components/cursor | Cursor | figure | grid | layout/geometry — minimize | [docs/components/cursor.mdx:24](../../docs/components/cursor.mdx#L24) |
| components/cursor | Spring | div | grid | layout/geometry — minimize | [docs/components/cursor.mdx:46](../../docs/components/cursor.mdx#L46) |
| components/cursor | Spring | div | grid | layout/geometry — minimize | [docs/components/cursor.mdx:47](../../docs/components/cursor.mdx#L47) |
| components/cursor | Spring | div | grid | layout/geometry — minimize | [docs/components/cursor.mdx:51](../../docs/components/cursor.mdx#L51) |
| components/cursor | Zones | div | grid | layout/geometry — minimize | [docs/components/cursor.mdx:69](../../docs/components/cursor.mdx#L69) |
| components/cursor | Zones | span | grid | layout/geometry — minimize | [docs/components/cursor.mdx:72](../../docs/components/cursor.mdx#L72) |
| components/cursor | Zones | div | grid | layout/geometry — minimize | [docs/components/cursor.mdx:73](../../docs/components/cursor.mdx#L73) |
| components/cursor | Zones | div | grid | layout/geometry — minimize | [docs/components/cursor.mdx:80](../../docs/components/cursor.mdx#L80) |
| components/cursor | Dot and ring | div | grid | layout/geometry — minimize | [docs/components/cursor.mdx:134](../../docs/components/cursor.mdx#L134) |
| components/cursor | Dot and ring | span | block | layout/geometry — minimize | [docs/components/cursor.mdx:136](../../docs/components/cursor.mdx#L136) |
| components/cursor | Native passthrough | div | grid | layout/geometry — minimize | [docs/components/cursor.mdx:154](../../docs/components/cursor.mdx#L154) |
| components/cursor | Reduced motion | div | grid | layout/geometry — minimize | [docs/components/cursor.mdx:208](../../docs/components/cursor.mdx#L208) |
| components/description-list | Record details | span | inline-flex | layout/geometry — minimize | [docs/components/description-list.mdx:39](../../docs/components/description-list.mdx#L39) |
| components/dialog | Non-modal | dl | grid | layout/geometry — minimize | [docs/components/dialog.mdx:55](../../docs/components/dialog.mdx#L55) |
| components/dialog | Container modality | section | grid | layout/geometry — minimize | [docs/components/dialog.mdx:82](../../docs/components/dialog.mdx#L82) |
| components/drag-drop-list | Variants and sizes | div | grid | layout/geometry — minimize | [docs/components/drag-drop-list.mdx:68](../../docs/components/drag-drop-list.mdx#L68) |
| components/drag-drop-list | Board lanes | div | grid | layout/geometry — minimize | [docs/components/drag-drop-list.mdx:187](../../docs/components/drag-drop-list.mdx#L187) |
| components/drag-drop-list | Controlled lanes | div | grid | layout/geometry — minimize | [docs/components/drag-drop-list.mdx:243](../../docs/components/drag-drop-list.mdx#L243) |
| components/drag-drop-list | Approve before committing | div | grid | layout/geometry — minimize | [docs/components/drag-drop-list.mdx:307](../../docs/components/drag-drop-list.mdx#L307) |
| components/empty-state | Media treatments | div | grid | layout/geometry — minimize | [docs/components/empty-state.mdx:45](../../docs/components/empty-state.mdx#L45) |
| components/empty-state | Bordered and filled | div | grid | layout/geometry — minimize | [docs/components/empty-state.mdx:108](../../docs/components/empty-state.mdx#L108) |
| components/icon | Decorative and labelled | span | inline-flex | layout/geometry — minimize | [docs/components/icon.mdx:51](../../docs/components/icon.mdx#L51) |
| components/image | Ratio and fit | div | grid | layout/geometry — minimize | [docs/components/image.mdx:36](../../docs/components/image.mdx#L36) |
| components/image | Fallbacks | div | grid | layout/geometry — minimize | [docs/components/image.mdx:57](../../docs/components/image.mdx#L57) |
| components/image | Fallbacks | span | grid | layout/geometry — minimize | [docs/components/image.mdx:60](../../docs/components/image.mdx#L60) |
| components/image | Loading placeholders | div | grid | layout/geometry — minimize | [docs/components/image.mdx:71](../../docs/components/image.mdx#L71) |
| components/image | Hover zoom | div | grid | layout/geometry — minimize | [docs/components/image.mdx:89](../../docs/components/image.mdx#L89) |
| components/image | Staggered group | tp-image-group | grid | component structure/visibility — review required | [docs/components/image.mdx:124](../../docs/components/image.mdx#L124) |
| components/image | Reveal timing and repeat | div | grid | layout/geometry — minimize | [docs/components/image.mdx:138](../../docs/components/image.mdx#L138) |
| components/image | Reveal timing and repeat | p | grid | layout/geometry — minimize | [docs/components/image.mdx:143](../../docs/components/image.mdx#L143) |
| components/image | Reveal timing and repeat | div | grid | layout/geometry — minimize | [docs/components/image.mdx:144](../../docs/components/image.mdx#L144) |
| components/image | Headline, group and caption | tp-image-group | grid | component structure/visibility — review required | [docs/components/image.mdx:163](../../docs/components/image.mdx#L163) |
| components/image | Parallax in a scroller | div | grid | layout/geometry — minimize | [docs/components/image.mdx:186](../../docs/components/image.mdx#L186) |
| components/image | Scroll zoom in a vertical scroller | div | grid | layout/geometry — minimize | [docs/components/image.mdx:198](../../docs/components/image.mdx#L198) |
| components/image | Horizontal strip | div | flex | layout/geometry — minimize | [docs/components/image.mdx:259](../../docs/components/image.mdx#L259) |
| components/image | Smoothing | div | grid | layout/geometry — minimize | [docs/components/image.mdx:272](../../docs/components/image.mdx#L272) |
| components/list | Recordings | span | grid | layout/geometry — minimize | [docs/components/list.mdx:252](../../docs/components/list.mdx#L252) |
| components/list | Recordings | span | flex | layout/geometry — minimize | [docs/components/list.mdx:253](../../docs/components/list.mdx#L253) |
| components/list | People and invitations | span | grid | layout/geometry — minimize | [docs/components/list.mdx:346](../../docs/components/list.mdx#L346) |
| components/list | People and invitations | span | flex | layout/geometry — minimize | [docs/components/list.mdx:347](../../docs/components/list.mdx#L347) |
| components/markdown | With a table of contents | div | grid | layout/geometry — minimize | [docs/components/markdown.mdx:240](../../docs/components/markdown.mdx#L240) |
| components/menu | Context invocation | div | grid | layout/geometry — minimize | [docs/components/menu.mdx:147](../../docs/components/menu.mdx#L147) |
| components/message-scroller | Outline and edges | div | grid | layout/geometry — minimize | [docs/components/message-scroller.mdx:316](../../docs/components/message-scroller.mdx#L316) |
| components/navigation-menu | Navigation menu | div | grid | layout/geometry — minimize | [docs/components/navigation-menu.mdx:15](../../docs/components/navigation-menu.mdx#L15) |
| components/popover | Popover | div | grid | layout/geometry — minimize | [docs/components/popover.mdx:13](../../docs/components/popover.mdx#L13) |
| components/popover | Separate anchor | tp-popover | grid | component structure/visibility — review required | [docs/components/popover.mdx:115](../../docs/components/popover.mdx#L115) |
| components/preview-card | Preview Card | div | grid | layout/geometry — minimize | [docs/components/preview-card.mdx:13](../../docs/components/preview-card.mdx#L13) |
| components/resizable-panel-group | Resizable Panel Group | div | grid | layout/geometry — minimize | [docs/components/resizable-panel-group.mdx:13](../../docs/components/resizable-panel-group.mdx#L13) |
| components/resizable-panel-group | Resizable Panel Group | div | grid | layout/geometry — minimize | [docs/components/resizable-panel-group.mdx:24](../../docs/components/resizable-panel-group.mdx#L24) |
| components/scroll-trigger | Scroll Trigger | div | grid | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:16](../../docs/components/scroll-trigger.mdx#L16) |
| components/scroll-trigger | From the center | tp-scroll-trigger | grid | component structure/visibility — review required | [docs/components/scroll-trigger.mdx:44](../../docs/components/scroll-trigger.mdx#L44) |
| components/scroll-trigger | Scrubbed band | div | grid | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:108](../../docs/components/scroll-trigger.mdx#L108) |
| components/scroll-trigger | Custom scroll range | div | grid | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:160](../../docs/components/scroll-trigger.mdx#L160) |
| components/scroll-trigger | Custom scroll range | div | grid | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:183](../../docs/components/scroll-trigger.mdx#L183) |
| components/scroll-trigger | Pinned scene | div | grid | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:206](../../docs/components/scroll-trigger.mdx#L206) |
| components/scroll-trigger | Pinned scene | div | grid | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:213](../../docs/components/scroll-trigger.mdx#L213) |
| components/scroll-trigger | Pinned scene | div | grid | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:221](../../docs/components/scroll-trigger.mdx#L221) |
| components/slider | Compact readout | div | grid | layout/geometry — minimize | [docs/components/slider.mdx:202](../../docs/components/slider.mdx#L202) |
| components/table-of-contents | Table of contents | div | grid | layout/geometry — minimize | [docs/components/table-of-contents.mdx:12](../../docs/components/table-of-contents.mdx#L12) |
| components/table-of-contents | Nested sections | div | grid | layout/geometry — minimize | [docs/components/table-of-contents.mdx:87](../../docs/components/table-of-contents.mdx#L87) |
| components/table-of-contents | Collected targets | div | grid | layout/geometry — minimize | [docs/components/table-of-contents.mdx:174](../../docs/components/table-of-contents.mdx#L174) |
| components/table-of-contents | Compact | div | grid | layout/geometry — minimize | [docs/components/table-of-contents.mdx:238](../../docs/components/table-of-contents.mdx#L238) |
| components/text-transform | Text transform | dl | grid | layout/geometry — minimize | [docs/components/text-transform.mdx:11](../../docs/components/text-transform.mdx#L11) |
| components/text-transform | Case and identifiers | dl | grid | layout/geometry — minimize | [docs/components/text-transform.mdx:35](../../docs/components/text-transform.mdx#L35) |
| components/time | Time | ul | grid | layout/geometry — minimize | [docs/components/time.mdx:13](../../docs/components/time.mdx#L13) |
| components/time | Modes | dl | grid | layout/geometry — minimize | [docs/components/time.mdx:55](../../docs/components/time.mdx#L55) |
| components/time | Calendar | dl | grid | layout/geometry — minimize | [docs/components/time.mdx:147](../../docs/components/time.mdx#L147) |
| components/time | Precisions | dl | grid | layout/geometry — minimize | [docs/components/time.mdx:187](../../docs/components/time.mdx#L187) |
| components/time | Timers | dl | grid | layout/geometry — minimize | [docs/components/time.mdx:202](../../docs/components/time.mdx#L202) |
| components/tooltip | Cursor tracking | div | grid | layout/geometry — minimize | [docs/components/tooltip.mdx:69](../../docs/components/tooltip.mdx#L69) |
| motion/surface/glow-border | Comets | div | grid | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:58](../../docs/motion/surface/glow-border.mdx#L58) |
| motion/surface/glow-border | Sweep, pulse and glint | div | grid | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:81](../../docs/motion/surface/glow-border.mdx#L81) |
| motion/surface/glow-border | Custom colors | div | grid | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:139](../../docs/motion/surface/glow-border.mdx#L139) |
| motion/surface/glow-border | Lit by an element | div | grid | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:164](../../docs/motion/surface/glow-border.mdx#L164) |
| motion/surface/segment-border | Traced in | div | grid | layout/geometry — minimize | [docs/motion/surface/segment-border.mdx:121](../../docs/motion/surface/segment-border.mdx#L121) |
| motion/text/text-mirror | Hide and reveal | div | grid | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:58](../../docs/motion/text/text-mirror.mdx#L58) |
| motion/text/text-mirror | Scrubbed by the scroll | div | grid | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:96](../../docs/motion/text/text-mirror.mdx#L96) |
| motion/text/text-split | Reveal on demand | div | grid | layout/geometry — minimize | [docs/motion/text/text-split.mdx:75](../../docs/motion/text/text-split.mdx#L75) |
| motion/text/text-split | Scrubbed by the scroll | div | grid | layout/geometry — minimize | [docs/motion/text/text-split.mdx:164](../../docs/motion/text/text-split.mdx#L164) |
| motion/text/text-stroke | Scrubbed by the scroll | div | grid | layout/geometry — minimize | [docs/motion/text/text-stroke.mdx:113](../../docs/motion/text/text-stroke.mdx#L113) |
| widgets/color-picker | Color input trigger | tp-color-picker | block | component structure/visibility — review required | [docs/widgets/color-picker.mdx:37](../../docs/widgets/color-picker.mdx#L37) |
| widgets/color-picker | Popup in a form | output | block | layout/geometry — minimize | [docs/widgets/color-picker.mdx:66](../../docs/widgets/color-picker.mdx#L66) |
| widgets/easing-editor | Spring and custom points | div | flex | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:22](../../docs/widgets/easing-editor.mdx#L22) |
| widgets/easing-editor | Commit and veto | div | grid | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:139](../../docs/widgets/easing-editor.mdx#L139) |
| widgets/easing-editor | Controlled owner | div | grid | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:163](../../docs/widgets/easing-editor.mdx#L163) |
| widgets/emoji-picker | Popup in a form | output | block | layout/geometry — minimize | [docs/widgets/emoji-picker.mdx:214](../../docs/widgets/emoji-picker.mdx#L214) |
| widgets/flow | In a form | output | block | layout/geometry — minimize | [docs/widgets/flow.mdx:712](../../docs/widgets/flow.mdx#L712) |
| components/cursor | Components/Cursor | div | grid | layout/geometry — minimize | [src/stories/cursor.stories.ts:92](../../src/stories/cursor.stories.ts#L92) |
| compositions/map.examples | pinSvg | section | grid | layout/geometry — minimize | [src/stories/map.examples.ts:110](../../src/stories/map.examples.ts#L110) |
| components/scroll-trigger | (file/setup/shared helper) | div | grid | layout/geometry — minimize | [src/stories/scroll-trigger.stories.ts:21](../../src/stories/scroll-trigger.stories.ts#L21) |
| compositions/skeleton.examples | skeletonExamples | div | grid | layout/geometry — minimize | [src/stories/skeleton.examples.ts:91](../../src/stories/skeleton.examples.ts#L91) |
| compositions/table-of-contents.examples | Changelog | div | grid | layout/geometry — minimize | [src/stories/table-of-contents.examples.ts:141](../../src/stories/table-of-contents.examples.ts#L141) |
| compositions/table-of-contents.examples | Changelog | aside | grid | layout/geometry — minimize | [src/stories/table-of-contents.examples.ts:148](../../src/stories/table-of-contents.examples.ts#L148) |
| components/table-of-contents | DocumentScroll | div | grid | layout/geometry — minimize | [src/stories/table-of-contents.stories.ts:144](../../src/stories/table-of-contents.stories.ts#L144) |
| compositions/workspace/workspace | (file/setup/shared helper) | tp-button | block | component structure/visibility — review required | [src/stories/workspace/workspace.ts:500](../../src/stories/workspace/workspace.ts#L500) |

<a id="property-9"></a>

### 9. padding — 124 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-space-2) var(--tp-space-4) | 42 |
| var(--tp-space-4) | 35 |
| var(--tp-space-6) | 29 |
| 0 | 5 |
| var(--tp-space-3) var(--tp-space-4) | 3 |
| var(--tp-space-8) var(--tp-space-12) | 3 |
| var(--tp-space-8) var(--tp-space-6) | 2 |
| 1.5rem | 1 |
| 2rem | 1 |
| var(--tp-space-2) | 1 |
| var(--tp-space-3) | 1 |
| var(--tp-space-5) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/carousel | Carousel | tp-stack | var(--tp-space-6) | component spacing — review required | [docs/components/carousel.mdx:13](../../docs/components/carousel.mdx#L13) |
| components/carousel | Carousel | tp-stack | var(--tp-space-6) | component spacing — review required | [docs/components/carousel.mdx:26](../../docs/components/carousel.mdx#L26) |
| components/carousel | Carousel | tp-stack | var(--tp-space-6) | component spacing — review required | [docs/components/carousel.mdx:39](../../docs/components/carousel.mdx#L39) |
| components/carousel | Carousel | tp-stack | var(--tp-space-6) | component spacing — review required | [docs/components/carousel.mdx:51](../../docs/components/carousel.mdx#L51) |
| components/carousel | Bullets inside | blockquote | var(--tp-space-8) var(--tp-space-12) | layout spacing — minimize | [docs/components/carousel.mdx:101](../../docs/components/carousel.mdx#L101) |
| components/carousel | Bullets inside | blockquote | var(--tp-space-8) var(--tp-space-12) | layout spacing — minimize | [docs/components/carousel.mdx:105](../../docs/components/carousel.mdx#L105) |
| components/carousel | Bullets inside | blockquote | var(--tp-space-8) var(--tp-space-12) | layout spacing — minimize | [docs/components/carousel.mdx:109](../../docs/components/carousel.mdx#L109) |
| components/carousel | Autoplay | div | var(--tp-space-6) | layout spacing — minimize | [docs/components/carousel.mdx:130](../../docs/components/carousel.mdx#L130) |
| components/carousel | Autoplay | div | var(--tp-space-6) | layout spacing — minimize | [docs/components/carousel.mdx:134](../../docs/components/carousel.mdx#L134) |
| components/carousel | Autoplay | div | var(--tp-space-6) | layout spacing — minimize | [docs/components/carousel.mdx:138](../../docs/components/carousel.mdx#L138) |
| components/carousel | Crossfade | tp-stack | var(--tp-space-6) | component spacing — review required | [docs/components/carousel.mdx:184](../../docs/components/carousel.mdx#L184) |
| components/carousel | Crossfade | tp-stack | var(--tp-space-6) | component spacing — review required | [docs/components/carousel.mdx:198](../../docs/components/carousel.mdx#L198) |
| components/carousel | Crossfade | tp-stack | var(--tp-space-6) | component spacing — review required | [docs/components/carousel.mdx:213](../../docs/components/carousel.mdx#L213) |
| components/checkbox | Select all | fieldset | 0 | layout spacing — minimize | [docs/components/checkbox.mdx:68](../../docs/components/checkbox.mdx#L68) |
| components/checkbox | Select all | legend | 0 | layout spacing — minimize | [docs/components/checkbox.mdx:70](../../docs/components/checkbox.mdx#L70) |
| components/checkbox | CheckboxGroupController | fieldset | 0 | layout spacing — minimize | [docs/components/checkbox.mdx:117](../../docs/components/checkbox.mdx#L117) |
| components/checkbox | CheckboxGroupController | legend | 0 | layout spacing — minimize | [docs/components/checkbox.mdx:119](../../docs/components/checkbox.mdx#L119) |
| components/cursor | Cursor | div | var(--tp-space-6) | layout spacing — minimize | [docs/components/cursor.mdx:11](../../docs/components/cursor.mdx#L11) |
| components/cursor | Zones | div | var(--tp-space-6) | layout spacing — minimize | [docs/components/cursor.mdx:69](../../docs/components/cursor.mdx#L69) |
| components/cursor | Zones | div | var(--tp-space-4) | layout spacing — minimize | [docs/components/cursor.mdx:73](../../docs/components/cursor.mdx#L73) |
| components/cursor | Zones | div | var(--tp-space-4) | layout spacing — minimize | [docs/components/cursor.mdx:80](../../docs/components/cursor.mdx#L80) |
| components/cursor | Sticking | tp-stack | var(--tp-space-8) var(--tp-space-6) | component spacing — review required | [docs/components/cursor.mdx:98](../../docs/components/cursor.mdx#L98) |
| components/cursor | Dot and ring | div | var(--tp-space-6) | layout spacing — minimize | [docs/components/cursor.mdx:134](../../docs/components/cursor.mdx#L134) |
| components/cursor | Native passthrough | div | var(--tp-space-6) | layout spacing — minimize | [docs/components/cursor.mdx:154](../../docs/components/cursor.mdx#L154) |
| components/cursor | Programmatic state | tp-stack | var(--tp-space-8) var(--tp-space-6) | component spacing — review required | [docs/components/cursor.mdx:174](../../docs/components/cursor.mdx#L174) |
| components/cursor | Reduced motion | div | var(--tp-space-6) | layout spacing — minimize | [docs/components/cursor.mdx:208](../../docs/components/cursor.mdx#L208) |
| components/dialog | Container modality | section | var(--tp-space-5) | layout spacing — minimize | [docs/components/dialog.mdx:82](../../docs/components/dialog.mdx#L82) |
| components/image | Reveal timing and repeat | div | var(--tp-space-4) | layout spacing — minimize | [docs/components/image.mdx:137](../../docs/components/image.mdx#L137) |
| components/image | Parallax in a scroller | div | var(--tp-space-4) | layout spacing — minimize | [docs/components/image.mdx:186](../../docs/components/image.mdx#L186) |
| components/image | Scroll zoom in a vertical scroller | div | var(--tp-space-4) | layout spacing — minimize | [docs/components/image.mdx:198](../../docs/components/image.mdx#L198) |
| components/image | Horizontal strip | div | var(--tp-space-4) | layout spacing — minimize | [docs/components/image.mdx:259](../../docs/components/image.mdx#L259) |
| components/image | Smoothing | div | var(--tp-space-4) | layout spacing — minimize | [docs/components/image.mdx:272](../../docs/components/image.mdx#L272) |
| components/input-group | Native textarea | textarea | var(--tp-space-2) | layout spacing — minimize | [docs/components/input-group.mdx:252](../../docs/components/input-group.mdx#L252) |
| components/markdown | With a table of contents | div | var(--tp-space-6) | layout spacing — minimize | [docs/components/markdown.mdx:240](../../docs/components/markdown.mdx#L240) |
| components/media-player | Custom top region | tp-stack | var(--tp-space-4) | component spacing — review required | [docs/components/media-player.mdx:118](../../docs/components/media-player.mdx#L118) |
| components/overflow-list | Row limit | div | var(--tp-space-3) | layout spacing — minimize | [docs/components/overflow-list.mdx:52](../../docs/components/overflow-list.mdx#L52) |
| components/popover | Separate anchor | tp-stack | var(--tp-space-3) var(--tp-space-4) | component spacing — review required | [docs/components/popover.mdx:120](../../docs/components/popover.mdx#L120) |
| components/resizable-panel-group | Resizable Panel Group | div | var(--tp-space-4) | layout spacing — minimize | [docs/components/resizable-panel-group.mdx:13](../../docs/components/resizable-panel-group.mdx#L13) |
| components/resizable-panel-group | Resizable Panel Group | div | var(--tp-space-4) | layout spacing — minimize | [docs/components/resizable-panel-group.mdx:24](../../docs/components/resizable-panel-group.mdx#L24) |
| components/resizable-panel-group | Resizable Panel Group | div | var(--tp-space-4) | layout spacing — minimize | [docs/components/resizable-panel-group.mdx:32](../../docs/components/resizable-panel-group.mdx#L32) |
| components/resizable-panel-group | Bounds | div | var(--tp-space-4) | layout spacing — minimize | [docs/components/resizable-panel-group.mdx:58](../../docs/components/resizable-panel-group.mdx#L58) |
| components/resizable-panel-group | Bounds | div | var(--tp-space-4) | layout spacing — minimize | [docs/components/resizable-panel-group.mdx:62](../../docs/components/resizable-panel-group.mdx#L62) |
| components/resizable-panel-group | Vertical | div | var(--tp-space-4) | layout spacing — minimize | [docs/components/resizable-panel-group.mdx:76](../../docs/components/resizable-panel-group.mdx#L76) |
| components/resizable-panel-group | Vertical | div | var(--tp-space-4) | layout spacing — minimize | [docs/components/resizable-panel-group.mdx:80](../../docs/components/resizable-panel-group.mdx#L80) |
| components/resizable-panel-group | Collapsible sidebar | div | var(--tp-space-4) | layout spacing — minimize | [docs/components/resizable-panel-group.mdx:105](../../docs/components/resizable-panel-group.mdx#L105) |
| components/resizable-panel-group | Collapsible sidebar | div | var(--tp-space-4) | layout spacing — minimize | [docs/components/resizable-panel-group.mdx:109](../../docs/components/resizable-panel-group.mdx#L109) |
| components/resizable-panel-group | Layout events | div | var(--tp-space-4) | layout spacing — minimize | [docs/components/resizable-panel-group.mdx:140](../../docs/components/resizable-panel-group.mdx#L140) |
| components/resizable-panel-group | Layout events | div | var(--tp-space-4) | layout spacing — minimize | [docs/components/resizable-panel-group.mdx:144](../../docs/components/resizable-panel-group.mdx#L144) |
| components/resizable-panel-group | Layout presets | div | var(--tp-space-4) | layout spacing — minimize | [docs/components/resizable-panel-group.mdx:188](../../docs/components/resizable-panel-group.mdx#L188) |
| components/resizable-panel-group | Layout presets | div | var(--tp-space-4) | layout spacing — minimize | [docs/components/resizable-panel-group.mdx:192](../../docs/components/resizable-panel-group.mdx#L192) |
| components/resizable-panel-group | Persisted sizes | div | var(--tp-space-4) | layout spacing — minimize | [docs/components/resizable-panel-group.mdx:231](../../docs/components/resizable-panel-group.mdx#L231) |
| components/resizable-panel-group | Persisted sizes | div | var(--tp-space-4) | layout spacing — minimize | [docs/components/resizable-panel-group.mdx:235](../../docs/components/resizable-panel-group.mdx#L235) |
| components/resizable-panel-group | Disabled | div | var(--tp-space-4) | layout spacing — minimize | [docs/components/resizable-panel-group.mdx:272](../../docs/components/resizable-panel-group.mdx#L272) |
| components/resizable-panel-group | Disabled | div | var(--tp-space-4) | layout spacing — minimize | [docs/components/resizable-panel-group.mdx:276](../../docs/components/resizable-panel-group.mdx#L276) |
| components/scroll-area | Scroll Area | div | var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:10](../../docs/components/scroll-area.mdx#L10) |
| components/scroll-area | Horizontal | tp-stack | var(--tp-space-4) | component spacing — review required | [docs/components/scroll-area.mdx:59](../../docs/components/scroll-area.mdx#L59) |
| components/scroll-area | Horizontal | tp-card | var(--tp-space-4) | component spacing — review required | [docs/components/scroll-area.mdx:60](../../docs/components/scroll-area.mdx#L60) |
| components/scroll-area | Horizontal | tp-card | var(--tp-space-4) | component spacing — review required | [docs/components/scroll-area.mdx:63](../../docs/components/scroll-area.mdx#L63) |
| components/scroll-area | Horizontal | tp-card | var(--tp-space-4) | component spacing — review required | [docs/components/scroll-area.mdx:66](../../docs/components/scroll-area.mdx#L66) |
| components/scroll-area | Horizontal | tp-card | var(--tp-space-4) | component spacing — review required | [docs/components/scroll-area.mdx:69](../../docs/components/scroll-area.mdx#L69) |
| components/scroll-area | Horizontal | tp-card | var(--tp-space-4) | component spacing — review required | [docs/components/scroll-area.mdx:72](../../docs/components/scroll-area.mdx#L72) |
| components/scroll-area | Both axes | th | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:90](../../docs/components/scroll-area.mdx#L90) |
| components/scroll-area | Both axes | th | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:91](../../docs/components/scroll-area.mdx#L91) |
| components/scroll-area | Both axes | th | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:92](../../docs/components/scroll-area.mdx#L92) |
| components/scroll-area | Both axes | th | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:93](../../docs/components/scroll-area.mdx#L93) |
| components/scroll-area | Both axes | th | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:94](../../docs/components/scroll-area.mdx#L94) |
| components/scroll-area | Both axes | th | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:95](../../docs/components/scroll-area.mdx#L95) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:99](../../docs/components/scroll-area.mdx#L99) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:99](../../docs/components/scroll-area.mdx#L99) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:99](../../docs/components/scroll-area.mdx#L99) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:99](../../docs/components/scroll-area.mdx#L99) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:99](../../docs/components/scroll-area.mdx#L99) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:99](../../docs/components/scroll-area.mdx#L99) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:100](../../docs/components/scroll-area.mdx#L100) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:100](../../docs/components/scroll-area.mdx#L100) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:100](../../docs/components/scroll-area.mdx#L100) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:100](../../docs/components/scroll-area.mdx#L100) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:100](../../docs/components/scroll-area.mdx#L100) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:100](../../docs/components/scroll-area.mdx#L100) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:101](../../docs/components/scroll-area.mdx#L101) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:101](../../docs/components/scroll-area.mdx#L101) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:101](../../docs/components/scroll-area.mdx#L101) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:101](../../docs/components/scroll-area.mdx#L101) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:101](../../docs/components/scroll-area.mdx#L101) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:101](../../docs/components/scroll-area.mdx#L101) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:102](../../docs/components/scroll-area.mdx#L102) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:102](../../docs/components/scroll-area.mdx#L102) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:102](../../docs/components/scroll-area.mdx#L102) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:102](../../docs/components/scroll-area.mdx#L102) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:102](../../docs/components/scroll-area.mdx#L102) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:102](../../docs/components/scroll-area.mdx#L102) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:103](../../docs/components/scroll-area.mdx#L103) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:103](../../docs/components/scroll-area.mdx#L103) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:103](../../docs/components/scroll-area.mdx#L103) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:103](../../docs/components/scroll-area.mdx#L103) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:103](../../docs/components/scroll-area.mdx#L103) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:103](../../docs/components/scroll-area.mdx#L103) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:104](../../docs/components/scroll-area.mdx#L104) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:104](../../docs/components/scroll-area.mdx#L104) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:104](../../docs/components/scroll-area.mdx#L104) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:104](../../docs/components/scroll-area.mdx#L104) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:104](../../docs/components/scroll-area.mdx#L104) |
| components/scroll-area | Both axes | td | var(--tp-space-2) var(--tp-space-4) | layout spacing — minimize | [docs/components/scroll-area.mdx:104](../../docs/components/scroll-area.mdx#L104) |
| components/scroll-area | Visibility | tp-stack | var(--tp-space-3) var(--tp-space-4) | component spacing — review required | [docs/components/scroll-area.mdx:128](../../docs/components/scroll-area.mdx#L128) |
| components/scroll-area | Visibility | tp-stack | var(--tp-space-3) var(--tp-space-4) | component spacing — review required | [docs/components/scroll-area.mdx:147](../../docs/components/scroll-area.mdx#L147) |
| components/table-of-contents | Table of contents | div | var(--tp-space-6) | layout spacing — minimize | [docs/components/table-of-contents.mdx:12](../../docs/components/table-of-contents.mdx#L12) |
| components/table-of-contents | Nested sections | div | var(--tp-space-6) | layout spacing — minimize | [docs/components/table-of-contents.mdx:87](../../docs/components/table-of-contents.mdx#L87) |
| components/table-of-contents | Collected targets | div | var(--tp-space-6) | layout spacing — minimize | [docs/components/table-of-contents.mdx:174](../../docs/components/table-of-contents.mdx#L174) |
| components/table-of-contents | Compact | div | var(--tp-space-6) | layout spacing — minimize | [docs/components/table-of-contents.mdx:238](../../docs/components/table-of-contents.mdx#L238) |
| components/text-transform | Truncation | tp-stack | var(--tp-space-4) | component spacing — review required | [docs/components/text-transform.mdx:135](../../docs/components/text-transform.mdx#L135) |
| components/time | Time | ul | 0 | layout spacing — minimize | [docs/components/time.mdx:13](../../docs/components/time.mdx#L13) |
| compositions/map.examples | Token theme | div | var(--tp-space-4) | layout spacing — minimize | [src/stories/map.examples.ts:246](../../src/stories/map.examples.ts#L246) |
| components/resizable-panel-group | Components/Resizable panel group | div | var(--tp-space-6) | layout spacing — minimize | [src/stories/resizable-panel-group.stories.ts:42](../../src/stories/resizable-panel-group.stories.ts#L42) |
| components/resizable-panel-group | Components/Resizable panel group | div | var(--tp-space-6) | layout spacing — minimize | [src/stories/resizable-panel-group.stories.ts:48](../../src/stories/resizable-panel-group.stories.ts#L48) |
| components/resizable-panel-group | NestedWorkspace | div | var(--tp-space-6) | layout spacing — minimize | [src/stories/resizable-panel-group.stories.ts:61](../../src/stories/resizable-panel-group.stories.ts#L61) |
| components/resizable-panel-group | NestedWorkspace | div | var(--tp-space-6) | layout spacing — minimize | [src/stories/resizable-panel-group.stories.ts:66](../../src/stories/resizable-panel-group.stories.ts#L66) |
| components/resizable-panel-group | NestedWorkspace | div | var(--tp-space-6) | layout spacing — minimize | [src/stories/resizable-panel-group.stories.ts:69](../../src/stories/resizable-panel-group.stories.ts#L69) |
| components/resizable-panel-group | Controlled | div | var(--tp-space-6) | layout spacing — minimize | [src/stories/resizable-panel-group.stories.ts:86](../../src/stories/resizable-panel-group.stories.ts#L86) |
| components/resizable-panel-group | Controlled | div | var(--tp-space-6) | layout spacing — minimize | [src/stories/resizable-panel-group.stories.ts:89](../../src/stories/resizable-panel-group.stories.ts#L89) |
| components/resizable-panel-group | CollapsibleSidebar | div | var(--tp-space-6) | layout spacing — minimize | [src/stories/resizable-panel-group.stories.ts:110](../../src/stories/resizable-panel-group.stories.ts#L110) |
| components/resizable-panel-group | CollapsibleSidebar | div | var(--tp-space-6) | layout spacing — minimize | [src/stories/resizable-panel-group.stories.ts:113](../../src/stories/resizable-panel-group.stories.ts#L113) |
| components/scroll-area | Components/Scroll area | div | var(--tp-space-4) | layout spacing — minimize | [src/stories/scroll-area.stories.ts:47](../../src/stories/scroll-area.stories.ts#L47) |
| compositions/table-of-contents.examples | Changelog | div | 1.5rem | layout spacing — minimize | [src/stories/table-of-contents.examples.ts:141](../../src/stories/table-of-contents.examples.ts#L141) |
| components/table-of-contents | DocumentScroll | div | 2rem | layout spacing — minimize | [src/stories/table-of-contents.stories.ts:144](../../src/stories/table-of-contents.stories.ts#L144) |

<a id="property-10"></a>

### 10. gap — 96 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-space-3) | 31 |
| var(--tp-space-4) | 23 |
| var(--tp-space-2) | 8 |
| var(--tp-space-6) | 8 |
| var(--tp-space-2) var(--tp-space-6) | 6 |
| var(--tp-space-1) | 5 |
| var(--tp-space-8) | 5 |
| inherit | 2 |
| var(--tp-space-5) | 2 |
| 0.75rem | 1 |
| 2.5rem | 1 |
| 3rem | 1 |
| calc(var(--tp-spacing) * 7) | 1 |
| var(--tp-space-3) var(--tp-space-4) | 1 |
| var(--tp-space-3) var(--tp-space-6) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/accordion | Variants | div | var(--tp-space-6) | layout/geometry — minimize | [docs/components/accordion.mdx:37](../../docs/components/accordion.mdx#L37) |
| components/aspect-ratio | Common ratios | div | var(--tp-space-4) | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:26](../../docs/components/aspect-ratio.mdx#L26) |
| components/aspect-ratio | Cover and contain | div | var(--tp-space-4) | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:124](../../docs/components/aspect-ratio.mdx#L124) |
| components/calendar | Date with start and end times | div | var(--tp-space-3) | layout/geometry — minimize | [docs/components/calendar.mdx:225](../../docs/components/calendar.mdx#L225) |
| components/card | Surface options | div | var(--tp-space-4) | layout/geometry — minimize | [docs/components/card.mdx:61](../../docs/components/card.mdx#L61) |
| components/carousel | Bullets inside | blockquote | var(--tp-space-3) | layout/geometry — minimize | [docs/components/carousel.mdx:101](../../docs/components/carousel.mdx#L101) |
| components/carousel | Bullets inside | blockquote | var(--tp-space-3) | layout/geometry — minimize | [docs/components/carousel.mdx:105](../../docs/components/carousel.mdx#L105) |
| components/carousel | Bullets inside | blockquote | var(--tp-space-3) | layout/geometry — minimize | [docs/components/carousel.mdx:109](../../docs/components/carousel.mdx#L109) |
| components/carousel | Autoplay | div | var(--tp-space-1) | layout/geometry — minimize | [docs/components/carousel.mdx:130](../../docs/components/carousel.mdx#L130) |
| components/carousel | Autoplay | div | var(--tp-space-1) | layout/geometry — minimize | [docs/components/carousel.mdx:134](../../docs/components/carousel.mdx#L134) |
| components/carousel | Autoplay | div | var(--tp-space-1) | layout/geometry — minimize | [docs/components/carousel.mdx:138](../../docs/components/carousel.mdx#L138) |
| components/carousel | Virtual archive with controlled selection | div | var(--tp-space-3) | layout/geometry — minimize | [docs/components/carousel.mdx:591](../../docs/components/carousel.mdx#L591) |
| components/code-block | Title slot | span | var(--tp-space-2) | layout/geometry — minimize | [docs/components/code-block.mdx:35](../../docs/components/code-block.mdx#L35) |
| components/collapsible | Line-by-line reveal | ul | var(--tp-space-2) | layout/geometry — minimize | [docs/components/collapsible.mdx:155](../../docs/components/collapsible.mdx#L155) |
| components/cursor | Cursor | div | var(--tp-space-4) | layout/geometry — minimize | [docs/components/cursor.mdx:11](../../docs/components/cursor.mdx#L11) |
| components/cursor | Cursor | div | var(--tp-space-4) | layout/geometry — minimize | [docs/components/cursor.mdx:15](../../docs/components/cursor.mdx#L15) |
| components/cursor | Cursor | figure | var(--tp-space-2) | layout/geometry — minimize | [docs/components/cursor.mdx:16](../../docs/components/cursor.mdx#L16) |
| components/cursor | Cursor | figure | var(--tp-space-2) | layout/geometry — minimize | [docs/components/cursor.mdx:20](../../docs/components/cursor.mdx#L20) |
| components/cursor | Cursor | figure | var(--tp-space-2) | layout/geometry — minimize | [docs/components/cursor.mdx:24](../../docs/components/cursor.mdx#L24) |
| components/cursor | Spring | div | var(--tp-space-4) | layout/geometry — minimize | [docs/components/cursor.mdx:46](../../docs/components/cursor.mdx#L46) |
| components/cursor | Zones | div | var(--tp-space-4) | layout/geometry — minimize | [docs/components/cursor.mdx:69](../../docs/components/cursor.mdx#L69) |
| components/cursor | Dot and ring | div | var(--tp-space-4) | layout/geometry — minimize | [docs/components/cursor.mdx:134](../../docs/components/cursor.mdx#L134) |
| components/cursor | Native passthrough | div | var(--tp-space-4) | layout/geometry — minimize | [docs/components/cursor.mdx:154](../../docs/components/cursor.mdx#L154) |
| components/description-list | Record details | span | var(--tp-space-1) | layout/geometry — minimize | [docs/components/description-list.mdx:39](../../docs/components/description-list.mdx#L39) |
| components/dialog | Non-modal | dl | var(--tp-space-2) var(--tp-space-6) | layout/geometry — minimize | [docs/components/dialog.mdx:55](../../docs/components/dialog.mdx#L55) |
| components/dialog | Container modality | section | var(--tp-space-3) | layout/geometry — minimize | [docs/components/dialog.mdx:82](../../docs/components/dialog.mdx#L82) |
| components/drag-drop-list | Variants and sizes | div | var(--tp-space-6) | layout/geometry — minimize | [docs/components/drag-drop-list.mdx:68](../../docs/components/drag-drop-list.mdx#L68) |
| components/drag-drop-list | Board lanes | div | var(--tp-space-4) | layout/geometry — minimize | [docs/components/drag-drop-list.mdx:187](../../docs/components/drag-drop-list.mdx#L187) |
| components/drag-drop-list | Controlled lanes | div | var(--tp-space-4) | layout/geometry — minimize | [docs/components/drag-drop-list.mdx:243](../../docs/components/drag-drop-list.mdx#L243) |
| components/drag-drop-list | Approve before committing | div | var(--tp-space-4) | layout/geometry — minimize | [docs/components/drag-drop-list.mdx:307](../../docs/components/drag-drop-list.mdx#L307) |
| components/empty-state | Media treatments | div | var(--tp-space-6) | layout/geometry — minimize | [docs/components/empty-state.mdx:45](../../docs/components/empty-state.mdx#L45) |
| components/empty-state | Bordered and filled | div | var(--tp-space-6) | layout/geometry — minimize | [docs/components/empty-state.mdx:108](../../docs/components/empty-state.mdx#L108) |
| components/icon | Decorative and labelled | span | var(--tp-space-2) | layout/geometry — minimize | [docs/components/icon.mdx:51](../../docs/components/icon.mdx#L51) |
| components/image | Ratio and fit | div | var(--tp-space-3) | layout/geometry — minimize | [docs/components/image.mdx:36](../../docs/components/image.mdx#L36) |
| components/image | Fallbacks | div | var(--tp-space-3) | layout/geometry — minimize | [docs/components/image.mdx:57](../../docs/components/image.mdx#L57) |
| components/image | Loading placeholders | div | var(--tp-space-3) | layout/geometry — minimize | [docs/components/image.mdx:71](../../docs/components/image.mdx#L71) |
| components/image | Hover zoom | div | var(--tp-space-3) | layout/geometry — minimize | [docs/components/image.mdx:89](../../docs/components/image.mdx#L89) |
| components/image | Staggered group | tp-image-group | var(--tp-space-3) | layout/geometry — minimize | [docs/components/image.mdx:124](../../docs/components/image.mdx#L124) |
| components/image | Reveal timing and repeat | div | var(--tp-space-3) | layout/geometry — minimize | [docs/components/image.mdx:138](../../docs/components/image.mdx#L138) |
| components/image | Reveal timing and repeat | div | var(--tp-space-3) | layout/geometry — minimize | [docs/components/image.mdx:144](../../docs/components/image.mdx#L144) |
| components/image | Headline, group and caption | tp-image-group | var(--tp-space-3) | layout/geometry — minimize | [docs/components/image.mdx:163](../../docs/components/image.mdx#L163) |
| components/image | Parallax in a scroller | div | var(--tp-space-4) | layout/geometry — minimize | [docs/components/image.mdx:186](../../docs/components/image.mdx#L186) |
| components/image | Scroll zoom in a vertical scroller | div | var(--tp-space-4) | layout/geometry — minimize | [docs/components/image.mdx:198](../../docs/components/image.mdx#L198) |
| components/image | Horizontal strip | div | var(--tp-space-4) | layout/geometry — minimize | [docs/components/image.mdx:259](../../docs/components/image.mdx#L259) |
| components/image | Smoothing | div | var(--tp-space-4) | layout/geometry — minimize | [docs/components/image.mdx:272](../../docs/components/image.mdx#L272) |
| components/label | By id and by nesting | tp-label | var(--tp-space-3) | layout/geometry — minimize | [docs/components/label.mdx:34](../../docs/components/label.mdx#L34) |
| components/list | Recordings | span | inherit | layout/geometry — minimize | [docs/components/list.mdx:253](../../docs/components/list.mdx#L253) |
| components/list | People and invitations | span | inherit | layout/geometry — minimize | [docs/components/list.mdx:347](../../docs/components/list.mdx#L347) |
| components/markdown | With a table of contents | div | var(--tp-space-8) | layout/geometry — minimize | [docs/components/markdown.mdx:240](../../docs/components/markdown.mdx#L240) |
| components/message-scroller | Outline and edges | div | var(--tp-space-4) | layout/geometry — minimize | [docs/components/message-scroller.mdx:316](../../docs/components/message-scroller.mdx#L316) |
| components/navigation-menu | Navigation menu | div | var(--tp-space-1) | layout/geometry — minimize | [docs/components/navigation-menu.mdx:15](../../docs/components/navigation-menu.mdx#L15) |
| components/popover | Popover | div | var(--tp-space-3) | layout/geometry — minimize | [docs/components/popover.mdx:13](../../docs/components/popover.mdx#L13) |
| components/popover | Separate anchor | tp-popover | var(--tp-space-3) | layout/geometry — minimize | [docs/components/popover.mdx:115](../../docs/components/popover.mdx#L115) |
| components/preview-card | Preview Card | div | var(--tp-space-3) | layout/geometry — minimize | [docs/components/preview-card.mdx:13](../../docs/components/preview-card.mdx#L13) |
| components/resizable-panel-group | Resizable Panel Group | div | var(--tp-space-2) | layout/geometry — minimize | [docs/components/resizable-panel-group.mdx:13](../../docs/components/resizable-panel-group.mdx#L13) |
| components/resizable-panel-group | Resizable Panel Group | div | var(--tp-space-2) | layout/geometry — minimize | [docs/components/resizable-panel-group.mdx:24](../../docs/components/resizable-panel-group.mdx#L24) |
| components/scroll-trigger | Scroll Trigger | div | var(--tp-space-3) | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:16](../../docs/components/scroll-trigger.mdx#L16) |
| components/scroll-trigger | From the center | tp-scroll-trigger | var(--tp-space-4) | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:44](../../docs/components/scroll-trigger.mdx#L44) |
| components/scroll-trigger | Scrubbed band | div | var(--tp-space-3) | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:108](../../docs/components/scroll-trigger.mdx#L108) |
| components/scroll-trigger | Custom scroll range | div | var(--tp-space-3) | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:160](../../docs/components/scroll-trigger.mdx#L160) |
| components/scroll-trigger | Custom scroll range | div | var(--tp-space-3) | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:183](../../docs/components/scroll-trigger.mdx#L183) |
| components/scroll-trigger | Pinned scene | div | var(--tp-space-3) | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:206](../../docs/components/scroll-trigger.mdx#L206) |
| components/scroll-trigger | Pinned scene | div | var(--tp-space-4) | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:213](../../docs/components/scroll-trigger.mdx#L213) |
| components/scroll-trigger | Pinned scene | div | var(--tp-space-3) | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:221](../../docs/components/scroll-trigger.mdx#L221) |
| components/slider | Compact readout | div | var(--tp-space-3) var(--tp-space-4) | layout/geometry — minimize | [docs/components/slider.mdx:202](../../docs/components/slider.mdx#L202) |
| components/table-of-contents | Table of contents | div | var(--tp-space-8) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:12](../../docs/components/table-of-contents.mdx#L12) |
| components/table-of-contents | Nested sections | div | var(--tp-space-8) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:87](../../docs/components/table-of-contents.mdx#L87) |
| components/table-of-contents | Collected targets | div | var(--tp-space-8) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:174](../../docs/components/table-of-contents.mdx#L174) |
| components/table-of-contents | Compact | div | var(--tp-space-6) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:238](../../docs/components/table-of-contents.mdx#L238) |
| components/text-transform | Text transform | dl | var(--tp-space-3) var(--tp-space-6) | layout/geometry — minimize | [docs/components/text-transform.mdx:11](../../docs/components/text-transform.mdx#L11) |
| components/text-transform | Case and identifiers | dl | var(--tp-space-2) var(--tp-space-6) | layout/geometry — minimize | [docs/components/text-transform.mdx:35](../../docs/components/text-transform.mdx#L35) |
| components/time | Time | ul | var(--tp-space-3) | layout/geometry — minimize | [docs/components/time.mdx:13](../../docs/components/time.mdx#L13) |
| components/time | Modes | dl | var(--tp-space-2) var(--tp-space-6) | layout/geometry — minimize | [docs/components/time.mdx:55](../../docs/components/time.mdx#L55) |
| components/time | Calendar | dl | var(--tp-space-2) var(--tp-space-6) | layout/geometry — minimize | [docs/components/time.mdx:147](../../docs/components/time.mdx#L147) |
| components/time | Precisions | dl | var(--tp-space-2) var(--tp-space-6) | layout/geometry — minimize | [docs/components/time.mdx:187](../../docs/components/time.mdx#L187) |
| components/time | Timers | dl | var(--tp-space-2) var(--tp-space-6) | layout/geometry — minimize | [docs/components/time.mdx:202](../../docs/components/time.mdx#L202) |
| motion/surface/glow-border | Comets | div | var(--tp-space-6) | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:58](../../docs/motion/surface/glow-border.mdx#L58) |
| motion/surface/glow-border | Sweep, pulse and glint | div | var(--tp-space-6) | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:81](../../docs/motion/surface/glow-border.mdx#L81) |
| motion/surface/glow-border | Custom colors | div | var(--tp-space-6) | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:139](../../docs/motion/surface/glow-border.mdx#L139) |
| motion/surface/glow-border | Lit by an element | div | var(--tp-space-4) | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:164](../../docs/motion/surface/glow-border.mdx#L164) |
| motion/surface/segment-border | Traced in | div | var(--tp-space-4) | layout/geometry — minimize | [docs/motion/surface/segment-border.mdx:121](../../docs/motion/surface/segment-border.mdx#L121) |
| motion/text/text-mirror | Hide and reveal | div | var(--tp-space-5) | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:58](../../docs/motion/text/text-mirror.mdx#L58) |
| motion/text/text-mirror | Scrubbed by the scroll | div | var(--tp-space-3) | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:96](../../docs/motion/text/text-mirror.mdx#L96) |
| motion/text/text-split | Reveal on demand | div | var(--tp-space-5) | layout/geometry — minimize | [docs/motion/text/text-split.mdx:75](../../docs/motion/text/text-split.mdx#L75) |
| motion/text/text-split | Scrubbed by the scroll | div | var(--tp-space-3) | layout/geometry — minimize | [docs/motion/text/text-split.mdx:164](../../docs/motion/text/text-split.mdx#L164) |
| motion/text/text-stroke | Scrubbed by the scroll | div | var(--tp-space-3) | layout/geometry — minimize | [docs/motion/text/text-stroke.mdx:113](../../docs/motion/text/text-stroke.mdx#L113) |
| widgets/easing-editor | Spring and custom points | div | var(--tp-space-8) | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:22](../../docs/widgets/easing-editor.mdx#L22) |
| widgets/easing-editor | Commit and veto | div | var(--tp-space-3) | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:139](../../docs/widgets/easing-editor.mdx#L139) |
| widgets/easing-editor | Controlled owner | div | var(--tp-space-3) | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:163](../../docs/widgets/easing-editor.mdx#L163) |
| components/cursor | Components/Cursor | div | var(--tp-space-4) | layout/geometry — minimize | [src/stories/cursor.stories.ts:92](../../src/stories/cursor.stories.ts#L92) |
| compositions/map.examples | pinSvg | section | var(--tp-space-4) | layout/geometry — minimize | [src/stories/map.examples.ts:110](../../src/stories/map.examples.ts#L110) |
| components/scroll-trigger | (file/setup/shared helper) | div | var(--tp-space-3) | layout/geometry — minimize | [src/stories/scroll-trigger.stories.ts:21](../../src/stories/scroll-trigger.stories.ts#L21) |
| compositions/skeleton.examples | skeletonExamples | div | calc(var(--tp-spacing) * 7) | layout/geometry — minimize | [src/stories/skeleton.examples.ts:91](../../src/stories/skeleton.examples.ts#L91) |
| compositions/table-of-contents.examples | Changelog | div | 2.5rem | layout/geometry — minimize | [src/stories/table-of-contents.examples.ts:141](../../src/stories/table-of-contents.examples.ts#L141) |
| compositions/table-of-contents.examples | Changelog | aside | 0.75rem | layout/geometry — minimize | [src/stories/table-of-contents.examples.ts:148](../../src/stories/table-of-contents.examples.ts#L148) |
| components/table-of-contents | DocumentScroll | div | 3rem | layout/geometry — minimize | [src/stories/table-of-contents.stories.ts:144](../../src/stories/table-of-contents.stories.ts#L144) |

<a id="property-11"></a>

### 11. background — 58 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-muted) | 43 |
| var(--tp-foreground) | 2 |
| currentcolor | 1 |
| linear-gradient(135deg,#a3a3a3,#171717) | 1 |
| linear-gradient(135deg,#d4d4d8,#52525b) | 1 |
| linear-gradient(135deg,#e7e5e4,#a8a29e) | 1 |
| linear-gradient(160deg,#3f3f46,#09090b) | 1 |
| var(--tp-background) | 1 |
| var(--tp-muted)<br>            url(https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80)<br>            center/cover | 1 |
| var(--tp-muted)<br>            url(https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400&q=80)<br>            center/cover | 1 |
| var(--tp-muted) url(https://images.unsplash.com/photo-1497215842964-222b430dc094?w=400&q=80) center/cover | 1 |
| var(--tp-muted) url(https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80) center/cover | 1 |
| var(--tp-muted) url(https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400&q=80) center/cover | 1 |
| var(--tp-muted) url(https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&q=80) center/cover | 1 |
| white | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/aspect-ratio | Aspect ratio | tp-aspect-ratio | var(--tp-muted) | component presentation override — review required | [docs/components/aspect-ratio.mdx:10](../../docs/components/aspect-ratio.mdx#L10) |
| components/aspect-ratio | Common ratios | div | var(--tp-muted) | content appearance — review required | [docs/components/aspect-ratio.mdx:28](../../docs/components/aspect-ratio.mdx#L28) |
| components/aspect-ratio | Common ratios | div | var(--tp-muted) | content appearance — review required | [docs/components/aspect-ratio.mdx:31](../../docs/components/aspect-ratio.mdx#L31) |
| components/aspect-ratio | Common ratios | div | var(--tp-muted) | content appearance — review required | [docs/components/aspect-ratio.mdx:34](../../docs/components/aspect-ratio.mdx#L34) |
| components/aspect-ratio | One ratio, three widths | tp-aspect-ratio | var(--tp-muted) | component presentation override — review required | [docs/components/aspect-ratio.mdx:51](../../docs/components/aspect-ratio.mdx#L51) |
| components/aspect-ratio | One ratio, three widths | tp-aspect-ratio | var(--tp-muted) | component presentation override — review required | [docs/components/aspect-ratio.mdx:73](../../docs/components/aspect-ratio.mdx#L73) |
| components/aspect-ratio | One ratio, three widths | tp-aspect-ratio | var(--tp-muted) | component presentation override — review required | [docs/components/aspect-ratio.mdx:95](../../docs/components/aspect-ratio.mdx#L95) |
| components/aspect-ratio | Cover and contain | tp-aspect-ratio | var(--tp-muted) | component presentation override — review required | [docs/components/aspect-ratio.mdx:125](../../docs/components/aspect-ratio.mdx#L125) |
| components/aspect-ratio | Cover and contain | tp-aspect-ratio | var(--tp-muted) | component presentation override — review required | [docs/components/aspect-ratio.mdx:128](../../docs/components/aspect-ratio.mdx#L128) |
| components/attachment | Image cards | div | var(--tp-muted) url(https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80) center/cover | content appearance — review required | [docs/components/attachment.mdx:89](../../docs/components/attachment.mdx#L89) |
| components/attachment | Image cards | div | var(--tp-muted) url(https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400&q=80) center/cover | content appearance — review required | [docs/components/attachment.mdx:92](../../docs/components/attachment.mdx#L92) |
| components/attachment | Image cards | div | var(--tp-muted) url(https://images.unsplash.com/photo-1497215842964-222b430dc094?w=400&q=80) center/cover | content appearance — review required | [docs/components/attachment.mdx:95](../../docs/components/attachment.mdx#L95) |
| components/attachment | Image cards | div | var(--tp-muted) url(https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&q=80) center/cover | content appearance — review required | [docs/components/attachment.mdx:98](../../docs/components/attachment.mdx#L98) |
| components/attachment | Scrollable groups | div | var(--tp-muted)<br>            url(https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80)<br>            center/cover | content appearance — review required | [docs/components/attachment.mdx:192](../../docs/components/attachment.mdx#L192) |
| components/attachment | Scrollable groups | div | var(--tp-muted)<br>            url(https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400&q=80)<br>            center/cover | content appearance — review required | [docs/components/attachment.mdx:256](../../docs/components/attachment.mdx#L256) |
| components/carousel | Carousel | tp-stack | var(--tp-muted) | component presentation override — review required | [docs/components/carousel.mdx:13](../../docs/components/carousel.mdx#L13) |
| components/carousel | Carousel | tp-stack | var(--tp-muted) | component presentation override — review required | [docs/components/carousel.mdx:26](../../docs/components/carousel.mdx#L26) |
| components/carousel | Carousel | tp-stack | var(--tp-muted) | component presentation override — review required | [docs/components/carousel.mdx:39](../../docs/components/carousel.mdx#L39) |
| components/carousel | Carousel | tp-stack | var(--tp-muted) | component presentation override — review required | [docs/components/carousel.mdx:51](../../docs/components/carousel.mdx#L51) |
| components/carousel | Bullets inside | blockquote | var(--tp-muted) | content appearance — review required | [docs/components/carousel.mdx:101](../../docs/components/carousel.mdx#L101) |
| components/carousel | Bullets inside | blockquote | var(--tp-muted) | content appearance — review required | [docs/components/carousel.mdx:105](../../docs/components/carousel.mdx#L105) |
| components/carousel | Bullets inside | blockquote | var(--tp-muted) | content appearance — review required | [docs/components/carousel.mdx:109](../../docs/components/carousel.mdx#L109) |
| components/carousel | Autoplay | div | var(--tp-muted) | content appearance — review required | [docs/components/carousel.mdx:130](../../docs/components/carousel.mdx#L130) |
| components/carousel | Autoplay | div | var(--tp-muted) | content appearance — review required | [docs/components/carousel.mdx:134](../../docs/components/carousel.mdx#L134) |
| components/carousel | Autoplay | div | var(--tp-muted) | content appearance — review required | [docs/components/carousel.mdx:138](../../docs/components/carousel.mdx#L138) |
| components/carousel | Crossfade | tp-stack | var(--tp-muted) | component presentation override — review required | [docs/components/carousel.mdx:184](../../docs/components/carousel.mdx#L184) |
| components/carousel | Crossfade | tp-stack | var(--tp-foreground) | component presentation override — review required | [docs/components/carousel.mdx:198](../../docs/components/carousel.mdx#L198) |
| components/carousel | Crossfade | tp-stack | var(--tp-muted) | component presentation override — review required | [docs/components/carousel.mdx:213](../../docs/components/carousel.mdx#L213) |
| components/carousel | Layered 3D | figure | var(--tp-muted) | content appearance — review required | [docs/components/carousel.mdx:243](../../docs/components/carousel.mdx#L243) |
| components/carousel | Layered 3D | figure | var(--tp-muted) | content appearance — review required | [docs/components/carousel.mdx:279](../../docs/components/carousel.mdx#L279) |
| components/carousel | Layered 3D | figure | var(--tp-muted) | content appearance — review required | [docs/components/carousel.mdx:315](../../docs/components/carousel.mdx#L315) |
| components/carousel | Parallax | figure | var(--tp-muted) | content appearance — review required | [docs/components/carousel.mdx:365](../../docs/components/carousel.mdx#L365) |
| components/carousel | Parallax | figure | var(--tp-muted) | content appearance — review required | [docs/components/carousel.mdx:368](../../docs/components/carousel.mdx#L368) |
| components/carousel | Parallax | figure | var(--tp-muted) | content appearance — review required | [docs/components/carousel.mdx:371](../../docs/components/carousel.mdx#L371) |
| components/carousel | Parallax | figure | var(--tp-muted) | content appearance — review required | [docs/components/carousel.mdx:374](../../docs/components/carousel.mdx#L374) |
| components/carousel | Focus | figure | var(--tp-muted) | content appearance — review required | [docs/components/carousel.mdx:396](../../docs/components/carousel.mdx#L396) |
| components/carousel | Focus | figure | var(--tp-muted) | content appearance — review required | [docs/components/carousel.mdx:400](../../docs/components/carousel.mdx#L400) |
| components/carousel | Focus | figure | var(--tp-muted) | content appearance — review required | [docs/components/carousel.mdx:404](../../docs/components/carousel.mdx#L404) |
| components/carousel | Focus | figure | var(--tp-muted) | content appearance — review required | [docs/components/carousel.mdx:408](../../docs/components/carousel.mdx#L408) |
| components/carousel | Focus | figure | var(--tp-muted) | content appearance — review required | [docs/components/carousel.mdx:412](../../docs/components/carousel.mdx#L412) |
| components/carousel | Shader transition | figure | var(--tp-muted) | content appearance — review required | [docs/components/carousel.mdx:458](../../docs/components/carousel.mdx#L458) |
| components/carousel | Shader transition | figure | var(--tp-muted) | content appearance — review required | [docs/components/carousel.mdx:494](../../docs/components/carousel.mdx#L494) |
| components/carousel | Shader transition | figure | var(--tp-muted) | content appearance — review required | [docs/components/carousel.mdx:530](../../docs/components/carousel.mdx#L530) |
| components/carousel | Commit | div | var(--tp-muted) | content appearance — review required | [docs/components/carousel.mdx:632](../../docs/components/carousel.mdx#L632) |
| components/carousel | Commit | div | var(--tp-muted) | content appearance — review required | [docs/components/carousel.mdx:642](../../docs/components/carousel.mdx#L642) |
| components/carousel | Commit | div | var(--tp-muted) | content appearance — review required | [docs/components/carousel.mdx:652](../../docs/components/carousel.mdx#L652) |
| components/cursor | Cursor | span | var(--tp-foreground) | content appearance — review required | [docs/components/cursor.mdx:14](../../docs/components/cursor.mdx#L14) |
| components/cursor | Cursor | div | linear-gradient(135deg,#e7e5e4,#a8a29e) | content appearance — review required | [docs/components/cursor.mdx:17](../../docs/components/cursor.mdx#L17) |
| components/cursor | Cursor | div | linear-gradient(135deg,#d4d4d8,#52525b) | content appearance — review required | [docs/components/cursor.mdx:21](../../docs/components/cursor.mdx#L21) |
| components/cursor | Cursor | div | linear-gradient(135deg,#a3a3a3,#171717) | content appearance — review required | [docs/components/cursor.mdx:25](../../docs/components/cursor.mdx#L25) |
| components/cursor | Zones | span | white | content appearance — review required | [docs/components/cursor.mdx:72](../../docs/components/cursor.mdx#L72) |
| components/cursor | Zones | div | linear-gradient(160deg,#3f3f46,#09090b) | content appearance — review required | [docs/components/cursor.mdx:73](../../docs/components/cursor.mdx#L73) |
| components/cursor | Zones | div | var(--tp-muted) | content appearance — review required | [docs/components/cursor.mdx:80](../../docs/components/cursor.mdx#L80) |
| components/cursor | Dot and ring | span | currentcolor | content appearance — review required | [docs/components/cursor.mdx:136](../../docs/components/cursor.mdx#L136) |
| components/image | Ratio and fit | tp-image | var(--tp-muted) | component presentation override — review required | [docs/components/image.mdx:39](../../docs/components/image.mdx#L39) |
| components/image | Fallbacks | span | var(--tp-muted) | content appearance — review required | [docs/components/image.mdx:60](../../docs/components/image.mdx#L60) |
| compositions/map.examples | Token theme | div | var(--tp-background) | content appearance — review required | [src/stories/map.examples.ts:246](../../src/stories/map.examples.ts#L246) |
| compositions/presentation-primitives.examples | aspectRatioDefaults | div | var(--tp-muted) | content appearance — review required | [src/stories/presentation-primitives.examples.ts:58](../../src/stories/presentation-primitives.examples.ts#L58) |

<a id="property-12"></a>

### 12. border — 58 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-border-width) solid var(--tp-border) | 34 |
| 1px solid var(--tp-border) | 11 |
| var(--tp-border-width) dashed var(--tp-border) | 9 |
| 0 | 2 |
| 1px dashed var(--tp-border) | 2 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/checkbox | Select all | fieldset | 0 | content appearance — review required | [docs/components/checkbox.mdx:68](../../docs/components/checkbox.mdx#L68) |
| components/checkbox | CheckboxGroupController | fieldset | 0 | content appearance — review required | [docs/components/checkbox.mdx:117](../../docs/components/checkbox.mdx#L117) |
| components/cursor | Cursor | div | var(--tp-border-width) dashed var(--tp-border) | content appearance — review required | [docs/components/cursor.mdx:11](../../docs/components/cursor.mdx#L11) |
| components/cursor | Spring | div | var(--tp-border-width) dashed var(--tp-border) | content appearance — review required | [docs/components/cursor.mdx:47](../../docs/components/cursor.mdx#L47) |
| components/cursor | Spring | div | var(--tp-border-width) dashed var(--tp-border) | content appearance — review required | [docs/components/cursor.mdx:51](../../docs/components/cursor.mdx#L51) |
| components/cursor | Zones | div | var(--tp-border-width) dashed var(--tp-border) | content appearance — review required | [docs/components/cursor.mdx:69](../../docs/components/cursor.mdx#L69) |
| components/cursor | Sticking | tp-stack | var(--tp-border-width) dashed var(--tp-border) | component presentation override — review required | [docs/components/cursor.mdx:98](../../docs/components/cursor.mdx#L98) |
| components/cursor | Dot and ring | div | var(--tp-border-width) dashed var(--tp-border) | content appearance — review required | [docs/components/cursor.mdx:134](../../docs/components/cursor.mdx#L134) |
| components/cursor | Native passthrough | div | var(--tp-border-width) dashed var(--tp-border) | content appearance — review required | [docs/components/cursor.mdx:154](../../docs/components/cursor.mdx#L154) |
| components/cursor | Programmatic state | tp-stack | var(--tp-border-width) dashed var(--tp-border) | component presentation override — review required | [docs/components/cursor.mdx:174](../../docs/components/cursor.mdx#L174) |
| components/cursor | Reduced motion | div | var(--tp-border-width) dashed var(--tp-border) | content appearance — review required | [docs/components/cursor.mdx:208](../../docs/components/cursor.mdx#L208) |
| components/dialog | Container modality | section | var(--tp-border-width) solid var(--tp-border) | content appearance — review required | [docs/components/dialog.mdx:82](../../docs/components/dialog.mdx#L82) |
| components/image | Reveal timing and repeat | div | 1px solid var(--tp-border) | content appearance — review required | [docs/components/image.mdx:137](../../docs/components/image.mdx#L137) |
| components/image | Parallax in a scroller | div | 1px solid var(--tp-border) | content appearance — review required | [docs/components/image.mdx:186](../../docs/components/image.mdx#L186) |
| components/image | Scroll zoom in a vertical scroller | div | 1px solid var(--tp-border) | content appearance — review required | [docs/components/image.mdx:198](../../docs/components/image.mdx#L198) |
| components/image | Horizontal strip | div | 1px solid var(--tp-border) | content appearance — review required | [docs/components/image.mdx:259](../../docs/components/image.mdx#L259) |
| components/image | Smoothing | div | 1px solid var(--tp-border) | content appearance — review required | [docs/components/image.mdx:272](../../docs/components/image.mdx#L272) |
| components/menu | Context invocation | div | 1px dashed var(--tp-border) | content appearance — review required | [docs/components/menu.mdx:147](../../docs/components/menu.mdx#L147) |
| components/message-scroller | Message Scroller | tp-message-scroller | var(--tp-border-width) solid var(--tp-border) | component presentation override — review required | [docs/components/message-scroller.mdx:11](../../docs/components/message-scroller.mdx#L11) |
| components/message-scroller | Streaming | tp-message-scroller | var(--tp-border-width) solid var(--tp-border) | component presentation override — review required | [docs/components/message-scroller.mdx:75](../../docs/components/message-scroller.mdx#L75) |
| components/message-scroller | Join marker as anchor | tp-message-scroller | var(--tp-border-width) solid var(--tp-border) | component presentation override — review required | [docs/components/message-scroller.mdx:172](../../docs/components/message-scroller.mdx#L172) |
| components/message-scroller | Commands | tp-message-scroller | var(--tp-border-width) solid var(--tp-border) | component presentation override — review required | [docs/components/message-scroller.mdx:252](../../docs/components/message-scroller.mdx#L252) |
| components/message-scroller | Outline and edges | tp-message-scroller | var(--tp-border-width) solid var(--tp-border) | component presentation override — review required | [docs/components/message-scroller.mdx:330](../../docs/components/message-scroller.mdx#L330) |
| components/message-scroller | Prepend history | tp-message-scroller | var(--tp-border-width) solid var(--tp-border) | component presentation override — review required | [docs/components/message-scroller.mdx:434](../../docs/components/message-scroller.mdx#L434) |
| components/message-scroller | Animated send | tp-message-scroller | var(--tp-border-width) solid var(--tp-border) | component presentation override — review required | [docs/components/message-scroller.mdx:506](../../docs/components/message-scroller.mdx#L506) |
| components/message-scroller | Open at the start | tp-message-scroller | var(--tp-border-width) solid var(--tp-border) | component presentation override — review required | [docs/components/message-scroller.mdx:560](../../docs/components/message-scroller.mdx#L560) |
| components/navigation-panel | Navigation panel | div | 1px solid var(--tp-border) | content appearance — review required | [docs/components/navigation-panel.mdx:11](../../docs/components/navigation-panel.mdx#L11) |
| components/navigation-panel | Off-canvas | div | 1px solid var(--tp-border) | content appearance — review required | [docs/components/navigation-panel.mdx:102](../../docs/components/navigation-panel.mdx#L102) |
| components/navigation-panel | Collapsible groups | div | 1px solid var(--tp-border) | content appearance — review required | [docs/components/navigation-panel.mdx:133](../../docs/components/navigation-panel.mdx#L133) |
| components/navigation-panel | Drawer mode | div | 1px solid var(--tp-border) | content appearance — review required | [docs/components/navigation-panel.mdx:187](../../docs/components/navigation-panel.mdx#L187) |
| components/navigation-panel | Floating | div | 1px solid var(--tp-border) | content appearance — review required | [docs/components/navigation-panel.mdx:217](../../docs/components/navigation-panel.mdx#L217) |
| components/navigation-panel | Team switcher and row actions | div | 1px solid var(--tp-border) | content appearance — review required | [docs/components/navigation-panel.mdx:250](../../docs/components/navigation-panel.mdx#L250) |
| components/popover | Separate anchor | tp-stack | var(--tp-border-width) solid var(--tp-border) | component presentation override — review required | [docs/components/popover.mdx:120](../../docs/components/popover.mdx#L120) |
| components/resizable-panel-group | Resizable Panel Group | tp-resizable-panel-group | var(--tp-border-width) solid var(--tp-border) | component presentation override — review required | [docs/components/resizable-panel-group.mdx:11](../../docs/components/resizable-panel-group.mdx#L11) |
| components/resizable-panel-group | Bounds | tp-resizable-panel-group | var(--tp-border-width) solid var(--tp-border) | component presentation override — review required | [docs/components/resizable-panel-group.mdx:56](../../docs/components/resizable-panel-group.mdx#L56) |
| components/resizable-panel-group | Vertical | tp-resizable-panel-group | var(--tp-border-width) solid var(--tp-border) | component presentation override — review required | [docs/components/resizable-panel-group.mdx:74](../../docs/components/resizable-panel-group.mdx#L74) |
| components/resizable-panel-group | Collapsible sidebar | tp-resizable-panel-group | var(--tp-border-width) solid var(--tp-border) | component presentation override — review required | [docs/components/resizable-panel-group.mdx:97](../../docs/components/resizable-panel-group.mdx#L97) |
| components/resizable-panel-group | Layout events | tp-resizable-panel-group | var(--tp-border-width) solid var(--tp-border) | component presentation override — review required | [docs/components/resizable-panel-group.mdx:133](../../docs/components/resizable-panel-group.mdx#L133) |
| components/resizable-panel-group | Layout presets | tp-resizable-panel-group | var(--tp-border-width) solid var(--tp-border) | component presentation override — review required | [docs/components/resizable-panel-group.mdx:181](../../docs/components/resizable-panel-group.mdx#L181) |
| components/resizable-panel-group | Persisted sizes | tp-resizable-panel-group | var(--tp-border-width) solid var(--tp-border) | component presentation override — review required | [docs/components/resizable-panel-group.mdx:224](../../docs/components/resizable-panel-group.mdx#L224) |
| components/resizable-panel-group | Disabled | tp-resizable-panel-group | var(--tp-border-width) solid var(--tp-border) | component presentation override — review required | [docs/components/resizable-panel-group.mdx:270](../../docs/components/resizable-panel-group.mdx#L270) |
| components/scroll-area | Scroll Area | tp-scroll-area | var(--tp-border-width) solid var(--tp-border) | component presentation override — review required | [docs/components/scroll-area.mdx:9](../../docs/components/scroll-area.mdx#L9) |
| components/scroll-area | Horizontal | tp-scroll-area | var(--tp-border-width) solid var(--tp-border) | component presentation override — review required | [docs/components/scroll-area.mdx:53](../../docs/components/scroll-area.mdx#L53) |
| components/scroll-area | Both axes | tp-scroll-area | var(--tp-border-width) solid var(--tp-border) | component presentation override — review required | [docs/components/scroll-area.mdx:86](../../docs/components/scroll-area.mdx#L86) |
| components/scroll-area | Visibility | tp-scroll-area | var(--tp-border-width) solid var(--tp-border) | component presentation override — review required | [docs/components/scroll-area.mdx:120](../../docs/components/scroll-area.mdx#L120) |
| components/scroll-area | Visibility | tp-scroll-area | var(--tp-border-width) solid var(--tp-border) | component presentation override — review required | [docs/components/scroll-area.mdx:139](../../docs/components/scroll-area.mdx#L139) |
| components/scroll-trigger | Replay on entry | div | var(--tp-border-width) solid var(--tp-border) | content appearance — review required | [docs/components/scroll-trigger.mdx:60](../../docs/components/scroll-trigger.mdx#L60) |
| components/scroll-trigger | Scrubbed band | div | var(--tp-border-width) solid var(--tp-border) | content appearance — review required | [docs/components/scroll-trigger.mdx:78](../../docs/components/scroll-trigger.mdx#L78) |
| components/scroll-trigger | Custom scroll range | div | var(--tp-border-width) solid var(--tp-border) | content appearance — review required | [docs/components/scroll-trigger.mdx:131](../../docs/components/scroll-trigger.mdx#L131) |
| components/scroll-trigger | Pinned scene | div | var(--tp-border-width) solid var(--tp-border) | content appearance — review required | [docs/components/scroll-trigger.mdx:205](../../docs/components/scroll-trigger.mdx#L205) |
| components/text-transform | Truncation | tp-resizable-panel-group | var(--tp-border-width) solid var(--tp-border) | component presentation override — review required | [docs/components/text-transform.mdx:128](../../docs/components/text-transform.mdx#L128) |
| components/tooltip | Cursor tracking | div | 1px dashed var(--tp-border) | content appearance — review required | [docs/components/tooltip.mdx:69](../../docs/components/tooltip.mdx#L69) |
| motion/text/text-mirror | Scrubbed by the scroll | div | var(--tp-border-width) solid var(--tp-border) | content appearance — review required | [docs/motion/text/text-mirror.mdx:74](../../docs/motion/text/text-mirror.mdx#L74) |
| motion/text/text-split | Scrubbed by the scroll | div | var(--tp-border-width) solid var(--tp-border) | content appearance — review required | [docs/motion/text/text-split.mdx:142](../../docs/motion/text/text-split.mdx#L142) |
| motion/text/text-stroke | Scrubbed by the scroll | div | var(--tp-border-width) solid var(--tp-border) | content appearance — review required | [docs/motion/text/text-stroke.mdx:82](../../docs/motion/text/text-stroke.mdx#L82) |
| components/resizable-panel-group | NestedWorkspace | tp-resizable-panel-group | var(--tp-border-width) solid var(--tp-border) | component presentation override — review required | [src/stories/resizable-panel-group.stories.ts:59](../../src/stories/resizable-panel-group.stories.ts#L59) |
| components/resizable-panel-group | Controlled | readonly | var(--tp-border-width) solid var(--tp-border) | content appearance — review required | [src/stories/resizable-panel-group.stories.ts:84](../../src/stories/resizable-panel-group.stories.ts#L84) |
| components/resizable-panel-group | CollapsibleSidebar | tp-resizable-panel-group | var(--tp-border-width) solid var(--tp-border) | component presentation override — review required | [src/stories/resizable-panel-group.stories.ts:108](../../src/stories/resizable-panel-group.stories.ts#L108) |

<a id="property-13"></a>

### 13. margin-block — 57 occurrences

| Value | Occurrences |
| --- | ---: |
| 0 var(--tp-space-4) | 21 |
| 0 var(--tp-space-3) | 16 |
| var(--tp-space-2) | 12 |
| var(--tp-space-2) 0 | 5 |
| 0 0.75rem | 2 |
| var(--tp-space-3) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/bubble | Expandable message | p | var(--tp-space-2) 0 | layout/geometry — minimize | [docs/components/bubble.mdx:129](../../docs/components/bubble.mdx#L129) |
| components/markdown | Custom node rendering | tp-stack | var(--tp-space-3) | layout/geometry — minimize | [docs/components/markdown.mdx:210](../../docs/components/markdown.mdx#L210) |
| components/scroll-area | Scroll Area | tp-separator | var(--tp-space-2) | layout/geometry — minimize | [docs/components/scroll-area.mdx:13](../../docs/components/scroll-area.mdx#L13) |
| components/scroll-area | Scroll Area | tp-separator | var(--tp-space-2) | layout/geometry — minimize | [docs/components/scroll-area.mdx:15](../../docs/components/scroll-area.mdx#L15) |
| components/scroll-area | Scroll Area | tp-separator | var(--tp-space-2) | layout/geometry — minimize | [docs/components/scroll-area.mdx:17](../../docs/components/scroll-area.mdx#L17) |
| components/scroll-area | Scroll Area | tp-separator | var(--tp-space-2) | layout/geometry — minimize | [docs/components/scroll-area.mdx:19](../../docs/components/scroll-area.mdx#L19) |
| components/scroll-area | Scroll Area | tp-separator | var(--tp-space-2) | layout/geometry — minimize | [docs/components/scroll-area.mdx:21](../../docs/components/scroll-area.mdx#L21) |
| components/scroll-area | Scroll Area | tp-separator | var(--tp-space-2) | layout/geometry — minimize | [docs/components/scroll-area.mdx:23](../../docs/components/scroll-area.mdx#L23) |
| components/scroll-area | Scroll Area | tp-separator | var(--tp-space-2) | layout/geometry — minimize | [docs/components/scroll-area.mdx:25](../../docs/components/scroll-area.mdx#L25) |
| components/scroll-area | Scroll Area | tp-separator | var(--tp-space-2) | layout/geometry — minimize | [docs/components/scroll-area.mdx:27](../../docs/components/scroll-area.mdx#L27) |
| components/scroll-area | Scroll Area | tp-separator | var(--tp-space-2) | layout/geometry — minimize | [docs/components/scroll-area.mdx:29](../../docs/components/scroll-area.mdx#L29) |
| components/scroll-area | Scroll Area | tp-separator | var(--tp-space-2) | layout/geometry — minimize | [docs/components/scroll-area.mdx:31](../../docs/components/scroll-area.mdx#L31) |
| components/scroll-area | Scroll Area | tp-separator | var(--tp-space-2) | layout/geometry — minimize | [docs/components/scroll-area.mdx:33](../../docs/components/scroll-area.mdx#L33) |
| components/table-of-contents | Table of contents | h3 | 0 var(--tp-space-3) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:14](../../docs/components/table-of-contents.mdx#L14) |
| components/table-of-contents | Table of contents | p | 0 var(--tp-space-4) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:15](../../docs/components/table-of-contents.mdx#L15) |
| components/table-of-contents | Table of contents | p | 0 var(--tp-space-4) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:16](../../docs/components/table-of-contents.mdx#L16) |
| components/table-of-contents | Table of contents | h3 | 0 var(--tp-space-3) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:17](../../docs/components/table-of-contents.mdx#L17) |
| components/table-of-contents | Table of contents | p | 0 var(--tp-space-4) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:18](../../docs/components/table-of-contents.mdx#L18) |
| components/table-of-contents | Table of contents | p | 0 var(--tp-space-4) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:19](../../docs/components/table-of-contents.mdx#L19) |
| components/table-of-contents | Table of contents | h3 | 0 var(--tp-space-3) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:20](../../docs/components/table-of-contents.mdx#L20) |
| components/table-of-contents | Table of contents | p | 0 var(--tp-space-4) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:21](../../docs/components/table-of-contents.mdx#L21) |
| components/table-of-contents | Table of contents | p | 0 var(--tp-space-4) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:22](../../docs/components/table-of-contents.mdx#L22) |
| components/table-of-contents | Table of contents | h3 | 0 var(--tp-space-3) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:23](../../docs/components/table-of-contents.mdx#L23) |
| components/table-of-contents | Table of contents | p | 0 var(--tp-space-4) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:24](../../docs/components/table-of-contents.mdx#L24) |
| components/table-of-contents | Table of contents | p | 0 var(--tp-space-4) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:25](../../docs/components/table-of-contents.mdx#L25) |
| components/table-of-contents | Table of contents | h3 | 0 var(--tp-space-3) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:26](../../docs/components/table-of-contents.mdx#L26) |
| components/table-of-contents | Table of contents | p | 0 var(--tp-space-4) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:27](../../docs/components/table-of-contents.mdx#L27) |
| components/table-of-contents | Table of contents | p | 0 var(--tp-space-4) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:28](../../docs/components/table-of-contents.mdx#L28) |
| components/table-of-contents | Nested sections | h3 | 0 var(--tp-space-3) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:101](../../docs/components/table-of-contents.mdx#L101) |
| components/table-of-contents | Nested sections | p | 0 var(--tp-space-4) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:102](../../docs/components/table-of-contents.mdx#L102) |
| components/table-of-contents | Nested sections | h4 | 0 var(--tp-space-3) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:103](../../docs/components/table-of-contents.mdx#L103) |
| components/table-of-contents | Nested sections | p | 0 var(--tp-space-4) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:104](../../docs/components/table-of-contents.mdx#L104) |
| components/table-of-contents | Nested sections | h4 | 0 var(--tp-space-3) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:105](../../docs/components/table-of-contents.mdx#L105) |
| components/table-of-contents | Nested sections | p | 0 var(--tp-space-4) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:106](../../docs/components/table-of-contents.mdx#L106) |
| components/table-of-contents | Nested sections | h3 | 0 var(--tp-space-3) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:109](../../docs/components/table-of-contents.mdx#L109) |
| components/table-of-contents | Nested sections | p | 0 var(--tp-space-4) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:110](../../docs/components/table-of-contents.mdx#L110) |
| components/table-of-contents | Nested sections | h4 | 0 var(--tp-space-3) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:111](../../docs/components/table-of-contents.mdx#L111) |
| components/table-of-contents | Nested sections | p | 0 var(--tp-space-4) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:112](../../docs/components/table-of-contents.mdx#L112) |
| components/table-of-contents | Nested sections | h4 | 0 var(--tp-space-3) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:113](../../docs/components/table-of-contents.mdx#L113) |
| components/table-of-contents | Nested sections | p | 0 var(--tp-space-4) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:114](../../docs/components/table-of-contents.mdx#L114) |
| components/table-of-contents | Nested sections | h3 | 0 var(--tp-space-3) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:116](../../docs/components/table-of-contents.mdx#L116) |
| components/table-of-contents | Nested sections | p | 0 var(--tp-space-4) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:117](../../docs/components/table-of-contents.mdx#L117) |
| components/table-of-contents | Collected targets | p | var(--tp-space-2) 0 | layout/geometry — minimize | [docs/components/table-of-contents.mdx:163](../../docs/components/table-of-contents.mdx#L163) |
| components/table-of-contents | Collected targets | p | var(--tp-space-2) 0 | layout/geometry — minimize | [docs/components/table-of-contents.mdx:185](../../docs/components/table-of-contents.mdx#L185) |
| components/table-of-contents | Collected targets | p | var(--tp-space-2) 0 | layout/geometry — minimize | [docs/components/table-of-contents.mdx:189](../../docs/components/table-of-contents.mdx#L189) |
| components/table-of-contents | Collected targets | p | var(--tp-space-2) 0 | layout/geometry — minimize | [docs/components/table-of-contents.mdx:193](../../docs/components/table-of-contents.mdx#L193) |
| components/table-of-contents | Compact | h3 | 0 var(--tp-space-3) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:240](../../docs/components/table-of-contents.mdx#L240) |
| components/table-of-contents | Compact | p | 0 var(--tp-space-4) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:241](../../docs/components/table-of-contents.mdx#L241) |
| components/table-of-contents | Compact | h3 | 0 var(--tp-space-3) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:242](../../docs/components/table-of-contents.mdx#L242) |
| components/table-of-contents | Compact | p | 0 var(--tp-space-4) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:243](../../docs/components/table-of-contents.mdx#L243) |
| components/table-of-contents | Compact | h3 | 0 var(--tp-space-3) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:244](../../docs/components/table-of-contents.mdx#L244) |
| components/table-of-contents | Compact | p | 0 var(--tp-space-4) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:245](../../docs/components/table-of-contents.mdx#L245) |
| components/table-of-contents | Compact | h3 | 0 var(--tp-space-3) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:246](../../docs/components/table-of-contents.mdx#L246) |
| components/table-of-contents | Compact | p | 0 var(--tp-space-4) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:247](../../docs/components/table-of-contents.mdx#L247) |
| components/scroll-area | Components/Scroll area | tp-separator | var(--tp-space-2) | layout/geometry — minimize | [src/stories/scroll-area.stories.ts:51](../../src/stories/scroll-area.stories.ts#L51) |
| compositions/table-of-contents.examples | Release notes | (attribute fragment; resolve call sites) | 0 0.75rem | layout/geometry — minimize | [src/stories/table-of-contents.examples.ts:24](../../src/stories/table-of-contents.examples.ts#L24) |
| compositions/table-of-contents.examples | Release notes | h | 0 0.75rem | layout/geometry — minimize | [src/stories/table-of-contents.examples.ts:48](../../src/stories/table-of-contents.examples.ts#L48) |

<a id="property-14"></a>

### 14. max-inline-size — 57 occurrences

| Value | Occurrences |
| --- | ---: |
| 100% | 20 |
| 28rem | 9 |
| 36rem | 8 |
| 20rem | 3 |
| 32rem | 3 |
| 40rem | 3 |
| 18rem | 2 |
| 22rem | 2 |
| 12rem | 1 |
| 16rem | 1 |
| 24rem | 1 |
| 30rem | 1 |
| 34rem | 1 |
| 44rem | 1 |
| calc(var(--tp-spacing) * 160) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/aspect-ratio | Aspect ratio | tp-aspect-ratio | 36rem | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:10](../../docs/components/aspect-ratio.mdx#L10) |
| components/aspect-ratio | One ratio, three widths | figure | 100% | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:47](../../docs/components/aspect-ratio.mdx#L47) |
| components/aspect-ratio | One ratio, three widths | figure | 100% | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:69](../../docs/components/aspect-ratio.mdx#L69) |
| components/aspect-ratio | One ratio, three widths | figure | 100% | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:91](../../docs/components/aspect-ratio.mdx#L91) |
| components/attachment | Scrollable groups | tp-stack | 30rem | layout/geometry — minimize | [docs/components/attachment.mdx:110](../../docs/components/attachment.mdx#L110) |
| components/breadcrumb | Long trail | div | 20rem | layout/geometry — minimize | [docs/components/breadcrumb.mdx:177](../../docs/components/breadcrumb.mdx#L177) |
| components/calendar | Quick picks | tp-card | 20rem | layout/geometry — minimize | [docs/components/calendar.mdx:175](../../docs/components/calendar.mdx#L175) |
| components/dialog | Container modality | section | 32rem | layout/geometry — minimize | [docs/components/dialog.mdx:82](../../docs/components/dialog.mdx#L82) |
| components/empty-state | No results | tp-input-group | 22rem | layout/geometry — minimize | [docs/components/empty-state.mdx:71](../../docs/components/empty-state.mdx#L71) |
| components/field-group | Constraints | tp-field-group | 20rem | layout/geometry — minimize | [docs/components/field-group.mdx:213](../../docs/components/field-group.mdx#L213) |
| components/image | Ratio and fit | div | 40rem | layout/geometry — minimize | [docs/components/image.mdx:36](../../docs/components/image.mdx#L36) |
| components/image | Reveal timing and repeat | div | 36rem | layout/geometry — minimize | [docs/components/image.mdx:137](../../docs/components/image.mdx#L137) |
| components/image | Parallax in a scroller | div | 36rem | layout/geometry — minimize | [docs/components/image.mdx:186](../../docs/components/image.mdx#L186) |
| components/image | Horizontal strip | div | 40rem | layout/geometry — minimize | [docs/components/image.mdx:259](../../docs/components/image.mdx#L259) |
| components/image | Smoothing | div | 36rem | layout/geometry — minimize | [docs/components/image.mdx:272](../../docs/components/image.mdx#L272) |
| components/list | Card grid | tp-list | 40rem | layout/geometry — minimize | [docs/components/list.mdx:161](../../docs/components/list.mdx#L161) |
| components/menu | Context invocation | div | 100% | layout/geometry — minimize | [docs/components/menu.mdx:147](../../docs/components/menu.mdx#L147) |
| components/message-scroller | Message Scroller | tp-message-scroller | 28rem | layout/geometry — minimize | [docs/components/message-scroller.mdx:11](../../docs/components/message-scroller.mdx#L11) |
| components/message-scroller | Streaming | tp-stack | 28rem | layout/geometry — minimize | [docs/components/message-scroller.mdx:71](../../docs/components/message-scroller.mdx#L71) |
| components/message-scroller | Join marker as anchor | tp-stack | 28rem | layout/geometry — minimize | [docs/components/message-scroller.mdx:167](../../docs/components/message-scroller.mdx#L167) |
| components/message-scroller | Commands | tp-stack | 28rem | layout/geometry — minimize | [docs/components/message-scroller.mdx:243](../../docs/components/message-scroller.mdx#L243) |
| components/message-scroller | Outline and edges | div | 36rem | layout/geometry — minimize | [docs/components/message-scroller.mdx:316](../../docs/components/message-scroller.mdx#L316) |
| components/message-scroller | Prepend history | tp-stack | 28rem | layout/geometry — minimize | [docs/components/message-scroller.mdx:423](../../docs/components/message-scroller.mdx#L423) |
| components/message-scroller | Animated send | tp-stack | 28rem | layout/geometry — minimize | [docs/components/message-scroller.mdx:502](../../docs/components/message-scroller.mdx#L502) |
| components/message-scroller | Open at the start | tp-message-scroller | 28rem | layout/geometry — minimize | [docs/components/message-scroller.mdx:560](../../docs/components/message-scroller.mdx#L560) |
| components/overflow-list | Row limit | tp-resizable-panel-group | 36rem | layout/geometry — minimize | [docs/components/overflow-list.mdx:50](../../docs/components/overflow-list.mdx#L50) |
| components/overflow-list | In a table | div | 34rem | layout/geometry — minimize | [docs/components/overflow-list.mdx:86](../../docs/components/overflow-list.mdx#L86) |
| components/overflow-list | Custom count | div | 22rem | layout/geometry — minimize | [docs/components/overflow-list.mdx:140](../../docs/components/overflow-list.mdx#L140) |
| components/preview-card | Preview Card | div | 18rem | layout/geometry — minimize | [docs/components/preview-card.mdx:13](../../docs/components/preview-card.mdx#L13) |
| components/preview-card | Delays | tp-stack | 18rem | layout/geometry — minimize | [docs/components/preview-card.mdx:44](../../docs/components/preview-card.mdx#L44) |
| components/preview-card | Placement and arrow | tp-stack | 16rem | layout/geometry — minimize | [docs/components/preview-card.mdx:64](../../docs/components/preview-card.mdx#L64) |
| components/scroll-area | Scroll Area | tp-scroll-area | 100% | layout/geometry — minimize | [docs/components/scroll-area.mdx:9](../../docs/components/scroll-area.mdx#L9) |
| components/scroll-area | Horizontal | tp-scroll-area | 32rem | layout/geometry — minimize | [docs/components/scroll-area.mdx:53](../../docs/components/scroll-area.mdx#L53) |
| components/scroll-area | Both axes | tp-scroll-area | 28rem | layout/geometry — minimize | [docs/components/scroll-area.mdx:86](../../docs/components/scroll-area.mdx#L86) |
| components/scroll-area | Edge fade | tp-scroll-area | 100% | layout/geometry — minimize | [docs/components/scroll-area.mdx:169](../../docs/components/scroll-area.mdx#L169) |
| components/select | Chips | tp-field | 24rem | layout/geometry — minimize | [docs/components/select.mdx:143](../../docs/components/select.mdx#L143) |
| components/text-transform | Text transform | dd | 12rem | layout/geometry — minimize | [docs/components/text-transform.mdx:21](../../docs/components/text-transform.mdx#L21) |
| components/timeline | Roadmap | tp-scroll-area | 44rem | layout/geometry — minimize | [docs/components/timeline.mdx:61](../../docs/components/timeline.mdx#L61) |
| components/tooltip | Cursor tracking | div | 100% | layout/geometry — minimize | [docs/components/tooltip.mdx:69](../../docs/components/tooltip.mdx#L69) |
| motion/text/text-mirror | Text mirror | p | 100% | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:9](../../docs/motion/text/text-mirror.mdx#L9) |
| motion/text/text-mirror | From the center line | p | 28rem | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:28](../../docs/motion/text/text-mirror.mdx#L28) |
| motion/text/text-mirror | Vertical seam | p | 32rem | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:41](../../docs/motion/text/text-mirror.mdx#L41) |
| motion/text/text-mirror | Hide and reveal | p | 36rem | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:59](../../docs/motion/text/text-mirror.mdx#L59) |
| motion/text/text-split | Text split | p | 100% | layout/geometry — minimize | [docs/motion/text/text-split.mdx:9](../../docs/motion/text/text-split.mdx#L9) |
| motion/text/text-split | Inline formatting | p | 100% | layout/geometry — minimize | [docs/motion/text/text-split.mdx:127](../../docs/motion/text/text-split.mdx#L127) |
| widgets/easing-editor | Easing editor | tp-easing-editor | 100% | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:9](../../docs/widgets/easing-editor.mdx#L9) |
| widgets/easing-editor | Spring and custom points | tp-easing-editor | 100% | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:23](../../docs/widgets/easing-editor.mdx#L23) |
| widgets/easing-editor | Spring and custom points | tp-easing-editor | 100% | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:24](../../docs/widgets/easing-editor.mdx#L24) |
| widgets/easing-editor | Rotation preview | tp-easing-editor | 100% | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:71](../../docs/widgets/easing-editor.mdx#L71) |
| widgets/easing-editor | Design system presets | tp-easing-editor | 100% | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:84](../../docs/widgets/easing-editor.mdx#L84) |
| widgets/easing-editor | Export for code | tp-easing-editor | 100% | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:114](../../docs/widgets/easing-editor.mdx#L114) |
| widgets/easing-editor | Commit and veto | tp-easing-editor | 100% | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:140](../../docs/widgets/easing-editor.mdx#L140) |
| widgets/easing-editor | Controlled owner | tp-easing-editor | 100% | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:164](../../docs/widgets/easing-editor.mdx#L164) |
| components/scroll-area | Components/Scroll area | tp-scroll-area | 100% | layout/geometry — minimize | [src/stories/scroll-area.stories.ts:46](../../src/stories/scroll-area.stories.ts#L46) |
| compositions/table.examples | tableDefaults | tp-table | calc(var(--tp-spacing) * 160) | layout/geometry — minimize | [src/stories/table.examples.ts:226](../../src/stories/table.examples.ts#L226) |
| motion/text/text-mirror | Motion/Text/Text mirror | p | 100% | layout/geometry — minimize | [src/stories/text-mirror.stories.ts:55](../../src/stories/text-mirror.stories.ts#L55) |
| motion/text/text-split | Motion/Text/Text split | h2 | 36rem | layout/geometry — minimize | [src/stories/text-split.stories.ts:75](../../src/stories/text-split.stories.ts#L75) |

<a id="property-15"></a>

### 15. font-weight — 55 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-font-semibold) | 20 |
| 600 | 16 |
| var(--tp-font-medium) | 10 |
| 500 | 4 |
| var(--tp-font-normal) | 2 |
| 300 | 1 |
| 700 | 1 |
| normal | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/avatar | Decorative avatar | div | var(--tp-font-medium) | content appearance — review required | [docs/components/avatar.mdx:161](../../docs/components/avatar.mdx#L161) |
| components/card | Small | p | var(--tp-font-semibold) | content appearance — review required | [docs/components/card.mdx:107](../../docs/components/card.mdx#L107) |
| components/carousel | Focus | figcaption | var(--tp-font-semibold) | content appearance — review required | [docs/components/carousel.mdx:398](../../docs/components/carousel.mdx#L398) |
| components/carousel | Focus | figcaption | var(--tp-font-semibold) | content appearance — review required | [docs/components/carousel.mdx:402](../../docs/components/carousel.mdx#L402) |
| components/carousel | Focus | figcaption | var(--tp-font-semibold) | content appearance — review required | [docs/components/carousel.mdx:406](../../docs/components/carousel.mdx#L406) |
| components/carousel | Focus | figcaption | var(--tp-font-semibold) | content appearance — review required | [docs/components/carousel.mdx:410](../../docs/components/carousel.mdx#L410) |
| components/carousel | Focus | figcaption | var(--tp-font-semibold) | content appearance — review required | [docs/components/carousel.mdx:414](../../docs/components/carousel.mdx#L414) |
| components/carousel | Shader transition | figcaption | var(--tp-font-semibold) | content appearance — review required | [docs/components/carousel.mdx:481](../../docs/components/carousel.mdx#L481) |
| components/carousel | Shader transition | figcaption | var(--tp-font-semibold) | content appearance — review required | [docs/components/carousel.mdx:517](../../docs/components/carousel.mdx#L517) |
| components/carousel | Shader transition | figcaption | var(--tp-font-semibold) | content appearance — review required | [docs/components/carousel.mdx:553](../../docs/components/carousel.mdx#L553) |
| components/checkbox | Select all | legend | var(--tp-font-medium) | content appearance — review required | [docs/components/checkbox.mdx:70](../../docs/components/checkbox.mdx#L70) |
| components/checkbox | CheckboxGroupController | legend | var(--tp-font-medium) | content appearance — review required | [docs/components/checkbox.mdx:119](../../docs/components/checkbox.mdx#L119) |
| components/cursor | Cursor | span | 500 | content appearance — review required | [docs/components/cursor.mdx:14](../../docs/components/cursor.mdx#L14) |
| components/cursor | Zones | span | 500 | content appearance — review required | [docs/components/cursor.mdx:72](../../docs/components/cursor.mdx#L72) |
| components/field | Slots | span | normal | content appearance — review required | [docs/components/field.mdx:90](../../docs/components/field.mdx#L90) |
| components/list | People and invitations | span | var(--tp-font-normal) | content appearance — review required | [docs/components/list.mdx:350](../../docs/components/list.mdx#L350) |
| components/media-player | Custom top region | span | 500 | content appearance — review required | [docs/components/media-player.mdx:123](../../docs/components/media-player.mdx#L123) |
| components/scroll-area | Scroll Area | h4 | var(--tp-font-medium) | content appearance — review required | [docs/components/scroll-area.mdx:11](../../docs/components/scroll-area.mdx#L11) |
| components/scroll-area | Both axes | th | var(--tp-font-medium) | content appearance — review required | [docs/components/scroll-area.mdx:90](../../docs/components/scroll-area.mdx#L90) |
| components/scroll-area | Both axes | th | var(--tp-font-medium) | content appearance — review required | [docs/components/scroll-area.mdx:91](../../docs/components/scroll-area.mdx#L91) |
| components/scroll-area | Both axes | th | var(--tp-font-medium) | content appearance — review required | [docs/components/scroll-area.mdx:92](../../docs/components/scroll-area.mdx#L92) |
| components/scroll-area | Both axes | th | var(--tp-font-medium) | content appearance — review required | [docs/components/scroll-area.mdx:93](../../docs/components/scroll-area.mdx#L93) |
| components/scroll-area | Both axes | th | var(--tp-font-medium) | content appearance — review required | [docs/components/scroll-area.mdx:94](../../docs/components/scroll-area.mdx#L94) |
| components/scroll-area | Both axes | th | var(--tp-font-medium) | content appearance — review required | [docs/components/scroll-area.mdx:95](../../docs/components/scroll-area.mdx#L95) |
| components/scroll-trigger | From the center | p | var(--tp-font-semibold) | content appearance — review required | [docs/components/scroll-trigger.mdx:45](../../docs/components/scroll-trigger.mdx#L45) |
| components/scroll-trigger | From the center | p | var(--tp-font-semibold) | content appearance — review required | [docs/components/scroll-trigger.mdx:46](../../docs/components/scroll-trigger.mdx#L46) |
| components/scroll-trigger | From the center | p | var(--tp-font-semibold) | content appearance — review required | [docs/components/scroll-trigger.mdx:47](../../docs/components/scroll-trigger.mdx#L47) |
| components/scroll-trigger | From the center | p | var(--tp-font-semibold) | content appearance — review required | [docs/components/scroll-trigger.mdx:48](../../docs/components/scroll-trigger.mdx#L48) |
| components/scroll-trigger | From the center | p | var(--tp-font-semibold) | content appearance — review required | [docs/components/scroll-trigger.mdx:49](../../docs/components/scroll-trigger.mdx#L49) |
| components/scroll-trigger | Replay on entry | p | var(--tp-font-semibold) | content appearance — review required | [docs/components/scroll-trigger.mdx:63](../../docs/components/scroll-trigger.mdx#L63) |
| components/scroll-trigger | Reveal events | p | var(--tp-font-semibold) | content appearance — review required | [docs/components/scroll-trigger.mdx:241](../../docs/components/scroll-trigger.mdx#L241) |
| motion/surface/glow-border | Custom colors | p | var(--tp-font-semibold) | content appearance — review required | [docs/motion/surface/glow-border.mdx:145](../../docs/motion/surface/glow-border.mdx#L145) |
| motion/surface/glow-border | Custom colors | span | var(--tp-font-normal) | content appearance — review required | [docs/motion/surface/glow-border.mdx:145](../../docs/motion/surface/glow-border.mdx#L145) |
| motion/surface/segment-border | Traced in | p | var(--tp-font-semibold) | content appearance — review required | [docs/motion/surface/segment-border.mdx:125](../../docs/motion/surface/segment-border.mdx#L125) |
| motion/surface/segment-border | Traced in | p | var(--tp-font-semibold) | content appearance — review required | [docs/motion/surface/segment-border.mdx:133](../../docs/motion/surface/segment-border.mdx#L133) |
| motion/surface/segment-border | Traced in | p | var(--tp-font-semibold) | content appearance — review required | [docs/motion/surface/segment-border.mdx:141](../../docs/motion/surface/segment-border.mdx#L141) |
| motion/text/text-mirror | Text mirror | p | 600 | content appearance — review required | [docs/motion/text/text-mirror.mdx:9](../../docs/motion/text/text-mirror.mdx#L9) |
| motion/text/text-mirror | From the center line | p | 500 | content appearance — review required | [docs/motion/text/text-mirror.mdx:28](../../docs/motion/text/text-mirror.mdx#L28) |
| motion/text/text-mirror | Vertical seam | p | 600 | content appearance — review required | [docs/motion/text/text-mirror.mdx:41](../../docs/motion/text/text-mirror.mdx#L41) |
| motion/text/text-mirror | Hide and reveal | p | 600 | content appearance — review required | [docs/motion/text/text-mirror.mdx:59](../../docs/motion/text/text-mirror.mdx#L59) |
| motion/text/text-mirror | Scrubbed by the scroll | p | 600 | content appearance — review required | [docs/motion/text/text-mirror.mdx:93](../../docs/motion/text/text-mirror.mdx#L93) |
| motion/text/text-split | Text split | p | 600 | content appearance — review required | [docs/motion/text/text-split.mdx:9](../../docs/motion/text/text-split.mdx#L9) |
| motion/text/text-split | Words behind a mask | p | 600 | content appearance — review required | [docs/motion/text/text-split.mdx:34](../../docs/motion/text/text-split.mdx#L34) |
| motion/text/text-split | Characters from the center | p | 600 | content appearance — review required | [docs/motion/text/text-split.mdx:47](../../docs/motion/text/text-split.mdx#L47) |
| motion/text/text-split | Slow stagger | p | 600 | content appearance — review required | [docs/motion/text/text-split.mdx:58](../../docs/motion/text/text-split.mdx#L58) |
| motion/text/text-split | Reveal on demand | p | 600 | content appearance — review required | [docs/motion/text/text-split.mdx:76](../../docs/motion/text/text-split.mdx#L76) |
| motion/text/text-split | Custom reveal | p | 600 | content appearance — review required | [docs/motion/text/text-split.mdx:112](../../docs/motion/text/text-split.mdx#L112) |
| motion/text/text-split | Scrubbed by the scroll | p | 600 | content appearance — review required | [docs/motion/text/text-split.mdx:161](../../docs/motion/text/text-split.mdx#L161) |
| motion/text/text-stroke | Text stroke | p | 600 | content appearance — review required | [docs/motion/text/text-stroke.mdx:9](../../docs/motion/text/text-stroke.mdx#L9) |
| motion/text/text-stroke | Word by word | p | 700 | content appearance — review required | [docs/motion/text/text-stroke.mdx:28](../../docs/motion/text/text-stroke.mdx#L28) |
| motion/text/text-stroke | Heavier outline | p | 300 | content appearance — review required | [docs/motion/text/text-stroke.mdx:39](../../docs/motion/text/text-stroke.mdx#L39) |
| motion/text/text-stroke | Hide and reveal | p | 600 | content appearance — review required | [docs/motion/text/text-stroke.mdx:58](../../docs/motion/text/text-stroke.mdx#L58) |
| motion/text/text-stroke | Scrubbed by the scroll | p | 600 | content appearance — review required | [docs/motion/text/text-stroke.mdx:102](../../docs/motion/text/text-stroke.mdx#L102) |
| motion/text/text-mirror | Motion/Text/Text mirror | p | 600 | content appearance — review required | [src/stories/text-mirror.stories.ts:55](../../src/stories/text-mirror.stories.ts#L55) |
| motion/text/text-stroke | Motion/Text/Text stroke | p | 600 | content appearance — review required | [src/stories/text-stroke.stories.ts:55](../../src/stories/text-stroke.stories.ts#L55) |

<a id="property-16"></a>

### 16. grid-template-columns — 54 occurrences

| Value | Occurrences |
| --- | ---: |
| auto auto | 5 |
| repeat(3,1fr) | 5 |
| 1fr 1fr | 3 |
| auto 1fr | 3 |
| minmax(0,1fr) auto | 3 |
| repeat(2,1fr) | 3 |
| repeat(auto-fit, minmax(min(100%, 16rem), 1fr)) | 3 |
| repeat(auto-fit,minmax(16rem,1fr)) | 3 |
| repeat(2,minmax(0,1fr)) | 2 |
| repeat(3, 1fr) | 2 |
| repeat(auto-fit, minmax(14rem, 1fr)) | 2 |
| 11rem minmax(0,1fr) | 1 |
| 1fr auto | 1 |
| 2fr 1fr 0.75fr | 1 |
| auto 1fr auto | 1 |
| minmax(0, 1fr) 10rem | 1 |
| minmax(0, 1fr) 11rem | 1 |
| minmax(0, 1fr) 13rem | 1 |
| minmax(0, 1fr) 14rem | 1 |
| minmax(0,1fr) 10rem | 1 |
| minmax(0,1fr) 11rem | 1 |
| minmax(0,1fr) 2rem | 1 |
| repeat(2, minmax(0, 13rem)) | 1 |
| repeat(3,minmax(0,1fr)) | 1 |
| repeat(4,1fr) | 1 |
| repeat(auto-fit, minmax(15rem, 1fr)) | 1 |
| repeat(auto-fit, minmax(16rem, 1fr)) | 1 |
| repeat(auto-fit, minmax(9rem, 1fr)) | 1 |
| repeat(auto-fit,minmax(12rem,1fr)) | 1 |
| repeat(auto-fit,minmax(14rem,1fr)) | 1 |
| repeat(auto-fit,minmax(7rem,1fr)) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/accordion | Variants | div | repeat(auto-fit,minmax(16rem,1fr)) | layout/geometry — minimize | [docs/components/accordion.mdx:37](../../docs/components/accordion.mdx#L37) |
| components/aspect-ratio | Common ratios | div | 2fr 1fr 0.75fr | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:26](../../docs/components/aspect-ratio.mdx#L26) |
| components/aspect-ratio | Cover and contain | div | 1fr 1fr | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:124](../../docs/components/aspect-ratio.mdx#L124) |
| components/calendar | Date with start and end times | div | 1fr 1fr | layout/geometry — minimize | [docs/components/calendar.mdx:225](../../docs/components/calendar.mdx#L225) |
| components/card | Surface options | div | repeat(auto-fit,minmax(12rem,1fr)) | layout/geometry — minimize | [docs/components/card.mdx:61](../../docs/components/card.mdx#L61) |
| components/copy-button | Beside a value | dl | auto 1fr auto | layout/geometry — minimize | [docs/components/copy-button.mdx:52](../../docs/components/copy-button.mdx#L52) |
| components/cursor | Cursor | div | repeat(3,minmax(0,1fr)) | layout/geometry — minimize | [docs/components/cursor.mdx:15](../../docs/components/cursor.mdx#L15) |
| components/cursor | Spring | div | repeat(2,minmax(0,1fr)) | layout/geometry — minimize | [docs/components/cursor.mdx:46](../../docs/components/cursor.mdx#L46) |
| components/cursor | Zones | div | repeat(2,minmax(0,1fr)) | layout/geometry — minimize | [docs/components/cursor.mdx:69](../../docs/components/cursor.mdx#L69) |
| components/dialog | Non-modal | dl | 1fr auto | layout/geometry — minimize | [docs/components/dialog.mdx:55](../../docs/components/dialog.mdx#L55) |
| components/drag-drop-list | Variants and sizes | div | repeat(auto-fit,minmax(14rem,1fr)) | layout/geometry — minimize | [docs/components/drag-drop-list.mdx:68](../../docs/components/drag-drop-list.mdx#L68) |
| components/drag-drop-list | Board lanes | div | repeat(auto-fit, minmax(min(100%, 16rem), 1fr)) | layout/geometry — minimize | [docs/components/drag-drop-list.mdx:187](../../docs/components/drag-drop-list.mdx#L187) |
| components/drag-drop-list | Controlled lanes | div | repeat(auto-fit, minmax(min(100%, 16rem), 1fr)) | layout/geometry — minimize | [docs/components/drag-drop-list.mdx:243](../../docs/components/drag-drop-list.mdx#L243) |
| components/drag-drop-list | Approve before committing | div | repeat(auto-fit, minmax(min(100%, 16rem), 1fr)) | layout/geometry — minimize | [docs/components/drag-drop-list.mdx:307](../../docs/components/drag-drop-list.mdx#L307) |
| components/empty-state | Media treatments | div | repeat(auto-fit,minmax(16rem,1fr)) | layout/geometry — minimize | [docs/components/empty-state.mdx:45](../../docs/components/empty-state.mdx#L45) |
| components/empty-state | Bordered and filled | div | repeat(auto-fit,minmax(16rem,1fr)) | layout/geometry — minimize | [docs/components/empty-state.mdx:108](../../docs/components/empty-state.mdx#L108) |
| components/image | Ratio and fit | div | repeat(3,1fr) | layout/geometry — minimize | [docs/components/image.mdx:36](../../docs/components/image.mdx#L36) |
| components/image | Fallbacks | div | repeat(2,1fr) | layout/geometry — minimize | [docs/components/image.mdx:57](../../docs/components/image.mdx#L57) |
| components/image | Loading placeholders | div | repeat(2,1fr) | layout/geometry — minimize | [docs/components/image.mdx:71](../../docs/components/image.mdx#L71) |
| components/image | Hover zoom | div | repeat(2,1fr) | layout/geometry — minimize | [docs/components/image.mdx:89](../../docs/components/image.mdx#L89) |
| components/image | Staggered group | tp-image-group | repeat(4,1fr) | layout/geometry — minimize | [docs/components/image.mdx:124](../../docs/components/image.mdx#L124) |
| components/image | Reveal timing and repeat | div | repeat(3,1fr) | layout/geometry — minimize | [docs/components/image.mdx:138](../../docs/components/image.mdx#L138) |
| components/image | Reveal timing and repeat | div | repeat(3,1fr) | layout/geometry — minimize | [docs/components/image.mdx:144](../../docs/components/image.mdx#L144) |
| components/image | Headline, group and caption | tp-image-group | repeat(3,1fr) | layout/geometry — minimize | [docs/components/image.mdx:163](../../docs/components/image.mdx#L163) |
| components/list | Recordings | span | minmax(0,1fr) auto | layout/geometry — minimize | [docs/components/list.mdx:252](../../docs/components/list.mdx#L252) |
| components/list | People and invitations | span | minmax(0,1fr) auto | layout/geometry — minimize | [docs/components/list.mdx:346](../../docs/components/list.mdx#L346) |
| components/markdown | With a table of contents | div | minmax(0,1fr) 10rem | layout/geometry — minimize | [docs/components/markdown.mdx:240](../../docs/components/markdown.mdx#L240) |
| components/message-scroller | Outline and edges | div | minmax(0, 1fr) 10rem | layout/geometry — minimize | [docs/components/message-scroller.mdx:316](../../docs/components/message-scroller.mdx#L316) |
| components/navigation-menu | Navigation menu | div | repeat(2, minmax(0, 13rem)) | layout/geometry — minimize | [docs/components/navigation-menu.mdx:15](../../docs/components/navigation-menu.mdx#L15) |
| components/popover | Popover | div | 1fr 1fr | layout/geometry — minimize | [docs/components/popover.mdx:13](../../docs/components/popover.mdx#L13) |
| components/preview-card | Preview Card | div | auto 1fr | layout/geometry — minimize | [docs/components/preview-card.mdx:13](../../docs/components/preview-card.mdx#L13) |
| components/scroll-trigger | Scroll Trigger | div | repeat(3,1fr) | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:16](../../docs/components/scroll-trigger.mdx#L16) |
| components/scroll-trigger | From the center | tp-scroll-trigger | repeat(auto-fit,minmax(7rem,1fr)) | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:44](../../docs/components/scroll-trigger.mdx#L44) |
| components/scroll-trigger | Custom scroll range | div | repeat(3, 1fr) | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:160](../../docs/components/scroll-trigger.mdx#L160) |
| components/slider | Compact readout | div | auto 1fr | layout/geometry — minimize | [docs/components/slider.mdx:202](../../docs/components/slider.mdx#L202) |
| components/table-of-contents | Table of contents | div | minmax(0,1fr) 11rem | layout/geometry — minimize | [docs/components/table-of-contents.mdx:12](../../docs/components/table-of-contents.mdx#L12) |
| components/table-of-contents | Nested sections | div | 11rem minmax(0,1fr) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:87](../../docs/components/table-of-contents.mdx#L87) |
| components/table-of-contents | Collected targets | div | minmax(0, 1fr) 11rem | layout/geometry — minimize | [docs/components/table-of-contents.mdx:174](../../docs/components/table-of-contents.mdx#L174) |
| components/table-of-contents | Compact | div | minmax(0,1fr) 2rem | layout/geometry — minimize | [docs/components/table-of-contents.mdx:238](../../docs/components/table-of-contents.mdx#L238) |
| components/text-transform | Text transform | dl | minmax(0,1fr) auto | layout/geometry — minimize | [docs/components/text-transform.mdx:11](../../docs/components/text-transform.mdx#L11) |
| components/text-transform | Case and identifiers | dl | auto auto | layout/geometry — minimize | [docs/components/text-transform.mdx:35](../../docs/components/text-transform.mdx#L35) |
| components/time | Modes | dl | auto auto | layout/geometry — minimize | [docs/components/time.mdx:55](../../docs/components/time.mdx#L55) |
| components/time | Calendar | dl | auto auto | layout/geometry — minimize | [docs/components/time.mdx:147](../../docs/components/time.mdx#L147) |
| components/time | Precisions | dl | auto auto | layout/geometry — minimize | [docs/components/time.mdx:187](../../docs/components/time.mdx#L187) |
| components/time | Timers | dl | auto auto | layout/geometry — minimize | [docs/components/time.mdx:202](../../docs/components/time.mdx#L202) |
| motion/surface/glow-border | Comets | div | repeat(auto-fit, minmax(14rem, 1fr)) | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:58](../../docs/motion/surface/glow-border.mdx#L58) |
| motion/surface/glow-border | Sweep, pulse and glint | div | repeat(auto-fit, minmax(14rem, 1fr)) | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:81](../../docs/motion/surface/glow-border.mdx#L81) |
| motion/surface/glow-border | Custom colors | div | repeat(auto-fit, minmax(15rem, 1fr)) | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:139](../../docs/motion/surface/glow-border.mdx#L139) |
| motion/surface/glow-border | Lit by an element | div | auto 1fr | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:164](../../docs/motion/surface/glow-border.mdx#L164) |
| motion/surface/segment-border | Traced in | div | repeat(auto-fit, minmax(9rem, 1fr)) | layout/geometry — minimize | [docs/motion/surface/segment-border.mdx:121](../../docs/motion/surface/segment-border.mdx#L121) |
| compositions/map.examples | pinSvg | section | repeat(auto-fit, minmax(16rem, 1fr)) | layout/geometry — minimize | [src/stories/map.examples.ts:110](../../src/stories/map.examples.ts#L110) |
| components/scroll-trigger | (file/setup/shared helper) | div | repeat(3, 1fr) | layout/geometry — minimize | [src/stories/scroll-trigger.stories.ts:21](../../src/stories/scroll-trigger.stories.ts#L21) |
| compositions/table-of-contents.examples | Changelog | div | minmax(0, 1fr) 13rem | layout/geometry — minimize | [src/stories/table-of-contents.examples.ts:141](../../src/stories/table-of-contents.examples.ts#L141) |
| components/table-of-contents | DocumentScroll | div | minmax(0, 1fr) 14rem | layout/geometry — minimize | [src/stories/table-of-contents.stories.ts:144](../../src/stories/table-of-contents.stories.ts#L144) |

<a id="property-17"></a>

### 17. overflow — 38 occurrences

| Value | Occurrences |
| --- | ---: |
| hidden | 30 |
| auto | 7 |
| clip | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/aspect-ratio | Aspect ratio | tp-aspect-ratio | hidden | component structure/visibility — review required | [docs/components/aspect-ratio.mdx:10](../../docs/components/aspect-ratio.mdx#L10) |
| components/aspect-ratio | Common ratios | tp-aspect-ratio | hidden | component structure/visibility — review required | [docs/components/aspect-ratio.mdx:27](../../docs/components/aspect-ratio.mdx#L27) |
| components/aspect-ratio | Common ratios | tp-aspect-ratio | hidden | component structure/visibility — review required | [docs/components/aspect-ratio.mdx:30](../../docs/components/aspect-ratio.mdx#L30) |
| components/aspect-ratio | Common ratios | tp-aspect-ratio | hidden | component structure/visibility — review required | [docs/components/aspect-ratio.mdx:33](../../docs/components/aspect-ratio.mdx#L33) |
| components/aspect-ratio | One ratio, three widths | tp-aspect-ratio | hidden | component structure/visibility — review required | [docs/components/aspect-ratio.mdx:51](../../docs/components/aspect-ratio.mdx#L51) |
| components/aspect-ratio | One ratio, three widths | tp-aspect-ratio | hidden | component structure/visibility — review required | [docs/components/aspect-ratio.mdx:73](../../docs/components/aspect-ratio.mdx#L73) |
| components/aspect-ratio | One ratio, three widths | tp-aspect-ratio | hidden | component structure/visibility — review required | [docs/components/aspect-ratio.mdx:95](../../docs/components/aspect-ratio.mdx#L95) |
| components/aspect-ratio | Cover and contain | tp-aspect-ratio | hidden | component structure/visibility — review required | [docs/components/aspect-ratio.mdx:125](../../docs/components/aspect-ratio.mdx#L125) |
| components/aspect-ratio | Cover and contain | tp-aspect-ratio | hidden | component structure/visibility — review required | [docs/components/aspect-ratio.mdx:128](../../docs/components/aspect-ratio.mdx#L128) |
| components/carousel | Layered 3D | figure | hidden | layout/geometry — minimize | [docs/components/carousel.mdx:243](../../docs/components/carousel.mdx#L243) |
| components/carousel | Layered 3D | figure | hidden | layout/geometry — minimize | [docs/components/carousel.mdx:279](../../docs/components/carousel.mdx#L279) |
| components/carousel | Layered 3D | figure | hidden | layout/geometry — minimize | [docs/components/carousel.mdx:315](../../docs/components/carousel.mdx#L315) |
| components/carousel | Parallax | figure | hidden | layout/geometry — minimize | [docs/components/carousel.mdx:365](../../docs/components/carousel.mdx#L365) |
| components/carousel | Parallax | figure | hidden | layout/geometry — minimize | [docs/components/carousel.mdx:368](../../docs/components/carousel.mdx#L368) |
| components/carousel | Parallax | figure | hidden | layout/geometry — minimize | [docs/components/carousel.mdx:371](../../docs/components/carousel.mdx#L371) |
| components/carousel | Parallax | figure | hidden | layout/geometry — minimize | [docs/components/carousel.mdx:374](../../docs/components/carousel.mdx#L374) |
| components/carousel | Focus | figure | hidden | layout/geometry — minimize | [docs/components/carousel.mdx:396](../../docs/components/carousel.mdx#L396) |
| components/carousel | Focus | figure | hidden | layout/geometry — minimize | [docs/components/carousel.mdx:400](../../docs/components/carousel.mdx#L400) |
| components/carousel | Focus | figure | hidden | layout/geometry — minimize | [docs/components/carousel.mdx:404](../../docs/components/carousel.mdx#L404) |
| components/carousel | Focus | figure | hidden | layout/geometry — minimize | [docs/components/carousel.mdx:408](../../docs/components/carousel.mdx#L408) |
| components/carousel | Focus | figure | hidden | layout/geometry — minimize | [docs/components/carousel.mdx:412](../../docs/components/carousel.mdx#L412) |
| components/carousel | Shader transition | figure | hidden | layout/geometry — minimize | [docs/components/carousel.mdx:458](../../docs/components/carousel.mdx#L458) |
| components/carousel | Shader transition | figure | hidden | layout/geometry — minimize | [docs/components/carousel.mdx:494](../../docs/components/carousel.mdx#L494) |
| components/carousel | Shader transition | figure | hidden | layout/geometry — minimize | [docs/components/carousel.mdx:530](../../docs/components/carousel.mdx#L530) |
| components/dialog | Container modality | section | clip | layout/geometry — minimize | [docs/components/dialog.mdx:82](../../docs/components/dialog.mdx#L82) |
| components/navigation-panel | Navigation panel | div | hidden | layout/geometry — minimize | [docs/components/navigation-panel.mdx:11](../../docs/components/navigation-panel.mdx#L11) |
| components/navigation-panel | Off-canvas | div | hidden | layout/geometry — minimize | [docs/components/navigation-panel.mdx:102](../../docs/components/navigation-panel.mdx#L102) |
| components/navigation-panel | Collapsible groups | div | hidden | layout/geometry — minimize | [docs/components/navigation-panel.mdx:133](../../docs/components/navigation-panel.mdx#L133) |
| components/navigation-panel | Drawer mode | div | hidden | layout/geometry — minimize | [docs/components/navigation-panel.mdx:187](../../docs/components/navigation-panel.mdx#L187) |
| components/navigation-panel | Floating | div | hidden | layout/geometry — minimize | [docs/components/navigation-panel.mdx:217](../../docs/components/navigation-panel.mdx#L217) |
| components/navigation-panel | Team switcher and row actions | div | hidden | layout/geometry — minimize | [docs/components/navigation-panel.mdx:250](../../docs/components/navigation-panel.mdx#L250) |
| components/scroll-trigger | Replay on entry | div | auto | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:60](../../docs/components/scroll-trigger.mdx#L60) |
| components/scroll-trigger | Scrubbed band | div | auto | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:78](../../docs/components/scroll-trigger.mdx#L78) |
| components/scroll-trigger | Custom scroll range | div | auto | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:131](../../docs/components/scroll-trigger.mdx#L131) |
| components/scroll-trigger | Pinned scene | div | auto | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:205](../../docs/components/scroll-trigger.mdx#L205) |
| motion/text/text-mirror | Scrubbed by the scroll | div | auto | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:74](../../docs/motion/text/text-mirror.mdx#L74) |
| motion/text/text-split | Scrubbed by the scroll | div | auto | layout/geometry — minimize | [docs/motion/text/text-split.mdx:142](../../docs/motion/text/text-split.mdx#L142) |
| motion/text/text-stroke | Scrubbed by the scroll | div | auto | layout/geometry — minimize | [docs/motion/text/text-stroke.mdx:82](../../docs/motion/text/text-stroke.mdx#L82) |

<a id="property-18"></a>

### 18. position — 30 occurrences

| Value | Occurrences |
| --- | ---: |
| relative | 12 |
| absolute | 11 |
| sticky | 7 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/carousel | Layered 3D | figure | relative | layout/geometry — minimize | [docs/components/carousel.mdx:243](../../docs/components/carousel.mdx#L243) |
| components/carousel | Layered 3D | figcaption | absolute | layout/geometry — minimize | [docs/components/carousel.mdx:264](../../docs/components/carousel.mdx#L264) |
| components/carousel | Layered 3D | figure | relative | layout/geometry — minimize | [docs/components/carousel.mdx:279](../../docs/components/carousel.mdx#L279) |
| components/carousel | Layered 3D | figcaption | absolute | layout/geometry — minimize | [docs/components/carousel.mdx:300](../../docs/components/carousel.mdx#L300) |
| components/carousel | Layered 3D | figure | relative | layout/geometry — minimize | [docs/components/carousel.mdx:315](../../docs/components/carousel.mdx#L315) |
| components/carousel | Layered 3D | figcaption | absolute | layout/geometry — minimize | [docs/components/carousel.mdx:336](../../docs/components/carousel.mdx#L336) |
| components/carousel | Focus | figure | relative | layout/geometry — minimize | [docs/components/carousel.mdx:396](../../docs/components/carousel.mdx#L396) |
| components/carousel | Focus | figcaption | absolute | layout/geometry — minimize | [docs/components/carousel.mdx:398](../../docs/components/carousel.mdx#L398) |
| components/carousel | Focus | figure | relative | layout/geometry — minimize | [docs/components/carousel.mdx:400](../../docs/components/carousel.mdx#L400) |
| components/carousel | Focus | figcaption | absolute | layout/geometry — minimize | [docs/components/carousel.mdx:402](../../docs/components/carousel.mdx#L402) |
| components/carousel | Focus | figure | relative | layout/geometry — minimize | [docs/components/carousel.mdx:404](../../docs/components/carousel.mdx#L404) |
| components/carousel | Focus | figcaption | absolute | layout/geometry — minimize | [docs/components/carousel.mdx:406](../../docs/components/carousel.mdx#L406) |
| components/carousel | Focus | figure | relative | layout/geometry — minimize | [docs/components/carousel.mdx:408](../../docs/components/carousel.mdx#L408) |
| components/carousel | Focus | figcaption | absolute | layout/geometry — minimize | [docs/components/carousel.mdx:410](../../docs/components/carousel.mdx#L410) |
| components/carousel | Focus | figure | relative | layout/geometry — minimize | [docs/components/carousel.mdx:412](../../docs/components/carousel.mdx#L412) |
| components/carousel | Focus | figcaption | absolute | layout/geometry — minimize | [docs/components/carousel.mdx:414](../../docs/components/carousel.mdx#L414) |
| components/carousel | Shader transition | figure | relative | layout/geometry — minimize | [docs/components/carousel.mdx:458](../../docs/components/carousel.mdx#L458) |
| components/carousel | Shader transition | figcaption | absolute | layout/geometry — minimize | [docs/components/carousel.mdx:481](../../docs/components/carousel.mdx#L481) |
| components/carousel | Shader transition | figure | relative | layout/geometry — minimize | [docs/components/carousel.mdx:494](../../docs/components/carousel.mdx#L494) |
| components/carousel | Shader transition | figcaption | absolute | layout/geometry — minimize | [docs/components/carousel.mdx:517](../../docs/components/carousel.mdx#L517) |
| components/carousel | Shader transition | figure | relative | layout/geometry — minimize | [docs/components/carousel.mdx:530](../../docs/components/carousel.mdx#L530) |
| components/carousel | Shader transition | figcaption | absolute | layout/geometry — minimize | [docs/components/carousel.mdx:553](../../docs/components/carousel.mdx#L553) |
| components/dialog | Container modality | section | relative | layout/geometry — minimize | [docs/components/dialog.mdx:82](../../docs/components/dialog.mdx#L82) |
| components/markdown | With a table of contents | aside | sticky | layout/geometry — minimize | [docs/components/markdown.mdx:266](../../docs/components/markdown.mdx#L266) |
| components/table-of-contents | Table of contents | aside | sticky | layout/geometry — minimize | [docs/components/table-of-contents.mdx:31](../../docs/components/table-of-contents.mdx#L31) |
| components/table-of-contents | Nested sections | aside | sticky | layout/geometry — minimize | [docs/components/table-of-contents.mdx:88](../../docs/components/table-of-contents.mdx#L88) |
| components/table-of-contents | Collected targets | aside | sticky | layout/geometry — minimize | [docs/components/table-of-contents.mdx:197](../../docs/components/table-of-contents.mdx#L197) |
| components/table-of-contents | Compact | aside | sticky | layout/geometry — minimize | [docs/components/table-of-contents.mdx:250](../../docs/components/table-of-contents.mdx#L250) |
| compositions/table-of-contents.examples | Changelog | aside | sticky | layout/geometry — minimize | [src/stories/table-of-contents.examples.ts:148](../../src/stories/table-of-contents.examples.ts#L148) |
| components/table-of-contents | DocumentScroll | aside | sticky | layout/geometry — minimize | [src/stories/table-of-contents.stories.ts:158](../../src/stories/table-of-contents.stories.ts#L158) |

<a id="property-19"></a>

### 19. aspect-ratio — 29 occurrences

| Value | Occurrences |
| --- | ---: |
| 16/9 | 15 |
| 4/3 | 7 |
| 4/5 | 5 |
| 1 | 1 |
| 16 / 9 | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/carousel | Carousel | tp-stack | 16/9 | layout/geometry — minimize | [docs/components/carousel.mdx:13](../../docs/components/carousel.mdx#L13) |
| components/carousel | Carousel | tp-stack | 16/9 | layout/geometry — minimize | [docs/components/carousel.mdx:26](../../docs/components/carousel.mdx#L26) |
| components/carousel | Carousel | tp-stack | 16/9 | layout/geometry — minimize | [docs/components/carousel.mdx:39](../../docs/components/carousel.mdx#L39) |
| components/carousel | Carousel | tp-stack | 16/9 | layout/geometry — minimize | [docs/components/carousel.mdx:51](../../docs/components/carousel.mdx#L51) |
| components/carousel | Crossfade | tp-stack | 16/9 | layout/geometry — minimize | [docs/components/carousel.mdx:184](../../docs/components/carousel.mdx#L184) |
| components/carousel | Crossfade | tp-stack | 16/9 | layout/geometry — minimize | [docs/components/carousel.mdx:198](../../docs/components/carousel.mdx#L198) |
| components/carousel | Crossfade | tp-stack | 16/9 | layout/geometry — minimize | [docs/components/carousel.mdx:213](../../docs/components/carousel.mdx#L213) |
| components/carousel | Layered 3D | figure | 16/9 | layout/geometry — minimize | [docs/components/carousel.mdx:243](../../docs/components/carousel.mdx#L243) |
| components/carousel | Layered 3D | figure | 16/9 | layout/geometry — minimize | [docs/components/carousel.mdx:279](../../docs/components/carousel.mdx#L279) |
| components/carousel | Layered 3D | figure | 16/9 | layout/geometry — minimize | [docs/components/carousel.mdx:315](../../docs/components/carousel.mdx#L315) |
| components/carousel | Parallax | figure | 4/3 | layout/geometry — minimize | [docs/components/carousel.mdx:365](../../docs/components/carousel.mdx#L365) |
| components/carousel | Parallax | figure | 4/3 | layout/geometry — minimize | [docs/components/carousel.mdx:368](../../docs/components/carousel.mdx#L368) |
| components/carousel | Parallax | figure | 4/3 | layout/geometry — minimize | [docs/components/carousel.mdx:371](../../docs/components/carousel.mdx#L371) |
| components/carousel | Parallax | figure | 4/3 | layout/geometry — minimize | [docs/components/carousel.mdx:374](../../docs/components/carousel.mdx#L374) |
| components/carousel | Focus | figure | 4/5 | layout/geometry — minimize | [docs/components/carousel.mdx:396](../../docs/components/carousel.mdx#L396) |
| components/carousel | Focus | figure | 4/5 | layout/geometry — minimize | [docs/components/carousel.mdx:400](../../docs/components/carousel.mdx#L400) |
| components/carousel | Focus | figure | 4/5 | layout/geometry — minimize | [docs/components/carousel.mdx:404](../../docs/components/carousel.mdx#L404) |
| components/carousel | Focus | figure | 4/5 | layout/geometry — minimize | [docs/components/carousel.mdx:408](../../docs/components/carousel.mdx#L408) |
| components/carousel | Focus | figure | 4/5 | layout/geometry — minimize | [docs/components/carousel.mdx:412](../../docs/components/carousel.mdx#L412) |
| components/carousel | Shader transition | figure | 16/9 | layout/geometry — minimize | [docs/components/carousel.mdx:458](../../docs/components/carousel.mdx#L458) |
| components/carousel | Shader transition | figure | 16/9 | layout/geometry — minimize | [docs/components/carousel.mdx:494](../../docs/components/carousel.mdx#L494) |
| components/carousel | Shader transition | figure | 16/9 | layout/geometry — minimize | [docs/components/carousel.mdx:530](../../docs/components/carousel.mdx#L530) |
| components/cursor | Cursor | div | 4/3 | layout/geometry — minimize | [docs/components/cursor.mdx:17](../../docs/components/cursor.mdx#L17) |
| components/cursor | Cursor | div | 4/3 | layout/geometry — minimize | [docs/components/cursor.mdx:21](../../docs/components/cursor.mdx#L21) |
| components/cursor | Cursor | div | 4/3 | layout/geometry — minimize | [docs/components/cursor.mdx:25](../../docs/components/cursor.mdx#L25) |
| components/skeleton | Card | tp-skeleton | 16 / 9 | layout/geometry — minimize | [docs/components/skeleton.mdx:60](../../docs/components/skeleton.mdx#L60) |
| widgets/plot | Distribution | tp-plot | 16/9 | layout/geometry — minimize | [docs/widgets/plot.mdx:44](../../docs/widgets/plot.mdx#L44) |
| compositions/skeleton.examples | skeletonExamples | tp-skeleton | 1 | layout/geometry — minimize | [src/stories/skeleton.examples.ts:78](../../src/stories/skeleton.examples.ts#L78) |
| widgets/plot | Histogram | tp-plot | 16/9 | layout/geometry — minimize | [src/stories/widgets/plot.stories.ts:137](../../src/stories/widgets/plot.stories.ts#L137) |

<a id="property-20"></a>

### 20. line-height — 28 occurrences

| Value | Occurrences |
| --- | ---: |
| 1.1 | 10 |
| 1.05 | 3 |
| 1.15 | 3 |
| 1.75 | 3 |
| var(--tp-leading-tight) | 3 |
| 1 | 1 |
| 1.2 | 1 |
| 1.4 | 1 |
| 1.5 | 1 |
| 1.6 | 1 |
| var(--tp-leading-relaxed) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/calendar | Nightly prices and booked dates | tp-stack | 1.1 | component presentation override — review required | [docs/components/calendar.mdx:109](../../docs/components/calendar.mdx#L109) |
| components/citation | Citation | p | 1.75 | content appearance — review required | [docs/components/citation.mdx:12](../../docs/components/citation.mdx#L12) |
| components/citation | Source preview | p | 1.75 | content appearance — review required | [docs/components/citation.mdx:49](../../docs/components/citation.mdx#L49) |
| components/citation | Numbered references | p | 1.75 | content appearance — review required | [docs/components/citation.mdx:71](../../docs/components/citation.mdx#L71) |
| components/scroll-area | Edge fade | tp-stack | var(--tp-leading-relaxed) | component presentation override — review required | [docs/components/scroll-area.mdx:171](../../docs/components/scroll-area.mdx#L171) |
| components/scroll-trigger | Scroll Trigger | h3 | var(--tp-leading-tight) | content appearance — review required | [docs/components/scroll-trigger.mdx:12](../../docs/components/scroll-trigger.mdx#L12) |
| components/scroll-trigger | Custom scroll range | h3 | var(--tp-leading-tight) | content appearance — review required | [docs/components/scroll-trigger.mdx:151](../../docs/components/scroll-trigger.mdx#L151) |
| components/scroll-trigger | Pinned scene | h3 | var(--tp-leading-tight) | content appearance — review required | [docs/components/scroll-trigger.mdx:214](../../docs/components/scroll-trigger.mdx#L214) |
| motion/text/text-mirror | Text mirror | p | 1.05 | content appearance — review required | [docs/motion/text/text-mirror.mdx:9](../../docs/motion/text/text-mirror.mdx#L9) |
| motion/text/text-mirror | From the center line | p | 1.5 | content appearance — review required | [docs/motion/text/text-mirror.mdx:28](../../docs/motion/text/text-mirror.mdx#L28) |
| motion/text/text-mirror | Vertical seam | p | 1.15 | content appearance — review required | [docs/motion/text/text-mirror.mdx:41](../../docs/motion/text/text-mirror.mdx#L41) |
| motion/text/text-mirror | Hide and reveal | p | 1.4 | content appearance — review required | [docs/motion/text/text-mirror.mdx:59](../../docs/motion/text/text-mirror.mdx#L59) |
| motion/text/text-mirror | Scrubbed by the scroll | p | 1.15 | content appearance — review required | [docs/motion/text/text-mirror.mdx:93](../../docs/motion/text/text-mirror.mdx#L93) |
| motion/text/text-split | Text split | p | 1.05 | content appearance — review required | [docs/motion/text/text-split.mdx:9](../../docs/motion/text/text-split.mdx#L9) |
| motion/text/text-split | Words behind a mask | p | 1.1 | content appearance — review required | [docs/motion/text/text-split.mdx:34](../../docs/motion/text/text-split.mdx#L34) |
| motion/text/text-split | Reveal on demand | p | 1.1 | content appearance — review required | [docs/motion/text/text-split.mdx:76](../../docs/motion/text/text-split.mdx#L76) |
| motion/text/text-split | Custom reveal | p | 1.2 | content appearance — review required | [docs/motion/text/text-split.mdx:112](../../docs/motion/text/text-split.mdx#L112) |
| motion/text/text-split | Inline formatting | p | 1.6 | content appearance — review required | [docs/motion/text/text-split.mdx:127](../../docs/motion/text/text-split.mdx#L127) |
| motion/text/text-split | Scrubbed by the scroll | p | 1.1 | content appearance — review required | [docs/motion/text/text-split.mdx:161](../../docs/motion/text/text-split.mdx#L161) |
| motion/text/text-stroke | Text stroke | p | 1.1 | content appearance — review required | [docs/motion/text/text-stroke.mdx:9](../../docs/motion/text/text-stroke.mdx#L9) |
| motion/text/text-stroke | Word by word | p | 1.15 | content appearance — review required | [docs/motion/text/text-stroke.mdx:28](../../docs/motion/text/text-stroke.mdx#L28) |
| motion/text/text-stroke | Heavier outline | p | 1 | content appearance — review required | [docs/motion/text/text-stroke.mdx:39](../../docs/motion/text/text-stroke.mdx#L39) |
| motion/text/text-stroke | Hide and reveal | p | 1.1 | content appearance — review required | [docs/motion/text/text-stroke.mdx:58](../../docs/motion/text/text-stroke.mdx#L58) |
| motion/text/text-stroke | Scrubbed by the scroll | p | 1.1 | content appearance — review required | [docs/motion/text/text-stroke.mdx:102](../../docs/motion/text/text-stroke.mdx#L102) |
| components/scroll-trigger | (file/setup/shared helper) | h3 | 1.1 | content appearance — review required | [src/stories/scroll-trigger.stories.ts:17](../../src/stories/scroll-trigger.stories.ts#L17) |
| motion/text/text-mirror | Motion/Text/Text mirror | p | 1.05 | content appearance — review required | [src/stories/text-mirror.stories.ts:55](../../src/stories/text-mirror.stories.ts#L55) |
| motion/text/text-split | Motion/Text/Text split | h2 | 1.1 | content appearance — review required | [src/stories/text-split.stories.ts:75](../../src/stories/text-split.stories.ts#L75) |
| motion/text/text-stroke | Motion/Text/Text stroke | p | 1.1 | content appearance — review required | [src/stories/text-stroke.stories.ts:55](../../src/stories/text-stroke.stories.ts#L55) |

<a id="property-21"></a>

### 21. flex — 23 occurrences

| Value | Occurrences |
| --- | ---: |
| 1 | 7 |
| 0 0 min(60%,12rem) | 4 |
| 1 0 auto | 4 |
| none | 4 |
| 0 0 6rem | 1 |
| 1 1 0 | 1 |
| 1 1 14rem | 1 |
| 2 1 24rem | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/calendar | Quick picks | tp-button | 1 0 auto | layout/geometry — minimize | [docs/components/calendar.mdx:185](../../docs/components/calendar.mdx#L185) |
| components/calendar | Quick picks | tp-button | 1 0 auto | layout/geometry — minimize | [docs/components/calendar.mdx:186](../../docs/components/calendar.mdx#L186) |
| components/calendar | Quick picks | tp-button | 1 0 auto | layout/geometry — minimize | [docs/components/calendar.mdx:187](../../docs/components/calendar.mdx#L187) |
| components/calendar | Quick picks | tp-button | 1 0 auto | layout/geometry — minimize | [docs/components/calendar.mdx:190](../../docs/components/calendar.mdx#L190) |
| components/field-group | Color channels | tp-field-group | 1 1 0 | layout/geometry — minimize | [docs/components/field-group.mdx:44](../../docs/components/field-group.mdx#L44) |
| components/field-group | Color channels | tp-input-group | 0 0 6rem | layout/geometry — minimize | [docs/components/field-group.mdx:52](../../docs/components/field-group.mdx#L52) |
| components/image | Horizontal strip | tp-image | 0 0 min(60%,12rem) | layout/geometry — minimize | [docs/components/image.mdx:260](../../docs/components/image.mdx#L260) |
| components/image | Horizontal strip | tp-image | 0 0 min(60%,12rem) | layout/geometry — minimize | [docs/components/image.mdx:261](../../docs/components/image.mdx#L261) |
| components/image | Horizontal strip | tp-image | 0 0 min(60%,12rem) | layout/geometry — minimize | [docs/components/image.mdx:262](../../docs/components/image.mdx#L262) |
| components/image | Horizontal strip | tp-image | 0 0 min(60%,12rem) | layout/geometry — minimize | [docs/components/image.mdx:263](../../docs/components/image.mdx#L263) |
| components/input-group | Button group composition | tp-input-group | 1 | layout/geometry — minimize | [docs/components/input-group.mdx:148](../../docs/components/input-group.mdx#L148) |
| components/input-group | Button group composition | tp-input-group | 1 | layout/geometry — minimize | [docs/components/input-group.mdx:159](../../docs/components/input-group.mdx#L159) |
| components/map | Map with a list | tp-map | 2 1 24rem | layout/geometry — minimize | [docs/components/map.mdx:283](../../docs/components/map.mdx#L283) |
| components/map | Map with a list | tp-list | 1 1 14rem | layout/geometry — minimize | [docs/components/map.mdx:304](../../docs/components/map.mdx#L304) |
| components/marker | Native hosts and layout | tp-icon | none | layout/geometry — minimize | [docs/components/marker.mdx:126](../../docs/components/marker.mdx#L126) |
| components/skeleton | Skeleton | tp-skeleton | none | layout/geometry — minimize | [docs/components/skeleton.mdx:11](../../docs/components/skeleton.mdx#L11) |
| components/skeleton | Table rows | tp-skeleton | 1 | layout/geometry — minimize | [docs/components/skeleton.mdx:128](../../docs/components/skeleton.mdx#L128) |
| components/skeleton | Table rows | tp-skeleton | 1 | layout/geometry — minimize | [docs/components/skeleton.mdx:135](../../docs/components/skeleton.mdx#L135) |
| components/skeleton | Table rows | tp-skeleton | 1 | layout/geometry — minimize | [docs/components/skeleton.mdx:142](../../docs/components/skeleton.mdx#L142) |
| widgets/emoji-picker | Insert into a message | tp-field | 1 | layout/geometry — minimize | [docs/widgets/emoji-picker.mdx:51](../../docs/widgets/emoji-picker.mdx#L51) |
| compositions/skeleton.examples | (file/setup/shared helper) | tp-skeleton | none | layout/geometry — minimize | [src/stories/skeleton.examples.ts:21](../../src/stories/skeleton.examples.ts#L21) |
| compositions/skeleton.examples | skeletonSource | tp-skeleton | none | layout/geometry — minimize | [src/stories/skeleton.examples.ts:40](../../src/stories/skeleton.examples.ts#L40) |
| compositions/skeleton.examples | skeletonSource | tp-skeleton | 1 | layout/geometry — minimize | [src/stories/skeleton.examples.ts:53](../../src/stories/skeleton.examples.ts#L53) |

<a id="property-22"></a>

### 22. margin-inline — 23 occurrences

| Value | Occurrences |
| --- | ---: |
| auto | 23 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/aspect-ratio | Aspect ratio | tp-aspect-ratio | auto | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:10](../../docs/components/aspect-ratio.mdx#L10) |
| components/attachment | Scrollable groups | tp-stack | auto | layout/geometry — minimize | [docs/components/attachment.mdx:110](../../docs/components/attachment.mdx#L110) |
| components/breadcrumb | Long trail | div | auto | layout/geometry — minimize | [docs/components/breadcrumb.mdx:177](../../docs/components/breadcrumb.mdx#L177) |
| components/dialog | Container modality | section | auto | layout/geometry — minimize | [docs/components/dialog.mdx:82](../../docs/components/dialog.mdx#L82) |
| components/field-group | Constraints | tp-field-group | auto | layout/geometry — minimize | [docs/components/field-group.mdx:213](../../docs/components/field-group.mdx#L213) |
| components/image | Ratio and fit | div | auto | layout/geometry — minimize | [docs/components/image.mdx:36](../../docs/components/image.mdx#L36) |
| components/image | Reveal timing and repeat | div | auto | layout/geometry — minimize | [docs/components/image.mdx:137](../../docs/components/image.mdx#L137) |
| components/image | Parallax in a scroller | div | auto | layout/geometry — minimize | [docs/components/image.mdx:186](../../docs/components/image.mdx#L186) |
| components/image | Horizontal strip | div | auto | layout/geometry — minimize | [docs/components/image.mdx:259](../../docs/components/image.mdx#L259) |
| components/image | Smoothing | div | auto | layout/geometry — minimize | [docs/components/image.mdx:272](../../docs/components/image.mdx#L272) |
| components/list | Card grid | tp-list | auto | layout/geometry — minimize | [docs/components/list.mdx:161](../../docs/components/list.mdx#L161) |
| components/message-scroller | Message Scroller | tp-message-scroller | auto | layout/geometry — minimize | [docs/components/message-scroller.mdx:11](../../docs/components/message-scroller.mdx#L11) |
| components/message-scroller | Streaming | tp-stack | auto | layout/geometry — minimize | [docs/components/message-scroller.mdx:71](../../docs/components/message-scroller.mdx#L71) |
| components/message-scroller | Join marker as anchor | tp-stack | auto | layout/geometry — minimize | [docs/components/message-scroller.mdx:167](../../docs/components/message-scroller.mdx#L167) |
| components/message-scroller | Commands | tp-stack | auto | layout/geometry — minimize | [docs/components/message-scroller.mdx:243](../../docs/components/message-scroller.mdx#L243) |
| components/message-scroller | Outline and edges | div | auto | layout/geometry — minimize | [docs/components/message-scroller.mdx:316](../../docs/components/message-scroller.mdx#L316) |
| components/message-scroller | Prepend history | tp-stack | auto | layout/geometry — minimize | [docs/components/message-scroller.mdx:423](../../docs/components/message-scroller.mdx#L423) |
| components/message-scroller | Animated send | tp-stack | auto | layout/geometry — minimize | [docs/components/message-scroller.mdx:502](../../docs/components/message-scroller.mdx#L502) |
| components/message-scroller | Open at the start | tp-message-scroller | auto | layout/geometry — minimize | [docs/components/message-scroller.mdx:560](../../docs/components/message-scroller.mdx#L560) |
| components/overflow-list | Row limit | tp-resizable-panel-group | auto | layout/geometry — minimize | [docs/components/overflow-list.mdx:50](../../docs/components/overflow-list.mdx#L50) |
| components/overflow-list | In a table | div | auto | layout/geometry — minimize | [docs/components/overflow-list.mdx:86](../../docs/components/overflow-list.mdx#L86) |
| components/overflow-list | Custom count | div | auto | layout/geometry — minimize | [docs/components/overflow-list.mdx:140](../../docs/components/overflow-list.mdx#L140) |
| components/timeline | Roadmap | tp-scroll-area | auto | layout/geometry — minimize | [docs/components/timeline.mdx:61](../../docs/components/timeline.mdx#L61) |

<a id="property-23"></a>

### 23. min-block-size — 23 occurrences

| Value | Occurrences |
| --- | ---: |
| 10rem | 5 |
| 12rem | 5 |
| 9rem | 4 |
| 8rem | 3 |
| 100cqb | 2 |
| 16rem | 2 |
| 5rem | 1 |
| calc(var(--tp-control-height-md) * 2) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/carousel | Bullets inside | blockquote | 12rem | layout/geometry — minimize | [docs/components/carousel.mdx:101](../../docs/components/carousel.mdx#L101) |
| components/carousel | Bullets inside | blockquote | 12rem | layout/geometry — minimize | [docs/components/carousel.mdx:105](../../docs/components/carousel.mdx#L105) |
| components/carousel | Bullets inside | blockquote | 12rem | layout/geometry — minimize | [docs/components/carousel.mdx:109](../../docs/components/carousel.mdx#L109) |
| components/carousel | Autoplay | div | 9rem | layout/geometry — minimize | [docs/components/carousel.mdx:130](../../docs/components/carousel.mdx#L130) |
| components/carousel | Autoplay | div | 9rem | layout/geometry — minimize | [docs/components/carousel.mdx:134](../../docs/components/carousel.mdx#L134) |
| components/carousel | Autoplay | div | 9rem | layout/geometry — minimize | [docs/components/carousel.mdx:138](../../docs/components/carousel.mdx#L138) |
| components/carousel | Commit | div | 8rem | layout/geometry — minimize | [docs/components/carousel.mdx:632](../../docs/components/carousel.mdx#L632) |
| components/carousel | Commit | div | 8rem | layout/geometry — minimize | [docs/components/carousel.mdx:642](../../docs/components/carousel.mdx#L642) |
| components/carousel | Commit | div | 8rem | layout/geometry — minimize | [docs/components/carousel.mdx:652](../../docs/components/carousel.mdx#L652) |
| components/cursor | Spring | div | 10rem | layout/geometry — minimize | [docs/components/cursor.mdx:47](../../docs/components/cursor.mdx#L47) |
| components/cursor | Spring | div | 10rem | layout/geometry — minimize | [docs/components/cursor.mdx:51](../../docs/components/cursor.mdx#L51) |
| components/cursor | Zones | div | 10rem | layout/geometry — minimize | [docs/components/cursor.mdx:73](../../docs/components/cursor.mdx#L73) |
| components/cursor | Zones | div | 10rem | layout/geometry — minimize | [docs/components/cursor.mdx:80](../../docs/components/cursor.mdx#L80) |
| components/cursor | Dot and ring | div | 12rem | layout/geometry — minimize | [docs/components/cursor.mdx:134](../../docs/components/cursor.mdx#L134) |
| components/cursor | Reduced motion | div | 10rem | layout/geometry — minimize | [docs/components/cursor.mdx:208](../../docs/components/cursor.mdx#L208) |
| components/dialog | Container modality | section | 16rem | layout/geometry — minimize | [docs/components/dialog.mdx:82](../../docs/components/dialog.mdx#L82) |
| components/input-group | Native textarea | textarea | calc(var(--tp-control-height-md) * 2) | layout/geometry — minimize | [docs/components/input-group.mdx:252](../../docs/components/input-group.mdx#L252) |
| components/markdown | Streaming | tp-markdown | 12rem | layout/geometry — minimize | [docs/components/markdown.mdx:137](../../docs/components/markdown.mdx#L137) |
| components/menu | Context invocation | div | 9rem | layout/geometry — minimize | [docs/components/menu.mdx:147](../../docs/components/menu.mdx#L147) |
| components/scroll-trigger | Pinned scene | div | 100cqb | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:206](../../docs/components/scroll-trigger.mdx#L206) |
| components/scroll-trigger | Pinned scene | div | 100cqb | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:221](../../docs/components/scroll-trigger.mdx#L221) |
| components/tooltip | Cursor tracking | div | 5rem | layout/geometry — minimize | [docs/components/tooltip.mdx:69](../../docs/components/tooltip.mdx#L69) |
| components/cursor | Components/Cursor | div | 16rem | layout/geometry — minimize | [src/stories/cursor.stories.ts:92](../../src/stories/cursor.stories.ts#L92) |

<a id="property-24"></a>

### 24. align-items — 20 occurrences

| Value | Occurrences |
| --- | ---: |
| center | 10 |
| start | 10 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/aspect-ratio | Common ratios | div | start | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:26](../../docs/components/aspect-ratio.mdx#L26) |
| components/code-block | Title slot | span | center | layout/geometry — minimize | [docs/components/code-block.mdx:35](../../docs/components/code-block.mdx#L35) |
| components/copy-button | Beside a value | dl | center | layout/geometry — minimize | [docs/components/copy-button.mdx:52](../../docs/components/copy-button.mdx#L52) |
| components/description-list | Record details | span | center | layout/geometry — minimize | [docs/components/description-list.mdx:39](../../docs/components/description-list.mdx#L39) |
| components/icon | Decorative and labelled | span | center | layout/geometry — minimize | [docs/components/icon.mdx:51](../../docs/components/icon.mdx#L51) |
| components/label | By id and by nesting | tp-label | center | layout/geometry — minimize | [docs/components/label.mdx:34](../../docs/components/label.mdx#L34) |
| components/list | Recordings | span | center | layout/geometry — minimize | [docs/components/list.mdx:252](../../docs/components/list.mdx#L252) |
| components/list | People and invitations | span | center | layout/geometry — minimize | [docs/components/list.mdx:346](../../docs/components/list.mdx#L346) |
| components/markdown | With a table of contents | div | start | layout/geometry — minimize | [docs/components/markdown.mdx:240](../../docs/components/markdown.mdx#L240) |
| components/slider | Compact readout | div | center | layout/geometry — minimize | [docs/components/slider.mdx:202](../../docs/components/slider.mdx#L202) |
| components/table-of-contents | Table of contents | div | start | layout/geometry — minimize | [docs/components/table-of-contents.mdx:12](../../docs/components/table-of-contents.mdx#L12) |
| components/table-of-contents | Nested sections | div | start | layout/geometry — minimize | [docs/components/table-of-contents.mdx:87](../../docs/components/table-of-contents.mdx#L87) |
| components/table-of-contents | Collected targets | div | start | layout/geometry — minimize | [docs/components/table-of-contents.mdx:174](../../docs/components/table-of-contents.mdx#L174) |
| components/table-of-contents | Compact | div | start | layout/geometry — minimize | [docs/components/table-of-contents.mdx:238](../../docs/components/table-of-contents.mdx#L238) |
| motion/surface/glow-border | Custom colors | div | center | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:139](../../docs/motion/surface/glow-border.mdx#L139) |
| motion/surface/glow-border | Lit by an element | div | center | layout/geometry — minimize | [docs/motion/surface/glow-border.mdx:164](../../docs/motion/surface/glow-border.mdx#L164) |
| widgets/easing-editor | Spring and custom points | div | start | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:22](../../docs/widgets/easing-editor.mdx#L22) |
| compositions/map.examples | pinSvg | section | start | layout/geometry — minimize | [src/stories/map.examples.ts:110](../../src/stories/map.examples.ts#L110) |
| compositions/table-of-contents.examples | Changelog | div | start | layout/geometry — minimize | [src/stories/table-of-contents.examples.ts:141](../../src/stories/table-of-contents.examples.ts#L141) |
| components/table-of-contents | DocumentScroll | div | start | layout/geometry — minimize | [src/stories/table-of-contents.stories.ts:144](../../src/stories/table-of-contents.stories.ts#L144) |

<a id="property-25"></a>

### 25. box-sizing — 16 occurrences

| Value | Occurrences |
| --- | ---: |
| border-box | 13 |
| content-box | 3 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/carousel | Crossfade | tp-stack | content-box | manual review | [docs/components/carousel.mdx:184](../../docs/components/carousel.mdx#L184) |
| components/carousel | Crossfade | tp-stack | content-box | manual review | [docs/components/carousel.mdx:198](../../docs/components/carousel.mdx#L198) |
| components/carousel | Crossfade | tp-stack | content-box | manual review | [docs/components/carousel.mdx:213](../../docs/components/carousel.mdx#L213) |
| components/scroll-trigger | Replay on entry | p | border-box | manual review | [docs/components/scroll-trigger.mdx:61](../../docs/components/scroll-trigger.mdx#L61) |
| components/scroll-trigger | Scrubbed band | tp-stack | border-box | manual review | [docs/components/scroll-trigger.mdx:88](../../docs/components/scroll-trigger.mdx#L88) |
| components/scroll-trigger | Scrubbed band | div | border-box | manual review | [docs/components/scroll-trigger.mdx:108](../../docs/components/scroll-trigger.mdx#L108) |
| components/scroll-trigger | Custom scroll range | tp-stack | border-box | manual review | [docs/components/scroll-trigger.mdx:141](../../docs/components/scroll-trigger.mdx#L141) |
| components/scroll-trigger | Custom scroll range | div | border-box | manual review | [docs/components/scroll-trigger.mdx:183](../../docs/components/scroll-trigger.mdx#L183) |
| components/scroll-trigger | Pinned scene | div | border-box | manual review | [docs/components/scroll-trigger.mdx:206](../../docs/components/scroll-trigger.mdx#L206) |
| components/scroll-trigger | Pinned scene | div | border-box | manual review | [docs/components/scroll-trigger.mdx:221](../../docs/components/scroll-trigger.mdx#L221) |
| motion/text/text-mirror | Scrubbed by the scroll | tp-stack | border-box | manual review | [docs/motion/text/text-mirror.mdx:84](../../docs/motion/text/text-mirror.mdx#L84) |
| motion/text/text-mirror | Scrubbed by the scroll | div | border-box | manual review | [docs/motion/text/text-mirror.mdx:96](../../docs/motion/text/text-mirror.mdx#L96) |
| motion/text/text-split | Scrubbed by the scroll | tp-stack | border-box | manual review | [docs/motion/text/text-split.mdx:152](../../docs/motion/text/text-split.mdx#L152) |
| motion/text/text-split | Scrubbed by the scroll | div | border-box | manual review | [docs/motion/text/text-split.mdx:164](../../docs/motion/text/text-split.mdx#L164) |
| motion/text/text-stroke | Scrubbed by the scroll | tp-stack | border-box | manual review | [docs/motion/text/text-stroke.mdx:92](../../docs/motion/text/text-stroke.mdx#L92) |
| motion/text/text-stroke | Scrubbed by the scroll | div | border-box | manual review | [docs/motion/text/text-stroke.mdx:113](../../docs/motion/text/text-stroke.mdx#L113) |

<a id="property-26"></a>

### 26. object-fit — 16 occurrences

| Value | Occurrences |
| --- | ---: |
| cover | 16 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/carousel | Layered 3D | img | cover | manual review | [docs/components/carousel.mdx:255](../../docs/components/carousel.mdx#L255) |
| components/carousel | Layered 3D | img | cover | manual review | [docs/components/carousel.mdx:291](../../docs/components/carousel.mdx#L291) |
| components/carousel | Layered 3D | img | cover | manual review | [docs/components/carousel.mdx:327](../../docs/components/carousel.mdx#L327) |
| components/carousel | Parallax | img | cover | manual review | [docs/components/carousel.mdx:366](../../docs/components/carousel.mdx#L366) |
| components/carousel | Parallax | img | cover | manual review | [docs/components/carousel.mdx:369](../../docs/components/carousel.mdx#L369) |
| components/carousel | Parallax | img | cover | manual review | [docs/components/carousel.mdx:372](../../docs/components/carousel.mdx#L372) |
| components/carousel | Parallax | img | cover | manual review | [docs/components/carousel.mdx:375](../../docs/components/carousel.mdx#L375) |
| components/carousel | Focus | img | cover | manual review | [docs/components/carousel.mdx:397](../../docs/components/carousel.mdx#L397) |
| components/carousel | Focus | img | cover | manual review | [docs/components/carousel.mdx:401](../../docs/components/carousel.mdx#L401) |
| components/carousel | Focus | img | cover | manual review | [docs/components/carousel.mdx:405](../../docs/components/carousel.mdx#L405) |
| components/carousel | Focus | img | cover | manual review | [docs/components/carousel.mdx:409](../../docs/components/carousel.mdx#L409) |
| components/carousel | Focus | img | cover | manual review | [docs/components/carousel.mdx:413](../../docs/components/carousel.mdx#L413) |
| components/carousel | Shader transition | img | cover | manual review | [docs/components/carousel.mdx:471](../../docs/components/carousel.mdx#L471) |
| components/carousel | Shader transition | img | cover | manual review | [docs/components/carousel.mdx:507](../../docs/components/carousel.mdx#L507) |
| components/carousel | Shader transition | img | cover | manual review | [docs/components/carousel.mdx:543](../../docs/components/carousel.mdx#L543) |
| components/image | Loading placeholders | img | cover | manual review | [docs/components/image.mdx:74](../../docs/components/image.mdx#L74) |

<a id="property-27"></a>

### 27. padding-block — 16 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-space-6) | 14 |
| var(--tp-space-2) | 1 |
| var(--tp-space-4) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/badge | Interactive badges | tp-stack | var(--tp-space-2) | component spacing — review required | [docs/components/badge.mdx:102](../../docs/components/badge.mdx#L102) |
| components/bubble | Reactions | tp-stack | var(--tp-space-4) | component spacing — review required | [docs/components/bubble.mdx:83](../../docs/components/bubble.mdx#L83) |
| components/scroll-trigger | Replay on entry | p | var(--tp-space-6) | layout spacing — minimize | [docs/components/scroll-trigger.mdx:61](../../docs/components/scroll-trigger.mdx#L61) |
| components/scroll-trigger | Scrubbed band | tp-stack | var(--tp-space-6) | component spacing — review required | [docs/components/scroll-trigger.mdx:88](../../docs/components/scroll-trigger.mdx#L88) |
| components/scroll-trigger | Scrubbed band | div | var(--tp-space-6) | layout spacing — minimize | [docs/components/scroll-trigger.mdx:108](../../docs/components/scroll-trigger.mdx#L108) |
| components/scroll-trigger | Custom scroll range | tp-stack | var(--tp-space-6) | component spacing — review required | [docs/components/scroll-trigger.mdx:141](../../docs/components/scroll-trigger.mdx#L141) |
| components/scroll-trigger | Custom scroll range | div | var(--tp-space-6) | layout spacing — minimize | [docs/components/scroll-trigger.mdx:183](../../docs/components/scroll-trigger.mdx#L183) |
| components/scroll-trigger | Pinned scene | div | var(--tp-space-6) | layout spacing — minimize | [docs/components/scroll-trigger.mdx:206](../../docs/components/scroll-trigger.mdx#L206) |
| components/scroll-trigger | Pinned scene | div | var(--tp-space-6) | layout spacing — minimize | [docs/components/scroll-trigger.mdx:221](../../docs/components/scroll-trigger.mdx#L221) |
| motion/text/text-mirror | Scrubbed by the scroll | tp-stack | var(--tp-space-6) | component spacing — review required | [docs/motion/text/text-mirror.mdx:84](../../docs/motion/text/text-mirror.mdx#L84) |
| motion/text/text-mirror | Scrubbed by the scroll | div | var(--tp-space-6) | layout spacing — minimize | [docs/motion/text/text-mirror.mdx:96](../../docs/motion/text/text-mirror.mdx#L96) |
| motion/text/text-split | Scrubbed by the scroll | tp-stack | var(--tp-space-6) | component spacing — review required | [docs/motion/text/text-split.mdx:152](../../docs/motion/text/text-split.mdx#L152) |
| motion/text/text-split | Scrubbed by the scroll | div | var(--tp-space-6) | layout spacing — minimize | [docs/motion/text/text-split.mdx:164](../../docs/motion/text/text-split.mdx#L164) |
| motion/text/text-stroke | Scrubbed by the scroll | tp-stack | var(--tp-space-6) | component spacing — review required | [docs/motion/text/text-stroke.mdx:92](../../docs/motion/text/text-stroke.mdx#L92) |
| motion/text/text-stroke | Scrubbed by the scroll | div | var(--tp-space-6) | layout spacing — minimize | [docs/motion/text/text-stroke.mdx:113](../../docs/motion/text/text-stroke.mdx#L113) |
| compositions/presentation-primitives.examples | bubbleDefaults | tp-bubble-group | var(--tp-space-6) | component spacing — review required | [src/stories/presentation-primitives.examples.ts:18](../../src/stories/presentation-primitives.examples.ts#L18) |

<a id="property-28"></a>

### 28. height — 15 occurrences

| Value | Occurrences |
| --- | ---: |
| 12rem | 6 |
| 18rem | 3 |
| 16rem | 2 |
| auto | 2 |
| 14rem | 1 |
| 24rem | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| widgets/plot | Live signal | tp-plot | 12rem | layout/geometry — minimize | [docs/widgets/plot.mdx:10](../../docs/widgets/plot.mdx#L10) |
| widgets/plot | Distribution | tp-plot | auto | layout/geometry — minimize | [docs/widgets/plot.mdx:44](../../docs/widgets/plot.mdx#L44) |
| widgets/plot | Signed load | tp-plot | 12rem | layout/geometry — minimize | [docs/widgets/plot.mdx:67](../../docs/widgets/plot.mdx#L67) |
| widgets/plot | Service CPU | tp-plot | 16rem | layout/geometry — minimize | [docs/widgets/plot.mdx:81](../../docs/widgets/plot.mdx#L81) |
| widgets/plot | Push and revise | tp-plot | 12rem | layout/geometry — minimize | [docs/widgets/plot.mdx:113](../../docs/widgets/plot.mdx#L113) |
| widgets/plot | Guided signal | tp-plot | 14rem | layout/geometry — minimize | [docs/widgets/plot.mdx:155](../../docs/widgets/plot.mdx#L155) |
| widgets/plot | Inspect samples | tp-plot | 12rem | layout/geometry — minimize | [docs/widgets/plot.mdx:197](../../docs/widgets/plot.mdx#L197) |
| components/resizable-panel-group | Components/Resizable panel group | tp-resizable-panel-group | 18rem | layout/geometry — minimize | [src/stories/resizable-panel-group.stories.ts:40](../../src/stories/resizable-panel-group.stories.ts#L40) |
| components/resizable-panel-group | NestedWorkspace | tp-resizable-panel-group | 24rem | layout/geometry — minimize | [src/stories/resizable-panel-group.stories.ts:59](../../src/stories/resizable-panel-group.stories.ts#L59) |
| components/resizable-panel-group | Controlled | readonly | 18rem | layout/geometry — minimize | [src/stories/resizable-panel-group.stories.ts:84](../../src/stories/resizable-panel-group.stories.ts#L84) |
| components/resizable-panel-group | CollapsibleSidebar | tp-resizable-panel-group | 18rem | layout/geometry — minimize | [src/stories/resizable-panel-group.stories.ts:108](../../src/stories/resizable-panel-group.stories.ts#L108) |
| widgets/plot | Widgets/Plot | tp-plot | 12rem | layout/geometry — minimize | [src/stories/widgets/plot.stories.ts:94](../../src/stories/widgets/plot.stories.ts#L94) |
| widgets/plot | Histogram | tp-plot | auto | layout/geometry — minimize | [src/stories/widgets/plot.stories.ts:137](../../src/stories/widgets/plot.stories.ts#L137) |
| widgets/plot | SignedArea | tp-plot | 12rem | layout/geometry — minimize | [src/stories/widgets/plot.stories.ts:150](../../src/stories/widgets/plot.stories.ts#L150) |
| widgets/plot | Monitors | tp-plot | 16rem | layout/geometry — minimize | [src/stories/widgets/plot.stories.ts:167](../../src/stories/widgets/plot.stories.ts#L167) |

<a id="property-29"></a>

### 29. min-inline-size — 15 occurrences

| Value | Occurrences |
| --- | ---: |
| 0 | 7 |
| 12rem | 5 |
| 15rem | 3 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/field-group | Color channels | tp-field-group | 0 | layout/geometry — minimize | [docs/components/field-group.mdx:44](../../docs/components/field-group.mdx#L44) |
| components/list | Recordings | span | 0 | layout/geometry — minimize | [docs/components/list.mdx:253](../../docs/components/list.mdx#L253) |
| components/list | People and invitations | tp-stack | 0 | layout/geometry — minimize | [docs/components/list.mdx:292](../../docs/components/list.mdx#L292) |
| components/list | People and invitations | span | 0 | layout/geometry — minimize | [docs/components/list.mdx:347](../../docs/components/list.mdx#L347) |
| components/map | Map with a list | tp-map | 0 | layout/geometry — minimize | [docs/components/map.mdx:283](../../docs/components/map.mdx#L283) |
| components/navigation-menu | Navigation menu | tp-stack | 12rem | layout/geometry — minimize | [docs/components/navigation-menu.mdx:57](../../docs/components/navigation-menu.mdx#L57) |
| components/navigation-menu | Mixed items | tp-stack | 12rem | layout/geometry — minimize | [docs/components/navigation-menu.mdx:82](../../docs/components/navigation-menu.mdx#L82) |
| components/navigation-menu | Active link | tp-stack | 12rem | layout/geometry — minimize | [docs/components/navigation-menu.mdx:102](../../docs/components/navigation-menu.mdx#L102) |
| components/navigation-menu | Vertical | tp-stack | 12rem | layout/geometry — minimize | [docs/components/navigation-menu.mdx:122](../../docs/components/navigation-menu.mdx#L122) |
| components/navigation-menu | Vertical | tp-stack | 12rem | layout/geometry — minimize | [docs/components/navigation-menu.mdx:130](../../docs/components/navigation-menu.mdx#L130) |
| components/table | Prose column | tp-table-cell | 15rem | layout/geometry — minimize | [docs/components/table.mdx:294](../../docs/components/table.mdx#L294) |
| components/table | Prose column | tp-table-cell | 15rem | layout/geometry — minimize | [docs/components/table.mdx:299](../../docs/components/table.mdx#L299) |
| components/table | Prose column | tp-table-cell | 15rem | layout/geometry — minimize | [docs/components/table.mdx:304](../../docs/components/table.mdx#L304) |
| components/text-transform | Text transform | dd | 0 | layout/geometry — minimize | [docs/components/text-transform.mdx:21](../../docs/components/text-transform.mdx#L21) |
| compositions/map.examples | pinSvg | tp-stack | 0 | layout/geometry — minimize | [src/stories/map.examples.ts:111](../../src/stories/map.examples.ts#L111) |

<a id="property-30"></a>

### 30. place-items — 13 occurrences

| Value | Occurrences |
| --- | ---: |
| center | 13 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/aspect-ratio | Common ratios | div | center | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:28](../../docs/components/aspect-ratio.mdx#L28) |
| components/aspect-ratio | Common ratios | div | center | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:31](../../docs/components/aspect-ratio.mdx#L31) |
| components/aspect-ratio | Common ratios | div | center | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:34](../../docs/components/aspect-ratio.mdx#L34) |
| components/cursor | Cursor | span | center | layout/geometry — minimize | [docs/components/cursor.mdx:14](../../docs/components/cursor.mdx#L14) |
| components/cursor | Spring | div | center | layout/geometry — minimize | [docs/components/cursor.mdx:47](../../docs/components/cursor.mdx#L47) |
| components/cursor | Spring | div | center | layout/geometry — minimize | [docs/components/cursor.mdx:51](../../docs/components/cursor.mdx#L51) |
| components/cursor | Zones | span | center | layout/geometry — minimize | [docs/components/cursor.mdx:72](../../docs/components/cursor.mdx#L72) |
| components/cursor | Dot and ring | div | center | layout/geometry — minimize | [docs/components/cursor.mdx:134](../../docs/components/cursor.mdx#L134) |
| components/cursor | Reduced motion | div | center | layout/geometry — minimize | [docs/components/cursor.mdx:208](../../docs/components/cursor.mdx#L208) |
| components/image | Fallbacks | span | center | layout/geometry — minimize | [docs/components/image.mdx:60](../../docs/components/image.mdx#L60) |
| components/image | Reveal timing and repeat | p | center | layout/geometry — minimize | [docs/components/image.mdx:143](../../docs/components/image.mdx#L143) |
| components/menu | Context invocation | div | center | layout/geometry — minimize | [docs/components/menu.mdx:147](../../docs/components/menu.mdx#L147) |
| components/tooltip | Cursor tracking | div | center | layout/geometry — minimize | [docs/components/tooltip.mdx:69](../../docs/components/tooltip.mdx#L69) |

<a id="property-31"></a>

### 31. align-self — 11 occurrences

| Value | Occurrences |
| --- | ---: |
| flex-start | 8 |
| center | 1 |
| flex-end | 1 |
| stretch | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/autocomplete | In a form | tp-button | flex-start | layout/geometry — minimize | [docs/components/autocomplete.mdx:237](../../docs/components/autocomplete.mdx#L237) |
| components/color-input | In a form | tp-button | flex-start | layout/geometry — minimize | [docs/components/color-input.mdx:111](../../docs/components/color-input.mdx#L111) |
| components/drag-drop-list | Board lanes | tp-button | flex-start | layout/geometry — minimize | [docs/components/drag-drop-list.mdx:192](../../docs/components/drag-drop-list.mdx#L192) |
| components/message-scroller | Join marker as anchor | tp-button | flex-start | layout/geometry — minimize | [docs/components/message-scroller.mdx:201](../../docs/components/message-scroller.mdx#L201) |
| components/message-scroller | Commands | tp-button-group | flex-start | layout/geometry — minimize | [docs/components/message-scroller.mdx:244](../../docs/components/message-scroller.mdx#L244) |
| components/message-scroller | Prepend history | tp-button | flex-start | layout/geometry — minimize | [docs/components/message-scroller.mdx:428](../../docs/components/message-scroller.mdx#L428) |
| components/message-scroller | Animated send | tp-button | flex-start | layout/geometry — minimize | [docs/components/message-scroller.mdx:520](../../docs/components/message-scroller.mdx#L520) |
| components/text-area | Character count | output | flex-end | layout/geometry — minimize | [docs/components/text-area.mdx:93](../../docs/components/text-area.mdx#L93) |
| motion/text/text-stroke | Hide and reveal | p | stretch | layout/geometry — minimize | [docs/motion/text/text-stroke.mdx:58](../../docs/motion/text/text-stroke.mdx#L58) |
| widgets/flow | Automatic layout | tp-toggle-group | center | layout/geometry — minimize | [docs/widgets/flow.mdx:314](../../docs/widgets/flow.mdx#L314) |
| widgets/text-editor | Text editor | tp-toggle-group | flex-start | layout/geometry — minimize | [docs/widgets/text-editor.mdx:19](../../docs/widgets/text-editor.mdx#L19) |

<a id="property-32"></a>

### 32. inset-block-end — 11 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-space-6) | 6 |
| var(--tp-space-4) | 5 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/carousel | Layered 3D | figcaption | var(--tp-space-6) | layout/geometry — minimize | [docs/components/carousel.mdx:264](../../docs/components/carousel.mdx#L264) |
| components/carousel | Layered 3D | figcaption | var(--tp-space-6) | layout/geometry — minimize | [docs/components/carousel.mdx:300](../../docs/components/carousel.mdx#L300) |
| components/carousel | Layered 3D | figcaption | var(--tp-space-6) | layout/geometry — minimize | [docs/components/carousel.mdx:336](../../docs/components/carousel.mdx#L336) |
| components/carousel | Focus | figcaption | var(--tp-space-4) | layout/geometry — minimize | [docs/components/carousel.mdx:398](../../docs/components/carousel.mdx#L398) |
| components/carousel | Focus | figcaption | var(--tp-space-4) | layout/geometry — minimize | [docs/components/carousel.mdx:402](../../docs/components/carousel.mdx#L402) |
| components/carousel | Focus | figcaption | var(--tp-space-4) | layout/geometry — minimize | [docs/components/carousel.mdx:406](../../docs/components/carousel.mdx#L406) |
| components/carousel | Focus | figcaption | var(--tp-space-4) | layout/geometry — minimize | [docs/components/carousel.mdx:410](../../docs/components/carousel.mdx#L410) |
| components/carousel | Focus | figcaption | var(--tp-space-4) | layout/geometry — minimize | [docs/components/carousel.mdx:414](../../docs/components/carousel.mdx#L414) |
| components/carousel | Shader transition | figcaption | var(--tp-space-6) | layout/geometry — minimize | [docs/components/carousel.mdx:481](../../docs/components/carousel.mdx#L481) |
| components/carousel | Shader transition | figcaption | var(--tp-space-6) | layout/geometry — minimize | [docs/components/carousel.mdx:517](../../docs/components/carousel.mdx#L517) |
| components/carousel | Shader transition | figcaption | var(--tp-space-6) | layout/geometry — minimize | [docs/components/carousel.mdx:553](../../docs/components/carousel.mdx#L553) |

<a id="property-33"></a>

### 33. inset-inline-start — 11 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-space-6) | 6 |
| var(--tp-space-4) | 5 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/carousel | Layered 3D | figcaption | var(--tp-space-6) | layout/geometry — minimize | [docs/components/carousel.mdx:264](../../docs/components/carousel.mdx#L264) |
| components/carousel | Layered 3D | figcaption | var(--tp-space-6) | layout/geometry — minimize | [docs/components/carousel.mdx:300](../../docs/components/carousel.mdx#L300) |
| components/carousel | Layered 3D | figcaption | var(--tp-space-6) | layout/geometry — minimize | [docs/components/carousel.mdx:336](../../docs/components/carousel.mdx#L336) |
| components/carousel | Focus | figcaption | var(--tp-space-4) | layout/geometry — minimize | [docs/components/carousel.mdx:398](../../docs/components/carousel.mdx#L398) |
| components/carousel | Focus | figcaption | var(--tp-space-4) | layout/geometry — minimize | [docs/components/carousel.mdx:402](../../docs/components/carousel.mdx#L402) |
| components/carousel | Focus | figcaption | var(--tp-space-4) | layout/geometry — minimize | [docs/components/carousel.mdx:406](../../docs/components/carousel.mdx#L406) |
| components/carousel | Focus | figcaption | var(--tp-space-4) | layout/geometry — minimize | [docs/components/carousel.mdx:410](../../docs/components/carousel.mdx#L410) |
| components/carousel | Focus | figcaption | var(--tp-space-4) | layout/geometry — minimize | [docs/components/carousel.mdx:414](../../docs/components/carousel.mdx#L414) |
| components/carousel | Shader transition | figcaption | var(--tp-space-6) | layout/geometry — minimize | [docs/components/carousel.mdx:481](../../docs/components/carousel.mdx#L481) |
| components/carousel | Shader transition | figcaption | var(--tp-space-6) | layout/geometry — minimize | [docs/components/carousel.mdx:517](../../docs/components/carousel.mdx#L517) |
| components/carousel | Shader transition | figcaption | var(--tp-space-6) | layout/geometry — minimize | [docs/components/carousel.mdx:553](../../docs/components/carousel.mdx#L553) |

<a id="property-34"></a>

### 34. text-shadow — 11 occurrences

| Value | Occurrences |
| --- | ---: |
| 0 1px 12px rgb(0 0 0 / 55%) | 11 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/carousel | Layered 3D | figcaption | 0 1px 12px rgb(0 0 0 / 55%) | content appearance — review required | [docs/components/carousel.mdx:264](../../docs/components/carousel.mdx#L264) |
| components/carousel | Layered 3D | figcaption | 0 1px 12px rgb(0 0 0 / 55%) | content appearance — review required | [docs/components/carousel.mdx:300](../../docs/components/carousel.mdx#L300) |
| components/carousel | Layered 3D | figcaption | 0 1px 12px rgb(0 0 0 / 55%) | content appearance — review required | [docs/components/carousel.mdx:336](../../docs/components/carousel.mdx#L336) |
| components/carousel | Focus | figcaption | 0 1px 12px rgb(0 0 0 / 55%) | content appearance — review required | [docs/components/carousel.mdx:398](../../docs/components/carousel.mdx#L398) |
| components/carousel | Focus | figcaption | 0 1px 12px rgb(0 0 0 / 55%) | content appearance — review required | [docs/components/carousel.mdx:402](../../docs/components/carousel.mdx#L402) |
| components/carousel | Focus | figcaption | 0 1px 12px rgb(0 0 0 / 55%) | content appearance — review required | [docs/components/carousel.mdx:406](../../docs/components/carousel.mdx#L406) |
| components/carousel | Focus | figcaption | 0 1px 12px rgb(0 0 0 / 55%) | content appearance — review required | [docs/components/carousel.mdx:410](../../docs/components/carousel.mdx#L410) |
| components/carousel | Focus | figcaption | 0 1px 12px rgb(0 0 0 / 55%) | content appearance — review required | [docs/components/carousel.mdx:414](../../docs/components/carousel.mdx#L414) |
| components/carousel | Shader transition | figcaption | 0 1px 12px rgb(0 0 0 / 55%) | content appearance — review required | [docs/components/carousel.mdx:481](../../docs/components/carousel.mdx#L481) |
| components/carousel | Shader transition | figcaption | 0 1px 12px rgb(0 0 0 / 55%) | content appearance — review required | [docs/components/carousel.mdx:517](../../docs/components/carousel.mdx#L517) |
| components/carousel | Shader transition | figcaption | 0 1px 12px rgb(0 0 0 / 55%) | content appearance — review required | [docs/components/carousel.mdx:553](../../docs/components/carousel.mdx#L553) |

<a id="property-35"></a>

### 35. font-family — 10 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-font-mono) | 10 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/collapsible | Open change | p | var(--tp-font-mono) | content appearance — review required | [docs/components/collapsible.mdx:119](../../docs/components/collapsible.mdx#L119) |
| components/copy-button | Beside a value | dd | var(--tp-font-mono) | content appearance — review required | [docs/components/copy-button.mdx:54](../../docs/components/copy-button.mdx#L54) |
| components/copy-button | Beside a value | dd | var(--tp-font-mono) | content appearance — review required | [docs/components/copy-button.mdx:57](../../docs/components/copy-button.mdx#L57) |
| components/drag-drop-list | Controlled lanes | output | var(--tp-font-mono) | content appearance — review required | [docs/components/drag-drop-list.mdx:251](../../docs/components/drag-drop-list.mdx#L251) |
| components/form | Form | output | var(--tp-font-mono) | content appearance — review required | [docs/components/form.mdx:29](../../docs/components/form.mdx#L29) |
| components/form | Notification settings | output | var(--tp-font-mono) | content appearance — review required | [docs/components/form.mdx:79](../../docs/components/form.mdx#L79) |
| components/form | Repeated emails | output | var(--tp-font-mono) | content appearance — review required | [docs/components/form.mdx:211](../../docs/components/form.mdx#L211) |
| components/resizable-panel-group | Vertical | div | var(--tp-font-mono) | content appearance — review required | [docs/components/resizable-panel-group.mdx:76](../../docs/components/resizable-panel-group.mdx#L76) |
| components/resizable-panel-group | Layout events | output | var(--tp-font-mono) | content appearance — review required | [docs/components/resizable-panel-group.mdx:149](../../docs/components/resizable-panel-group.mdx#L149) |
| components/scroll-trigger | Reveal events | output | var(--tp-font-mono) | content appearance — review required | [docs/components/scroll-trigger.mdx:246](../../docs/components/scroll-trigger.mdx#L246) |

<a id="property-36"></a>

### 36. --tp-message-scroller-height — 8 occurrences

| Value | Occurrences |
| --- | ---: |
| 18rem | 3 |
| 16rem | 2 |
| 12rem | 1 |
| 14rem | 1 |
| 22rem | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/message-scroller | Message Scroller | tp-message-scroller | 22rem | token override — presentation/configuration review | [docs/components/message-scroller.mdx:11](../../docs/components/message-scroller.mdx#L11) |
| components/message-scroller | Streaming | tp-message-scroller | 18rem | token override — presentation/configuration review | [docs/components/message-scroller.mdx:75](../../docs/components/message-scroller.mdx#L75) |
| components/message-scroller | Join marker as anchor | tp-message-scroller | 18rem | token override — presentation/configuration review | [docs/components/message-scroller.mdx:172](../../docs/components/message-scroller.mdx#L172) |
| components/message-scroller | Commands | tp-message-scroller | 14rem | token override — presentation/configuration review | [docs/components/message-scroller.mdx:252](../../docs/components/message-scroller.mdx#L252) |
| components/message-scroller | Outline and edges | tp-message-scroller | 18rem | token override — presentation/configuration review | [docs/components/message-scroller.mdx:330](../../docs/components/message-scroller.mdx#L330) |
| components/message-scroller | Prepend history | tp-message-scroller | 16rem | token override — presentation/configuration review | [docs/components/message-scroller.mdx:434](../../docs/components/message-scroller.mdx#L434) |
| components/message-scroller | Animated send | tp-message-scroller | 16rem | token override — presentation/configuration review | [docs/components/message-scroller.mdx:506](../../docs/components/message-scroller.mdx#L506) |
| components/message-scroller | Open at the start | tp-message-scroller | 12rem | token override — presentation/configuration review | [docs/components/message-scroller.mdx:560](../../docs/components/message-scroller.mdx#L560) |

<a id="property-37"></a>

### 37. letter-spacing — 8 occurrences

| Value | Occurrences |
| --- | ---: |
| -0.02em | 8 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| motion/text/text-mirror | Text mirror | p | -0.02em | content appearance — review required | [docs/motion/text/text-mirror.mdx:9](../../docs/motion/text/text-mirror.mdx#L9) |
| motion/text/text-split | Text split | p | -0.02em | content appearance — review required | [docs/motion/text/text-split.mdx:9](../../docs/motion/text/text-split.mdx#L9) |
| motion/text/text-split | Characters from the center | p | -0.02em | content appearance — review required | [docs/motion/text/text-split.mdx:47](../../docs/motion/text/text-split.mdx#L47) |
| motion/text/text-stroke | Text stroke | p | -0.02em | content appearance — review required | [docs/motion/text/text-stroke.mdx:9](../../docs/motion/text/text-stroke.mdx#L9) |
| motion/text/text-stroke | Hide and reveal | p | -0.02em | content appearance — review required | [docs/motion/text/text-stroke.mdx:58](../../docs/motion/text/text-stroke.mdx#L58) |
| motion/text/text-stroke | Scrubbed by the scroll | p | -0.02em | content appearance — review required | [docs/motion/text/text-stroke.mdx:102](../../docs/motion/text/text-stroke.mdx#L102) |
| motion/text/text-mirror | Motion/Text/Text mirror | p | -0.02em | content appearance — review required | [src/stories/text-mirror.stories.ts:55](../../src/stories/text-mirror.stories.ts#L55) |
| motion/text/text-stroke | Motion/Text/Text stroke | p | -0.02em | content appearance — review required | [src/stories/text-stroke.stories.ts:55](../../src/stories/text-stroke.stories.ts#L55) |

<a id="property-38"></a>

### 38. align-content — 7 occurrences

| Value | Occurrences |
| --- | ---: |
| center | 4 |
| end | 2 |
| start | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/carousel | Bullets inside | blockquote | center | layout/geometry — minimize | [docs/components/carousel.mdx:101](../../docs/components/carousel.mdx#L101) |
| components/carousel | Bullets inside | blockquote | center | layout/geometry — minimize | [docs/components/carousel.mdx:105](../../docs/components/carousel.mdx#L105) |
| components/carousel | Bullets inside | blockquote | center | layout/geometry — minimize | [docs/components/carousel.mdx:109](../../docs/components/carousel.mdx#L109) |
| components/cursor | Zones | div | end | layout/geometry — minimize | [docs/components/cursor.mdx:73](../../docs/components/cursor.mdx#L73) |
| components/cursor | Zones | div | end | layout/geometry — minimize | [docs/components/cursor.mdx:80](../../docs/components/cursor.mdx#L80) |
| components/scroll-trigger | Pinned scene | div | start | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:206](../../docs/components/scroll-trigger.mdx#L206) |
| components/scroll-trigger | Pinned scene | div | center | layout/geometry — minimize | [docs/components/scroll-trigger.mdx:213](../../docs/components/scroll-trigger.mdx#L213) |

<a id="property-39"></a>

### 39. justify-items — 7 occurrences

| Value | Occurrences |
| --- | ---: |
| center | 4 |
| start | 3 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/popover | Separate anchor | tp-popover | start | layout/geometry — minimize | [docs/components/popover.mdx:115](../../docs/components/popover.mdx#L115) |
| motion/text/text-mirror | Hide and reveal | div | center | layout/geometry — minimize | [docs/motion/text/text-mirror.mdx:58](../../docs/motion/text/text-mirror.mdx#L58) |
| motion/text/text-split | Reveal on demand | div | center | layout/geometry — minimize | [docs/motion/text/text-split.mdx:75](../../docs/motion/text/text-split.mdx#L75) |
| widgets/easing-editor | Commit and veto | div | center | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:139](../../docs/widgets/easing-editor.mdx#L139) |
| widgets/easing-editor | Controlled owner | div | center | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:163](../../docs/widgets/easing-editor.mdx#L163) |
| components/cursor | Components/Cursor | div | start | layout/geometry — minimize | [src/stories/cursor.stories.ts:92](../../src/stories/cursor.stories.ts#L92) |
| compositions/table-of-contents.examples | Changelog | aside | start | layout/geometry — minimize | [src/stories/table-of-contents.examples.ts:148](../../src/stories/table-of-contents.examples.ts#L148) |

<a id="property-40"></a>

### 40. margin-block-start — 7 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-space-2) | 4 |
| var(--tp-space-3) | 3 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/aspect-ratio | One ratio, three widths | figcaption | var(--tp-space-2) | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:60](../../docs/components/aspect-ratio.mdx#L60) |
| components/aspect-ratio | One ratio, three widths | figcaption | var(--tp-space-2) | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:82](../../docs/components/aspect-ratio.mdx#L82) |
| components/aspect-ratio | One ratio, three widths | figcaption | var(--tp-space-2) | layout/geometry — minimize | [docs/components/aspect-ratio.mdx:104](../../docs/components/aspect-ratio.mdx#L104) |
| components/timeline | Changelog | tp-stack | var(--tp-space-2) | layout/geometry — minimize | [docs/components/timeline.mdx:214](../../docs/components/timeline.mdx#L214) |
| widgets/color-picker | Popup in a form | output | var(--tp-space-3) | layout/geometry — minimize | [docs/widgets/color-picker.mdx:66](../../docs/widgets/color-picker.mdx#L66) |
| widgets/emoji-picker | Popup in a form | output | var(--tp-space-3) | layout/geometry — minimize | [docs/widgets/emoji-picker.mdx:214](../../docs/widgets/emoji-picker.mdx#L214) |
| widgets/flow | In a form | output | var(--tp-space-3) | layout/geometry — minimize | [docs/widgets/flow.mdx:712](../../docs/widgets/flow.mdx#L712) |

<a id="property-41"></a>

### 41. padding-inline — 7 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-space-6) | 7 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/scroll-trigger | Replay on entry | div | var(--tp-space-6) | layout spacing — minimize | [docs/components/scroll-trigger.mdx:60](../../docs/components/scroll-trigger.mdx#L60) |
| components/scroll-trigger | Scrubbed band | div | var(--tp-space-6) | layout spacing — minimize | [docs/components/scroll-trigger.mdx:78](../../docs/components/scroll-trigger.mdx#L78) |
| components/scroll-trigger | Custom scroll range | div | var(--tp-space-6) | layout spacing — minimize | [docs/components/scroll-trigger.mdx:131](../../docs/components/scroll-trigger.mdx#L131) |
| components/scroll-trigger | Pinned scene | div | var(--tp-space-6) | layout spacing — minimize | [docs/components/scroll-trigger.mdx:205](../../docs/components/scroll-trigger.mdx#L205) |
| motion/text/text-mirror | Scrubbed by the scroll | div | var(--tp-space-6) | layout spacing — minimize | [docs/motion/text/text-mirror.mdx:74](../../docs/motion/text/text-mirror.mdx#L74) |
| motion/text/text-split | Scrubbed by the scroll | div | var(--tp-space-6) | layout spacing — minimize | [docs/motion/text/text-split.mdx:142](../../docs/motion/text/text-split.mdx#L142) |
| motion/text/text-stroke | Scrubbed by the scroll | div | var(--tp-space-6) | layout spacing — minimize | [docs/motion/text/text-stroke.mdx:82](../../docs/motion/text/text-stroke.mdx#L82) |

<a id="property-42"></a>

### 42. top — 7 occurrences

| Value | Occurrences |
| --- | ---: |
| 0 | 5 |
| 1.5rem | 1 |
| 2rem | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/markdown | With a table of contents | aside | 0 | layout/geometry — minimize | [docs/components/markdown.mdx:266](../../docs/components/markdown.mdx#L266) |
| components/table-of-contents | Table of contents | aside | 0 | layout/geometry — minimize | [docs/components/table-of-contents.mdx:31](../../docs/components/table-of-contents.mdx#L31) |
| components/table-of-contents | Nested sections | aside | 0 | layout/geometry — minimize | [docs/components/table-of-contents.mdx:88](../../docs/components/table-of-contents.mdx#L88) |
| components/table-of-contents | Collected targets | aside | 0 | layout/geometry — minimize | [docs/components/table-of-contents.mdx:197](../../docs/components/table-of-contents.mdx#L197) |
| components/table-of-contents | Compact | aside | 0 | layout/geometry — minimize | [docs/components/table-of-contents.mdx:250](../../docs/components/table-of-contents.mdx#L250) |
| compositions/table-of-contents.examples | Changelog | aside | 1.5rem | layout/geometry — minimize | [src/stories/table-of-contents.examples.ts:148](../../src/stories/table-of-contents.examples.ts#L148) |
| components/table-of-contents | DocumentScroll | aside | 2rem | layout/geometry — minimize | [src/stories/table-of-contents.stories.ts:158](../../src/stories/table-of-contents.stories.ts#L158) |

<a id="property-43"></a>

### 43. place-content — 6 occurrences

| Value | Occurrences |
| --- | ---: |
| center | 6 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/carousel | Autoplay | div | center | layout/geometry — minimize | [docs/components/carousel.mdx:130](../../docs/components/carousel.mdx#L130) |
| components/carousel | Autoplay | div | center | layout/geometry — minimize | [docs/components/carousel.mdx:134](../../docs/components/carousel.mdx#L134) |
| components/carousel | Autoplay | div | center | layout/geometry — minimize | [docs/components/carousel.mdx:138](../../docs/components/carousel.mdx#L138) |
| components/carousel | Commit | div | center | layout/geometry — minimize | [docs/components/carousel.mdx:632](../../docs/components/carousel.mdx#L632) |
| components/carousel | Commit | div | center | layout/geometry — minimize | [docs/components/carousel.mdx:642](../../docs/components/carousel.mdx#L642) |
| components/carousel | Commit | div | center | layout/geometry — minimize | [docs/components/carousel.mdx:652](../../docs/components/carousel.mdx#L652) |

<a id="property-44"></a>

### 44. scroll-margin-block-start — 6 occurrences

| Value | Occurrences |
| --- | ---: |
| 1.5rem | 5 |
| 2rem | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| compositions/table-of-contents.examples | Release notes | (attribute fragment; resolve call sites) | 1.5rem | manual review | [src/stories/table-of-contents.examples.ts:24](../../src/stories/table-of-contents.examples.ts#L24) |
| compositions/table-of-contents.examples | Changelog | div | 1.5rem | manual review | [src/stories/table-of-contents.examples.ts:143](../../src/stories/table-of-contents.examples.ts#L143) |
| compositions/table-of-contents.examples | Changelog | figure | 1.5rem | manual review | [src/stories/table-of-contents.examples.ts:144](../../src/stories/table-of-contents.examples.ts#L144) |
| compositions/table-of-contents.examples | Changelog | div | 1.5rem | manual review | [src/stories/table-of-contents.examples.ts:145](../../src/stories/table-of-contents.examples.ts#L145) |
| compositions/table-of-contents.examples | Changelog | div | 1.5rem | manual review | [src/stories/table-of-contents.examples.ts:146](../../src/stories/table-of-contents.examples.ts#L146) |
| components/table-of-contents | DocumentScroll | h2 | 2rem | manual review | [src/stories/table-of-contents.stories.ts:149](../../src/stories/table-of-contents.stories.ts#L149) |

<a id="property-45"></a>

### 45. --tp-cursor-size — 5 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-space-10) | 2 |
| var(--tp-space-12) | 2 |
| var(--tp-space-16) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/cursor | Spring | tp-cursor | var(--tp-space-10) | token override — presentation/configuration review | [docs/components/cursor.mdx:52](../../docs/components/cursor.mdx#L52) |
| components/cursor | Sticking | tp-cursor-zone | var(--tp-space-12) | token override — presentation/configuration review | [docs/components/cursor.mdx:119](../../docs/components/cursor.mdx#L119) |
| components/cursor | Dot and ring | tp-cursor | var(--tp-space-10) | token override — presentation/configuration review | [docs/components/cursor.mdx:138](../../docs/components/cursor.mdx#L138) |
| components/cursor | Dot and ring | tp-cursor-zone | var(--tp-space-16) | token override — presentation/configuration review | [docs/components/cursor.mdx:139](../../docs/components/cursor.mdx#L139) |
| components/cursor | Reduced motion | tp-cursor-zone | var(--tp-space-12) | token override — presentation/configuration review | [docs/components/cursor.mdx:210](../../docs/components/cursor.mdx#L210) |

<a id="property-46"></a>

### 46. font — 5 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-text-sm) var(--tp-font-mono) | 4 |
| inherit | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/input-group | Native textarea | textarea | inherit | content appearance — review required | [docs/components/input-group.mdx:252](../../docs/components/input-group.mdx#L252) |
| components/button | FormActions | output | var(--tp-text-sm) var(--tp-font-mono) | content appearance — review required | [src/stories/button.stories.ts:199](../../src/stories/button.stories.ts#L199) |
| components/questionnaire | Components/Questionnaire | output | var(--tp-text-sm) var(--tp-font-mono) | content appearance — review required | [src/stories/questionnaire.stories.ts:62](../../src/stories/questionnaire.stories.ts#L62) |
| compositions/slider.examples | Field and form submission | output | var(--tp-text-sm) var(--tp-font-mono) | content appearance — review required | [src/stories/slider.examples.ts:110](../../src/stories/slider.examples.ts#L110) |
| compositions/slider.examples | Rejecting proposals and observing commits | output | var(--tp-text-sm) var(--tp-font-mono) | content appearance — review required | [src/stories/slider.examples.ts:115](../../src/stories/slider.examples.ts#L115) |

<a id="property-47"></a>

### 47. justify-self — 5 occurrences

| Value | Occurrences |
| --- | ---: |
| start | 3 |
| center | 1 |
| stretch | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/cursor | Native passthrough | tp-button | start | layout/geometry — minimize | [docs/components/cursor.mdx:161](../../docs/components/cursor.mdx#L161) |
| components/dialog | Container modality | tp-button | start | layout/geometry — minimize | [docs/components/dialog.mdx:88](../../docs/components/dialog.mdx#L88) |
| components/form | Repeated emails | tp-button | start | layout/geometry — minimize | [docs/components/form.mdx:206](../../docs/components/form.mdx#L206) |
| components/qr-code | Connect a device | tp-qr-code | center | layout/geometry — minimize | [docs/components/qr-code.mdx:27](../../docs/components/qr-code.mdx#L27) |
| motion/text/text-split | Reveal on demand | p | stretch | layout/geometry — minimize | [docs/motion/text/text-split.mdx:76](../../docs/motion/text/text-split.mdx#L76) |

<a id="property-48"></a>

### 48. margin-block-end — 5 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-space-5) | 3 |
| var(--tp-space-3) | 2 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/checkbox | Select all | legend | var(--tp-space-3) | layout/geometry — minimize | [docs/components/checkbox.mdx:70](../../docs/components/checkbox.mdx#L70) |
| components/checkbox | CheckboxGroupController | legend | var(--tp-space-3) | layout/geometry — minimize | [docs/components/checkbox.mdx:119](../../docs/components/checkbox.mdx#L119) |
| components/table-of-contents | Collected targets | div | var(--tp-space-5) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:183](../../docs/components/table-of-contents.mdx#L183) |
| components/table-of-contents | Collected targets | div | var(--tp-space-5) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:187](../../docs/components/table-of-contents.mdx#L187) |
| components/table-of-contents | Collected targets | div | var(--tp-space-5) | layout/geometry — minimize | [docs/components/table-of-contents.mdx:191](../../docs/components/table-of-contents.mdx#L191) |

<a id="property-49"></a>

### 49. --tp-image-reveal-delay — 4 occurrences

| Value | Occurrences |
| --- | ---: |
| 100ms | 2 |
| 200ms | 2 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/image | Reveal timing and repeat | tp-image | 100ms | token override — presentation/configuration review | [docs/components/image.mdx:140](../../docs/components/image.mdx#L140) |
| components/image | Reveal timing and repeat | tp-image | 200ms | token override — presentation/configuration review | [docs/components/image.mdx:141](../../docs/components/image.mdx#L141) |
| components/image | Reveal timing and repeat | tp-image | 100ms | token override — presentation/configuration review | [docs/components/image.mdx:146](../../docs/components/image.mdx#L146) |
| components/image | Reveal timing and repeat | tp-image | 200ms | token override — presentation/configuration review | [docs/components/image.mdx:147](../../docs/components/image.mdx#L147) |

<a id="property-50"></a>

### 50. --tp-mo-border-segment-color — 4 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-border) | 3 |
| var(--tp-ring) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| motion/surface/segment-border | Traced in | tp-mo-border-segment | var(--tp-border) | token override — presentation/configuration review | [docs/motion/surface/segment-border.mdx:127](../../docs/motion/surface/segment-border.mdx#L127) |
| motion/surface/segment-border | Traced in | tp-mo-border-segment | var(--tp-border) | token override — presentation/configuration review | [docs/motion/surface/segment-border.mdx:135](../../docs/motion/surface/segment-border.mdx#L135) |
| motion/surface/segment-border | Traced in | tp-mo-border-segment | var(--tp-border) | token override — presentation/configuration review | [docs/motion/surface/segment-border.mdx:143](../../docs/motion/surface/segment-border.mdx#L143) |
| motion/surface/segment-border | Focus | tp-mo-segment-border | var(--tp-ring) | token override — presentation/configuration review | [docs/motion/surface/segment-border.mdx:156](../../docs/motion/surface/segment-border.mdx#L156) |

<a id="property-51"></a>

### 51. overflow-y — 4 occurrences

| Value | Occurrences |
| --- | ---: |
| auto | 4 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/image | Reveal timing and repeat | div | auto | layout/geometry — minimize | [docs/components/image.mdx:137](../../docs/components/image.mdx#L137) |
| components/image | Parallax in a scroller | div | auto | layout/geometry — minimize | [docs/components/image.mdx:186](../../docs/components/image.mdx#L186) |
| components/image | Scroll zoom in a vertical scroller | div | auto | layout/geometry — minimize | [docs/components/image.mdx:198](../../docs/components/image.mdx#L198) |
| components/image | Smoothing | div | auto | layout/geometry — minimize | [docs/components/image.mdx:272](../../docs/components/image.mdx#L272) |

<a id="property-52"></a>

### 52. padding-inline-start — 4 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-space-6) | 2 |
| var(--tp-space-4) | 1 |
| var(--tp-space-5) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/checkbox | Select all | tp-stack | var(--tp-space-6) | component spacing — review required | [docs/components/checkbox.mdx:75](../../docs/components/checkbox.mdx#L75) |
| components/checkbox | CheckboxGroupController | tp-stack | var(--tp-space-6) | component spacing — review required | [docs/components/checkbox.mdx:124](../../docs/components/checkbox.mdx#L124) |
| components/collapsible | Line-by-line reveal | ul | var(--tp-space-5) | layout spacing — minimize | [docs/components/collapsible.mdx:155](../../docs/components/collapsible.mdx#L155) |
| components/overflow-list | Custom count | ul | var(--tp-space-4) | layout spacing — minimize | [docs/components/overflow-list.mdx:152](../../docs/components/overflow-list.mdx#L152) |

<a id="property-53"></a>

### 53. --tp-timeline-gap — 3 occurrences

| Value | Occurrences |
| --- | ---: |
| 0 | 1 |
| var(--tp-space-4) | 1 |
| var(--tp-space-8) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/timeline | Expandable phases | tp-timeline | 0 | token override — presentation/configuration review | [docs/components/timeline.mdx:132](../../docs/components/timeline.mdx#L132) |
| components/timeline | Conversation | tp-timeline | var(--tp-space-4) | token override — presentation/configuration review | [docs/components/timeline.mdx:181](../../docs/components/timeline.mdx#L181) |
| components/timeline | Changelog | tp-timeline | var(--tp-space-8) | token override — presentation/configuration review | [docs/components/timeline.mdx:207](../../docs/components/timeline.mdx#L207) |

<a id="property-54"></a>

### 54. column-gap — 3 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-space-3) | 2 |
| var(--tp-space-4) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/copy-button | Beside a value | dl | var(--tp-space-4) | layout/geometry — minimize | [docs/components/copy-button.mdx:52](../../docs/components/copy-button.mdx#L52) |
| components/list | Recordings | span | var(--tp-space-3) | layout/geometry — minimize | [docs/components/list.mdx:252](../../docs/components/list.mdx#L252) |
| components/list | People and invitations | span | var(--tp-space-3) | layout/geometry — minimize | [docs/components/list.mdx:346](../../docs/components/list.mdx#L346) |

<a id="property-55"></a>

### 55. font-variant-numeric — 3 occurrences

| Value | Occurrences |
| --- | ---: |
| tabular-nums | 3 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/collapsible | Positional slots | span | tabular-nums | content appearance — review required | [docs/components/collapsible.mdx:53](../../docs/components/collapsible.mdx#L53) |
| components/collapsible | Positional slots | span | tabular-nums | content appearance — review required | [docs/components/collapsible.mdx:62](../../docs/components/collapsible.mdx#L62) |
| components/list | Recordings | span | tabular-nums | content appearance — review required | [docs/components/list.mdx:254](../../docs/components/list.mdx#L254) |

<a id="property-56"></a>

### 56. opacity — 3 occurrences

| Value | Occurrences |
| --- | ---: |
| 0.7 | 3 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/calendar | Nightly prices and booked dates | small | 0.7 | content appearance — review required | [docs/components/calendar.mdx:109](../../docs/components/calendar.mdx#L109) |
| components/carousel | Crossfade | span | 0.7 | content appearance — review required | [docs/components/carousel.mdx:209](../../docs/components/carousel.mdx#L209) |
| components/cursor | Zones | span | 0.7 | content appearance — review required | [docs/components/cursor.mdx:75](../../docs/components/cursor.mdx#L75) |

<a id="property-57"></a>

### 57. white-space — 3 occurrences

| Value | Occurrences |
| --- | ---: |
| normal | 1 |
| nowrap | 1 |
| pre-line | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/scroll-area | Both axes | table | nowrap | manual review | [docs/components/scroll-area.mdx:87](../../docs/components/scroll-area.mdx#L87) |
| components/table | Prose column | tp-table | normal | manual review | [docs/components/table.mdx:282](../../docs/components/table.mdx#L282) |
| widgets/text-editor | In a form | output | pre-line | manual review | [docs/widgets/text-editor.mdx:576](../../docs/widgets/text-editor.mdx#L576) |

<a id="property-58"></a>

### 58. --tp-mo-glow-border-colors — 2 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-chart-4), var(--tp-chart-5), var(--tp-chart-1) | 1 |
| var(--tp-ring) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| motion/surface/glow-border | Custom colors | tp-mo-glow-border | var(--tp-chart-4), var(--tp-chart-5), var(--tp-chart-1) | token override — presentation/configuration review | [docs/motion/surface/glow-border.mdx:140](../../docs/motion/surface/glow-border.mdx#L140) |
| motion/surface/glow-border | Custom colors | tp-mo-glow-border | var(--tp-ring) | token override — presentation/configuration review | [docs/motion/surface/glow-border.mdx:149](../../docs/motion/surface/glow-border.mdx#L149) |

<a id="property-59"></a>

### 59. --tp-mo-glow-border-fill — 2 occurrences

| Value | Occurrences |
| --- | ---: |
| 0.08 | 1 |
| 0.12 | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| motion/surface/glow-border | Lingering light | tp-mo-glow-border | 0.12 | token override — presentation/configuration review | [docs/motion/surface/glow-border.mdx:124](../../docs/motion/surface/glow-border.mdx#L124) |
| motion/surface/glow-border | Custom colors | tp-mo-glow-border | 0.08 | token override — presentation/configuration review | [docs/motion/surface/glow-border.mdx:140](../../docs/motion/surface/glow-border.mdx#L140) |

<a id="property-60"></a>

### 60. --tp-mo-glow-border-loop-delay — 2 occurrences

| Value | Occurrences |
| --- | ---: |
| 0.8s | 1 |
| 1.5s | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| motion/surface/glow-border | Comets | tp-mo-glow-border | 0.8s | token override — presentation/configuration review | [docs/motion/surface/glow-border.mdx:65](../../docs/motion/surface/glow-border.mdx#L65) |
| motion/surface/glow-border | Sweep, pulse and glint | tp-mo-glow-border | 1.5s | token override — presentation/configuration review | [docs/motion/surface/glow-border.mdx:94](../../docs/motion/surface/glow-border.mdx#L94) |

<a id="property-61"></a>

### 61. flex-direction — 2 occurrences

| Value | Occurrences |
| --- | ---: |
| column | 2 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/list | Recordings | span | column | layout/geometry — minimize | [docs/components/list.mdx:253](../../docs/components/list.mdx#L253) |
| components/list | People and invitations | span | column | layout/geometry — minimize | [docs/components/list.mdx:347](../../docs/components/list.mdx#L347) |

<a id="property-62"></a>

### 62. max-block-size — 2 occurrences

| Value | Occurrences |
| --- | ---: |
| 18rem | 1 |
| calc(var(--tp-spacing) * 72) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/table | Sticky edges | tp-table | 18rem | layout/geometry — minimize | [docs/components/table.mdx:241](../../docs/components/table.mdx#L241) |
| compositions/table.examples | tableDefaults | tp-table | calc(var(--tp-spacing) * 72) | layout/geometry — minimize | [src/stories/table.examples.ts:226](../../src/stories/table.examples.ts#L226) |

<a id="property-63"></a>

### 63. --tp-calendar-cell-size — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| calc(var(--tp-spacing) * 14) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/calendar | Nightly prices and booked dates | tp-calendar | calc(var(--tp-spacing) * 14) | token override — presentation/configuration review | [docs/components/calendar.mdx:90](../../docs/components/calendar.mdx#L90) |

<a id="property-64"></a>

### 64. --tp-cursor-blend — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| difference | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/cursor | Zones | tp-cursor-zone | difference | token override — presentation/configuration review | [docs/components/cursor.mdx:71](../../docs/components/cursor.mdx#L71) |

<a id="property-65"></a>

### 65. --tp-cursor-color — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| white | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/cursor | Zones | tp-cursor-zone | white | token override — presentation/configuration review | [docs/components/cursor.mdx:71](../../docs/components/cursor.mdx#L71) |

<a id="property-66"></a>

### 66. --tp-cursor-opacity — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| 0.5 | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/cursor | Dot and ring | tp-cursor-zone | 0.5 | token override — presentation/configuration review | [docs/components/cursor.mdx:139](../../docs/components/cursor.mdx#L139) |

<a id="property-67"></a>

### 67. --tp-image-reveal-duration — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| 900ms | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/image | Reveal timing and repeat | div | 900ms | token override — presentation/configuration review | [docs/components/image.mdx:137](../../docs/components/image.mdx#L137) |

<a id="property-68"></a>

### 68. --tp-image-reveal-easing — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| cubic-bezier(0.16, 1, 0.3, 1) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/image | Reveal timing and repeat | div | cubic-bezier(0.16, 1, 0.3, 1) | token override — presentation/configuration review | [docs/components/image.mdx:137](../../docs/components/image.mdx#L137) |

<a id="property-69"></a>

### 69. --tp-mo-border-segment-width — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| 2px | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| motion/surface/segment-border | Focus | tp-mo-segment-border | 2px | token override — presentation/configuration review | [docs/motion/surface/segment-border.mdx:156](../../docs/motion/surface/segment-border.mdx#L156) |

<a id="property-70"></a>

### 70. --tp-mo-glow-border-fade-duration — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| 700ms | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| motion/surface/glow-border | Lingering light | tp-mo-glow-border | 700ms | token override — presentation/configuration review | [docs/motion/surface/glow-border.mdx:124](../../docs/motion/surface/glow-border.mdx#L124) |

<a id="property-71"></a>

### 71. --tp-mo-glow-border-fade-easing — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| ease-out | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| motion/surface/glow-border | Lingering light | tp-mo-glow-border | ease-out | token override — presentation/configuration review | [docs/motion/surface/glow-border.mdx:124](../../docs/motion/surface/glow-border.mdx#L124) |

<a id="property-72"></a>

### 72. --tp-mo-glow-border-fade-out-delay — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| 600ms | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| motion/surface/glow-border | Lingering light | tp-mo-glow-border | 600ms | token override — presentation/configuration review | [docs/motion/surface/glow-border.mdx:124](../../docs/motion/surface/glow-border.mdx#L124) |

<a id="property-73"></a>

### 73. --tp-mo-glow-border-loop-easing — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| ease-in-out | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| motion/surface/glow-border | Comets | tp-mo-glow-border | ease-in-out | token override — presentation/configuration review | [docs/motion/surface/glow-border.mdx:65](../../docs/motion/surface/glow-border.mdx#L65) |

<a id="property-74"></a>

### 74. --tp-mo-segment-border-color — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| transparent | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| motion/surface/segment-border | Traced in | div | transparent | token override — presentation/configuration review | [docs/motion/surface/segment-border.mdx:121](../../docs/motion/surface/segment-border.mdx#L121) |

<a id="property-75"></a>

### 75. --tp-mo-text-stroke-duration — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| 2.4s | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| motion/text/text-stroke | Heavier outline | p | 2.4s | token override — presentation/configuration review | [docs/motion/text/text-stroke.mdx:39](../../docs/motion/text/text-stroke.mdx#L39) |

<a id="property-76"></a>

### 76. --tp-mo-text-stroke-width — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| 0.05em | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| motion/text/text-stroke | Heavier outline | p | 0.05em | token override — presentation/configuration review | [docs/motion/text/text-stroke.mdx:39](../../docs/motion/text/text-stroke.mdx#L39) |

<a id="property-77"></a>

### 77. --tp-primary — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| #2622a5 | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| widgets/color-picker | Controlled owner | tp-button | #2622a5 | token override — presentation/configuration review | [docs/widgets/color-picker.mdx:240](../../docs/widgets/color-picker.mdx#L240) |

<a id="property-78"></a>

### 78. --tp-primary-foreground — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| #fff | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| widgets/color-picker | Controlled owner | tp-button | #fff | token override — presentation/configuration review | [docs/widgets/color-picker.mdx:240](../../docs/widgets/color-picker.mdx#L240) |

<a id="property-79"></a>

### 79. --tp-qr-code-background — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| #eff6ff | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/qr-code | Sizes and colors | tp-qr-code | #eff6ff | token override — presentation/configuration review | [docs/components/qr-code.mdx:159](../../docs/components/qr-code.mdx#L159) |

<a id="property-80"></a>

### 80. --tp-qr-code-foreground — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| #1e3a8a | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/qr-code | Sizes and colors | tp-qr-code | #1e3a8a | token override — presentation/configuration review | [docs/components/qr-code.mdx:159](../../docs/components/qr-code.mdx#L159) |

<a id="property-81"></a>

### 81. --tp-qr-code-size — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| 12rem | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/qr-code | Sizes and colors | tp-qr-code | 12rem | token override — presentation/configuration review | [docs/components/qr-code.mdx:159](../../docs/components/qr-code.mdx#L159) |

<a id="property-82"></a>

### 82. --tp-scroll-trigger-pin-length — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| 150cqb | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/scroll-trigger | Pinned scene | tp-scroll-trigger | 150cqb | token override — presentation/configuration review | [docs/components/scroll-trigger.mdx:212](../../docs/components/scroll-trigger.mdx#L212) |

<a id="property-83"></a>

### 83. --tp-shimmer-iterations — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| 1 | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/marker | Completion reveal | tp-marker | 1 | token override — presentation/configuration review | [docs/components/marker.mdx:169](../../docs/components/marker.mdx#L169) |

<a id="property-84"></a>

### 84. --tp-syntax-comment — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-muted-foreground) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/code-block | Token theme | tp-stack | var(--tp-muted-foreground) | token override — presentation/configuration review | [docs/components/code-block.mdx:150](../../docs/components/code-block.mdx#L150) |

<a id="property-85"></a>

### 85. --tp-syntax-function — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| light-dark(#1d4ed8, #93c5fd) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/code-block | Token theme | tp-stack | light-dark(#1d4ed8, #93c5fd) | token override — presentation/configuration review | [docs/components/code-block.mdx:150](../../docs/components/code-block.mdx#L150) |

<a id="property-86"></a>

### 86. --tp-syntax-keyword — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| light-dark(#6d28d9, #c4b5fd) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/code-block | Token theme | tp-stack | light-dark(#6d28d9, #c4b5fd) | token override — presentation/configuration review | [docs/components/code-block.mdx:150](../../docs/components/code-block.mdx#L150) |

<a id="property-87"></a>

### 87. --tp-syntax-string — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| light-dark(#047857, #6ee7b7) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/code-block | Token theme | tp-stack | light-dark(#047857, #6ee7b7) | token override — presentation/configuration review | [docs/components/code-block.mdx:150](../../docs/components/code-block.mdx#L150) |

<a id="property-88"></a>

### 88. --tp-timeline-item-min-size — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| 12rem | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/timeline | Roadmap | tp-timeline | 12rem | token override — presentation/configuration review | [docs/components/timeline.mdx:62](../../docs/components/timeline.mdx#L62) |

<a id="property-89"></a>

### 89. --tp-timeline-marker-offset — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-space-2-5) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/timeline | Expandable phases | tp-timeline | var(--tp-space-2-5) | token override — presentation/configuration review | [docs/components/timeline.mdx:132](../../docs/components/timeline.mdx#L132) |

<a id="property-90"></a>

### 90. border-collapse — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| collapse | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/scroll-area | Both axes | table | collapse | content appearance — review required | [docs/components/scroll-area.mdx:87](../../docs/components/scroll-area.mdx#L87) |

<a id="property-91"></a>

### 91. color-scheme — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| dark | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| compositions/map.examples | Token theme | div | dark | manual review | [src/stories/map.examples.ts:246](../../src/stories/map.examples.ts#L246) |

<a id="property-92"></a>

### 92. container-type — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| size | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/scroll-trigger | Pinned scene | div | size | manual review | [docs/components/scroll-trigger.mdx:205](../../docs/components/scroll-trigger.mdx#L205) |

<a id="property-93"></a>

### 93. field-sizing — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| content | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/input-group | Native textarea | textarea | content | manual review | [docs/components/input-group.mdx:252](../../docs/components/input-group.mdx#L252) |

<a id="property-94"></a>

### 94. filter — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| blur(12px) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/image | Loading placeholders | img | blur(12px) | content appearance — review required | [docs/components/image.mdx:74](../../docs/components/image.mdx#L74) |

<a id="property-95"></a>

### 95. flex-wrap — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| wrap | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| widgets/easing-editor | Spring and custom points | div | wrap | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:22](../../docs/widgets/easing-editor.mdx#L22) |

<a id="property-96"></a>

### 96. grid-column — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| span 2 | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| compositions/map.examples | pinSvg | tp-stack | span 2 | layout/geometry — minimize | [src/stories/map.examples.ts:111](../../src/stories/map.examples.ts#L111) |

<a id="property-97"></a>

### 97. isolation — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| isolate | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/dialog | Container modality | section | isolate | manual review | [docs/components/dialog.mdx:82](../../docs/components/dialog.mdx#L82) |

<a id="property-98"></a>

### 98. justify-content — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| center | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| widgets/easing-editor | Spring and custom points | div | center | layout/geometry — minimize | [docs/widgets/easing-editor.mdx:22](../../docs/widgets/easing-editor.mdx#L22) |

<a id="property-99"></a>

### 99. list-style — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| none | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/time | Time | ul | none | manual review | [docs/components/time.mdx:13](../../docs/components/time.mdx#L13) |

<a id="property-100"></a>

### 100. margin-inline-end — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| auto | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/input-group | Composer | span | auto | layout/geometry — minimize | [docs/components/input-group.mdx:232](../../docs/components/input-group.mdx#L232) |

<a id="property-101"></a>

### 101. max-width — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| 100% | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/resizable-panel-group | Components/Resizable panel group | tp-resizable-panel-group | 100% | layout/geometry — minimize | [src/stories/resizable-panel-group.stories.ts:40](../../src/stories/resizable-panel-group.stories.ts#L40) |

<a id="property-102"></a>

### 102. overflow-x — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| auto | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/image | Horizontal strip | div | auto | layout/geometry — minimize | [docs/components/image.mdx:259](../../docs/components/image.mdx#L259) |

<a id="property-103"></a>

### 103. padding-block-end — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-space-4) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/timeline | Roadmap | tp-timeline | var(--tp-space-4) | component spacing — review required | [docs/components/timeline.mdx:62](../../docs/components/timeline.mdx#L62) |

<a id="property-104"></a>

### 104. resize — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| vertical | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/input-group | Native textarea | textarea | vertical | layout/geometry — minimize | [docs/components/input-group.mdx:252](../../docs/components/input-group.mdx#L252) |

<a id="property-105"></a>

### 105. row-gap — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-space-2) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/copy-button | Beside a value | dl | var(--tp-space-2) | layout/geometry — minimize | [docs/components/copy-button.mdx:52](../../docs/components/copy-button.mdx#L52) |

<a id="property-106"></a>

### 106. text-underline-offset — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| var(--tp-space-1) | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/empty-state | Bordered and filled | a | var(--tp-space-1) | manual review | [docs/components/empty-state.mdx:111](../../docs/components/empty-state.mdx#L111) |

<a id="property-107"></a>

### 107. width — 1 occurrences

| Value | Occurrences |
| --- | ---: |
| 40rem | 1 |

| Component/page or composition owner | Use case | Target | Exact value | Triage | Source |
| --- | --- | --- | --- | --- | --- |
| components/resizable-panel-group | Components/Resizable panel group | tp-resizable-panel-group | 40rem | layout/geometry — minimize | [src/stories/resizable-panel-group.stories.ts:40](../../src/stories/resizable-panel-group.stories.ts#L40) |

## Dynamic styles, hooks and demo stylesheets — 265 source sites

These sites are not in the ranked static declaration totals. Hooks nested in an assignment can appear at both boundaries; they are not separate runtime effects.

### components/avatar / Icon count in an empty state

**presentation hook** · target: resolve from expression · [docs/components/avatar.mdx:97](../../docs/components/avatar.mdx#L97)

~~~~~text
partContracts = {
  'avatar-overflow-count': {
    content: html\`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>\`,
  },
};`}
/>

The `avatar-overflow-count` part can render an icon in place of the number through `partContracts`. It still announces the three people who aren't shown.

### Shape and grayscale

<Preview
  title="Custom shape and grayscale"
  code={`<tp-stack direction="row" gap="4" align="center" wrap="wrap">
  <tp-avatar
    size="lg"
    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop"
    fallback="MC"
    alt="Maya Chen"
    style="border-radius: var(--tp-radius-lg)"
  ></tp-avatar>
  <tp-avatar
    size="lg"
    fallback="AC"
    alt="Acme Inc."
    style="border-radius: var(--tp-radius-lg)"
  ></tp-avatar>
  <tp-avatar-group id="avatar-grayscale">
    <tp-avatar
      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop"
      fallback="DK"
      alt="Daniel Kim"
    ></tp-avatar>
    <tp-avatar
      src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop"
      fallback="AO"
      alt="Amara Okafor"
    ></tp-avatar>
    <tp-avatar
      src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop"
      fallback="NW"
      alt="Noah Williams"
    ></tp-avatar>
  </tp-avatar-group>
</tp-stack>`}
  script={`await customElements.whenDefined('tp-avatar');
for (const avatar of document.querySelectorAll('#avatar-grayscale tp-avatar')) {
  avatar.partPresentation = { 'avatar-image': { styleHook: { filter: 'grayscale(1)' } } };
}`}
/>

A `border-radius` on the avatar reshapes the image and the fallback alike, which suits companies and workspaces. `partPresentation` styles the `avatar-image` part alone, so a grayscale filter, for example for people who have left, leaves fallbacks and badges in color.

### Beside a name

<Preview
  title="Decorative avatar"
  code={`<tp-stack direction="row" gap="3" align="center">
  <tp-avatar
    aria-hidden="true"
    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop"
    fallback="MC"
  ></tp-avatar>
  <div>
    <div style="font-weight: var(--tp-font-medium)">Maya Chen</div>
    <div style="color: var(--tp-muted-foreground); font-size: var(--tp-text-sm)">
      maya@northwind.io
    </div>
  </div>
</tp-stack>`}
/>

When a visible name sits next to the avatar, mark the avatar `aria-hidden="true"` so screen readers don't announce the person twice.

~~~~~

### components/avatar / Custom shape and grayscale

**presentation hook** · target: resolve from expression · [docs/components/avatar.mdx:144](../../docs/components/avatar.mdx#L144)

~~~~~text
partPresentation = { 'avatar-image': { styleHook: { filter: 'grayscale(1)' } } }
~~~~~

### components/avatar / Custom shape and grayscale

**presentation hook** · target: resolve from expression · [docs/components/avatar.mdx:144](../../docs/components/avatar.mdx#L144)

~~~~~text
styleHook: { filter: 'grayscale(1)' }
~~~~~

### components/badge / Interactive badges

**presentation hook** · target: resolve from expression · [docs/components/badge.mdx:128](../../docs/components/badge.mdx#L128)

~~~~~text
partContracts = badge.hasAttribute('data-link') ? asLink : asButton;
~~~~~

### components/bubble / Expandable message

**presentation hook** · target: resolve from expression · [docs/components/bubble.mdx:135](../../docs/components/bubble.mdx#L135)

~~~~~text
partContracts = {
  'collapsible-label': { content: ({ open }) => (open ? 'Show less' : 'Show more') },
}
~~~~~

### components/bubble / Expandable message

**presentation hook** · target: resolve from expression · [docs/components/bubble.mdx:138](../../docs/components/bubble.mdx#L138)

~~~~~text
partPresentation = {
  'collapsible-trigger': { styleHook: { 'padding-inline': '0', 'inline-size': 'fit-content' } },
  'collapsible-content-body': { styleHook: { 'padding-inline': '0' } },
}
~~~~~

### components/bubble / Expandable message

**presentation hook** · target: resolve from expression · [docs/components/bubble.mdx:139](../../docs/components/bubble.mdx#L139)

~~~~~text
styleHook: { 'padding-inline': '0', 'inline-size': 'fit-content' }
~~~~~

### components/bubble / Expandable message

**presentation hook** · target: resolve from expression · [docs/components/bubble.mdx:140](../../docs/components/bubble.mdx#L140)

~~~~~text
styleHook: { 'padding-inline': '0' }
~~~~~

### components/bubble / Quick replies

**presentation hook** · target: resolve from expression · [docs/components/bubble.mdx:166](../../docs/components/bubble.mdx#L166)

~~~~~text
partContracts = {
  'bubble-content': {
    renderDelegate: ({ bind, content }) => html\`<a href="#buttons-and-links" \${bind}>\${content}</a>\`,
  },
};
for (const reply of thread.querySelectorAll('[data-reply]')) {
  reply.partContracts = {
    'bubble-content': {
      renderDelegate: ({ bind, content }) => html\`<button type="button" \${bind}>\${content}</button>\`,
    },
  };
  reply.addEventListener('click', () => {
    const sent = document.createElement('tp-bubble');
    sent.align = 'end';
    sent.variant = 'tinted';
    sent.textContent = reply.textContent;
    thread.querySelector('[data-suggestions]').replaceWith(sent);
  });
}`}
/>

A whole bubble can be a link or a button. `partContracts` renders the `bubble-content` part as a native `a` or `button`, which keeps the bubble's look and gives it real link or button behavior. Here the suggested replies send themselves when picked.

`partContracts['bubble-content']` also supports content and render delegation for a native interactive content host; delegates must retain the supplied binding and give interactive hosts a name. A render delegate must apply its supplied `bind` directive to the semantic host and render the supplied `content`; this preserves component state and slot behavior.

~~~~~

### components/bubble / Quick replies

**presentation hook** · target: resolve from expression · [docs/components/bubble.mdx:172](../../docs/components/bubble.mdx#L172)

~~~~~text
partContracts = {
    'bubble-content': {
      renderDelegate: ({ bind, content }) => html\`<button type="button" \${bind}>\${content}</button>\`,
    },
  };
  reply.addEventListener('click', () => {
    const sent = document.createElement('tp-bubble');
    sent.align = 'end';
    sent.variant = 'tinted';
    sent.textContent = reply.textContent;
    thread.querySelector('[data-suggestions]').replaceWith(sent);
  });
}`}
/>

A whole bubble can be a link or a button. `partContracts` renders the `bubble-content` part as a native `a` or `button`, which keeps the bubble's look and gives it real link or button behavior. Here the suggested replies send themselves when picked.

`partContracts['bubble-content']` also supports content and render delegation for a native interactive content host; delegates must retain the supplied binding and give interactive hosts a name. A render delegate must apply its supplied `bind` directive to the semantic host and render the supplied `content`; this preserves component state and slot behavior.

~~~~~

### components/button-group / Grouped pagination

**presentation hook** · target: resolve from expression · [docs/components/button-group.mdx:463](../../docs/components/button-group.mdx#L463)

~~~~~text
partContracts = {
    'pagination-page-link': asButton,
    'pagination-previous': asButton,
    'pagination-next': asButton,
  }
~~~~~

### components/button / Disabled

**presentation hook** · target: resolve from expression · [docs/components/button.mdx:156](../../docs/components/button.mdx#L156)

~~~~~text
partContracts = {
  button: {
    hostProperties: { title: 'Save changes' },
    renderDelegate: ({ bind, content }) => html\`<span \${bind}>\${content}</span>\`,
    elementReference: (element) => console.log(element),
  },
};`} language="js" />

Consumer handlers run before the corresponding Button handler. Call `event.preventComponentHandling()` to suppress that component action while preserving native default prevention as a separate channel. `preventDefault()` still cancels a queued submit/reset. Disabled controls block activation before consumer click handlers. For a link, suppressing its click action also prevents navigation.

~~~~~

### components/button / Disabled

**presentation hook** · target: resolve from expression · [docs/components/button.mdx:158](../../docs/components/button.mdx#L158)

~~~~~text
hostProperties: { title: 'Save changes' }
~~~~~

### components/calendar / In a popover

**presentation hook** · target: resolve from expression · [docs/components/calendar.mdx:322](../../docs/components/calendar.mdx#L322)

~~~~~text
partContracts = {
    button: {
      styleHook: {
        'justify-content': 'flex-start',
        'font-weight': 'var(--tp-font-normal)',
        ...(empty ? { color: 'var(--tp-muted-foreground)' } : {}),
      },
    },
  }
~~~~~

### components/calendar / In a popover

**presentation hook** · target: resolve from expression · [docs/components/calendar.mdx:324](../../docs/components/calendar.mdx#L324)

~~~~~text
styleHook: {
        'justify-content': 'flex-start',
        'font-weight': 'var(--tp-font-normal)',
        ...(empty ? { color: 'var(--tp-muted-foreground)' } : {}),
      }
~~~~~

### components/cursor / Programmatic state

**embedded stylesheet** · target: resolve from expression · [docs/components/cursor.mdx:182](../../docs/components/cursor.mdx#L182)

~~~~~text
<style>
    #cursor-state tp-cursor[data-cursor-state="loading"] { --tp-cursor-size: var(--tp-space-12); --tp-cursor-opacity: 0.4; }
    #cursor-state tp-cursor[data-cursor-state="blocked"] { --tp-cursor-color: var(--tp-destructive); --tp-cursor-radius: var(--tp-radius-sm); }
  </style>
~~~~~

### components/chart / Chart

**JS style write** · target: resolve from expression · [docs/components/chart.mdx:56](../../docs/components/chart.mdx#L56)

~~~~~text
group.style.outline = 'none';
~~~~~

### components/chart / Line chart

**JS style write** · target: resolve from expression · [docs/components/chart.mdx:143](../../docs/components/chart.mdx#L143)

~~~~~text
dot.style.outline = 'none';
~~~~~

### components/chart / Description and table

**embedded stylesheet** · target: resolve from expression · [docs/components/chart.mdx:177](../../docs/components/chart.mdx#L177)

~~~~~text
<style>
  #chart-demo-table::part(chart-plot-region) { aspect-ratio: 3 / 1; }
</style>
~~~~~

### components/empty-state / Bordered and filled

**embedded stylesheet** · target: resolve from expression · [docs/components/empty-state.mdx:104](../../docs/components/empty-state.mdx#L104)

~~~~~text
<style>
  #empty-state-surfaces .dashed::part(empty-state) { border:var(--tp-border-width) dashed var(--tp-border); border-radius:var(--tp-radius-xl); }
  #empty-state-surfaces .muted::part(empty-state) { background:var(--tp-muted); border-radius:var(--tp-radius-xl); }
</style>
~~~~~

### components/list / Card grid

**presentation hook** · target: resolve from expression · [docs/components/list.mdx:175](../../docs/components/list.mdx#L175)

~~~~~text
partPresentation = {
  list: {
    styleHook: {
      display: 'grid',
      'grid-template-columns': 'repeat(auto-fit, minmax(min(100%, 10rem), 1fr))',
      gap: 'var(--tp-space-4)',
    },
  },
}
~~~~~

### components/list / Card grid

**presentation hook** · target: resolve from expression · [docs/components/list.mdx:177](../../docs/components/list.mdx#L177)

~~~~~text
styleHook: {
      display: 'grid',
      'grid-template-columns': 'repeat(auto-fit, minmax(min(100%, 10rem), 1fr))',
      gap: 'var(--tp-space-4)',
    }
~~~~~

### components/list / Link rows

**presentation hook** · target: resolve from expression · [docs/components/list.mdx:216](../../docs/components/list.mdx#L216)

~~~~~text
partContracts = {
    'list-item': {
      renderDelegate: ({ bind, content }) => html\`<a href=\${item.dataset.href} target=\${external ? '_blank' : '_self'} rel=\${external ? 'noopener noreferrer' : ''} \${bind}>\${content}</a>\`,
    },
  };
}
for (const icon of document.querySelectorAll('#list-links tp-icon')) icon.icon = icons[icon.dataset.icon];`}
/>

### Custom content layout

Each part's `renderDelegate` can also wrap its content, for example to add a trailing duration column to the `list-item-content` part. With `media-treatment="image"`, an `img` in `media` gets a square thumbnail.

<Preview
  width="5"
  title="Recordings"
  align="stretch"
  code={`<tp-list id="list-recordings" aria-label="Workshop recordings">
  <tp-list-item variant="outline" media-treatment="image" description="Maya Chen" data-duration="42:10">
    <img slot="media" src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=96&h=96&q=75&auto=format&fit=crop" alt="">
    <span slot="title">Designing for density <span style="color:var(--tp-muted-foreground)">· Day 1</span></span>
  </tp-list-item>
  <tp-list-item variant="outline" media-treatment="image" description="Jordan Lee" data-duration="35:48">
    <img slot="media" src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=96&h=96&q=75&auto=format&fit=crop" alt="">
    <span slot="title">Accessible data tables <span style="color:var(--tp-muted-foreground)">· Day 1</span></span>
  </tp-list-item>
  <tp-list-item variant="outline" media-treatment="image" description="Ana Ruiz" data-duration="51:02">
    <img slot="media" src="https://images.unsplash.com/photo-1548516173-3cabfa4607e9?w=96&h=96&q=75&auto=format&fit=crop" alt="">
    <span slot="title">Motion with restraint <span style="color:var(--tp-muted-foreground)">· Day 2</span></span>
  </tp-list-item>
</tp-list>`}
  script={`import { html } from 'lit';

for (const item of document.querySelectorAll('#list-recordings tp-list-item')) {
  item.partContracts = {
    'list-item-content': {
      renderDelegate: ({ bind, content }) => html\`<span \${bind} style="display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:var(--tp-space-3);align-items:center">
        <span style="display:flex;flex-direction:column;gap:inherit;min-inline-size:0">\${content}</span>
        <span style="color:var(--tp-muted-foreground);font-variant-numeric:tabular-nums">\${item.dataset.duration}</span>
      </span>\`,
    },
  };
}`}
/>

### In a menu

For a rich command, put a List item directly inside a Menu item. The Menu item keeps the command semantics, keyboard navigation and highlight, and the row drops its own padding. Do not add a second link or button inside that row.

<Preview
  title="People picker"
  code={`<tp-menu id="list-people-menu" label="Assign to">
  <tp-button slot="trigger" variant="outline" size="sm"><span id="list-people-label">Assign to…</span></tp-button>
  <tp-menu-item value="Maya Patel" label="Maya Patel">
    <tp-list-item size="xs" description="maya@acme.com"><tp-avatar slot="media" size="sm" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop" alt="" fallback="MP"></tp-avatar>Maya Patel</tp-list-item>
  </tp-menu-item>
  <tp-menu-item value="Jordan Lee" label="Jordan Lee">
    <tp-list-item size="xs" description="jordan@acme.com"><tp-avatar slot="media" size="sm" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop" alt="" fallback="JL"></tp-avatar>Jordan Lee</tp-list-item>
  </tp-menu-item>
  <tp-menu-item value="Ana Ruiz" label="Ana Ruiz">
    <tp-list-item size="xs" description="ana@acme.com"><tp-avatar slot="media" size="sm" src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop" alt="" fallback="AR"></tp-avatar>Ana Ruiz</tp-list-item>
  </tp-menu-item>
</tp-menu>`}
  script={`document.querySelector('#list-people-menu').addEventListener('tp-action', (event) => {
  document.querySelector('#list-people-label').textContent = event.detail.value;
});`}
/>

### People and invitations

<Preview
  width="7"
  title="People and invitations"
  align="stretch"
  code={`<tp-stack
  id="list-people-example"
  style="min-inline-size:0"
  gap="4"><tp-list-item variant="outline"><tp-avatar slot="media" size="sm" src="avatars/ravi-castellano.svg" fallback="RC" alt="Ravi Castellano"></tp-avatar>Ravi Castellano<span slot="description">Last seen <tp-time mode="relative" datetime="2026-05-31T21:38:55.759Z"></tp-time></span><tp-button slot="actions" variant="outline" size="icon-sm" aria-label="Invite Ravi Castellano" data-round data-feedback><tp-icon slot="icon-start" data-icon="plus"></tp-icon></tp-button></tp-list-item>
  <tp-list-item variant="outline" description="Invite your team to collaborate on this project."><tp-avatar-group slot="media" size="sm"><tp-avatar slot="" size="sm" src="avatars/mara-voss.svg" fallback="MV" alt="Mara Voss" data-secondary-avatar></tp-avatar><tp-avatar slot="" size="sm" src="avatars/theo-lindqvist.svg" fallback="TL" alt="Theo Lindqvist" data-secondary-avatar></tp-avatar><tp-avatar slot="" size="sm" src="avatars/ines-okafor.svg" fallback="IO" alt="Ines Okafor"></tp-avatar></tp-avatar-group>Project team<tp-button slot="actions" variant="outline" size="sm" data-feedback>Invite</tp-button></tp-list-item
  >
  <tp-list aria-label="People"><tp-list-item description="maravoss@example.com"><tp-avatar slot="media" size="sm" src="avatars/mara-voss.svg" fallback="MV" alt="Mara Voss"></tp-avatar>Mara Voss<tp-button slot="actions" variant="outline" size="icon-sm" aria-label="Invite Mara Voss" data-round data-feedback><tp-icon slot="icon-start" data-icon="plus"></tp-icon></tp-button></tp-list-item>
    <tp-list-separator></tp-list-separator>
    <tp-list-item description="theolind@example.com"><tp-avatar slot="media" size="sm" src="avatars/theo-lindqvist.svg" fallback="TL" alt="Theo Lindqvist"></tp-avatar>Theo Lindqvist<tp-button slot="actions" variant="outline" size="icon-sm" aria-label="Invite Theo Lindqvist" data-round data-feedback><tp-icon slot="icon-start" data-icon="plus"></tp-icon></tp-button></tp-list-item>
    <tp-list-separator></tp-list-separator>
    <tp-list-item description="inesokafor@example.com"><tp-avatar slot="media" size="sm" src="avatars/ines-okafor.svg" fallback="IO" alt="Ines Okafor"></tp-avatar>Ines Okafor<tp-button slot="actions" variant="outline" size="icon-sm" aria-label="Invite Ines Okafor" data-round data-feedback><tp-icon slot="icon-start" data-icon="plus"></tp-icon></tp-button></tp-list-item></tp-list
  ><tp-toast></tp-toast
></tp-stack>`}
  script={`import { html } from 'lit';
import { navigationIcons } from '@tweakpad/ui/icons/navigation';
import { plusIcon } from '@tweakpad/ui/icons/plus';
import { checkIcon } from '@tweakpad/ui/icons/check';
import { chevronRightIcon } from '@tweakpad/ui/icons/chevron-right';
import { chevronDownIcon } from '@tweakpad/ui/icons/chevron-down';
import { externalLinkIcon } from '@tweakpad/ui/icons/external-link';
import { shieldAlertIcon } from '@tweakpad/ui/icons/shield-alert';

const icons = {
  ...navigationIcons,
  plus: plusIcon,
  check: checkIcon,
  chevronRight: chevronRightIcon,
  chevronDown: chevronDownIcon,
  external: externalLinkIcon,
  shield: shieldAlertIcon,
};

export function setupListExample(root) {
  for (const icon of root.querySelectorAll('tp-icon[data-icon]'))
    icon.icon = icons[icon.dataset.icon];
  for (const item of root.querySelectorAll('tp-list-item[data-link]')) {
    item.partContracts = {
      'list-item': {
        renderDelegate: ({ bind, content }) =>
          html\`<a
            href=\${item.dataset.link || '#list-destination'}
            target=\${item.hasAttribute('data-external') ? '_blank' : '_self'}
            rel=\${item.hasAttribute('data-external') ? 'noopener noreferrer' : ''}
            \${bind}
            >\${content}</a
          >\`,
      },
    };
  }
  for (const item of root.querySelectorAll('tp-list-item[data-duration]'))
    item.partContracts = {
      ...item.partContracts,
      'list-item-content': {
        renderDelegate: ({ bind, content }) =>
          html\`<span
            \${bind}
            style="display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:var(--tp-space-3);align-items:center"
            ><span style="display:flex;flex-direction:column;gap:inherit;min-inline-size:0"
              >\${content}</span
            >
            <span style="color:var(--tp-muted-foreground);font-weight:var(--tp-font-normal)"
              >\${item.dataset.duration}</span
            >
          </span>\`,
      },
    };
  for (const list of root.querySelectorAll('tp-list[data-grid]'))
    list.partPresentation = {
      list: {
        styleHook: {
          display: 'grid',
          'grid-template-columns':
            'repeat(auto-fit, minmax(min(100%, calc(var(--tp-spacing) * 40)), 1fr))',
          gap: 'var(--tp-space-4)',
        },
      },
    };
  for (const action of root.querySelectorAll('tp-button[data-round]'))
    action.partPresentation = {
      button: { styleHook: { 'border-radius': 'var(--tp-radius-full)' } },
    };
  const toast = root.querySelector('tp-toast');
  const activate = (event) => {
    const action = event
      .composedPath()
      .find((node) => node?.localName === 'tp-button' && node.hasAttribute('data-feedback'));
    if (action)
      toast?.add({
        title: \`\${action.getAttribute('aria-label') || action.textContent.trim()} activated.\`,
      });
  };
  const selectPerson = (event) => {
    if (!event.defaultPrevented) toast?.add({ title: \`Selected \${event.detail.value}.\` });
  };
  const menus = [...root.querySelectorAll('tp-menu[data-people]')];
  menus.forEach((menu) => menu.addEventListener('tp-action', selectPerson));
  const secondaryAvatars = [...root.querySelectorAll('tp-avatar[data-secondary-avatar]')];
  const wide = root.ownerDocument.defaultView.matchMedia('(min-width: 40rem)');
  const resize = () =>
    secondaryAvatars.forEach((avatar) => {
      avatar.hidden = !wide.matches;
    });
  if (secondaryAvatars.length) {
    wide.addEventListener('change', resize);
    resize();
  }
  root.addEventListener('click', activate);
  return () => {
    root.removeEventListener('click', activate);
    menus.forEach((menu) => menu.removeEventListener('tp-action', selectPerson));
    wide.removeEventListener('change', resize);
    toast?.close();
  };
}

setupListExample(document.getElementById('list-people-example'));`}
/>

~~~~~

### components/list / Recordings

**presentation hook** · target: resolve from expression · [docs/components/list.mdx:250](../../docs/components/list.mdx#L250)

~~~~~text
partContracts = {
    'list-item-content': {
      renderDelegate: ({ bind, content }) => html\`<span \${bind} style="display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:var(--tp-space-3);align-items:center">
        <span style="display:flex;flex-direction:column;gap:inherit;min-inline-size:0">\${content}</span>
        <span style="color:var(--tp-muted-foreground);font-variant-numeric:tabular-nums">\${item.dataset.duration}</span>
      </span>\`,
    },
  };
}`}
/>

### In a menu

For a rich command, put a List item directly inside a Menu item. The Menu item keeps the command semantics, keyboard navigation and highlight, and the row drops its own padding. Do not add a second link or button inside that row.

<Preview
  title="People picker"
  code={`<tp-menu id="list-people-menu" label="Assign to">
  <tp-button slot="trigger" variant="outline" size="sm"><span id="list-people-label">Assign to…</span></tp-button>
  <tp-menu-item value="Maya Patel" label="Maya Patel">
    <tp-list-item size="xs" description="maya@acme.com"><tp-avatar slot="media" size="sm" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop" alt="" fallback="MP"></tp-avatar>Maya Patel</tp-list-item>
  </tp-menu-item>
  <tp-menu-item value="Jordan Lee" label="Jordan Lee">
    <tp-list-item size="xs" description="jordan@acme.com"><tp-avatar slot="media" size="sm" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop" alt="" fallback="JL"></tp-avatar>Jordan Lee</tp-list-item>
  </tp-menu-item>
  <tp-menu-item value="Ana Ruiz" label="Ana Ruiz">
    <tp-list-item size="xs" description="ana@acme.com"><tp-avatar slot="media" size="sm" src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop" alt="" fallback="AR"></tp-avatar>Ana Ruiz</tp-list-item>
  </tp-menu-item>
</tp-menu>`}
  script={`document.querySelector('#list-people-menu').addEventListener('tp-action', (event) => {
  document.querySelector('#list-people-label').textContent = event.detail.value;
});`}
/>

### People and invitations

<Preview
  width="7"
  title="People and invitations"
  align="stretch"
  code={`<tp-stack
  id="list-people-example"
  style="min-inline-size:0"
  gap="4"><tp-list-item variant="outline"><tp-avatar slot="media" size="sm" src="avatars/ravi-castellano.svg" fallback="RC" alt="Ravi Castellano"></tp-avatar>Ravi Castellano<span slot="description">Last seen <tp-time mode="relative" datetime="2026-05-31T21:38:55.759Z"></tp-time></span><tp-button slot="actions" variant="outline" size="icon-sm" aria-label="Invite Ravi Castellano" data-round data-feedback><tp-icon slot="icon-start" data-icon="plus"></tp-icon></tp-button></tp-list-item>
  <tp-list-item variant="outline" description="Invite your team to collaborate on this project."><tp-avatar-group slot="media" size="sm"><tp-avatar slot="" size="sm" src="avatars/mara-voss.svg" fallback="MV" alt="Mara Voss" data-secondary-avatar></tp-avatar><tp-avatar slot="" size="sm" src="avatars/theo-lindqvist.svg" fallback="TL" alt="Theo Lindqvist" data-secondary-avatar></tp-avatar><tp-avatar slot="" size="sm" src="avatars/ines-okafor.svg" fallback="IO" alt="Ines Okafor"></tp-avatar></tp-avatar-group>Project team<tp-button slot="actions" variant="outline" size="sm" data-feedback>Invite</tp-button></tp-list-item
  >
  <tp-list aria-label="People"><tp-list-item description="maravoss@example.com"><tp-avatar slot="media" size="sm" src="avatars/mara-voss.svg" fallback="MV" alt="Mara Voss"></tp-avatar>Mara Voss<tp-button slot="actions" variant="outline" size="icon-sm" aria-label="Invite Mara Voss" data-round data-feedback><tp-icon slot="icon-start" data-icon="plus"></tp-icon></tp-button></tp-list-item>
    <tp-list-separator></tp-list-separator>
    <tp-list-item description="theolind@example.com"><tp-avatar slot="media" size="sm" src="avatars/theo-lindqvist.svg" fallback="TL" alt="Theo Lindqvist"></tp-avatar>Theo Lindqvist<tp-button slot="actions" variant="outline" size="icon-sm" aria-label="Invite Theo Lindqvist" data-round data-feedback><tp-icon slot="icon-start" data-icon="plus"></tp-icon></tp-button></tp-list-item>
    <tp-list-separator></tp-list-separator>
    <tp-list-item description="inesokafor@example.com"><tp-avatar slot="media" size="sm" src="avatars/ines-okafor.svg" fallback="IO" alt="Ines Okafor"></tp-avatar>Ines Okafor<tp-button slot="actions" variant="outline" size="icon-sm" aria-label="Invite Ines Okafor" data-round data-feedback><tp-icon slot="icon-start" data-icon="plus"></tp-icon></tp-button></tp-list-item></tp-list
  ><tp-toast></tp-toast
></tp-stack>`}
  script={`import { html } from 'lit';
import { navigationIcons } from '@tweakpad/ui/icons/navigation';
import { plusIcon } from '@tweakpad/ui/icons/plus';
import { checkIcon } from '@tweakpad/ui/icons/check';
import { chevronRightIcon } from '@tweakpad/ui/icons/chevron-right';
import { chevronDownIcon } from '@tweakpad/ui/icons/chevron-down';
import { externalLinkIcon } from '@tweakpad/ui/icons/external-link';
import { shieldAlertIcon } from '@tweakpad/ui/icons/shield-alert';

const icons = {
  ...navigationIcons,
  plus: plusIcon,
  check: checkIcon,
  chevronRight: chevronRightIcon,
  chevronDown: chevronDownIcon,
  external: externalLinkIcon,
  shield: shieldAlertIcon,
};

export function setupListExample(root) {
  for (const icon of root.querySelectorAll('tp-icon[data-icon]'))
    icon.icon = icons[icon.dataset.icon];
  for (const item of root.querySelectorAll('tp-list-item[data-link]')) {
    item.partContracts = {
      'list-item': {
        renderDelegate: ({ bind, content }) =>
          html\`<a
            href=\${item.dataset.link || '#list-destination'}
            target=\${item.hasAttribute('data-external') ? '_blank' : '_self'}
            rel=\${item.hasAttribute('data-external') ? 'noopener noreferrer' : ''}
            \${bind}
            >\${content}</a
          >\`,
      },
    };
  }
  for (const item of root.querySelectorAll('tp-list-item[data-duration]'))
    item.partContracts = {
      ...item.partContracts,
      'list-item-content': {
        renderDelegate: ({ bind, content }) =>
          html\`<span
            \${bind}
            style="display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:var(--tp-space-3);align-items:center"
            ><span style="display:flex;flex-direction:column;gap:inherit;min-inline-size:0"
              >\${content}</span
            >
            <span style="color:var(--tp-muted-foreground);font-weight:var(--tp-font-normal)"
              >\${item.dataset.duration}</span
            >
          </span>\`,
      },
    };
  for (const list of root.querySelectorAll('tp-list[data-grid]'))
    list.partPresentation = {
      list: {
        styleHook: {
          display: 'grid',
          'grid-template-columns':
            'repeat(auto-fit, minmax(min(100%, calc(var(--tp-spacing) * 40)), 1fr))',
          gap: 'var(--tp-space-4)',
        },
      },
    };
  for (const action of root.querySelectorAll('tp-button[data-round]'))
    action.partPresentation = {
      button: { styleHook: { 'border-radius': 'var(--tp-radius-full)' } },
    };
  const toast = root.querySelector('tp-toast');
  const activate = (event) => {
    const action = event
      .composedPath()
      .find((node) => node?.localName === 'tp-button' && node.hasAttribute('data-feedback'));
    if (action)
      toast?.add({
        title: \`\${action.getAttribute('aria-label') || action.textContent.trim()} activated.\`,
      });
  };
  const selectPerson = (event) => {
    if (!event.defaultPrevented) toast?.add({ title: \`Selected \${event.detail.value}.\` });
  };
  const menus = [...root.querySelectorAll('tp-menu[data-people]')];
  menus.forEach((menu) => menu.addEventListener('tp-action', selectPerson));
  const secondaryAvatars = [...root.querySelectorAll('tp-avatar[data-secondary-avatar]')];
  const wide = root.ownerDocument.defaultView.matchMedia('(min-width: 40rem)');
  const resize = () =>
    secondaryAvatars.forEach((avatar) => {
      avatar.hidden = !wide.matches;
    });
  if (secondaryAvatars.length) {
    wide.addEventListener('change', resize);
    resize();
  }
  root.addEventListener('click', activate);
  return () => {
    root.removeEventListener('click', activate);
    menus.forEach((menu) => menu.removeEventListener('tp-action', selectPerson));
    wide.removeEventListener('change', resize);
    toast?.close();
  };
}

setupListExample(document.getElementById('list-people-example'));`}
/>

~~~~~

### components/list / People and invitations

**presentation hook** · target: resolve from expression · [docs/components/list.mdx:326](../../docs/components/list.mdx#L326)

~~~~~text
partContracts = {
      'list-item': {
        renderDelegate: ({ bind, content }) =>
          html\`<a
            href=\${item.dataset.link || '#list-destination'}
            target=\${item.hasAttribute('data-external') ? '_blank' : '_self'}
            rel=\${item.hasAttribute('data-external') ? 'noopener noreferrer' : ''}
            \${bind}
            >\${content}</a
          >\`,
      },
    };
  }
  for (const item of root.querySelectorAll('tp-list-item[data-duration]'))
    item.partContracts = {
      ...item.partContracts,
      'list-item-content': {
        renderDelegate: ({ bind, content }) =>
          html\`<span
            \${bind}
            style="display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:var(--tp-space-3);align-items:center"
            ><span style="display:flex;flex-direction:column;gap:inherit;min-inline-size:0"
              >\${content}</span
            >
            <span style="color:var(--tp-muted-foreground);font-weight:var(--tp-font-normal)"
              >\${item.dataset.duration}</span
            >
          </span>\`,
      },
    };
  for (const list of root.querySelectorAll('tp-list[data-grid]'))
    list.partPresentation = {
      list: {
        styleHook: {
          display: 'grid',
          'grid-template-columns':
            'repeat(auto-fit, minmax(min(100%, calc(var(--tp-spacing) * 40)), 1fr))',
          gap: 'var(--tp-space-4)',
        },
      },
    };
  for (const action of root.querySelectorAll('tp-button[data-round]'))
    action.partPresentation = {
      button: { styleHook: { 'border-radius': 'var(--tp-radius-full)' } },
    };
  const toast = root.querySelector('tp-toast');
  const activate = (event) => {
    const action = event
      .composedPath()
      .find((node) => node?.localName === 'tp-button' && node.hasAttribute('data-feedback'));
    if (action)
      toast?.add({
        title: \`\${action.getAttribute('aria-label') || action.textContent.trim()} activated.\`,
      });
  };
  const selectPerson = (event) => {
    if (!event.defaultPrevented) toast?.add({ title: \`Selected \${event.detail.value}.\` });
  };
  const menus = [...root.querySelectorAll('tp-menu[data-people]')];
  menus.forEach((menu) => menu.addEventListener('tp-action', selectPerson));
  const secondaryAvatars = [...root.querySelectorAll('tp-avatar[data-secondary-avatar]')];
  const wide = root.ownerDocument.defaultView.matchMedia('(min-width: 40rem)');
  const resize = () =>
    secondaryAvatars.forEach((avatar) => {
      avatar.hidden = !wide.matches;
    });
  if (secondaryAvatars.length) {
    wide.addEventListener('change', resize);
    resize();
  }
  root.addEventListener('click', activate);
  return () => {
    root.removeEventListener('click', activate);
    menus.forEach((menu) => menu.removeEventListener('tp-action', selectPerson));
    wide.removeEventListener('change', resize);
    toast?.close();
  };
}

setupListExample(document.getElementById('list-people-example'));`}
/>

~~~~~

### components/list / People and invitations

**presentation hook** · target: resolve from expression · [docs/components/list.mdx:340](../../docs/components/list.mdx#L340)

~~~~~text
partContracts = {
      ...item.partContracts,
      'list-item-content': {
        renderDelegate: ({ bind, content }) =>
          html\`<span
            \${bind}
            style="display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:var(--tp-space-3);align-items:center"
            ><span style="display:flex;flex-direction:column;gap:inherit;min-inline-size:0"
              >\${content}</span
            >
            <span style="color:var(--tp-muted-foreground);font-weight:var(--tp-font-normal)"
              >\${item.dataset.duration}</span
            >
          </span>\`,
      },
    };
  for (const list of root.querySelectorAll('tp-list[data-grid]'))
    list.partPresentation = {
      list: {
        styleHook: {
          display: 'grid',
          'grid-template-columns':
            'repeat(auto-fit, minmax(min(100%, calc(var(--tp-spacing) * 40)), 1fr))',
          gap: 'var(--tp-space-4)',
        },
      },
    };
  for (const action of root.querySelectorAll('tp-button[data-round]'))
    action.partPresentation = {
      button: { styleHook: { 'border-radius': 'var(--tp-radius-full)' } },
    };
  const toast = root.querySelector('tp-toast');
  const activate = (event) => {
    const action = event
      .composedPath()
      .find((node) => node?.localName === 'tp-button' && node.hasAttribute('data-feedback'));
    if (action)
      toast?.add({
        title: \`\${action.getAttribute('aria-label') || action.textContent.trim()} activated.\`,
      });
  };
  const selectPerson = (event) => {
    if (!event.defaultPrevented) toast?.add({ title: \`Selected \${event.detail.value}.\` });
  };
  const menus = [...root.querySelectorAll('tp-menu[data-people]')];
  menus.forEach((menu) => menu.addEventListener('tp-action', selectPerson));
  const secondaryAvatars = [...root.querySelectorAll('tp-avatar[data-secondary-avatar]')];
  const wide = root.ownerDocument.defaultView.matchMedia('(min-width: 40rem)');
  const resize = () =>
    secondaryAvatars.forEach((avatar) => {
      avatar.hidden = !wide.matches;
    });
  if (secondaryAvatars.length) {
    wide.addEventListener('change', resize);
    resize();
  }
  root.addEventListener('click', activate);
  return () => {
    root.removeEventListener('click', activate);
    menus.forEach((menu) => menu.removeEventListener('tp-action', selectPerson));
    wide.removeEventListener('change', resize);
    toast?.close();
  };
}

setupListExample(document.getElementById('list-people-example'));`}
/>

~~~~~

### components/list / People and invitations

**presentation hook** · target: resolve from expression · [docs/components/list.mdx:357](../../docs/components/list.mdx#L357)

~~~~~text
partPresentation = {
      list: {
        styleHook: {
          display: 'grid',
          'grid-template-columns':
            'repeat(auto-fit, minmax(min(100%, calc(var(--tp-spacing) * 40)), 1fr))',
          gap: 'var(--tp-space-4)',
        },
      },
    }
~~~~~

### components/list / People and invitations

**presentation hook** · target: resolve from expression · [docs/components/list.mdx:359](../../docs/components/list.mdx#L359)

~~~~~text
styleHook: {
          display: 'grid',
          'grid-template-columns':
            'repeat(auto-fit, minmax(min(100%, calc(var(--tp-spacing) * 40)), 1fr))',
          gap: 'var(--tp-space-4)',
        }
~~~~~

### components/list / People and invitations

**presentation hook** · target: resolve from expression · [docs/components/list.mdx:368](../../docs/components/list.mdx#L368)

~~~~~text
partPresentation = {
      button: { styleHook: { 'border-radius': 'var(--tp-radius-full)' } },
    }
~~~~~

### components/list / People and invitations

**presentation hook** · target: resolve from expression · [docs/components/list.mdx:369](../../docs/components/list.mdx#L369)

~~~~~text
styleHook: { 'border-radius': 'var(--tp-radius-full)' }
~~~~~

### components/map / Map

**JS style write** · target: resolve from expression · [docs/components/map.mdx:75](../../docs/components/map.mdx#L75)

~~~~~text
surface.style.cssText = 'position:absolute;
~~~~~

### components/map / Map

**JS style write** · target: resolve from expression · [docs/components/map.mdx:76](../../docs/components/map.mdx#L76)

~~~~~text
tiles.style.cssText = 'position:absolute;
~~~~~

### components/map / Map

**JS style write** · target: resolve from expression · [docs/components/map.mdx:77](../../docs/components/map.mdx#L77)

~~~~~text
pane.style.cssText = 'position:absolute;
~~~~~

### components/map / Map

**JS style write** · target: resolve from expression · [docs/components/map.mdx:80](../../docs/components/map.mdx#L80)

~~~~~text
credit.style.cssText = 'position:absolute;
~~~~~

### components/map / Map

**JS style write** · target: resolve from expression · [docs/components/map.mdx:99](../../docs/components/map.mdx#L99)

~~~~~text
surface.style.backgroundSize = side / 4 + 'px ' + side / 4 + 'px';
~~~~~

### components/map / Map

**JS style write** · target: resolve from expression · [docs/components/map.mdx:100](../../docs/components/map.mdx#L100)

~~~~~text
surface.style.backgroundPosition = -left + 'px ' + -top + 'px';
~~~~~

### components/map / Map

**JS style write** · target: resolve from expression · [docs/components/map.mdx:108](../../docs/components/map.mdx#L108)

~~~~~text
img.style.cssText = 'position:absolute;
~~~~~

### components/map / Map

**JS style write** · target: resolve from expression · [docs/components/map.mdx:109](../../docs/components/map.mdx#L109)

~~~~~text
(img.style.visibility = 'hidden');
~~~~~

### components/map / Map

**JS style write** · target: resolve from expression · [docs/components/map.mdx:114](../../docs/components/map.mdx#L114)

~~~~~text
img.style.width = img.style.height = side + 0.5 + 'px';
~~~~~

### components/map / Map

**JS style write** · target: resolve from expression · [docs/components/map.mdx:114](../../docs/components/map.mdx#L114)

~~~~~text
img.style.height = side + 0.5 + 'px';
~~~~~

### components/map / Map

**JS style write** · target: resolve from expression · [docs/components/map.mdx:115](../../docs/components/map.mdx#L115)

~~~~~text
img.style.transform = 'translate(' + (x * side - left) + 'px,' + (y * side - top) + 'px)';
~~~~~

### components/map / Map

**JS style write** · target: resolve from expression · [docs/components/map.mdx:121](../../docs/components/map.mdx#L121)

~~~~~text
element.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px)';
~~~~~

### components/map / Map

**JS style write** · target: resolve from expression · [docs/components/map.mdx:154](../../docs/components/map.mdx#L154)

~~~~~text
tiles.style.filter = scheme === 'dark' ? 'invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9)' : '';
~~~~~

### components/map / Map

**JS style write** · target: resolve from expression · [docs/components/map.mdx:174](../../docs/components/map.mdx#L174)

~~~~~text
element.style.cssText += ';
~~~~~

### components/map / Map

**stylesheet import** · target: resolve from expression · [docs/components/map.mdx:229](../../docs/components/map.mdx#L229)

~~~~~text
import '@tweakpad/ui/styles.css';
~~~~~

### components/map / Map

**stylesheet import** · target: resolve from expression · [docs/components/map.mdx:231](../../docs/components/map.mdx#L231)

~~~~~text
import maplibreCss from 'maplibre-gl/dist/maplibre-gl.css?raw';
~~~~~

### components/marker / Native hosts and layout

**presentation hook** · target: resolve from expression · [docs/components/marker.mdx:145](../../docs/components/marker.mdx#L145)

~~~~~text
partContracts = {
  marker: { renderDelegate: ({ bind, content }) => html\`<a href="#actions" \${bind}>\${content}</a>\` },
};
const button = root.querySelector('[data-host="button"]');
button.partContracts = {
  marker: {
    renderDelegate: ({ bind, content }) =>
      html\`<button type="button" @click=\${() => (output.textContent = 'Showing the 6 steps behind this reply.')} \${bind}>\${content}</button>\`,
  },
};
button.partPresentation = {
  'marker-content': { styleHook: { display: 'flex', flex: '1', 'align-items': 'center', 'justify-content': 'space-between', gap: 'var(--tp-space-2)' } },
};
root.querySelector('[data-layout="center"]').partPresentation = { marker: { styleHook: { 'justify-content': 'center' } } };
root.querySelector('[data-layout="stack"]').partPresentation = { marker: { styleHook: { 'flex-direction': 'column' } } };`}
/>

### Single sweep

`--tp-shimmer-iterations: 1` plays one sweep instead of looping, which suits a reveal when a step completes. Set `shimmer` again to replay it.

<Preview
  title="Completion reveal"
  code={`<tp-stack direction="row" gap="3" align="center">
  <tp-marker id="marker-sweep" tone="success" shimmer style="--tp-shimmer-iterations: 1"
    >Summary ready</tp-marker
  >
  <tp-button id="marker-sweep-replay" variant="outline" size="sm">Replay</tp-button>
</tp-stack>`}
  script={`const marker = document.querySelector('#marker-sweep');
document.querySelector('#marker-sweep-replay').addEventListener('click', () => {
  marker.shimmer = false;
  requestAnimationFrame(() => (marker.shimmer = true));
});`}
/>

### Compositions

A Marker can label an Accordion item, so a step summary expands into its details, or sit around a Drawer trigger that opens the full record.

<Preview
  width="5"
  title="Accordion label and drawer"
  align="stretch"
  code={`<tp-stack
  id="marker-compositions"
  gap="6">
  <tp-accordion collapsible>
    <tp-accordion-item value="steps">
      <tp-marker slot="label"><tp-icon slot="icon" data-icon="clock"></tp-icon>Worked for 1m 12s</tp-marker>
      Read the billing service, updated the proration rule and added two tests for mid-cycle seat changes.
    </tp-accordion-item>
  </tp-accordion>
  <tp-marker variant="separator">
    <tp-drawer
      label="Files read"
      description="Opened while preparing this reply."
      edge="inline-end"
      style="text-align: start">
      <tp-button slot="trigger" variant="outline" size="sm"><tp-icon slot="icon-start" data-icon="search"></tp-icon>Explored 3 files</tp-button>
      <tp-list aria-label="Files read">
        <tp-list-item variant="outline" size="sm">billing/proration.ts</tp-list-item>
        <tp-list-item variant="outline" size="sm">billing/seats.ts</tp-list-item>
        <tp-list-item variant="outline" size="sm">billing/proration.test.ts</tp-list-item>
      </tp-list>
      <tp-button slot="close" variant="outline">Close</tp-button>
    </tp-drawer>
  </tp-marker>
</tp-stack>`}
  script={`const icons = {
  clock: { viewBox: '0 0 24 24', paths: [{ d: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M12 6v6l4 2', strokeWidth: 2 }] },
  search: { viewBox: '0 0 24 24', paths: [{ d: 'M21 21l-5-5M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15', strokeWidth: 2 }] },
};
for (const icon of document.querySelectorAll('#marker-compositions tp-icon')) icon.icon = icons[icon.dataset.icon];`}
/>

~~~~~

### components/marker / Native hosts and layout

**presentation hook** · target: resolve from expression · [docs/components/marker.mdx:149](../../docs/components/marker.mdx#L149)

~~~~~text
partContracts = {
  marker: {
    renderDelegate: ({ bind, content }) =>
      html\`<button type="button" @click=\${() => (output.textContent = 'Showing the 6 steps behind this reply.')} \${bind}>\${content}</button>\`,
  },
};
button.partPresentation = {
  'marker-content': { styleHook: { display: 'flex', flex: '1', 'align-items': 'center', 'justify-content': 'space-between', gap: 'var(--tp-space-2)' } },
};
root.querySelector('[data-layout="center"]').partPresentation = { marker: { styleHook: { 'justify-content': 'center' } } };
root.querySelector('[data-layout="stack"]').partPresentation = { marker: { styleHook: { 'flex-direction': 'column' } } };`}
/>

### Single sweep

`--tp-shimmer-iterations: 1` plays one sweep instead of looping, which suits a reveal when a step completes. Set `shimmer` again to replay it.

<Preview
  title="Completion reveal"
  code={`<tp-stack direction="row" gap="3" align="center">
  <tp-marker id="marker-sweep" tone="success" shimmer style="--tp-shimmer-iterations: 1"
    >Summary ready</tp-marker
  >
  <tp-button id="marker-sweep-replay" variant="outline" size="sm">Replay</tp-button>
</tp-stack>`}
  script={`const marker = document.querySelector('#marker-sweep');
document.querySelector('#marker-sweep-replay').addEventListener('click', () => {
  marker.shimmer = false;
  requestAnimationFrame(() => (marker.shimmer = true));
});`}
/>

### Compositions

A Marker can label an Accordion item, so a step summary expands into its details, or sit around a Drawer trigger that opens the full record.

<Preview
  width="5"
  title="Accordion label and drawer"
  align="stretch"
  code={`<tp-stack
  id="marker-compositions"
  gap="6">
  <tp-accordion collapsible>
    <tp-accordion-item value="steps">
      <tp-marker slot="label"><tp-icon slot="icon" data-icon="clock"></tp-icon>Worked for 1m 12s</tp-marker>
      Read the billing service, updated the proration rule and added two tests for mid-cycle seat changes.
    </tp-accordion-item>
  </tp-accordion>
  <tp-marker variant="separator">
    <tp-drawer
      label="Files read"
      description="Opened while preparing this reply."
      edge="inline-end"
      style="text-align: start">
      <tp-button slot="trigger" variant="outline" size="sm"><tp-icon slot="icon-start" data-icon="search"></tp-icon>Explored 3 files</tp-button>
      <tp-list aria-label="Files read">
        <tp-list-item variant="outline" size="sm">billing/proration.ts</tp-list-item>
        <tp-list-item variant="outline" size="sm">billing/seats.ts</tp-list-item>
        <tp-list-item variant="outline" size="sm">billing/proration.test.ts</tp-list-item>
      </tp-list>
      <tp-button slot="close" variant="outline">Close</tp-button>
    </tp-drawer>
  </tp-marker>
</tp-stack>`}
  script={`const icons = {
  clock: { viewBox: '0 0 24 24', paths: [{ d: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M12 6v6l4 2', strokeWidth: 2 }] },
  search: { viewBox: '0 0 24 24', paths: [{ d: 'M21 21l-5-5M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15', strokeWidth: 2 }] },
};
for (const icon of document.querySelectorAll('#marker-compositions tp-icon')) icon.icon = icons[icon.dataset.icon];`}
/>

~~~~~

### components/marker / Native hosts and layout

**presentation hook** · target: resolve from expression · [docs/components/marker.mdx:155](../../docs/components/marker.mdx#L155)

~~~~~text
partPresentation = {
  'marker-content': { styleHook: { display: 'flex', flex: '1', 'align-items': 'center', 'justify-content': 'space-between', gap: 'var(--tp-space-2)' } },
}
~~~~~

### components/marker / Native hosts and layout

**presentation hook** · target: resolve from expression · [docs/components/marker.mdx:156](../../docs/components/marker.mdx#L156)

~~~~~text
styleHook: { display: 'flex', flex: '1', 'align-items': 'center', 'justify-content': 'space-between', gap: 'var(--tp-space-2)' }
~~~~~

### components/marker / Native hosts and layout

**presentation hook** · target: resolve from expression · [docs/components/marker.mdx:158](../../docs/components/marker.mdx#L158)

~~~~~text
partPresentation = { marker: { styleHook: { 'justify-content': 'center' } } }
~~~~~

### components/marker / Native hosts and layout

**presentation hook** · target: resolve from expression · [docs/components/marker.mdx:158](../../docs/components/marker.mdx#L158)

~~~~~text
styleHook: { 'justify-content': 'center' }
~~~~~

### components/marker / Native hosts and layout

**presentation hook** · target: resolve from expression · [docs/components/marker.mdx:159](../../docs/components/marker.mdx#L159)

~~~~~text
partPresentation = { marker: { styleHook: { 'flex-direction': 'column' } } }
~~~~~

### components/marker / Native hosts and layout

**presentation hook** · target: resolve from expression · [docs/components/marker.mdx:159](../../docs/components/marker.mdx#L159)

~~~~~text
styleHook: { 'flex-direction': 'column' }
~~~~~

### components/media-player / Audio layout

**presentation hook** · target: resolve from expression · [docs/components/media-player.mdx:47](../../docs/components/media-player.mdx#L47)

~~~~~text
partPresentation = {
  'media-controls': { styleHook: { 'color-scheme': 'inherit' } },
}
~~~~~

### components/media-player / Audio layout

**presentation hook** · target: resolve from expression · [docs/components/media-player.mdx:48](../../docs/components/media-player.mdx#L48)

~~~~~text
styleHook: { 'color-scheme': 'inherit' }
~~~~~

### components/message-scroller / Streaming

**presentation hook** · target: resolve from expression · [docs/components/message-scroller.mdx:140](../../docs/components/message-scroller.mdx#L140)

~~~~~text
partContracts = {
  'message-scroller-content': {
    hostProperties: { role: 'list', 'aria-live': 'off', 'aria-busy': 'false' },
  },
}
~~~~~

### components/message-scroller / Streaming

**presentation hook** · target: resolve from expression · [docs/components/message-scroller.mdx:142](../../docs/components/message-scroller.mdx#L142)

~~~~~text
hostProperties: { role: 'list', 'aria-live': 'off', 'aria-busy': 'false' }
~~~~~

### components/message / Retry a failed message

**JS style write** · target: resolve from expression · [docs/components/message.mdx:208](../../docs/components/message.mdx#L208)

~~~~~text
status.style.removeProperty('color');
~~~~~

### components/navigation-panel / Navigation panel

**presentation hook** · target: resolve from expression · [docs/components/navigation-panel.mdx:82](../../docs/components/navigation-panel.mdx#L82)

~~~~~text
partContracts = { 'navigation-panel': { styleHook: { blockSize: '34rem' } } }
~~~~~

### components/navigation-panel / Navigation panel

**presentation hook** · target: resolve from expression · [docs/components/navigation-panel.mdx:82](../../docs/components/navigation-panel.mdx#L82)

~~~~~text
styleHook: { blockSize: '34rem' }
~~~~~

### components/navigation-panel / Off-canvas

**presentation hook** · target: resolve from expression · [docs/components/navigation-panel.mdx:123](../../docs/components/navigation-panel.mdx#L123)

~~~~~text
partContracts = { 'navigation-panel': { styleHook: { blockSize: '22rem' } } }
~~~~~

### components/navigation-panel / Off-canvas

**presentation hook** · target: resolve from expression · [docs/components/navigation-panel.mdx:123](../../docs/components/navigation-panel.mdx#L123)

~~~~~text
styleHook: { blockSize: '22rem' }
~~~~~

### components/navigation-panel / Collapsible groups

**presentation hook** · target: resolve from expression · [docs/components/navigation-panel.mdx:177](../../docs/components/navigation-panel.mdx#L177)

~~~~~text
partContracts = { 'navigation-panel': { styleHook: { blockSize: '26rem' } } }
~~~~~

### components/navigation-panel / Collapsible groups

**presentation hook** · target: resolve from expression · [docs/components/navigation-panel.mdx:177](../../docs/components/navigation-panel.mdx#L177)

~~~~~text
styleHook: { blockSize: '26rem' }
~~~~~

### components/navigation-panel / Floating

**presentation hook** · target: resolve from expression · [docs/components/navigation-panel.mdx:236](../../docs/components/navigation-panel.mdx#L236)

~~~~~text
partContracts = {
  'navigation-panel': { styleHook: { blockSize: 'calc(20rem - var(--tp-space-4))' } },
}
~~~~~

### components/navigation-panel / Floating

**presentation hook** · target: resolve from expression · [docs/components/navigation-panel.mdx:237](../../docs/components/navigation-panel.mdx#L237)

~~~~~text
styleHook: { blockSize: 'calc(20rem - var(--tp-space-4))' }
~~~~~

### components/navigation-panel / Team switcher and row actions

**presentation hook** · target: resolve from expression · [docs/components/navigation-panel.mdx:322](../../docs/components/navigation-panel.mdx#L322)

~~~~~text
partContracts = { 'navigation-panel': { styleHook: { blockSize: '30rem' } } }
~~~~~

### components/navigation-panel / Team switcher and row actions

**presentation hook** · target: resolve from expression · [docs/components/navigation-panel.mdx:322](../../docs/components/navigation-panel.mdx#L322)

~~~~~text
styleHook: { blockSize: '30rem' }
~~~~~

### components/progress / Formatted value

**presentation hook** · target: resolve from expression · [docs/components/progress.mdx:117](../../docs/components/progress.mdx#L117)

~~~~~text
partContracts = {
    'progress-value-output': { content: (state) => state.formattedValue },
  }
~~~~~

### components/progress / Formatted value

**style option** · target: resolve from expression · [docs/components/progress.mdx:115](../../docs/components/progress.mdx#L115)

~~~~~text
style: 'unit', unit: 'gigabyte', maximumFractionDigits: 1 };
~~~~~

### components/questionnaire / Disabled until answered

**presentation hook** · target: resolve from expression · [docs/components/questionnaire.mdx:423](../../docs/components/questionnaire.mdx#L423)

~~~~~text
partContracts = {
  'questionnaire-progress': {
    content: ({ current, total }) => \`Checkpoint \${current} of \${total}\`,
  },
};`} language="js" />

<Preview
  width="4"
  align="stretch"
  title="Progress bar"
  code={`<tp-questionnaire id="questionnaire-progress" label="Bug report"></tp-questionnaire>`}
  script={`import { html } from 'lit';
const questionnaire = document.querySelector('#questionnaire-progress');
questionnaire.partContracts = {
  'questionnaire-progress': {
    renderDelegate: ({ bind, state }) => html\`<tp-stack \${bind} gap="2">
      <tp-progress aria-hidden="true" .value=\${state.current} .maximum=\${state.total}></tp-progress>
      <span>Step \${state.current} of \${state.total}</span>
    </tp-stack>\`,
  },
};
questionnaire.questions = [
  {
    name: 'area',
    title: 'Where did it happen?',
    required: true,
    choices: [
      { value: 'editor', label: 'Editor' },
      { value: 'billing', label: 'Billing' },
      { value: 'api', label: 'Public API' },
    ],
  },
  {
    name: 'frequency',
    title: 'How often does it happen?',
    required: true,
    choices: [
      { value: 'always', label: 'Every time' },
      { value: 'sometimes', label: 'Sometimes' },
      { value: 'once', label: 'Only once' },
    ],
  },
  {
    name: 'steps',
    title: 'What were you doing?',
    required: true,
    input: { label: 'Steps to reproduce', placeholder: 'Opened a shared doc, then…' },
  },
];
questionnaire.actions = { submit: { label: 'File report' } };
questionnaire.addEventListener('tp-submit', (event) => event.preventDefault());`}
/>

### Entrance animation

The `questionnaire-question` part's `elementReference` runs each time a new question becomes active, while progress and buttons stay in place. Animate that element only, scale the duration by the inherited `--tp-motion-scale` so reduced motion turns it off, and cancel the animation when the reference changes.

Do not animate each answer update or delay focus until the animation finishes.

<Preview
  width="4"
  align="stretch"
  title="Animated questions"
  code={`<tp-questionnaire id="questionnaire-animated" label="Event RSVP"></tp-questionnaire>`}
  script={`const questionnaire = document.querySelector('#questionnaire-animated');
let current;
let animation;
questionnaire.partContracts = {
  'questionnaire-question': {
    elementReference: (element) => {
      if (element === current) return;
      animation?.cancel();
      current = element;
      if (!element) return;
      queueMicrotask(() => {
        if (current !== element || !element.isConnected) return;
        const style = getComputedStyle(element);
        const scale = Number(style.getPropertyValue('--tp-motion-scale').trim() || 1);
        const duration = parseFloat(style.getPropertyValue('--tp-duration-normal')) * 1000;
        if (!scale || !duration) return;
        animation = element.animate(
          [{ opacity: 0, transform: 'translateY(0.5rem)' }, { opacity: 1, transform: 'none' }],
          { duration: duration * scale, easing: style.getPropertyValue('--tp-easing-enter') },
        );
      });
    },
  },
};
questionnaire.questions = [
  {
    name: 'attending',
    title: 'Will you join the offsite in Lisbon?',
    required: true,
    choices: [
      { value: 'yes', label: 'Yes, I will be there' },
      { value: 'remote', label: 'I will join remotely' },
      { value: 'no', label: 'I cannot make it' },
    ],
  },
  {
    name: 'diet',
    title: 'Any dietary requirements?',
    skippable: true,
    choices: [
      { value: 'vegetarian', label: 'Vegetarian' },
      { value: 'vegan', label: 'Vegan' },
      { value: 'gluten-free', label: 'Gluten-free' },
    ],
  },
];
questionnaire.actions = { submit: { label: 'Send RSVP' } };
questionnaire.addEventListener('tp-submit', (event) => event.preventDefault());`}
/>

### Card layout

Delegates can rearrange the parts Questionnaire has already rendered. Each part's `state.regions` holds them, so a Card can take the title, description and progress in its header slots, the choices in its body and the buttons in its footer, with the fieldset naming and native form untouched. Render each region once.

`choices` already includes `input`; render `input` separately only when replacing the default Choices composition. Keep native inputs in the form's DOM tree; don't move them into a new shadow root or a second form.

<Preview
  width="4"
  align="stretch"
  title="Inside a Card"
  code={`<tp-questionnaire id="questionnaire-card" label="Plan upgrade" shortcut-mode="numbers"></tp-questionnaire>`}
  script={`import { html } from 'lit';
const questionnaire = document.querySelector('#questionnaire-card');
questionnaire.partContracts = {
  questionnaire: {
    renderDelegate: ({ bind, state }) => html\`<form \${bind}>\${state.regions.answers}\${state.regions.question}</form>\`,
  },
  'questionnaire-question': {
    renderDelegate: ({ bind, state }) => html\`<fieldset \${bind}>
      <tp-card>
        \${state.regions.title}\${state.regions.description}\${state.regions.progress}
        \${state.regions.choices}\${state.regions.error}\${state.regions.actions}
      </tp-card>
    </fieldset>\`,
  },
  'questionnaire-title': {
    hostProperties: { slot: 'header' },
    renderDelegate: ({ bind, content }) => html\`<span \${bind}>\${content}</span>\`,
  },
  'questionnaire-description': { hostProperties: { slot: 'description' } },
  'questionnaire-progress': {
    hostProperties: { slot: 'action' },
    content: (state) => \`\${state.current} / \${state.total}\`,
  },
  'questionnaire-actions': { hostProperties: { slot: 'footer' } },
};
questionnaire.questions = [
  {
    name: 'plan',
    title: 'Which plan fits your team?',
    description: 'You can change plans at any time.',
    required: true,
    choices: [
      { value: 'team', label: 'Team', description: '$12 per seat, up to 50 seats.' },
      { value: 'business', label: 'Business', description: '$24 per seat with SSO and audit logs.' },
    ],
  },
  {
    name: 'billing',
    title: 'How would you like to pay?',
    description: 'Yearly billing saves two months.',
    required: true,
    choices: [
      { value: 'monthly', label: 'Monthly' },
      { value: 'yearly', label: 'Yearly' },
    ],
  },
];
questionnaire.actions = { submit: { label: 'Upgrade' } };
questionnaire.addEventListener('tp-submit', (event) => event.preventDefault());`}
/>

### In a dialog

For a short clarification flow, put the Questionnaire in a Dialog. The Dialog owns cancelling, dismissal and returning focus; the Questionnaire owns answers and navigation, and your submit handler closes the Dialog.

<Preview
  title="Clarification dialog"
  code={`<tp-stack id="questionnaire-dialog" gap="3" align="center">
  <tp-dialog label="Clarify the export">
    <tp-button slot="trigger" variant="outline">Export data</tp-button>
    <tp-questionnaire label="Export options"></tp-questionnaire>
    <tp-button slot="close" variant="outline">Cancel</tp-button>
  </tp-dialog>
  <output style="color: var(--tp-muted-foreground); font-size: var(--tp-text-sm)"></output>
</tp-stack>`}
  script={`const root = document.querySelector('#questionnaire-dialog');
const dialog = root.querySelector('tp-dialog');
const questionnaire = root.querySelector('tp-questionnaire');
const output = root.querySelector('output');
questionnaire.questions = [
  {
    name: 'range',
    title: 'Which records should be exported?',
    required: true,
    choices: [
      { value: 'month', label: 'This month' },
      { value: 'quarter', label: 'This quarter' },
      { value: 'all', label: 'Everything' },
    ],
  },
  {
    name: 'format',
    title: 'Which file format?',
    required: true,
    choices: [
      { value: 'csv', label: 'CSV' },
      { value: 'xlsx', label: 'Excel workbook' },
    ],
  },
];
questionnaire.actions = { submit: { label: 'Start export' } };
questionnaire.addEventListener('tp-submit', (event) => {
  event.preventDefault();
  output.textContent = 'Exporting: ' + JSON.stringify(event.detail.answers);
  dialog.close();
});`}
/>

~~~~~

### components/questionnaire / Progress bar

**presentation hook** · target: resolve from expression · [docs/components/questionnaire.mdx:436](../../docs/components/questionnaire.mdx#L436)

~~~~~text
partContracts = {
  'questionnaire-progress': {
    renderDelegate: ({ bind, state }) => html\`<tp-stack \${bind} gap="2">
      <tp-progress aria-hidden="true" .value=\${state.current} .maximum=\${state.total}></tp-progress>
      <span>Step \${state.current} of \${state.total}</span>
    </tp-stack>\`,
  },
};
questionnaire.questions = [
  {
    name: 'area',
    title: 'Where did it happen?',
    required: true,
    choices: [
      { value: 'editor', label: 'Editor' },
      { value: 'billing', label: 'Billing' },
      { value: 'api', label: 'Public API' },
    ],
  },
  {
    name: 'frequency',
    title: 'How often does it happen?',
    required: true,
    choices: [
      { value: 'always', label: 'Every time' },
      { value: 'sometimes', label: 'Sometimes' },
      { value: 'once', label: 'Only once' },
    ],
  },
  {
    name: 'steps',
    title: 'What were you doing?',
    required: true,
    input: { label: 'Steps to reproduce', placeholder: 'Opened a shared doc, then…' },
  },
];
questionnaire.actions = { submit: { label: 'File report' } };
questionnaire.addEventListener('tp-submit', (event) => event.preventDefault());`}
/>

### Entrance animation

The `questionnaire-question` part's `elementReference` runs each time a new question becomes active, while progress and buttons stay in place. Animate that element only, scale the duration by the inherited `--tp-motion-scale` so reduced motion turns it off, and cancel the animation when the reference changes.

Do not animate each answer update or delay focus until the animation finishes.

<Preview
  width="4"
  align="stretch"
  title="Animated questions"
  code={`<tp-questionnaire id="questionnaire-animated" label="Event RSVP"></tp-questionnaire>`}
  script={`const questionnaire = document.querySelector('#questionnaire-animated');
let current;
let animation;
questionnaire.partContracts = {
  'questionnaire-question': {
    elementReference: (element) => {
      if (element === current) return;
      animation?.cancel();
      current = element;
      if (!element) return;
      queueMicrotask(() => {
        if (current !== element || !element.isConnected) return;
        const style = getComputedStyle(element);
        const scale = Number(style.getPropertyValue('--tp-motion-scale').trim() || 1);
        const duration = parseFloat(style.getPropertyValue('--tp-duration-normal')) * 1000;
        if (!scale || !duration) return;
        animation = element.animate(
          [{ opacity: 0, transform: 'translateY(0.5rem)' }, { opacity: 1, transform: 'none' }],
          { duration: duration * scale, easing: style.getPropertyValue('--tp-easing-enter') },
        );
      });
    },
  },
};
questionnaire.questions = [
  {
    name: 'attending',
    title: 'Will you join the offsite in Lisbon?',
    required: true,
    choices: [
      { value: 'yes', label: 'Yes, I will be there' },
      { value: 'remote', label: 'I will join remotely' },
      { value: 'no', label: 'I cannot make it' },
    ],
  },
  {
    name: 'diet',
    title: 'Any dietary requirements?',
    skippable: true,
    choices: [
      { value: 'vegetarian', label: 'Vegetarian' },
      { value: 'vegan', label: 'Vegan' },
      { value: 'gluten-free', label: 'Gluten-free' },
    ],
  },
];
questionnaire.actions = { submit: { label: 'Send RSVP' } };
questionnaire.addEventListener('tp-submit', (event) => event.preventDefault());`}
/>

### Card layout

Delegates can rearrange the parts Questionnaire has already rendered. Each part's `state.regions` holds them, so a Card can take the title, description and progress in its header slots, the choices in its body and the buttons in its footer, with the fieldset naming and native form untouched. Render each region once.

`choices` already includes `input`; render `input` separately only when replacing the default Choices composition. Keep native inputs in the form's DOM tree; don't move them into a new shadow root or a second form.

<Preview
  width="4"
  align="stretch"
  title="Inside a Card"
  code={`<tp-questionnaire id="questionnaire-card" label="Plan upgrade" shortcut-mode="numbers"></tp-questionnaire>`}
  script={`import { html } from 'lit';
const questionnaire = document.querySelector('#questionnaire-card');
questionnaire.partContracts = {
  questionnaire: {
    renderDelegate: ({ bind, state }) => html\`<form \${bind}>\${state.regions.answers}\${state.regions.question}</form>\`,
  },
  'questionnaire-question': {
    renderDelegate: ({ bind, state }) => html\`<fieldset \${bind}>
      <tp-card>
        \${state.regions.title}\${state.regions.description}\${state.regions.progress}
        \${state.regions.choices}\${state.regions.error}\${state.regions.actions}
      </tp-card>
    </fieldset>\`,
  },
  'questionnaire-title': {
    hostProperties: { slot: 'header' },
    renderDelegate: ({ bind, content }) => html\`<span \${bind}>\${content}</span>\`,
  },
  'questionnaire-description': { hostProperties: { slot: 'description' } },
  'questionnaire-progress': {
    hostProperties: { slot: 'action' },
    content: (state) => \`\${state.current} / \${state.total}\`,
  },
  'questionnaire-actions': { hostProperties: { slot: 'footer' } },
};
questionnaire.questions = [
  {
    name: 'plan',
    title: 'Which plan fits your team?',
    description: 'You can change plans at any time.',
    required: true,
    choices: [
      { value: 'team', label: 'Team', description: '$12 per seat, up to 50 seats.' },
      { value: 'business', label: 'Business', description: '$24 per seat with SSO and audit logs.' },
    ],
  },
  {
    name: 'billing',
    title: 'How would you like to pay?',
    description: 'Yearly billing saves two months.',
    required: true,
    choices: [
      { value: 'monthly', label: 'Monthly' },
      { value: 'yearly', label: 'Yearly' },
    ],
  },
];
questionnaire.actions = { submit: { label: 'Upgrade' } };
questionnaire.addEventListener('tp-submit', (event) => event.preventDefault());`}
/>

### In a dialog

For a short clarification flow, put the Questionnaire in a Dialog. The Dialog owns cancelling, dismissal and returning focus; the Questionnaire owns answers and navigation, and your submit handler closes the Dialog.

<Preview
  title="Clarification dialog"
  code={`<tp-stack id="questionnaire-dialog" gap="3" align="center">
  <tp-dialog label="Clarify the export">
    <tp-button slot="trigger" variant="outline">Export data</tp-button>
    <tp-questionnaire label="Export options"></tp-questionnaire>
    <tp-button slot="close" variant="outline">Cancel</tp-button>
  </tp-dialog>
  <output style="color: var(--tp-muted-foreground); font-size: var(--tp-text-sm)"></output>
</tp-stack>`}
  script={`const root = document.querySelector('#questionnaire-dialog');
const dialog = root.querySelector('tp-dialog');
const questionnaire = root.querySelector('tp-questionnaire');
const output = root.querySelector('output');
questionnaire.questions = [
  {
    name: 'range',
    title: 'Which records should be exported?',
    required: true,
    choices: [
      { value: 'month', label: 'This month' },
      { value: 'quarter', label: 'This quarter' },
      { value: 'all', label: 'Everything' },
    ],
  },
  {
    name: 'format',
    title: 'Which file format?',
    required: true,
    choices: [
      { value: 'csv', label: 'CSV' },
      { value: 'xlsx', label: 'Excel workbook' },
    ],
  },
];
questionnaire.actions = { submit: { label: 'Start export' } };
questionnaire.addEventListener('tp-submit', (event) => {
  event.preventDefault();
  output.textContent = 'Exporting: ' + JSON.stringify(event.detail.answers);
  dialog.close();
});`}
/>

~~~~~

### components/questionnaire / Animated questions

**presentation hook** · target: resolve from expression · [docs/components/questionnaire.mdx:490](../../docs/components/questionnaire.mdx#L490)

~~~~~text
partContracts = {
  'questionnaire-question': {
    elementReference: (element) => {
      if (element === current) return;
      animation?.cancel();
      current = element;
      if (!element) return;
      queueMicrotask(() => {
        if (current !== element || !element.isConnected) return;
        const style = getComputedStyle(element);
        const scale = Number(style.getPropertyValue('--tp-motion-scale').trim() || 1);
        const duration = parseFloat(style.getPropertyValue('--tp-duration-normal')) * 1000;
        if (!scale || !duration) return;
        animation = element.animate(
          [{ opacity: 0, transform: 'translateY(0.5rem)' }, { opacity: 1, transform: 'none' }],
          { duration: duration * scale, easing: style.getPropertyValue('--tp-easing-enter') },
        );
      });
    },
  },
}
~~~~~

### components/questionnaire / Inside a Card

**presentation hook** · target: resolve from expression · [docs/components/questionnaire.mdx:550](../../docs/components/questionnaire.mdx#L550)

~~~~~text
partContracts = {
  questionnaire: {
    renderDelegate: ({ bind, state }) => html\`<form \${bind}>\${state.regions.answers}\${state.regions.question}</form>\`,
  },
  'questionnaire-question': {
    renderDelegate: ({ bind, state }) => html\`<fieldset \${bind}>
      <tp-card>
        \${state.regions.title}\${state.regions.description}\${state.regions.progress}
        \${state.regions.choices}\${state.regions.error}\${state.regions.actions}
      </tp-card>
    </fieldset>\`,
  },
  'questionnaire-title': {
    hostProperties: { slot: 'header' },
    renderDelegate: ({ bind, content }) => html\`<span \${bind}>\${content}</span>\`,
  },
  'questionnaire-description': { hostProperties: { slot: 'description' } },
  'questionnaire-progress': {
    hostProperties: { slot: 'action' },
    content: (state) => \`\${state.current} / \${state.total}\`,
  },
  'questionnaire-actions': { hostProperties: { slot: 'footer' } },
};
questionnaire.questions = [
  {
    name: 'plan',
    title: 'Which plan fits your team?',
    description: 'You can change plans at any time.',
    required: true,
    choices: [
      { value: 'team', label: 'Team', description: '$12 per seat, up to 50 seats.' },
      { value: 'business', label: 'Business', description: '$24 per seat with SSO and audit logs.' },
    ],
  },
  {
    name: 'billing',
    title: 'How would you like to pay?',
    description: 'Yearly billing saves two months.',
    required: true,
    choices: [
      { value: 'monthly', label: 'Monthly' },
      { value: 'yearly', label: 'Yearly' },
    ],
  },
];
questionnaire.actions = { submit: { label: 'Upgrade' } };
questionnaire.addEventListener('tp-submit', (event) => event.preventDefault());`}
/>

### In a dialog

For a short clarification flow, put the Questionnaire in a Dialog. The Dialog owns cancelling, dismissal and returning focus; the Questionnaire owns answers and navigation, and your submit handler closes the Dialog.

<Preview
  title="Clarification dialog"
  code={`<tp-stack id="questionnaire-dialog" gap="3" align="center">
  <tp-dialog label="Clarify the export">
    <tp-button slot="trigger" variant="outline">Export data</tp-button>
    <tp-questionnaire label="Export options"></tp-questionnaire>
    <tp-button slot="close" variant="outline">Cancel</tp-button>
  </tp-dialog>
  <output style="color: var(--tp-muted-foreground); font-size: var(--tp-text-sm)"></output>
</tp-stack>`}
  script={`const root = document.querySelector('#questionnaire-dialog');
const dialog = root.querySelector('tp-dialog');
const questionnaire = root.querySelector('tp-questionnaire');
const output = root.querySelector('output');
questionnaire.questions = [
  {
    name: 'range',
    title: 'Which records should be exported?',
    required: true,
    choices: [
      { value: 'month', label: 'This month' },
      { value: 'quarter', label: 'This quarter' },
      { value: 'all', label: 'Everything' },
    ],
  },
  {
    name: 'format',
    title: 'Which file format?',
    required: true,
    choices: [
      { value: 'csv', label: 'CSV' },
      { value: 'xlsx', label: 'Excel workbook' },
    ],
  },
];
questionnaire.actions = { submit: { label: 'Start export' } };
questionnaire.addEventListener('tp-submit', (event) => {
  event.preventDefault();
  output.textContent = 'Exporting: ' + JSON.stringify(event.detail.answers);
  dialog.close();
});`}
/>

~~~~~

### components/questionnaire / Inside a Card

**presentation hook** · target: resolve from expression · [docs/components/questionnaire.mdx:563](../../docs/components/questionnaire.mdx#L563)

~~~~~text
hostProperties: { slot: 'header' }
~~~~~

### components/questionnaire / Inside a Card

**presentation hook** · target: resolve from expression · [docs/components/questionnaire.mdx:566](../../docs/components/questionnaire.mdx#L566)

~~~~~text
hostProperties: { slot: 'description' }
~~~~~

### components/questionnaire / Inside a Card

**presentation hook** · target: resolve from expression · [docs/components/questionnaire.mdx:568](../../docs/components/questionnaire.mdx#L568)

~~~~~text
hostProperties: { slot: 'action' }
~~~~~

### components/questionnaire / Inside a Card

**presentation hook** · target: resolve from expression · [docs/components/questionnaire.mdx:571](../../docs/components/questionnaire.mdx#L571)

~~~~~text
hostProperties: { slot: 'footer' }
~~~~~

### components/scroll-trigger / Pinned scene

**tagged stylesheet** · target: resolve from expression · [docs/components/scroll-trigger.mdx:229](../../docs/components/scroll-trigger.mdx#L229)

~~~~~text
css`), so pinning never moves the content that follows. Pinning also works without `
~~~~~

### components/slider / Slider

**presentation hook** · target: resolve from expression · [docs/components/slider.mdx:13](../../docs/components/slider.mdx#L13)

~~~~~text
partContracts = {
  'slider-output': { content: (state) => state.formattedValues[0] + '%' },
}
~~~~~

### components/slider / Price range

**presentation hook** · target: resolve from expression · [docs/components/slider.mdx:31](../../docs/components/slider.mdx#L31)

~~~~~text
partContracts = {
  'slider-output': { content: (state) => state.formattedValues.join(' – ') },
}
~~~~~

### components/slider / Push, swap and none

**presentation hook** · target: resolve from expression · [docs/components/slider.mdx:48](../../docs/components/slider.mdx#L48)

~~~~~text
partContracts = {
    'slider-output': { content: (state) => state.formattedValues.join(' · ') },
  }
~~~~~

### components/slider / Currency and percent

**presentation hook** · target: resolve from expression · [docs/components/slider.mdx:86](../../docs/components/slider.mdx#L86)

~~~~~text
partContracts = {
    'slider-output': { content: (state) => state.formattedValues[0] },
  }
~~~~~

### components/slider / Controlled range

**presentation hook** · target: resolve from expression · [docs/components/slider.mdx:121](../../docs/components/slider.mdx#L121)

~~~~~text
partContracts = {
  'slider-output': { content: (state) => state.formattedValues.join(' – ') },
}
~~~~~

### components/slider / Vertical range

**presentation hook** · target: resolve from expression · [docs/components/slider.mdx:181](../../docs/components/slider.mdx#L181)

~~~~~text
partContracts = {
  'slider-output': { content: (state) => state.formattedValues.join(' – ') },
}
~~~~~

### components/slider / Compact readout

**presentation hook** · target: resolve from expression · [docs/components/slider.mdx:198](../../docs/components/slider.mdx#L198)

~~~~~text
partContracts = {
    'slider-output': { content: (state) => state.formattedValues[0] + ' px' },
  }
~~~~~

### components/slider / Media timeline

**presentation hook** · target: resolve from expression · [docs/components/slider.mdx:220](../../docs/components/slider.mdx#L220)

~~~~~text
partContracts = {
  'slider-output': { content: (state) => clock(state.values[0]) + ' / 3:45' },
}
~~~~~

### components/slider / Rejecting values

**presentation hook** · target: resolve from expression · [docs/components/slider.mdx:358](../../docs/components/slider.mdx#L358)

~~~~~text
partContracts = {
  'slider-output': { content: (state) => state.formattedValues[0] + ' req/s' },
}
~~~~~

### components/slider / Price range

**style option** · target: resolve from expression · [docs/components/slider.mdx:30](../../docs/components/slider.mdx#L30)

~~~~~text
style: 'currency', currency: 'USD', maximumFractionDigits: 0 };
~~~~~

### components/slider / Push, swap and none

**style option** · target: resolve from expression · [docs/components/slider.mdx:75](../../docs/components/slider.mdx#L75)

~~~~~text
style: 'percent'` shows a 0–1 value as a percentage without changing the value itself.
~~~~~

### components/slider / Currency and percent

**style option** · target: resolve from expression · [docs/components/slider.mdx:83](../../docs/components/slider.mdx#L83)

~~~~~text
style: 'currency', currency: 'EUR', maximumFractionDigits: 0 };
~~~~~

### components/slider / Currency and percent

**style option** · target: resolve from expression · [docs/components/slider.mdx:84](../../docs/components/slider.mdx#L84)

~~~~~text
style: 'percent', maximumFractionDigits: 0 };
~~~~~

### components/slider / Vertical range

**style option** · target: resolve from expression · [docs/components/slider.mdx:180](../../docs/components/slider.mdx#L180)

~~~~~text
style: 'unit', unit: 'celsius', maximumFractionDigits: 1 };
~~~~~

### components/slider / Inline

**style option** · target: resolve from expression · [docs/components/slider.mdx:420](../../docs/components/slider.mdx#L420)

~~~~~text
style: 'currency', currency: 'EUR', maximumFractionDigits: 0 };
~~~~~

### components/slider / Inline

**style option** · target: resolve from expression · [docs/components/slider.mdx:421](../../docs/components/slider.mdx#L421)

~~~~~text
style: 'unit', unit: 'minute' };
~~~~~

### components/table-of-contents / Collected targets

**JS style write** · target: resolve from expression · [docs/components/table-of-contents.mdx:162](../../docs/components/table-of-contents.mdx#L162)

~~~~~text
step.style.marginBlockEnd = 'var(--tp-space-5)';
~~~~~

### components/text-area / Content and fixed sizing

**presentation hook** · target: resolve from expression · [docs/components/text-area.mdx:27](../../docs/components/text-area.mdx#L27)

~~~~~text
hostProperties = { style: { fieldSizing: 'fixed' } }
~~~~~

### components/text-area / Content and fixed sizing

**style option** · target: resolve from expression · [docs/components/text-area.mdx:27](../../docs/components/text-area.mdx#L27)

~~~~~text
style: { fieldSizing: 'fixed' }
~~~~~

### components/theme-switcher / Page theme

**JS style write** · target: resolve from expression · [docs/components/theme-switcher.mdx:72](../../docs/components/theme-switcher.mdx#L72)

~~~~~text
document.documentElement.style.colorScheme = value;
~~~~~

### components/toggle-group / Font weight

**presentation hook** · target: resolve from expression · [docs/components/toggle-group.mdx:116](../../docs/components/toggle-group.mdx#L116)

~~~~~text
partContracts = {
    toggle: { styleHook: { 'block-size': 'auto', 'padding-block': 'var(--tp-space-2)' } },
    'toggle-content': { styleHook: { 'flex-direction': 'column', 'font-weight': item.dataset.weight } },
  }
~~~~~

### components/toggle-group / Font weight

**presentation hook** · target: resolve from expression · [docs/components/toggle-group.mdx:117](../../docs/components/toggle-group.mdx#L117)

~~~~~text
styleHook: { 'block-size': 'auto', 'padding-block': 'var(--tp-space-2)' }
~~~~~

### components/toggle-group / Font weight

**presentation hook** · target: resolve from expression · [docs/components/toggle-group.mdx:118](../../docs/components/toggle-group.mdx#L118)

~~~~~text
styleHook: { 'flex-direction': 'column', 'font-weight': item.dataset.weight }
~~~~~

### components/toggle / Pressed artwork

**presentation hook** · target: resolve from expression · [docs/components/toggle.mdx:103](../../docs/components/toggle.mdx#L103)

~~~~~text
partContracts = {
    'toggle-content': {
      content: (state) => html\`<tp-icon data-icon="inline-start" .icon=\${state.pressed ? filled : bookmark}></tp-icon> \${state.pressed ? 'Saved' : 'Save'}\`,
    },
  };
}`}
/>

### Beside Buttons

Toggles share the Button's variants and sizes, so a Toggle and a Button of the same size line up in a toolbar. Use the Button for a one-off action and the Toggle for a state that stays on.

<Preview
  title="With Buttons"
  code={`<tp-stack direction="row" gap="2" align="center" wrap="wrap">
  <tp-button variant="outline" size="sm">Insert link</tp-button>
  <tp-toggle variant="outline" size="sm">Spell check</tp-toggle>
  <tp-button variant="outline">Insert link</tp-button>
  <tp-toggle variant="outline" default-pressed>Spell check</tp-toggle>
</tp-stack>`}
/>

### Listening to changes

Every press proposes the inverse state through a cancelable `tp-value-change`. Read `event.detail.value` to react, or call `event.preventDefault()` to keep the current state. A disabled or canceled request does not change committed state.

The first update fixes controlled/uncontrolled ownership. A controlled callback accepts or rewrites by assigning `pressed`. Without an owner return, the committed state stays unchanged.

<Preview
  title="Change events"
  code={`<tp-stack gap="3" align="center">
  <tp-toggle id="toggle-mute" variant="outline">Mute notifications</tp-toggle>
  <output
    id="toggle-mute-output"
    style="color: var(--tp-muted-foreground); font-size: var(--tp-text-sm)"
    >Notifications are on</output
  >
</tp-stack>`}
  script={`const toggle = document.querySelector('#toggle-mute');
const output = document.querySelector('#toggle-mute-output');
toggle.addEventListener('tp-value-change', (event) => {
  output.textContent = event.detail.value ? 'Notifications are muted' : 'Notifications are on';
});`}
/>

### Disabled

<Preview
  title="Disabled"
  code={`<tp-toggle variant="outline" disabled>Archived</tp-toggle>
<tp-toggle variant="outline" disabled default-pressed>Pinned</tp-toggle>`}
/>

A disabled Toggle leaves the tab order and ignores presses; its pressed state is still shown.

### Inside a Toolbar

Register a Toggle with a `ToolbarController` as a `button` item. The toolbar then owns its tab stop: the Toggle joins the toolbar's single arrow-key sequence, while its pressed state, value and `aria-pressed` stay its own. A disabled Toggle, or any Toggle of a disabled toolbar, stays a focusable stop with `aria-disabled="true"` unless the item is registered with `focusableWhenDisabled: false`; pointer presses, Enter and Space leave its state unchanged. The toolbar's disabled state never becomes the Toggle's own `disabled` or `toggleDisabled`. Disposing the registration restores the standalone tab order.

<Code code={`import { ToolbarController } from '@tweakpad/ui';
import '@tweakpad/ui/register';

// Existing markup:
// <div id="format" aria-label="Formatting">
//   <tp-button id="clear">Clear</tp-button>
//   <tp-toggle id="wrap">Wrap lines</tp-toggle>
// </div>
await customElements.whenDefined('tp-button');
await customElements.whenDefined('tp-toggle');
const toolbar = new ToolbarController(document.getElementById('format')!);
toolbar.registerItem(document.getElementById('clear')!, { kind: 'button' });
toolbar.registerItem(document.getElementById('wrap')!, { kind: 'button' });`} language="typescript" />

A Toggle group inside a toolbar registers its own Toggles; do not register them yourself.

~~~~~

### components/tree-view / From records, reorderable

**JS style write** · target: resolve from expression · [docs/components/tree-view.mdx:148](../../docs/components/tree-view.mdx#L148)

~~~~~text
tree.style.cssText = 'inline-size:18rem';
~~~~~

### components/tree-view / Rendered rows

**JS style write** · target: resolve from expression · [docs/components/tree-view.mdx:196](../../docs/components/tree-view.mdx#L196)

~~~~~text
tree.style.inlineSize = '18rem';
~~~~~

### components/tree-view / Virtualized

**JS style write** · target: resolve from expression · [docs/components/tree-view.mdx:234](../../docs/components/tree-view.mdx#L234)

~~~~~text
tree.style.cssText = 'inline-size:18rem;
~~~~~

### components/tree-view / Controlled lanes

**JS style write** · target: resolve from expression · [docs/components/tree-view.mdx:284](../../docs/components/tree-view.mdx#L284)

~~~~~text
tree.style.cssText = 'inline-size:18rem';
~~~~~

### components/tree-view / Lazy folders

**JS style write** · target: resolve from expression · [docs/components/tree-view.mdx:335](../../docs/components/tree-view.mdx#L335)

~~~~~text
tree.style.cssText = 'inline-size:18rem;
~~~~~

### compositions/-security / (file/setup/shared helper)

**tagged stylesheet** · target: resolve from expression · [docs/content-security.md:16](../../docs/content-security.md#L16)

~~~~~text
css` through an allowed stylesheet link or your bundler's CSP-aware stylesheet handling; the service does not configure a bundler's development CSS injection.

| API                                           | Type / default                                                | Behavior                                                                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `
~~~~~

### compositions/rks / (file/setup/shared helper)

**stylesheet import** · target: resolve from expression · [docs/frameworks.md:10](../../docs/frameworks.md#L10)

~~~~~text
import '@tweakpad/ui/styles.css';
~~~~~

### compositions/md / Motion tokens

**tagged stylesheet** · target: resolve from expression · [docs/motion.md:8](../../docs/motion.md#L8)

~~~~~text
css`:

| Role                   | Default                          | Used for                                                       |
| ---------------------- | -------------------------------- | -------------------------------------------------------------- |
| `
~~~~~

### compositions/ion-panel / (file/setup/shared helper)

**stylesheet import** · target: resolve from expression · [docs/navigation-panel.md:8](../../docs/navigation-panel.md#L8)

~~~~~text
import '@tweakpad/ui/styles.css';
~~~~~

### compositions/field / (file/setup/shared helper)

**stylesheet import** · target: resolve from expression · [docs/number-field.md:22](../../docs/number-field.md#L22)

~~~~~text
import '@tweakpad/ui/styles.css';
~~~~~

### compositions/ / Presentation resolution and overrides

**presentation hook** · target: resolve from expression · [docs/styling.md:142](../../docs/styling.md#L142)

~~~~~text
partPresentation = {
  'card-content': {
    classHook: 'my-content',
    styleHook: { 'padding-inline-start': 'var(--tp-space-8)' },
  },
}
~~~~~

### compositions/ / Presentation resolution and overrides

**presentation hook** · target: resolve from expression · [docs/styling.md:145](../../docs/styling.md#L145)

~~~~~text
styleHook: { 'padding-inline-start': 'var(--tp-space-8)' }
~~~~~

### compositions/ / Constituent rendering contracts

**presentation hook** · target: resolve from expression · [docs/styling.md:167](../../docs/styling.md#L167)

~~~~~text
partContracts = {
  input: {
    renderDelegate: ({ bind }) => html`<input ${bind} />`,
    hostProperties: { spellcheck: false },
    classHook: (state) => (state.invalid ? 'invalid-editor' : 'editor'),
  },
}
~~~~~

### compositions/ / Constituent rendering contracts

**presentation hook** · target: resolve from expression · [docs/styling.md:170](../../docs/styling.md#L170)

~~~~~text
hostProperties: { spellcheck: false }
~~~~~

### compositions/ / (file/setup/shared helper)

**tagged stylesheet** · target: resolve from expression · [docs/styling.md:3](../../docs/styling.md#L3)

~~~~~text
css` once to install the default token set. Components consume inherited custom properties, so a complete token set can be replaced on `
~~~~~

### compositions//README / (file/setup/shared helper)

**stylesheet import** · target: resolve from expression · [docs/widgets/README.md:22](../../docs/widgets/README.md#L22)

~~~~~text
import '@tweakpad/ui/styles.css';
~~~~~

### widgets/color-picker / Reading the palette

**JS style write** · target: resolve from expression · [docs/widgets/color-picker.mdx:162](../../docs/widgets/color-picker.mdx#L162)

~~~~~text
chip.style.cssText = \`inline-size:2.5rem;block-size:1.5rem;border-radius:var(--tp-radius-md);background:\${color}
~~~~~

### widgets/color-picker / Controlled owner

**JS style write** · target: resolve from expression · [docs/widgets/color-picker.mdx:256](../../docs/widgets/color-picker.mdx#L256)

~~~~~text
sample.style.setProperty('--tp-primary', event.detail.value);
~~~~~

### widgets/flow / Controlled owner

**JS style write** · target: resolve from expression · [docs/widgets/flow.mdx:484](../../docs/widgets/flow.mdx#L484)

~~~~~text
flow.style.cssText = 'inline-size:100%;
~~~~~

### widgets/plot / Live signal

**presentation hook** · target: resolve from expression · [docs/widgets/plot.mdx:15](../../docs/widgets/plot.mdx#L15)

~~~~~text
partPresentation = {
  'plot-label': { styleHook: { display: 'none' } },
}
~~~~~

### widgets/plot / Live signal

**presentation hook** · target: resolve from expression · [docs/widgets/plot.mdx:16](../../docs/widgets/plot.mdx#L16)

~~~~~text
styleHook: { display: 'none' }
~~~~~

### widgets/plot / Distribution

**presentation hook** · target: resolve from expression · [docs/widgets/plot.mdx:51](../../docs/widgets/plot.mdx#L51)

~~~~~text
partPresentation = {
  'plot-label': { styleHook: { display: 'none' } },
}
~~~~~

### widgets/plot / Distribution

**presentation hook** · target: resolve from expression · [docs/widgets/plot.mdx:52](../../docs/widgets/plot.mdx#L52)

~~~~~text
styleHook: { display: 'none' }
~~~~~

### widgets/text-editor / Read-only and disabled

**presentation hook** · target: resolve from expression · [docs/widgets/text-editor.mdx:805](../../docs/widgets/text-editor.mdx#L805)

~~~~~text
partPresentation = {
  'text-editor-toolbar': { styleHook: { background: 'var(--tp-muted)' } },
  button: { styleHook: { 'border-radius': 'var(--tp-radius-sm)' } },
}
~~~~~

### widgets/text-editor / Read-only and disabled

**presentation hook** · target: resolve from expression · [docs/widgets/text-editor.mdx:806](../../docs/widgets/text-editor.mdx#L806)

~~~~~text
styleHook: { background: 'var(--tp-muted)' }
~~~~~

### widgets/text-editor / Read-only and disabled

**presentation hook** · target: resolve from expression · [docs/widgets/text-editor.mdx:807](../../docs/widgets/text-editor.mdx#L807)

~~~~~text
styleHook: { 'border-radius': 'var(--tp-radius-sm)' }
~~~~~

### widgets/text-editor / Custom nodes

**tagged stylesheet** · target: resolve from expression · [docs/widgets/text-editor.mdx:394](../../docs/widgets/text-editor.mdx#L394)

~~~~~text
css` string of a definition styles its nodes. The editor adopts it into its shadow root, nested under the content part, so its selectors are relative to the content part and reach the document only. Rules that a style rule cannot hold, such as `
~~~~~

### widgets/text-editor / Custom nodes

**tagged stylesheet** · target: resolve from expression · [docs/widgets/text-editor.mdx:394](../../docs/widgets/text-editor.mdx#L394)

~~~~~text
css` that leaves a brace, comment or string open is rejected with a `
~~~~~

### widgets/text-editor / Read-only and disabled

**tagged stylesheet** · target: resolve from expression · [docs/widgets/text-editor.mdx:810](../../docs/widgets/text-editor.mdx#L810)

~~~~~text
css` of their definitions.

When the editor grows with its content, the fixed toolbar stays at the top of the scrolling page on the editor's background; on a surface of another color, give `
~~~~~

### components/badge / Components/Badge

**presentation hook** · target: resolve from expression · [src/stories/badge.stories.ts:43](../../src/stories/badge.stories.ts#L43)

~~~~~text
partContracts=${
        interactive
          ? {
              badge: {
                renderDelegate: ({ bind, content }: PartRenderContext) =>
                  html`<button type="button" ${bind}>${content}</button>`,
              },
            }
          : {}
      }
~~~~~

### compositions/card.stories / (external demo stylesheet)

**external stylesheet** · target: selectors in source · [src/stories/card.stories.css:1](../../src/stories/card.stories.css#L1)

~~~~~text
.card-story {
  inline-size: min(calc(var(--tp-spacing) * 120), calc(100vw - var(--tp-space-10)));
}

~~~~~

### components/card / (file/setup/shared helper)

**stylesheet import** · target: resolve from expression · [src/stories/card.stories.ts:4](../../src/stories/card.stories.ts#L4)

~~~~~text
import './card.stories.css';
~~~~~

### compositions/carousel-effects.examples / (file/setup/shared helper)

**embedded stylesheet** · target: resolve from expression · [src/stories/carousel-effects.examples.ts:72](../../src/stories/carousel-effects.examples.ts#L72)

~~~~~text
<style>${demoStyles}</style>
~~~~~

### compositions/carousel-effects.examples / (file/setup/shared helper)

**stylesheet import** · target: resolve from expression · [src/stories/carousel-effects.examples.ts:4](../../src/stories/carousel-effects.examples.ts#L4)

~~~~~text
import demoStyles from './carousel-effects.stories.css?raw';
~~~~~

### compositions/carousel-effects.stories / (external demo stylesheet)

**external stylesheet** · target: selectors in source · [src/stories/carousel-effects.stories.css:1](../../src/stories/carousel-effects.stories.css#L1)

~~~~~text
.carousel-effect-demo {
  box-sizing: border-box;
  display: grid;
  gap: var(--tp-space-4);
  inline-size: 100%;
  max-inline-size: 52rem;
  margin-inline: auto;
}

.carousel-effect-demo tp-carousel {
  inline-size: 100%;
}

.carousel-effect-slide {
  position: relative;
  margin: 0;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--tp-radius-lg);
  background: var(--tp-muted);
}

.carousel-effect-demo--cards .carousel-effect-slide {
  aspect-ratio: 4 / 5;
}

.carousel-effect-slide img {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}

.carousel-effect-caption {
  position: absolute;
  inset-inline-start: var(--tp-space-6);
  inset-block-end: var(--tp-space-6);
  display: grid;
  gap: var(--tp-space-1);
  margin: 0;
  color: oklch(100% 0 0deg);
  text-shadow: 0 1px 12px oklch(0% 0 0deg / 55%);
}

.carousel-effect-caption strong {
  font-size: var(--tp-text-2xl);
  font-weight: var(--tp-font-semibold);
}

.carousel-effect-caption span {
  font-size: var(--tp-text-sm);
}

.carousel-effect-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--tp-space-4);
}

~~~~~

### compositions/carousel.stories / (external demo stylesheet)

**external stylesheet** · target: selectors in source · [src/stories/carousel.stories.css:1](../../src/stories/carousel.stories.css#L1)

~~~~~text
.carousel-demo {
  box-sizing: border-box;
  inline-size: 100%;
  max-inline-size: 26rem;
  margin-inline: auto;
  padding: 3rem;
}

.carousel-demo--vertical {
  block-size: 23rem;
}

.carousel-demo tp-carousel {
  inline-size: 100%;
}

.carousel-demo-card {
  display: block;
  aspect-ratio: 1;
}

.carousel-demo-card::part(card) {
  block-size: 100%;
}

.carousel-demo-card::part(card-content) {
  place-items: center;
  min-block-size: 0;
  font-size: calc(var(--tp-text-2xl) * 1.8);
  font-weight: var(--tp-font-semibold);
}

.carousel-demo--vertical .carousel-demo-card {
  block-size: 100%;
  aspect-ratio: auto;
}

.carousel-demo--vertical .carousel-demo-card::part(card-content) {
  font-size: calc(var(--tp-text-2xl) * 1.5);
}

.carousel-data-demo {
  inline-size: 100%;
  max-inline-size: 32rem;
  margin-inline: auto;
}

~~~~~

### components/carousel / (file/setup/shared helper)

**stylesheet import** · target: resolve from expression · [src/stories/carousel.stories.ts:5](../../src/stories/carousel.stories.ts#L5)

~~~~~text
import './carousel.stories.css';
~~~~~

### components/color-input / Components/Color input

**dynamic style binding** · target: tp-color-input · [src/stories/color-input.stories.ts:58](../../src/stories/color-input.stories.ts#L58)

~~~~~text
${args.variant === 'inline' ? 'inline-size: 18rem' : ''}
~~~~~

### compositions/date-picker-trigger / (file/setup/shared helper)

**JS style write** · target: resolve from expression · [src/stories/date-picker-trigger.js:27](../../src/stories/date-picker-trigger.js#L27)

~~~~~text
button.style.display = 'block';
~~~~~

### compositions/date-picker-trigger / (file/setup/shared helper)

**presentation hook** · target: resolve from expression · [src/stories/date-picker-trigger.js:14](../../src/stories/date-picker-trigger.js#L14)

~~~~~text
styleHook: {
        'justify-content': 'flex-start',
        'font-weight': 'var(--tp-font-normal)',
        'padding-inline': 'var(--tp-space-2-5)',
        ...(empty ? { color: 'var(--tp-muted-foreground)' } : {}),
      }
~~~~~

### compositions/date-picker-trigger / (file/setup/shared helper)

**presentation hook** · target: resolve from expression · [src/stories/date-picker-trigger.js:26](../../src/stories/date-picker-trigger.js#L26)

~~~~~text
partContracts = datePickerTriggerContracts(empty);
~~~~~

### compositions/design-tokens/design-tokens / (external demo stylesheet)

**external stylesheet** · target: selectors in source · [src/stories/design-tokens/design-tokens.css:1](../../src/stories/design-tokens/design-tokens.css#L1)

~~~~~text
/* The view is the themed surface: its theme switcher scopes the color scheme to it. */
design-tokens-view {
  display: block;
  box-sizing: border-box;
  min-block-size: 100vh;
  padding: var(--tp-space-8) clamp(var(--tp-space-4), 4vw, var(--tp-space-10));
  background: var(--tp-background);
  color: var(--tp-foreground);
}

.design-tokens {
  display: grid;
  gap: var(--tp-space-6);
  max-inline-size: 84rem;
}

.design-tokens-header {
  display: flex;
  flex-wrap: wrap;
  gap: var(--tp-space-4);
  align-items: flex-start;
  justify-content: space-between;
}

.design-tokens-header h1 {
  margin: 0;
  font-size: var(--tp-text-2xl);
  font-weight: var(--tp-font-semibold);
}

.design-tokens-header p,
.design-tokens-section-header p {
  margin: var(--tp-space-1) 0 0;
  max-inline-size: 48rem;
  color: var(--tp-muted-foreground);
}

.design-tokens-status {
  display: flex;
  gap: var(--tp-space-2);
}

.design-tokens-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--tp-space-3);
  align-items: flex-end;
}

.design-tokens-toolbar tp-input {
  inline-size: min(24rem, 100%);
}

.design-tokens-toolbar p {
  margin: 0;
}

.design-tokens-theme {
  margin-inline-start: auto;
}

.design-tokens-muted {
  color: var(--tp-muted-foreground);
  font-size: var(--tp-text-xs);
}

.design-tokens-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 12rem;
  gap: var(--tp-space-8);
  align-items: start;
}

.design-tokens-sections {
  display: grid;
  gap: var(--tp-space-10);
  min-inline-size: 0;
}

.design-tokens-toc {
  position: sticky;
  inset-block-start: var(--tp-space-4);
  max-block-size: calc(100vh - var(--tp-space-8));
  overflow: auto;
}

/* Narrow canvases drop the side column; the filter still narrows the sections. */
@media (width < 56rem) {
  .design-tokens-body {
    grid-template-columns: minmax(0, 1fr);
  }

  .design-tokens-toc {
    display: none;
  }
}

.design-tokens-section {
  display: grid;
  gap: var(--tp-space-3);
  scroll-margin-block-start: var(--tp-space-4);
}

.design-tokens-section-header {
  display: flex;
  flex-wrap: wrap;
  gap: var(--tp-space-3);
  align-items: flex-end;
  justify-content: space-between;
}

.design-tokens-section-header h2 {
  margin: 0;
  font-size: var(--tp-text-lg);
  font-weight: var(--tp-font-semibold);
}

/* Columns line up across every family; narrow canvases scroll the table, not the page. */
.design-tokens-section table {
  min-inline-size: 46rem;
}

.design-tokens-col-preview {
  inline-size: 11rem;
}

.design-tokens-col-token {
  inline-size: 15rem;
}

.design-tokens-col-value {
  inline-size: 15rem;
}

.design-tokens-section :is(td, th[scope='row']) {
  vertical-align: middle;
  white-space: normal;
}

.design-tokens-section th[scope='row'] {
  font-weight: var(--tp-font-normal);
}

.design-tokens-section :is(th[scope='row'], .design-tokens-value) code {
  overflow-wrap: anywhere;
}

.design-tokens-description {
  color: var(--tp-muted-foreground);
}

.design-tokens-value {
  display: grid;
  gap: var(--tp-space-1);
}

.design-tokens-definition {
  color: var(--tp-muted-foreground);
  font-size: var(--tp-text-xs);
}

.design-tokens-color {
  display: flex;
  flex-wrap: wrap;
  gap: var(--tp-space-2);
  align-items: center;
}

/* Specimens: each draws one role through --_token. Outlines, rings and shadows may extend past
   a specimen into the cell padding; only text samples clip to their column. */
.design-tokens-specimen {
  display: flex;
  align-items: center;
  min-block-size: var(--tp-space-10);
}

.design-tokens-tile {
  display: grid;
  place-items: center;
  box-sizing: border-box;
  inline-size: var(--tp-space-12);
  block-size: var(--tp-space-10);
  border: var(--tp-border-width) var(--tp-border-style) var(--tp-border);
  border-radius: var(--tp-radius-md);
  background: var(--tp-background);
  color: var(--tp-foreground);
}

.design-tokens-tile[data-preview='fill'] {
  background: var(--_token);
}

.design-tokens-tile[data-preview='line'] {
  border: var(--tp-border-width-strong) var(--tp-border-style) var(--_token);
}

/* The ring is drawn outside the tile; the indent lines its outer edge up with the other swatches. */
.design-tokens-tile[data-preview='ring'] {
  margin-inline-start: calc(var(--tp-ring-width) + var(--tp-ring-offset));
  outline: var(--tp-ring-width) solid var(--_token);
  outline-offset: var(--tp-ring-offset);
}

.design-tokens-tile[data-preview='foreground'] {
  background: var(--_surface);
  color: var(--_token);
  font-weight: var(--tp-font-medium);
}

/* A content color's foreground sample on its surface and then on the background. */
.design-tokens-specimen[data-preview='content'] {
  gap: var(--tp-space-2);
}

.design-tokens-tile[data-preview='syntax'] {
  inline-size: auto;
  min-inline-size: var(--tp-space-12);
  padding-inline: var(--tp-space-2);
  color: var(--_token);
  font-family: var(--tp-font-mono);
  font-size: var(--tp-text-xs);
  white-space: nowrap;
}

.design-tokens-specimen[data-preview='font-family'] {
  font-family: var(--_token);
}

.design-tokens-specimen[data-preview='font-size'] {
  font-size: var(--_token);
  line-height: var(--tp-leading-tight);
}

.design-tokens-specimen[data-preview='font-weight'] {
  font-weight: var(--_token);
}

.design-tokens-specimen[data-preview='tracking'] {
  font-size: var(--tp-text-lg);
  letter-spacing: var(--_token);
}

.design-tokens-specimen:is(
  [data-preview='font-family'],
  [data-preview='font-size'],
  [data-preview='font-weight'],
  [data-preview='tracking']
) {
  overflow: hidden;
  white-space: nowrap;
}

.design-tokens-specimen[data-preview='leading'] {
  padding-inline: var(--tp-space-2);
  border-radius: var(--tp-radius-sm);
  background: var(--tp-muted);
  font-size: var(--tp-text-sm);
  line-height: var(--_token);
}

.design-tokens-specimen > span:empty {
  display: block;
  box-sizing: border-box;
}

.design-tokens-specimen[data-preview='bar'] > span {
  inline-size: var(--_token);
  block-size: var(--tp-space-3);
  border-inline-start: var(--tp-border-width) var(--tp-border-style) var(--tp-foreground);
  background: var(--tp-primary);
}

.design-tokens-specimen[data-preview='box-height'] > span {
  inline-size: var(--tp-space-16);
  block-size: var(--_token);
  border: var(--tp-border-width) var(--tp-border-style) var(--tp-border);
  border-radius: var(--tp-radius-md);
  background: var(--tp-muted);
}

/* The dashed frame sits on the icon's own edge, so it marks the exact extent. */
.design-tokens-icon {
  outline: var(--tp-border-width) dashed var(--tp-border);
  outline-offset: calc(var(--tp-border-width) * -1);
  color: var(--tp-foreground);
}

.design-tokens-specimen[data-preview='target'] > span {
  inline-size: var(--_token);
  block-size: var(--_token);
  border: var(--tp-border-width) dashed var(--tp-muted-foreground);
  border-radius: var(--tp-radius-sm);
}

.design-tokens-specimen:is(
  [data-preview='border-width'],
  [data-preview='border-style'],
  [data-preview='ring-width'],
  [data-preview='ring-offset'],
  [data-preview='radius'],
  [data-preview='shadow'],
  [data-preview='opacity']
) {
  padding-inline: var(--tp-space-2);
}

.design-tokens-specimen:is(
    [data-preview='border-width'],
    [data-preview='border-style'],
    [data-preview='ring-width'],
    [data-preview='ring-offset'],
    [data-preview='radius'],
    [data-preview='shadow'],
    [data-preview='opacity']
  )
  > span {
  inline-size: var(--tp-space-12);
  block-size: var(--tp-space-8);
  border-radius: var(--tp-radius-sm);
}

.design-tokens-specimen[data-preview='border-width'] > span {
  border: var(--_token) var(--tp-border-style) var(--tp-foreground);
}

.design-tokens-specimen[data-preview='border-style'] > span {
  border: var(--tp-border-width-strong) var(--_token) var(--tp-foreground);
}

.design-tokens-specimen[data-preview='ring-width'] > span {
  border: var(--tp-border-width) var(--tp-border-style) var(--tp-border);
  outline: var(--_token) solid var(--tp-ring);
  outline-offset: var(--tp-ring-offset);
}

.design-tokens-specimen[data-preview='ring-offset'] > span {
  border: var(--tp-border-width) var(--tp-border-style) var(--tp-border);
  outline: var(--tp-ring-width) solid var(--tp-ring);
  outline-offset: var(--_token);
}

/* One large corner, so neighboring steps read apart. */
.design-tokens-specimen[data-preview='radius'] > span {
  block-size: var(--tp-space-12);
  border-block-start: var(--tp-border-width-strong) var(--tp-border-style) var(--tp-foreground);
  border-inline-start: var(--tp-border-width-strong) var(--tp-border-style) var(--tp-foreground);
  border-start-start-radius: var(--_token);
  background: linear-gradient(135deg, var(--tp-muted), transparent 70%);
}

/* Room for the largest blur inside the table's scroll region. */
.design-tokens-specimen[data-preview='shadow'] {
  padding: var(--tp-space-6) var(--tp-space-10);
}

.design-tokens-specimen[data-preview='shadow'] > span {
  border: var(--tp-border-width) var(--tp-border-style) var(--tp-border);
  background: var(--tp-card);
  box-shadow: var(--_token);
}

.design-tokens-specimen[data-preview='opacity'] > span {
  background: var(--tp-foreground);
  opacity: var(--_token);
}

/* Motion: the dot crosses its track when the section is played, and returns on the next play. */
.design-tokens-track {
  --_direction: 1;

  position: relative;
  container-type: inline-size;
  min-block-size: 0;
  block-size: var(--tp-space-3);
  border-radius: var(--tp-radius-full);
  background: var(--tp-muted);
}

.design-tokens-track:dir(rtl) {
  --_direction: -1;
}

.design-tokens-dot {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  aspect-ratio: 1;
  border-radius: var(--tp-radius-full);
  background: var(--tp-primary);
  transition: translate calc(var(--_duration) * var(--tp-motion-scale)) var(--_easing);
}

.design-tokens-section[data-at-end] .design-tokens-dot {
  translate: calc((100cqi - 100%) * var(--_direction)) 0;
}

.design-tokens-easing {
  gap: var(--tp-space-3);
}

.design-tokens-easing .design-tokens-track {
  flex: 1 1 0;
}

.design-tokens-curve {
  flex: none;
  inline-size: var(--tp-space-10);
  block-size: var(--tp-space-10);
  overflow: visible;
}

.design-tokens-curve rect {
  fill: none;
  stroke: var(--tp-border);
  stroke-width: var(--tp-border-width);
  vector-effect: non-scaling-stroke;
}

.design-tokens-curve path {
  fill: none;
  stroke: var(--tp-primary);
  stroke-width: var(--tp-border-width-strong);
  vector-effect: non-scaling-stroke;
}

.design-tokens-probe {
  position: absolute;
  inline-size: 0;
  block-size: 0;
  overflow: hidden;
  visibility: hidden;
}

~~~~~

### compositions/design-tokens/design-tokens / (file/setup/shared helper)

**dynamic style binding** · target: span · [src/stories/design-tokens/design-tokens.ts:377](../../src/stories/design-tokens/design-tokens.ts#L377)

~~~~~text
${token}
~~~~~

### compositions/design-tokens/design-tokens / (file/setup/shared helper)

**dynamic style binding** · target: span · [src/stories/design-tokens/design-tokens.ts:384](../../src/stories/design-tokens/design-tokens.ts#L384)

~~~~~text
"${token}; --_surface: var(--tp-${PAIRED_SURFACE[role]})"
~~~~~

### compositions/design-tokens/design-tokens / (file/setup/shared helper)

**dynamic style binding** · target: span · [src/stories/design-tokens/design-tokens.ts:395](../../src/stories/design-tokens/design-tokens.ts#L395)

~~~~~text
"${token}; --_surface: var(--tp-${surface})"
~~~~~

### compositions/design-tokens/design-tokens / (file/setup/shared helper)

**dynamic style binding** · target: span · [src/stories/design-tokens/design-tokens.ts:402](../../src/stories/design-tokens/design-tokens.ts#L402)

~~~~~text
${token}
~~~~~

### compositions/design-tokens/design-tokens / (file/setup/shared helper)

**dynamic style binding** · target: span · [src/stories/design-tokens/design-tokens.ts:417](../../src/stories/design-tokens/design-tokens.ts#L417)

~~~~~text
${token}
~~~~~

### compositions/design-tokens/design-tokens / (file/setup/shared helper)

**dynamic style binding** · target: span · [src/stories/design-tokens/design-tokens.ts:425](../../src/stories/design-tokens/design-tokens.ts#L425)

~~~~~text
${token}
~~~~~

### compositions/design-tokens/design-tokens / (file/setup/shared helper)

**dynamic style binding** · target: span · [src/stories/design-tokens/design-tokens.ts:434](../../src/stories/design-tokens/design-tokens.ts#L434)

~~~~~text
"${token}; --_duration: var(--tp-${role}); --_easing: var(--tp-easing-standard); inline-size: ${Math.max(share, 0.1) * 100}%"
~~~~~

### compositions/design-tokens/design-tokens / (file/setup/shared helper)

**dynamic style binding** · target: span · [src/stories/design-tokens/design-tokens.ts:444](../../src/stories/design-tokens/design-tokens.ts#L444)

~~~~~text
"--_duration: var(--tp-duration-normal); --_easing: var(--tp-${role})"
~~~~~

### compositions/design-tokens/design-tokens / (file/setup/shared helper)

**dynamic style binding** · target: span · [src/stories/design-tokens/design-tokens.ts:452](../../src/stories/design-tokens/design-tokens.ts#L452)

~~~~~text
${token}
~~~~~

### compositions/design-tokens/design-tokens / (file/setup/shared helper)

**JS style write** · target: resolve from expression · [src/stories/design-tokens/design-tokens.ts:124](../../src/stories/design-tokens/design-tokens.ts#L124)

~~~~~text
element.style.cssText = declarations;
~~~~~

### compositions/design-tokens/design-tokens / (file/setup/shared helper)

**stylesheet import** · target: resolve from expression · [src/stories/design-tokens/design-tokens.ts:12](../../src/stories/design-tokens/design-tokens.ts#L12)

~~~~~text
import stylesheet from '../../styles.css?raw';
~~~~~

### compositions/design-tokens/design-tokens / (file/setup/shared helper)

**stylesheet import** · target: resolve from expression · [src/stories/design-tokens/design-tokens.ts:28](../../src/stories/design-tokens/design-tokens.ts#L28)

~~~~~text
import './design-tokens.css';
~~~~~

### compositions/documentation-examples / WIDGET_REGISTER_IMPORTS

**dynamic style binding** · target: div · [src/stories/documentation-examples.ts:116](../../src/stories/documentation-examples.ts#L116)

~~~~~text
"${wrapperStyle}"
~~~~~

### compositions/documentation-examples / WIDGET_REGISTER_IMPORTS

**stylesheet import** · target: resolve from expression · [src/stories/documentation-examples.ts:139](../../src/stories/documentation-examples.ts#L139)

~~~~~text
import '@tweakpad/ui/styles.css';\n${script}
~~~~~

### compositions/map-example / (file/setup/shared helper)

**stylesheet import** · target: resolve from expression · [src/stories/map-example.js:2](../../src/stories/map-example.js#L2)

~~~~~text
import maplibreCss from 'maplibre-gl/dist/maplibre-gl.css?raw';
~~~~~

### compositions/map.examples / pinSvg

**dynamic style binding** · target: tp-map-pin · [src/stories/map.examples.ts:53](../../src/stories/map.examples.ts#L53)

~~~~~text
"color: ${place.color}"
~~~~~

### compositions/map.examples / pinSvg

**dynamic style binding** · target: tp-button · [src/stories/map.examples.ts:99](../../src/stories/map.examples.ts#L99)

~~~~~text
"${options.style}"
~~~~~

### compositions/map.examples / tokenThemeExample

**style option** · target: resolve from expression · [src/stories/map.examples.ts:232](../../src/stories/map.examples.ts#L232)

~~~~~text
style: 'color-scheme: dark',
~~~~~

### compositions/map.examples / Token theme

**style option** · target: resolve from expression · [src/stories/map.examples.ts:241](../../src/stories/map.examples.ts#L241)

~~~~~text
style: 'https://tiles.openfreemap.org/styles/positron' });
~~~~~

### compositions/map.examples / Token theme

**style option** · target: resolve from expression · [src/stories/map.examples.ts:250](../../src/stories/map.examples.ts#L250)

~~~~~text
style: 'https://tiles.openfreemap.org/styles/positron' }),
~~~~~

### compositions/map.examples / pinSvg

**stylesheet import** · target: resolve from expression · [src/stories/map.examples.ts:156](../../src/stories/map.examples.ts#L156)

~~~~~text
import maplibreCss from 'maplibre-gl/dist/maplibre-gl.css?raw';
~~~~~

### compositions/map.examples / pinSvg

**stylesheet import** · target: resolve from expression · [src/stories/map.examples.ts:175](../../src/stories/map.examples.ts#L175)

~~~~~text
import '@tweakpad/ui/styles.css';\n${script}
~~~~~

### compositions/media-player.examples / mediaPlayerDemoSource

**stylesheet import** · target: resolve from expression · [src/stories/media-player.examples.ts:39](../../src/stories/media-player.examples.ts#L39)

~~~~~text
import '@tweakpad/ui/styles.css';
~~~~~

### compositions/menu-family-controls / sourceImports

**stylesheet import** · target: resolve from expression · [src/stories/menu-family-controls.ts:77](../../src/stories/menu-family-controls.ts#L77)

~~~~~text
import '@tweakpad/ui/styles.css';
~~~~~

### compositions/menu-family-controls / sourceImports

**stylesheet import** · target: resolve from expression · [src/stories/menu-family-controls.ts:92](../../src/stories/menu-family-controls.ts#L92)

~~~~~text
import '@tweakpad/ui/styles.css';\n  render(html\`${configured}
~~~~~

### compositions/message-example / (file/setup/shared helper)

**JS style write** · target: resolve from expression · [src/stories/message-example.js:51](../../src/stories/message-example.js#L51)

~~~~~text
message.querySelector('[data-delivery]').style.removeProperty('color');
~~~~~

### compositions/message-scroller-streaming / conversation

**presentation hook** · target: resolve from expression · [src/stories/message-scroller-streaming.ts:238](../../src/stories/message-scroller-streaming.ts#L238)

~~~~~text
partContracts=${{ 'message-scroller-content': { hostProperties: { 'aria-busy': String(this.streaming) } } }}
~~~~~

### compositions/message-scroller-streaming / conversation

**presentation hook** · target: resolve from expression · [src/stories/message-scroller-streaming.ts:238](../../src/stories/message-scroller-streaming.ts#L238)

~~~~~text
hostProperties: { 'aria-busy': String(this.streaming) }
~~~~~

### compositions/message-scroller-streaming / conversation

**tagged stylesheet** · target: resolve from expression · [src/stories/message-scroller-streaming.ts:60](../../src/stories/message-scroller-streaming.ts#L60)

~~~~~text
css`
    :host {
      display: block;
      inline-size: 100%;
      font-size: var(--tp-text-sm);
    }

    tp-card {
      display: block;
      inline-size: 100%;
      max-inline-size: 24rem;
      margin-inline: auto;
    }

    tp-card::part(card) {
      block-size: 35rem;
      grid-template-rows: auto minmax(0, 1fr) auto;
      border-radius: min(var(--tp-radius-4xl), 1.5rem);
    }

    tp-card::part(card-title) {
      font-size: var(--tp-text-base);
      font-weight: var(--tp-font-medium);
    }

    tp-card::part(card-action) {
      grid-row: 1 / 3;
      align-self: start;
    }

    tp-card::part(card-content) {
      min-block-size: 0;
      overflow: hidden;
      padding: 0;
    }

    tp-card::part(card-footer) {
      border: 0;
    }

    tp-form {
      inline-size: 100%;
    }

    tp-input-group::part(input-group) {
      background: color-mix(in oklab, var(--tp-input) 50%, transparent);
      border-color: transparent;
      border-radius: var(--tp-radius-3xl);
    }

    tp-text-area::part(text-area) {
      box-sizing: border-box;
      block-size: 3.5rem;
      min-block-size: 0;
      overflow: hidden;
    }

    .composer-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      inline-size: 100%;
      gap: inherit;
    }

    tp-button::part(button) {
      border-radius: var(--tp-radius-full);
    }

    tp-empty-state {
      display: grid;
      place-items: center;
      min-block-size: 0;
    }

    tp-empty-state::part(empty-state-title) {
      font-size: var(--tp-text-xl);
    }

    tp-empty-state::part(empty-state-media) {
      inline-size: 2.5rem;
      block-size: 2.5rem;
    }

    tp-message-scroller {
      min-block-size: 0;
      block-size: 100%;

      --tp-message-scroller-height: 100%;
    }

    tp-bubble::part(bubble) {
      border-radius: var(--tp-radius-4xl);
    }

    tp-bubble p {
      white-space: pre-wrap;
    }

    .note {
      max-inline-size: 24rem;
      margin: var(--tp-space-4) auto 0;
      text-align: center;
      color: var(--tp-muted-foreground);
      font-size: var(--tp-text-xs);
    }
  `
~~~~~

### compositions/message-scroller-use-cases / Reading scroll state

**presentation hook** · target: resolve from expression · [src/stories/message-scroller-use-cases.ts:392](../../src/stories/message-scroller-use-cases.ts#L392)

~~~~~text
partPresentation=${{ 'preview-card-content': { styleHook: { 'inline-size': '16rem' } } }}
~~~~~

### compositions/message-scroller-use-cases / Reading scroll state

**presentation hook** · target: resolve from expression · [src/stories/message-scroller-use-cases.ts:392](../../src/stories/message-scroller-use-cases.ts#L392)

~~~~~text
styleHook: { 'inline-size': '16rem' }
~~~~~

### compositions/message-scroller-use-cases / Reading scroll state

**presentation hook** · target: resolve from expression · [src/stories/message-scroller-use-cases.ts:399](../../src/stories/message-scroller-use-cases.ts#L399)

~~~~~text
partContracts=${{ button: { hostProperties: { 'aria-current': row.id === this.currentAnchor ? 'location' : undefined }, styleHook: { 'inline-size': '100%', 'justify-content': 'start', 'text-align': 'start', 'white-space': 'normal', height: 'auto', background: row.id === this.currentAnchor ? 'var(--tp-accent)' : undefined } } }}
~~~~~

### compositions/message-scroller-use-cases / Reading scroll state

**presentation hook** · target: resolve from expression · [src/stories/message-scroller-use-cases.ts:399](../../src/stories/message-scroller-use-cases.ts#L399)

~~~~~text
hostProperties: { 'aria-current': row.id === this.currentAnchor ? 'location' : undefined }
~~~~~

### compositions/message-scroller-use-cases / Reading scroll state

**presentation hook** · target: resolve from expression · [src/stories/message-scroller-use-cases.ts:399](../../src/stories/message-scroller-use-cases.ts#L399)

~~~~~text
styleHook: { 'inline-size': '100%', 'justify-content': 'start', 'text-align': 'start', 'white-space': 'normal', height: 'auto', background: row.id === this.currentAnchor ? 'var(--tp-accent)' : undefined }
~~~~~

### compositions/message-scroller-use-cases / Reading scroll state

**presentation hook** · target: resolve from expression · [src/stories/message-scroller-use-cases.ts:484](../../src/stories/message-scroller-use-cases.ts#L484)

~~~~~text
partContracts=${{ 'slider-output': { content: (state: Record<string, unknown>) => `${(state.values as number[])[0]}px` } }}
~~~~~

### compositions/message-scroller-use-cases / Reading scroll state

**tagged stylesheet** · target: resolve from expression · [src/stories/message-scroller-use-cases.ts:177](../../src/stories/message-scroller-use-cases.ts#L177)

~~~~~text
css`
      .frame {
        position: relative;
        max-inline-size: 24rem;
        margin-inline: auto;
      }

      .frame.outlined {
        padding-inline-end: var(--tp-space-10);
      }

      .footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: inherit;
        inline-size: 100%;
        min-inline-size: 0;
      }

      .footer.stack {
        flex-direction: column;
      }

      .footer.stack > tp-button {
        inline-size: 100%;
      }

      .footer.stack > tp-button::part(button) {
        inline-size: 100%;
      }

      .footer output {
        font-size: var(--tp-text-xs);
        color: var(--tp-muted-foreground);
        text-align: center;
      }

      tp-card[data-divider]::part(card-footer) {
        border-block-start: var(--tp-border-width) solid var(--tp-border);
      }

      tp-card[data-footerless]::part(card) {
        grid-template-rows: auto minmax(0, 1fr);
      }

      tp-select {
        inline-size: 12rem;
        max-inline-size: calc(100% - 3rem);
      }

      tp-tabs {
        inline-size: 100%;
      }

      tp-tabs::part(tabs-list) {
        display: flex;
        justify-content: space-between;
      }

      .peek {
        inline-size: 8rem;
        min-inline-size: 0;
      }

      .outline {
        position: absolute;
        inset-inline-end: 0;
        inset-block-start: 50%;
        translate: 0 -50%;
      }

      .outline tp-icon {
        inline-size: 1.25rem;
        block-size: 1.25rem;
      }

      .status {
        inline-size: 100%;
        text-align: center;
        color: var(--tp-muted-foreground);
        font-size: var(--tp-text-sm);
      }
    `
~~~~~

### compositions/navigation-panel-example / navigationPanelExampleMarkup

**presentation hook** · target: resolve from expression · [src/stories/navigation-panel-example.js:129](../../src/stories/navigation-panel-example.js#L129)

~~~~~text
partPresentation = {
    ...account.partPresentation,
    'menu-label': {
      styleHook: { display: 'flex', 'align-items': 'center', gap: 'var(--tp-space-2)' },
    },
  }
~~~~~

### compositions/navigation-panel-example / navigationPanelExampleMarkup

**presentation hook** · target: resolve from expression · [src/stories/navigation-panel-example.js:132](../../src/stories/navigation-panel-example.js#L132)

~~~~~text
styleHook: { display: 'flex', 'align-items': 'center', gap: 'var(--tp-space-2)' }
~~~~~

### components/overflow-list / Components/Overflow list

**dynamic style binding** · target: div · [src/stories/overflow-list.stories.ts:71](../../src/stories/overflow-list.stories.ts#L71)

~~~~~text
"inline-size:${width}px"
~~~~~

### components/progress / Components/Progress

**presentation hook** · target: resolve from expression · [src/stories/progress.stories.ts:48](../../src/stories/progress.stories.ts#L48)

~~~~~text
partContracts=${{ 'progress-value-output': { content: (state: Readonly<Record<string, unknown>>) => state.formattedValue } }}
~~~~~

### compositions/questionnaire-example / (file/setup/shared helper)

**presentation hook** · target: resolve from expression · [src/stories/questionnaire-example.js:74](../../src/stories/questionnaire-example.js#L74)

~~~~~text
partContracts = {
      'questionnaire-progress': {
        renderDelegate: ({ bind, state }) =>
          html`<div ${bind}>
            <tp-progress
              aria-hidden="true"
              .value=${state.current}
              .maximum=${state.total}
            ></tp-progress>
            <span>Checkpoint ${state.current} of ${state.total}</span>
          </div>`,
      },
    }
~~~~~

### compositions/questionnaire-example / (file/setup/shared helper)

**presentation hook** · target: resolve from expression · [src/stories/questionnaire-example.js:90](../../src/stories/questionnaire-example.js#L90)

~~~~~text
partContracts = {
      questionnaire: {
        renderDelegate: ({ bind, state }) =>
          html`<form ${bind}>${state.regions.answers}${state.regions.question}</form>`,
      },
      'questionnaire-question': {
        renderDelegate: ({ bind, state }) =>
          html`<fieldset ${bind}>
            <tp-card>
              ${state.regions.title}${state.regions.description}${state.regions.progress}
              ${state.regions.choices}${state.regions.error} ${state.regions.actions}
            </tp-card>
          </fieldset>`,
      },
      'questionnaire-actions': { hostProperties: { slot: 'footer' } },
      'questionnaire-description': { hostProperties: { slot: 'description' } },
      'questionnaire-progress': { hostProperties: { slot: 'action' } },
      'questionnaire-title': {
        hostProperties: { slot: 'header' },
        renderDelegate: ({ bind, content }) => html`<span ${bind}>${content}</span>`,
      },
      ...(kind === 'validation'
        ? {
            'questionnaire-progress': {
              hostProperties: { slot: 'action' },
              content: (state) => `${state.current} / ${state.total}`,
            },
          }
        : {}),
    }
~~~~~

### compositions/questionnaire-example / (file/setup/shared helper)

**presentation hook** · target: resolve from expression · [src/stories/questionnaire-example.js:104](../../src/stories/questionnaire-example.js#L104)

~~~~~text
hostProperties: { slot: 'footer' }
~~~~~

### compositions/questionnaire-example / (file/setup/shared helper)

**presentation hook** · target: resolve from expression · [src/stories/questionnaire-example.js:105](../../src/stories/questionnaire-example.js#L105)

~~~~~text
hostProperties: { slot: 'description' }
~~~~~

### compositions/questionnaire-example / (file/setup/shared helper)

**presentation hook** · target: resolve from expression · [src/stories/questionnaire-example.js:106](../../src/stories/questionnaire-example.js#L106)

~~~~~text
hostProperties: { slot: 'action' }
~~~~~

### compositions/questionnaire-example / (file/setup/shared helper)

**presentation hook** · target: resolve from expression · [src/stories/questionnaire-example.js:108](../../src/stories/questionnaire-example.js#L108)

~~~~~text
hostProperties: { slot: 'header' }
~~~~~

### compositions/questionnaire-example / (file/setup/shared helper)

**presentation hook** · target: resolve from expression · [src/stories/questionnaire-example.js:114](../../src/stories/questionnaire-example.js#L114)

~~~~~text
hostProperties: { slot: 'action' }
~~~~~

### compositions/questionnaire-example / (file/setup/shared helper)

**presentation hook** · target: resolve from expression · [src/stories/questionnaire-example.js:124](../../src/stories/questionnaire-example.js#L124)

~~~~~text
partContracts = {
      'questionnaire-question': {
        elementReference: (element) => {
          if (element === item) return;
          animation?.cancel();
          item = element;
          if (!element) return;
          // Part refs attach during rendering; wait until inherited styles are resolved.
          view.queueMicrotask(() => {
            if (item !== element || !element.isConnected || cleanup.signal.aborted) return;
            // Use the inherited library motion scale (includes OS and explicit reduce policy).
            const style = view.getComputedStyle(element);
            const scale = Number(style.getPropertyValue('--tp-motion-scale').trim() || 1);
            if (!scale) return;
            // Duration roles compute to seconds (`0.28s`).
            const duration = parseFloat(style.getPropertyValue('--tp-duration-normal')) * 1000;
            if (!duration) return;
            animation = element.animate(
              [
                { opacity: 0, transform: 'translateY(0.5rem)' },
                { opacity: 1, transform: 'none' },
              ],
              { duration: duration * scale, easing: style.getPropertyValue('--tp-easing-enter') },
            );
          });
        },
      },
    }
~~~~~

### compositions/questionnaire-example / (file/setup/shared helper)

**presentation hook** · target: resolve from expression · [src/stories/questionnaire-example.js:182](../../src/stories/questionnaire-example.js#L182)

~~~~~text
partContracts = {
      ...q.partContracts,
      questionnaire: {
        renderDelegate: ({ bind, content }) =>
          html`<form ${bind}>
            ${kind === 'shortcuts' ? accessory : null}${content}${kind === 'resume' ? accessory : null}
          </form>`,
      },
    }
~~~~~

### compositions/size-report/size-chart / sizeChartRenderer

**JS style write** · target: resolve from expression · [src/stories/size-report/size-chart.ts:32](../../src/stories/size-report/size-chart.ts#L32)

~~~~~text
svg.style.display = 'block';
~~~~~

### compositions/size-report/size-chart / sizeChartRenderer

**JS style write** · target: resolve from expression · [src/stories/size-report/size-chart.ts:33](../../src/stories/size-report/size-chart.ts#L33)

~~~~~text
svg.style.inlineSize = '100%';
~~~~~

### compositions/size-report/size-chart / sizeChartRenderer

**JS style write** · target: resolve from expression · [src/stories/size-report/size-chart.ts:78](../../src/stories/size-report/size-chart.ts#L78)

~~~~~text
group.style.outline = 'none';
~~~~~

### compositions/size-report/size-report / (external demo stylesheet)

**external stylesheet** · target: selectors in source · [src/stories/size-report/size-report.css:1](../../src/stories/size-report/size-report.css#L1)

~~~~~text
.size-report {
  display: grid;
  gap: var(--tp-space-6);
  max-inline-size: 76rem;
}

.size-report-header {
  display: flex;
  flex-wrap: wrap;
  gap: var(--tp-space-4);
  align-items: flex-start;
  justify-content: space-between;
}

.size-report-header h1 {
  margin: 0;
  font-size: var(--tp-text-2xl);
  font-weight: var(--tp-font-semibold);
}

.size-report-header p,
.size-report-method p {
  margin: var(--tp-space-1) 0 0;
  color: var(--tp-muted-foreground);
}

.size-report-status {
  display: flex;
  gap: var(--tp-space-2);
}

.size-report-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: var(--tp-space-4);
}

/* Share header and value tracks across each row, including wrapped descriptions. */
.size-report-cards > tp-card,
.size-report-cards > tp-card::part(card) {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 2;
  row-gap: 0;
}

.size-report-cards > tp-card::part(card-header) {
  align-content: start;
}

/* Package paths are long unbroken words in the mono role; let them wrap inside the card. */
.size-report-cards code {
  overflow-wrap: anywhere;
}

.size-report-cards h2 {
  margin: 0;
  font-size: var(--tp-text-sm);
  font-weight: var(--tp-font-medium);
  color: var(--tp-muted-foreground);
}

.size-report-cards [slot='description'] {
  margin: 0;
}

.size-report-figure {
  margin: 0;
  font-size: var(--tp-text-2xl);
  font-weight: var(--tp-font-semibold);
  font-variant-numeric: tabular-nums;
}

.size-report-tabs [slot='panel'] {
  padding-block-start: var(--tp-space-4);
}

.size-report-chart {
  display: block;
  max-inline-size: 56rem;
}

.size-report-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--tp-space-3);
  align-items: flex-end;
  margin-block-end: var(--tp-space-3);
}

.size-report-toolbar tp-input {
  inline-size: min(24rem, 100%);
}

.size-report-toolbar tp-select {
  inline-size: 12rem;
}

.size-report-name {
  display: block;
  font-weight: var(--tp-font-medium);
}

.size-report-muted {
  display: block;
  color: var(--tp-muted-foreground);
  font-size: var(--tp-text-xs);
}

.size-report-number {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.size-report-method {
  max-inline-size: 48rem;
}

.size-report-method li {
  margin-block: var(--tp-space-2);
}

~~~~~

### compositions/size-report/size-report / (file/setup/shared helper)

**presentation hook** · target: resolve from expression · [src/stories/size-report/size-report.ts:32](../../src/stories/size-report/size-report.ts#L32)

~~~~~text
styleHook: { 'aspect-ratio': 'auto' }
~~~~~

### compositions/size-report/size-report / (file/setup/shared helper)

**presentation hook** · target: resolve from expression · [src/stories/size-report/size-report.ts:136](../../src/stories/size-report/size-report.ts#L136)

~~~~~text
partPresentation=${chartPresentation}
~~~~~

### compositions/size-report/size-report / (file/setup/shared helper)

**stylesheet import** · target: resolve from expression · [src/stories/size-report/size-report.ts:5](../../src/stories/size-report/size-report.ts#L5)

~~~~~text
import './size-report.css';
~~~~~

### compositions/skeleton.examples / skeletonSource

**dynamic style binding** · target: tp-skeleton · [src/stories/skeleton.examples.ts:47](../../src/stories/skeleton.examples.ts#L47)

~~~~~text
"inline-size:${width};block-size:var(--tp-space-4)"
~~~~~

### compositions/slider-example / (file/setup/shared helper)

**presentation hook** · target: resolve from expression · [src/stories/slider-example.js:10](../../src/stories/slider-example.js#L10)

~~~~~text
partContracts = {
      'slider-output': {
        content: (state) => state.formattedValues.join(' – ') + (slider.dataset.unit || ''),
      },
    }
~~~~~

### compositions/slider-example / (file/setup/shared helper)

**style option** · target: resolve from expression · [src/stories/slider-example.js:17](../../src/stories/slider-example.js#L17)

~~~~~text
style: 'currency', currency: 'EUR', maximumFractionDigits: 0 };
~~~~~

### compositions/slider-example / (file/setup/shared helper)

**style option** · target: resolve from expression · [src/stories/slider-example.js:19](../../src/stories/slider-example.js#L19)

~~~~~text
style: 'percent', maximumFractionDigits: 0 };
~~~~~

### compositions/table-of-contents.examples / Release notes

**dynamic style binding** · target: aside · [src/stories/table-of-contents.examples.ts:89](../../src/stories/table-of-contents.examples.ts#L89)

~~~~~text
"${aside}"
~~~~~

### compositions/table-of-contents.examples / Release notes

**dynamic style binding** · target: div · [src/stories/table-of-contents.examples.ts:97](../../src/stories/table-of-contents.examples.ts#L97)

~~~~~text
"display: grid; grid-template-columns: ${columns}; gap: 2.5rem; padding: 1.5rem; align-items: start"
~~~~~

### compositions/table.examples / tableDefaults

**dynamic style binding** · target: tp-table · [src/stories/table.examples.ts:218](../../src/stories/table.examples.ts#L218)

~~~~~text
${kind === 'sticky' ? 'max-block-size:calc(var(--tp-spacing) * 72);max-inline-size:calc(var(--tp-spacing) * 160)' : ''}
~~~~~

### compositions/table.examples / tableDefaults

**presentation hook** · target: resolve from expression · [src/stories/table.examples.ts:210](../../src/stories/table.examples.ts#L210)

~~~~~text
partPresentation=${kind === 'sticky' ? { 'table-table': { styleHook: { 'min-inline-size': 'calc(var(--tp-spacing) * 240)' } } } : {}}
~~~~~

### compositions/table.examples / tableDefaults

**presentation hook** · target: resolve from expression · [src/stories/table.examples.ts:210](../../src/stories/table.examples.ts#L210)

~~~~~text
styleHook: { 'min-inline-size': 'calc(var(--tp-spacing) * 240)' }
~~~~~

### compositions/table.examples / tableDefaults

**style option** · target: resolve from expression · [src/stories/table.examples.ts:29](../../src/stories/table.examples.ts#L29)

~~~~~text
style: 'currency', currency: 'USD' }).format(value);
~~~~~

### compositions/table.examples / tableDefaults

**embedded stylesheet** · target: resolve from expression · [src/stories/table.examples.ts:226](../../src/stories/table.examples.ts#L226)

~~~~~text
<style>\n  .quarterly-totals::part(table-table) { min-inline-size: calc(var(--tp-spacing) * 240); }\n</style>
~~~~~

### components/text-transform / Components/Text transform

**dynamic style binding** · target: div · [src/stories/text-transform.stories.ts:80](../../src/stories/text-transform.stories.ts#L80)

~~~~~text
"inline-size:${width}px"
~~~~~

### components/timeline / (file/setup/shared helper)

**dynamic style binding** · target: div · [src/stories/timeline.stories.ts:13](../../src/stories/timeline.stories.ts#L13)

~~~~~text
"${muted}"
~~~~~

### components/timeline / (file/setup/shared helper)

**dynamic style binding** · target: div · [src/stories/timeline.stories.ts:17](../../src/stories/timeline.stories.ts#L17)

~~~~~text
"${muted}"
~~~~~

### components/timeline / (file/setup/shared helper)

**dynamic style binding** · target: div · [src/stories/timeline.stories.ts:21](../../src/stories/timeline.stories.ts#L21)

~~~~~text
"${muted}"
~~~~~

### components/timeline / (file/setup/shared helper)

**dynamic style binding** · target: div · [src/stories/timeline.stories.ts:25](../../src/stories/timeline.stories.ts#L25)

~~~~~text
"${muted}"
~~~~~

### components/timeline / (file/setup/shared helper)

**dynamic style binding** · target: div · [src/stories/timeline.stories.ts:29](../../src/stories/timeline.stories.ts#L29)

~~~~~text
"${muted}"
~~~~~

### components/toggle-group / FontWeightSelector

**presentation hook** · target: resolve from expression · [src/stories/toggle-group.stories.ts:171](../../src/stories/toggle-group.stories.ts#L171)

~~~~~text
partContracts=${{
                toggle: {
                  styleHook: { 'block-size': 'auto', 'padding-block': 'var(--tp-space-2)' },
                },
                'toggle-content': {
                  styleHook: { 'flex-direction': 'column', 'font-weight': weight },
                },
              }}
~~~~~

### components/toggle-group / FontWeightSelector

**presentation hook** · target: resolve from expression · [src/stories/toggle-group.stories.ts:173](../../src/stories/toggle-group.stories.ts#L173)

~~~~~text
styleHook: { 'block-size': 'auto', 'padding-block': 'var(--tp-space-2)' }
~~~~~

### components/toggle-group / FontWeightSelector

**presentation hook** · target: resolve from expression · [src/stories/toggle-group.stories.ts:176](../../src/stories/toggle-group.stories.ts#L176)

~~~~~text
styleHook: { 'flex-direction': 'column', 'font-weight': weight }
~~~~~

### components/toggle-group / FontWeightSelector

**presentation hook** · target: resolve from expression · [src/stories/toggle-group.stories.ts:203](../../src/stories/toggle-group.stories.ts#L203)

~~~~~text
partContracts=\${{ toggle: { styleHook: { 'block-size': 'auto', 'padding-block': 'var(--tp-space-2)' } }, 'toggle-content': { styleHook: { 'flex-direction': 'column', 'font-weight': weight } } }}
~~~~~

### components/toggle-group / FontWeightSelector

**presentation hook** · target: resolve from expression · [src/stories/toggle-group.stories.ts:203](../../src/stories/toggle-group.stories.ts#L203)

~~~~~text
styleHook: { 'block-size': 'auto', 'padding-block': 'var(--tp-space-2)' }
~~~~~

### components/toggle-group / FontWeightSelector

**presentation hook** · target: resolve from expression · [src/stories/toggle-group.stories.ts:203](../../src/stories/toggle-group.stories.ts#L203)

~~~~~text
styleHook: { 'flex-direction': 'column', 'font-weight': weight }
~~~~~

### components/toggle-group / StatefulArtwork

**presentation hook** · target: resolve from expression · [src/stories/toggle-group.stories.ts:243](../../src/stories/toggle-group.stories.ts#L243)

~~~~~text
partContracts=${{ 'toggle-content': { content: (state: Readonly<Record<string, unknown>>) => html`<tp-icon .icon=${state.pressed ? filledBookmarkIcon : bookmarkIcon}></tp-icon> Bookmark` } }}
~~~~~

### components/toggle-group / StatefulArtwork

**presentation hook** · target: resolve from expression · [src/stories/toggle-group.stories.ts:258](../../src/stories/toggle-group.stories.ts#L258)

~~~~~text
partContracts=\${parts}
~~~~~

### components/toggle-group / (file/setup/shared helper)

**stylesheet import** · target: resolve from expression · [src/stories/toggle-group.stories.ts:67](../../src/stories/toggle-group.stories.ts#L67)

~~~~~text
import '@tweakpad/ui/styles.css';\nconst items = ${JSON.stringify(
    [
      { value: 'bold', label: 'Bold', icon: boldIcon },
      { value: 'italic', label: 'Italic', icon: italicIcon },
      { value: 'underline', label: 'Underline', icon: underlineIcon },
    ],
    null,
    2,
  )}
~~~~~

### components/toggle-group / FontWeightSelector

**stylesheet import** · target: resolve from expression · [src/stories/toggle-group.stories.ts:197](../../src/stories/toggle-group.stories.ts#L197)

~~~~~text
import '@tweakpad/ui/styles.css';
~~~~~

### components/toggle-group / StatefulArtwork

**stylesheet import** · target: resolve from expression · [src/stories/toggle-group.stories.ts:253](../../src/stories/toggle-group.stories.ts#L253)

~~~~~text
import '@tweakpad/ui/styles.css';
~~~~~

### components/toggle / (file/setup/shared helper)

**presentation hook** · target: resolve from expression · [src/stories/toggle.stories.ts:38](../../src/stories/toggle.stories.ts#L38)

~~~~~text
partContracts=${stateful ? { 'toggle-content': { content: (state: Readonly<Record<string, unknown>>) => html`<tp-icon .icon=${state.pressed ? filledBookmarkIcon : bookmarkIcon}></tp-icon> Bookmark` } } : {}}
~~~~~

### components/toggle / StatefulIcon

**presentation hook** · target: resolve from expression · [src/stories/toggle.stories.ts:122](../../src/stories/toggle.stories.ts#L122)

~~~~~text
partContracts=\${parts}
~~~~~

### components/toggle / (file/setup/shared helper)

**stylesheet import** · target: resolve from expression · [src/stories/toggle.stories.ts:52](../../src/stories/toggle.stories.ts#L52)

~~~~~text
import '@tweakpad/ui/styles.css';\nconst ${iconName}
~~~~~

### components/toggle / StatefulIcon

**stylesheet import** · target: resolve from expression · [src/stories/toggle.stories.ts:122](../../src/stories/toggle.stories.ts#L122)

~~~~~text
import '@tweakpad/ui/styles.css';\nconst bookmark = ${JSON.stringify(bookmarkIcon)}
~~~~~

### components/toggle / WithButton

**stylesheet import** · target: resolve from expression · [src/stories/toggle.stories.ts:171](../../src/stories/toggle.stories.ts#L171)

~~~~~text
import '@tweakpad/ui/styles.css';\nconst boldIcon = ${JSON.stringify(boldIcon)}
~~~~~

### widgets/color-picker / (file/setup/shared helper)

**stylesheet import** · target: resolve from expression · [src/stories/widgets/color-picker.stories.ts:40](../../src/stories/widgets/color-picker.stories.ts#L40)

~~~~~text
import '@tweakpad/ui/styles.css';\n  import '@tweakpad/ui/register';\n  import '@tweakpad/ui/register/widgets';\n</script>\n${markup}
~~~~~

### compositions/widgets/flow-example / edgeKindsDocument

**JS style write** · target: resolve from expression · [src/stories/widgets/flow-example.js:1193](../../src/stories/widgets/flow-example.js#L1193)

~~~~~text
output.style.display = 'block';
~~~~~

### compositions/widgets/flow-example / edgeKindsDocument

**JS style write** · target: resolve from expression · [src/stories/widgets/flow-example.js:1194](../../src/stories/widgets/flow-example.js#L1194)

~~~~~text
output.style.marginBlockStart = 'var(--tp-space-2)';
~~~~~

### compositions/widgets/flow-example / edgeKindsDocument

**JS style write** · target: resolve from expression · [src/stories/widgets/flow-example.js:1195](../../src/stories/widgets/flow-example.js#L1195)

~~~~~text
output.style.font = 'var(--tp-text-sm) var(--tp-font-mono)';
~~~~~

### widgets/plot / Widgets/Plot

**presentation hook** · target: resolve from expression · [src/stories/widgets/plot.stories.ts:57](../../src/stories/widgets/plot.stories.ts#L57)

~~~~~text
partPresentation=${{
        'plot-label': { styleHook: { display: 'none' } },
      }}
~~~~~

### widgets/plot / Widgets/Plot

**presentation hook** · target: resolve from expression · [src/stories/widgets/plot.stories.ts:58](../../src/stories/widgets/plot.stories.ts#L58)

~~~~~text
styleHook: { display: 'none' }
~~~~~

### widgets/plot / Histogram

**presentation hook** · target: resolve from expression · [src/stories/widgets/plot.stories.ts:120](../../src/stories/widgets/plot.stories.ts#L120)

~~~~~text
partPresentation=${{
        'plot-label': { styleHook: { display: 'none' } },
      }}
~~~~~

### widgets/plot / Histogram

**presentation hook** · target: resolve from expression · [src/stories/widgets/plot.stories.ts:121](../../src/stories/widgets/plot.stories.ts#L121)

~~~~~text
styleHook: { display: 'none' }
~~~~~

### compositions/workspace/pages/activity / (external demo stylesheet)

**external stylesheet** · target: selectors in source · [src/stories/workspace/pages/activity.css:1](../../src/stories/workspace/pages/activity.css#L1)

~~~~~text
/* The transcript keeps a working height; the composer stays in the Card footer. */
.activity-scroller {
  --tp-message-scroller-height: calc(var(--tp-space-16) * 6);
}

.activity-history {
  display: flex;
  justify-content: center;
}

.activity-team {
  display: grid;
  gap: var(--tp-space-1);
}

.activity-member::part(button) {
  inline-size: 100%;
  justify-content: flex-start;
}

.activity-profile {
  display: grid;
  gap: var(--tp-space-3);
}

.activity-profile p {
  margin: 0;
}

.activity-profile-heading {
  display: flex;
  align-items: center;
  gap: var(--tp-space-3);
}

.activity-profile-heading > div {
  flex: 1;
  min-inline-size: 0;
}

.activity-reacted {
  padding-block-end: var(--tp-space-4);
}

/* The send action ends the composer's action row. */
.activity-send {
  margin-inline-start: auto;
}

~~~~~

### compositions/workspace/pages/activity / (file/setup/shared helper)

**stylesheet import** · target: resolve from expression · [src/stories/workspace/pages/activity.ts:10](../../src/stories/workspace/pages/activity.ts#L10)

~~~~~text
import './activity.css';
~~~~~

### compositions/workspace/pages/brief / (external demo stylesheet)

**external stylesheet** · target: selectors in source · [src/stories/workspace/pages/brief.css:1](../../src/stories/workspace/pages/brief.css#L1)

~~~~~text
/* Brief editor: a resizable editor/preview pair that fills a fixed working height. */
.brief-editor {
  block-size: calc(var(--tp-space-16) * 7);
}

.brief-pane {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--tp-space-4);
  block-size: 100%;
  box-sizing: border-box;
  padding: var(--tp-space-4);
}

.brief-pane-heading {
  min-block-size: var(--tp-control-height-md);
}

.brief-pane tp-text-area,
.brief-pane tp-text-area::part(text-area),
.brief-scroll {
  block-size: 100%;
  min-block-size: 0;
}

.brief-preview-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: var(--tp-space-4);
}

/* The table of contents lives inside the preview it tracks, sticky at the top. */
.brief-toc {
  position: sticky;
  inset-block-start: 0;
  inline-size: calc(var(--tp-space-16) * 2.5);
}

.brief-preview {
  display: grid;
  gap: var(--tp-space-4);
  margin: 0;
  font-family: var(--tp-font-sans);
  line-height: var(--tp-leading-relaxed);
}

.brief-section > p {
  margin: 0;
}

.brief-preview[data-font='mono'] {
  font-family: var(--tp-font-mono);
}

.brief-preview[data-bold] {
  font-weight: var(--tp-font-semibold);
}

.brief-preview[data-italic] {
  font-style: italic;
}

.brief-preview[data-align='center'] {
  text-align: center;
}

.brief-preview[data-align='end'] {
  text-align: end;
}

.brief-criteria {
  display: grid;
  gap: var(--tp-space-2);
  margin: 0;
  padding-inline-start: var(--tp-space-5);
}

@media (width <= 40rem) {
  .brief-editor {
    block-size: calc(var(--tp-space-16) * 12);
  }
}

~~~~~

### compositions/workspace/pages/brief / (file/setup/shared helper)

**stylesheet import** · target: resolve from expression · [src/stories/workspace/pages/brief.ts:7](../../src/stories/workspace/pages/brief.ts#L7)

~~~~~text
import './brief.css';
~~~~~

### compositions/workspace/pages/files / (external demo stylesheet)

**external stylesheet** · target: selectors in source · [src/stories/workspace/pages/files.css:1](../../src/stories/workspace/pages/files.css#L1)

~~~~~text
.files-art {
  block-size: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: var(--tp-space-6);
  box-sizing: border-box;
  border-radius: var(--tp-radius-lg);
  background: var(--tp-primary);
  color: var(--tp-primary-foreground);
}

.files-art[data-tone='muted'] {
  background: var(--tp-muted);
  color: var(--tp-foreground);
}

.files-art[data-tone='dark'] {
  background: var(--tp-foreground);
  color: var(--tp-background);
}

.files-art strong {
  font-size: var(--tp-text-2xl);
  max-inline-size: 14ch;
  line-height: var(--tp-leading-tight);
}

.files-footer {
  inline-size: 100%;
}

~~~~~

### compositions/workspace/pages/files / (file/setup/shared helper)

**stylesheet import** · target: resolve from expression · [src/stories/workspace/pages/files.ts:19](../../src/stories/workspace/pages/files.ts#L19)

~~~~~text
import './files.css';
~~~~~

### compositions/workspace/pages/overview / (external demo stylesheet)

**external stylesheet** · target: selectors in source · [src/stories/workspace/pages/overview.css:1](../../src/stories/workspace/pages/overview.css#L1)

~~~~~text
.overview-metric-footer {
  display: flex;
  flex-direction: column;
  gap: var(--tp-space-1);
  align-items: flex-start;
}

.overview-metric-note {
  display: inline-flex;
  align-items: center;
  gap: var(--tp-space-1-5);
  font-weight: var(--tp-font-medium);
}

.overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: var(--tp-space-6);
  align-items: start;
}

.overview-calendar {
  display: block;
  inline-size: fit-content;
  margin-inline: auto;
}

.overview-skeleton-row {
  display: flex;
  gap: var(--tp-space-3);
  align-items: center;
}

.overview-skeleton-avatar {
  inline-size: var(--tp-space-6);
  block-size: var(--tp-space-6);
  border-radius: var(--tp-radius-full);
  flex: none;
}

.overview-skeleton-line {
  inline-size: calc(var(--tp-space-16) * 3);
  max-inline-size: 100%;
  block-size: var(--tp-space-3);
}

.overview-skeleton-short {
  inline-size: calc(var(--tp-space-16) * 2);
  max-inline-size: 100%;
  block-size: var(--tp-space-3);
}

@media (width <= 64rem) {
  .overview-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

~~~~~

### compositions/workspace/pages/overview / (file/setup/shared helper)

**presentation hook** · target: resolve from expression · [src/stories/workspace/pages/overview.ts:87](../../src/stories/workspace/pages/overview.ts#L87)

~~~~~text
styleHook: { 'aspect-ratio': 'auto', 'block-size': 'calc(var(--tp-space-16) * 4)' }
~~~~~

### compositions/workspace/pages/overview / (file/setup/shared helper)

**presentation hook** · target: resolve from expression · [src/stories/workspace/pages/overview.ts:186](../../src/stories/workspace/pages/overview.ts#L186)

~~~~~text
partContracts=${plotHeight}
~~~~~

### compositions/workspace/pages/overview / (file/setup/shared helper)

**stylesheet import** · target: resolve from expression · [src/stories/workspace/pages/overview.ts:9](../../src/stories/workspace/pages/overview.ts#L9)

~~~~~text
import './overview.css';
~~~~~

### compositions/workspace/pages/sites / (external demo stylesheet)

**external stylesheet** · target: selectors in source · [src/stories/workspace/pages/sites.css:1](../../src/stories/workspace/pages/sites.css#L1)

~~~~~text
.sites-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(calc(var(--tp-space-16) * 3), 1fr));
  gap: var(--tp-space-4);
}

.sites-metric {
  font-size: var(--tp-text-2xl);
  font-weight: var(--tp-font-semibold);
  font-variant-numeric: tabular-nums;
}

.sites-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
  gap: var(--tp-space-4);
  align-items: start;
}

.sites-map {
  block-size: calc(var(--tp-space-16) * 7);
}

.sites-overlay-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--tp-space-3);
}

@media (width <= 64rem) {
  .sites-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (width <= 40rem) {
  .sites-map {
    block-size: calc(var(--tp-space-16) * 5);
  }
}

~~~~~

### compositions/workspace/pages/sites / (file/setup/shared helper)

**dynamic style binding** · target: tp-map-pin · [src/stories/workspace/pages/sites.ts:161](../../src/stories/workspace/pages/sites.ts#L161)

~~~~~text
${`color: ${site.color}`}
~~~~~

### compositions/workspace/pages/sites / (file/setup/shared helper)

**stylesheet import** · target: resolve from expression · [src/stories/workspace/pages/sites.ts:6](../../src/stories/workspace/pages/sites.ts#L6)

~~~~~text
import './sites.css';
~~~~~

### compositions/workspace/pages/work / (external demo stylesheet)

**external stylesheet** · target: selectors in source · [src/stories/workspace/pages/work.css:1](../../src/stories/workspace/pages/work.css#L1)

~~~~~text
.work-panel {
  padding-block-start: var(--tp-space-4);
}

.work-search {
  inline-size: min(100%, calc(var(--tp-space-16) * 4.5));
}

.work-filter {
  inline-size: calc(var(--tp-space-10) * 4);
}

.work-selection {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--tp-space-2);
  padding: var(--tp-space-2) var(--tp-space-3);
  border: var(--tp-border-width) var(--tp-border-style) var(--tp-border);
  border-radius: var(--tp-radius-lg);
  background: color-mix(in oklab, var(--tp-muted) 60%, transparent);
}

.work-table {
  display: block;
  max-block-size: calc(var(--tp-space-16) * 7);
}

.work-check {
  inline-size: var(--tp-space-10);
}

.work-number {
  text-align: end;
  font-variant-numeric: tabular-nums;
}

.work-actions {
  inline-size: var(--tp-space-10);
  text-align: end;
}

.work-owner {
  flex-wrap: nowrap;
  gap: var(--tp-space-2);
}

.work-board {
  display: grid;
  grid-template-columns: repeat(4, minmax(calc(var(--tp-space-16) * 4), 1fr));
  gap: var(--tp-space-4);
  overflow-x: auto;
  padding-block-end: var(--tp-space-2);
}

.work-lane {
  display: flex;
  flex-direction: column;
  gap: var(--tp-space-3);
  min-inline-size: 0;
  padding: var(--tp-space-3);
  border-radius: var(--tp-radius-xl);
  background: color-mix(in oklab, var(--tp-muted) 50%, transparent);
}

.work-lane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--tp-space-2);
  padding-inline: var(--tp-space-1);
}

~~~~~

### compositions/workspace/pages/work / (file/setup/shared helper)

**presentation hook** · target: resolve from expression · [src/stories/workspace/pages/work.ts:226](../../src/stories/workspace/pages/work.ts#L226)

~~~~~text
partContracts=${linkTitle}
~~~~~

### compositions/workspace/pages/work / (file/setup/shared helper)

**presentation hook** · target: resolve from expression · [src/stories/workspace/pages/work.ts:367](../../src/stories/workspace/pages/work.ts#L367)

~~~~~text
styleHook: { 'padding-inline': '0' }
~~~~~

### compositions/workspace/pages/work / (file/setup/shared helper)

**stylesheet import** · target: resolve from expression · [src/stories/workspace/pages/work.ts:10](../../src/stories/workspace/pages/work.ts#L10)

~~~~~text
import './work.css';
~~~~~

### compositions/workspace/settings-dialog / (file/setup/shared helper)

**presentation hook** · target: resolve from expression · [src/stories/workspace/settings-dialog.ts:477](../../src/stories/workspace/settings-dialog.ts#L477)

~~~~~text
partPresentation=${{
      'dialog-content': {
        styleHook: {
          // Flush content at most 800px wide and 500px tall, with clipped edges.
          '--tp-dialog-spacing': '0',
          'inline-size': 'min(calc(var(--tp-space-16) * 12.5), calc(100% - var(--tp-space-8)))',
          overflow: 'hidden',
        },
      },
    }}
~~~~~

### compositions/workspace/settings-dialog / (file/setup/shared helper)

**presentation hook** · target: resolve from expression · [src/stories/workspace/settings-dialog.ts:479](../../src/stories/workspace/settings-dialog.ts#L479)

~~~~~text
styleHook: {
          // Flush content at most 800px wide and 500px tall, with clipped edges.
          '--tp-dialog-spacing': '0',
          'inline-size': 'min(calc(var(--tp-space-16) * 12.5), calc(100% - var(--tp-space-8)))',
          overflow: 'hidden',
        }
~~~~~

### compositions/workspace/styles / (external demo stylesheet)

**external stylesheet** · target: selectors in source · [src/stories/workspace/styles.css:1](../../src/stories/workspace/styles.css#L1)

~~~~~text
catalog-workspace {
  display: block;
  color: var(--tp-foreground);
  background: var(--tp-background);
  font-family: var(--tp-font-sans);
  font-size: var(--tp-text-sm);
}

.catalog-workspace {
  min-height: 100dvh;
}

.workspace-topbar {
  flex-wrap: wrap;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--tp-space-4);
  box-sizing: border-box;
  width: 100%;

  /* dashboard-01 site header: h-12 with a bottom border. */
  min-height: var(--tp-space-12);
  padding-inline: var(--tp-space-4) var(--tp-space-6);
  align-self: stretch;
  box-shadow: 0 var(--tp-border-width) 0 var(--tp-border);
}

.workspace-topbar-separator {
  block-size: var(--tp-space-4);
}

.workspace-content {
  box-sizing: border-box;
  width: 100%;
  max-width: calc(var(--tp-spacing) * 400);
  margin-inline: auto;
  min-width: 0;
}

.workspace-content h1 {
  font-size: calc(var(--tp-text-lg) * 1.6);
  letter-spacing: var(--tp-tracking-tight);
}

.workspace-content h1,
.workspace-content h2,
.workspace-content h3,
.workspace-content p,
.workspace-overlay p {
  margin: 0;
}

.workspace-content h2 {
  font-size: var(--tp-text-lg);
}

.workspace-content h3 {
  font-size: var(--tp-text-sm);
}

.workspace-content h4,
.workspace-settings h3,
.workspace-settings h4 {
  margin: 0;
  font-size: var(--tp-text-sm);
  font-weight: var(--tp-font-medium);
}

.workspace-settings h3 {
  font-size: var(--tp-text-base);
}

.workspace-settings p {
  margin: 0;
}

.workspace-stack {
  display: flex;
  flex-direction: column;
  gap: var(--tp-space-4);
  min-width: 0;
}

.workspace-stack-sm {
  display: flex;
  flex-direction: column;
  gap: var(--tp-space-1);
  min-width: 0;
}

.workspace-stack-lg {
  display: flex;
  flex-direction: column;
  gap: var(--tp-space-6);
  min-width: 0;
}

.workspace-row {
  display: flex;
  gap: var(--tp-space-3);
  align-items: center;
  flex-wrap: wrap;
}

.workspace-between {
  justify-content: space-between;
}

.workspace-grow {
  flex: 1;
  min-width: 0;
}

.workspace-muted {
  color: var(--tp-muted-foreground);
}

.workspace-small {
  font-size: var(--tp-text-xs);
}

.workspace-heading {
  margin-block-end: var(--tp-space-6);
}

.workspace-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, calc(var(--tp-spacing) * 46)), 1fr));
  gap: var(--tp-space-4);
}

.workspace-metric {
  font-size: calc(var(--tp-text-lg) * 1.8);
  font-weight: var(--tp-font-semibold);
  letter-spacing: var(--tp-tracking-tight);
  font-variant-numeric: tabular-nums;
}

.workspace-columns {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
  gap: var(--tp-space-6);
  align-items: start;
}

.workspace-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, calc(var(--tp-spacing) * 64)), 1fr));
  gap: var(--tp-space-4);
}

.workspace-page {
  display: flex;
  flex-direction: column;
  gap: var(--tp-space-6);
  min-width: 0;
}

.workspace-table {
  display: block;
  max-height: calc(var(--tp-spacing) * 112);
}

.workspace-table tp-table-head:first-child {
  width: calc(var(--tp-spacing) * 10);
}

.workspace-search {
  width: min(100%, calc(var(--tp-spacing) * 72));
}

.workspace-filter {
  width: calc(var(--tp-spacing) * 42);
}

.workspace-art {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: var(--tp-space-6);
  box-sizing: border-box;
  background: var(--tp-primary);
  color: var(--tp-primary-foreground);
}

.workspace-art[data-tone='muted'] {
  background: var(--tp-muted);
  color: var(--tp-foreground);
}

.workspace-art[data-tone='dark'] {
  background: var(--tp-foreground);
  color: var(--tp-background);
}

.workspace-art strong {
  font-size: calc(var(--tp-text-lg) * 1.5);
  max-width: 14ch;
  line-height: var(--tp-leading-tight);
}

.workspace-editor {
  height: calc(var(--tp-spacing) * 140);
}

.workspace-editor-pane {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--tp-space-4);
  height: 100%;
  box-sizing: border-box;
  padding: var(--tp-space-4);
}

.workspace-editor-heading {
  min-height: var(--tp-target-size-min);
}

.workspace-editor-pane tp-text-area,
.workspace-editor-pane tp-text-area::part(text-area),
.workspace-editor-scroll {
  height: 100%;
  min-height: 0;
}

.workspace-member::part(button) {
  justify-content: flex-start;
}

.workspace-profile {
  display: grid;
  gap: var(--tp-space-3);
}

.workspace-profile p {
  margin: 0;
}

.workspace-preview {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.workspace-preview[data-bold] {
  font-weight: var(--tp-font-semibold);
}

.workspace-preview[data-italic] {
  font-style: italic;
}

.workspace-preview[data-align='center'] {
  text-align: center;
}

.workspace-preview[data-align='end'] {
  text-align: end;
}

.workspace-overlay {
  display: flex;
  flex-direction: column;
  gap: var(--tp-space-4);
}

/* Settings dialog: a flush, full-height navigation beside an inset, scrolling main column. */
.workspace-settings-layout {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  block-size: min(calc(var(--tp-space-16) * 7.5), calc(100dvh - var(--tp-space-16)));
  overflow: hidden;
}

.workspace-settings-nav {
  block-size: 100%;
  overflow: hidden;
}

.workspace-settings-main {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  padding-inline: var(--tp-space-4);
  min-inline-size: 0;
  min-block-size: 0;
}

.workspace-settings-header {
  flex-wrap: nowrap;
  min-block-size: var(--tp-space-16);
}

.workspace-settings-scroll {
  block-size: 100%;
  min-block-size: 0;
}

.workspace-settings-body {
  display: flex;
  flex-direction: column;
  gap: var(--tp-space-6);
  padding-block-end: var(--tp-space-4);
  padding-inline-end: var(--tp-space-3);
}

.workspace-role {
  inline-size: calc(var(--tp-space-16) * 2);
}

.workspace-danger-row {
  flex-wrap: nowrap;
  padding: var(--tp-space-4);
  border: var(--tp-border-width) var(--tp-border-style) var(--tp-border);
  border-radius: var(--tp-radius-lg);
}

@media (width <= 40rem) {
  .workspace-settings-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .workspace-danger-row {
    flex-wrap: wrap;
  }
}

.workspace-skeleton-line {
  height: var(--tp-space-4);
  width: 75%;
}

@media (width <= 64rem) {
  .workspace-columns {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (width <= 40rem) {
  .workspace-topbar {
    padding-inline-end: var(--tp-space-4);
  }

  .workspace-topbar .workspace-resources {
    display: none;
  }

  .workspace-editor {
    height: calc(var(--tp-spacing) * 240);
  }
}

.workspace-profile-heading {
  display: flex;
  align-items: center;
  gap: var(--tp-space-3);
}

.workspace-profile-heading > div {
  flex: 1;
  min-width: 0;
}

.workspace-history {
  display: flex;
  justify-content: center;
}

~~~~~

### compositions/workspace/workspace / (file/setup/shared helper)

**presentation hook** · target: resolve from expression · [src/stories/workspace/workspace.ts:502](../../src/stories/workspace/workspace.ts#L502)

~~~~~text
partContracts=${datePickerTriggerContracts(!this.draftDue)}
~~~~~

### compositions/workspace/workspace / (file/setup/shared helper)

**stylesheet import** · target: resolve from expression · [src/stories/workspace/workspace.ts:39](../../src/stories/workspace/workspace.ts#L39)

~~~~~text
import './styles.css';
~~~~~


## Component-by-component coverage

Every published preview is listed, including zero-match use cases. Counts are styling sites, not CSS declaration counts. Zero matches are not a component conformance pass.

### components/accordion

Source: docs/components/accordion.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Accordion | 8 | 0 |
| Variants | 34 | 1 |
| Multiple open items | 65 | 0 |
| Positional content | 89 | 0 |
| Disabled item | 117 | 0 |
| Line-by-line reveal | 138 | 0 |

### components/alert-dialog

Source: docs/components/alert-dialog.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Alert dialog | 7 | 0 |
| Asynchronous confirm | 34 | 0 |
| Media and body | 62 | 0 |
| Initial focus on Confirm | 83 | 0 |

### components/alert

Source: docs/components/alert.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Alert | 7 | 0 |
| Severity | 24 | 0 |
| Title slot and actions | 46 | 0 |
| Live update | 62 | 0 |

### components/aspect-ratio

Source: docs/components/aspect-ratio.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Aspect ratio | 7 | 2 |
| Common ratios | 23 | 7 |
| One ratio, three widths | 43 | 12 |
| Cover and contain | 120 | 5 |

### components/attachment

Source: docs/components/attachment.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Attachment | 8 | 0 |
| Statuses | 47 | 0 |
| Image cards | 83 | 4 |
| Scrollable groups | 107 | 3 |
| Title and description only | 273 | 0 |
| Preview trigger, download and retry | 297 | 1 |
| Sizes | 375 | 0 |
| Remove event | 399 | 0 |

### components/autocomplete

Source: docs/components/autocomplete.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Autocomplete | 7 | 1 |
| Prefix matching | 34 | 1 |
| Grouped suggestions | 56 | 1 |
| Inline completion | 80 | 1 |
| Searching hidden fields | 99 | 1 |
| Ranking over several fields | 122 | 1 |
| Search source | 152 | 1 |
| In a form | 218 | 3 |

### components/avatar

Source: docs/components/avatar.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Avatar | 8 | 0 |
| Fallbacks | 24 | 0 |
| Sizes | 37 | 0 |
| Status badge | 46 | 0 |
| Icon badges | 58 | 0 |
| Group with overflow | 72 | 0 |
| Icon count in an empty state | 83 | 1 |
| Custom shape and grayscale | 108 | 4 |
| Decorative avatar | 152 | 2 |

### components/badge

Source: docs/components/badge.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Badge | 7 | 0 |
| Variants | 20 | 0 |
| With marks | 36 | 0 |
| Status in a list | 60 | 1 |
| Counts in buttons | 88 | 0 |
| Interactive badges | 98 | 2 |

### components/breadcrumb

Source: docs/components/breadcrumb.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Breadcrumb | 7 | 0 |
| Custom separator | 25 | 0 |
| Collapsed with a menu | 39 | 0 |
| Decorative ellipsis | 58 | 0 |
| Section menu on an ancestor | 72 | 0 |
| Menu on wide screens, drawer on narrow ones | 93 | 0 |
| Long trail | 174 | 1 |

### components/bubble

Source: docs/components/bubble.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Conversation | 8 | 0 |
| Variants | 36 | 0 |
| Alignment | 57 | 0 |
| Reactions | 78 | 1 |
| Rich content | 105 | 3 |
| Expandable message | 119 | 7 |
| Quick replies | 148 | 2 |

### components/button-group

Source: docs/components/button-group.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Button group | 8 | 0 |
| Sizes | 27 | 0 |
| Vertical | 52 | 0 |
| Nested vertical groups | 67 | 0 |
| Mixed controls | 86 | 0 |
| Steppers, labels and counts | 104 | 1 |
| Split action | 145 | 0 |
| Split button with a menu | 156 | 0 |
| Menu and popover | 176 | 0 |
| Select and native select | 238 | 1 |
| Input groups and nesting | 281 | 0 |
| Navigation and toolbar | 362 | 0 |
| Grouped pagination | 423 | 1 |
| Unjoined | 479 | 0 |

### components/button

Source: docs/components/button.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Button | 7 | 0 |
| Variants | 14 | 0 |
| Sizes | 28 | 0 |
| Icon only | 42 | 0 |
| Icon sizes | 56 | 0 |
| Marks and loading | 86 | 0 |
| Icon and chevron | 101 | 0 |
| As a link | 117 | 0 |
| Form actions | 129 | 0 |
| Disabled | 141 | 2 |

### components/calendar

Source: docs/components/calendar.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Calendar | 7 | 1 |
| Range | 22 | 1 |
| Multiple | 41 | 1 |
| Bookable dates | 58 | 1 |
| Nightly prices and booked dates | 81 | 4 |
| Dropdown caption | 136 | 1 |
| Week numbers | 151 | 2 |
| Quick picks | 169 | 5 |
| Date with start and end times | 221 | 2 |
| French and Brazilian Portuguese | 242 | 2 |
| Arabic, right to left | 286 | 1 |
| In a popover | 304 | 3 |
| Value change | 348 | 2 |

### components/card

Source: docs/components/card.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Card | 7 | 2 |
| Header action | 30 | 4 |
| Content only | 45 | 1 |
| Surface options | 58 | 7 |
| Elevated | 84 | 3 |
| Small | 101 | 3 |

### components/carousel

Source: docs/components/carousel.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Carousel | 7 | 12 |
| Items per view | 74 | 0 |
| Bullets inside | 96 | 9 |
| Autoplay | 125 | 6 |
| Vertical | 151 | 1 |
| Crossfade | 175 | 9 |
| Layered 3D | 235 | 15 |
| Parallax | 360 | 8 |
| Focus | 391 | 15 |
| Shader transition | 430 | 9 |
| Virtual archive with controlled selection | 587 | 2 |
| Commit | 625 | 4 |

### components/checkbox

Source: docs/components/checkbox.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Checkbox | 7 | 0 |
| Field | 20 | 0 |
| Form values | 33 | 1 |
| Select all | 64 | 3 |
| CheckboxGroupController | 113 | 4 |
| Disabled and read-only | 152 | 0 |
| Inline | 174 | 0 |

### components/citation

Source: docs/components/citation.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Citation | 8 | 1 |
| Labels and icons | 28 | 0 |
| Source preview | 45 | 1 |
| Numbered references | 65 | 1 |
| Horizontal list | 106 | 0 |
| Variants | 121 | 0 |

### components/code-block

Source: docs/components/code-block.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Code block | 7 | 0 |
| Title slot | 30 | 1 |
| Highlighted lines | 49 | 0 |
| Diff | 67 | 0 |
| Collapsible | 85 | 0 |
| Shell | 115 | 0 |
| CSS | 129 | 0 |
| Token theme | 145 | 1 |

### components/collapsible

Source: docs/components/collapsible.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Collapsible | 7 | 2 |
| Leading indicator | 28 | 1 |
| Positional slots | 44 | 5 |
| As a heading | 76 | 1 |
| Searchable | 90 | 1 |
| Open change | 112 | 2 |
| Disabled | 135 | 1 |
| Line-by-line reveal | 149 | 1 |

### components/color-input

Source: docs/components/color-input.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Color input | 7 | 0 |
| Inline | 24 | 0 |
| Chip or text | 39 | 0 |
| Formats and alpha | 61 | 0 |
| Sizes | 84 | 0 |
| In a form | 102 | 1 |
| Disabled and read-only | 120 | 0 |
| Right-to-left | 146 | 0 |

### components/command-palette

Source: docs/components/command-palette.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Command palette | 7 | 1 |
| Modal palette | 57 | 0 |
| Custom empty state | 90 | 0 |
| Server-filtered list | 108 | 0 |

### components/copy-button

Source: docs/components/copy-button.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Copy button | 7 | 0 |
| Visible label | 27 | 0 |
| Variants and sizes | 36 | 0 |
| Beside a value | 48 | 5 |
| In an input group and a field group | 64 | 0 |
| In a Code block | 98 | 0 |
| Copy events | 107 | 1 |

### components/cursor

Source: docs/components/cursor.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Cursor | 8 | 12 |
| Spring | 43 | 4 |
| Zones | 66 | 7 |
| Sticking | 94 | 2 |
| Dot and ring | 131 | 4 |
| Native passthrough | 151 | 2 |
| Programmatic state | 169 | 2 |
| Reduced motion | 205 | 2 |

### components/chart

Source: docs/components/chart.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Chart | 7 | 1 |
| Line chart | 110 | 1 |
| Description and table | 173 | 1 |

### components/description-list

Source: docs/components/description-list.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Description list | 8 | 0 |
| Record details | 30 | 3 |
| Show more | 65 | 0 |
| Summary row | 95 | 0 |
| Alignment and stacking | 111 | 2 |

### components/dialog

Source: docs/components/dialog.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Dialog | 7 | 0 |
| Footer and close | 33 | 0 |
| Non-modal | 51 | 4 |
| Container modality | 79 | 3 |
| Blurred backdrop | 103 | 0 |
| Registered trigger | 118 | 0 |
| Veto closing | 136 | 0 |

### components/drag-drop-list

Source: docs/components/drag-drop-list.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Drag drop list | 7 | 0 |
| Commit events | 32 | 1 |
| Variants and sizes | 64 | 1 |
| Whole-row drag with swap | 89 | 0 |
| Custom rows and overlay | 108 | 1 |
| Horizontal | 145 | 0 |
| Read-only | 162 | 0 |
| Board lanes | 178 | 3 |
| Controlled lanes | 234 | 2 |
| Approve before committing | 298 | 2 |
| Vertical axis only | 359 | 0 |

### components/drawer

Source: docs/components/drawer.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Drawer | 7 | 0 |
| Edges | 43 | 1 |
| Blurred backdrop | 77 | 0 |
| Snap points | 92 | 1 |
| Nested | 110 | 1 |
| Non-dismissible | 130 | 1 |

### components/empty-state

Source: docs/components/empty-state.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Empty state | 7 | 0 |
| Media treatments | 42 | 1 |
| No results | 64 | 1 |
| In a card | 85 | 1 |
| Bordered and filled | 101 | 3 |

### components/field-group

Source: docs/components/field-group.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Field group | 7 | 0 |
| Color channels | 39 | 2 |
| Separator | 67 | 0 |
| Read-only and disabled | 84 | 0 |
| Vertical | 99 | 0 |
| Unjoined | 114 | 0 |
| Inline | 129 | 0 |
| Expanded | 171 | 0 |
| Constraints | 210 | 1 |

### components/field

Source: docs/components/field.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Field | 7 | 0 |
| Validate on blur | 24 | 0 |
| Custom validator | 39 | 0 |
| Horizontal | 59 | 0 |
| Slots | 85 | 2 |
| Legend and group | 100 | 0 |
| Disabled | 126 | 0 |

### components/file-upload

Source: docs/components/file-upload.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| File upload | 7 | 0 |
| Custom text and compact size | 24 | 0 |
| Rejected files | 48 | 0 |
| Custom validator | 69 | 0 |
| Chips | 111 | 0 |
| Rows | 125 | 0 |
| Image grid | 142 | 0 |
| Upload adapter | 171 | 0 |
| Field and form | 226 | 1 |
| Server rejection | 250 | 0 |

### components/form

Source: docs/components/form.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Form | 7 | 1 |
| Notification settings | 51 | 1 |
| Validate on blur | 91 | 0 |
| External errors | 113 | 0 |
| Matching passwords | 135 | 1 |
| Wait for async checks | 161 | 1 |
| Repeated emails | 192 | 2 |
| Disable while invalid | 252 | 0 |

### components/icon

Source: docs/components/icon.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Icon | 7 | 1 |
| Decorative and labelled | 44 | 2 |
| Size and color | 71 | 2 |
| Custom definition | 87 | 1 |

### components/image

Source: docs/components/image.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Image | 8 | 1 |
| Ratio and fit | 33 | 4 |
| Fallbacks | 53 | 4 |
| Loading placeholders | 67 | 4 |
| Hover zoom | 85 | 3 |
| Card hover | 97 | 3 |
| Staggered group | 120 | 5 |
| Reveal timing and repeat | 134 | 10 |
| Headline, group and caption | 156 | 6 |
| Parallax in a scroller | 183 | 4 |
| Scroll zoom in a vertical scroller | 195 | 6 |
| Horizontal strip | 256 | 5 |
| Smoothing | 269 | 5 |
| Hero with a narrow-screen crop | 290 | 1 |

### components/input-group

Source: docs/components/input-group.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Input group | 7 | 0 |
| Text addons | 39 | 0 |
| Status addons | 63 | 1 |
| Actions | 103 | 0 |
| Button group composition | 140 | 4 |
| Interactive addons | 174 | 0 |
| Composer | 224 | 1 |
| Native textarea | 247 | 1 |
| Disabled and invalid | 261 | 0 |

### components/input

Source: docs/components/input.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Input | 7 | 0 |
| Types | 24 | 0 |
| Mono | 45 | 0 |
| Owner-shaped value | 63 | 0 |
| Error | 82 | 0 |
| Disabled and read-only | 93 | 0 |
| Inline | 119 | 0 |
| Number steps | 149 | 0 |
| Units and icons | 178 | 0 |

### components/kbd

Source: docs/components/kbd.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Kbd | 8 | 1 |
| Modifiers | 28 | 0 |
| Sequence | 51 | 0 |
| Button and tooltip | 71 | 0 |
| Input group | 89 | 0 |
| Icon keys | 108 | 1 |
| Localized and right-to-left | 133 | 1 |

### components/label

Source: docs/components/label.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Label | 7 | 0 |
| By id and by nesting | 25 | 1 |
| Optional | 45 | 0 |

### components/list

Source: docs/components/list.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| List | 8 | 0 |
| Content and actions | 41 | 0 |
| Variants and sizes | 69 | 0 |
| Media | 87 | 0 |
| Divided list | 118 | 0 |
| Header and footer | 144 | 2 |
| Card grid | 158 | 6 |
| Link rows | 190 | 1 |
| Recordings | 229 | 7 |
| People picker | 265 | 0 |
| People and invitations | 286 | 10 |

### components/map

Source: docs/components/map.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Map | 8 | 19 |
| Selected pin | 245 | 2 |
| Map with a list | 272 | 2 |
| External controls | 334 | 1 |
| Status slot | 360 | 2 |

### components/markdown

Source: docs/components/markdown.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Markdown | 7 | 0 |
| Script child | 37 | 0 |
| Heading offset | 59 | 0 |
| Code and alerts | 83 | 0 |
| Small | 105 | 0 |
| Streaming | 130 | 1 |
| Element policy | 166 | 0 |
| Custom node rendering | 199 | 1 |
| With a table of contents | 236 | 3 |

### components/marker

Source: docs/components/marker.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Marker | 7 | 0 |
| Variants | 26 | 0 |
| Tones | 41 | 0 |
| With icons | 57 | 0 |
| Shimmer | 89 | 0 |
| With an action | 103 | 0 |
| Native hosts and layout | 118 | 10 |
| Completion reveal | 166 | 1 |
| Accordion label and drawer | 185 | 1 |

### components/media-player

Source: docs/components/media-player.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Media Player | 8 | 0 |
| Audio layout | 37 | 2 |
| Audio | 54 | 0 |
| Trimmed layout | 77 | 0 |
| Custom top region | 101 | 2 |
| Text tracks | 133 | 0 |
| Custom bar | 160 | 0 |
| Live with DVR (simulated) | 195 | 0 |
| Tracks adapter (mock) | 225 | 0 |
| French controls | 287 | 0 |

### components/menu

Source: docs/components/menu.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Menu | 8 | 0 |
| Handling commands | 48 | 1 |
| Inset | 74 | 0 |
| View options | 96 | 0 |
| Nested menus | 119 | 0 |
| Context invocation | 144 | 1 |
| Open on hover | 162 | 0 |

### components/menubar

Source: docs/components/menubar.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Menubar | 7 | 0 |
| Compact bar | 77 | 0 |
| Active menu | 106 | 1 |
| Disabled menu | 139 | 0 |

### components/message-scroller

Source: docs/components/message-scroller.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Message Scroller | 8 | 1 |
| Streaming | 68 | 4 |
| Join marker as anchor | 164 | 3 |
| Commands | 240 | 3 |
| Outline and edges | 312 | 2 |
| Prepend history | 420 | 3 |
| Animated send | 499 | 3 |
| Open at the start | 557 | 1 |

### components/message

Source: docs/components/message.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Message | 8 | 0 |
| Sender sides | 46 | 0 |
| Header and footer | 69 | 0 |
| Sending and failed | 88 | 0 |
| Message group | 106 | 0 |
| Footer actions | 126 | 0 |
| Attachment | 153 | 0 |
| Retry a failed message | 187 | 2 |

### components/native-select

Source: docs/components/native-select.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Native select | 7 | 0 |
| Placeholder | 37 | 0 |
| Sizes | 55 | 0 |
| Multiple | 77 | 0 |
| Form value | 95 | 1 |
| Controlled value | 126 | 1 |
| Disabled, read-only and invalid | 160 | 0 |

### components/navigation-menu

Source: docs/components/navigation-menu.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Navigation menu | 8 | 6 |
| Mixed items | 77 | 1 |
| Active link | 97 | 1 |
| Vertical | 116 | 2 |

### components/navigation-panel

Source: docs/components/navigation-panel.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Navigation panel | 8 | 5 |
| Off-canvas | 99 | 5 |
| Collapsible groups | 130 | 5 |
| Drawer mode | 184 | 3 |
| Floating | 214 | 5 |
| Team switcher and row actions | 247 | 5 |

### components/one-time-code-field

Source: docs/components/one-time-code-field.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| One-time code field | 7 | 2 |
| Numeric | 32 | 0 |
| Grouped | 43 | 0 |
| Masked PIN | 68 | 0 |
| Verify on completion | 81 | 1 |
| Controlled value | 114 | 1 |
| Disabled and invalid | 151 | 0 |

### components/overflow-list

Source: docs/components/overflow-list.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Overflow list | 7 | 0 |
| Item limit | 32 | 0 |
| Row limit | 47 | 2 |
| In a table | 83 | 1 |
| Collapse from the start | 119 | 0 |
| Custom count | 137 | 2 |

### components/pagination

Source: docs/components/pagination.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Pagination | 7 | 0 |
| Router handling | 27 | 1 |
| Text page links | 54 | 0 |
| Directions only | 70 | 0 |
| Page links only | 85 | 0 |
| Rows per page | 102 | 1 |
| Localized | 157 | 0 |
| Disabled | 169 | 0 |

### components/popover

Source: docs/components/popover.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Popover | 7 | 1 |
| Title and description | 35 | 0 |
| Placement and arrow | 55 | 0 |
| Modal | 77 | 0 |
| Open on hover | 94 | 0 |
| Separate anchor | 110 | 3 |
| Open change | 146 | 1 |

### components/preview-card

Source: docs/components/preview-card.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Preview Card | 7 | 4 |
| Delays | 40 | 2 |
| Placement and arrow | 60 | 3 |
| Not hoverable | 80 | 1 |

### components/progress

Source: docs/components/progress.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Progress | 7 | 0 |
| Bare and captioned | 25 | 0 |
| Indeterminate | 42 | 0 |
| Steps | 55 | 0 |
| Import | 69 | 1 |
| Formatted value | 100 | 2 |

### components/qr-code

Source: docs/components/qr-code.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| QR code | 7 | 0 |
| Connect a device | 20 | 1 |
| Copy and download | 36 | 0 |
| Live value | 65 | 1 |
| Error correction | 97 | 0 |
| Sizes and colors | 150 | 1 |

### components/questionnaire

Source: docs/components/questionnaire.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Questionnaire | 7 | 0 |
| Choices and free text | 66 | 0 |
| Skip and validate | 102 | 0 |
| Resume a draft | 134 | 1 |
| Follow-up question | 185 | 0 |
| Number shortcuts | 245 | 0 |
| Submit | 274 | 1 |
| Checkpoint and cross-answer validation | 310 | 1 |
| Disabled until answered | 378 | 1 |
| Progress bar | 429 | 1 |
| Animated questions | 482 | 1 |
| Inside a Card | 543 | 5 |
| Clarification dialog | 603 | 1 |

### components/radio-group

Source: docs/components/radio-group.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Radio Group | 8 | 0 |
| Standalone | 29 | 0 |
| Horizontal | 42 | 0 |
| Disabled | 56 | 0 |
| Read-only | 79 | 0 |
| Controlled value | 95 | 0 |
| Required | 126 | 0 |
| Value change | 149 | 1 |

### components/resizable-panel-group

Source: docs/components/resizable-panel-group.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Resizable Panel Group | 8 | 8 |
| Bounds | 53 | 5 |
| Vertical | 71 | 3 |
| Collapsible sidebar | 91 | 3 |
| Layout events | 127 | 4 |
| Layout presets | 171 | 3 |
| Persisted sizes | 217 | 4 |
| Disabled | 267 | 3 |

### components/scroll-area

Source: docs/components/scroll-area.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Scroll Area | 7 | 14 |
| Horizontal | 47 | 7 |
| Both axes | 83 | 45 |
| Visibility | 114 | 4 |
| Edge fade | 162 | 6 |

### components/scroll-trigger

Source: docs/components/scroll-trigger.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Scroll Trigger | 7 | 6 |
| From the center | 40 | 6 |
| Replay on entry | 57 | 5 |
| Scrubbed band | 74 | 12 |
| Custom scroll range | 127 | 14 |
| Pinned scene | 202 | 16 |
| Reveal events | 235 | 4 |

### components/select

Source: docs/components/select.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Select | 8 | 0 |
| Groups and disabled options | 45 | 0 |
| tp-select-option | 66 | 0 |
| Multiple | 84 | 0 |
| Searchable | 105 | 0 |
| Chips | 140 | 1 |
| Columns | 161 | 0 |
| Items property | 185 | 0 |
| Rich labels | 208 | 0 |
| Virtualized time zones | 242 | 0 |
| Search source | 262 | 0 |
| Value change | 299 | 1 |
| Disabled, read-only and error | 339 | 0 |
| Select in a dialog | 369 | 0 |
| Inline | 395 | 0 |

### components/separator

Source: docs/components/separator.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Separator | 7 | 2 |
| Vertical | 34 | 1 |
| Between sections | 49 | 0 |

### components/skeleton

Source: docs/components/skeleton.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Skeleton | 7 | 3 |
| Pulse, sweep and none | 35 | 3 |
| Card | 50 | 3 |
| Video and description | 70 | 6 |
| Settings form | 94 | 5 |
| Table rows | 119 | 9 |

### components/slider

Source: docs/components/slider.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Slider | 8 | 1 |
| Price range | 25 | 2 |
| Push, swap and none | 43 | 2 |
| Currency and percent | 77 | 3 |
| Controlled range | 113 | 2 |
| Step and large step | 146 | 0 |
| Vertical | 166 | 1 |
| Vertical range | 177 | 3 |
| Compact readout | 193 | 4 |
| Media timeline | 212 | 1 |
| Authored thumbs | 230 | 0 |
| Fixed start and added thumbs | 244 | 1 |
| Thumb alignment and right to left | 285 | 0 |
| Field and form | 299 | 0 |
| Disabled and read-only | 318 | 0 |
| Change and commit | 332 | 1 |
| Rejecting values | 352 | 2 |
| Inline | 416 | 2 |
| Inline in a field | 452 | 0 |
| Editable value | 463 | 0 |
| Ticks | 489 | 0 |

### components/spinner

Source: docs/components/spinner.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Spinner | 7 | 1 |
| Sizes | 21 | 0 |
| Buttons | 32 | 0 |
| Badges | 43 | 0 |
| Input group | 53 | 0 |
| Empty state | 67 | 0 |

### components/stack

Source: docs/components/stack.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Stack | 7 | 0 |
| Horizontal layout | 19 | 0 |
| Responsive layout | 32 | 0 |
| Wrapping actions | 51 | 0 |
| Nested layouts | 63 | 0 |
| Compact spacing | 78 | 0 |
| Separated sections | 88 | 0 |

### components/status-dot

Source: docs/components/status-dot.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Status dot | 7 | 0 |
| Variants | 24 | 0 |
| Service status | 41 | 0 |
| Compact column | 74 | 0 |
| Pulse and ping | 110 | 0 |

### components/switch

Source: docs/components/switch.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Switch | 7 | 0 |
| Settings | 20 | 0 |
| Sizes | 48 | 0 |
| Form value | 60 | 0 |
| Disabled and read-only | 85 | 0 |
| Controlled | 111 | 0 |
| Thumb icon | 151 | 1 |
| Change event | 174 | 0 |
| Inline | 191 | 0 |

### components/table-of-contents

Source: docs/components/table-of-contents.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Table of contents | 8 | 19 |
| Nested items | 64 | 1 |
| Nested sections | 83 | 18 |
| Collected targets | 132 | 12 |
| Compact | 234 | 12 |

### components/table

Source: docs/components/table.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Table | 8 | 5 |
| Badges and menus | 56 | 4 |
| Inputs | 119 | 5 |
| Selects | 152 | 3 |
| Selected rows | 203 | 0 |
| Sticky edges | 238 | 78 |
| Prose column | 279 | 5 |

### components/tabs

Source: docs/components/tabs.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Tabs | 7 | 0 |
| Underline | 47 | 0 |
| Vertical | 65 | 0 |
| Automatic activation | 83 | 0 |
| Change event and setValue | 103 | 1 |
| Controlled with a veto | 143 | 1 |
| Disabled | 199 | 0 |

### components/text-area

Source: docs/components/text-area.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Text area | 7 | 0 |
| Content and fixed sizing | 22 | 2 |
| Mono | 47 | 0 |
| Error | 63 | 0 |
| Character count | 74 | 1 |
| Form | 102 | 0 |
| Disabled and read-only | 121 | 0 |

### components/text-transform

Source: docs/components/text-transform.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Text transform | 7 | 11 |
| Case and identifiers | 33 | 13 |
| Plans | 51 | 12 |
| Uploads | 90 | 2 |
| Locales | 110 | 1 |
| Truncation | 124 | 2 |
| Length limits | 161 | 1 |
| Formatter | 182 | 1 |
| Named presets | 204 | 1 |
| Unreadable input | 222 | 1 |

### components/theme-switcher

Source: docs/components/theme-switcher.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Theme switcher | 7 | 1 |
| Variants | 33 | 0 |
| Page theme | 59 | 1 |
| Small, defaulting to dark | 84 | 1 |
| Explicit choices only | 107 | 1 |
| Color scheme store | 142 | 0 |

### components/time

Source: docs/components/time.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Time | 7 | 4 |
| Modes | 53 | 9 |
| Absolute formats | 86 | 1 |
| Dates and zones | 113 | 1 |
| Due dates | 123 | 1 |
| Calendar | 145 | 9 |
| Short and narrow | 168 | 1 |
| Precisions | 185 | 11 |
| Timers | 200 | 7 |
| Description | 220 | 1 |
| Fallback | 240 | 1 |
| Message timestamp | 249 | 0 |

### components/timeline

Source: docs/components/timeline.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Timeline | 8 | 4 |
| Step tracker | 44 | 4 |
| Roadmap | 58 | 14 |
| Numbered steps | 101 | 3 |
| Expandable phases | 128 | 11 |
| Conversation | 177 | 1 |
| Changelog | 201 | 5 |
| Explicit status | 239 | 4 |

### components/toast

Source: docs/components/toast.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Toast | 7 | 0 |
| Types | 31 | 0 |
| Undo | 62 | 0 |
| Saving | 88 | 0 |
| Anchored | 109 | 0 |
| Manager | 135 | 0 |
| Host content | 166 | 0 |
| Top center, persistent | 178 | 0 |

### components/toggle-group

Source: docs/components/toggle-group.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Toggle group | 8 | 0 |
| Text formatting | 29 | 0 |
| Joined | 51 | 0 |
| Vertical, small | 67 | 0 |
| View switcher | 81 | 0 |
| Font weight | 101 | 4 |
| Required choice | 136 | 1 |
| Disabled items | 169 | 0 |

### components/toggle

Source: docs/components/toggle.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Toggle | 7 | 0 |
| Variants and sizes | 33 | 0 |
| Icon sizes | 55 | 0 |
| Icon and label | 74 | 0 |
| Pressed artwork | 91 | 1 |
| With Buttons | 115 | 0 |
| Change events | 131 | 1 |
| Disabled | 150 | 0 |

### components/tooltip

Source: docs/components/tooltip.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Tooltip | 7 | 0 |
| Sides | 29 | 0 |
| With a shortcut | 41 | 0 |
| Delays | 56 | 0 |
| Cursor tracking | 66 | 1 |
| Shared provider | 80 | 0 |
| Shared handle | 121 | 0 |
| Disabled tooltip | 175 | 0 |

### components/tree-view

Source: docs/components/tree-view.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Tree view | 8 | 0 |
| Permissions | 56 | 0 |
| Opening items | 81 | 2 |
| Chevron only | 115 | 0 |
| From records, reorderable | 139 | 1 |
| Rendered rows | 177 | 2 |
| Virtualized | 225 | 1 |
| Controlled lanes | 264 | 2 |
| Lazy folders | 327 | 1 |
| Expand, collapse and reveal | 370 | 1 |
| Small, no guides | 406 | 0 |

### components/visually-hidden

Source: docs/components/visually-hidden.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Visually hidden | 7 | 0 |
| Icon-only toggles | 31 | 0 |
| Filter results | 53 | 0 |
| Repeated actions | 90 | 3 |

### motion/surface/glow-border

Source: docs/motion/surface/glow-border.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Glow border | 7 | 2 |
| Controls and fields | 28 | 2 |
| Comets | 55 | 4 |
| Sweep, pulse and glint | 78 | 5 |
| Hover | 107 | 4 |
| Lingering light | 122 | 2 |
| Custom colors | 136 | 8 |
| Lit by an element | 162 | 2 |

### motion/surface/segment-border

Source: docs/motion/surface/segment-border.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Segment border | 8 | 0 |
| Patterns | 30 | 0 |
| Leave path | 67 | 0 |
| Traced in | 118 | 7 |
| Focus | 153 | 2 |
| Scanner | 167 | 1 |

### motion/text/text-mirror

Source: docs/motion/text/text-mirror.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Text mirror | 7 | 1 |
| From the center line | 26 | 1 |
| Vertical seam | 39 | 1 |
| Hide and reveal | 50 | 2 |
| Scrubbed by the scroll | 70 | 10 |

### motion/text/text-split

Source: docs/motion/text/text-split.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Text split | 7 | 1 |
| Words behind a mask | 32 | 1 |
| Characters from the center | 45 | 1 |
| Slow stagger | 56 | 1 |
| Reveal on demand | 69 | 2 |
| Custom reveal | 87 | 1 |
| Inline formatting | 125 | 1 |
| Scrubbed by the scroll | 138 | 10 |

### motion/text/text-stroke

Source: docs/motion/text/text-stroke.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Text stroke | 7 | 1 |
| Word by word | 26 | 1 |
| Heavier outline | 37 | 1 |
| Hide and reveal | 48 | 2 |
| Scrubbed by the scroll | 78 | 10 |

### widgets/color-picker

Source: docs/widgets/color-picker.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Color picker | 7 | 1 |
| Popup in a field | 22 | 0 |
| Color input trigger | 33 | 1 |
| Popup in a form | 46 | 1 |
| Limited formats, no alpha | 95 | 1 |
| Channel sliders | 112 | 1 |
| Harmony wheel and triangle | 117 | 2 |
| Reading the palette | 142 | 2 |
| Brand swatches | 177 | 1 |
| Commit events | 197 | 2 |
| Controlled owner | 227 | 3 |
| Surface only, and fields without a format choice | 268 | 2 |
| Small and read-only | 295 | 2 |
| Right-to-left | 322 | 2 |

### widgets/easing-editor

Source: docs/widgets/easing-editor.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Easing editor | 7 | 1 |
| Spring and custom points | 20 | 3 |
| Compact in a dialog | 52 | 0 |
| Rotation preview | 69 | 1 |
| Design system presets | 82 | 1 |
| Export for code | 112 | 1 |
| Commit and veto | 137 | 3 |
| Controlled owner | 161 | 3 |
| Field, small size | 194 | 1 |

### widgets/emoji-picker

Source: docs/widgets/emoji-picker.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Emoji picker | 7 | 0 |
| Picks | 18 | 1 |
| Insert into a message | 43 | 1 |
| Remembered tone | 76 | 1 |
| Recent picks | 104 | 0 |
| Workspace emoji | 120 | 0 |
| Curated reactions | 147 | 0 |
| Full Unicode set | 183 | 0 |
| Popup in a form | 197 | 1 |
| Small and read-only | 232 | 0 |

### widgets/flow

Source: docs/widgets/flow.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Voice chain | 11 | 1 |
| Kinds and animation | 108 | 1 |
| Authored nodes | 143 | 1 |
| Library and inspector | 189 | 1 |
| Toolbars and panels | 262 | 1 |
| Automatic layout | 304 | 4 |
| Commit and selection | 395 | 3 |
| Controlled owner | 447 | 3 |
| A finished run in view mode | 508 | 1 |
| Run requests | 565 | 2 |
| Read-only dependency viewer | 649 | 1 |
| In a form | 688 | 3 |

### widgets/gradient-picker

Source: docs/widgets/gradient-picker.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Gradient picker | 7 | 0 |
| Stop controls | 31 | 0 |
| Midpoints | 78 | 0 |
| Small and read-only | 111 | 0 |
| Field | 130 | 0 |
| Field settings | 145 | 0 |

### widgets/plot

Source: docs/widgets/plot.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Live signal | 7 | 3 |
| Distribution | 41 | 3 |
| Signed load | 64 | 1 |
| Service CPU | 78 | 1 |
| Push and revise | 100 | 1 |
| Guided signal | 152 | 1 |
| Inspect samples | 194 | 1 |

### widgets/text-editor

Source: docs/widgets/text-editor.mdx

| Use case | Source line | Styling sites |
| --- | ---: | ---: |
| Text editor | 7 | 1 |
| Classic editor | 177 | 0 |
| Node editor | 256 | 0 |
| Custom nodes | 321 | 2 |
| Custom blocks | 400 | 0 |
| Markdown in and out | 508 | 0 |
| In a form | 558 | 1 |
| Read-only and disabled | 615 | 4 |
| Image upload | 830 | 0 |
| Core editor | 886 | 0 |


## Complete source coverage

Shared helpers and imported styling are listed at their source; names in story/helper files are nearest source labels, not proven runtime reachability.

| Source | Styling sites |
| --- | ---: |
| docs/anchored-surfaces.md | 0 |
| docs/components/accordion.mdx | 1 |
| docs/components/alert-dialog.mdx | 0 |
| docs/components/alert.mdx | 0 |
| docs/components/aspect-ratio.mdx | 26 |
| docs/components/attachment.mdx | 8 |
| docs/components/autocomplete.mdx | 10 |
| docs/components/avatar.mdx | 7 |
| docs/components/badge.mdx | 3 |
| docs/components/breadcrumb.mdx | 1 |
| docs/components/bubble.mdx | 13 |
| docs/components/button-group.mdx | 3 |
| docs/components/button.mdx | 2 |
| docs/components/calendar.mdx | 26 |
| docs/components/card.mdx | 20 |
| docs/components/carousel.mdx | 90 |
| docs/components/checkbox.mdx | 8 |
| docs/components/citation.mdx | 3 |
| docs/components/code-block.mdx | 2 |
| docs/components/collapsible.mdx | 14 |
| docs/components/color-input.mdx | 1 |
| docs/components/command-palette.mdx | 1 |
| docs/components/copy-button.mdx | 6 |
| docs/components/cursor.mdx | 35 |
| docs/components/chart.mdx | 3 |
| docs/components/description-list.mdx | 5 |
| docs/components/dialog.mdx | 7 |
| docs/components/drag-drop-list.mdx | 10 |
| docs/components/drawer.mdx | 4 |
| docs/components/empty-state.mdx | 6 |
| docs/components/field-group.mdx | 3 |
| docs/components/field.mdx | 2 |
| docs/components/file-upload.mdx | 1 |
| docs/components/form.mdx | 6 |
| docs/components/icon.mdx | 6 |
| docs/components/image.mdx | 61 |
| docs/components/input-group.mdx | 7 |
| docs/components/input.mdx | 0 |
| docs/components/kbd.mdx | 3 |
| docs/components/label.mdx | 1 |
| docs/components/list.mdx | 26 |
| docs/components/map.mdx | 26 |
| docs/components/markdown.mdx | 5 |
| docs/components/marker.mdx | 12 |
| docs/components/media-player.mdx | 4 |
| docs/components/menu.mdx | 2 |
| docs/components/menubar.mdx | 1 |
| docs/components/message-scroller.mdx | 20 |
| docs/components/message.mdx | 2 |
| docs/components/native-select.mdx | 2 |
| docs/components/navigation-menu.mdx | 10 |
| docs/components/navigation-panel.mdx | 28 |
| docs/components/one-time-code-field.mdx | 4 |
| docs/components/overflow-list.mdx | 5 |
| docs/components/pagination.mdx | 2 |
| docs/components/popover.mdx | 5 |
| docs/components/preview-card.mdx | 10 |
| docs/components/progress.mdx | 3 |
| docs/components/qr-code.mdx | 3 |
| docs/components/questionnaire.mdx | 12 |
| docs/components/radio-group.mdx | 1 |
| docs/components/resizable-panel-group.mdx | 33 |
| docs/components/scroll-area.mdx | 76 |
| docs/components/scroll-trigger.mdx | 63 |
| docs/components/select.mdx | 2 |
| docs/components/separator.mdx | 3 |
| docs/components/skeleton.mdx | 29 |
| docs/components/slider.mdx | 25 |
| docs/components/spinner.mdx | 1 |
| docs/components/stack.mdx | 0 |
| docs/components/status-dot.mdx | 0 |
| docs/components/switch.mdx | 1 |
| docs/components/table-of-contents.mdx | 62 |
| docs/components/table.mdx | 100 |
| docs/components/tabs.mdx | 2 |
| docs/components/text-area.mdx | 3 |
| docs/components/text-transform.mdx | 45 |
| docs/components/theme-switcher.mdx | 4 |
| docs/components/time.mdx | 46 |
| docs/components/timeline.mdx | 46 |
| docs/components/toast.mdx | 0 |
| docs/components/toggle-group.mdx | 5 |
| docs/components/toggle.mdx | 2 |
| docs/components/tooltip.mdx | 1 |
| docs/components/tree-view.mdx | 10 |
| docs/components/visually-hidden.mdx | 3 |
| docs/content-security.md | 1 |
| docs/conventions.md | 0 |
| docs/drag-drop.md | 0 |
| docs/frameworks.md | 1 |
| docs/meter.md | 0 |
| docs/motion.md | 1 |
| docs/motion/surface/glow-border.mdx | 29 |
| docs/motion/surface/segment-border.mdx | 10 |
| docs/motion/text/text-mirror.mdx | 15 |
| docs/motion/text/text-split.mdx | 18 |
| docs/motion/text/text-stroke.mdx | 15 |
| docs/navigation-panel.md | 1 |
| docs/number-field.md | 1 |
| docs/styling.md | 5 |
| docs/toolbar.md | 0 |
| docs/widgets/README.md | 1 |
| docs/widgets/color-picker.mdx | 21 |
| docs/widgets/easing-editor.mdx | 14 |
| docs/widgets/emoji-picker.mdx | 4 |
| docs/widgets/flow.mdx | 22 |
| docs/widgets/gradient-picker.mdx | 0 |
| docs/widgets/plot.mdx | 11 |
| docs/widgets/text-editor.mdx | 8 |
| src/stories/accordion.stories.ts | 0 |
| src/stories/alert-dialog.stories.ts | 0 |
| src/stories/alert.stories.ts | 0 |
| src/stories/aspect-ratio.stories.ts | 0 |
| src/stories/assets/media/README.md | 0 |
| src/stories/attachment.stories.ts | 0 |
| src/stories/autocomplete.stories.ts | 0 |
| src/stories/avatar.stories.ts | 0 |
| src/stories/badge.stories.ts | 1 |
| src/stories/breadcrumb.stories.ts | 0 |
| src/stories/bubble.stories.ts | 0 |
| src/stories/button-group.stories.ts | 0 |
| src/stories/button.stories.ts | 1 |
| src/stories/calendar.stories.ts | 0 |
| src/stories/card.stories.css | 1 |
| src/stories/card.stories.ts | 1 |
| src/stories/carousel-effects-example.d.ts | 0 |
| src/stories/carousel-effects-example.js | 0 |
| src/stories/carousel-effects.examples.ts | 2 |
| src/stories/carousel-effects.stories.css | 1 |
| src/stories/carousel.stories.css | 1 |
| src/stories/carousel.stories.ts | 1 |
| src/stories/checkbox.stories.ts | 0 |
| src/stories/citation-example.d.ts | 0 |
| src/stories/citation-example.js | 0 |
| src/stories/citation.examples.ts | 1 |
| src/stories/citation.stories.ts | 0 |
| src/stories/code-block.stories.ts | 0 |
| src/stories/collapsible.stories.ts | 0 |
| src/stories/color-input.stories.ts | 1 |
| src/stories/command-palette.stories.ts | 0 |
| src/stories/copy-button.stories.ts | 0 |
| src/stories/cursor.stories.ts | 1 |
| src/stories/chart.examples.ts | 0 |
| src/stories/chart.stories.ts | 0 |
| src/stories/date-picker-trigger.d.ts | 0 |
| src/stories/date-picker-trigger.js | 3 |
| src/stories/description-list.stories.ts | 0 |
| src/stories/design-tokens.stories.ts | 0 |
| src/stories/design-tokens/design-tokens.css | 1 |
| src/stories/design-tokens/design-tokens.ts | 12 |
| src/stories/dialog.stories.ts | 0 |
| src/stories/documentation-examples.ts | 2 |
| src/stories/drag-drop-list.stories.ts | 0 |
| src/stories/drawer.stories.ts | 0 |
| src/stories/empty-state.stories.ts | 0 |
| src/stories/examples.ts | 0 |
| src/stories/field-group.stories.ts | 0 |
| src/stories/field.stories.ts | 0 |
| src/stories/file-upload.stories.ts | 0 |
| src/stories/form.examples.ts | 0 |
| src/stories/form.stories.ts | 0 |
| src/stories/glow-border.stories.ts | 2 |
| src/stories/icon.stories.ts | 0 |
| src/stories/image.stories.ts | 0 |
| src/stories/input-group.stories.ts | 0 |
| src/stories/input.stories.ts | 0 |
| src/stories/kbd-example.d.ts | 0 |
| src/stories/kbd-example.js | 0 |
| src/stories/kbd.examples.ts | 0 |
| src/stories/kbd.stories.ts | 0 |
| src/stories/label.stories.ts | 0 |
| src/stories/library-docs.ts | 0 |
| src/stories/line-by-line-motion.ts | 0 |
| src/stories/list.stories.ts | 0 |
| src/stories/map-example.d.ts | 0 |
| src/stories/map-example.js | 1 |
| src/stories/map-google-style.ts | 0 |
| src/stories/map.examples.ts | 10 |
| src/stories/map.stories.ts | 0 |
| src/stories/markdown.stories.ts | 0 |
| src/stories/marker.stories.ts | 0 |
| src/stories/media-player-example.d.ts | 0 |
| src/stories/media-player-example.js | 0 |
| src/stories/media-player.examples.ts | 2 |
| src/stories/media-player.stories.ts | 0 |
| src/stories/media.ts | 0 |
| src/stories/menu-family-controls.ts | 2 |
| src/stories/menu.stories.ts | 0 |
| src/stories/menubar.stories.ts | 0 |
| src/stories/message-example.d.ts | 0 |
| src/stories/message-example.js | 1 |
| src/stories/message-scroller-streaming.ts | 3 |
| src/stories/message-scroller-use-cases.ts | 7 |
| src/stories/message-scroller.stories.ts | 0 |
| src/stories/message.examples.ts | 1 |
| src/stories/message.stories.ts | 0 |
| src/stories/native-select.stories.ts | 0 |
| src/stories/navigation-menu.stories.ts | 0 |
| src/stories/navigation-panel-example.d.ts | 0 |
| src/stories/navigation-panel-example.js | 2 |
| src/stories/navigation-panel.stories.ts | 0 |
| src/stories/one-time-code-field.stories.ts | 0 |
| src/stories/overflow-list.stories.ts | 1 |
| src/stories/pagination.stories.ts | 0 |
| src/stories/popover.stories.ts | 0 |
| src/stories/presentation-primitives.examples.ts | 2 |
| src/stories/preview-card.stories.ts | 0 |
| src/stories/progress.stories.ts | 1 |
| src/stories/qr-code.stories.ts | 0 |
| src/stories/questionnaire-data.d.ts | 0 |
| src/stories/questionnaire-data.js | 0 |
| src/stories/questionnaire-example.d.ts | 0 |
| src/stories/questionnaire-example.js | 9 |
| src/stories/questionnaire.examples.ts | 0 |
| src/stories/questionnaire.stories.ts | 1 |
| src/stories/radio-group.stories.ts | 0 |
| src/stories/resizable-panel-group.stories.ts | 13 |
| src/stories/scroll-area.stories.ts | 5 |
| src/stories/scroll-trigger.stories.ts | 3 |
| src/stories/segment-border.stories.ts | 0 |
| src/stories/select.stories.ts | 0 |
| src/stories/separator.stories.ts | 0 |
| src/stories/size-report.stories.ts | 0 |
| src/stories/size-report/size-chart.ts | 3 |
| src/stories/size-report/size-report.css | 1 |
| src/stories/size-report/size-report.ts | 3 |
| src/stories/skeleton.examples.ts | 14 |
| src/stories/skeleton.stories.ts | 0 |
| src/stories/slider-example.d.ts | 0 |
| src/stories/slider-example.js | 3 |
| src/stories/slider.examples.ts | 2 |
| src/stories/slider.stories.ts | 0 |
| src/stories/spinner.stories.ts | 0 |
| src/stories/stack.stories.ts | 0 |
| src/stories/status-dot.stories.ts | 0 |
| src/stories/switch.stories.ts | 0 |
| src/stories/table-of-contents-example.d.ts | 0 |
| src/stories/table-of-contents-example.js | 0 |
| src/stories/table-of-contents.examples.ts | 12 |
| src/stories/table-of-contents.stories.ts | 3 |
| src/stories/table.examples.ts | 9 |
| src/stories/table.stories.ts | 0 |
| src/stories/tabs.stories.ts | 0 |
| src/stories/text-area.stories.ts | 0 |
| src/stories/text-generator.d.ts | 0 |
| src/stories/text-generator.js | 0 |
| src/stories/text-mirror.stories.ts | 1 |
| src/stories/text-split.stories.ts | 1 |
| src/stories/text-stroke.stories.ts | 1 |
| src/stories/text-transform.stories.ts | 1 |
| src/stories/theme-switcher.stories.ts | 0 |
| src/stories/time.stories.ts | 0 |
| src/stories/timeline.stories.ts | 5 |
| src/stories/toast.stories.ts | 0 |
| src/stories/toggle-group.stories.ts | 11 |
| src/stories/toggle.stories.ts | 5 |
| src/stories/tooltip.stories.ts | 0 |
| src/stories/tree-view.stories.ts | 0 |
| src/stories/visually-hidden.stories.ts | 0 |
| src/stories/widgets/color-picker.stories.ts | 1 |
| src/stories/widgets/easing-editor.stories.ts | 0 |
| src/stories/widgets/emoji-picker.stories.ts | 0 |
| src/stories/widgets/examples.ts | 0 |
| src/stories/widgets/flow-example.d.ts | 0 |
| src/stories/widgets/flow-example.js | 3 |
| src/stories/widgets/flow.stories.ts | 0 |
| src/stories/widgets/gradient-picker.stories.ts | 0 |
| src/stories/widgets/overview.mdx | 0 |
| src/stories/widgets/plot.stories.ts | 8 |
| src/stories/widgets/text-editor-blocks-example.d.ts | 0 |
| src/stories/widgets/text-editor-blocks-example.js | 0 |
| src/stories/widgets/text-editor-classic-example.d.ts | 0 |
| src/stories/widgets/text-editor-classic-example.js | 0 |
| src/stories/widgets/text-editor-custom-blocks-example.d.ts | 0 |
| src/stories/widgets/text-editor-custom-blocks-example.js | 0 |
| src/stories/widgets/text-editor-engine.d.ts | 0 |
| src/stories/widgets/text-editor-engine.js | 0 |
| src/stories/widgets/text-editor-form-example.d.ts | 0 |
| src/stories/widgets/text-editor-form-example.js | 0 |
| src/stories/widgets/text-editor-images-example.d.ts | 0 |
| src/stories/widgets/text-editor-images-example.js | 0 |
| src/stories/widgets/text-editor-lexical-engine.d.ts | 0 |
| src/stories/widgets/text-editor-lexical-engine.js | 0 |
| src/stories/widgets/text-editor-mentions-example.d.ts | 0 |
| src/stories/widgets/text-editor-mentions-example.js | 0 |
| src/stories/widgets/text-editor-samples.ts | 0 |
| src/stories/widgets/text-editor-selection-example.d.ts | 0 |
| src/stories/widgets/text-editor-selection-example.js | 0 |
| src/stories/widgets/text-editor.examples.ts | 0 |
| src/stories/widgets/text-editor.stories.ts | 0 |
| src/stories/workspace/data.ts | 0 |
| src/stories/workspace/host.ts | 0 |
| src/stories/workspace/pages/activity.css | 1 |
| src/stories/workspace/pages/activity.ts | 1 |
| src/stories/workspace/pages/board.ts | 0 |
| src/stories/workspace/pages/brief.css | 1 |
| src/stories/workspace/pages/brief.ts | 1 |
| src/stories/workspace/pages/files.css | 1 |
| src/stories/workspace/pages/files.ts | 1 |
| src/stories/workspace/pages/overview.css | 1 |
| src/stories/workspace/pages/overview.ts | 3 |
| src/stories/workspace/pages/sites.css | 1 |
| src/stories/workspace/pages/sites.ts | 2 |
| src/stories/workspace/pages/work.css | 1 |
| src/stories/workspace/pages/work.ts | 3 |
| src/stories/workspace/settings-dialog.ts | 2 |
| src/stories/workspace/styles.css | 1 |
| src/stories/workspace/workspace.ts | 3 |

## Review procedure and limits

For each occurrence: remove redundancy; retain only with a concrete necessary purpose; replace using an existing library API/composition; or repair the component/shared owner.
Trace nested components individually. Confirm presentation dependencies with source ownership and rendered removal checks before declaring a TOTAL VIOLATION.

Priority starting points beyond frequency alone: Plot's ordinary examples hide plot-label through partPresentation; Scroll Area's hero supplies border/radius framing; Aspect Ratio repeats host overflow despite internal clipping. These need ownership decisions. Avatar's custom-shape example explicitly demonstrates customization, whereas Tabs' max width and centering are composition geometry. None is automatically a missing-default-paint defect.

Extraction handles quoted attributes and balanced template bindings. Static declarations are parsed with PostCSS. JavaScript records preserve mutation/hook expressions or their source line; dynamic expressions and imported helper/class reachability require follow-up. Stylesheet source is preserved in full and not mislabeled as inline declarations.
No builds, browser runs, servers or example execution were performed to produce this report.
