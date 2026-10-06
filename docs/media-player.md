# Media player

`tp-media-player` plays video or audio with composable controls built from library components: Button, Icon, Slider, Menu, Popover, Tooltip, Key hint, Spinner, Badge and Alert dialog. The root owns one media store per player. Every control reads state from it and changes media only through its request pipeline. Two preset layouts, `tp-media-video-layout` and `tp-media-audio-layout`, form the standard players; the constituents can also be composed directly.

```html
<tp-media-player content-title="Sample clip" poster="poster.jpg">
  <video
    src="sample-video.mp4"
    width="1280"
    height="720"
    preload="metadata"
    playsinline
    crossorigin="anonymous"
  >
    <track kind="captions" srclang="en" label="English" src="captions-en.vtt" />
    <track kind="captions" srclang="es" label="Español" src="captions-es.vtt" />
    <track kind="chapters" srclang="en" src="chapters.vtt" />
    <track kind="metadata" label="thumbnails" src="thumbnails.vtt" />
  </video>
  <tp-media-video-layout></tp-media-video-layout>
</tp-media-player>
<script type="module">
  import '@tweakpad/ui/register';
  import '@tweakpad/ui/styles.css';
</script>
```

Import `@tweakpad/ui/register` and `@tweakpad/ui/styles.css` once. The media store, request types, events and the target contract are also exported from `@tweakpad/ui/media`. Put the media element and every constituent (or a layout) inside the player. The player is the container unless a `tp-media-container` is present; the layout fills the container and renders its constituents in its shadow root. Constituents resolve their player through the composed tree, including portaled menus. A control outside the player can name it with `player="<player id>"`.

## Root: `tp-media-player`

### Properties

