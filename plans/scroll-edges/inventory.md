# Native scroll-edge migration inventory

Every row is **prepared / implementation pending**. Paths are relative to the repository root.
Shared consumers inherit one adapter; they must not install duplicate observation or fade layers.
Acceptance IDs refer to plan.md; all rows require V-01–V-08, with risks highlighted below.

| Controls / surface | Concrete source and owner | Existing evidence / required integration |
| --- | --- | --- |
| Scroll Area viewport/content | src/components/scroll-area/scroll-area.ts and controller.ts | Existing x/y/start/end markers, overflowEdgeThreshold and distances; primary state owner. Fade content, preserve tracks/thumb/corner. |
| Message Scroller transcript | src/components/message-scroller/parts.ts; src/presentation/recipes/message-scroller.ts | Existing end mask and scroll timeline; reuse transcript edge state, replace mask rather than stack; preserve return control, follow/prepend/anchor positions. |
| Carousel native scroll-snap viewport | src/components/carousel/styles.ts and carousel.ts | Native transport only; reuse active-axis progress/scrollbar owner; preserve snap alignment, navigation and focus. Transform transports excluded. |
| Table viewport | src/components/table/table.ts | Native overflow viewport; isolate sticky headers/fixed columns and preserve table semantics. |
| Tree View viewport | src/components/tree-view/tree-view.ts | Native hidden/auto viewport; virtualized rows must preserve offsets and active-item reveal. |
| Tabs list | src/components/tabs/tabs.ts | Native overflow list; exclude indicator/focus chrome where necessary; logical direction and active tab reveal. |
| Attachment group | src/components/attachment/group.ts | Horizontal native overflow; preserve item focus and actions. |
| Select list | src/components/select/styles.ts and select.ts | Existing list scrolling and scroll controls/insets; preserve active descendant, virtualization, labels and up/down affordances. |
| Autocomplete | src/components/autocomplete/autocomplete.ts | Extends Select; inherits list adapter and mapped parts, not a second one. |
| Command Palette list and dialog shell | src/components/command-palette/list.ts and command-palette.ts | List extends Select; shell extends Dialog. Treat independently scrolling viewports once each, exclude search and fixed controls. |
| Menu / Popover / Tooltip / Navigation Menu bodies | src/components/anchored-surface/anchored-surface.ts | Shared .body overflow owner; include only actually constrained native scrollers; preserve focus gutter, arrow, title and fixed chrome. |
| Dialog content / body | src/components/dialog/styles.ts | Dialog scrolls its content container; Drawer also scrolls its body. Mask only the body content, preserving header/footer/close chrome and modal focus containment. Alert Dialog inherits via its Dialog family. |
| Drawer body | src/components/drawer/styles.ts | Actual body scroll region only; preserve drag/resize/close controls and scroll padding. |
| Navigation Panel body and sections | src/components/navigation-panel/styles.ts, parts.ts; src/presentation/recipes/navigation-panel.ts | Multiple native scroll regions in shared anatomy; distinguish each actual viewport and avoid fading fixed navigation chrome. |
| Resizable Panel Group and Panel | src/components/resizable-panel-group/group.ts and panel.ts | Group/panel overflow owners; preserve handle input, constraints, min sizes, collapse and independent nested scrollers. |
| Emoji Picker item list | src/widgets/emoji-picker/emoji-picker.ts; src/presentation/recipes/emoji-picker.ts | Reuses Select list presentation; preserve sticky group labels and virtualization; integrate the actual list state owner once. |
| Emoji Picker category bar | src/widgets/emoji-picker/views/categories.ts | Composes Tabs; inherits tab-list adapter, retains category selection and tooltip behavior. |
| Easing Editor presets | src/widgets/easing-editor/easing-editor.ts | Composes tp-scroll-area; inherits primary adapter without widget-local masks. |
| Flow inspector and palette | src/widgets/flow/panels/inspector.ts and palette.ts | Native panel overflow; leave canvas/pan-zoom surface excluded and preserve panel actions. |
| Text Editor viewport | src/widgets/text-editor/styles.ts | Native editor scroll owner; exclude sticky toolbar/selection overlays/grips; preserve caret, composition and selection. |
| Code Block horizontal viewport | src/components/code-block/code-block.ts | Existing inline overflow state; avoid conflicts with its separate collapsed-content mask and copy/expand controls. |
| Embedded document tables | src/presentation/recipes/shared/document-table.ts | Shared horizontal wrapper recipe; pair with owning document/editor mount observation rather than CSS-only duplicate owners. |
| Editor embedded code/table wrappers | src/foundation/text-editor/adapters/*/css.ts and shared document-table recipe | Engine adapters own native wrappers; route through common host infrastructure, preserve selection/caret/table grips. No optional engine dependency enters core. |
| Markdown document consumers | src/components/markdown/render.ts | Code fences compose Code Block; authored tables compose Table. Inherit existing adapters; no second blanket document mask. |

## Explicit exclusions and classified search matches

- Plot histories, Chart renderers and Flow/map canvas clipping: no native scrolling
  viewport; user explicitly excluded these from this contract.
- Citation's inline mask: truncation/reveal affordance, not scrolling.
- Code Block collapsed end fade: separate collapse semantics; its native horizontal scroller is included.
- Accordion reveal clipping, color-picker visual masks, media clipping and ellipsis: not scrollports.
- Single-line input internals and browser/page scroll: not library-owned scroll-area adapters.
- src/styles.css native pre/code rules, src/stories/workspace/pages/work.css, token-page and
  Table-of-Contents demo overflow: consumer/demo wrappers, not new controls. Future examples
  should opt into Scroll Area where appropriate, without automatically styling the document.
- Consumer-supplied slots and arbitrary overflow CSS do not authorize a global mutation observer
  or library-wide CSS selector. Their library-owned parent viewport is covered when present.

## Future public integration touchpoints

Add the role to src/presentation/tokens.ts, default styles in src/styles.css, token-catalog metadata
and relevant required-token/custom-theme tests during runtime rollout. Presentation belongs to a
shared recipe; observation belongs to existing Foundation/scroll owners. No new element property,
event, framework binding, or per-control style-selector API is planned. Update each component's
shared docs and gate record as its adapter ships. Inherited consumers still require composition
verification, especially nested scrolling, sticky chrome and focus reveal.

## Runtime adoption

The shared controller is installed at every native owner above. Autocomplete,
Command List and Emoji List inherit Select; Alert Dialog and Drawer inherit Dialog;
Menu/Popover/Tooltip/Navigation Menu inherit Anchored Surface. Emoji category Tabs
and Easing Editor Scroll Area inherit their existing composed owners. Markdown
fences and tables compose Code Block and Table respectively. The editor host
tracks its main viewport and engine-owned native table/code wrappers; visible,
non-scrolling code blocks do not receive a separate adapter. Transform Carousel,
Plot, Flow canvas and maps remain outside this native-scroll contract.

See rollout-checklist.md and the reproducible fixture README for runtime evidence.
