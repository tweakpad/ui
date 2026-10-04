# NumberField execution evidence — 2026-10-04

Authority and pinned local references are in the implementation checklist. This
record concerns NumberField and its changed shared owners, not full-library
completion. All browser evidence used registered Chrome DevTools MCP.

## Source and package

- Source fixture: `http://localhost:5173/tests/fixtures/components/number-field/`.
  Built fixture: same URL with `?package`. Chrome page69.
- Actual Field, InputGroup, Input, Buttons and Icons were inspected. Early fixture
  errors (missing Icon definitions and icon-start slots) were corrected before the
  visual checkpoint passed. No NumberField appearance recipe or spacing API.
- Root value and Field value were numeric3; FormData submitted quantity3. Native
  accessibility tree: spinbutton Quantity, Number field description, min0/max20,
  value3 and readable text3. Input retains the native node and ElementInternals.
- Real increment click: value4, one increment change/commit, input focus. ArrowUp5;
  Tab moved to After control, skipping registered step buttons.
- Disposing/rebinding group/actions preserved numeric state. Released Button native
  tabIndex returned0, then -1 under composition. These checks awaited Lit updates.

## Native editing and forms

- German locale: actual text entry1.234,5 produced number1234.5 and FormData
  quantity1234.5. Display retained localized text after blur. Minus-only text
  preserved the stored number, set badInput, and restored localized text on blur.
- The MCP fill/select-all shortcut did not replace existing text in this macOS
  session. Selection was set through Input's public `select()` API, then actual
  MCP typing/Backspace/Tab performed editing. No select-all keyboard pass claimed.
- Controlled setup must be chosen at construction. A fresh controlled instance2
  accepted3, rejected4 after synchronous owner publication, and committed only3.
  Changing disabled afterward retained3. This trial found and fixed unrelated
  option updates replaying canceled owner values; focused regression added.
- Home/End selected bounds; Alt+ArrowUp produced0.1 and Shift+ArrowUp10.1. Numeric
  step validity applied. Read-only blocked ArrowUp and typed7, retained10.1 in
  FormData, and omitted native numeric validity as required for read-only.
- Uncontrolled required default5: clearing yielded null/empty submitted string,
  Field value null, required validity and dirty/touched/invalid markers. Real Reset
  click restored5/valid. Native state-restore callback12 restored12.
- A real disabled fieldset disabled the native editor and omitted quantity from
  FormData; re-enabling restored12. Full controller disposal restored native text
  semantics, prior empty string state, and cleared owned root attributes.
- External form association submitted amount8; authored identifier and custom
  roleDescription reached native Input. Reference callback received input, then
  null on disposal. Disposal restored the original name and null form owner.

## Scrub and lifecycle

- Actual MCP drag from ScrubArea toward Increase changed3 to20, clamped, committed
  once with scrub reason and removed active marker/cursor/portal after release.
- During a built-package real drag, passive observation of actual pointer events
  found the cursor connected, root data-scrubbing true, and shared portal host in
  the top layer. Runtime coordinates and cursor dimensions were finite. This was
  observation of real input, not synthetic event dispatch.
- Vertical direction/sensitivity2, teleportDistance0: real downward drag changed50
  to29, committed once. Virtual cursor wrapped within area bounds. Retain option
  kept the cursor connected after release, with active marker removed.
- Removing ScrubArea during a real drag cleared capture state, marker and portal;
  commit count remained3. MCP reported the expected detached-node interruption.
  Later actual click succeeded; no active cursor/capture remained.
- Repeat policy, focused+hovered wheel gating, horizontal/pinch preservation,
  touch/pen intent, pointer cancellation and cleanup are implemented from the
  local sources. Native held-pointer/wheel/touch/pinch/pointercancel and IME/
  clipboard tools are unavailable, so their required evidence remains blocked.

## Appearance, accessibility and shared regressions

- Inspected dark LTR and light RTL screenshots: existing group surface, theme
  radius/padding, vertically centered step icons, no independent NumberField
  paint. Light mode used MCP colorScheme emulation, not merely inline color-scheme.
- Local axe analysis on built main region: zero violations in both inspected
  light and dark states. Native AX and real keyboard checks are separate from
  this automated result. No spoken screen-reader test claimed.
- Root spacing seed0.2→0.25rem changed input height36→45 and fixture theme gap
  12.8→16, retaining value3 and focus on the same native node.
- Input public part contract applied aria-description without losing state/focus.
  InputGroup public styleHook applied muted background/radius11.6; document
  dictionary replacement applied muted background and padding6.4. Value, focus and
  native input identity survived replacement/restoration. An initial test using
  unsupported `style` instead of `styleHook` was corrected, not counted as a pass.
- Actual standalone Input changed Notes→Notes! and submitted it; TextArea changed
  Line one→Line one plus, preserving string Field value and native FormData.
- Built Toolbar page67 reloaded: Tab then arrows crossed Save/Undo/disabledRedo
  into actual Input; typing yielded Notes! and native search FormData. Toolbar's
  existing shared hover contrast conflict remains separate and unresolved.
- Screenshot file writes were rejected by Chrome MCP's configured workspace
  roots. Screenshots were inspected inline; no screenshot files are claimed.

## Commands and boundaries

- Seven focused state/shared suites:65 tests passed. Final canceled-write fix:
 16 NumberField tests rerun and passed. No broad redundant suite run.
- TypeScript, focused ESLint, production build and Storybook build passed.
  Logs: `/tmp/tweakpad-number-field-{tests,state,types,lint,build,storybook}.log`.
- `git diff HEAD --check` passed. Existing task-owned staged and unstaged work was
  preserved; no commits or server replacement.
- OS forced colors/reduced motion, real assistive technology, and unsupported
  native inputs are not passed by screenshots, axe, or emulation of another mode.
- Source fixture and this record are durable. `/tmp` logs and inline browser
  output are local/session evidence, not artifacts available on another machine.
