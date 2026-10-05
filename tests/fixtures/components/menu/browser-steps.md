# Menu family browser handoff

## Popup highlight regression

Run on source and built fixtures through Chrome DevTools MCP. Sample computed
backgrounds, `:hover`, `:focus`, `:focus-visible`, `data-popup-open` and
`data-highlighted` with requestAnimationFrame while driving real input:

- Hover Learn, Tools, then Documentation. Repeat after clicking Learn and after
  ArrowDown moves focus into its panel. The old trigger clears when its open state
  clears; focus restoration must not repaint it or start a background transition.
  Hover and open use the same Navigation recipe color, without Button's variant
  hover color replacing it. Keyboard focus keeps a visible outline.
- Open Document actions, hover Share, Email, then Copy in the parent. The child
  closes and only Copy is highlighted; Share's primitive Button hover must not
  override the Menu recipe. Activate Copy; the trigger receives focus without a
  hover background when the pointer remains away. Repeat with Escape.
- Click File, hover Edit, then File. Open ownership and background transfer
  together. Escape restores File focus; moving the pointer away clears its fill.
- Focus Context target, use Shift+F10, hover Inspect, then Escape. The contextual
  target receives focus without a new hover fill when the pointer is elsewhere.
- Open Document settings, move to Done and activate it. The open trigger stays
  highlighted during the popup interaction and returns to its resting background
  after closing. Repeat in light/dark; inspect the existing scoped hook override.

Also check Navigation Panel's Switch team and ordinary/disabled Button variants;
compound precedence must not suppress standalone hover or enable disabled paint.

Use registered Chrome DevTools MCP only, on a task-owned page. Source is
`http://localhost:5173/tests/fixtures/components/menu/`; built adds `?package`.
Root owns builds/server lifecycle. Do not run the exhaustive suite before the
recorded early integration checkpoint. No scenario below has been executed by
the child agent merely because it is listed here.

## Early integration

1. Wait for `window.familyReady === true` with a bounded evaluation. Call
   `familyEarly.open('commands')`; inspect actual screenshot and AX tree. Compare
   the translucent command surface, small typography, padding, independent check/
   radio artwork, groups/separator/shortcut, disabled and destructive treatments
   to the exact Base/Nova source map in `plans/components/menu/family-design.md`.
   Open the actual Share submenu with real pointer/keys and inspect its shape,
   placement, name, sibling isolation and focus.
2. Call `familyEarly.closeAll()` and `familyEarly.options()`. Inspect Popover
   Header/Title/Description, actual Field/Input/Close Button, explicit portal,
   optional Arrow and Backdrop, independent end alignment and geometric offset.
   Change a part contract/reference without changing open/value; inspect current
   target identity and output. Check Arrow remains visible outside popup clipping.
3. Call `familyEarly.navigation('learn')`; inspect actual Button with its 12px
   Item-owned end icon, native link roles, Content name from Trigger, Viewport
   dimensions and source paint. Toggle showIndicator on that Item, showViewport
   on Root, and independent placement. Inspect Menubar's actual child controllers
   and all canonical projected parts. I01 is a source/diff ownership review,
   not established by a screenshot.
4. Resolve failures, update all affected I01/I02/I03 rows, and run five `--stage
verify` checkers. Only then set `window.familyVerificationAuthorized = true`.

## Bounded API matrix

`familyAPIManifest` lists each API case and V-ID mapping. Call
`runFamilyAPI(start, count)` in chunks of at most four, starting at 0, 4, 8, 12,
16, 20 and 24. Each case owns and finally removes its temporary controls; each wait
has a 2200ms bound. Capture every returned row and console/unhandled rejection
output. Repeat all cases on fresh built output after production stabilizes.
Methods such as Item.activate or Button.click here are **public API assertions**,
not evidence of real pointer/keyboard input.

## Required real input and independent AX/axe

- Menu: actual Tab to Document actions, Enter, arrows/Home/End, disabled skip,
  repeated-character typeahead, Space on Word wrap and radios, nested inline
  arrows, Escape one branch, Tab/Shift+Tab leaving the command tree. Repeat RTL
  and vertical/horizontal policy where relevant. Actual pointer highlights
  without selecting; clicking a check keeps open. Consumer cancellation must
  retain both state and focus. Test nativeAction=false delegated action with
  actual Enter/Space, nativeDefault prevented, explicit component veto, and an
  orphan keyup after canceled Space. Regress real Button/native anchor child
  activation once, including nested interactive content.
- Menubar: actual File then ArrowRight to Edit, Home/End and loopFocus=false;
  hover transfer only after deliberate opening. Install veto through public
  callbacks and repeat transfer; inspect scalar/derived state and focus. Test
  disabled member, removal and nested submenu Escape without cross-bar effects.
- Context: real context invocation on Context target, keyboard Shift+F10 and
  ContextMenu key where MCP supports it. Preserve native target role/name.
  Validate pointer anchoring and keyboard-only return focus. Real touch long
  press/movement/multitouch requires actual tool support; synthetic event policy
  tests cannot substitute for a required real-device interaction claim.
- Popover: actual Trigger click, focus/Tab through Input and Close Button,
  outside press/focus, Escape, nested portal branch, modal containment/inert
  cleanup, focus restoration and Close veto. Hover-enabled timing/safe corridor/
  pinning needs real pointer travel and sufficient foreground time.
