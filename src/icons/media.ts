import { checkIcon } from './check.js';
import { settingsIcon } from './settings.js';
import type { IconDefinition } from './types.js';

/**
 * Media control artwork: original 24×24 outline paths drawn with a 2-unit stroke,
 * matching the library's single-icon modules. Each definition is a separate named
 * export so a bundler can keep only the ones a consumer imports; `mediaIcons` groups
 * the whole set for media layouts that use all of it.
 */
const outline = (...paths: string[]): IconDefinition => ({
  viewBox: '0 0 24 24',
  paths: paths.map((d) => ({ d, strokeWidth: 2 })),
});

const screen =
  'M3 6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z';
const captionGlyphs = 'M10.5 10.2a2.2 2.2 0 1 0 0 3.6M17 10.2a2.2 2.2 0 1 0 0 3.6';
const speaker = 'M4 9.5h3.5L12 5.5v13l-4.5-4H4z';

export const playIcon = /* @__PURE__ */ outline(
  'M7 5.2v13.6c0 .8.9 1.3 1.6.9l10.8-6.8a1 1 0 0 0 0-1.8L8.6 4.3C7.9 3.9 7 4.4 7 5.2z',
);
export const pauseIcon = /* @__PURE__ */ outline(
  'M6.5 5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1z',
  'M13.5 5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1z',
);
/** Counter-clockwise arrow around a play mark (restart after the end). */
export const replayIcon = /* @__PURE__ */ outline(
  'M3 12a9 9 0 1 0 2.64-6.36L3 8.3',
  'M3 3.5v4.8h4.8',
  'M10.5 9.2v5.6l4.5-2.8z',
);
export const volumeHighIcon = /* @__PURE__ */ outline(
  speaker,
  'M15.5 9.5a3.5 3.5 0 0 1 0 5',
  'M18.5 6.5a7.8 7.8 0 0 1 0 11',
);
export const volumeLowIcon = /* @__PURE__ */ outline(speaker, 'M15.5 9.5a3.5 3.5 0 0 1 0 5');
export const volumeOffIcon = /* @__PURE__ */ outline(speaker, 'M16 9.5l5 5M21 9.5l-5 5');
export const captionsOnIcon = /* @__PURE__ */ outline(screen, captionGlyphs);
export const captionsOffIcon = /* @__PURE__ */ outline(
  'M8 5h11.5A1.5 1.5 0 0 1 21 6.5v9.5',
  'M18 19H4.5A1.5 1.5 0 0 1 3 17.5v-11c0-.5.2-.9.6-1.2',
  captionGlyphs,
  'M2.5 2.5l19 19',
);
export const fullscreenEnterIcon = /* @__PURE__ */ outline(
  'M4 9V5a1 1 0 0 1 1-1h4',
  'M15 4h4a1 1 0 0 1 1 1v4',
  'M20 15v4a1 1 0 0 1-1 1h-4',
  'M9 20H5a1 1 0 0 1-1-1v-4',
);
export const fullscreenExitIcon = /* @__PURE__ */ outline(
  'M9 4v4a1 1 0 0 1-1 1H4',
  'M20 9h-4a1 1 0 0 1-1-1V4',
  'M15 20v-4a1 1 0 0 1 1-1h4',
  'M4 15h4a1 1 0 0 1 1 1v4',
);
const pipFrame =
  'M21 10.5v-4A1.5 1.5 0 0 0 19.5 5h-15A1.5 1.5 0 0 0 3 6.5v11A1.5 1.5 0 0 0 4.5 19H10';
const pipWindow = 'M13 14.5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1z';
/** Arrow into the floating window. */
export const pipEnterIcon = /* @__PURE__ */ outline(
  pipFrame,
  pipWindow,
  'M7 8.5l4 4',
  'M11 9v3.5H7.5',
);
/** Arrow out of the floating window. */
export const pipExitIcon = /* @__PURE__ */ outline(
  pipFrame,
  pipWindow,
  'M11 12.5l-4-4',
  'M7 12V8.5h3.5',
);
/** Clockwise arrow with forward chevrons; `seekBackwardIcon` is its mirror. */
export const seekForwardIcon = /* @__PURE__ */ outline(
  'M21 12a9 9 0 1 1-2.64-6.36L21 8.3',
  'M21 3.5v4.8h-4.8',
  'M8.5 9l3 3-3 3M12.5 9l3 3-3 3',
);
export const seekBackwardIcon = /* @__PURE__ */ outline(
  'M3 12a9 9 0 1 0 2.64-6.36L3 8.3',
  'M3 3.5v4.8h4.8',
  'M15.5 9l-3 3 3 3M11.5 9l-3 3 3 3',
);
/** Dial with a needle (playback rate). */
export const speedIcon = /* @__PURE__ */ outline(
  'M4.2 17a9 9 0 1 1 15.6 0',
  'M12 12.5l3.5-3.5',
  'M12 12.5h.01',
);
/** Rendition badge (video quality). */
export const qualityIcon = /* @__PURE__ */ outline(
  screen,
  'M7 9.5v5M10 9.5v5M7 12h3',
  'M13.5 9.5v5h1.5a2.5 2.5 0 0 0 0-5z',
);
/** Headphones (audio track selection). */
export const audioIcon = /* @__PURE__ */ outline(
  'M4 18v-5a8 8 0 0 1 16 0v5',
  'M4 15h2.5a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z',
  'M20 15h-2.5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1H19a1 1 0 0 0 1-1z',
);
/** Screen with broadcast arcs (remote playback). */
export const castIcon = /* @__PURE__ */ outline(
  'M3 8.5v-2A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5H14',
  'M3 12a7 7 0 0 1 7 7',
  'M3 15.5a3.5 3.5 0 0 1 3.5 3.5',
  'M3 19h.01',
);
/** Screen above a delivery triangle (AirPlay-style remote playback). */
export const airplayIcon = /* @__PURE__ */ outline(
  'M5.5 17h-1A1.5 1.5 0 0 1 3 15.5v-10A1.5 1.5 0 0 1 4.5 4h15A1.5 1.5 0 0 1 21 5.5v10a1.5 1.5 0 0 1-1.5 1.5h-1',
  'M12 15l5 6H7z',
);
/** Filled dot for the live-edge indicator. */
export const liveIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [{ d: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', fill: 'currentColor', stroke: 'none' }],
};

export { checkIcon, settingsIcon };

/** The complete media set. Importing this object includes every media definition. */
export const mediaIcons = {
  play: playIcon,
  pause: pauseIcon,
  replay: replayIcon,
  volumeHigh: volumeHighIcon,
  volumeLow: volumeLowIcon,
  volumeOff: volumeOffIcon,
  captionsOn: captionsOnIcon,
  captionsOff: captionsOffIcon,
  fullscreenEnter: fullscreenEnterIcon,
  fullscreenExit: fullscreenExitIcon,
  pipEnter: pipEnterIcon,
  pipExit: pipExitIcon,
  seekForward: seekForwardIcon,
  seekBackward: seekBackwardIcon,
  speed: speedIcon,
  quality: qualityIcon,
  audio: audioIcon,
  settings: settingsIcon,
  cast: castIcon,
  airplay: airplayIcon,
  live: liveIcon,
  check: checkIcon,
} as const satisfies Record<string, IconDefinition>;

export type MediaIconName = keyof typeof mediaIcons;
