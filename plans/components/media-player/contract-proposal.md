# Media Player: contract proposal

Status: **applied to the live specification** on 2026-10-05 through the direct Spec
Blocks tools (project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`, committed as
`dbaabf95` / 0.3.16 on top of `ac0db73d` / 0.3.15). Live nodes: Foundation `sec-1810-media-player`,
`sec-1920-key-bindings`, `sec-1921-tap-gesture-regions`, `sec-1922-activity-and-idle`,
`sec-1923-live-announcer`, amendments `mp-reasons` (sec-53), `mp-slider-media`
(sec-148), `mp-store-selector` (sec-54), `mp-duration` (sec-124), B.8.1/B.8.3 rows;
Library `ucl21-media-player` plus coverage row `audit-cov-media-player`. The live
spec is authoritative; this file is the long-form rationale and reference record.
The §12 decisions are recorded in the live note `mp-l-decisions` with the
recommended options; change them there if you choose differently.

This document defines the full intended contract. It is not a bounded or "core"
delivery: every capability listed here is in scope unless §11 excludes it with a
reason.

## 0. Sources and authority

| Source | Revision | Role |
| --- | --- | --- |
| Video.js v10 (`../specification/external/videojs-v10`) | `0164acc` (2026-10-05), packages 10.0.1, GA | Primary behavioral and anatomy reference |
| Media Chrome (`../specification/external/media-chrome`) | `d5c2628` (2026-09-30), 4.19.3 | Secondary reference for web-component mechanics, live/DVR and hotkey edge cases |
| Base UI (`../specification/external/base-ui`) | `5b495488d` | Compound-component conventions (no media primitive upstream) |
| shadcn (`../specification/external/ui`) | `63c1308d1` | Presentation source for reused components (no media component upstream) |

Both media references were cloned into `../specification/external/` at the user's
request on 2026-10-05. They are parity evidence and do not override live contracts.
Abbreviations: `V/` = videojs-v10 root, `P/` = `V/packages`, `MC/` = media-chrome root.

Key upstream design records: `V/rfc/player-api.md`,
`V/internal/design/ui/{slider,menus,controls-design,input-feedback,time-display,hotkey,gesture,poster,disabled-hidden,live-presets}.md`,
`V/internal/decisions/ui/{captions,gestures-as-components,skin-images-are-authorable}.md`,
`V/internal/decisions/player/{player-container-separation,context-media-discovery,provider-attach}.md`.

## 1. Identity and catalog placement (proposed)

| Item | Proposed ID / value | Note |
| --- | --- | --- |
| Foundation behavior | `sec-1810-media-player` (§18.10, after `sec-189-message-scroller`) | Store, media target, availability, requests, lifecycle |
| Foundation cross-cutting | `sec-1920-key-bindings`, `sec-1921-tap-gesture-regions`, `sec-1922-activity-and-idle`, `sec-1923-live-announcer`, `sec-1924-media-presentation` | Shared owners; see §7 |
| Library identity | `ucl21-media-player` (display/feedback chapter) | Plus a §25 catalog-map entry |
| Family slug | `media-player` | Covers video and audio; this file's folder |
| Root tag | `tp-media-player` | Class `TpMediaPlayer` |
| Constituent tags | `tp-media-<unit>` | e.g. `tp-media-play-button`; §4 lists them all |
| Package subpath | `@tweakpad/ui/media` | Follows the `./carousel` and `./drag-drop` precedent |
| Source folder | `src/components/media-player/`, Foundation in `src/foundation/media/` | One folder per component family, as required by the skill |

Constituents use `tp-media-*` instead of `tp-media-player-*`. The shorter prefix
follows the upstream role-based naming (`media-*`) and keeps names short. This needs
a vocabulary review against peers such as `tp-slider-thumb` and
`tp-navigation-panel-*` (§12, D1).

## 2. Architecture

### 2.1 Layers (mirrors Video.js v10 `core` / `dom` / adapter split)

1. **Foundation media layer** (`src/foundation/media/`), framework-free apart from the DOM:
   - media target contract and capability predicates;
   - the media store (state slices, derived values, requests);
   - presentation services (fullscreen, picture-in-picture, remote playback, orientation);
   - text-track, chapter and thumbnail parsing;
   - duration formatting.

   It uses the existing `CleanupScope`, `Scheduler`, `EnvironmentService`,
   `LocaleService` and `ObservableStore` (repaired, §7.3).
2. **Lit bindings** (`src/components/media-player/`): the root provider and its
   constituents. A constituent reads store slices through a reactive controller,
   `MediaSelectorController(host, selector, equality = shallowEqual)`, and requests
   changes through the root. A constituent never writes to the media element
   directly.
3. **Presentation:** definitions, part bindings and recipes registered with the
   existing presentation system (`src/presentation/`). Layouts (§4.9) are preset
   compositions of the constituents, not separate behavior.

### 2.2 Player scope and discovery

- `tp-media-player` is the **provider**. It owns exactly one store per instance. Any
  number of players can share a page, and no state is page-global except the
  key-binding arbitration in §3.7.
- Descendants find their player with a **portal-aware nearest-owner lookup**: walk
  composed parents, and follow the logical portal owner. This lets a control inside
  a portaled menu or popover still find its player. The lookup is a Foundation repair
  promoted from `nearestDrawerService` (§7.6). It does not use `@lit/context`, so no
  new runtime dependency is added.
- A constituent outside the player subtree can bind to a player with
  `player="<id>"`, following Media Chrome's `mediacontroller` precedent. When the
  attribute is absent, the nearest ancestor wins. A constituent with no player emits
  a `tp-diagnostic` and renders disabled.
- **Media discovery.** Each source is used only when the ones before it supply nothing:
  1. A custom media element that registers itself through the media registration
     protocol (§3.1). If several register, the last one wins. Each release callback
     only releases the registration that created it.
  2. Otherwise, the first slotted `<video>` or `<audio>` in the light DOM, rechecked
     by a `MutationObserver` (`childList`, `subtree`) and once in a microtask after
     connection.
  3. Otherwise, no media is attached. The store resets to its defaults and controls
     reflect that availability is `unavailable`.
- **Container role.** By default the root is also the *container*. The container is:
  - the fullscreen target;
  - the activity and idle surface;
  - the hotkey and gesture surface;
  - the boundary for anchored surfaces.

  An optional `tp-media-container` descendant takes over these roles when present.
  This allows a playlist or transcript to sit inside the player scope but outside
  the fullscreen target (`V/internal/decisions/player/player-container-separation.md`).
  The store re-attaches whenever the media identity or the container identity changes.

### 2.3 Lifecycle

- **Connect / attach.** The store attaches to `{media, container}` when the root is
  connected and a media element is present. Each slice checks the media's
  capabilities before attaching and keeps its defaults when the media is not capable.
- **Disconnect.** Detach runs synchronously. All listeners, timers, observers,
  pending seeks and controls locks are released through `CleanupScope`. Source state
  resets to its defaults, *except* user-owned configuration:
  - `content-title`
  - `poster`
  - `playback-rates`
  - `orientation-lock`
  - `idle-delay`
  - `messages`
- **Deferred destroy.** The store is destroyed two animation frames after
  disconnection unless the root reconnects first, so a move within the DOM keeps
  state (`V/packages/element/src/destroy-mixin.ts`). No `keep-alive` attribute is
  exposed; reconnection within the window preserves state.
- **Requests before attach.** A request issued before attach rejects with
  `DOMException('No media is attached.', 'InvalidStateError')` and emits
  `tp-media-request-failed` (§3.5). It does not throw synchronously from a property
  setter.

## 3. Foundation contract: `sec-1810-media-player` (proposed)

### 3.1 Media target contract

The store accepts any object that implements the **HTMLMediaElement-compatible
subset** below. Native `<video>` and `<audio>` qualify. Custom media elements, such
as one wrapping a streaming engine, qualify by implementing the subset and
registering. Every capability is optional: the slice that needs a missing capability
stays at its defaults and reports `unsupported`. The capability groups follow
`P/media/src/core/types.ts` and `predicate.ts`.

| Capability | Members | Events |
| --- | --- | --- |
| Playback | `play(): Promise<void>`, `pause()`, `paused`, `ended` | `play`, `playing`, `pause`, `ended`, `waiting` |
| Seek / time | `currentTime`, `duration`, `seeking`, `loop` | `timeupdate`, `durationchange`, `seeking`, `seeked`, `loadedmetadata` |
| Source | `src`, `currentSrc`, `readyState`, `networkState`, `preload`, `crossOrigin`, `load()` | `loadstart`, `emptied`, `canplay`, `canplaythrough`, `loadeddata`, `stalled`, `suspend`, `abort` |
| Buffer | `buffered`, `seekable` (TimeRanges) | `progress` |
| Volume | `volume`, `muted` | `volumechange` |
| Rate | `playbackRate` | `ratechange` |
| Error | `error: {code, message} \| null` | `error` |
| Text tracks | `textTracks` (`addtrack`, `removetrack`, `change`), `<track>` children | `<track>` `load` |
| Audio tracks | `audioTracks` (`enabled`) | list `addtrack`, `removetrack`, `change` |
| Video renditions | `videoRenditions` (`selectedIndex`, items `{id?, width, height, bitrate, frameRate, codec}`) | list `addrendition`, `removerendition`, `change`, `activechange` |
| Picture-in-picture | `requestPictureInPicture()`, `disablePictureInPicture`; WebKit `webkitSetPresentationMode` | `enterpictureinpicture`, `leavepictureinpicture`, `webkitpresentationmodechanged` |
| Remote playback | `remote` (W3C Remote Playback); WebKit AirPlay events | `connecting`, `connect`, `disconnect`; `webkitplaybacktargetavailabilitychanged`, `webkitcurrentplaybacktargetiswirelesschanged` |
| Live | `streamType: 'on-demand'\|'live'\|'unknown'`, `targetLiveWindow`, `liveEdgeStart` | `streamtypechange`, `targetlivewindowchange` |
| Content data | `contentData?: {title?, poster?}` | `contentdatachange` |
| Video dimensions | `videoWidth`, `videoHeight` | `resize` |

**Registration protocol.** A custom media element dispatches a bubbling, composed
`tp-media-register` event. Its detail is `{media, release}`, where `release` is a
callback the provider sets. The provider calls `preventDefault()` to acknowledge it.
The element calls `release()` on disconnect.

**Engines.** HLS and DASH engines are not part of the library. Libraries that drive a
native `<video>` work unchanged, because the store reads the native element. Engines
that expose quality or audio tracks without native lists plug in through
`mediaAdapter` (§4.1). That adapter is an object that implements the `videoRenditions`
and `audioTracks` list contracts above for a given media element.

### 3.2 State model

The store publishes a frozen snapshot. Source state and derived values publish
together. Notifications are batched into one microtask, and subscribers are notified
only when their selected slice changes under shallow equality. `timeupdate` (about
4 Hz) must not re-render controls that do not select time. The table lists each
field's default before attach and its source. Defaults follow
`P/core/src/dom/store/features/*`; deviations are marked ◆ and explained in §9.

| Slice | Field | Type | Default | Source / derivation |
| --- | --- | --- | --- | --- |
| playback | `paused` | boolean | `true` | `media.paused` |
| | `ended` | boolean | `false` | `media.ended` |
| | `started` | boolean | `false` | becomes true once `!paused \|\| currentTime > 0`, and stays true until `emptied` |
| | `waiting` | boolean | `false` | `readyState < HAVE_FUTURE_DATA && !paused` **and** `currentTime` unchanged since starvation began (Safari MSE workaround) |
| | `loop` ◆ | boolean | `false` | `media.loop` (read-only mirror) |
| time | `currentTime` | number (s) | `0` | `media.currentTime`; `timeupdate`/`progress` are ignored while `seeking` so the slider does not snap back |
| | `duration` | number (s) | `0` | finite `media.duration`; if `Infinity`, the end of the last seekable range; otherwise `0` |
| | `seeking` | boolean | `false` | `media.seeking`, set optimistically by `seek()` |
| buffer | `buffered` | `[start, end][]` | `[]` | serialized `media.buffered` |
| | `seekable` | `[start, end][]` | `[]` | serialized `media.seekable` |
| source | `currentSrc` | string | `''` | `media.currentSrc` |
| | `canPlay` | boolean | `false` | `readyState >= HAVE_FUTURE_DATA` |
| | `readyState` ◆ | 0–4 | `0` | `media.readyState` |
| volume | `volume` | 0–1 | `1` | `media.volume` |
| | `muted` | boolean | `false` | `media.muted` |
| | `volumeLevel` | `'off'\|'low'\|'medium'\|'high'` | `'high'` | `off` if muted or 0; `low` < 0.5; `medium` < 0.75; otherwise `high` |
| | `volumeAvailability` | Availability | `'unavailable'` | probe: setting `volume = 0.5` does not stick → `'unsupported'` (iOS) |
| | `mutedAvailability` | Availability | `'unavailable'` | `'available'` when `muted` is defined |
| rate | `playbackRate` | number | `1` | `media.playbackRate`; updated on `ratechange` |
| | `playbackRates` ◆ | `readonly number[]` | `[0.2, 0.5, 0.7, 1, 1.2, 1.5, 1.7, 2]` | root `playback-rates` configuration |
| error | `error` | `{code, message, fatal} \| null` | `null` | `error` event; ◆ also read from `media.error` at attach; cleared on `emptied` or `dismissError()` |
| metadata | `title` | string | `''` | `content-title` ?? `media.contentData.title` ?? `''`; an authored `''` is deliberate and stops the fallback |
| | `poster` | string | `''` | `poster` ?? `media.contentData.poster` ?? `media.poster` ◆ ?? `''` |
| fullscreen | `fullscreen` | boolean | `false` | container or media is the fullscreen element, `:fullscreen` matches, or WebKit presentation mode is `fullscreen` |
| | `fullscreenAvailability` | Availability | `'unavailable'` | `'available'` if `fullscreenEnabled` / `webkitFullscreenEnabled` / `webkitSetPresentationMode` exists, else `'unsupported'` |
| pip | `pictureInPicture` | boolean | `false` | PiP enter/leave events or WebKit presentation mode |
| | `pictureInPictureAvailability` | Availability | `'unavailable'` | `'unsupported'` unless the browser allows it (Safari home-screen apps excluded) and the media is capable; then `'available'` once metadata has loaded |
| remote | `remotePlaybackState` | `'disconnected'\|'connecting'\|'connected'` | `'disconnected'` | W3C `remote` events or WebKit AirPlay events |
| | `remotePlaybackAvailability` | Availability | `'unsupported'` | `watchAvailability` (rejection → `'unsupported'`) or WebKit target availability |
| controls | `userActive` | boolean | `true` | activity owner (§3.6) |
| | `controlsVisible` | boolean | `true` | `locks > 0 \|\| userActive \|\| paused \|\| remote connected/connecting` |
| text tracks | `textTracks` | `{id, kind, label, language, mode}[]` | `[]` | id = `track.id` or `track:<index>:<kind>:<language>:<label>` |
| | `captionsShowing` | boolean | `false` | any captions/subtitles track has `mode === 'showing'` |
| | `chapters` | `{startTime, endTime, text}[]` | `[]` | first `kind="chapters"` track; end clamped to finite duration |
| | `thumbnails` | `{cues, src, crossOrigin} \| null` | `null` | first `kind="metadata" label="thumbnails"` track |
| audio tracks | `audioTracks` | `{id, kind, label, language, enabled}[]` | `[]` | native or adapter `audioTracks` |
| quality | `videoRenditions` | `{id, width?, height?, bitrate?, frameRate?, codec?, selected}[]` | `[]` | native or adapter `videoRenditions` |
| | `activeVideoRendition` | rendition \| null | `null` | `active` flag, else the unique match for `min(videoWidth, videoHeight)` |
| | `autoQuality` | boolean | `true` | `selectedIndex === -1` |
| live | `streamType` | `'on-demand'\|'live'\|'unknown'` | `'unknown'` | `media.streamType`, else `duration === Infinity` → live, finite > 0 → on-demand; overridden by root `stream-type` |
| | `targetLiveWindow` | number | `NaN` | `0` = sliding window, `Infinity` = DVR, `NaN` = on-demand or unknown |
| | `liveEdgeStart` | number | `NaN` | media value when available |
| | `atLiveEdge` | boolean | `false` | `currentTime >= liveEdgeStart − 5` (tolerance), else `currentTime >= seekableEnd − 10` |
| | `dvr` | boolean | `false` | `streamType === 'live' && targetLiveWindow > 0` |

`Availability = 'available' | 'unavailable' | 'unsupported'`:
- `unsupported` means the platform or media can never do this.
- `unavailable` means not right now, for example no metadata, no device or no tracks.

Derived UI availability (constituents compute it; it is not stored):
- captions: at least one captions or subtitles track;
- quality: more than one rendition;
- audio track: more than one track;
- rate: `playbackRates.length > 0`;
- time slider: `duration > 0` or a finite seekable end;
- live button: `streamType === 'live'` and a finite seekable end.

### 3.3 Requests

Every user-facing change goes through `player.request(action, value?, options?)`.
Public convenience methods (§4.1) call it as well. The order is:

1. **Proposal.** Dispatch the cancelable `tp-media-request` event (§3.5). If it is
   cancelled, stop and resolve `false`.
2. **Gate.** If the player is `disabled`, or the needed capability is not
   `available`, reject with `NotSupportedError`.
3. **Execute** against the media or presentation service.
4. **Publish.** Changes reach state through media events. Optimistic updates happen
   only where noted.
5. **Failure.** On rejection, emit `tp-media-request-failed` with the error. The
   returned promise also rejects. Hotkey and gesture paths swallow the rejection
   after the event is emitted.

| Action | Value | Semantics |
| --- | --- | --- |
| `play` | — | Returns `media.play()` as is (an autoplay block rejects with `NotAllowedError`). If `media.paused` becomes false synchronously, `{paused:false, ended:false, started:true}` is published at once. On non-DVR live, it seeks to the live edge first (MC parity). |
| `pause` | — | `media.pause()`, then publishes `paused` at once |
| `toggle-paused` | — | `play` if `paused \|\| ended`, else `pause` |
| `seek` | time (s) | Supersedes any pending seek. Waits for `loadedmetadata` if needed. Clamps to `[seekableStart, duration \|\| seekableEnd]`. Publishes `{currentTime, seeking:true}` optimistically, then writes `currentTime`, waits for `seeked`, and resolves with the actual position. `emptied` aborts a pending seek. |
| `seek-by` | delta (s) | `seek(currentTime + delta)`, clamped (forward is clamped too, unlike MC) |
| `seek-to-percent` | 0–100 | `seek(percent / 100 × timeRangeEnd)` |
| `seek-to-live-edge` | — | `seek(end of last seekable range)` |
| `set-volume` | 0–1 | Clamps. A value > 0 while muted also unmutes. Returns the resulting volume. |
| `set-muted` | boolean | Unmuting at volume 0 sets volume to 0.25 |
| `toggle-muted` | — | `set-muted(!(muted \|\| volume === 0))` |
| `step-volume` | delta (0–1) | `set-volume(volume + delta)` |
| `set-playback-rate` | number | Writes `playbackRate`; state follows `ratechange` |
| `step-playback-rate` | +1 / −1 | Next or previous entry in `playbackRates`, **clamped** ◆ (Video.js wraps; §9) |
| `request-fullscreen` / `exit-fullscreen` / `toggle-fullscreen` | — | §3.9 |
| `request-picture-in-picture` / `exit-…` / `toggle-…` | — | §3.9; requesting before metadata rejects with `InvalidStateError` |
| `prompt-remote-playback` | — | Exits fullscreen, then calls `remote.prompt()`; when connected the prompt is used to disconnect |
| `select-text-track` | id \| null | Shows exactly one captions or subtitles track (`mode='showing'`, others `'disabled'`). `null` disables all. An unknown id is a no-op that emits a diagnostic. |
| `toggle-captions` | force? | Off disables all. On selects: the currently showing track, else the last shown, else the track matching the player locale, else the first. Resolves the resulting `captionsShowing`. |
| `select-audio-track` | id | Enables only that track |
| `select-video-rendition` | id \| `'auto'` | `'auto'` sets `selectedIndex = -1` (adaptive bitrate); otherwise the matching index |
| `toggle-controls` | force? | Shows or hides the controls (§3.6) |
| `dismiss-error` | — | Sets `error` to `null`; the media element keeps its own error |
| `lock-orientation` | — | Internal: while fullscreen, if `orientation-lock` is not `none`, locks `screen.orientation`; rejections are ignored |

Requests are never globally locked while an error is present (§9). Calling a request
with no capability uses the gate in step 2.

### 3.4 Disabled and hidden policy (`V/internal/design/ui/disabled-hidden.md`)

- **Inert, not removed.** A control that cannot act now but may later
  (`unavailable`, a root `disabled`, or live at the live edge) stays focusable with
  `aria-disabled="true"`, so its tooltip can still explain why. It never uses native
  `disabled`. This relies on the existing `tp-button`
  `focusableWhenDisabled` behavior.
- **Hidden.** A control whose feature is `unsupported`, or whose list is empty, gets
  the native `hidden` attribute and `data-hidden`. It is removed from the
  accessibility tree, and no layout space is reserved for it.
- **Remote playback exception.** Its control is hidden only when `unsupported`, and
  is disabled when no device is found.
- **Markers.** Every media control publishes `data-availability`
  (`available|unavailable|unsupported`), `data-disabled` and `data-hidden`.

### 3.5 Events (proposed vocabulary)

All events bubble and are composed.

| Event | Cancelable | Detail | When |
| --- | --- | --- | --- |
| `tp-media-request` | yes | `{action, value, reason, sourceEvent, trigger}` | Before any user, hotkey, gesture or programmatic request |
| `tp-media-request-failed` | no | `{action, value, reason, error}` | A request rejected or failed |
| `tp-media-state-change` | no | `{changed: string[], state, previousState, reason}` | After each published batch; `reason` is `media` for element-originated changes |
| `tp-media-error` | no | `{error}` | `error` goes from `null` to non-null |
| `tp-media-attach` / `tp-media-detach` | no | `{media, container}` | The store attaches to or detaches from a target |
| `tp-value-change` / `tp-value-commit` | per Slider | as Slider | Re-emitted by the composed `tp-slider` inside the time and volume sliders |
| `tp-open-change` | per Menu/Popover | as owner | From composed menus and popovers |

New `ChangeReason` members (§7.2):
- `media`: the media element changed state on its own;
- `hotkey`;
- `gesture`;
- `idle`: activity timeout.

Existing reasons cover the rest: `keyboard`, `pointer`, `drag`, `track-press`,
`wheel`, `programmatic`, `imperative-action`.

### 3.6 Activity and idle autohide (`sec-1922-activity-and-idle`)

This follows `V/packages/core/src/dom/store/features/controls.ts` and
`MC/src/js/media-container.ts`, with a configurable delay.

**Timing:**
- `idle-delay` defaults to 2000 ms. A value ≤ 0 disables autohide.
- Taps last ≤ 250 ms.
- After touch, synthetic `mouseleave` and `focusin` events are ignored for 500 ms.

**Listeners on the container:**

| Input | Effect |
| --- | --- |
| `pointermove`, mouse or pen | Becomes active and restarts the timer |
| `pointermove`, touch | Only restarts the timer |
| `pointerdown`, `keydown`, `keyup`, `focusin` | Becomes active |
| `mouseleave` | Inactive immediately |
| Touch tap ≤ 250 ms on the media or a non-interactive container area | Toggles visibility, unless a gesture binding claims the tap |

The media's `play`, `pause` and `ended` events recompute visibility. Remote playback
events also recompute it.

**Controls locks.** `requestControlsLock(): () => void` is reference-counted. Its
release function is idempotent, and releasing the last lock restarts the full idle
window. The following take locks:
- an open menu or popover inside the player;
- a slider during a press or drag;
- focus inside the controls;
- the pointer over the controls, unless `hide-over-controls` is set (MC
  `autohideovercontrols` parity).

A focused control never disappears.

**Lease owner.** Implement locks as reason leases extracted from `CarouselAutoplay`
(§7.7), so one released reason cannot cancel another.

**On hiding:**
- Close open popups with reason `idle`.
- Do not move focus.
- Publish `controlsVisible` and set `data-controls-visible` on the container.
- Hide the cursor over the media through presentation only.

### 3.7 Key bindings (`sec-1920-key-bindings`, shared owner)

The player is the first consumer of a new Foundation key-binding owner (§7.5).
Navigation Panel, Carousel and Toolbar must migrate their duplicated "does the
target own this key" checks onto it.

**Scope:**
- Bindings register on the container (`keydown`, `hotkey-scope="player"`, the
  default), so several players never compete.
- `hotkey-scope="document"` listens on the owner document. Only the **most recently
  active** player handles a document-scoped event. This is the routing the Video.js
  design record describes but its code omits (§9).

**Key-pattern syntax:**
- Combinations are joined with `+`.
- `Mod` means Meta on macOS and Ctrl elsewhere.
- `Space` means `' '`.
- `0-9` expands to ten bindings.
- Shift/Alt are implied for shifted symbols (`>`, `<`, `?`).
- Modifiers must otherwise match exactly.

**Skipped when:**
- `event.defaultPrevented` is set or `componentHandlingPrevented` is true;
- the key is `Unidentified` (IME composition);
- it is Space or Enter on an activatable element (button, link, `[role=slider]`,
  `[role=button]`, menu items);
- it is an unmodified single key while the target is editable;
- the player is `disabled` or interaction-locked (container-modal error dialog);
- the target is inside a composed slider or menu that owns the key (those handle it
  first, in the capture phase).

**Priority:** the binding with more modifiers wins; ties go to the first registered.
A matched binding calls `preventDefault()`.

**Repeat:** `toggle-*` actions do not repeat while held; step actions do.

**Publication:** controls whose action has a binding expose `aria-keyshortcuts` (ARIA
form, e.g. `Control+Shift+f`) and a display form for tooltips and `tp-key-hint`.
The owner emits `tp-shortcut-change` when bindings change.

**Default map** (`hotkeys="default"`; `V/packages/skins/src/skins/shared/behaviors/playback-hotkeys.tsx`):

| Keys | Action | Value |
| --- | --- | --- |
| `Space`, `k` | `toggle-paused` | — |
| `m` | `toggle-muted` | — |
| `ArrowRight`, `l` / `ArrowLeft`, `j` | `seek-by` | +`seek-step` / −`seek-step` (default 10) |
| `ArrowUp` / `ArrowDown` | `step-volume` | ±`volume-step` (default 0.05) |
| `0`–`9` | `seek-to-percent` | digit × 10 |
| `Home` / `End` | `seek-to-percent` | 0 / 100 |
| `>` / `<` | `step-playback-rate` | +1 / −1 |
| `f` | `toggle-fullscreen` | — |
| `c` | `toggle-captions` | — |
| `i` | `toggle-picture-in-picture` | — |

**Live streams:**
- Seek bindings are inactive when `dvr` is false.
- Rate bindings are inactive while live.

**Custom bindings:** `tp-media-hotkey` elements add, override or disable bindings
(§4.7). `hotkeys="none"` removes the default map but keeps authored
`tp-media-hotkey` elements.

**Shortcut help:** a dialog listing the active bindings is an optional documented
composition (`tp-dialog` + `tp-key-hint`), not a built-in.

### 3.8 Tap gestures (`sec-1921-tap-gesture-regions`, shared owner)

This follows `V/packages/core/src/dom/gesture/`.

**Recognition:**
- Primary button only.
- A tap is a press of ≤ 250 ms that started on a non-interactive target inside the
  container. `[data-interactive]` (controls content) and interactive selectors are
  excluded.
- Ignored while the player is interaction-locked.

**Double-tap:**
- The window is 200 ms.
- When any double-tap binding exists, a single tap waits for that window before
  firing.
- Bindings are re-resolved when the gesture fires.

**Regions:** `left` + `right` split the surface into halves; three regions split it
into thirds; `center` alone covers the whole surface. A region match beats a
full-surface match.

**Default video set** (`gestures="default"`):

| Gesture | Action |
| --- | --- |
| Mouse tap | `toggle-paused` |
| Touch tap | `toggle-controls` |
| Double-tap left / right | `seek-by` ∓`seek-step` |
| Double-tap center | `toggle-fullscreen` |

Live without DVR drops the seek double-taps. The root defaults to `gestures="none"`;
the video layout sets `default`.

Gestures are pointer conveniences. Each one duplicates a focusable control or a
hotkey, so no function depends on a gesture.

### 3.9 Presentation services (`sec-1924-media-presentation`)

**Fullscreen:**
- **Request** (it exits picture-in-picture first). The first option available is used:
  1. `container.requestFullscreen()` or its WebKit variant;
  2. iOS `webkitSetPresentationMode('fullscreen')` (native UI);
  3. `media.requestFullscreen()`.
- **Exit:** WebKit `inline`, `document.exitFullscreen()` or its WebKit variant, or
  the media method.
- **Change sources:** owner-document `fullscreenchange` / `webkitfullscreenchange`
  and `webkitpresentationmodechanged`.
- **Gesture requirement:** browsers that require a user gesture reject the request.
  The rejection passes through as `tp-media-request-failed`.

**Picture-in-picture:**
- Request exits fullscreen first. Exit uses WebKit `inline` or
  `document.exitPictureInPicture()`.
- The Document Picture-in-Picture API is out of scope (§11).

**Orientation lock:**
- Opt-in through `orientation-lock`: `none` (default) or any
  `OrientationLockType`.
- While fullscreen it calls `screen.orientation.lock`, serialized so the last call
  wins, and unlocks on exit or detach.

**Anchored surfaces while fullscreen:**
- Menus, popovers and tooltips owned by the player portal into the **container**
  (`container` = container element), so they stay inside the fullscreen subtree.
- Entering fullscreen runs the HTML "hide all popovers" step. Surfaces that were
  open receive `tp-open-change` with reason `imperative-action` and do not reopen
  on their own.
- This needs verification in Chrome (§12, S-FS-*).

**Escape:** native fullscreen owns Escape. The player adds no `CloseWatcher`.

### 3.10 Text tracks, chapters and thumbnails

**Captions rendering:**
- Captions use the browser's **native cue rendering**, so the user's OS caption
  preferences apply (`V/internal/decisions/ui/captions.md`).
- When controls are visible, the player sets `--tp-media-caption-offset` so
  presentation can lift cues where the engine supports it (`::cue` and
  `::-webkit-media-text-track-container`).
- A custom cue renderer is out of scope (§11).

**Track ordering:** tracks are grouped by kind (captions, then subtitles). Labels
fall back in this order: `label`, then the localized language name
(`Intl.DisplayNames`), then the `captions` / `subtitles` message.

**Chapters:**
- Cues are normalized: non-finite cues are filtered out, the rest are sorted,
  clamped to `[0, duration]` and overlaps are trimmed.
- Untitled gaps are filled so the ranges are contiguous.
- Each range gets a stable key: `cue-<id>-<start>-<text>`.

**Thumbnails:**
- **Cue format:** each cue's text is a URL, resolved against the track `src`. An
  optional `#xywh=x,y,w,h` media fragment selects a sprite cell.
- **Active cue:** the last cue with `startTime <= time`.
- **Failed sources:** remembered and not retried.
- **Cross-origin:** inherited from the media's CORS mode unless set explicitly.
- **Parser:** `xywh` parsing is a new Foundation utility (§7.9).

### 3.11 Live

`stream-type`:
- `auto` (default) detects as described in §3.2.
- `on-demand` or `live` forces the value.

The live preset behavior follows `V/internal/design/ui/live-presets.md`:
- **No DVR:** the time slider is hidden and rate controls are hidden. The live
  button shows the edge state. `play` jumps to the live edge.
- **DVR:** the time slider spans the seekable window. `min`/`max` update without
  emitting value events (§7.1). Remaining time is measured from the live edge.

### 3.12 Announcements (`sec-1923-live-announcer`, shared owner)

Each player has **one** polite status region. It uses a new Foundation announcer
(§7.8) and is visually hidden by default. Announcements follow
`P/core/src/core/ui/status-announcer/`:

| Change | Message key | Timing |
| --- | --- | --- |
| Paused / playing | `statusPaused` / `statusPlaying` | Immediate |
| Captions on / off | `statusCaptionsOn` / `statusCaptionsOff` | Immediate |
| Fullscreen entered / exited | `statusFullscreen` / `statusExitFullscreen` | Immediate |
| PiP entered / exited | `statusPictureInPicture` / `statusExitPictureInPicture` | Immediate |
| Rate changed | `statusPlaybackRate` | Immediate |
| Volume / mute | `statusMuted` / `statusVolume` | Debounced 200 ms |
| Seek completed | `statusSeekedTo` | Debounced 200 ms |

**Rules:**
- Simultaneous changes are joined with `". "`.
- Debounced messages are suppressed while a slider has focus, because the slider's
  own value text already speaks.
- The text clears after 800 ms.
- Changes with reason `media` (for example, autoplay starting) are not announced.
- `announcements="off"` disables the region.

**Buffering** is never announced from the live region; buffering state is exposed
only through the buffering indicator (§4.6).

**Visual feedback indicators** (§4.6) are decorative and `aria-hidden`.

### 3.13 Localization and formatting

- **Messages.** `messages: MediaPlayerMessages` (property only, default `{}`) is a
  partial dictionary on the root. Each entry is a `string` or a
  `(params) => string`, with English fallbacks. Constituents inherit it through the
  owner lookup, and each constituent can override entries with its own `messages`.
  This extends the Calendar Amendment 2 / Carousel pattern to a compound provider,
  which needs a contract amendment (§7.4).
- **Locale.** `locale` (default: resolved through `resolveLocale()`) **only formats**
  times, numbers, percentages and language names. It never selects translations.
- **Diagnostics** are never localized.
- **Clock text** uses the new `LocaleService.duration(seconds, {style: 'digital', guide})`
  (§7.10), following Video.js `formatTime`:
  - invalid values render `0:00`;
  - hours appear when the value or the guide is ≥ 1 h, and the hour is not
    zero-padded;
  - minutes are padded when hours are shown or the guide is ≥ 10 min;
  - digits come from `Intl.NumberFormat`.
- **Spoken text** uses `duration(seconds, {style: 'long'})`, built from `Intl` unit
  formatting and list formatting, e.g. "1 minute, 5 seconds".
- **Rate labels** use `${rate}×` (U+00D7).

`MediaPlayerMessages` keys and English defaults (Video.js `P/core/src/core/i18n/locales/en.ts`, renamed to camelCase entries):

| Key | Default | Key | Default |
| --- | --- | --- | --- |
| `player` | Media player | `play` | Play |
| `pause` | Pause | `replay` | Replay |
| `mute` | Mute | `unmute` | Unmute |
| `seekForward` | `({seconds}) =>` Seek forward {seconds} seconds | `seekBackward` | Seek backward {seconds} seconds |
| `enterFullscreen` | Enter fullscreen | `exitFullscreen` | Exit fullscreen |
| `enterPictureInPicture` | Enter picture-in-picture | `exitPictureInPicture` | Exit picture-in-picture |
| `enableCaptions` | Enable captions | `disableCaptions` | Disable captions |
| `startRemotePlayback` | Start casting | `stopRemotePlayback` | Stop casting |
| `connecting` | Connecting | `live` | Live |
| `playingLive` | Playing live | `seekToLiveEdge` | Seek to live edge |
| `seek` | Seek | `volume` | Volume |
| `volumeValue` | `({percent})` {percent} | `mutedValue` | {percent}, muted |
| `playbackRate` | `({rate})` Playback rate {rate} | `currentTime` | Current time |
| `duration` | Duration | `remainingTime` | Remaining |
| `timePosition` | {current} of {duration} | `timeUnknown` | Media not loaded, unknown time. |
| `showRemaining` | Show remaining time, {duration}. | `showElapsed` | Show elapsed time, {duration}. |
| `remainingSuffix` | {duration} remaining | `elapsedSuffix` | {duration} elapsed |
| `toggleTimeDescription` | Toggle between elapsed and remaining time. | `settings` | Settings |
| `speed` | Speed | `quality` | Quality |
| `audio` | Audio | `captions` | Captions |
| `subtitles` | Subtitles | `off` | Off |
| `auto` | Auto | `autoWithLabel` | `({label})` Auto ({label}) |
| `back` | Back | `normalSpeed` ◆ | Normal |
| `statusPaused` | Paused | `statusPlaying` | Playing |
| `statusCaptionsOn` | Captions on | `statusCaptionsOff` | Captions off |
| `statusFullscreen` | Fullscreen | `statusExitFullscreen` | Exit fullscreen |
| `statusPictureInPicture` | Picture in picture | `statusExitPictureInPicture` | Exit picture in picture |
| `statusPlaybackRate` | Playback rate {rate} | `statusMuted` | Muted |
| `statusVolume` | Volume {percent} | `statusSeekedTo` | Seeked to {time} |
| `errorTitle` | Something went wrong. | `errorAborted` | You stopped media playback before it finished. |
| `errorNetwork` | This media could not be loaded due to a network or server issue. | `errorDecode` | This media could not be played. It may be corrupted, or your browser may not support its format. |
| `errorSource` | This media could not be loaded. It may be unavailable, or your browser may not support its format. | `errorEncrypted` | This media could not be played because it could not be decrypted. |
| `errorUnplayable` | This media is unsupported by the player. | `errorUnexpected` | An unexpected error occurred. |
| `retry` ◆ | Retry | `dismiss` | OK |

The `errorAborted` through `errorEncrypted` strings match `MediaError.defaultMessages`
(codes 1–5) in `P/media/src/core/media-error.ts` word for word.

## 4. Library contract: `ucl21-media-player` (proposed)

### 4.0 Anatomy

```
tp-media-player                     root / provider (display: contents unless it is the container)
├─ <video> | <audio> | custom media (slotted light DOM)
├─ tp-media-container               optional container (fullscreen, activity, hotkeys, gestures)
├─ tp-media-poster
├─ tp-media-title
├─ tp-media-buffering-indicator     composes tp-spinner
├─ tp-media-error-dialog            composes tp-alert-dialog (container-modal)
├─ tp-media-controls                visibility region (auto | always)
│  └─ tp-media-controls-group       optional labelled group
│     ├─ tp-media-play-button        ┐
│     ├─ tp-media-seek-button        │
│     ├─ tp-media-mute-button        │ each composes tp-button + tp-icon,
│     ├─ tp-media-captions-button    │ wrapped in tp-tooltip by layouts
│     ├─ tp-media-fullscreen-button  │
│     ├─ tp-media-pip-button         │
│     ├─ tp-media-remote-playback-button
│     ├─ tp-media-playback-rate-button
│     ├─ tp-media-live-button        ┘
│     ├─ tp-media-volume-slider      composes tp-slider (vertical or horizontal)
│     ├─ tp-media-volume-popover     preset: tp-popover(hover) + mute button + volume slider
│     ├─ tp-media-time               current | duration | remaining | pointer (optional toggle)
│     ├─ tp-media-time-slider        composes tp-slider (+ buffer, pointer, chapters)
│     │  └─ tp-media-time-slider-preview
│     │     ├─ tp-media-thumbnail
│     │     ├─ tp-media-chapter-title
│     │     └─ tp-media-time type="pointer"
│     └─ tp-media-settings-menu      preset: tp-menu + submenus of the radio groups below
│        ├─ tp-media-playback-rate-radio-group   (extends tp-menu-radio-group)
│        ├─ tp-media-captions-radio-group
│        ├─ tp-media-audio-track-radio-group
│        └─ tp-media-quality-radio-group
├─ tp-media-status-indicator        decorative feedback for hotkeys and gestures
├─ tp-media-seek-indicator
├─ tp-media-volume-indicator
├─ tp-media-hotkey                  0..n declarative bindings (non-visual)
└─ tp-media-gesture                 0..n declarative bindings (non-visual)

Layouts (preset compositions): tp-media-video-layout, tp-media-audio-layout
```

Catalog kinds:
- `tp-media-player` is a `compound-reexport` root.
- `tp-media-volume-popover`, `tp-media-settings-menu`, `tp-media-video-layout` and
  `tp-media-audio-layout` are `preset-composition`.
- The buttons and sliders are `thin-wrapper` over `tp-button` and `tp-slider`.
- Each new tag needs a catalog tuple, a definition (`sourceNode: 'ucl21-media-player'`),
  part bindings, registration and `HTMLElementTagNameMap` typing.

**Inherited `TpElement` API exposure.** Only `disabled` is public on media
constituents. `readOnly`, `invalid` and `required` are not applicable and are
documented as such. `orientation` is public only on the sliders and on
`tp-media-controls-group`.

### 4.1 `tp-media-player`

**Properties:**

| Property | Attribute | Type | Default | Meaning |
| --- | --- | --- | --- | --- |
| `contentTitle` | `content-title` | string \| null | `null` | Title; falls back to media content data |
| `poster` | `poster` | string \| null | `null` | Poster URL; falls back to media content data or `video.poster` |
| `streamType` | `stream-type` | `auto\|on-demand\|live` | `auto` | §3.11 |
| `playbackRates` | `playback-rates` | number[] (space-separated) | `0.2 0.5 0.7 1 1.2 1.5 1.7 2` | Options for the rate controls; must be sorted and positive, otherwise a diagnostic is emitted and the default is used |
| `seekStep` | `seek-step` | number (s) | `10` | Default step for hotkeys, gestures and seek buttons without a value |
| `volumeStep` | `volume-step` | number (0–1) | `0.05` | Volume step for hotkeys and indicators |
| `idleDelay` | `idle-delay` | number (ms) | `2000` | ≤ 0 disables autohide |
| `hideOverControls` | `hide-over-controls` | boolean | `false` | Allows hiding while the pointer is over the controls |
| `hotkeys` | `hotkeys` | `default\|none` | `default` | §3.7 |
| `hotkeyScope` | `hotkey-scope` | `player\|document` | `player` | §3.7 |
| `gestures` | `gestures` | `default\|none` | `none` | §3.8 |
| `orientationLock` | `orientation-lock` | `none\|OrientationLockType` | `none` | §3.9 |
| `announcements` | `announcements` | `polite\|off` | `polite` | §3.12 |
| `messages` | — | `MediaPlayerMessages` | `{}` | §3.13 |
| `locale` | `locale` | string | resolved | Formatting only |
| `mediaAdapter` | — | `MediaTracksAdapter \| null` | `null` | Engine-provided renditions and audio tracks (§3.1) |
| `disabled` | `disabled` | boolean | `false` | Every control becomes `aria-disabled`, and hotkeys and gestures stop. The media is not paused. |

**Read-only:**
- `state` (frozen snapshot);
- `media` (attached target or `null`);
- `container`.

**Methods:**
- `request(action, value?)`;
- the convenience methods, each returning a Promise: `play()`, `pause()`,
  `togglePaused()`, `seek(t)`, `seekBy(d)`, `seekToLiveEdge()`, `setVolume(v)`,
  `setMuted(m)`, `setPlaybackRate(r)`, `requestFullscreen()`, `exitFullscreen()`,
  `requestPictureInPicture()`, `exitPictureInPicture()`, `promptRemotePlayback()`,
  `selectTextTrack(id|null)`, `toggleCaptions(force?)`, `selectAudioTrack(id)`,
  `selectVideoRendition(id|'auto')`, `toggleControls(force?)`, `dismissError()`;
- `requestControlsLock(): () => void`;
- `subscribe(selector, callback, {equality?, signal?}): () => void`.

**Markers on the container:**
- playback: `data-paused`, `data-ended`, `data-started`, `data-waiting`, `data-seeking`;
- volume: `data-muted`, `data-volume-level`;
- presentation: `data-fullscreen`, `data-pip`, `data-captions-showing`,
  `data-controls-visible`, `data-user-active`;
- `data-stream-type`, `data-live-edge`, `data-error`;
- `data-media-type="video|audio"`.

**ARIA on the container:**
- `role="group"` and `tabindex="0"` unless authored. The tab stop is needed so
  player-scoped hotkeys can receive focus.
- `aria-label` = the `player` message, unless `aria-label` or `aria-labelledby` was
  authored. It re-resolves when messages change.
- `pointerup` on the media surface focuses the container (`preventScroll`), unless
  focus is already inside.

**Events:** those in §3.5.

**Slots:**
- the default slot holds the media and all constituents;
- the root renders no visual structure of its own.

### 4.2 Buttons

All media buttons compose an internal `tp-button` (`variant="ghost"`,
`size="icon"`) and a `tp-icon`.

**Exposed parts:** `button` and `icon`. Public `variant` and `size` forward to the
composed button.

**State and labelling:**
- The accessible name is the **state-dependent label**: the button swaps its
  `aria-label`.
- No button uses `aria-pressed` (§12, D2).
- `aria-keyshortcuts` is published when a binding exists.
- Unavailable states use `focusableWhenDisabled`.

**Icon slots:** each state's icon can be replaced through a named slot, e.g.
`<svg slot="pause">`. Unslotted states fall back to the library media icons (§7.9).

**Common properties:** `disabled`, `label` (overrides the resolved message for every
state), `messages`, `variant` and `size`.

| Element | Reads | Action on activation | Label (by state) | Markers | Hidden when |
| --- | --- | --- | --- | --- | --- |
| `tp-media-play-button` | playback | `toggle-paused` | `replay` if ended, `play` if paused, else `pause` | `data-paused`, `data-ended`, `data-started` | never |
| `tp-media-mute-button` | volume | `toggle-muted` | `unmute` if muted or 0, else `mute` | `data-muted`, `data-volume-level` | `mutedAvailability !== 'available'` |
| `tp-media-seek-button` (`seconds`, default = player `seek-step`; negative = backward) | time | `seek-by seconds` | `seekForward` / `seekBackward` with `abs(seconds)` | `data-direction`, `data-seeking` | never; disabled without a time range |
| `tp-media-fullscreen-button` | fullscreen | `toggle-fullscreen` | `enterFullscreen` / `exitFullscreen` | `data-fullscreen`, availability | unsupported |
| `tp-media-pip-button` | pip | `toggle-picture-in-picture` | `enterPictureInPicture` / `exitPictureInPicture` | `data-pip`, availability | `!pictureInPicture && availability !== 'available'` |
| `tp-media-captions-button` | text tracks | `toggle-captions` | `disableCaptions` / `enableCaptions` | `data-active`, availability | no captions or subtitles tracks |
| `tp-media-playback-rate-button` | rate | `step-playback-rate +1`, **wrapping** (cycle button) | `playbackRate` with the current rate | `data-rate`; visible text `${rate}×` | no rates or live |
| `tp-media-live-button` | live, time | `seek-to-live-edge` | `playingLive` at the edge, otherwise `seekToLiveEdge`; visible text `live` | `data-live`, `data-live-edge` | not live; `aria-disabled` at the edge |
| `tp-media-remote-playback-button` | remote | `prompt-remote-playback` | `startRemotePlayback` / `stopRemotePlayback` / `connecting` | `data-remote-state`, availability | unsupported only (disabled when unavailable) |

**Seek buttons** support hold-to-repeat with the existing `PressAndHold` when
`repeat` is set. It is off by default.

**Pointer activation of fullscreen** focuses the container afterwards, so hotkeys
keep working (Video.js parity).

**Menu-trigger mode.** When the captions button or rate button is used as a
`tp-menu` trigger, it stops toggling or cycling and opens the menu instead.

### 4.3 Sliders

Both sliders **compose `tp-slider`** with the shared extensions in §7.1. They are
not form-associated: they have no `name` and submit no form value (§12, D6). They
re-emit the slider's `tp-value-change` and `tp-value-commit`.

**Parts:**
- forwarded from Slider: `slider`, `slider-track`, `slider-range`, `slider-thumb`;
- new: `slider-buffer` (time slider only) and `slider-chapter` (0..n).

**State markers:** `data-dragging`, `data-pointing`, `data-interactive`,
`data-seeking` (time slider), `data-disabled` and `data-availability`.

**CSS variables published on the root:**

| Variable | Meaning |
| --- | --- |
| `--tp-media-slider-fill` | Percentage |
| `--tp-media-slider-pointer` | Percentage of the last pointer, drag or key position |
| `--tp-media-slider-buffer` | Percentage; time slider only |

They are registered with `@property <percentage>` so they can animate.

**`tp-media-time-slider`:**

| Property | Attribute | Default | Meaning |
| --- | --- | --- | --- |
| `step` | `step` | `1` (s) | Arrow-key step |
| `largeStep` | `large-step` | `10` (s) | Page Up/Down and Shift+Arrow step |
| `liveSeek` ◆ | `live-seek` | `false` | `false`: seek on commit only (release or key press, Video.js). `true`: also seek during drag, throttled by `change-throttle` (MC parity) |
| `changeThrottle` | `change-throttle` | `100` (ms) | Leading and trailing throttle for live seeking |
| `pauseOnDrag` | `pause-on-drag` | `false` | Pause at drag start and resume at drag end if playback was running; safe if the slider is torn down mid-drag |
| `showChapters` | `show-chapters` | `true` | Render chapter segments when a chapters track exists |
| `messages` | — | inherited | |

- **Value and range.** `min` is the seekable start (0 for on-demand). `max` is the
  duration or the seekable end. `value` is `currentTime`, or the drag value while
  dragging.
- **Before metadata.** The range is *indeterminate* (§7.1): it is disabled, has
  `aria-valuetext` = `timeUnknown`, and emits no configuration error.
- **ARIA.** The label is `seek`. `aria-valuetext` is
  `timePosition({current, duration})` using long phrases, or only `{current}` when
  the duration is infinite.
- **Live announcements.** Value changes are never announced through a live region.
- **Timeline direction.** The timeline stays chronological left-to-right in RTL
  documents (Video.js parity, §12, D4). Labels and layout mirror.
- **Buffer.** `--tp-media-slider-buffer` is the end of the buffered range that
  contains `currentTime`, or else the last one. The `slider-buffer` part draws one
  range. Drawing every range is a documented `partContracts` customization, not the
  default.
- **Chapters.** `slider-chapter` parts are generated per normalized range. Each has
  `data-active` (playback is inside it) and `data-highlighted` (the pointer is
  inside it), and the variables `--tp-media-chapter-start`, `--tp-media-chapter-width`,
  `--tp-media-chapter-fill` and `--tp-media-chapter-buffer`. Chapter parts are
  `aria-hidden`.
- **Controls lock.** A press takes a controls lock until `lostpointercapture`.
  Pointer down stops propagation so gestures do not see a tap.

**`tp-media-time-slider-preview`:**
- Positioned on the slider's horizontal pointer axis, clamped inside the track by
  default (`overflow="clamp"`, or `visible`).
- Visible while `data-pointing` or `data-dragging` is set.
- Decorative (`aria-hidden`).
- Positioning reuses the existing `positionSurface` with a virtual anchor and
  `trackCursorAxis="horizontal"`. It is not a separate positioning engine, and it is
  not a `tp-tooltip`, because tooltip semantics would add a description (§8).
- When the slider is vertical, the preview is hidden unless authored.

**`tp-media-volume-slider`:**
- Range 0–100, `step` 5, `large-step` 10, `wheel-step` 5. The wheel uses the existing
  Slider `wheel` reason.
- It sets volume live on every change. The fill is 0 when muted.
- The label is `volume`. `aria-valuetext` is the localized percent, or
  `mutedValue({percent})` when muted.
- It is hidden when `volumeAvailability === 'unsupported'`.
- `orientation` defaults to `vertical` inside `tp-media-volume-popover`, and to
  `horizontal` elsewhere.

### 4.4 Time and poster

**`tp-media-time`:**

| Property | Attribute | Default | Meaning |
| --- | --- | --- | --- |
| `type` | `type` | `current` | `current\|duration\|remaining\|pointer` (`pointer` is valid only inside a time-slider preview) |
| `toggle` | `toggle` | `false` | Becomes a button that switches `current` ↔ `remaining` (or `duration` ↔ `remaining`) |
| `negativeSign` | `negative-sign` | `-` | Sign for remaining time; rendered `aria-hidden` |
| `messages` | — | inherited | |

- **Rendering.** It renders a native `<time datetime="PT…S">` (part `time`). Video.js
  uses a non-standard `role="time"`, which we reject (§9).
- **Accessible name.** The element has no live region. Its accessible name comes
  from `currentTime`, `duration` or `remainingTime`.
- **Toggle mode.** The element renders a composed `tp-button` (`variant="ghost"`)
  whose name is `showRemaining({duration})` or `showElapsed(…)`, with an
  `aria-description` of `toggleTimeDescription`.
- **Formatting** is digital (§3.13), and the duration is the guide.
- **Separators** between times are authored text marked `aria-hidden`. No
  separator element exists.

**`tp-media-poster`:**
- Shown while `!started`, plus ◆ while `ended` if `show-on-ended` is set (default
  `false`).
- Renders a fallback `<img part="image" alt="" decoding="async">`, or adopts an
  authored slotted `<img>`. The `src` is written only if the authored image has none
  (`V/internal/decisions/ui/skin-images-are-authorable.md`).
- `object-fit` follows `--tp-media-object-fit` (default `contain`).
- **Markers:** `data-visible`, `data-loading`, `data-loaded`, `data-error`.
- **Load-state logic.** The image load-state logic is shared with Avatar's loading
  status. Extract it to Foundation and consume it from both components, rather than
  copying it (§7.11).

**`tp-media-title`:**
- Renders `state.title`. It is `hidden` when empty.
- It updates text only when the value changes, so screen readers do not re-announce
  it.
- Marker: `data-visible`, which follows `controlsVisible`.

### 4.5 Menus

**`tp-media-<x>-radio-group`** extends `tp-menu-radio-group`. It generates its
`tp-menu-radio-item`s from store state and requests the selection. Item generation
can be customized with a `renderItem(option)` property returning a Lit template that
must render a `tp-menu-radio-item`.

| Element | Options | Value | Available when | Group label |
| --- | --- | --- | --- | --- |
| `tp-media-playback-rate-radio-group` | `playbackRates`, labelled `${rate}×`; 1 is labelled `normalSpeed` ◆ | rate number (`Object.is`) | rates > 0 and not live | `speed` |
| `tp-media-captions-radio-group` | `off`, then one per track (label → language name → `captions`/`subtitles`) | track id \| `'off'` | ≥ 1 track | `captions` |
| `tp-media-audio-track-radio-group` | one per track (label → language name → kind → `audio`) | track id | > 1 track | `audio` |
| `tp-media-quality-radio-group` | `auto` (`autoWithLabel` while adaptive with a known active rendition), then renditions labelled `{shortSide}p` (snapped to 4320/2160/1440/1080/720/480/360/240), else bitrate | rendition id \| `'auto'` | > 1 rendition | `quality` |

- Option items carry `data-track` or `data-rendition`.
- An optional `tier` (8K/4K/HD) and a disambiguating bitrate `badge` are rendered
  through `tp-badge`.

**`tp-media-settings-menu`** (preset composition) contains:
- a trigger: a composed `tp-button` with the settings icon and the `settings` label;
- a `tp-menu` with one nested `tp-menu` submenu per **available** group.

**Submenus:**
- **Trigger.** Each submenu trigger shows the group label and, as a hint, the
  currently selected option.
- **Interaction.** The existing Menu nested-submenu behavior applies: inline forward
  and back, typeahead, roving focus, and focus return.
- **Mode.** Whether submenus render as pages inside one popup (Video.js) or as
  flyouts (Menu default) is decided in §12, D5.
- **Empty groups.** A group with no options is omitted. When no group is available,
  the trigger is `hidden`.
- **Controls lock.** The open menu holds a controls lock and portals into the
  container.
- **Hotkeys.** Navigation keys are consumed by the Menu and never reach player
  hotkeys.

### 4.6 Feedback

**`tp-media-buffering-indicator`:**
- Composes `tp-spinner` with an **empty label**, which makes it decorative and adds
  no status region.
- Visible after `delay` (default 500 ms) of `waiting && !paused`.
- Marker: `data-visible`.

**`tp-media-error-dialog`:**
- Composes `tp-alert-dialog`. It opens when `error` becomes non-null.
- **Title and description.** The title is `errorTitle`. The description comes from
  the matching `error*` message, else the error's own message, else
  `errorUnexpected`.
- **Actions.** `dismiss` calls `dismissError()`. `retry` is shown when
  `show-retry` is set (default `false`); it calls `media.load()` and then `play()`.
- **Container-modal.**
  - When not fullscreen, the dialog is modal only within the container: siblings
    inside the container become `inert`, and hotkeys and gestures are locked.
  - Error code 1 (aborted) does not open the dialog (MC parity).
  - Focus returns to the previously focused control.
  - In fullscreen, the dialog portals into the container.

**`tp-media-status-indicator`, `tp-media-seek-indicator`, `tp-media-volume-indicator`:**
- These are decorative `aria-hidden` flashes that respond only to hotkey and gesture
  actions (`P/core/src/core/ui/indicator/`).
- **Snapshot.** Each reads a snapshot taken *before* the action.
- **Timing.** One indicator is visible per player at a time, and it closes after
  `close-delay` (default 800 ms).
- **Markers:** `data-open`, plus motion markers that come from presence.
- **Status indicator.** Marker `data-status` =
  `play|pause|volume-off|volume-low|volume-high|captions-on|captions-off|fullscreen|exit-fullscreen|pip|exit-pip`.
  Its `actions` attribute filters which actions it shows.
- **Seek indicator.** Marker `data-direction`. Repeated steps accumulate, clamped
  to `[0, duration]`.
- **Volume indicator.** Uses the 4-level `data-level` (◆ unified with the mute
  button), `data-min`/`data-max` for 300 ms when already at a limit, and the
  `--tp-media-volume-fill` variable.

### 4.7 Declarative input bindings

**`tp-media-hotkey`** (non-visual, `display: none`):

| Attribute | Type | Meaning |
| --- | --- | --- |
| `keys` | string | Key pattern (§3.7). Several patterns are comma-separated. |
| `action` | action name (§3.3) | |
| `value` | number? | Overrides the action's default value |
| `disabled` | boolean | Disables this binding. A disabled binding with the same `keys` as a default **suppresses** that default. |

**`tp-media-gesture`** (non-visual):

| Attribute | Type | Meaning |
| --- | --- | --- |
| `type` | `tap\|doubletap` | |
| `action` | action name | |
| `value` | number? | |
| `pointer` | `mouse\|touch\|pen`? | |
| `region` | `left\|center\|right`? | |
| `disabled` | boolean | |

Both elements register with their player while connected and unregister on
disconnect.

### 4.8 Controls region

**`tp-media-controls`:**
- `visibility`: `auto` (default; follows `controlsVisible`) or `always` (for the
  audio layout).
- Markers: `data-visible`, `data-user-active`.
- **Hiding.**
  - Hiding uses a declared non-blocking `state` motion role. It never moves focus,
    and visibility is kept while focus is inside.
  - Popups inside the region close with reason `idle` when it hides.
- **Pointer events.** The content area has `pointer-events: none` and `data-interactive`;
  each group has `pointer-events: auto`. Taps between groups therefore reach the
  gesture surface.
- **Backdrop.** An optional `backdrop` part paints the gradient scrim. It is
  `aria-hidden`.

**`tp-media-controls-group`:**
- Layout grouping. Gets `role="group"` only when labelled (`label` or `aria-label`).
- Controls are **independent tab stops** in DOM order (§12, D3).

### 4.9 Layouts (preset compositions)

Layouts are the "standard player": drop-in compositions using only the constituents
above and existing library components. They make no visual substitutes.

**`tp-media-video-layout`** follows the Video.js default video skin
(`P/skins/src/skins/default/video/skin.tsx`). Contents:
- poster, title (top), buffering indicator (center), error dialog;
- feedback indicators and default gestures;
- controls:
  - **primary bar (bottom):** play, volume popover, current time, time slider with
    preview (thumbnail, chapter title, pointer time), remaining time (toggle),
    captions button (≥ `lg`), settings menu (speed, captions, audio, quality);
  - **secondary group:** remote playback, picture-in-picture and fullscreen. It sits
    top-right below `lg` and inline at `lg` and above.
- every button wrapped in `tp-tooltip`, sharing one `TooltipProvider` group (600 ms
  delay, 400 ms group timeout), with the shortcut shown through `tp-key-hint`;
- **live variant** (automatic from `streamType`): `[play, live button, spacer,
  volume, captions, remote, PiP, fullscreen]`, with no time slider unless DVR.

**`tp-media-audio-layout`:**
- `tp-media-controls visibility="always"`;
- contents: `[play (with buffering overlay), seek −10/+10 (≥ lg)] [current time,
  time slider without thumbnails or chapters, remaining time]
  [settings (rate), volume popover]`;
- no poster, title, gestures or visual indicators.

**Layout properties:**
- `slot`-based replacement for the regions `top`, `center` and `bottom-start`,
  `bottom-end`;
- `hide` takes a token list to hide individual built-in controls, e.g.
  `hide="pip remote"`;
- `seek-buttons` (boolean) adds the seek buttons.

**Breakpoints.** Layouts respond to **container queries** on the container (not
viewport queries). The breakpoints come from Video.js, renamed to the library's
token naming at implementation:

| Name | Width |
| --- | --- |
| 280 | 17.5rem |
| xs | 20rem |
| 360 | 22.5rem |
| sm | 24rem |
| md | 28rem |
| lg | 32rem |
| xl | 36rem |
| 2xl | 42rem |

## 5. Presentation and customization

- **Dictionary recipes.** All appearance goes through definitions and the recipe
  dictionary: a new `src/presentation/recipes/media-player.ts` spread into
  `recipes.ts`. Reused components keep their own recipes. Buttons in controls are
  `tp-button` ghost/icon; menus, popovers, tooltips and the alert dialog are
  unchanged.
- **Colors over media.** The controls region and the overlays on the media use a
  **scoped `color-scheme: dark`**. Every color role uses `light-dark()`, so the
  existing tokens resolve to their dark values without new color tokens (§12, D7).
  The scrim is `color-mix(in oklab, var(--tp-background) X%, transparent)` from
  existing roles, according to `docs/styling.md`. The audio layout follows the page
  color scheme.
- **Public variables** (proposed; vocabulary review needed):

| Variable | Default |
| --- | --- |
| `--tp-media-object-fit` | `contain` |
| `--tp-media-object-position` | `center` |
| `--tp-media-caption-offset` | — |
| `--tp-media-slider-fill`, `--tp-media-slider-pointer`, `--tp-media-slider-buffer` | — (runtime output) |
| `--tp-media-chapter-*` | — (runtime output) |
| `--tp-media-volume-fill` | — (runtime output) |

  Sizes, radii, spacing and type use existing token roles (`control-height-*`,
  `icon-size-*`, `radius-*`, `target-size-min`). Layout-only geometry stays in
  structural styles.
- **Motion.** Controls hide and show through a `state` role. Indicators and the
  poster use `presence` roles. The spinner uses the existing `ambient` role. Under
  reduced motion, durations collapse through the existing motion policy. Reduced
  motion never affects media playback.
- **Preferences.**
  - `prefers-reduced-transparency` and `prefers-contrast: more` remove blur and use
    opaque surfaces.
  - `forced-colors` uses system colors.
- **Cursor.** The cursor is hidden over the media when `data-controls-visible` is
  absent on fine pointers.
- **Layering.** Layering inside the container uses structural z-order, from bottom
  to top: media, poster, scrim, title/indicators, controls, dialog.
- **Customization surface.** Per-instance `partPresentation`, dictionary
  replacement, token overrides and `::part()` must all work, including through the
  composed `tp-button` and `tp-slider` shadow boundaries via exported parts. Verify
  this as for other compounds.

## 6. Accessibility summary

- **Container:** a labelled group and the tab stop for player hotkeys.
- **Every control:** a native-button-equivalent `tp-button` with a state-dependent
  name, `aria-keyshortcuts`, and `aria-disabled` with focusability retained.
- **Sliders:** native range semantics from `tp-slider`, with localized
  `aria-valuetext` (time phrases, volume percent and muted state).
- **Tooltips:** visual only. The accessible name is the button's own name. The
  tooltip adds no description that would duplicate it (§8).
- **Announcements:** one polite region per player, with the policy in §3.12.
  Indicators are `aria-hidden`.
- **Captions:** native rendering for OS caption preferences. The captions button is
  never the only way to reach captions: the settings menu offers them too.
- **Error dialog:** an `alertdialog` with container-modal focus behavior.
- **Without a pointer:** every gesture has a control or hotkey equivalent, and
  autohide never hides a focused control.
- **Target size:** controls meet `target-size-min` (2.75rem) on coarse pointers.
- **Verification:** the Chrome DevTools MCP accessibility tree, real keyboard paths,
  and automated analysis. An accessibility-tree snapshot is not a screen-reader
  test.

## 7. Required shared repairs and contract amendments

Each repair goes to its existing owner. Every consumer listed must be migrated and
regression-tested. Repairs 7.1–7.3 block dependent player work.

| # | Owner (existing) | Amendment | Consumers / regression |
| --- | --- | --- | --- |
| 7.1 | `tp-slider`: `sec-148-slider`, `ucl17-slider`; `src/components/slider/*`, `src/foundation/slider.ts` | (a) optional `slider-buffer` part with 0..n non-semantic ranges; (b) published hover pointer value/ratio with `data-pointing` (today `#pointerMove` ignores moves when not dragging); (c) optional `slider-chapter` segments; (d) **indeterminate range**: `minimum >= maximum` or non-finite is a declared disabled state, not `sliderConfigurationError`; `min`/`max` updates do not emit value events; (e) `formValue: false` opt-out | All Slider consumers and stories; slider fixtures; existing plan `plans/components/slider/` |
| 7.2 | `ChangeReason` (`sec-53-changeeventt-and-changereason`; `src/foundation/types.ts`) | Add `media`, `hotkey`, `gesture`, `idle` | Type consumers; docs |
| 7.3 | `ObservableStore` (`sec-54-store-and-subscription-behavior`; `src/foundation/store.ts`) | `subscribe(listener, {selector?, equality?, emitCurrent?})`; backward compatible | Drawer provider and all current subscribers |
| 7.4 | Messages pattern (Calendar Amendment 2; Carousel) | Provider-level `messages` inherited by compound constituents through the owner lookup, with per-constituent override | Calendar and Carousel unchanged; documents the pattern |
| 7.5 | **New** `sec-1920-key-bindings` (`src/foundation/key-bindings.ts`) | Scoped registration, pattern parsing, `Mod`, editable/interactive guards, nearest-owner arbitration, most-recently-active document routing, `aria-keyshortcuts` and display strings | Migrate Navigation Panel `#matchesShortcut`/`#editable`, Carousel `carouselInteractive`/`bindCarouselKeyboard` guard, Toolbar `toolbarInputOwnsKey` |
| 7.6 | **Promote** `nearestDrawerService` walk to Foundation `nearestOwner(host, predicate)` (`portal-ownership.ts`) | Composed-parent plus logical-portal-owner walk | Migrate Drawer `nearestDrawerService` and Navigation Panel `navigationPanelOwner` |
| 7.7 | **Extract** `CarouselAutoplay` reason leases to Foundation `ReasonLeases` | `setReason(reason, active)`; one reason cannot clear another | Migrate Carousel autoplay |
| 7.8 | **New** `sec-1923-live-announcer` (`src/foundation/announcer.ts`) | Polite/assertive region owner with debounce, clear and suppression | Player now. Toast and drag-drop migration is recommended in the same pass; if deferred, it must be recorded as an open gap |
| 7.9 | Icons (`src/icons/`) and Foundation `media/thumbnails.ts` | `src/icons/media.ts`: play, pause, replay, volume-high/low/off, captions-on/off, fullscreen-enter/exit, pip-enter/exit, seek (mirrored for backward), speed, quality, audio/speech, cast, airplay, live dot; 24×24 stroke, matching existing artwork. `xywh` media-fragment parser | Icon catalog docs |
| 7.10 | `LocaleService` (`sec-124-locale-and-form-services`) | `duration(seconds, {style: 'digital'\|'long', guide?})`; `Intl.DurationFormat` when available, fallback from `numberFormatter` unit style plus `Intl.ListFormat` | Player; available to others |
| 7.11 | Image load state (Avatar, local) | Extract to Foundation `ImageLoadController` | Migrate Avatar; Poster and Thumbnail consume it |
| 7.12 | Tap gestures **new** `sec-1921-tap-gesture-regions` (`src/foundation/tap-gestures.ts`) | §3.8 recognizer and region resolution | Player; no existing duplicate (Drawer swipe is different and stays local) |
| 7.13 | Media presentation **new** `sec-1924-media-presentation` (`src/foundation/media/presentation.ts`) | Fullscreen, PiP, remote playback, orientation lock (§3.9); owner-document aware | Player |
| 7.14 | Anchored surfaces (`sec-1912-portal-overlay-and-tree-ownership`) | Specify behavior on entering element fullscreen and the requirement to portal into a fullscreen container | Menu, Popover, Tooltip regression in fullscreen |

## 8. Reuse map (summary)

| Player role | Reused owner | Notes |
| --- | --- | --- |
| Element base, cleanup, timers, locale | `TpElement`, `CleanupScope`, `Scheduler`, `EnvironmentService`, `LocaleService` | Media constituents use `TpElement`, not `TpFormElement` |
| All buttons | `tp-button` + `tp-icon` | Label swap; `focusableWhenDisabled` |
| Seek repeat | `PressAndHold` | Opt-in |
| Time and volume sliders | `tp-slider` (after 7.1) | No media-local slider |
| Preview positioning | `positionSurface` with a virtual anchor and cursor-axis tracking | No tooltip semantics |
| Volume popover | `tp-popover` (`openOnHover`, delay 200, close delay 100) + `HoverSurfaceController` corridor | Popover preset |
| Settings and track menus | `tp-menu`, nested `tp-menu`, `tp-menu-radio-group/item`, `tp-separator`, `tp-badge` | |
| Tooltips | `tp-tooltip`, `TooltipProvider` (`DelayGroup`), `tp-key-hint` | |
| Buffering | `tp-spinner` (decorative) | Not `tp-progress` (wrong role) |
| Error | `tp-alert-dialog`, `tp-button` | Container-modal |
| Aspect ratio | `tp-aspect-ratio` (`ratio`, `fit`) | Documented composition around the media in layouts |
| Motion | `prepareMotion`, `PresenceController`, motion tokens | |
| IDs, collections, typeahead, focus | `createId`, Menu internals | |
| Owner lookup, key bindings, announcer, leases, image load | Repairs 7.4–7.11 | Shared, not player-private |

`tp-toggle` is deliberately **not** used: it always exposes `aria-pressed`, which
conflicts with label swapping (§12, D2). This is a semantic choice, not a visual
substitute: the media buttons render `tp-button`.

## 9. Deliberate deviations from the references

| ◆ Item | Reference behavior | This proposal | Reason |
| --- | --- | --- | --- |
| Rate stepping (hotkeys and gestures) | Video.js wraps from the last rate to the first | Clamped; the cycle *button* still wraps | Wrapping on `>` from 2× to 0.2× surprises keyboard users; the button is an explicit cycler |
| Document hotkey routing | Video.js design says "most recently active player"; its code fires every player | Implement the design | Several players on one page would otherwise all react |
| Initial error sync | Video.js ignores an error present before attach | Read `media.error` at attach | An error from before the player connected must still surface |
| `loop`, `readyState` state | Absent in Video.js | Read-only mirrors | Layouts need them for replay and loading UI; no setter is added |
| Time-slider live seeking | Video.js commits on release; MC seeks on every input | Commit by default; opt-in `live-seek` | Video.js behavior is the default; the MC capability stays available |
| Volume levels | Mute button 4 levels, indicator 3, skin 3 icons | One 4-level `volumeLevel` everywhere; icons map medium → high | One vocabulary |
| Seek button default | 30 s in core, 10 s in skin and hotkeys | Player `seek-step` (10) everywhere | Consistency |
| `role="time"` | Video.js HTML uses a non-standard role | Native `<time>` | Valid ARIA |
| Poster fallback to `video.poster`; poster on ended | Not in Video.js | Opt-in `show-on-ended`; `video.poster` fallback | Common need; does not change the default |
| Playback-rate list | Constant in Video.js | Configurable `playback-rates` | Recorded upstream gap |
| Idle delay | Fixed 2 s in Video.js | `idle-delay`, default 2000 ms | MC parity (`autohide`) |
| `normalSpeed` label for 1× | `1×` | "Normal" | Common convention; overridable through messages |
| Request event | Video.js calls actions directly; MC uses request events | Direct calls plus a cancelable `tp-media-request` proposal | Matches Tweakpad's cancelable-proposal convention (`tp-value-change`) and lets apps veto, e.g. seeking during ads |

## 10. Error, edge and failure matrix (required behavior)

| Case | Behavior |
| --- | --- |
| No media element | Controls are `unavailable` and disabled. Requests reject with `InvalidStateError`. A diagnostic is emitted once. |
| Media replaced (`src` change, `emptied`) | Pending seek aborted; `error` cleared; `started` reset; tracks re-read; controls locks kept |
| Media element swapped | Detach, then re-attach to the new element; subscriptions keep working |
| Root moved in the DOM | State kept; destroy cancelled within two frames |
| Autoplay blocked | `play` rejects; `tp-media-request-failed` `{error: NotAllowedError}`; the play button stays "Play" |
| Duration unknown or `NaN` | Time slider indeterminate; time shows `0:00`; `aria-valuetext` = `timeUnknown` |
| Live, no DVR | Slider hidden; seek hotkeys inactive; play jumps to the edge |
| iOS (no volume, native fullscreen) | Volume slider hidden; mute works; fullscreen uses WebKit presentation mode |
| PiP requested before metadata | Rejects `InvalidStateError`; button `unavailable` |
| Fullscreen rejected (no user gesture) | Request-failed event; state unchanged |
| Menu open when entering fullscreen | Closed with `imperative-action`; reopening portals into the container |
| Error while a menu is open | Menu closes; error dialog opens; container interactions locked |
| Track list changes while the menu is open | Items update; a removed selected item moves focus to the group's first item; an empty group closes its submenu |
| Two players, document hotkeys | Only the most recently active player handles the key |
| Player `disabled` while playing | Playback continues; controls `aria-disabled`; hotkeys and gestures stop |
| Reduced motion | Control transitions collapse; media unaffected |
| RTL document | Layout and menus mirror; the time slider stays chronological LTR |

## 11. Out of scope (with reason)

| Item | Reason |
| --- | --- |
| Streaming engines (HLS/DASH/SPF), DRM | Would add an upstream runtime dependency; handled through the media target contract and `mediaAdapter` |
| Google Cast SDK sender | Proprietary runtime dependency. W3C Remote Playback and WebKit AirPlay are in scope. A Cast integration can implement the `remote` contract externally. |
| Hosted-player adapters (YouTube, Vimeo, …) | Third-party runtime APIs; possible later as custom media elements under §3.1 |
| Custom caption renderer and styling UI | Native rendering keeps OS caption preferences (FCC rationale upstream) |
| Document Picture-in-Picture (custom PiP window UI) | Not in either reference; separate feature |
| Preference persistence | Not built into either reference. Apps can implement it with `subscribe` and the request methods (Video.js `guides/user-preferences.mdx`); documented as an example. |
| Analytics extensions (Mux Data, …) | Observer extensions are app concerns; `subscribe` and events suffice |
| Playlists | Not a component in either reference; `tp-media-container` allows playlist UI inside the player scope |

## 12. Decisions requiring approval

Each decision has a recommendation, which this proposal currently assumes.

- **D1, naming.** Constituents use `tp-media-*`. The alternative is
  `tp-media-player-*`. Recommend `tp-media-*`, subject to the live vocabulary review.
- **D2, toggle semantics.** Buttons swap their label and do not use `aria-pressed`
  (Video.js parity; avoids double-stating "Pause, pressed"). The alternative is
  `tp-toggle` with constant labels. Recommend the label swap.
- **D3, focus model.** Each control is its own tab stop (Video.js; `ToolbarController`
  roving is deferred upstream). The alternative is a single toolbar tab stop using
  `ToolbarController`. Recommend independent stops; revisit if the controls grow.
- **D4, timeline direction in RTL.** Recommend chronological LTR (Video.js parity,
  with upstream tests). The alternative is mirroring with the document direction.
- **D5, settings submenus.** The options are pages inside one popup (Video.js,
  better inside small players and fullscreen) or Menu's existing flyout submenus.
  Recommend adding a `submenu-presentation="inline"` mode to `tp-menu` as a shared
  Menu amendment, because flyouts clip inside a small player. This needs a Menu
  contract amendment if accepted.
- **D6, sliders and forms.** Media sliders are not form-associated. Recommend
  approving.
- **D7, over-media colors.** Scoped `color-scheme: dark` with existing tokens, or a
  reviewed new `media-scrim` role. Recommend the scoped color scheme (no new tokens).
- **D8, hotkeys on by default on the root.** Recommend `hotkeys="default"` on the
  root and `gestures="none"` on the root, with the video layout enabling gestures.

## 13. Acceptance scenarios (seed for the implementation checklist)

Each scenario must be verified through Chrome DevTools MCP with real input where
input is involved. Evaluating page scripts may set up fixtures but never stands in
for keyboard or pointer verification.

- **S-ATT:**
  - attach, detach and reattach;
  - media swap;
  - custom media registration;
  - DOM move with no reset;
  - two players isolated.
- **S-PLAY:**
  - play and pause through button, hotkey, gesture and method;
  - autoplay rejection;
  - replay after `ended`;
  - `tp-media-request` veto.
- **S-SEEK:**
  - slider keyboard (step, large step, Home/End);
  - pointer press and drag with commit vs `live-seek`;
  - `pause-on-drag`;
  - seek supersession;
  - seek buttons and hold-to-repeat;
  - hotkey `0`–`9` and Home/End;
  - indeterminate range before metadata.
- **S-BUF:** buffered fill; buffering indicator delay; `waiting` heuristic.
- **S-VOL:**
  - mute toggle and unmute-at-0 → 0.25;
  - slider live volume and wheel;
  - level markers;
  - iOS-unsupported hiding (emulated capability);
  - volume popover hover corridor.
- **S-RATE:** button cycle; menu selection; hotkey clamp; custom `playback-rates`.
- **S-CAP:**
  - toggle selection fallback order;
  - menu off and tracks;
  - dynamic track add and remove;
  - native rendering and cue offset with controls visible.
- **S-AUD / S-QUAL:**
  - audio track and rendition selection through `mediaAdapter`;
  - `auto` with an active label;
  - hidden with ≤ 1 option.
- **S-FS:**
  - enter and exit through button, hotkey and double-tap;
  - menus, tooltips and popovers while fullscreen;
  - rejection without a gesture;
  - orientation lock (emulated).
- **S-PIP:** enter and exit; unavailable before metadata; mutual exclusion with fullscreen.
- **S-REMOTE:** availability states; disabled vs hidden.
- **S-LIVE:** stream-type detection; live edge; DVR window slider; live button; hotkey set.
- **S-IDLE:**
  - hide after `idle-delay`;
  - stays visible while paused, focused, during a slider drag, with a menu open or
    with the pointer over the controls;
  - touch tap toggle;
  - `idle-delay ≤ 0`;
  - popups closed on hide.
- **S-KEY:**
  - default map;
  - editable and activatable guards;
  - modifier priority;
  - `tp-media-hotkey` override and suppression;
  - document scope routed to the most recently active player;
  - `aria-keyshortcuts` and tooltip shortcut display.
- **S-GEST:** tap and double-tap regions and timing; interactive-target exclusion; interaction lock.
- **S-ANN:** each announcement, debounce, slider-focus suppression, `announcements="off"`.
- **S-ERR:** error dialog content per code; dismiss and retry; container-modal focus and inertness; pre-attach error.
- **S-I18N:**
  - `messages` on the root and constituent overrides;
  - `locale` formatting of times, percents and language names;
  - RTL layout with a chronological timeline.
- **S-PRES:**
  - default video and audio layouts against the traced Video.js skin;
  - container breakpoints;
  - scoped dark scheme;
  - token, part and dictionary overrides through composed shadow boundaries;
  - reduced motion, reduced transparency, increased contrast and forced colors.
- **S-A11Y:**
  - accessibility tree of every control in every state;
  - target sizes;
  - automated analysis in the MCP-controlled page.
- **S-REG:** regression of every consumer named in §7 after its shared repair.

Demo and fixture media (a short, licensed local video and audio clip, a poster, VTT
captions, chapters and thumbnail sprites) must be added under `src/stories/assets/`.
Stories must not depend on network media.

## 14. Suggested sequencing

1. Apply or approve the live amendments in §7 and the decisions in §12. These are
   blocked until `docs-mcp` reconnects for the live write.
2. Foundation repairs 7.1–7.3 and 7.6, with consumer regression.
3. Foundation media layer: target contract, store slices, requests, presentation
   service, text tracks, duration formatting.
4. Root plus play, mute and time constituents. This forms the **early integration
   checkpoint**: one representative composition is inspected against the traced
   Video.js default skin before the remaining constituents.
5. Sliders (time with preview, chapters and thumbnails; volume), menus, live, remote,
   indicators, error dialog.
6. Key bindings, gestures, idle and the announcer (repairs 7.5, 7.7, 7.8, 7.12),
   with their migrations.
7. Layouts, documentation (`docs/media-player.md`, stories, examples, assets), and
   the full verification matrix through the implementation checklist and gate
   checker.
