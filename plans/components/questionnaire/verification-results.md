# Questionnaire verification — 2026-10-05

Scope: all14 shadcn base Questionnaire use cases, constituent/public API review and the required component repairs. Source ui63c1308d112b6b1205d86244a156cca1abef5087 (clean), library baseline722125ffed11bdcec0cb55b8f722f220f1a9b5dc. Live contracts/revision are in implementation-checklist.md.

## Changed behavior and composition

- Added existing-action configuration (label, Button variant/size, disabled/hidden), constituent callback state and bound regions for recomposition.
- Progress is a named progressbar. Native fieldsets remain named after Card title delegation.
- Keyed active fieldsets enable item entrance without replacing progress/actions or remounting on answer changes. Enter on actual buttons retains that button's action; unfilled answer Enter prevents unintended implicit submit.
- Freeform inputs share Choices spacing, including mixed answers. Shared layout owns Progress/action layout. Icon now receives its supported CSS size; selected checkmarks measure14px inside16px indicators, fixing300px overflowing SVGs. No demo-specific internal spacing patches.
- Storybook has default plus13 reference use cases, actual reference prompts/choices, and copyable markup/setup. Root and all constituent mappings, action APIs, regions, events, forms, keyboard behavior and constraints are documented.

## Executed evidence

Chrome MCP page102; existing localhost5173 Vite and6006 Storybook. Source fixture and `?package` use the respective source/built registrations. Screenshots/AX observations are inline in this session; logs and generated reference extraction are local only under `tmp/component-verification/questionnaire/2026-10-05/`.

The fixture's24 assertions passed in source and built package: ordered progress, mixed Choices layout, empty submission error/focus, checkmark bounds, prior-answer plus repeated FormData serialization, keyed item versus stable action identity, answer-edit identity, independent action configuration/visibility, constituent state, disabled omission, empty collection, controlled reject/accept, atomic reset veto, last optional skip-and-submit, skip recovery, saved reset, prevented native reset, dynamic removal and reconnect.

Trusted Chrome clicks/keys/fill additionally verified:

- Card radio→Enter advances/focuses the next question; Title/Description/Progress occupy actual Card slots.
- Native ArrowDown changes a radio selection; Enter confirms. Enter on focused Skip clears/advances; Enter on focused Previous returns to the skipped item.
- Freeform typing and Enter serialize the exact text. Multiple checkboxes submit repeated values; readOnly rejects a further native checkbox click.
- Shortcut Select switches Letters→Numbers; real2 selects the second answer and Enter submits it.
- Custom validation: Concise summary→Public audience→Validate returns to detail, focuses selected radio, announces error and marks invalid; Complete answer clears it and submits successfully.
- Resume starts at verification with saved selections/note. Editing then Enter on Reset changes restores values and checkpoint.
- Cloud changes total2→3 and Next visits environment. Returning to Local changes total3→2 and Next visits approval.
- Navigation-state Next/Submit disabled until active answer exists. Controlled Next updates the host checkpoint label to the accepted target.
- Dialog opens with a named modal and answer focus; Send answer and Cancel close; AX confirms focus returns to Open clarification.
- All13 additional examples successfully submitted their intended data through public methods (API evidence, not claimed as pointer input for every permutation).
- Animated item WAAPI uses inherited280ms duration; `motion-policy=reduce` creates0 animations. Progress/Actions identity and answer focus remain stable. Part references cancel old motion and defer style reads until connected.

Visual inspection: default dark, Card dark/light, Shortcuts dark, Resume light390px selected checkboxes, RTL narrow Card and animated layout; source-like bordered rows, indicator bounds, title/description, progress and action placement. At default theme390px document scrollWidth390 (no horizontal overflow). Spacing seed5px resolves Choices gap10px; note the existing global body minimum also scales to500px, so that density's viewport must respect the global minimum. Per-instance part hook changes choice border to dashed; dictionary replacement changes title font20px while preserving focus/answers. These are public hooks, not private CSS selectors in a demo.

Settled axe scans of all13 examples:0 violations in light and dark. The first light scan during a color-scheme transition was rerun after settling; it is not treated as a persistent contrast finding. Unique per-example form names resolve the initial landmark collision. One incomplete remains: Dialog trigger aria-controls target across a shadow boundary. Direct named-dialog/focus tests pass; no axe rules were suppressed. No screen-reader claim.

Storybook Docs inspection finds14 mounted Questionnaires, all13 additional titled examples, saved resume at2/3, conditional flow at1/2, real Card composition, full API sections and Show/Copy code. Generator already excludes this authored story.

## Commands

- `npm test`:72 files,517 tests pass (`unit.log`).
- `npx tsc -p tsconfig.json --noEmit`:pass (`typecheck.log`).
- Focused ESLint for Questionnaire/component/story/recipe files:pass (`lint.log`).
- Focused stylelint:pass (`css.log`).
- `npm run build`:pass (`build.log`); existing drag-drop motion static/dynamic import warning remains unrelated.
- `npm run build-storybook`:pass (`storybook.log`).
- `git diff --check`:pass.
- Gate checker implement and verify:pass. Complete intentionally blocked by the native checks below.

## Unverified platform boundaries

Registered Chrome MCP cannot drive real IME composition or OS forced-colors/reduced-motion. Explicit component reduce policy was exercised, not substituted for OS evidence. No Lit SSR/hydration harness is installed in the project; upstream SSR tests were read, but neither a source comparison nor client rendering is claimed as SSR execution. C-99/V-98/V-99 remain blocked, so this work does not certify complete platform conformance. These limitations do not remove any implemented use case or public capability from scope.

## Alignment correction after user review

Measured radio/checkbox16px indicators were top-aligned with21px label lines, yielding a2.5px center offset. Questionnaire structure now computes indicator margin from the current line-height and indicator extent, and centers actual KeyHint within one inherited line. Unsupported leading-snug token references were replaced with the existing leading-normal role. No demo offsets or generic Checkbox changes. Current radio, checkbox and shortcut center deltas are0px; wrapped63px labels with25px indicators retain first-line alignment. Two durable geometry assertions increase the fixture total to24, passing source and built. Light default and dark390px RTL Resume screenshots inspected, selected checkmarks stay contained. Settled Resume axe has0 violations and0 incomplete results.
