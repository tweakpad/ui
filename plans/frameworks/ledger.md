# Framework bindings ledger

One row per catalog entry (components and widgets). A binding is generated for every element the
entry registers (the root and its sub-elements); the row covers all of them. Statuses are
`pending`, `passed`, `failed`, `blocked` and `not applicable`; any status other than `pending`
needs evidence. `node scripts/bindings/check-ledger.mjs` checks the rows (`--complete` at the end
of the rollout).

- **Smoke**: every binding of the entry mounts and unmounts alone, in React 19 (StrictMode) and in
  Vue, with its element defined and rendered and no error or warning (`reactBindings.smoke()`,
  `vueBindings.smoke()`); diagnostics an element reports outside its composition are expected.
- **React**: the entry's scenario in `tests/fixtures/frameworks/react/` passes through Chrome
  DevTools MCP (see its README for what a scenario checks).
- **Vue**: the same in `tests/fixtures/frameworks/vue/`.
- **Types**: the generated type tests compile for React, Vue, Preact, Solid and Svelte, and the
  entry's events and lane callbacks carry the element's detail types. Every binding is rendered
  in `tests/frameworks/react/elements.tsx`; every tag is declared in the framework modules that
  `npm run typecheck:frameworks` compiles.
- **Library fixes**: defects a framework exposed, fixed in the library.

Every generated binding already passes the automated checks (`npm test` drift and event typing,
`npm run typecheck` usage per binding, `npm run size:report` budgets, `npm run test:package`
install, type check, server render and tree-shaking); a row records the per-entry browser
verification on top of them.

