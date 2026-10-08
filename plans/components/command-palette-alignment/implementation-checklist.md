# Command Palette input and close alignment

- Requested work / claim: Bounded Command Palette alignment and shared Avatar border repair.
- Scope source: User screenshots reporting misaligned query/close and Avatar disappearing into its background.

## Sources

Bounded fix requested by the screenshot: align the existing query InputGroup and Dialog Close. Fresh direct Foundation and Library AST reads on2026-10-04: sec-177-command, ucl18-command, ucl19-dialog. Existing unrelated workspace changes preserved. Local base/ui/command.tsx CommandDialog/InputGroup/CommandInput and Nova361-379 read; query group and optional Dialog close retain their existing owners. Inherited Dialog requires a reachable close control. No public API changes or whole-component completeness claim.

## Capability and interface mapping

| ID | Capability | Authority | Reference | Local owner | Docs | Scenarios | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Query and synthesized close alignment | ucl18-command, ucl19-dialog | CommandDialog, CommandInput, Nova command-input-group | TpCommandPalette structural geometry, existing InputGroup and TpButton; md control extent and space-2 gap | Existing command-palette docs and source unchanged | V-01 | passed | Repaired field/close36px, center delta0, gap6.4px |
| C-02 | Optional close, inline and RTL | Same contracts | showCloseButton, inherited Dialog | Reserve space only when corner close exists; logical end sizing | Existing docs | V-02 | passed | RTL/density, inline and authored footer-close fixture verified |

| C-03 | Avatar perimeter across image and fallback | ucl21-avatar | base/ui/avatar.tsx Root after:border-border; Nova74-84 | Shared avatar recipe border overlay, theme border versus muted fallback | Existing Avatar API unchanged | V-03 | passed | Light/dark theme border differs from muted fill;36px extent preserved |

## Family dependency map

| Responsibility | Source | Existing owner | Decision | Consumers |
| --- | --- | --- | --- | --- |
| Search and execution | Base Command InputGroup | TpCommandList / TpSelect / TpInputGroup | Reuse unchanged | Command Palette |
| Dismissal | Base Dialog close | TpDialog / TpButton | Reuse unchanged, match query control extent in Command composition | Command Palette modal |

| Avatar boundary | Base Avatar Root after pseudo-element | Existing avatar recipe | Add theme border overlay, no content sizing change | All Avatar consumers |

## Presentation source map

| Region | Source | Existing recipe | Adaptation | Scenarios |
| --- | --- | --- | --- | --- |
| Query and close row | Nova command-input-wrapper / input-group | command-palette-input-wrapper and standard control heights | Shared md extent and space-2 gutter; no demo CSS or pixel constants | V-01 V-02 |

| Avatar border | base/ui/avatar.tsx Root | avatar recipe | Border-width/style/color tokens; transparent overlay matching source | V-03 |

## Implementation and composition reuse map

| Composition | Role | Owner | Integration | Native exception |
| --- | --- | --- | --- | --- |
| Palette | Search | InputGroup / Input / Icon | Same rendered controls | None |
| Palette | Close | Dialog / Button | Same close reference, callback, accessible name and focus | CSS geometry only |

## Verification scenarios

| ID | Capabilities | Setup | Expected | Actual | Tool | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 | Dashboard command modal, focused query and close; density override | Equal heights/centers; one theme gutter; Close works | Both36px, center delta0, gap6.398px. Density override both45px, gap8px. Actual Close click dismisses. | Chrome MCP geometry/screenshots/click | passed | InputGroup actual border box measured |
| V-02 | C-02 | RTL, narrow viewport, inline, authored footer close | Logical gap; no unused reservation without corner close; inline unchanged | RTL center delta0 and same gap;390px screenshot no overflow. Inline padding6.4px all sides. Precomposed footer-close modal has no corner and symmetric6.4px padding. | Chrome MCP setup/geometry | passed | No public API change |

| V-03 | C-03 | Light/dark fallback, loaded image, group and theme border override | Visible separate perimeter; unchanged dimensions | Dark border63/63/70 versus fill39/39/42; light border212/212/216 versus fill244/244/245. Theme override honored; fallback/group and loaded image visually inspected;36px size retained. | Chrome MCP geometry/screenshot | passed | No loading/identity behavior change |

## Early integration checkpoint

| ID | Check | Status | Evidence |
| --- | --- | --- | --- |
| I-01 | Shared ownership | passed | Only shared palette geometry and avatar recipe changed; existing InputGroup, Dialog Button and Avatar lifecycle retained |
| I-02 | Reference presentation | passed | Chrome screenshot: field and close both36px, vertical center delta0, horizontal gap6.4px. Dark avatar perimeter visible around unchanged36px fallback. |
| I-03 | Independent options | passed | Reservation conditional on existing synthesized corner; inherited footer handling untouched, independent scenarios follow |

## Gate record

| Gate | Status | Evidence |
| --- | --- | --- |
| 0. Sources | passed | Fresh direct contracts and upstream registry/styles read |
| 1. Capabilities | passed | Two bounded responsibilities mapped |
| 2. Architecture | passed | Shared component geometry with existing controls; token dimensions; no duplicated behavior |
| 3. Behavior | passed | Actual palette close works; image load/fallback retained |
| 4. Presentation | passed | Measured alignment under default/density/RTL; shared avatar theme perimeter |
| 5. Accessibility | passed | Existing accessible query and Close names inspected; decorative border ignores pointer events; no semantic changes |
| 6. Visual | passed | Desktop dark and narrow light palette inspected; Avatar light/dark fallback/group/image inspected |
| 7. Documentation | passed | No API or configuration changes; existing source examples consume repaired components |
| 8. Regressions | passed | Focused ESLint/Stylelint/Prettier, TSC and diff check; inline and alternate-close composition checked |

Avatar investigation: fresh ucl21-avatar from current Library AST; base/ui/avatar.tsx and Nova74-94. Root border overlay follows upstream after:border-border; blend mode intentionally omitted to retain theme border color requested by user.

Verification scope: these two presentation fixes only. Broader previously recorded Command Palette platform gaps remain in library-completion/command-palette/implementation-checklist.md; no full conformance claim. Chrome MCP page90 screenshots inspected inline; no screenshot export claimed. No broad browser suite or repeat build needed for these CSS-only changes.

## Shared change 2026-10-08: Text search

The shared Text search engine (`src/foundation/search`, spec v0.11.0 `5cbe3bb8`, v0.11.1 `a3bad05b`) now serves this owner: Select gains `matching` (default `contains`, unchanged results), `source`, `searchDelay`, `highlightMatches`, `matchFields`, `messages`, `searchStatus`, the `select-status` and `select-match` parts and a selection-free mode used by `tp-autocomplete`; Command palette ranks through `TextIndex` (fuzzy over text, value and keywords) instead of `commandRank`. Regression evidence: select-query fixture 73/73 assertions passed in Chrome DevTools MCP; command palette story ("opne" finds Open document) inspected; 1,360 unit tests pass. Details: `plans/components/autocomplete/implementation-checklist.md`.
