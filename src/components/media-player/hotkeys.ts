import { parseKeyPattern, type KeyChord } from '../../foundation/key-bindings.js';
import type { ResolvedKeyHintPlatform } from '../key-hint/notation.js';
import { MEDIA_REQUEST_ACTIONS, type MediaRequestAction } from '../../foundation/media/requests.js';
import type { MediaState } from '../../foundation/media/state.js';

/**
 * Media player key and gesture policy (`sec-1920-key-bindings` default map with the live
 * restrictions of contract proposal §3.7; `tp-media-hotkey` overrides, Library mp-l-bindings).
 * Pure functions: the player registers the resolved bindings with the shared `KeyBindingOwner`.
 */

/** Root step configuration that default values derive from. */
export interface MediaStepConfig {
  /** Seconds (`seek-step`, default 10). */
  readonly seekStep: number;
  /** 0–1 (`volume-step`, default 0.05). */
  readonly volumeStep: number;
}

export interface MediaHotkeyDefinition {
  /** One key pattern (`Space`, `ArrowRight`, `>`). */
  readonly keys: string;
  readonly action: MediaRequestAction;
  readonly value?: (config: MediaStepConfig) => number;
}

const step =
  (sign: 1 | -1, key: keyof MediaStepConfig) =>
  (config: MediaStepConfig): number =>
    sign * config[key];

/**
 * Default map (`hotkeys="default"`; Video.js `skins/shared/behaviors/playback-hotkeys.tsx`). One
 * entry per pattern, so an authored binding can suppress a single key of a shared action.
 */
export const DEFAULT_MEDIA_HOTKEYS: readonly MediaHotkeyDefinition[] = Object.freeze([
  { keys: 'Space', action: 'toggle-paused' },
  { keys: 'k', action: 'toggle-paused' },
  { keys: 'm', action: 'toggle-muted' },
  { keys: 'ArrowRight', action: 'seek-by', value: step(1, 'seekStep') },
  { keys: 'l', action: 'seek-by', value: step(1, 'seekStep') },
  { keys: 'ArrowLeft', action: 'seek-by', value: step(-1, 'seekStep') },
  { keys: 'j', action: 'seek-by', value: step(-1, 'seekStep') },
  { keys: 'ArrowUp', action: 'step-volume', value: step(1, 'volumeStep') },
  { keys: 'ArrowDown', action: 'step-volume', value: step(-1, 'volumeStep') },
  ...Array.from({ length: 10 }, (_, digit) => ({
    keys: String(digit),
    action: 'seek-to-percent' as const,
    value: () => digit * 10,
  })),
  { keys: 'Home', action: 'seek-to-percent', value: () => 0 },
  { keys: 'End', action: 'seek-to-percent', value: () => 100 },
  { keys: '>', action: 'step-playback-rate', value: () => 1 },
  { keys: '<', action: 'step-playback-rate', value: () => -1 },
  { keys: 'f', action: 'toggle-fullscreen' },
  { keys: 'c', action: 'toggle-captions' },
  { keys: 'i', action: 'toggle-picture-in-picture' },
] satisfies MediaHotkeyDefinition[]);

/** An authored `tp-media-hotkey` (or equivalent) binding. */
export interface MediaHotkeyInput {
  readonly keys: string;
  readonly action: string;
  readonly value?: number | null | undefined;
  readonly disabled?: boolean;
}

/** One binding to register with the key-binding owner. */
export interface MediaHotkeySpec {
  readonly keys: string;
  readonly action: MediaRequestAction;
  readonly value: number | undefined;
  /** `toggle-*` actions do not repeat while held; step actions do. */
  readonly repeat: boolean;
  readonly source: 'authored' | 'default';
}

export interface MediaHotkeyProblem {
  readonly keys: string;
  readonly action: string;
  readonly message: string;
}

