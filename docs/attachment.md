# Attachment

`tp-attachment` presents a named file or resource. The application owns upload,
processing, retry, preview, download and removal. Changing `status` changes only
presentation. `tp-attachment-group` arranges attachments in a native, horizontally
scrollable group with snap alignment.

All surfaces, density, media, spacing and radii use the library theme. Actions are
real Button controls. Busy states use Spinner. A trigger is a sibling of the
independent actions; activating Remove or Download cannot bubble into the trigger.

## Properties

| Property / attribute | Type | Default | Meaning |
| --- | --- | --- | --- |
| `filename` | string | `''` | Resource title and generated action names. Supply a meaningful name. |
| `description` | string | `''` | Type, size, status or other detail. |
| `fileSize` / `file-size` | number | `0` | Optional byte count; formatted when no description is supplied. |
| `status` | `idle`, `uploading`, `processing`, `error`, `complete` | `idle` | Application-owned status. Idle has a dashed border; busy states show Spinner; error exposes explanatory text. |
| `errorMessage` / `error-message` | string | `''` | Error/recovery explanation. Falls back to description, then “This attachment could not be processed.” |
| `size` | `xs`, `sm`, `default` | `default` | Theme-proportional density. |
| `orientation` | `horizontal`, `vertical` | `horizontal` | File row or image card arrangement. |
| `mediaTreatment` / `media-treatment` | `mark`, `image` | `mark` | File mark or image presentation. Media remains optional. |
| `href`, `target` | string | `''` | Optional generated native link through Button. An authored trigger takes precedence. |
| `removable` | boolean | `false` | Adds the standard Remove Button. |
| `disabled` | boolean | `false` | Disables generated link/remove controls. Author-supplied controls retain their own disabled policy. |

## Composition

| Slot | Role |
| --- | --- |
| `media` | Icon or image; omitted without content. Busy states temporarily show Spinner in this region. |
| `preview` | Compatibility alias for media when no `media` node is supplied. |
| `title` | Resource title; falls back to `filename`. Keep `filename` for generated action names. |
| `description` | Description/status content; must explain failure or recovery for error status. |
| default | Additional ordinary resource content. |
| `actions` | Independent public Buttons; configure variants and names on each Button. |
| `trigger` | Optional public Button (including Button `href` for links). Can be registered with Dialog via its public trigger API. |

`tp-attachment-group` accepts attachments in its default slot and an optional
`aria-label`. The group is keyboard focusable for native scrolling; child links and
actions retain ordinary Tab order. It does not own selection or upload state.

## Events and customization

The generated Remove Button emits cancelable, bubbling, composed `tp-remove` with
`{ filename, sourceEvent }`. No attachment is removed automatically. Handle the
event in application code after respecting cancellation. Authored actions retain
Button events and native link behavior. No additional imperative methods exist.

Canonical parts: `attachment` (group), `attachment-root`, `attachment-media`,
`attachment-content`, `attachment-title`, `attachment-description`,
`attachment-actions`, `attachment-action`, `attachment-trigger`. `partContracts`
supports generated anatomy; `partPresentation` and the shared theme/dictionary
support appearance. Button trigger/action contributions retain their actual Button
internals, variants, focus and semantics. Root markers include `data-status` and
`data-trigger`; host `status`, `size`, `orientation`, `media-treatment` reflect the
presentation policy. Media exposes `data-treatment`.

For preview dialogs use the existing Dialog, register the Attachment's authored
trigger with `dialog.registerTrigger(trigger)`, and release that registration when
the composition is removed. Do not attach an open handler to the whole attachment:
that would conflate its independent actions.

## Usage examples

The rendered Docs demonstrate files, content-only resources, file states, images, image states, density, scrollable groups, and preview triggers. Examples compose existing public controls and are not extra catalog variants.