- Navigation: real Trigger hover/press, transfer between Learn/Tools, native
  Tab/Shift+Tab into and out of links, optional arrows, Escape while focused in
  Content, modified/native link behavior and close-on-click false/true. Check
  Indicator is inside Button hit/focus region. Current/previous reversal,
  keepMounted and showViewport=false must retain authored nodes.
- Inspect AX trees separately for roles/names/expanded/controls/current/checked,
  labels, descriptions, inactive exclusion and disabled items. Run local axe
  through the MCP page, without blanket rule suppression. Do not claim screen
  reader testing from AX inspection.

## Remaining required supplementary assertions

V07: physical/logical placement matrix, virtual/ref/resolver anchors, collision
flip/shift/none, boundary/padding, resizing/scroll/tracking disabled/explicit
update, Arrow geometry/path/static offset/hidden edge, anchor removal, RTL and
writing modes. Offset callbacks must receive current measured rects and resolved
side after a flip. Placement is independent of activation/close behavior.

V08: normal/reduced/system motion, rapid reversal, current/previous Viewport
identity and dimensions after async resize. Popover's external surface driver
must cancel once and delay completion; Menu/Context/Bar/Navigation must not
invent motion roles. Retained close/unmount veto uses the actual state owner.

V11: same-origin foreign-document first-connect and adoption, awaited descendant
updateComplete, structural and recipe paint, current owner timers/observer/fonts,
console/rejection capture; detach/reattach and replacement of Trigger/native
link/part delegate with clean old refs. Dynamic menus, groups, disabled flags,
duplicate values and unknown controlled value all need observable assertions.

V12: every public part plus flattened hidden constituent contract, all generic
channels (delegate/hostProperties/classHook/styleHook/ref/content), parent hooks
before terminal child hooks, full alternate dictionary and missing-key
diagnostics, token override reset through portals, theme changes without state/
focus reset. Native layout never substitutes a reusable Button/Icon/Field.

V13: inspect desktop and 390x500 screenshots in light/dark/system and scoped
themes, RTL, long labels/content, every interaction state and independent region.
Check clipping/scrolling, popup layering, icon extents, focus/hover/disabled/
selected paint, contrast and source spacing. Store screenshots and conclusions.

## Docs and copy (V14)

Docs IDs: `components-menu--docs`, `components-menu--context`,
`components-menubar--docs`, `components-navigation-menu--docs`,
`components-popover--docs` on Storybook localhost:6006. One canonical Default per
component. All copied sources import Lit/register/styles and render current
scalar Controls with a synchronous owner callback.

For each: interact with actual default UI, edit every meaningful scalar Control,
inspect the resulting behavior, then Show code and execute the exact displayed
source in a standalone task-owned source/built page. Check both accepted and
canceled proposals leave component and Controls in the same committed state.
For non-primary Docs renderers do not assume updateArgs repaints; observe it.
Inspect constituent Checkbox/Radio state, submenu and actual native link roles
in the copied composition. Perform independent Docs AX/axe and narrow/RTL
screenshots. Keep fixture setup out of the public API table.

## Shared regressions (V15)

Parent owns final package/typecheck/lint/unit/Storybook/build checks and built
exports. Actual changed shared consumers include Tooltip/Preview hover/focus,
Dialog/AlertDialog SurfaceState, plain/searchable Select positioning/portal/branch/inert,
Button native and synthetic press, and Presence/foreign-document style ownership.
Existing focused unit results do not replace these source and built browser
regressions. Preserve the other agents' pages and the user-owned index state.

## Single active highlight regression

Run A28 (index 27) in source and package fixtures for focus, subtree removal and
reconnection. In the Menu Storybook default, click Document actions, hover Share,
Copy link, Invite people, Email invitation, then return to Copy link and Word wrap.
Observe each animation frame, including the submenu close delay: exactly one row
may carry active paint; expanded ancestors and checked values are independent.
Submenu triggers must have zero transition duration, matching ordinary rows.
Repeat with keyboard forward/backward/Escape and in both color schemes. Reload
Storybook after presentation edits so retained HMR dictionaries cannot mask them.

Parent dismissal: from Email invitation, hover Copy link; Invite people must close
while Share stays open and Copy link stays active. Reopen Invite people, then
hover Word wrap; Share and all descendants must close, leaving Word wrap active.
Use forward/backward arrows then Up on the restored submenu trigger: Up navigates
the parent list rather than reopening the child. Run A29 (index 28) in source and
package fixtures for arbitrary-depth branch closure and consumer cancellation.

Menubar hover regression: hover Edit while closed (must stay closed), click File,
then hover Edit, Help and File (exactly one popup, all sibling triggers reachable).
Repeat with a nested Share submenu open. Click outside; all menus close and idle
hover must no longer open them. Check a disabled sibling and canceled value-change
keep the active menu. A12 asserts modal sibling reachability and rejects queued
close requests from inactive members; run in source and package fixtures.

Navigation direct-link regression: hover Tools, then Editor (panel stays open),
then Documentation (panel closes without navigation). Repeat after clicking
Tools. Clicking Documentation still follows its native href. ArrowLeft from the
link then ArrowDown reopens Tools and focuses Editor. A30 separately checks event
policy for touch, disabled items, veto and native li/anchor composition; run source
and package fixtures. These synthetic policy checks do not replace real hover.
