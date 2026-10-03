# Menu, Context Menu, Menubar, Navigation Menu and Popover design

Design record, 2026-10-03. This is an implementation plan, not browser evidence.
The five component checklists retain their own capability and scenario IDs.

## Authority and inspected sources

Fresh registered direct Spec Blocks reads: project
`prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`, version 0.3.15,
head `8440bff24a97dbbc5c762ebf4bd6baa958b305e1`, dirty candidate
`977b7c33a0c68c123c8b390971a7666a8643e0835d2a63f885c485b1832670e8`,
state version `07b68b0c8a1512b44d72d2a300784ea7b1b19e0b8e59e3d850c29eb5237885d3`.
Foundation document `doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1` and Library
document `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3` were read directly along
with managed vocabulary. Owning sections: Foundation 16.1, 16.5, 17.1–17.5;
Library `ucl19-popover`, `ucl20-menu`, `ucl20-context-menu`, `ucl20-menubar`,
`ucl20-navigation-menu`. Dependencies include Foundation 4–11 and 19,
Library `cl-sec-13-evidence-and-conflict-policy`, `sec-cl-82-component-kinds`,
`sec-cl-7-structural-layer-merge`, `sec-cl-152-anchored-motion`, and the closed
`sec-cl-158-motion-roles` inventory.

Local references are clean at the inspected revisions:

- Base UI `5b495488d182c81a8a14a440d7a376517118f8ec`.
- shadcn `63c1308d112b6b1205d86244a156cca1abef5087`.
- Floating UI `27629b74ba36ab8ceb2a968051927b9b69511a3b`.

Relative reference aliases used in the capability records:

- `Base/` = `../specification/external/base-ui/packages/react/src/`.
- `BaseUtils/` = `../specification/external/base-ui/packages/utils/src/`.
- `Registry/` = `../specification/external/ui/apps/v4/registry/`.
- `Nova` = `Registry/styles/style-nova.css`.
- `Floating/` = `../specification/external/floating-ui/packages/`.

The source investigation followed index.parts exports, Context Menu's actual
Menu reexports and Root wrapper, Menu SubmenuRoot's MenuRoot wrapper, Menubar's
CompositeRoot/FloatingTree, the shared useMenuItem/useMenuItemCommonProps owner,
and Popover's shared popup store/viewport/focus ownership. Navigation Menu uses
its own value/content/viewport owner; it is not a command Menu. Local grouped
`src/components/menu.ts` was inspected, including existing independent Navigation
Menu and Context Menu policy. `anchored-surface.ts`, SurfaceState, SurfaceHandle,
PresenceController, FloatingDismissController, CollectionRegistry, Typeahead,
safeCorridor, OutsideInert, existing SelectPortal and shared presentation owners
were inspected before choosing repairs.

## Actual shared ownership and module boundaries

`TpAnchoredSurface` remains the owner of Root open state, trigger association,
SurfaceHandle attachment, positioner/popup lifecycle, Presence, dismissal,
positioning, arrow, portal rendering and surface focus/modality. Existing
Popover, Preview Card and Tooltip and the new Menu implementation consume this
owner. It gains protected policy hooks for popup role/properties/content,
trigger relationships/input, accepted request metadata, final focus, completed
close, motion role, and optional parent coordination. These hooks do not create
a second open state owner.

The proposed shared HoverSurface controller owns delayed pointer intent, safe
corridor cleanup and DelayGroup participation. Existing TpHoverSurface delegates
its timers/corridor to it; Tooltip and Preview keep their focus-open policy.
Popover enables hover only when requested and press can pin a hover opening.
Menu/Submenu use their 100/0 delays; Navigation Menu uses its 50/50 delays.
Focus opening is policy, not automatically inherited from Tooltip.