| Property / attribute                      | Type / default                                                      | Behavior                                                                                                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contentTitle` / `content-title`          | string or null; `null`                                              | Title. Without it the media's content data supplies one. An authored `''` stops the fallback.                                                                               |
| `poster`                                  | URL or null; `null`                                                 | Poster. Falls back to the media's content data, then `video.poster`. `''` stops the fallback.                                                                               |
| `streamType` / `stream-type`              | `auto`, `on-demand`, `live`; `auto`                                 | `auto` detects: the media's own `streamType`, else an infinite duration is live and a finite one on-demand. The other values override detection.                            |
| `playbackRates` / `playback-rates`        | number[] (space-separated attribute); `0.2 0.5 0.7 1 1.2 1.5 1.7 2` | Options of the rate button and speed menu. Values must be sorted and positive; invalid input emits a diagnostic and the default list is used.                               |
| `seekStep` / `seek-step`                  | seconds; `10`                                                       | Step of seek buttons without `seconds`, the arrow/J/L keys and the double-tap gestures.                                                                                     |
| `volumeStep` / `volume-step`              | 0–1; `0.05`                                                         | Step of the Up/Down keys and the volume indicator.                                                                                                                          |
| `idleDelay` / `idle-delay`                | ms; `2000`                                                          | Controls autohide delay after the last activity. Zero or less disables autohide.                                                                                            |
| `hideOverControls` / `hide-over-controls` | boolean; `false`                                                    | Lets controls hide while a mouse or pen pointer rests over them.                                                                                                            |
| `hotkeys`                                 | `default`, `none`; `default`                                        | `default` registers the default key map. `none` keeps only `tp-media-hotkey` bindings.                                                                                      |
| `hotkeyScope` / `hotkey-scope`            | `player`, `document`; `player`                                      | `player` listens while focus is inside the container. `document` also routes keys from the page to the most recently active player that uses `document` scope.              |
| `gestures`                                | `default`, `none`; `none`                                           | `default` registers the default tap gestures. The video layout enables `default` while the player has no authored `gestures` attribute; write `gestures="none"` to opt out. |
| `orientationLock` / `orientation-lock`    | `none` or an `OrientationLockType`; `none`                          | Locks the screen orientation while fullscreen, where the browser allows it.                                                                                                 |
| `announcements`                           | `polite`, `off`; `polite`                                           | Status announcements through one polite live region per player.                                                                                                             |
| `messages`                                | `MediaPlayerMessages` (property only); `{}`                         | Partial dictionary of localized strings over the English defaults. Constituents inherit it; a constituent's own `messages` override it.                                     |
| `locale`                                  | locale tag; resolved                                                | Formats times, numbers, percentages and language names only. Empty: the nearest `lang`, then the document. It never selects translations.                                   |
| `mediaAdapter`                            | `MediaTracksAdapter` or null (property only); `null`                | Engine-provided video renditions and audio tracks (see [Tracks adapter](#tracks-adapter)).                                                                                  |
| `disabled`                                | boolean; `false`                                                    | Every control becomes focusable `aria-disabled`; key bindings and gestures stop. Playback is not paused and the media is not dimmed.                                        |

Inherited `readOnly`, `invalid` and `required` do not apply to the player or its constituents.

### Read-only members

- `state`: the latest frozen `MediaState` snapshot (playback, time, buffer, volume, rate, error, metadata, presentation, controls, tracks, quality and live fields).
- `media`: the attached media target, or `null`. `container`: the container element. `attached`: whether media is attached.

### Methods

Each method proposes a change through the request pipeline and returns a Promise.

| Method                                                       | Request action                                 | Resolves with                     |
| ------------------------------------------------------------ | ---------------------------------------------- | --------------------------------- |
| `request(action, value?, options?)`                          | any action below                               | the action's result               |
| `play()`, `pause()`, `togglePaused()`                        | `play`, `pause`, `toggle-paused`               | `undefined`                       |
| `seek(time)`, `seekBy(delta)`, `seekToLiveEdge()`            | `seek`, `seek-by`, `seek-to-live-edge`         | the actual position after seeking |
| `setVolume(volume)`, `setMuted(muted)`                       | `set-volume`, `set-muted`                      | the resulting volume / muted      |
| `setPlaybackRate(rate)`                                      | `set-playback-rate`                            | the written rate                  |
| `requestFullscreen()`, `exitFullscreen()`                    | `request-fullscreen`, `exit-fullscreen`        | `undefined`                       |
| `requestPictureInPicture()`, `exitPictureInPicture()`        | `request-picture-in-picture`, `exit-…`         | `undefined`                       |
| `promptRemotePlayback()`                                     | `prompt-remote-playback`                       | `undefined`                       |
| `selectTextTrack(id \| null)`, `toggleCaptions(force?)`      | `select-text-track`, `toggle-captions`         | `undefined`                       |
| `selectAudioTrack(id)`, `selectVideoRendition(id \| 'auto')` | `select-audio-track`, `select-video-rendition` | `undefined`                       |
| `toggleControls(force?)`, `dismissError()`                   | `toggle-controls`, `dismiss-error`             | user activity / `undefined`       |

Other actions available through `request()`: `seek-to-percent`, `toggle-muted`, `step-volume`, `step-playback-rate` (clamped), `toggle-fullscreen` and `toggle-picture-in-picture`. `options` accepts `reason` (a `ChangeReason`, default `programmatic`), `sourceEvent` and `trigger`.

- `requestControlsLock(reason?)` keeps the controls visible and returns an idempotent release.
- `subscribe(selector, callback, { equality?, signal? })` calls `callback` when `selector(state)` changes under `equality` (default shallow) and returns the unsubscribe. It survives a reconnect.

Before media is attached a request rejects with `InvalidStateError` and emits `tp-media-request-failed`. Requests are never locked while an error is shown. Rejections from key bindings and gestures are reported by the event only.

### Events

All events bubble and are composed.

| Event                     | Detail                                           | Notes                                                                            |
| ------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------- |
| `tp-media-request`        | `{action, value, reason, sourceEvent, trigger?}` | Cancelable proposal of every change; `preventDefault()` stops it.                |
| `tp-media-request-failed` | `{action, value, reason, error}`                 | The request was refused (disabled, unsupported, not attached) or failed.         |
| `tp-media-state-change`   | `{changed, state, previousState, reason}`        | One batched snapshot change; `reason` is `media` for element-originated changes. |
| `tp-media-error`          | `{error: {code, message, fatal}}`                | The media error became non-null.                                                 |
| `tp-media-attach`         | `{media, container}`                             | The store attached.                                                              |
| `tp-media-detach`         | `{media, container}`                             | The store detached (media removed, player moved or disconnected).                |
| `tp-diagnostic`           | `{code, message, severity}`                      | Configuration and discovery problems; not localized.                             |

Reasons include `trigger-press`, `keyboard`, `drag`, `wheel`, `hotkey`, `gesture`, `idle`, `media` and `programmatic`.

### Container, markers and slots

The container (the root, or `tp-media-container`) gets `role="group"`, `tabindex="0"` and `aria-label` = `player` message unless authored. Pressing the media surface focuses it without scrolling when focus is outside, so player-scoped key bindings work. It publishes `data-paused`, `data-ended`, `data-started`, `data-waiting`, `data-seeking`, `data-muted`, `data-volume-level` (`off|low|medium|high`), `data-fullscreen`, `data-pip`, `data-captions-showing`, `data-controls-visible`, `data-user-active`, `data-stream-type` (`on-demand|live|unknown`), `data-live-edge`, `data-error` (the error code) and `data-media-type` (`video|audio`). It also publishes `--tp-media-caption-offset`, the block size of the visible controls regions. The root renders no structure; its default slot holds the media and constituents.

**Media discovery.** A registered custom media element wins (the last registration). Otherwise the first `<video>` or `<audio>` in the player's light DOM is attached, and subtree changes re-run discovery. A custom media element implements the media target subset (any of playback, time, buffer, volume, rate, error, tracks, renditions, presentation, remote, live, content data) and registers on connection with `requestMediaRegistration(element)` from `@tweakpad/ui/media`. It calls the returned release on disconnection. Missing capabilities keep defaults and report `unsupported`.

**Lifecycle.** Disconnection detaches synchronously. Destruction is deferred two frames and cancelled if the player reconnects (a DOM move), which keeps state and subscriptions.

## Layouts

Layouts are preset compositions of the constituents below. They make no visual substitutes. Place one inside the player next to the media; it fills the container.

### `tp-media-video-layout`

- Overlays: poster; title in the `top` region; buffering indicator in the `center` region; status, seek and volume indicators; error dialog.
- Default gestures (see [Gestures](#gestures)).
- A bottom bar: play, optional seek buttons, volume popover, current time, time slider (preview with thumbnail, chapter title and pointer time), remaining-time toggle, captions button (from `lg`), settings menu (quality, audio, speed, captions).
- A secondary group: remote playback, picture-in-picture, fullscreen. It floats in the top end corner below `lg` and joins the bar from `lg`.
- **Live variant**, chosen automatically from the stream type: play, live button, a spacer, volume popover, a captions menu, and the secondary group inline. With a DVR window the time slider takes the spacer's place. There is no remaining time or settings menu.

### `tp-media-audio-layout`

- Controls always visible (`visibility="always"`), in the page color scheme. No poster, title, gestures or visual indicators.
- `bottom-start`: play with the buffering indicator over it, then seek −/+ by `seek-step` from `lg` (at every width with `seek-buttons`).
- `center`: current time, the time slider without thumbnails or chapters (its pointer-time preview may overflow the track), the live button (only for live streams) and the remaining-time toggle.
- `bottom-end`: the playback-rate button opening a speed menu, and the volume popover.
- The error dialog.

### Layout API

| Property / attribute             | Type / default           | Behavior                                                                                                                                                                                                                                  |
| -------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hide`                           | token list; `''`         | Omits built-in controls: `play`, `seek`, `volume`, `current-time`, `time-slider`, `remaining-time`, `captions`, `settings` (audio: the speed menu), `live`, `remote`, `pip`, `fullscreen`. Unknown tokens emit `media-layout-hide-token`. |
| `seekButtons` / `seek-buttons`   | boolean; `false`         | Video: adds seek backward/forward buttons after play. Audio: shows its seek buttons at every width.                                                                                                                                       |
| `player`, `messages`, `disabled` | as for every constituent | See [Common constituent API](#common-constituent-api).                                                                                                                                                                                    |

Read-only: `tooltipProvider` (the layout's `TooltipProvider`), `hiddenControls` (the parsed `hide` set) and, on the video layout, `variant` (`on-demand`, `live`, `live-dvr`).

Slots replace a region's default content:

| Slot           | Video layout default                                         | Audio layout default               |
| -------------- | ------------------------------------------------------------ | ---------------------------------- |
| `top`          | title                                                        | empty (content above the controls) |
| `center`       | buffering indicator                                          | the time group                     |
| `bottom-start` | play, seek buttons, volume popover (live: play, live)        | play and seek buttons              |
| `bottom-end`   | captions button, settings menu (live: volume, captions menu) | speed menu, volume popover         |

Parts: `top`, `center`, `bottom-start`, `bottom-end`, `controls`, and on the video layout also `poster`, `bar`, `time` and `secondary`. The layout's regions carry the `media-layout-region` presentation key; the host carries `media-layout`.

**Tooltips.** Every built-in button sits in a `tp-tooltip` that shows the button's current label and its key binding as `tp-key-hint`. All tooltips of a layout share one `TooltipProvider` with a 600 ms delay and a 400 ms group rest. They use `describes="none"`: the tooltip is visual only, because the button's accessible name already says the same thing and its shortcut is published as `aria-keyshortcuts`. The volume popover and the time toggle have no tooltip; the popover opens on hover itself. Tooltips, menus and popovers portal into the container, so they stay visible in fullscreen.

**Breakpoints.** Layouts use container queries on the layout box, which fills the container. They never use viewport queries.

| Name | Width              | Use                                                                                     |
| ---- | ------------------ | --------------------------------------------------------------------------------------- |
| `lg` | 32rem              | Video: captions button shown, secondary group joins the bar. Audio: seek buttons shown. |
| —    | 16rem (time group) | Below this width of the time group, its clocks hide and the slider remains.             |

The remaining Video.js widths (17.5, 20, 22.5, 24, 28, 36 and 42 rem) are not used by the default layouts.

## Constituents

### Common constituent API

Every `tp-media-*` constituent has `player` (attribute; the id of a `tp-media-player` outside its subtree), `messages` (property; message overrides for this constituent) and `disabled`. Without a player a constituent emits the `media-player-missing` diagnostic once and renders disabled. Controls publish `data-availability` (`available|unavailable|unsupported`), `data-disabled` and `data-hidden`. **Unavailable** controls stay focusable with `aria-disabled`; **unsupported** controls (and empty lists) are hidden.

### Structure

| Element                   | API                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tp-media-container`      | Optional container: fullscreen target, activity surface, key-binding and gesture surface and portal boundary. Content outside it stays in the player scope. Default slot.                                                                                                                                                                                                                                           |
| `tp-media-poster`         | `showOnEnded` / `show-on-ended` (boolean, `false`). Visible until playback starts. Adopts an authored `<img>` (or `<picture>`) child, writing its `src` only when it has none; otherwise renders a decorative `img` (part `image`). Markers `data-visible`, `data-loading`, `data-loaded`, `data-error`.                                                                                                            |
| `tp-media-title`          | The resolved title (part `text`); `hidden` while empty; the text changes only when the value changes. Marker `data-visible` follows controls visibility.                                                                                                                                                                                                                                                            |
| `tp-media-controls`       | `visibility` (`auto`, `always`; `auto`, reflected). `auto` overlays the bottom of the container and follows controls visibility; `always` stays in flow. Part `backdrop` (decorative scrim). Markers `data-visible`, `data-user-active`. Hiding never moves focus; focus or a hovering pointer inside keeps it visible; open popups inside close with reason `idle`. Taps between groups reach the gesture surface. |
| `tp-media-controls-group` | `label` (string, `''`); `role="group"` only when named. `orientation` (`horizontal`, `vertical`). Controls inside are independent tab stops.                                                                                                                                                                                                                                                                        |

### Buttons

Each button composes `tp-button` (`variant="ghost"`, `size="icon"`) and `tp-icon`. The accessible name swaps with state (no `aria-pressed`), `aria-keyshortcuts` publishes the bound key, and each state icon is a named slot over the library artwork. Common properties: `label` (string; replaces every state's name), `variant`, `size` (forwarded to Button). Parts: `button` (the native control), `icon`, `mark`, `text`. A press uses reason `trigger-press`.

| Element                           | Action / labels                                                                                                                                                                    | Markers; icon slots                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `tp-media-play-button`            | `toggle-paused`; `replay` when ended, `play` when paused, else `pause`                                                                                                             | `data-paused`, `data-ended`, `data-started`; `play`, `pause`, `replay`                        |
| `tp-media-mute-button`            | `toggle-muted`; `unmute` when muted or at zero volume, else `mute`                                                                                                                 | `data-muted`, `data-volume-level`; `volume-off`, `volume-low`, `volume-medium`, `volume-high` |
| `tp-media-seek-button`            | `seek-by`; `seconds` (number or null, `null` = `seek-step`; negative seeks back), `repeat` (boolean: repeats while held after 400 ms, every 60 ms); `seekForward` / `seekBackward` | `data-direction`, `data-seeking`; `seek-forward`, `seek-backward`                             |
| `tp-media-fullscreen-button`      | `toggle-fullscreen`; `enterFullscreen` / `exitFullscreen`. A pointer press refocuses the container.                                                                                | `data-fullscreen`; `enter-fullscreen`, `exit-fullscreen`                                      |
| `tp-media-pip-button`             | `toggle-picture-in-picture`; `enterPictureInPicture` / `exitPictureInPicture`                                                                                                      | `data-pip`; `enter-pip`, `exit-pip`                                                           |
| `tp-media-captions-button`        | `toggle-captions`; `enableCaptions` / `disableCaptions`. As a `tp-menu` trigger it opens the menu.                                                                                 | `data-active`; `captions-on`, `captions-off`                                                  |
| `tp-media-playback-rate-button`   | Cycles `playbackRates` with wrapping; visible `1.5×`; name `playbackRate`. As a menu trigger it opens the menu.                                                                    | `data-rate`; part `text`                                                                      |
| `tp-media-live-button`            | `seek-to-live-edge`; `playingLive` at the edge (`aria-disabled`), else `seekToLiveEdge`; visible `live`                                                                            | `data-live`, `data-live-edge`; `live` (the dot)                                               |
| `tp-media-remote-playback-button` | `prompt-remote-playback`; `startRemotePlayback`, `connecting`, `stopRemotePlayback`                                                                                                | `data-remote-state`; `disconnected`, `connecting`, `connected`                                |

### Sliders

Both sliders compose `tp-slider` with `variant="bar"` (a thumbless track with a grayed buffer and a solid fill ending in a cap that grows on hover; see [Slider](slider.md#bar-variant)), are not form-associated and re-emit the Slider's cancelable `tp-value-change` and `tp-value-commit`. A press takes a controls lock until the pointer is released (after the Slider's own release has committed, so a click on a paused video seeks and keeps the position) and never reaches the gesture surface. Hosts publish `--tp-media-slider-fill`, `--tp-media-slider-pointer` and, for time, `--tp-media-slider-buffer` (percentages), plus `data-dragging`, `data-pointing`, `data-interactive`, `data-seeking`, `data-orientation` and the availability markers. Parts are forwarded: `slider`, `slider-track`, `slider-range`, `slider-buffer`, `slider-chapter`, `slider-thumb`.

| Element                        | Properties                                                                                                                                                                                                                                         | Behavior                                                                                                                                                                                                                                                                                                                |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tp-media-time-slider`         | `step` (s, `1`), `largeStep` / `large-step` (s, `10`), `liveSeek` / `live-seek` (`false`), `changeThrottle` / `change-throttle` (ms, `100`), `pauseOnDrag` / `pause-on-drag` (`false`), `showChapters` / `show-chapters` (`true`; `"false"` hides) | Seeks on commit, and during a drag with `live-seek`. Indeterminate before metadata. Name `seek`; value text "current of duration" in long phrases, current only for infinite duration. No live region. Chronological left-to-right in RTL. One buffered range; aria-hidden chapter segments. Live without DVR hides it. |
| `tp-media-time-slider-preview` | `overflow` (`clamp`, `visible`; `clamp`)                                                                                                                                                                                                           | Slotted in a time slider. Follows the pointer on the shared positioning service with a virtual anchor, shown while pointing or dragging, `aria-hidden`, never a Tooltip. Marker `data-visible`. Fires the non-bubbling `tp-media-preview-change`.                                                                       |
| `tp-media-thumbnail`           | `time` (s or null), `crossOrigin` / `crossorigin` (inherits the media's CORS mode), `loading` (`eager`), `fetchPriority` / `fetchpriority` (`auto`)                                                                                                | The thumbnails track cue at `time`, else at the preview time. `#xywh` sprite cells scale to the element's CSS min/max size. Decorative. Markers `data-loading`, `data-loaded`, `data-error`; part `image`. Failed sources are not retried.                                                                              |
| `tp-media-chapter-title`       | —                                                                                                                                                                                                                                                  | Chapter at the preview time (or the slider value during keyboard use); hidden when empty. Part `text`.                                                                                                                                                                                                                  |
| `tp-media-volume-slider`       | `step` (`5`), `largeStep` / `large-step` (`10`), `wheelStep` / `wheel-step` (`5`), `orientation` (vertical inside the volume popover, else horizontal)                                                                                             | 0–100; sets the volume live. Name `volume`; value text the percent or `mutedValue`. Zero fill while muted (`data-muted`). Hidden when volume is unsupported.                                                                                                                                                            |

### Time: `tp-media-time`

| Property / attribute             | Type / default                                           | Behavior                                                                                                                                                                 |
| -------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `type`                           | `current`, `duration`, `remaining`, `pointer`; `current` | `pointer` shows the time under the slider pointer: its own `value`, else the nearest preview source (`tp-media-time-slider-preview` or `tp-media-time-slider`).          |
| `toggle`                         | boolean; `false`                                         | Composes a ghost Button. `type="current"` toggles current ↔ remaining; `type="duration"` and `type="remaining"` (which starts on remaining) toggle duration ↔ remaining. |
| `negativeSign` / `negative-sign` | string; `-`                                              | Sign before remaining time, `aria-hidden`.                                                                                                                               |
| `value`                          | seconds or null; `null`                                  | Replaces the media position (`current`, `remaining`) or gives the pointer time.                                                                                          |

It renders a native `<time datetime="PT…S">` (part `time`) with digital clock text and tabular numerals, and no live region. The name is `currentTime`, `duration` or `remainingTime`, or `timeUnknown` before a time range exists. The toggle's name is `showRemaining`, `showElapsed` or `showDuration` with the spoken value and its suffix (`elapsedSuffix`, `remainingSuffix`, `durationSuffix`). Its description is `toggleTimeDescription` (current) or `toggleDurationDescription`. Read-only `shown` and `timeView`; method `toggleShown()`. Markers `data-type`, `data-negative`, `data-unavailable`, `data-toggle`. Parts `time`, `sign`, `value`, `button`.

### Menus and presets

| Element                              | API                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tp-media-playback-rate-radio-group` | Extends `tp-menu-radio-group`. Items `1.5×`, with 1 as `normalSpeed`; selection requests `set-playback-rate`. Label `speed`.                                                                                                                                                                                                                   |
| `tp-media-captions-radio-group`      | `off` plus one item per captions/subtitles track (label → language name → kind); `data-track`. Label `captions`.                                                                                                                                                                                                                               |
| `tp-media-audio-track-radio-group`   | One item per audio track; shown only with two or more. Label `audio`.                                                                                                                                                                                                                                                                          |
| `tp-media-quality-radio-group`       | `auto` (`autoWithLabel` with the active rendition while adaptive) and `{size}p` renditions with optional tier/bitrate `tp-badge`s; `data-rendition`. Shown with two or more renditions. Label `quality`.                                                                                                                                       |
| (all radio groups)                   | `renderItem(option, group)` (property) replaces the item; it must render a `tp-menu-radio-item` with the option's `value`. Groups without usable options are `hidden`. `tp-value-change` stays cancelable.                                                                                                                                     |
| `tp-media-settings-menu`             | `groups` (`quality audio speed captions`), `side` (`top`), `align` (`center`). A gear Button opens a Menu with one flyout submenu per available group, each showing the selected value. Hidden when no group remains. `open`, `setOpen(open, reason)`, `menu`, `trigger`, `entries`. Parts `trigger`, `menu`.                                  |
| `tp-media-volume-popover`            | `side` (`top`), `openDelay` / `open-delay` (`200`), `closeDelay` / `close-delay` (`100`). A hover Popover whose trigger is a mute button and whose popup holds a vertical volume slider; without settable volume only the mute button renders. `open`, `setOpen`, `popoverElement`, `usable`. Parts `popover`, `mute-button`, `volume-slider`. |

Open menus and popovers hold a controls lock, portal into the container and consume their navigation keys. They close with reason `idle` when the controls hide and with `imperative-action` on fullscreen entry.

### Feedback

| Element                        | API                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tp-media-buffering-indicator` | `delay` (ms, `500`). A decorative `tp-spinner` while playback has waited longer than `delay`. Marker `data-visible`; part `spinner`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `tp-media-error-dialog`        | `showRetry` / `show-retry` (`false`). An Alert dialog for every error except aborted: title `errorTitle`, description by error code, `dismiss` (Escape too) requests `dismiss-error`; retry reloads and plays. Modal within the container through Alert dialog container modality (`modality="container"` with the player container): it renders inside the container and stays visible in fullscreen, the container's other content is inert, focus is trapped, the page outside the player stays interactive and is not scroll-locked; key bindings and gestures pause; focus returns unless the user moved it outside the player. Marker `data-open`; parts `dialog`, `dismiss`, `retry`. |
| `tp-media-status-indicator`    | A centered round mark with the icon for play/pause, volume/mute, captions, fullscreen and picture-in-picture key bindings and gestures; text appears only for a value (volume percent). `data-status`; each status is an icon slot.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `tp-media-seek-indicator`      | Direction and accumulated amount of seek bindings and gestures. `data-direction`; slots `seek-forward`, `seek-backward`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `tp-media-volume-indicator`    | Level, fill and percent. `data-level`, `data-min`/`data-max`; `--tp-media-volume-fill`; part `fill`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| (all indicators)               | `closeDelay` / `close-delay` (ms, `800`), `actions` (space/comma list filter). `aria-hidden`; they react only to key-binding and gesture requests, one at a time per player. `open`, `payload`, `close()`. Parts `content`, `icon`, `value`; markers `data-open`, `data-starting-style`, `data-ending-style`.                                                                                                                                                                                                                                                                                                                                                                                |

### Bindings

| Element            | Properties                                                                                                                                            | Behavior                                                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `tp-media-hotkey`  | `keys` (pattern: comma-separated alternatives, `Mod`, `Space`, `0-9`), `action`, `value` (number; default from `seek-step`/`volume-step`), `disabled` | Adds a binding. Same keys as a default override it; a `disabled` one only suppresses that default. Non-visual.                               |
| `tp-media-gesture` | `type` (`tap`, `doubletap`), `action`, `value`, `pointer` (`mouse`, `touch`, `pen`), `region` (`left`, `center`, `right`), `disabled`                 | Adds a tap gesture on the container. Same type, pointer and region as a default replace it; a `disabled` one claims its taps without acting. |

## Keyboard

With focus inside the container (or anywhere on the page with `hotkey-scope="document"`, routed to the most recently active player). Keys are ignored while typing in inputs and editable content, and while a menu or dialog consumes them.

| Keys                | Action                                               |
| ------------------- | ---------------------------------------------------- |
| Space, K            | Play / pause                                         |
| M                   | Mute / unmute                                        |
| ArrowRight, L       | Seek forward by `seek-step` (repeats while held)     |
| ArrowLeft, J        | Seek backward by `seek-step`                         |
| ArrowUp / ArrowDown | Volume ± `volume-step`                               |
| 0–9                 | Seek to 0 %–90 %                                     |
| Home / End          | Seek to the start / end                              |
| `>` / `<`           | Playback rate up / down (clamped to `playbackRates`) |
| F                   | Fullscreen                                           |
| C                   | Captions                                             |
| I                   | Picture-in-picture                                   |

Live streams without DVR disable the seek keys; all live streams disable the rate keys. Sliders, menus and buttons keep their own keys while focused. Published shortcuts appear in `aria-keyshortcuts` and in the layout tooltips.

## Gestures

`gestures="default"` (enabled by the video layout) registers:

| Gesture                   | Action                       |
| ------------------------- | ---------------------------- |
| Tap, mouse                | Play / pause                 |
| Tap, touch                | Show / hide controls         |
| Double tap, left region   | Seek backward by `seek-step` |
| Double tap, right region  | Seek forward by `seek-step`  |
| Double tap, center region | Fullscreen                   |

A double tap cancels the pending single tap. Taps on controls never reach the gesture surface. Every gesture has a control and a key equivalent.

## Accessibility

- The container is a labelled group with a tab stop. Every control is a native button or a native range with a state-dependent name, published `aria-keyshortcuts` and focusable `aria-disabled` when unavailable.
- Slider value text is localized: "1 minute, 5 seconds of 4 minutes" for time, the percent (or "50%, muted") for volume. Slider value changes are never announced through a live region.
- One polite live region per player announces paused/playing, captions, fullscreen, picture-in-picture and rate changes at once. Volume, mute and completed seeks are debounced (200 ms) and suppressed while a slider has focus. Element-originated changes and buffering are not announced. `announcements="off"` disables it.
- Indicators, the slider preview, thumbnails and chapter segments are `aria-hidden`. Layout tooltips are visual only (`describes="none"`) and add no description that would repeat the button's name.
- Autohide never hides a focused control, and focus is never moved by hiding.
- Captions render natively, so operating-system caption preferences apply. In the video layout they are reachable from the captions button (from `lg`) and from the settings menu; the live variant uses a captions menu.
- Controls meet `--tp-target-size-min` on coarse pointers.
- The error dialog is an `alertdialog`, modal within the container (container siblings inert, focus trapped, `aria-modal="false"` because the rest of the page stays available), that returns focus when dismissed.

## Customization

Appearance comes from the presentation dictionary and existing token roles. Composed Buttons, Sliders, Menus, Popovers, Tooltips, Key hints, Spinners and Alert dialogs keep their own recipes. Media dictionary keys include `media-container`, `media-poster`, `media-title`, `media-controls` (with `media-controls-visibility-auto|always`), `media-controls-backdrop`, `media-controls-group`, `media-element`, `media-button`, `media-button-control`, `media-button-mark`, `media-button-text`, `media-button-text-control`, `media-button-live-dot`, `media-time`, `media-time-value`, `media-time-sign`, `media-time-slider`, `media-time-slider-preview`, `media-thumbnail`, `media-thumbnail-image`, `media-chapter-title`, `media-volume-slider`, `media-volume-popover`, `media-settings-menu`, `media-settings-hint`, `media-radio-group`, `media-buffering-indicator`, `media-error-dialog`, `media-indicator`, `media-indicator-content`, `media-indicator-value`, `media-indicator-fill`, `media-layout` and `media-layout-region`.

- Over video, control groups placed in the controls region, the volume popup and the settings menus share one frosted translucent surface (a background-role mix with backdrop blur, defined on the container); buttons in them are round with a light highlight. Native captions lift above visible controls by `--tp-media-caption-offset` (Chromium and WebKit, through the native text-track container) and use the library font.
- Over video, the container, controls, title, indicators and preview use a scoped `color-scheme: dark`, so every `light-dark()` role resolves to its dark value without new color tokens. The scrim is an OKLab mix of `--tp-background`. The audio layout follows the page scheme.
- `partPresentation` (per instance), dictionary replacement, token overrides and `::part()` reach composed controls through exported parts, for example `tp-media-play-button::part(button)` or `tp-media-time-slider::part(slider-range)`.
- Public variables: `--tp-media-object-fit` (`contain`) and `--tp-media-object-position` (`center`) for the media and poster. Runtime outputs: `--tp-media-caption-offset`, `--tp-media-slider-fill`, `--tp-media-slider-pointer`, `--tp-media-slider-buffer`, `--tp-media-volume-fill`.
- Motion: controls and title visibility use `state` roles; the poster and indicators use `presence` roles; the spinner uses the ambient role. Reduced motion collapses them through the shared motion policy and never affects playback.
- Preferences: with `prefers-reduced-transparency: reduce` or `prefers-contrast: more`, control groups, indicators, thumbnails, the preview and the title use the opaque `background` role without blur or text shadow. With `forced-colors: active` the scrims disappear and these surfaces use `Canvas`/`CanvasText` with an outline. These rules live in structural styles and win over recipe paint.
- On fine pointers the cursor hides over started video while the controls are hidden.

```js
// A headless composition's own controls region: drop the scrim for this instance only.
const controls = document.querySelector('tp-media-controls');
controls.partPresentation = { 'media-controls-backdrop': { styleHook: { background: 'none' } } };
```

## Localization

`messages` takes strings with `{placeholders}` or functions of the parameters. The locale only formats: clock text is digital with the duration as a guide (`1:05`, `01:05`, `1:01:05`), and spoken text uses `Intl` units ("1 minute, 5 seconds"). Rates use `1.5×`.

```js
player.messages = {
  play: 'Lecture',
  pause: 'Pause',
  seekForward: ({ seconds }) => `Avancer de ${seconds} secondes`,
  showDuration: 'Afficher la durée, {duration}.',
};
player.locale = 'fr';
```

| Key                          | Default                                                                                          | Key                         | Default                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------- | -------------------------------------------------------------------------------------------------- |
| `player`                     | Media player                                                                                     | `play`                      | Play                                                                                               |
| `pause`                      | Pause                                                                                            | `replay`                    | Replay                                                                                             |
| `mute`                       | Mute                                                                                             | `unmute`                    | Unmute                                                                                             |
| `seekForward`                | Seek forward {seconds} seconds                                                                   | `seekBackward`              | Seek backward {seconds} seconds                                                                    |
| `enterFullscreen`            | Enter fullscreen                                                                                 | `exitFullscreen`            | Exit fullscreen                                                                                    |
| `enterPictureInPicture`      | Enter picture-in-picture                                                                         | `exitPictureInPicture`      | Exit picture-in-picture                                                                            |
| `enableCaptions`             | Enable captions                                                                                  | `disableCaptions`           | Disable captions                                                                                   |
| `startRemotePlayback`        | Start casting                                                                                    | `stopRemotePlayback`        | Stop casting                                                                                       |
| `connecting`                 | Connecting                                                                                       | `live`                      | Live                                                                                               |
| `playingLive`                | Playing live                                                                                     | `seekToLiveEdge`            | Seek to live edge                                                                                  |
| `seek`                       | Seek                                                                                             | `volume`                    | Volume                                                                                             |
| `volumeValue`                | {percent}                                                                                        | `mutedValue`                | {percent}, muted                                                                                   |
| `playbackRate`               | Playback rate {rate}                                                                             | `currentTime`               | Current time                                                                                       |
| `duration`                   | Duration                                                                                         | `remainingTime`             | Remaining                                                                                          |
| `timePosition`               | {current} of {duration}                                                                          | `timeUnknown`               | Media not loaded, unknown time.                                                                    |
| `showRemaining`              | Show remaining time, {duration}.                                                                 | `showElapsed`               | Show elapsed time, {duration}.                                                                     |
| `showDuration`               | Show duration, {duration}.                                                                       | `durationSuffix`            | {duration} duration                                                                                |
| `remainingSuffix`            | {duration} remaining                                                                             | `elapsedSuffix`             | {duration} elapsed                                                                                 |
| `toggleTimeDescription`      | Toggle between elapsed and remaining time.                                                       | `toggleDurationDescription` | Toggle between duration and remaining time.                                                        |
| `settings`                   | Settings                                                                                         | `speed`                     | Speed                                                                                              |
| `quality`                    | Quality                                                                                          | `audio`                     | Audio                                                                                              |
| `captions`                   | Captions                                                                                         | `subtitles`                 | Subtitles                                                                                          |
| `off`                        | Off                                                                                              | `auto`                      | Auto                                                                                               |
| `autoWithLabel`              | Auto ({label})                                                                                   | `back`                      | Back                                                                                               |
| `normalSpeed`                | Normal                                                                                           | `statusPaused`              | Paused                                                                                             |
| `statusPlaying`              | Playing                                                                                          | `statusCaptionsOn`          | Captions on                                                                                        |
| `statusCaptionsOff`          | Captions off                                                                                     | `statusFullscreen`          | Fullscreen                                                                                         |
| `statusExitFullscreen`       | Exit fullscreen                                                                                  | `statusPictureInPicture`    | Picture in picture                                                                                 |
| `statusExitPictureInPicture` | Exit picture in picture                                                                          | `statusPlaybackRate`        | Playback rate {rate}                                                                               |
| `statusMuted`                | Muted                                                                                            | `statusVolume`              | Volume {percent}                                                                                   |
| `statusSeekedTo`             | Seeked to {time}                                                                                 | `errorTitle`                | Something went wrong.                                                                              |
| `errorAborted`               | You stopped media playback before it finished.                                                   | `errorNetwork`              | This media could not be loaded due to a network or server issue.                                   |
| `errorDecode`                | This media could not be played. It may be corrupted, or your browser may not support its format. | `errorSource`               | This media could not be loaded. It may be unavailable, or your browser may not support its format. |
| `errorEncrypted`             | This media could not be played because it could not be decrypted.                                | `errorUnplayable`           | This media is unsupported by the player.                                                           |
| `errorUnexpected`            | An unexpected error occurred.                                                                    | `retry`                     | Retry                                                                                              |
| `dismiss`                    | OK                                                                                               |                             |                                                                                                    |

Diagnostics are not localized.

## Live and DVR

A stream is live when the media reports `streamType: 'live'`, or its duration is infinite (or `stream-type="live"`). A live stream has a DVR window when the media reports `targetLiveWindow > 0`. Without DVR the time slider, rate controls and seek keys are disabled or hidden, and play jumps to the live edge. With DVR the slider spans the seekable window and its bounds move without value events. `atLiveEdge` uses `liveEdgeStart` when reported (5 s tolerance), else the seekable end (10 s). The live button seeks to the edge. A streaming engine reports these members through a custom media element.

## Tracks adapter

Media without native audio-track or rendition lists (an HLS or DASH engine) supplies them through `mediaAdapter`. Each list follows the native list contract: array-like, an event target for `addtrack`/`removetrack`/`change` (audio) or `addrendition`/`removerendition`/`change`/`activechange` (renditions). Renditions add `selectedIndex` (`-1` = adaptive). Getters are re-read on `loadstart`.

```js
const renditions = Object.assign(new EventTarget(), {
  0: { id: '1080p', width: 1920, height: 1080, bitrate: 6_000_000 },
  1: { id: '720p', width: 1280, height: 720, bitrate: 3_000_000 },
  length: 2,
});
let selected = -1;
Object.defineProperty(renditions, 'selectedIndex', {
  get: () => selected,
  set(index) {
    selected = index;
    engine.setLevel(index); // your engine's API
    renditions.dispatchEvent(new Event('change'));
  },
});
player.mediaAdapter = { videoRenditions: renditions, audioTracks: engineAudioTracks };
```

The settings menu then offers Quality and Audio submenus. `selectVideoRendition('auto')` restores adaptive selection.

## Out of scope

Streaming engines (HLS, DASH) and DRM, the Google Cast sender SDK (W3C Remote Playback and WebKit AirPlay are supported), hosted-player adapters (YouTube, Vimeo), a custom caption renderer or caption styling UI, Document Picture-in-Picture, preference persistence (use `subscribe` and the request methods), analytics extensions and playlists. Settings submenus open as Menu flyouts, not inline pages within one popup.
