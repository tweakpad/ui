# Custom cursor: spec amendment

Status: draft generated from the session generator (`scratchpad/spec/cursor.py`); applied revisions are recorded in the implementation checklist.

## UI Foundation Specification (`doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1`)

### Insert `sec-1822-custom-cursor` into `sec-18-display-feedback-and-viewport-components` after `sec-1821-qr-code`

Review dependencies: `audit-sec-126-reduced-motion-policy`, `sec-64-motion-requests-and-drivers`, `sec-53-changeeventt-and-changereason`, `sec-146-numberfield`.

#### Custom cursor

Purpose and limits. Custom cursor replaces the host pointer with a decorative follower that trails the pointer with spring physics, and lets regions of a page, its Zones, declare a named cursor state together with content, appearance, attraction and physics for the time the pointer is inside them. It never owns input: hit testing, focus, activation and selection stay with the page, and the follower is presentation only. Only mouse-like pointers take part; touch and coarse pointers keep the host pointer. The scrub cursor of [NumberField](#sec-146-numberfield) is the precedent for a fixed, pointer-transparent surface in the top layer.  <!-- cc-purpose -->

- **REQ** Anatomy. Exactly one Root; exactly one Surface, a fixed, pointer-transparent box in the top layer positioned from the follower; exactly one Content inside the Surface; zero or more Zones anywhere in the document, each addressing one Root by identifier or every Root of its document. A Zone MUST be layout-neutral: wrapping content in a Zone MUST NOT change the content’s box, position or stacking.  <!-- cc-anatomy -->

<!-- cc-parts -->
| Part | Default semantic | Responsibility |
|---|---|---|
| Root | none | Owns pointer gating, the follower, the state, the Zone registry, the native lease and the published markers and custom properties. |
| Surface | presentation, hidden from assistive technology | The fixed top-layer box moved with the follower; never a hit target. |
| Content | none | Presents the resting content, the default mark or the active Zone’s content. |
| Zone | none | Declares the state, content, appearance, attraction, passthrough and physics of its subtree. |

<!-- cc-props -->
| Property | Domain | Default |
|---|---|---|
| stiffness / damping / mass | spring parameters within the ranges of the Widgets spring kind (1 to 1000, 0 to 100, 0.1 to 10) | 170 / 26 / 1 |
| restSpeed / restDelta | pixels per second; pixels | 1; 0.1 |
| scope | document, region | document |
| region | element identifier | the Root’s parent element |
| hideNative | Boolean | true |
| disabled | Boolean | false |
| motionPolicy | inherit, normal, reduce | inherit |
| Zone state | token | none |
| Zone for | Root identifier | every Root of the document |
| Zone native | Boolean | false |
| Zone stick | none, center, bounds | none |
| Zone stiffness / damping / mass | as the Root | the Root’s values |
| Zone disabled | Boolean | false |
| actions | Optional handle exposing setState and refresh | none |

- **REQ** Pointer gating. A Root MUST follow only while the host matches (hover: hover) and (pointer: fine) and the last pointer input is of type mouse or pen or carries no type. A touch pointer MUST never engage the Root, and a touch input while following MUST stop following until the next mouse-like move. Following MUST be published as the following state, and its changes MUST notify the Consumer with reason pointer for input-driven changes, disabled when the Root is disabled or enabled, and programmatic when a Consumer property change starts or stops following.  <!-- cc-gating -->

- **REQ** Tracking. The Root MUST read the pointer in client coordinates from pointer moves over its scope and expose the last pointer point; the published position is the follower’s, never the pointer’s. While the pointer is outside the scope, has left the document or the window has lost focus, the Root MUST publish the outside state, hide the Surface and release its native lease; the next mouse-like move inside the scope MUST clear it. With document scope the scope is the owner document; with region scope it is the region element: the element with the region identifier in the Root’s tree scope, then its document, otherwise the Root’s parent element.  <!-- cc-tracking -->

- **REQ** Follower. Each frame while unsettled, the follower MUST integrate a damped spring toward its target with the stiffness, damping and mass in effect, in frame-rate independent steps bounded so that a long pause cannot destabilize it, and MUST settle when its speed is below restSpeed and its distance to the target below restDelta, adopting the target exactly. The Root MUST publish the follower’s position in pixels, its velocity in pixels per second and the moving state while unsettled, and MUST NOT run a frame loop while every follower of the document is settled; followers of several Roots in one document MUST share one frame loop. A Zone’s physics override MUST take effect while that Zone is active and revert on exit without resetting position or velocity.  <!-- cc-follower -->

- **REQ** Reduced motion. Under reduce, as resolved by [Reduced-motion policy](#audit-sec-126-reduced-motion-policy), the Surface MUST remain visible and the follower MUST adopt its target each frame without lag; Zone transitions of size, content and attraction MUST be instant; velocity MUST publish zero and the moving state MUST NOT be published. The native lease is unaffected because the replacement cursor remains the user’s pointer feedback.  <!-- cc-reduced-motion -->

- **REQ** Native lease. While following with hideNative, the Root MUST hide the host pointer over its scope through one lease per owner document and scope element, counted by registration and released with its last holder, and the lease MUST reach library shadow parts that set their own pointer. The lease MUST be released while not following, outside, disabled, disconnected or after a touch input, and MUST NOT be acquired while hideNative is false. The host pointer MUST be hidden only while a visible replacement is drawn, except inside a native Zone.  <!-- cc-native-lease -->

- **REQ** Layer. The Surface MUST render as a manual popover in the top layer, positioned from the layout viewport origin with the inverse visual-viewport scale so that it keeps its size under pinch zoom, with pointer events disabled so that it is never a hit target and never blocks a Zone. When another surface enters the top layer later, the Root MUST re-enter the top layer above it before the next frame, so that dialogs, menus and popovers never cover the Surface. When the host cannot place the Surface in the top layer, the Root MUST fall back to a fixed box with the highest stacking order and report a diagnostic.  <!-- cc-layer -->

- **REQ** Zones. A Zone MUST register with the Roots it addresses on connection, re-resolve them when its identifier changes, and unregister on disconnection; a Zone whose identifier matches no Root MUST report a diagnostic once. A Zone MUST track the pointer with its own enter and leave boundary events and MUST publish the hovered state while the pointer is inside it. The Root MUST publish the active Zone’s state as the cursor-state marker and expose the active Zone.  <!-- cc-zones -->

- **REQ** Innermost resolution. When the pointer is inside several registered Zones, the innermost Zone in the composed tree MUST be active for each Root it addresses; a Zone that addresses another Root or is disabled MUST be ignored. After scrolling without pointer movement and on the refresh action, the Root MUST re-resolve the Zones under the last pointer point.  <!-- cc-innermost -->

- **REQ** Adoption. While a Zone is active the Root MUST adopt the Zone’s computed cursor size, color, blend, opacity and radius properties on the Surface, and MUST present the content of the Zone’s first template child, imported once per activation, in place of the resting content; on exit the Root MUST restore the resting content and its own properties. A template that contains interactive content MUST be reported as a diagnostic and presented inert.  <!-- cc-adoption -->

- **REQ** Native passthrough. Inside a native Zone the host pointer MUST be restored for the Zone’s subtree, including shadow parts, and the Surface MUST hide with the native state published; a Zone nested inside a native Zone MUST NOT hide the host pointer again.  <!-- cc-passthrough -->

- **REQ** Attraction. With center attraction the follower target MUST be the center of the active Zone’s bounds; with bounds attraction the target MUST be that center and the Root MUST publish the bounds’ width and height as the stuck extents with the stuck state. Bounds are the Zone’s own box or, for a layout-neutral Zone, the union of its element children’s boxes. While attracted the Root MUST follow resizes and scrolling of the bounds; attraction MUST release on exit, on disable and on disconnection of the Zone.  <!-- cc-stick -->

- **REQ** Pressed. The Root MUST publish the pressed state from the primary button between pointer down and pointer up or cancel inside its scope, for mouse-like pointers only.  <!-- cc-pressed -->

- **REQ** Visibility. The Surface MUST be hidden until the first mouse-like move, while outside, inside a native Zone and while disabled, and MUST NOT occupy space or receive focus at any time.  <!-- cc-visibility -->

- **REQ** Motion. The Root MUST declare one state role named state, with phase change, target Surface, context state, previousState, zone and stuck, non-blocking, published through [Motion requests and drivers](#sec-64-motion-requests-and-drivers) before the default presentation of a state change; a claimed driver owns the Content transition. The per-frame follow is pointer-coupled positioning, not a motion role, and MUST NOT be offered to drivers.  <!-- cc-motion -->

- **REQ** Change reasons. The state lane MUST notify the Consumer with the state, the previous state and the active Zone, with reason hover for Zone entry, exit and removal and programmatic for the setState action; the proposal is cancelable and cancellation MUST keep the previous state. A programmatic state MUST persist until cleared or replaced by a later Zone entry. The following lane MUST use pointer, disabled and programmatic as registered in [ChangeEvent and ChangeReason](#sec-53-changeeventt-and-changereason).  <!-- cc-reasons -->

- **REQ** Accessibility. The Surface and its content MUST be hidden from assistive technology and MUST never receive focus; Zone templates MUST NOT contain interactive content; the Root and the Zones MUST NOT change the accessibility tree, focus order or activation of the page. Keyboard users are unaffected: the host pointer is hidden only for a visible mouse-like pointer.  <!-- cc-a11y -->

- **REQ** Lifecycle. Disconnection of a Root MUST stop its frame participation, release its lease, leave the top layer and clear its state; reconnection MUST restore registration and the lease. Disconnection of an active Zone MUST clear the state with reason hover. The refresh action MUST re-resolve Zones, re-measure attraction and re-enter the top layer.  <!-- cc-lifecycle -->

<!-- cc-edges -->
| Case | Required behavior |
|---|---|
| Touch input after mouse input | following stops, the lease is released and the Surface hides; the next mouse-like move resumes |
| Pinch zoom | the Surface keeps its unscaled size and tracks the layout viewport point |
| Pointer over an embedded document | no events arrive; the Surface stays at the last point until the pointer leaves the scope or moves |
| Zone removed or disabled while active | state cleared with reason hover; attraction and adopted properties released |
| Two Roots in one document | independent followers and states; one shared lease and one frame loop |
| Disabled while attracted | attraction, state and lease released; the Surface hides |
| Top layer unavailable | fixed box with the highest stacking order; diagnostic |

## UI Component Library Specification (`doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`)

### Insert `ucl21-cursor` into `sec-cl-21-display-feedback` after `ucl21-qr-code`

Review dependencies: `sec-1822-custom-cursor`, `ucl22-badge`, `ucl22-icon`.

#### Cursor

A cursor replaces the host pointer with a dot or ring that trails the pointer and changes its size, color, blend, content and position over the regions a page marks as zones.  <!-- ccl-purpose -->

Behavioral contract: [Custom cursor](#sec-1822-custom-cursor), under [Reduced-motion policy](#audit-sec-126-reduced-motion-policy). Zone content composes [Badge](#ucl22-badge) and [Icon](#ucl22-icon); the Surface paints the default ring; a Zone paints nothing.  <!-- ccl-basis -->

<!-- ccl-anatomy -->
| Element | Responsibility |
|---|---|
| Root (tp-cursor) | Owns the follower, the state, the lease and the published values. |
| Surface | The fixed, pointer-transparent box in the top layer. |
| Content | The resting content, the default ring or the active Zone’s content. |
| Zone (tp-cursor-zone) | Layout-neutral wrapper declaring state, content, appearance, attraction, passthrough and physics. |

<!-- ccl-props -->
| Property | Values | Default | Meaning |
|---|---|---|---|
| Stiffness; damping; mass | numbers within the spring ranges | 170; 26; 1 | Follower physics. |
| Rest speed; rest delta | pixels per second; pixels | 1; 0.1 | Settle thresholds. |
| Scope | document; region | document | Where the pointer is followed and the host pointer hidden. |
| Region | element identifier | the parent element | Region element for region scope. |
| Hide native | true; false | true | Hides the host pointer while following. |
| Disabled | true; false | false | Releases everything and hides the Surface. |
| Motion policy | inherit; normal; reduce | inherit | Reduced-motion policy override. |
| Zone state | token | none | State published while the Zone is active. |
| Zone for | Root identifier | every Root | Addresses one Root. |
| Zone native | true; false | false | Restores the host pointer inside the Zone. |
| Zone stick | none; center; bounds | none | Pulls the Surface to the Zone’s center or morphs it to its bounds. |
| Zone stiffness; damping; mass | numbers | the Root’s | Physics while the Zone is active. |
| Zone disabled | true; false | false | Ignored by resolution. |

- **REQ** The default mark MUST be a box of --tp-cursor-size with a strong border in --tp-cursor-color and the full radius, presented only while neither resting content nor Zone content is shown; it MUST transition its size, radius and border color with the fast duration and MUST NOT transition any fill.  <!-- ccl-q1 -->

- **REQ** The Surface MUST hide through opacity while not following, outside, native or disabled, MUST scale down while pressed, and MUST apply --tp-cursor-opacity and --tp-cursor-blend; the Root MUST paint no surface and occupy no space.  <!-- ccl-q2 -->

- **REQ** With bounds attraction the default mark MUST morph to the stuck extents with the medium radius; with center attraction it MUST keep its size. Under reduce every Surface and Content transition MUST be instant.  <!-- ccl-q3 -->

- **REQ** Zone appearance MUST come only from the adoptable properties --tp-cursor-size, --tp-cursor-color, --tp-cursor-blend, --tp-cursor-opacity and --tp-cursor-radius set on the Zone and from its template content; the binding MUST NOT infer a look from the controls inside a Zone.  <!-- ccl-q4 -->

- **REQ** The binding MUST expose read-only following, state, zone, position, velocity, pointer, pressed and stuck; the setState and refresh actions; the cancelable state-change notification and the follow-change notification; and the published custom properties --tp-cursor-x, --tp-cursor-y, --tp-cursor-velocity-x, --tp-cursor-velocity-y, --tp-cursor-stuck-width and --tp-cursor-stuck-height on the Root.  <!-- ccl-q5 -->

- **REQ** A Zone MUST render as contents so that wrapping never reflows, and MUST publish hovered while the pointer is inside it.  <!-- ccl-q6 -->

- **REQ** Zones MAY wrap any catalog component, including Button, Image, Card and Text area; a native Zone MUST wrap text entry and embedded documents that need the host pointer. Several Roots MAY coexist for layered looks, each with its own physics, and a Zone addresses one of them with for.  <!-- ccl-composition -->

- **REQ** The Root MUST paint no surface. The Surface MUST be a transform-only box with pointer events disabled. Library shadow parts MUST yield their own pointer to the lease through the shared --tp-cursor-hidden style query in the element base styles, and a native Zone MUST reset it for its subtree. Transitions MUST scale by the motion policy.  <!-- ccl-presentation -->

<!-- ccl-public-definition -->
| Public part | Foundation part | Part slot | Exposure |
|---|---|---|---|
| Root | Cursor.Root | cursor | exposed |
| Surface | Cursor.Surface | cursor-surface | exposed |
| Content | Cursor.Content | cursor-content | exposed |
| Zone | Cursor.Zone | cursor-zone | exposed |

<!-- ccl-definition-summary -->
| Public control | Kind | Variant axes and defaults | Fixed or re-defaulted foundation properties | Surfaced hidden-part properties |
|---|---|---|---|---|
| Cursor | compound-reexport | none | none | none |

<!-- ccl-presentation-keys -->
| Public part | Cardinality and containment | Presentation key inventory |
|---|---|---|
| Root | exactly one public owner host per control instance | cursor |
| Surface | exactly one descendant of Root, in the top layer | cursor-surface |
| Content | exactly one descendant of Surface | cursor-content |
| Zone | zero or more hosts per document, addressing Roots by identifier | cursor-zone |

Recorded design decisions: size is a custom property rather than a size axis because Zones adopt it continuously; a Zone renders as contents so wrapping never reflows, and its bounds are measured from its element children; touch never engages the cursor because there is no pointer to replace; under reduce the cursor stays and snaps, because the replacement pointer is essential feedback while the lag is nonessential motion; the native lease is one shared document resource reached through a style query, and third-party shadow roots that set their own pointer remain a documented limit; the follow is pointer-coupled positioning rather than a motion role, while the state change is a role so that an external driver can morph the content.  <!-- ccl-decisions -->

## Table rows and baseline

- `foundation` `node-016395` append `cc-b83-state`: Cursor state | hover, programmatic
- `foundation` `node-016395` append `cc-b83-follow`: Cursor following | pointer, disabled, programmatic
- `foundation` `audit-foundation-catalog-coverage-map` append `cc-coverage-row`: Custom cursor | Cursor | catalog control | direct public control
- `cl` `ucl111-table` append `ccl-state-row`: following; outside; cursor-state; moving; native; stuck; hovered | [Custom cursor](#sec-1822-custom-cursor); pressed reuses the shared marker.
- `cl` `audit-complete-coverage-map` append `ccl-coverage-row`: Cursor | [Cursor](#ucl21-cursor) | compound-reexport | [Custom cursor](#sec-1822-custom-cursor) | included public control
- `foundation` `sec-a1-pinned-upstream-baseline` append `cc-evidence-baseline`: Custom cursor evidence: the HTML popover top layer, the CSS style container query and the visual viewport interface. No behavioral component evidence snapshot provides a custom cursor, a spring follower or hover zones; the Base UI NumberField scrub cursor (a fixed, portalled, pointer-transparent surface scaled by the inverse visual-viewport scale, never for touch), the Floating UI client-point tracking and cursor-speed measurement, the video.js fine-pointer and reduced-motion gating and the Motion spring presets were used as implementation evidence only.

## Applied revisions

- `9598f4c0` (0.18.2): Foundation `sec-1822-custom-cursor`, CL `ucl21-cursor`, B.8.3 rows `cc-b83-state` and `cc-b83-follow`, coverage rows, state vocabulary row `ccl-state-row`, baseline `cc-evidence-baseline`.
- `9353b248` (0.19.0): minor release.
- `922ac6ed` (0.19.1): `ccl-q2` text node t5 now reads "present the pressed state by scaling the Content down around its own center, never by transforming the Surface, so that pressing never moves the cursor". The individual `scale` property composes outside the positioning transform, so a scaled Surface moved toward the page origin on every press.
- `b979c284` (0.19.2): `cc-innermost` text nodes t5 and t7 now require re-resolving the Zones and re-measuring attraction in every frame in which content scrolls under a still pointer, in the document or any scroll container including one inside a shadow root, without waiting for the host's boundary events.
