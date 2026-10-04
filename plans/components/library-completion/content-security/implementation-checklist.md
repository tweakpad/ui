# Content-security Foundation service implementation record

## Delivery and source record

- Requested work / claim: implement the complete Foundation content-security service and normalize all existing runtime style resource creation; whole-library completion remains an ongoing goal.
- Scope source: user authorized whole-library audit and implementation with shared owners and regression protection; live Foundation sections sec-123 and sec-d3 define the service capability.

- Scope: complete Foundation content-security service and every existing generated library style resource under the whole-library objective. No visual component or catalog identity.
- Authority: fresh direct MCP project/Foundation/Library reads2026-10-04, head8440bff24a97dbbc5c762ebf4bd6baa958b305e1/state5daad6324d67f008ae378650a86e7e961fc91a1025d6107c89be7002caecdfe1. sec-123-environment-and-interaction-services requires nonce propagation and disableStyleElements=false suppression of every generated style resource; sec-d3-foundation-services-outside-the-38-component-catalog explicitly maps CSPProvider to a service.
- Local source: clean Base5b495488d182c81a8a14a440d7a376517118f8ec; csp-provider/CSPProvider.tsx/test.tsx, internals/csp-context/CSPContext.tsx, utils/styles.tsx and PrehydrationScript.tsx. Nearest provider supplies nonce/disable policy; tests cover Select and ScrollArea. No React prehydration script exists in the client Lit implementation; no new script injection introduced.
- Existing owners: PresentationController structural/recipe/registered-native sheets; OwnedPortal style copying; NavigationPanel View template style; Toast portal style; ResizablePanelGroup temporary drag style. Story-only static CSS is not a library-injected resource and remains separately owned by Storybook.
- Preserve all current staged/unstaged edits; HEAD3a03ac0. Direct Spec Blocks/Chrome MCP available. Existing Vite5173/Storybook6006 retained. Screenshot persistence currently rejected by MCP roots; inline inspection remains available.
- Evidence: tests/fixtures/components/content-security/ source/built fixture; tmp/component-verification/content-security/ local logs. This checklist/docs carry durable results.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Optional nonce; disableStyleElements false; service outside catalog | sec-123; sec-d3 | CSPProviderProps/CSPContext default | ContentSecurityService(scope,options), update(options), dispose; nearest document/element/shadow scope; no tag | docs/content-security.md | V-01 V-02 | passed | Built public service works before registration; scoped replacement/disposal unit coverage; docs API. |
| C-02 | Nearest provider and dynamic values/release; owner document and logical portal inheritance | sec-123; shared ownership | React nearest CSPContext; owner-aware DOM utilities | policy resolver over existing composed/logical ownership; policy subscription; preserve window.litNonce fallback when no service | docs/content-security.md | V-01 V-03 | passed | Nearest/portal scope unit tests and actual portaled Select suppression/restore; target-document adoption. |
| C-03 | Nonce before generated resource insertion; all structure/appearance/native/portal/drag resources | sec-123 | styleDisableScrollbar.getElement(nonce); PrehydrationScript nonce | GeneratedStyleResource centralizes constructed-sheet/style element creation/update/adoption/cleanup; nonce uses actual style elements | docs/content-security.md | V-01 V-02 V-03 | passed | Chrome71 built: 76 styles, all nonce-bearing; actual drag resource nonce before insertion; zero library policy violations. |
| C-04 | Suppression creates no generated style resources, including constructed sheets; consumer resources preserved | sec-123 | disableStyleElements tests Select/ScrollArea | Same resource owner removes only owned resources, retains stable non-style Lit boundary, re-enables in place | docs/content-security.md | V-01 V-02 V-04 | passed | Initial and dynamic suppression: zero resources; consumer adopted stylesheet survives; Lit editor identity retained. |
| C-05 | Semantics/interaction/form state remain under suppression | sec-123 | unstyled Base behaviors independent from injected scrollbar CSS | No behavioral state owner changes; existing controls retain native roles/actions/forms and public consumer styling | docs/content-security.md | V-02 V-04 | passed | Actual typing/Tab/ArrowDown/Enter under suppression; Notes!/Apple and FormData retained, focus unchanged. |
| C-06 | Realm adoption/reconnection/disposal; no retained policy listeners or stale resource | sec-123; shared lifecycle | owner utilities and CSP provider lifecycle | GeneratedStyleResource connect/disconnect/dispose; target-document sheets; PresentationController ownership retained | docs/content-security.md | V-01 V-03 | passed | Unit disconnect/dispose/reconnect/realm coverage; actual iframe adoption and drag cleanup. |
| C-07 | No style drift/defaults changed; public dictionary/part overrides and exact styles retained | library presentation contracts | existing local Nova/base recipe mapping remains unchanged | Preserve CSS contents/order and existing recipes, unify resource transport only | docs/content-security.md | V-02 V-04 | passed | Unchanged declarations; dark LTR/light RTL screenshots, root spacing 36→45, dictionary and part overrides, real shared navigation regression checks. |
| C-09 | Strict style-src also permits interaction geometry on first render | sec-123 behavioral correctness; existing part binding | Lit styleMap first render serializes a prohibited style attribute | Reuse existing bindPart style CSSOM writer for NavigationPanel, ResizablePanelGroup, DataVisualization, Calendar and Carousel; no new style directive | docs/content-security.md | V-03 V-04 | passed | All runtime style attributes now use existing bindPart CSSOM owner; strict built zero library violations; affected geometry API checks. |
| C-08 | Complete exports/docs and built strict-policy use | sec-d3 | CSPProvider public export/types | Foundation service export and documented server nonce, scope, dynamic policy and suppression boundary | docs/content-security.md | V-04 | passed | Built exports exercised; docs/content-security.md complete API and limitations; builds pass. |