export interface MediaHotkeyResolution {
  readonly specs: readonly MediaHotkeySpec[];
  readonly problems: readonly MediaHotkeyProblem[];
}

const ACTIONS = new Set<string>(MEDIA_REQUEST_ACTIONS);

export function isMediaRequestAction(value: unknown): value is MediaRequestAction {
  return typeof value === 'string' && ACTIONS.has(value);
}

/**
 * The value an action uses when a binding does not supply one: the root `seek-step` for
 * `seek-by`, `volume-step` for `step-volume`, one rate step for `step-playback-rate`.
 */
export function defaultMediaActionValue(
  action: MediaRequestAction,
  config: MediaStepConfig,
): number | undefined {
  switch (action) {
    case 'seek-by':
      return config.seekStep;
    case 'step-volume':
      return config.volumeStep;
    case 'step-playback-rate':
      return 1;
    default:
      return undefined;
  }
}

/**
 * Live restrictions (contract proposal §3.7/§3.8, `mp-f-live`): seek bindings are inactive for a
 * live stream without DVR, and rate bindings are inactive while live.
 */
export function mediaInputInactive(
  action: MediaRequestAction,
  state: Pick<MediaState, 'streamType' | 'dvr'>,
): boolean {
  const live = state.streamType === 'live';
  switch (action) {
    case 'seek':
    case 'seek-by':
    case 'seek-to-percent':
      return live && !state.dvr;
    case 'set-playback-rate':
    case 'step-playback-rate':
      return live;
    default:
      return false;
  }
}

const chordId = (chord: KeyChord) =>
  `${chord.key}|${Number(chord.ctrlKey)}${Number(chord.metaKey)}${Number(chord.altKey)}${Number(chord.shiftKey)}`;

/**
 * Resolves the bindings to register. Authored bindings come first, so they win priority ties.
 * Every authored binding (enabled or disabled) suppresses each default whose chord it shares;
 * disabled authored bindings register nothing. `defaults: false` (`hotkeys="none"`) keeps only the
 * authored bindings. Invalid authored bindings are reported in `problems` and skipped.
 */
export function resolveMediaHotkeys(options: {
  readonly defaults: boolean;
  readonly config: MediaStepConfig;
  readonly authored?: readonly MediaHotkeyInput[];
  readonly platform: ResolvedKeyHintPlatform;
}): MediaHotkeyResolution {
  const specs: MediaHotkeySpec[] = [];
  const problems: MediaHotkeyProblem[] = [];
  const claimed = new Set<string>();
  for (const input of options.authored ?? []) {
    let chords: KeyChord[];
    try {
      chords = parseKeyPattern(input.keys ?? '', options.platform);
    } catch (error) {
      problems.push({
        keys: input.keys,
        action: input.action,
        message: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
    if (!chords.length) {
      problems.push({ keys: input.keys, action: input.action, message: 'No keys.' });
      continue;
    }
    for (const chord of chords) claimed.add(chordId(chord));
    if (input.disabled) continue;
    if (!isMediaRequestAction(input.action)) {
      problems.push({
        keys: input.keys,
        action: input.action,
        message: `Unknown media action "${input.action}".`,
      });
      continue;
    }
    const value =
      typeof input.value === 'number' && Number.isFinite(input.value)
        ? input.value
        : defaultMediaActionValue(input.action, options.config);
    specs.push({
      keys: input.keys,
      action: input.action,
      value,
      repeat: !input.action.startsWith('toggle-'),
      source: 'authored',
    });
  }
  if (options.defaults)
    for (const definition of DEFAULT_MEDIA_HOTKEYS) {
      const chords = parseKeyPattern(definition.keys, options.platform);
      if (chords.some((chord) => claimed.has(chordId(chord)))) continue;
      specs.push({
        keys: definition.keys,
        action: definition.action,
        value: definition.value?.(options.config),
        repeat: !definition.action.startsWith('toggle-'),
        source: 'default',
      });
    }
  return { specs, problems };
}
