# Progress

`tp-progress` reports task completion. It is noninteractive and has no form value. A finite value is clamped to the declared range; empty, `null`, NaN and infinite values are indeterminate. Every rendered part observes the same immutable status, numeric and formatting snapshot.

```ts
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
```

```html
<tp-progress value="56" label="Upload progress">
  <span slot="label">Upload progress</span>
</tp-progress>
```

The Label and Value output are optional. Supply a `label` slot or a Label content/delegate contract for a visible label. Supply an `output` slot or a Value content/delegate contract to render the value. To show the default formatted percentage in Lit:

```ts
html`<tp-progress
  .value=${56}
  label="Upload progress"
  .partContracts=${{
    'progress-value-output': { content: (state) => state.formattedValue },
  }}
  ><span slot="label">Upload progress</span></tp-progress
>`;
```

The canonical story renders this meaningful labeled example. Its `value` Control is an external update; Progress does not propose values through a callback.

| Property / attribute             | Type                                                  | Default                                       | Meaning                                                                                                                                                   |
| -------------------------------- | ----------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`                          | number or null                                        | null / indeterminate                          | Finite task completion. An empty or removed attribute is indeterminate.                                                                                   |
| `minimum`, `maximum`             | number                                                | 0, 100                                        | Range bounds. Attribute removal restores the corresponding default.                                                                                       |
| `min`, `max`                     | number                                                | aliases of bounds                             | Compatibility aliases; `max` preserves previous usage.                                                                                                    |
| `label`                          | string                                                | `Progress`                                    | Existing accessible-name fallback. Supply the operation's actual name, a Label, or a consumer association. It does not automatically add a visible Label. |
| `locale`                         | string or string[]; property only                     | nearest `lang`, owner document/runtime locale | Number formatting locale.                                                                                                                                 |
| `format`                         | Intl.NumberFormatOptions; property only               | normalized percentage                         | With options, formats the clamped scalar rather than its normalized fraction.                                                                             |
| `valueText` / `value-text`       | optional string                                       | formatted value                               | Explicit accessible text; takes precedence over the resolver.                                                                                             |
| `getAccessibleValueText`         | `(formattedValue, rawValue) => string`; property only | absent                                        | Receives clamped formatting and raw supplied number/null; indeterminate formatting is empty.                                                              |
| `partContracts`                  | record                                                | {}                                            | All five part rendering, properties, content, presentation and reference channels.                                                                        |
| `partPresentation`               | record                                                | {}                                            | Per-part presentation contributions.                                                                                                                      |
| `motionPolicy` / `motion-policy` | inherit, normal, reduce                               | inherit                                       | Shared motion policy; reduce stops ambient animation and makes finite motion instant.                                                                     |

The inherited `disabled`, `readOnly`, `invalid`, `required` and `orientation` properties come from `TpElement`. Progress remains noninteractive, does not serialize, and does not reject external value updates when disabled/read-only; disabled is the inherited visual state. Those properties do not introduce a new orientation axis or form contract.

| Read-only channel | Meaning                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `state`           | Frozen snapshot: raw `value`, `rawMinimum`, `rawMaximum`, effective `minimum`/`maximum`, `clampedValue`, `percentage`, `formattedValue`, `accessibleValueText`, `status`, status booleans and `invalidRange`. |
| `status`          | indeterminate, progressing or complete.                                                                                                                                                                       |
| `percentage`      | 0–100 for determinate progress; null for indeterminate.                                                                                                                                                       |
| `formattedValue`  | Current formatted value; empty when indeterminate.                                                                                                                                                            |

`minimum` must be finite and less than finite `maximum`, with a finite range span. A failing configuration reports a `tp-diagnostic` warning and deterministically publishes a safe 0–100 range with current value and geometry zero for a finite input. Raw bounds/value remain in the snapshot. A nonfinite/empty input remains indeterminate even during a range failure. Invalid locale/format settings report a diagnostic and fall back to runtime percentage formatting.

| Part                    | Native host and content              | Behavior                                                                                              |
| ----------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `progress`              | div; composed children               | progressbar role, current/min/max/text and name.                                                      |
| `progress-label`        | optional span; `label` slot/content  | Stable label identifier and accessible-name relationship; consumer host-property IDs take precedence. |
| `progress-value-output` | optional span; `output` slot/content | Default formatting is available to its content resolver; decorative duplicate text is aria-hidden.    |
| `progress-track`        | div; Indicator                       | Full range and containment; composed by default.                                                      |
| `progress-indicator`    | div                                  | Logical fill from the current percentage, or a distinct indeterminate presentation.                   |

Every part accepts `partContracts[part]`: `renderDelegate({state, properties, content, bind})`, `hostProperties`, `classHook` string/resolver, `styleHook` record/resolver, `elementReference` callback/object, and `content` static/resolver where meaningful. Delegates place `${bind}` on their semantic host. Required roles, ARIA and state remain protected; neutral class/styles/attributes merge. A reference receives the live host and null on replacement/unmount.

Track and Indicator can be omitted independently with a delegate returning Lit's `nothing`; omitting the Track also removes its contained Indicator. Optional Label/Value parts are enabled by a supplied slot or explicit content/delegate contract. No visibility booleans or additional custom-element identities are required. Root content replacement owns its composition; preserve the semantic host and an accessible operation name.

Use host `aria-label`/`aria-labelledby`, Label or Root contract naming properties for consumer naming. External label element references and dynamically mounted identifiers resolve in the owner scope. All five parts publish `data-indeterminate`, `data-progressing` or `data-complete` from the same snapshot. Numeric current value and percentage are omitted in indeterminate state; no numeric output is fabricated. No default live region announces rapid updates.

Theme with semantic tokens, dictionary replacement, `partPresentation`, `partContracts` and `::part(...)`. Mandatory containment and normalized fill geometry survive a full dictionary replacement. The sourced Nova track is muted, thin and rounded; the Indicator uses the primary color. Logical fill and value alignment follow RTL.

Motion uses shared `tp-motion-request` roles `value` (state/change) and `indeterminate` (ambient/start/stop), both nonblocking. A synchronous consumer driver may claim a request through `respondWith`; interruption, removal and disconnection cancel playback. Semantics update immediately. Reduced motion prevents ambient playback. Progress emits diagnostics for malformed configuration, not interactive value-change events.