## Architecture and reuse

ContentSecurityService owns policy only. GeneratedStyleResource owns all generated CSS transport, using a stable comment boundary, a constructed sheet when allowed and no nonce is requested, or a nonce-bearing style element otherwise. Suppression removes its own style element/sheet and leaves consumer CSS untouched. CSS declarations and component state do not move into the service. Connected resource subscriptions receive policy changes; actual component lifecycle handles reconnection and adoption. Portal logical ownership is extracted from OwnedPortal into a small shared module and reexported at the existing path; no second portal implementation. Nearest scope replaces the provider policy with false/undefined defaults, matching upstream context. No service falls back to owner-window litNonce for compatibility.

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Policy | CSPProvider -> CSPContext -> styleDisableScrollbar | only PresentationController structural fallback reads litNonce | One Foundation policy resolver/subscription; actual existing owners consume it through resource owner | all runtime style owners V-01..V-04 |
| Style lifecycle | shared style helper and owner utilities | PresentationController duplicated structural/recipe/native sheet adapters | Extract actual generated-resource owner and migrate all three; maintain dictionary/part ownership and stable render boundary | every TpElement and Icon; V-01 V-02 V-04 |
| Portal inheritance | React context survives portals | OwnedPortal logical owner map; Toast portal copies | Reuse/extract logical ownership; resource belongs to logical component, not body container | Menu/Select/Dialog/Tooltip/Preview/Drawer/NumberField cursor/Toast V-03 |
| Special resources | upstream Select/ScrollArea style suppression | ResizablePanelGroup temporary drag style; NavigationPanel View style | Migrate same resource transport; preserve pointer capture and native navigation semantics without generated CSS | ResizablePanelGroup/NavigationPanel V-03 V-04 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| All affected surfaces | Existing recorded shadcn base/Nova mapping | src/presentation recipes and component structural CSS | Existing PresentationController and public parts | CSS contents untouched; resource insertion/security is shared infrastructure, not new styling | V-02 V-04 |
| Suppressed controls | Base unstyled behavior, no new baseline | CSPProvider disableStyleElements | Actual native semantics and controls | Consumers provide external/owned styles; no local substitutes or fallback injected paint | V-02 V-04 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| CSP fixture/docs | Input/Button/Select/Menu/ScrollArea/NavigationPanel/Toast/ResizablePanelGroup | Actual controls and public existing options | source/built strict style-src nonce + suppression V-02..V-04 | Native scope wrappers, policy meta and consumer-owned stylesheet are deliberate infrastructure |