Root extracted SelectPortal to the common foundation/owned-portal.ts OwnedPortal consumed by Select,
Combobox and these surfaces. The shared owner must support real projected nodes:
record placeholders, move the actual nodes into portal content, preserve logical
registration and original node/reference identity, and restore on target changes
or teardown. The accepted interface is update(container, template, {projectedNodes}),
ownedChildren, projectedNodes and logicalPortalOwner(node); the common
ComposedEnvironmentObserver observes inherited environment without duplicated
component observers. A slot rendered in a foreign portal shadow root cannot project the
original component's children. Cloning/serialization is not a substitute.
Dictionary/style ownership and inherited token reset cross the portal via the
actual shared owner. Deferred targets stay absent until valid; foreign owner
documents trigger the existing document-local structural style lifecycle.

`src/components/menu/` owns MenuRoot binding, item registration/behavior,
checkbox/radio state binding, submenu policy, structural CSS and public types.
`TpMenu` extends the anchored family; nested `tp-menu` is the SubmenuRoot binding.
`context-menu/` is a thin Menu policy binding for target/context gestures and
virtual anchor lifecycle. `menubar/` owns sibling registration, roving focus and
one active-identifier state. `navigation-menu/` owns native navigation, item
registration, content transitions/measurement and value state, consuming shared
portal/geometry/hover/presence rather than Menu command semantics. `popover/`
binds interactive popup policy, optional regions and its complete public API.

Supported grouped exports stay compatible via reexports. Root coordinates
`components/index.ts`, `register.ts`, `elements.ts`, `navigation.ts`, `overlays.ts`,
catalog definitions, recipe wiring, generated-story exclusions and story tests.
Unrelated grouped implementations remain untouched.

## Constituent bindings and native interoperability

Parent approved these constituent exports, with no new catalog identity:

- `TpMenuItem` / `tp-menu-item`: command or native-link composition, label,
  disabled, nativeAction, closeOnClick and item appearance.
- `TpMenuCheckboxItem` / `tp-menu-checkbox-item`: independent controlled/default
  checked command, indicator keepMounted and shared item behavior.
- `TpMenuRadioGroup` / `tp-menu-radio-group`: one controlled/default value owner,
  disabled inheritance and accessible group naming.
- `TpMenuRadioItem` / `tp-menu-radio-item`: required value, shared menu item
  behavior, non-clearable selected command and indicator.
- Nested `tp-menu`: same MenuRoot owner, SubTrigger slot, no copied submenu stack.
- `TpNavigationMenuItem` / `tp-navigation-menu-item`: optional stable generated
  identifier, Trigger/Content slots, Content keepMounted and item registration.

Context Menu and Menubar consume the actual Menu classes. Native authored
`role=menuitem*`, anchor, group, label, separator and shortcut adapters preserve
the existing API and share the same item behavior owner; they are deliberately
native semantic interoperability, not styled Button/Checkbox substitutes.
Native command checkbox/radio semantics are not form Checkbox/RadioGroup:
upstream uses useMenuItem with menu roles, and there is no form submission lane.
Only independently composed form controls inside Popover use TpInput/TpField etc.
Native anchors preserve href, target, modifiers and platform navigation.

Legacy Menu `value` remains a compatibility binding where previously supported;
it is not a second command-selection owner. Menubar uses a registered menu/trigger
identifier and preserves existing child-value identification as a compatibility
alias. New documentation uses explicit stable identifiers.

## Menubar transaction

The bar's `ControllableState<string | null>` is the sole active-menu owner.
Child open getters derive from the same scalar. An A→B proposal stages old-child
close and new-child open events plus the bar value proposal; any cancellation
prevents the single commit. No old-child false/new-child true writes occur before
commit. All state getters publish the final value before passive child state,
presence and subscriber callbacks run. Independently controlled child open is
diagnosed and rejected for this lane. Unknown/removed identifiers display no
active popup and repair only roving focus, never silently open another menu.

Use the existing SurfaceState for child retention and association. A narrow
coordinated commit seam can consume the already accepted staged event and
association callback; it does not dispatch another proposal or create another
owner. Normal standalone SurfaceState request behavior stays unchanged. Tests
must cover callback publication followed by DOM veto, controlled rejection,
reentrant requests, retained exits, association/payload coherence and focus.

