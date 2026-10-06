import type {
  TapGesturePointer,
  TapGestureRegion,
  TapGestureType,
} from '../../foundation/tap-gestures.js';
import type { MediaRequestAction } from '../../foundation/media/requests.js';
import { defaultMediaActionValue, isMediaRequestAction, type MediaStepConfig } from './hotkeys.js';

/**
 * Media tap-gesture policy (`sec-1921-tap-gesture-regions` default video set, contract proposal
 * §3.8; `tp-media-gesture`, Library mp-l-bindings). Pure; the player registers the resolved
 * bindings with the shared `TapGestureRecognizer` on its container.
 */
export interface MediaGestureDefinition {
  readonly type: TapGestureType;
  readonly action: MediaRequestAction;
  readonly pointer?: TapGesturePointer;
  readonly region?: TapGestureRegion;
  readonly value?: (config: MediaStepConfig) => number;
}

/** Default video set (`gestures="default"`, enabled by the video layout). */
export const DEFAULT_MEDIA_GESTURES: readonly MediaGestureDefinition[] = Object.freeze([
  { type: 'tap', pointer: 'mouse', action: 'toggle-paused' },
  { type: 'tap', pointer: 'touch', action: 'toggle-controls' },
  { type: 'doubletap', region: 'left', action: 'seek-by', value: (config) => -config.seekStep },
  { type: 'doubletap', region: 'right', action: 'seek-by', value: (config) => config.seekStep },
  { type: 'doubletap', region: 'center', action: 'toggle-fullscreen' },
] satisfies MediaGestureDefinition[]);

/** An authored `tp-media-gesture` (or equivalent) binding. */
export interface MediaGestureInput {
  readonly type: string;
  readonly action: string;
  readonly value?: number | null | undefined;
  readonly pointer?: string | null | undefined;
  readonly region?: string | null | undefined;
  readonly disabled?: boolean;
}

export interface MediaGestureSpec {
  readonly type: TapGestureType;
  readonly action: MediaRequestAction;
  readonly value: number | undefined;
  readonly pointer?: TapGesturePointer;
  readonly region?: TapGestureRegion;
  /** A disabled binding still claims its taps (it opts out of the action). */
  readonly disabled: boolean;
  readonly source: 'authored' | 'default';
}

export interface MediaGestureProblem {
  readonly input: MediaGestureInput;
  readonly message: string;
}

const TYPES = new Set(['tap', 'doubletap']);
const POINTERS = new Set(['mouse', 'touch', 'pen']);
const REGIONS = new Set(['left', 'center', 'right']);

const signature = (type: string, pointer?: string | null, region?: string | null) =>
  `${type}|${pointer ?? '*'}|${region ?? '*'}`;

/**
 * Resolves gesture bindings. Authored bindings come first (the recognizer prefers the first
 * candidate), and each authored binding suppresses the default with the same type, pointer and
 * region. `defaults: false` (`gestures="none"`) keeps only authored bindings.
 */
export function resolveMediaGestures(options: {
  readonly defaults: boolean;
  readonly config: MediaStepConfig;
  readonly authored?: readonly MediaGestureInput[];
}): {
  readonly specs: readonly MediaGestureSpec[];
  readonly problems: readonly MediaGestureProblem[];
} {
  const specs: MediaGestureSpec[] = [];
  const problems: MediaGestureProblem[] = [];
  const claimed = new Set<string>();
  for (const input of options.authored ?? []) {
    const pointer = input.pointer || undefined;
    const region = input.region || undefined;
    if (!TYPES.has(input.type)) {
      problems.push({ input, message: `Unknown gesture type "${input.type}".` });
      continue;
    }
    if (pointer && !POINTERS.has(pointer)) {
      problems.push({ input, message: `Unknown gesture pointer "${pointer}".` });
      continue;
    }
    if (region && !REGIONS.has(region)) {
      problems.push({ input, message: `Unknown gesture region "${region}".` });
      continue;
    }
    if (!isMediaRequestAction(input.action)) {
      problems.push({ input, message: `Unknown media action "${input.action}".` });
      continue;
    }
    claimed.add(signature(input.type, pointer, region));
    specs.push({
      type: input.type as TapGestureType,
      action: input.action,
      value:
        typeof input.value === 'number' && Number.isFinite(input.value)
          ? input.value
          : defaultMediaActionValue(input.action, options.config),
      ...(pointer ? { pointer: pointer as TapGesturePointer } : {}),
      ...(region ? { region: region as TapGestureRegion } : {}),
      disabled: input.disabled === true,
      source: 'authored',
    });
  }
  if (options.defaults)
    for (const definition of DEFAULT_MEDIA_GESTURES) {
      if (claimed.has(signature(definition.type, definition.pointer, definition.region))) continue;
      specs.push({
        type: definition.type,
        action: definition.action,
        value: definition.value?.(options.config),
        ...(definition.pointer ? { pointer: definition.pointer } : {}),
        ...(definition.region ? { region: definition.region } : {}),
        disabled: false,
        source: 'default',
      });
    }
  return { specs, problems };
}