| Tag | Entry | Smoke | React | Vue | Types | Library fixes | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `tp-accordion` | Accordion | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-button` | Button | passed | passed | passed | passed |  | React and Vue fixture `button` scenarios and showcase clicks (2026-10-30/31); material-designer pilot port; smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-checkbox` | Checkbox | passed | passed | passed | passed |  | React and Vue fixture `checkbox` scenarios and showcase clicks (2026-10-30/31); material-designer pilot port; smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-collapsible` | Collapsible | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-copy-button` | Copy button | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-radio-group` | Radio group | passed | passed | passed | passed |  | Lane matrix `tp-radio-group` in the React and Vue fixtures: controlled accept and reject, uncontrolled default (2026-10-31); smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-switch` | Switch | passed | passed | passed | passed |  | Lane matrix `tp-switch` in the React and Vue fixtures: controlled accept and reject, uncontrolled default (2026-10-31); smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-tabs` | Tabs | passed | passed | passed | passed |  | Lane matrix `tp-tabs` in the React and Vue fixtures: controlled accept and reject, uncontrolled default (2026-10-31); smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-toggle` | Toggle | passed | passed | passed | passed |  | Lane matrix `tp-toggle` in the React and Vue fixtures: controlled accept and reject, uncontrolled default (2026-10-31); smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-toggle-group` | Toggle group | passed | passed | passed | passed |  | Lane matrix `tp-toggle-group` in the React and Vue fixtures: controlled accept and reject, uncontrolled default (2026-10-31); smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-theme-switcher` | Theme switcher | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-calendar` | Calendar | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-field` | Field | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-form` | Form | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-input` | Input | passed | passed | passed | passed |  | React and Vue fixture `input` scenarios and showcase clicks (2026-10-30/31); material-designer pilot port; smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package`; `precision` added and the inline number stepper (2026-10-31): React and Vue `input` scenarios and smoke 201/201 rerun, `npm run typecheck` |
| `tp-input-group` | Input group | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-native-select` | Native select | passed | passed | passed | passed |  | Lane matrix `tp-native-select` in the React and Vue fixtures: controlled accept and reject, uncontrolled default (2026-10-31); smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-one-time-code-field` | One-time code field | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-questionnaire` | Questionnaire | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-slider` | Slider | passed | passed | passed | passed |  | Lane matrix `tp-slider` in the React and Vue fixtures: controlled accept and reject, uncontrolled default (2026-10-31); smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-text-area` | Text area | passed | passed | passed | passed |  | Lane matrix `tp-text-area` in the React and Vue fixtures: controlled accept and reject, uncontrolled default (2026-10-31); smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-file-upload` | File upload | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-color-input` | Color input | passed | passed | passed | passed |  | Lane matrix `tp-color-input` in the React and Vue fixtures: controlled accept and reject, uncontrolled default; smoke 201/201 bindings mount in React and Vue; `tp-color-picker` lanes rerun after its trigger became a Color input (2026-10-31); `npm run typecheck`, `npm test` |
| `tp-command-palette` | Command palette | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-select` | Select | passed | passed | passed | passed |  | React and Vue fixture `select` scenarios and showcase clicks (2026-10-30/31); material-designer pilot port; smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-alert-dialog` | Alert dialog | passed | passed | passed | passed |  | Lane matrix `tp-alert-dialog` in the React and Vue fixtures: controlled accept and reject, uncontrolled default (2026-10-31); smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-dialog` | Dialog | passed | passed | passed | passed |  | React and Vue fixture `dialog` scenarios and showcase clicks (2026-10-30/31); material-designer pilot port; smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-drawer` | Drawer | passed | passed | passed | passed |  | Lane matrix `tp-drawer` in the React and Vue fixtures: controlled accept and reject, uncontrolled default (2026-10-31); smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-popover` | Popover | passed | passed | passed | passed |  | Lane matrix `tp-popover` in the React and Vue fixtures: controlled accept and reject, uncontrolled default (2026-10-31); smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-preview-card` | Preview card | passed | passed | passed | passed |  | Lane matrix `tp-preview-card` in the React and Vue fixtures: controlled accept and reject, uncontrolled default (2026-10-31); smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-tooltip` | Tooltip | passed | passed | passed | passed |  | Lane matrix `tp-tooltip` in the React and Vue fixtures: controlled accept and reject, uncontrolled default (2026-10-31); smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-breadcrumb` | Breadcrumb | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-menu` | Menu | passed | passed | passed | passed | OwnedPortal keeps owner child-list methods working through projection (menu, popover, navigation-menu, dialog portal) | React and Vue fixture `menu` scenarios and showcase clicks (2026-10-30/31); material-designer pilot port; smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-menubar` | Menubar | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-navigation-menu` | Navigation menu | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-pagination` | Pagination | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-avatar` | Avatar | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-carousel` | Carousel | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-data-visualization` | Data visualization | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-message-scroller` | Message scroller | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-progress` | Progress | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-resizable-panel-group` | Resizable panel group | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-scroll-area` | Scroll area | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-separator` | Separator | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-spinner` | Spinner | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-toast` | Toast | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-alert` | Alert | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-aspect-ratio` | Aspect-ratio box | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-attachment` | Attachment | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-badge` | Badge | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-bubble` | Bubble | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-button-group` | Button group | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-field-group` | Field group | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-card` | Card | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-citation` | Citation | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-description-list` | Description list | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-code-block` | Code block | passed | passed | passed | passed |  | Lane matrix `tp-code-block` in the React and Vue fixtures: controlled accept and reject, uncontrolled default (2026-10-31); smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-markdown` | Markdown | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-image` | Image | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-qr-code` | QR code | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-scroll-trigger` | Scroll trigger | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-timeline` | Timeline | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-autocomplete` | Autocomplete | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-mo-text-split` | Text split | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-mo-text-mirror` | Text mirror | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-mo-text-stroke` | Text stroke | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-mo-glow-border` | Glow border | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-mo-segment-border` | Segment border | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-cursor` | Cursor | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-table-of-contents` | Table of contents | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-tree-view` | Tree view | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-empty-state` | Empty state | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-icon` | Icon | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-kbd` | Kbd | passed | pending | pending | passed | Renamed from Key hint (`tp-key-hint`, `tp-key-hint-group` → `tp-kbd`, `tp-kbd-group`) and its `key` property to `value`, which React and Vue do not reserve | `<Kbd value="mod">` reaches the element in React and Vue and draws the platform notation (2026-10-31); smoke 200/200 bindings mount in React and Vue; `npm test`, `npm run typecheck`, `check-docs --all` |
| `tp-label` | Label | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-list` | List | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-drag-drop-list` | Drag Drop List | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-marker` | Marker | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-message` | Message | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-overflow-list` | Overflow list | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-skeleton` | Skeleton | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-status-dot` | Status dot | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-table` | Table | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-text-transform` | Text transform | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-time` | Time | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-visually-hidden` | Visually hidden | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-navigation-panel` | Navigation panel | passed | passed | passed | passed |  | Lane matrix `tp-navigation-panel` in the React and Vue fixtures: controlled accept and reject, uncontrolled default (2026-10-31); smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-media-player` | Media player | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-map` | Map | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-color-picker` | Color picker | passed | passed | passed | passed |  | Lane matrix `tp-color-picker` in the React and Vue fixtures: controlled accept and reject, uncontrolled default (2026-10-31); smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-easing-editor` | Easing editor | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-flow` | Flow | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
| `tp-emoji-picker` | Emoji picker | passed | pending | pending | passed | Support detection runs before rendering (`willUpdate`), and `VirtualList` requests its measured range after the host's update completes: no Lit change-in-update warning on mount | smoke 200/200 bindings mount in React and Vue without warnings (2026-10-31); emoji picker fixture `assertDefaults`…`assertFormsAndStates` pass; Select fixture unchanged (4 failures also on HEAD) |
| `tp-text-editor` | Text editor | passed | pending | pending | passed |  | smoke 200/200 bindings mount in React and Vue (2026-10-31); `npm run typecheck`, `npm test`, `npm run test:package` |