## Complete public Library part inventory

Every listed name receives its own ComponentPartContract binding and actual
presentation target. Parent contributions compose before terminal constituent
hooks; host replacement cleans old registration and preserves current refs.
Hidden Foundation parts still support the common part contract but do not add
Library presentation identities. Repeated parts are not collapsed to the
Library table's generic singleton wording; the owning Foundation cardinality
governs behavior under the explicit conflict policy.

| Component | Closed Library inventory | Hidden Foundation capabilities / binding |
| --- | --- | --- |
| Menu | menu; menu-trigger; menu-content; menu-item; menu-checkbox-item; menu-radio-group; menu-radio-item; menu-group; menu-label; menu-sub-trigger; menu-sub-content; menu-separator; menu-shortcut | portal, positioner, arrow, backdrop, viewport, item-indicator, item-text, link semantics; Root properties and hidden partContracts |
| Context Menu | context-menu; context-menu-target; context-menu-content; context-menu-item; context-menu-checkbox-item; context-menu-radio-item; context-menu-radio-group; context-menu-group; context-menu-label; context-menu-sub-trigger; context-menu-sub-content; context-menu-separator; context-menu-shortcut | actual Menu hidden constituents with Context target policy; no detached-trigger handle |
| Menubar | menubar; menubar-menu; menubar-trigger; menubar-content; menubar-item; menubar-group; menubar-sub-trigger; menubar-sub-content; menubar-separator; menubar-shortcut | participating Menu check/radio/label/indicators remain Menu constituents and receive its actual recipe; no invented menubar-checkbox catalog part |
| Navigation Menu | navigation-menu; navigation-menu-list; navigation-menu-item; navigation-menu-trigger; navigation-menu-content; navigation-menu-link; navigation-menu-indicator; navigation-menu-viewport; navigation-menu-positioner | portal, popup, arrow, backdrop and per-trigger Icon; content mapped to Library Content; shared geometry surfaced |
| Popover | popover; popover-trigger; popover-anchor; popover-content; popover-header; popover-title; popover-description; popover-positioner; popover-portal | arrow, backdrop, close, viewport; optional slots/configuration and hidden partContracts |

Menu and Context item axes are ghost/destructive, default ghost. Menubar has no
visual variant axis. Navigation Menu has orientation horizontal/vertical on all
nine parts; geometry-only contributions are explicit empty arrays, not concealed
missing dictionary entries. Popover has no size/variant axis. Native layout does
not introduce component variants.

## Presentation trace and adaptation

Base registry is `Registry/bases/base/ui/`, preset Nova. The new-york-v4 registry
was checked for distinct APIs; Navigation Menu's optional viewport is retained
as a configuration, without adopting its different palette/radii.

