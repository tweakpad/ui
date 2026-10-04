# Shared text shimmer contract proposal

Status: proposed; no live-spec mutation or dependent implementation yet.

Source: live Library `sec-cl-15-motion-surfaces` has a closed role inventory with no Attachment or Marker text animation. Direct search for shimmer returns no current contract. Head `8440bff24a97dbbc5c762ebf4bd6baa958b305e1`, state `5daad6324d67f008ae378650a86e7e961fc91a1025d6107c89be7002caecdfe1`.

Reference: `external/ui/packages/shadcn/src/tailwind.css:521–599` defines shared text shimmer. Base AttachmentTitle applies it while uploading/processing. Base Marker examples opt in on Content in three compositions; shimmer is not a Marker variant.

## Proposed normative additions

1. Add two entries to the Library motion-role inventory:

| Component | Role | Target | Kind / phases | Public context | Completion |
| --- | --- | --- | --- | --- | --- |
| Attachment | `shimmer` | Title | ambient: start, stop | none | non-blocking |
| Marker | `shimmer` | Content | ambient: start, stop | none | non-blocking |

2. Attachment's default Title presentation uses shared text shimmer only for application-supplied uploading and processing statuses. It stops when status changes. It must not create an upload state machine, replace title text, or change accessible names.

3. Marker remains static by default. Its Content may opt in through the shared `tp-shimmer` presentation class supplied through the existing Content `classHook`. This is a presentation hook, not a Marker variant or component-specific spacing/animation property. Removing the class stops that role. Existing part replacement and disconnect must cancel old playback.

4. Both use one text-shimmer recipe and one ambient motion binding built on existing `prepareMotion`, cancellation, inherited motion policy and driver replacement. A claim suppresses only that target's CSS animation. No changes to state, focus or content ownership.

5. Shared recipe uses existing text colors, spacing, direction and motion timing roles. No fixed pixel spread/duration, new component-specific tokens, local timers, or demo-local animation. Reduced motion renders readable static text; forced colors must retain readable system-color text. Ambient shimmer reverses along the inline direction for RTL.

## Implementation and verification after resolution

- Shared recipe and ambient binding; actual consumers Attachment Title and Marker Content. Retain current public part handles/delegates and current component owners.
- Document role inventory and the existing classHook opt-in. Restore the three source Marker shimmer compositions and busy Attachment default paint using that owner.
- Chrome: start/stop, target replacement/reconnect, claimed driver cancellation, explicit reduced policy, RTL, light/dark, token overrides and accessible text preservation. Existing OS-media tool limitations remain separately recorded.
- Update reference source-case status only after implementation/inspection; keep broader library goal active.
