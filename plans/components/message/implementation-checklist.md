# Message reference use cases

## Delivery and source record

- Requested work / claim: match all Message use cases at https://ui.shadcn.com/docs/components/base/message. Include shared Message repairs required by those compositions; this is not a full unrelated library conformance claim.
- Scope source: user request, 2026-10-05. Preserve staged catalog-spacing and Slider work; do not change index.
- Fresh direct Spec Blocks: project prj_c5a403a0-d1d5-4487-ac78-f4e545f46483; Foundation doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1 and Library doc_8077bf7c-0361-48f3-ac87-53b983bd89b3. HEAD8440bff24a97dbbc5c762ebf4bd6baa958b305e1, state55b573b760e30b3be64871d072a16f30479bbbaeff0405c00094c9f17a2862ba. Owning nodes ucl22-message/bubble/attachment and sec-71-semantic-invariants; shared presentation/part contracts remain authoritative.
- Local shadcn clean63c1308d112b6b1205d86244a156cca1abef5087: apps/v4/content/docs/components/base/message.mdx; examples/base/message-{demo,avatar,group,header-footer,actions,attachment}.tsx; registry/bases/base/ui/message.tsx and registry/styles/style-rhea.css .cn-message*. Live page and Chrome screenshot confirm the same six compositions.
- Upstream Message is presentational native layout, with no Base UI/Floating UI state owner. Use existing TpElement parts and actual Avatar/Bubble/Marker/Button/Attachment controls.
- Tools: direct Spec Blocks and Chrome DevTools MCP available. Existing source5173/Storybook6006; task reference page76. Evidence local only: tmp/component-verification/message/use-cases/; durable fixture tests/fixtures/components/message/index.html.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Conversation: both logical sides, identity, grouped bubbles, delivery, reactions, typing | ucl22-message/bubble | message-demo.tsx | Message/Avatar/BubbleGroup/Marker | Conversation example | V-01,V-04 | passed | Six source compositions rendered with original local text; typing status and reaction summary inspected |
| C-02 | Avatar: start/end, multiple bubbles and bottom alignment clear of footer | ucl22-message Avatar/Root | message-avatar.tsx; .cn-message-avatar | Shared Message grid rows; avatar slot | Avatar example | V-01,V-03 | passed | Avatar/Content bottoms coincide in LTR and RTL; footer growth to80px preserves baseline |
| C-03 | Group: tight consecutive rows, reserved empty avatar region | ucl22-message Group | MessageGroup; message-group.tsx | TpMessageGroup using existing message part; empty avatar slot | Group example | V-01,V-03 | passed | Group exported/registered;6.4px recipe gap; placeholder and final row content columns coincide |
| C-04 | Header remains start aligned; footer follows sender; optional regions collapse | ucl22-message Header/Footer | message-header-footer.tsx | Existing named slots, author/timestamp | Header and footer | V-01,V-03 | passed | Optional Header collapses; end-row Header remains start and Footer end; trusted Retry updates Footer |
| C-05 | Named copy/feedback/retry controls remain independent; application owns state | ucl22-message; sec71 | message-actions.tsx | Actual Button/Toggle, setup callback and status | Actions | V-02,V-04 | passed | Copy succeeded; Tab/Space toggled Helpful with aria-pressed; Retry delivered locally and restored focus |
| C-06 | Image then text, response then downloadable file, final acknowledgment | ucl22-message/attachment | message-attachment.tsx | Actual Attachment/Media/Actions, Bubble | Attachment | V-02,V-03,V-04 | passed | Outgoing image aligns logically; content gap8px; native download link points to verified Markdown Blob |
| C-07 | Public parts, token gaps, logical RTL and constrained layout | Library presentation contracts | .cn-message*, base message.tsx | Existing recipes; no demo control-spacing overrides | Composition/parts | V-03,V-05 | passed | 390px RTL/light and1200px LTR/dark; seed and public part override checks; Scroller consumer verified |

## Architecture and reuse

