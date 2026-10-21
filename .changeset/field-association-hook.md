---
'@tweakpad/ui': minor
---

Add the protected `applyFieldAssociation(attributes)` hook and the `FieldAssociationAttributes` type to `TpFormElement`. A form control whose labelled element it cannot write directly receives the Field label, `aria-describedby`, `aria-errormessage` and `aria-invalid` there after every update and applies them itself by returning `true`; its Field description and error text then exist in its shadow root even when `associationTarget()` returns `null`. Existing controls are unchanged.