CSSOM follow-up discovered during integration: the first Lit styleMap/string-style render uses a style attribute, which strict style-src rejects. The existing bindPart style object writer already applies individual CSSOM properties. Migrate the five existing owners to that binding without changing declarations; remove runtime styleMap imports. This is a shared-owner reuse repair, with no new public API or recipe. Gates 1–2 reassessed with C-09; I-03 reopened during repair and passed again after strict built policy reported no library violations.

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 C-02 C-03 C-04 C-06; focused resource/policy | nearest scopes, nonce change, suppression, consumer sheets, adoption/reconnect | owned-only removal and correct realm/nonce; no stale references | 26 focused tests including seven structural/policy cases pass; details in execution-evidence.md. | Chrome MCP and focused checks; execution-evidence.md | passed | No unresolved service scenario; analyzer/bundler limitations separated. |
| V-02 | C-01 C-03 C-04 C-05 C-07; early real integration | built strict nonce style-src; actual Input/Button/Select, dynamic suppression and restore | allowed styles/no policy violations; native typing/selection/form survives; ordinary paint matches | Chrome71 source/built native keyboard/form checks and screenshots pass; built strict zero library violations. Vite source CSS injection separated. | Chrome MCP and focused checks; execution-evidence.md | passed | No unresolved service scenario; analyzer/bundler limitations separated. |
| V-03 | C-02 C-03 C-06; logical ownership and special styles | scoped portal, NavigationPanel View, Toast container, resize drag, document adoption and teardown | all resources follow service; no leaks or false nonce exemptions | Chrome71 actual portaled Select, Toast, drag cursor, NavigationView and iframe adoption; all nonce/suppression/cleanup checks pass. | Chrome MCP and focused checks; execution-evidence.md | passed | No unresolved service scenario; analyzer/bundler limitations separated. |
| V-04 | C-04 C-05 C-07 C-08; regression/package/docs | existing fixtures source/built, theme/dictionary replacement, public exports | defaults/behavior/presentation unchanged; full docs and no residual runtime style generator | Public overrides, default navigation screenshots/interactions, Calendar/Carousel/ScrollArea/chart API checks; built exports/docs and checks pass. | Chrome MCP and focused checks; execution-evidence.md | passed | No unresolved service scenario; analyzer/bundler limitations separated. |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared resource owner actually consumed | passed | Diff inspection: PresentationController, OwnedPortal, NavigationPanel View, Toast and ResizablePanelGroup use GeneratedStyleResource; runtime style creation scan finds only that owner. |
| I-02 | Default presentation preserved | passed | Chrome71 source screenshot: actual Input, Select/InputGroup and outline Buttons retain dark library appearance; no recipe/declaration changes. |
| I-03 | Nonce and suppression independent options | passed | Strict built nonce and initial/dynamic suppression pass after CSSOM repair; native state/form/focus retained; see execution-evidence.md. |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh full direct contracts and clean upstream CSP sources; complete runtime generation inventory |
| 1. Capability mapping | passed | C-01..C-09 cover policy/resources/semantics/lifecycle/presentation/package, mapped V-01..V-04 |
| 2. Architecture and composition reuse | passed | One generated-resource owner adopted by all existing generators; logical portal owner reused; no paint/state fork |
| 3. Behavior | passed | execution-evidence.md: applicable service behavior, appearance, accessibility, docs and regression evidence; whole-library gaps remain separate. |
| 4. Presentation and customization | passed | execution-evidence.md: applicable service behavior, appearance, accessibility, docs and regression evidence; whole-library gaps remain separate. |
| 5. Accessibility | passed | execution-evidence.md: applicable service behavior, appearance, accessibility, docs and regression evidence; whole-library gaps remain separate. |
| 6. Visual and interaction inspection | passed | execution-evidence.md: applicable service behavior, appearance, accessibility, docs and regression evidence; whole-library gaps remain separate. |
| 7. Documentation and demo reuse | passed | execution-evidence.md: applicable service behavior, appearance, accessibility, docs and regression evidence; whole-library gaps remain separate. |
| 8. Regression and reconciliation | passed | execution-evidence.md: applicable service behavior, appearance, accessibility, docs and regression evidence; whole-library gaps remain separate. |


### Light-DOM regression correction
Current Form integration exposed missing automatic light-DOM part registration after resource normalization. Shared PresentationController now routes those bindings through existing registerPart/GeneratedStyleResource, with membership cleanup. Source Chrome nonce, suppression, restore and stable-input evidence is in ../use-case-review-2026-10-04.md. Earlier no-style-drift claim was reopened for this finding. Production/Storybook builds after repair pass; strict-policy built Form integration remains to add to the full matrix.
