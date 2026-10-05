# Popup highlight verification — 2026-10-05

## Cause and shared repair

Chrome's actual pointer/keyboard input and frame sampling established two overlapping
paint owners. Button's hover selector had greater specificity than the registered
Navigation recipe. Ordinary focus independently kept or reapplied the Navigation
trigger background after its panel closed. Background transitions then retained
outgoing paint across sibling changes.

The shared variant predicate now has low specificity and treats popup-open as the
same active paint as hover. Registered compound recipes own their region. Menu,
Menubar and Navigation Menu reuse one immediate trigger-paint policy. Navigation
hover/open have one background; ordinary focus does not paint a closed trigger.
Keyboard focus retains its outline. Menu rows retain their existing tree-owned
highlight; Button hover no longer overrides it. Focus controllers, semantics,
public APIs, dimensions and popup/content transitions were not changed.

## Browser evidence

Google Chrome DevTools MCP page102, existing localhost6006 Storybook and
localhost5173/tests/fixtures/components/menu/; built fixture adds ?package.
1280x900, light and dark. Read-only requestAnimationFrame probes recorded computed
background, hover/focus/focus-visible, popup-open and highlighted state during real
MCP input. Inline raw traces remain in the task session; the observations below
are durable. No synthetic pointer/keyboard events were used.

- Navigation before: clicked Learn stayed painted after Tools opened because it
  retained ordinary focus. With keyboard focus inside Learn then pointer hover on
  Documentation, Learn closed but its background alpha ramped0.5 ->1 over200ms
  as focus returned. Hover also used Button's different mixed color.
- Navigation after: Learn -> Tools -> Documentation changes outgoing fill directly
  to transparent at the open-value handoff. Restored focused Learn stays
  transparent, with its keyboard outline. Active color is the Navigation muted
  role:39/39/42 dark; closed is transparent. No background transition remains.
  Nine frame-spaced public value changes on the built fixture also had zero
  trigger animations. Those rapid changes are API evidence, not fast-pointer input.
- Menu source/light and built/dark: open Document actions -> Share -> Email ->
  Copy in parent. Share becomes transparent and loses highlight when Email owns
  it; then its submenu closes and only Copy is highlighted. Copy activation
  closes the root and returns focus to the unhovered outline trigger at its
  resting background. Submenu and root Escape paths retain focus behavior.
- Menubar source/light and built/dark: click File -> hover Edit -> hover File.
  Open value and background change together with no outgoing fade. Escape
  restores the current trigger; moving the pointer away clears fill despite
  retained focus.
- Context invocation: click/focus target -> Shift+F10 -> hover Inspect -> Escape.
  The target receives focus while its unhovered background remains at rest.
- Navigation Panel: click Switch team -> hover Acme Corp. The trigger retains
  accent237/233/254 without transition as the pointer enters the menu. Selecting
  Acme Corp. closes the menu, restores trigger focus and clears background.
- Popover: open Document settings -> hover Done -> click Done. The trigger retains
  open paint while the pointer is inside the popup, then restores its normal
  background with focus after closing. Select: open Fruit -> Banana commits
  banana and closes normally.
- Standalone ghost hover still paints; disabled ghost remains transparent even
  under actual hover. A public navigation-menu-trigger styleHook to20/80/120
  overrides the compound while Tools stays active/expanded; resetting it restores
  the recipe. Ordinary outline/default controls retained their resting variants.

## Accessibility boundary

Actual accessibility trees exposed the expected button/menuitem/link/menu names,
expanded state and roles. Actual Escape/ArrowDown input verified focus restoration
and visible keyboard indication independently of background paint.

Settled closed built fixture: axe0violations, one incomplete aria-valid-attr-value
check across shadow references. The initial audit immediately after theme emulation
reported transient contrast findings; a settled rerun had none. Open modal fixture
still has an aria-required-children finding for tp-menu-radio-group[aria-label],
plus page-has-heading-one/region findings while modal isolation hides the fixture
landmark/heading. Radio-group semantics are unchanged by this presentation-only
diff; this separate issue remains recorded and is not claimed fixed. This is not
a full Menu family accessibility or platform-conformance certification.

## Checks and artifacts

- 517 tests in 72 files pass, including 23 focused presentation/hover tests.
- TypeScript noEmit, scoped ESLint, scoped stylelint and diff checks pass.
- Production build and Storybook build pass. Production retains the pre-existing
 motion.ts ineffective-dynamic-import warning.
- Logs are local under tmp/component-verification/popup-highlight/2026-10-05/:
 unit.log, full-unit.log, typecheck.log, lint.log, css.log, build.log, storybook.log.
- Existing Menu fixture browser-steps.md now records the repeatable input sequences.
- User staged implementation/docs during work; staging and unrelated files preserved.