Message owns structural alignment. Use a grid with Avatar sharing Content's row so footer height cannot push the avatar down; body remains a structural grouping. Shared dictionary owns row/content/header/footer/group gaps. Add MessageGroup following existing BubbleGroup/AttachmentGroup registration and presentationTagName patterns, using the already normative message Group part rather than a new catalog identity. No transport state or synthetic actions in Message. Keep existing flags/slots/legacy hooks compatible. Demo page widths and spacing between independent conversation turns are application layout.

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Message row/group | base/ui/message.tsx native wrappers | components/message; BubbleGroup/AttachmentGroup | Grid row ownership, add equivalent thin Group constituent | All six demos and Message Scroller / V-01,V-05 |
| Visual surfaces and identity | examples import Bubble/Avatar/Marker | bubble, avatar, marker | Reuse public components and existing variants; muted maps secondary | Conversation/avatar/group / V-01 |
| Actions/resources | examples import Button and Attachment | button, toggle, attachment | App-owned callbacks; actual download resource | Actions/attachment / V-02,V-04 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Root/avatar/content | base/Rhea | .cn-message gap2; avatar min-width8; content gap2.5 | message.ts + recipes.ts | Semantic theme values; avatar shares content row instead of fixed footer translation | V-01,V-03 |
| Header/footer/group | base/Rhea | .cn-message-header/footer px3; group gap2 | Existing public parts + message Group | Shared spacing, Header start/Footer sender side, no local patch | V-01,V-03 |
| Nested controls | base/Rhea imports | Bubble, Avatar, Marker, Button, Attachment | Their existing local recipes | Preserve library theme rather than duplicate source paint | V-01,V-02 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Conversation/avatar/group | identity, surfaces, reactions, status | tp-avatar, tp-bubble, tp-bubble-group, tp-marker | V-01,V-04 | Native text/reaction summary; empty span is avatar placeholder |
| Actions | copy/retry/feedback | tp-button, tp-toggle, tp-icon | V-02,V-04 | Native status text; no implicit row action |
| Attachment | image/file/download | tp-attachment, tp-icon, tp-button | V-02,V-04 | Native img and local sample document resource |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01,C-02,C-03,C-04; composition | Six rendered use cases and independent optional regions | Source structure/alignment, correct avatar baseline/group spacing | All six compositions visually inspected; eight layout assertions pass in both environments | Chrome77 source fixture,82 actual Docs | passed | No demo-owned control gaps |
| V-02 | C-05,C-06; interaction | Trusted copy, feedback, retry and download | Real callbacks; status updates; file exists | Trusted copy, Tab/Space feedback, retry and download passed; resource content and cleanup verified | Chrome77; clipboard success status, pressed state, local delivery receipt, Blob read/revocation | passed | No network transport implied |
| V-03 | C-02,C-03,C-04,C-06,C-07; presentation | Light/dark,390px RTL, dynamic footer, theme/part overrides | No overlap/overflow; shared spacing scales; Header start/Footer sender side | Eight geometry assertions pass at390px/light/RTL and1200px/dark/LTR; group gap6.4→9.6 seed,25.6 part override→6.4 reset | fixture.ts and Chrome77 screenshots/computed styles | passed | All six compositions inspected; no document/row overflow |
| V-04 | C-01,C-05,C-06; accessibility | AX, Tab/Enter/Space, axe | Named independent controls and status; presentational rows | Named Buttons/Toggle/native download link; status/reaction/Avatar AX inspected; keyboard passed; axe0 violations/0 incomplete in dark and light | Chrome77 AX, trusted input and local axe | passed | No screen-reader test claimed |
| V-05 | C-07; regression/docs | Message Scroller consumer, copied source, lint/type/build/Storybook | Existing consumers retained; docs/source/registration agree | Actual Docs show conversation plus five usages; copyable source imports audited;517 tests, typecheck, lint, library/Storybook builds pass; Group exported | Local logs; Chrome82 Docs and83 Scroller; dist declarations | passed | Scroller trusted Send creates correctly sized Message without overflow |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Actual shared owners reused | passed | Six cases use public Message/Avatar/Bubble/Group/Marker/Attachment/Button/Toggle; no substitute visual controls. Grid/spacing repair is in Message and recipes |
| I-02 | Source and shared presentation agree | passed | Chrome77 screenshot inspected conversation/avatar/group/header-footer against source screenshot: same constituent structure, logical sides, grouped bubbles, status/reaction; library theme and original text retained |
| I-03 | Independent regions and placement work | passed | Avatar/content bottom delta0 with delivered footer; empty avatar placeholder preserves group column; absent metadata hidden; Group recipe supplies6.4px gap |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh live authority, local reference and live screenshot |
| 1. Capability mapping | passed | Six reference cases and required shared fixes mapped |
| 2. Architecture and composition reuse | passed | Existing constituents/parts own spacing; no demo substitutions |
| 3. Behavior | passed | V-02 |
| 4. Presentation and customization | passed | V-03 |
| 5. Accessibility | passed | V-04 |
| 6. Visual and interaction inspection | passed | V-01,V-03 |
| 7. Documentation and demo reuse | passed | V-05 |
| 8. Regression and reconciliation | passed | V-05 |

## Documentation synchronization

Document all six cases, Group, existing properties/slots/parts and application-owned actions. Shared setup must be included in copyable source. Generator already preserves authored Message story.

## Completion / handoff

Completed the six requested Message use cases and their necessary shared layout fixes. Source reference remains clean63c1308d112b6b1205d86244a156cca1abef5087; no normative edits or runtime dependencies. The new Group reuses the existing normative presentation identity, just as BubbleGroup does. Library theme and original message copy are intentional adaptations; the downloadable resource is a real Markdown checklist rather than the reference PDF.

Checks: npm test72files/517tests; npx tsc --noEmit; focused ESLint and Stylelint; npm run build; npm run build-storybook; git diff --check. Logs are local under tmp/component-verification/message/use-cases. Browser screenshots were inspected in the tool output, not saved as portable artifacts. Eight durable layout assertions passed in each environment (16 total). Axe: zero violations and incomplete checks in both themes. No actual screen-reader test.

Theme timing note: one scan started immediately after changing Chrome's emulated color scheme returned a color-contrast finding; the subsequent settled light-theme scan returned no findings. The dark-theme scans also returned none. The settled results above do not certify intermediate global theme-transition frames.

Shared consumer regression: actual Message Scroller demos retain populated rows without overflow, and trusted Send in Anchoring mounts a new63.8px Message. This does not certify the older unfinished Message Scroller or catalog-wide conformance work. Message task has no unresolved required checks. Public docs and package declarations include TpMessageGroup; generator already excludes authored Message stories.