| Region | Exact source | Actual recipe decision |
| --- | --- | --- |
| Menu/Context/Menubar surface | dropdown-menu.tsx, context-menu.tsx, menubar.tsx; Nova .cn-dropdown-menu-content/.cn-context-menu-content/.cn-menubar-content and .cn-menu-translucent (around lines 414–458, 537–581, 798–850, 1450) | Extract one command surface recipe: popover pair, radius-lg, spacing-1 inset, shadow-md, foreground 10% ring, 70% popover transparency/backdrop blur and saturation. Keep Menu/Context/Menubar sourced min widths and public logical geometry separately. |
| Command items and submenu trigger | same source .cn-*-item/.cn-*-checkbox-item/.cn-*-radio-item/.cn-*-sub-trigger | Actual shared item recipe: small type, medium radius, 1.5-unit inline/1-unit block padding, 1.5-unit gap, disabled opacity, highlighted foreground 10%. Canonical destructive variant uses source destructive text/background adaptation and terminal translucent selector mapping; no legacy Button destructive fill. |
| Indicators and icons | Base Menu.CheckboxItemIndicator/RadioItemIndicator; source IconPlaceholder imports | Use existing TpIcon/checkIcon/chevron icons, CSS length var(--tp-icon-size-sm), own Presence. Dropdown/Context indicator inline-end; Menubar source inline-start. Do not reuse form Checkbox boxes. |
| Group labels/separators/shortcuts | Nova .cn-*-label/.cn-*-separator/.cn-*-shortcut | Shared command recipe with source muted xs labels except Menubar sm medium; source border separator and muted tracking-wide shortcut. Separators use native required orientation/role; text is ordinary native content. |
| Menubar root/trigger | Nova .cn-menubar/.cn-menubar-trigger | Shared control-height-sm root, border, radius-lg, 0.75 spacing-unit inset and 0.5 gap; trigger muted hover/open and source small medium type. Reuse actual Menu triggers and public Button actions where authored. |
| Navigation root/list/item | navigation-menu.tsx; Nova .cn-navigation-menu/.cn-navigation-menu-list | Ordinary native navigation/list flow and orientation, max-content/layout in structural layer. No command role/roving Tab trap. |
| Navigation trigger/link/indicator | Nova .cn-navigation-menu-trigger/.cn-navigation-menu-trigger-icon/.cn-navigation-menu-link/.cn-navigation-menu-indicator | Shared trigger appearance/height roles; source muted hover/current, sm type, source 12px role via icon token/scaling. Native real anchors, optional Icon/Indicator contract; no command inheritance. |
| Navigation content/viewport/positioner | base NavigationMenuPositioner composes Popup/Viewport; Nova .cn-navigation-menu-content/.cn-navigation-menu-positioner/.cn-navigation-menu-popup | Popup pair/ring/radius/shadow and measured transition dimensions; retain previous content inert during directional transition; native clip wrapper contains content, arrow outside clip. showViewport=false preserves direct-content composition from new-york-v4. |
| Popover Content/Header/Title/Description | popover.tsx; Nova lines 925–945 .cn-popover-content/.cn-popover-header/.cn-popover-title/.cn-popover-description | Actual shared anchored motion recipe plus source popover pair, small type, spacing-2.5 padding/gap, radius-lg, shadow-md, foreground10% ring; Header gap0.5, Title medium, Description muted. |
| Popover Anchor/Trigger/Close | Base Popover Trigger/Close plus common Button semantics | Anchor is invisible geometry. Authored trigger/close uses actual TpButton; no synthesized mandatory corner close, but independently supplied Close slot/contract works. |

Foundation shared positioner defaults win over registry convenience offsets:
side bottom (logical block-end where Library specifies), align center, offsets 0,
collision flip/flip, padding5, absolute strategy, tracking enabled. Context root
uses its live point anchor default; submenus map logical inline-end with the
same shared geometry API. Source CSS physical item inset is expressed logically.

Library anchored-motion defaults govern over Nova cn-menu-translucent's
animate-none. Reuse/extract the actual anchored appearance recipe rather than
copying private transitions. The closed Library motion-role inventory declares
`surface` for Popover/Preview/Tooltip only. Menu, Context Menu, Menubar and
Navigation Menu use Presence/CSS lifecycle and publish no invented role.

## Dispositions and regressions

- Popover's Library purpose/fixed-property prose conflicts with Foundation
  optional modality/hover. Foundation precedence governs implementation. Root's
  `../popover/specification-correction.md` is a separate user-pending proposal;
  no specification mutation is authorized here.
- Foundation modal is Boolean for Popover. Upstream `trap-focus` is not added as
  an undocumented third value. Generic FocusPolicy supports required behavior.
- Menu disabled navigation follows Foundation skip-disabled even though some
  upstream useButton tests allow focusable disabled items.
- Navigation Library Indicator maps to the actual optional Base Icon/shadcn
  Indicator constituent. Do not invent a new active-link state owner or Radix
  command-menu behavior.
