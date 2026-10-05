# Horizontal binary Field alignment

- Requested work / claim: Bounded shared Field layout repair for the supplied Switch form screenshot.
- Scope source: User reports displaced Security emails label, switch and description; prior instruction requires component fixes rather than demo overrides.
- Baseline: clean ff95e1d6f126531f7690a9e52f8666b52ee7de3d.
- Live authority: fresh direct MCP Foundation and Library ASTs, project prj_c5a403a0-d1d5-4487-ac78-f4e545f46483, head 8440bff24a97dbbc5c762ebf4bd6baa958b305e1, state 7f630d0535e6051c1dbf0238f127f1384b4e091e8aadef8f4df158c69005abdb. Read ucl17-field, ucl16-switch and sec-143-field; shared structure/presentation rules read earlier in this session still govern.
- Local reference: clean shadcn 63c1308d112b6b1205d86244a156cca1abef5087; bases/base/ui/field.tsx, styles/style-nova.css 620–660, examples/base/field-switch.tsx, new-york-v4/examples/form-rhf-switch.tsx. Switch extends existing Checkbox locally; no Boolean or form behavior changes required.
- Reproduction: Chrome MCP page42 Form Docs, existing localhost:6006 server. Label y353.54, switch y342.34, description y367.99. Field centers label against entire control-plus-description column.
- Design: existing Field detects its registered binary control, uses an internal choice class, and arranges label/title/description/error in one logical column beside the control for horizontal layouts and wide responsive layouts. Vertical and nonbinary layouts remain unchanged. Existing content wrapper is layout-transparent in this arrangement; canonical part identity and relationships remain intact. No public API, tokens, rendering delegates or component substitutes added.
- Evidence: local checklist and MCP screenshots inspected in conversation. Existing full Field/Switch conformance records are outside this bounded repair.

## Capability and interface mapping

| ID | Requirement | Authority | Source | Local owner | Docs | Scenarios | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Binary horizontal field groups label/supporting text beside compact control | ucl17-field | FieldContent and form-rhf-switch | TpField structural layout | docs/field.md | V-01 | pending | Before screenshot reproduced |
| C-02 | Vertical, responsive, RTL, optional text and control replacement | ucl17-field | Field orientation and container variants | Existing Field registration and container rules | docs/field.md | V-02 | pending | No new public state |
| C-03 | Names, descriptions, label activation, keyboard, form reset/save and shared consumers | sec-143-field; ucl16-switch | Existing Label and Switch/Checkbox ownership | No behavior changes | Existing Form examples unchanged | V-03 | pending | Real browser input planned |

## Family dependency map

| Responsibility | Source edge | Existing owner | Decision | Consumers |
| --- | --- | --- | --- | --- |
| Binary control and form state | TpSwitch extends TpCheckbox; upstream Field composes Switch | TpCheckbox, TpSwitch | Reuse unchanged; detect registered control in Field | Horizontal Switch/Checkbox/native checkbox; V-02 V-03 |
| Naming, description and layout | Field imports Label and Separator | TpField, TpLabel | Repair only Field arrangement, preserve slots and associations | Field and Form Docs; V-01 V-03 |

## Presentation source map

| Region | Registry/preset | Source | Existing owner | Adaptation | Scenarios |
| --- | --- | --- | --- | --- | --- |
| Label and supporting text | base/Nova plus RHF Switch composition | FieldContent flex-col beside Switch; field gap-2 | Field .field/.content | Grid aligns compact control with first text row; inherited theme gap; no fixed pixels | V-01 V-02 |
| Switch/Checkbox | Existing shared recipes | Switch/Checkbox components | TpSwitch/TpCheckbox | No local appearance replacement | V-03 |

## Implementation and composition reuse map

| Composition | Role | Owner | Verification | Native exception |
| --- | --- | --- | --- | --- |
| Security emails Form | label, description, binary control, actions | Field, Label, Switch, Form, Button | V-01 V-03 | Text and structural wrappers only |
| Regression fixtures | binary and text fields | Same public components | V-02 | Native checkbox is supported interoperability |

## Verification scenarios

| ID | Capabilities | Setup | Expected | Actual | Tool | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 | Existing Form Switch example | Label and description together, switch aligned beside first row | not run | Chrome MCP geometry/screenshot | pending | Before reproduced |
| V-02 | C-02 | Vertical/horizontal/responsive, RTL, narrow, long copy, optional description/error, replacement, Checkbox and Input | Correct arrangement and retained control identity | not run | Chrome MCP API/geometry/screenshots | pending | No demo CSS repair |
| V-03 | C-03 | Label click, Space, Save/Reset, AX/axe, static checks | Original binary state and form behavior retained | not run | Chrome MCP real input and focused checks | pending | No full AT claim |

## Early integration checkpoint

| ID | Check | Status | Evidence |
| --- | --- | --- | --- |
| I-01 | Shared ownership | passed | Only Field structure and Field documentation changed; no Switch or demo behavior replaced |
| I-02 | Sourced visual arrangement | passed | Chrome screenshot: label/description share x343; Switch at logical end, center exactly aligned with 21px label row; supplied broken grouping removed |
| I-03 | Independent options | passed | Removing description reduces row to21px; vertical returns flex/content flex; original Switch identity retained through both changes |

## Gate record

| Gate | Status | Evidence |
| --- | --- | --- |
| 0. Sources | passed | Fresh direct contracts, clean baseline, local source and screenshot reproduced |
| 1. Capabilities | passed | Three bounded capabilities mapped |
| 2. Architecture | passed | Existing Field layout owns fix; Switch and Checkbox behavior retained |
| 3. Behavior | pending | V-03 |
| 4. Presentation | pending | V-01 V-02 |
| 5. Accessibility | pending | V-03 |
| 6. Visual | pending | V-01 V-02 |
| 7. Documentation | pending | Explain binary horizontal arrangement without demo changes |
| 8. Regression | pending | Focused static and shared-consumer checks |
