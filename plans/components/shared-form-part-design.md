# Component implementation and shared repairs

Live Foundation read at UI Library 0.3.14 / 8440bff24a97dbbc5c762ebf4bd6baa958b305e1 governs this work: sec-41 ComponentPartContract, sec-44 render delegation/behavior bundle, sec-52 controlled value, sec-91 FormControlContract, sec-92 validation, sec-72 disabled/read-only. Component-specific agents own capability checklists and reference mappings.

Root repairs existing TpFormElement: authored flags remain authored, Field/form disabled and validation are composed as effective state; Field association restores preexisting ARIA on replacement/clear; native input reference and external form ownership share one lifecycle owner. Existing controls use the same owner; text agent applies getters to forms.ts, root handles other affected consumers. Browser scenarios cover external owner, fieldsets, association clear/replacement, native refs and restore.

One shared renderPart/bindPart owner implements required render/property/class/style/content/ref customization for all new component constituents. TpElement exposes partContracts and renderPart. Delegate receives committed state, merged host properties, content and binding directive to apply the complete behavior bundle. Required semantic properties remain protected across property, attribute and boolean aliases, including ARIA element-reference channels. Consumer handlers run first and explicit preventComponentHandling is independent from native default prevention. References receive null on host replacement/disconnection. Existing partPresentation remains supported. All seven components consume this actual owner; source utility evidence: local Base UI internals/useRenderElement.tsx and merge-props/mergeProps.ts. Browser scenarios verify delegate semantic host, handlers/cancellation, live state resolvers, content, refs, neutral override, protected role, cleanup and rerender identity.

## Shared regression evidence

Chrome DevTools MCP source and built runs: `tmp/component-verification/shared-form-parts/2026-10-02/source-regressions.json` and `built-regressions.json`. Nine affected controls preserve authored disabled flags across native fieldset disable/enable, serialize no disabled controls, restore the eight named successful values on enable, and retain separately authored disablement. Controls: Native Select, Combobox, Select, Command Palette, Slider, Calendar, OTP, Switch and Toggle. This verifies the affected shared form boundary, not whole-component conformance for those peers.

PresentationController constructs sheets in each target document and recreates only finalized Lit structural styles on an actual document move. The selection V-08 regression awaits component and constituent updates, checks destination and returned painting, and checks foreign-document registered native-part rules.

The native semantic-host probe verifies default → delegated → default replacement refs remain current and null on unmount. Real pointer checks separately verified consumer-first handlers, native default prevention independent of component cancellation, unchanged host identity across state resolution, protected semantics, and reconnect cleanup. `part-reference.test.ts` preserves the observed Lit new-mount-before-old-disconnect ordering. Field's visible Error owns announcements; the semantic native control references a visually hidden mirror through both error and description relationships without a second live region. Effective control state overrides false inherited markers.

## Component records and integration checks

- [Toast](toast/implementation-checklist.md)
- [Toggle Group](toggle-group/implementation-checklist.md)
- [Toggle review](toggle/implementation-checklist.md)
- [Text Area](text-area/implementation-checklist.md)
- [Radio Group](radio-group/implementation-checklist.md)
- [Input](input/implementation-checklist.md)
- [Field](field/implementation-checklist.md)
- [Checkbox](checkbox/implementation-checklist.md)

Latest integrated run: `tmp/component-verification/shared-form-parts/2026-10-02/integrated-checks.json`, with complete unit/lint/package/Storybook/full-typecheck logs adjacent. 133 unit tests across 21 files pass; complete lint, full project typecheck, package build, Storybook build and staged/unstaged diff whitespace checks pass. Source and built selection suites pass24/24, and the text-control matrix passes110/110 on each. Final controlled Docs typing, selection and cancellation evidence is in `tmp/component-verification/shared-form-parts/2026-10-02/final-controlled-docs.json`; Toggle icon, group, focus and copied-source evidence is in `tmp/component-verification/selections/2026-10-02/toggle-final-evidence.json` and adjacent screenshots. Each component record distinguishes public API evaluation, real input, accessibility-tree/axe, visuals, documentation and built-package evidence. Browser evidence is local to this workspace. Required environment-blocked scenarios remain open in the owning record and do not become complete-component verification claims.