- Context long press is 500ms; cancellation threshold is strictly greater than
  ten host units on either axis. Touch virtual rectangle is 10×10 centered per
  Foundation even where upstream implementation's point arithmetic differs.
- Existing Select, Dialog/AlertDialog, Tooltip/Preview, Popover and Menu consumers
  require targeted source and built regressions after shared owner changes.
- No form-associated selection/validation API is added to command Menu or
  navigation. Existing form controls composed in Popover must still submit/reset
  normally and preserve Field naming/focus.

Parent approved this completed design and all shared seams on 2026-10-03.
The approved PresenceController repair uses the actual owner window for frame,
timer and computed style resources, preserving cancellation/completion semantics.
Dialog/AlertDialog, Select, Tooltip and Preview are required regressions.

## Integration order

1. Finish all five complete mapping records and pass implement-stage checker.
2. Repair shared anchored/hover/portal boundaries and concrete consumers; add
   meaningful state/transaction/cleanup tests.
3. Implement Menu constituents and Context/Menubar bindings. Implement independent
   Navigation Menu transition owner and full Popover policy.
4. Integrate all public parts/recipes and one representative source fixture each.
5. Root checks actual diff reuse plus sourced early visual/options I-01/I-02/I-03.
6. Only after verify-stage checker, execute complete source/built API matrices,
   real input, AX/axe, themes/motion/layout, Docs Controls and copied source.
7. Reconcile all five complete records with actual evidence. Earlier Select
   outstanding browser rows remain separate and are not cleared by this work.

### Navigation surface refinement approved 2026-10-03

Gate 2 was reopened for the Navigation binding and approved by the parent before implementation. Navigation Menu subclasses the actual `TpAnchoredSurface` through its common hover binding, with `openCoordinator` as a passive view of the sole Navigation `ControllableState<string>` value. It does not inherit `TpMenu`, command roles, roving Tab order, command selection, or a second proposal/state lane. SurfaceState only receives already-accepted coordinated visibility commits, preserving Presence/retention/completion through the existing owner. The Navigation Item owns its real authored content and an `OwnedPortal` projection into the shared current/previous `PopupViewportController` entries; no content cloning or alternate positioning stack. Popover and Menu also consume that viewport controller for payload switching. Native links retain normal navigation and Tab semantics. Parent approval explicitly confirmed this source/call-graph refinement.

## Source implementation refinements approved 2026-10-03

The final family binding keeps one actual PresentationController per custom
semantic owner. Dynamic `presentationTagName`, `presentationOwner` and optional
`presentationFamilyTagNames` provide the owning definition/axes plus Menubar
contributions only while registered in a bar. Menubar's complete target inventory
registers aliases through the existing Menu/Item/RadioGroup controller and
composes parent presentation before terminal child hooks. Native interoperability
stays a deliberate adapter. Nested Menu under Context resolves the Context
SubTrigger/SubContent parts through the same actual Root.

Base NavigationMenuTrigger renders its Icon inside the action host. The Item's
existing OwnedPortal projects its renderPart-owned Indicator into a real Button's
public icon-end slot or native Trigger, restoring original indicator nodes on
replacement/disconnection. Nova trigger icon size-3 is the small icon token times
0.75 (12px under the default theme); the existing Icon API remains a CSS length.
Navigation's shared surface relationship owner now writes expanded/controls
independently of optional hasPopup, and actual Content references the current
semantic Trigger. Normal native navigation semantics remain separate from Menu.

The shared Hover owner consumes SyntheticPress only for explicit nativeAction
false. Nested native/actual Button action paths retain their own press owner;
consumer component cancellation disarms Space before an orphan release. The
existing SurfaceState accepts an optional hasDefaultOpen predicate, with an
anchored explicit-supply accessor, to diagnose both controlled/default modes
without changing old consumers. Focused tests cover these actual boundaries.

Observed source fixes require a fresh early rendered checkpoint and affected
shared-consumer browser checks; source/type/unit checks alone do not satisfy it.
