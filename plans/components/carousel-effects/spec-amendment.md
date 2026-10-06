# Carousel effects: proposed spec amendment

**Status: not applied.** Drafted 2026-10-06 against Spec Blocks project
`prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`. Apply it through the Spec Blocks MCP once the
shared candidate is quiet: the player spec is in progress and other stalled entries are
pending. It reverses the recorded exclusion of carousel "effects" and "parallax" and
replaces it with a typed effect contract. Swiper `effect-*` modules remain excluded as
ports; the new contract is a reimplementation.

## UI Foundation Specification: Carousel (`sec-187-carousel`)

New subsection **Presentation and effects**. Each item below is one requirement.

- Transform-transport presentation **MUST** go through one presenter that owns the
  presented position. Reading the position and interrupting a transition **MUST** return
  the presented logical position, independent of how the track or items are painted.
- Without an effect, the presenter **MUST** translate the track and animate through the
  `track` motion role, exactly as before.
- With an effect, the presenter **MUST** animate the logical position frame by frame
  through the `transition` motion role (`state`/`change`, non-blocking, context
  `{effect, duration}`), and **MUST** deliver one effect frame per presented position:
  drag, animation frame and settle.
- An effect frame **MUST** contain:
  - phase, logical position, velocity (items per second) and movement direction;
  - the reduced-motion state;
  - every mounted item with its signed, loop-wrapped progress (0 aligned, positive
    upcoming);
  - the current/next pair and the amount between them.
- Effects **MUST** be pure functions of the frame. Drag **MUST** scrub them, interruption
  **MUST** freeze them, and reversal **MUST** play them backwards.
- A `stack` effect **MUST** keep every item at the viewport origin, present only the
  current/next pair, and constrain layout to one item per view and per movement, with a
  diagnostic when explicit options are overridden.
- A `track` effect **MUST** keep track translation and every layout option.
- Effects **MUST NOT** apply under the native scroll transport; a diagnostic reports the
  ignored effect.
- Under reduced motion, effects **MUST** settle on the destination without intermediate
  frames.
- Effects **MUST NOT** change item semantics, labels, inert handling, focus fallback or
  announcements. Effect surfaces **MUST** be hidden from assistive technology and
  **MUST NOT** receive pointer input.
- Detaching or replacing an effect **MUST** restore every style and attribute it changed
  and return to track translation at the current position.

## UI Foundation Specification: Environment services (`sec-123-environment-and-interaction-services`)

- A graphics service **MUST** share one WebGL2 context per document across consumers.
  Each consumer presents finished frames in its own canvas.
- The service **MUST** recover from context loss: dependent resources are invalidated,
  consumers fall back, and they rebuild after restoration.
- Media uploads **MUST** treat cross-origin failures per source, not as renderer failures.

## UI Component Library Specification: Carousel (`ucl21-carousel`)

- **Property row:**

  | Property | Values | Default | Meaning |
  | --- | --- | --- | --- |
  | `effect` | carousel effect object (property only) | none | Advanced presentation; none keeps the moving track. |

- **Part row:**

  | Part | Kind | Name | Exposure | Presence |
  | --- | --- | --- | --- | --- |
  | Effect surface | synthesized | `carousel-effect-surface` | synthesized | zero or one, in the Viewport while an effect is active |

- **Effect factories** are typed presentation objects, not installable modules: shader
  (WebGL2 over `data-carousel-media`, variants `wipe`/`displace`/`chromatic`),
  crossfade, layered, parallax and focus. Each accepts `duration` and `easing`.
- The shader effect **MUST** render only while transitioning, and **MUST** fall back to
  the crossfade presentation, with one diagnostic per reason, when WebGL2, a ready
  same-origin or CORS-enabled media source, or on-screen presence is missing.
- `data-carousel-layer` content **MUST** remain live DOM above effect surfaces.
- **Scope line:** remove "effects, parallax" from the excluded list, and add
  "Effects are typed presentation objects, not installable modules."

## Appendix: Carousel source adaptations

| ID | Evidence/risk | Required adaptation |
| --- | --- | --- |
| A-xx | Swiper effects set `virtualTranslate`, read per-slide `progress`, and rely on DOM transform reads. | A logical-position presenter and frame contract. Interruption reads the logical position, not computed transforms. |
| A-xx | Reference shader demos use one WebGL context per slider, fixed drawing buffers, stretched UVs and gamma-space blending. | A shared context, a DPR-capped pixel budget, cover-fit with focal point, and linear-light blending of sRGB textures. |
